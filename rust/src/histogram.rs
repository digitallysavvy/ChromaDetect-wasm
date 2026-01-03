use crate::color::RGB;

#[derive(Clone, Copy, Debug)]
struct RGBAccumulator {
    r_sum: u64,
    g_sum: u64,
    b_sum: u64,
    count: u32,
}

impl RGBAccumulator {
    fn new() -> Self {
        Self { r_sum: 0, g_sum: 0, b_sum: 0, count: 0 }
    }

    fn add(&mut self, rgb: RGB) {
        self.r_sum += rgb.r as u64;
        self.g_sum += rgb.g as u64;
        self.b_sum += rgb.b as u64;
        self.count += 1;
    }

    fn average(&self) -> RGB {
        if self.count == 0 {
            return RGB { r: 0, g: 0, b: 0 };
        }
        RGB {
            r: (self.r_sum / self.count as u64) as u8,
            g: (self.g_sum / self.count as u64) as u8,
            b: (self.b_sum / self.count as u64) as u8,
        }
    }
}

pub struct ColorHistogram {
    hue_bins: Vec<u32>,                    // 360 bins for hue (0-359°)
    rgb_accumulators: Vec<RGBAccumulator>, // Store actual RGB values for each hue
    saturation_bins: Vec<u32>,             // 100 bins for saturation
    value_bins: Vec<u32>,                  // 100 bins for value/brightness (for grayscale)
    grayscale_accumulator: RGBAccumulator, // Accumulator for low-saturation pixels
    grayscale_count: u32,                  // Count of grayscale pixels
    pub total_pixels: u32,
}

pub struct Peak {
    pub hue: f32,
    pub count: u32,
    pub percentage: f32,
    pub average_color: RGB,  // Add actual average RGB color
}

impl ColorHistogram {
    pub fn new() -> Self {
        Self {
            hue_bins: vec![0; 360],
            rgb_accumulators: vec![RGBAccumulator::new(); 360],
            saturation_bins: vec![0; 100],
            value_bins: vec![0; 100],
            grayscale_accumulator: RGBAccumulator::new(),
            grayscale_count: 0,
            total_pixels: 0,
        }
    }

    pub fn add_pixel(&mut self, rgb: RGB) {
        let hsv = rgb.to_hsv();

        // Handle low-saturation pixels (grayscale: black, white, grays)
        if hsv.s < 0.15 {
            let value_idx = ((hsv.v * 99.0) as usize).min(99);
            self.value_bins[value_idx] += 1;
            self.grayscale_accumulator.add(rgb);
            self.grayscale_count += 1;
            self.total_pixels += 1;
            return;
        }

        // Handle colored pixels (hue-based)
        let hue_idx = (hsv.h as usize).min(359);
        let sat_idx = ((hsv.s * 99.0) as usize).min(99);

        self.hue_bins[hue_idx] += 1;
        self.rgb_accumulators[hue_idx].add(rgb);
        self.saturation_bins[sat_idx] += 1;
        self.total_pixels += 1;
    }
    
    pub fn find_peaks(&self, min_percentage: f32) -> Vec<Peak> {
        let mut peaks = Vec::new();
        if self.total_pixels == 0 {
            return peaks;
        }

        // Simple peak finding: look for local maxima that are above threshold
        // We consider a window of +/- 5 degrees
        let window = 5;
        let threshold = (self.total_pixels as f32 * min_percentage) as u32;

        for i in 0..360 {
            let count = self.hue_bins[i];
            if count < threshold {
                continue;
            }

            let mut is_peak = true;
            for j in 1..=window {
                let prev_idx = (i + 360 - j) % 360;
                let next_idx = (i + j) % 360;
                
                if self.hue_bins[prev_idx] >= count || self.hue_bins[next_idx] >= count {
                    is_peak = false;
                    break;
                }
            }

            if is_peak {
                // Sum up all pixels in the peak region (not just the single bin)
                // This gives us the true coverage of this color
                let mut region_count: u32 = count;
                let mut region_r_sum: u64 = self.rgb_accumulators[i].r_sum;
                let mut region_g_sum: u64 = self.rgb_accumulators[i].g_sum;
                let mut region_b_sum: u64 = self.rgb_accumulators[i].b_sum;
                let mut region_pixel_count: u32 = self.rgb_accumulators[i].count;

                // Expand outward from peak until we hit a valley
                // Use 5-bin moving average to handle gaps from hue quantization
                // Valley = 20% of peak height
                let valley_threshold = count / 5;

                // Helper to get 5-bin average (handles wraparound)
                let get_avg = |center: usize| -> u32 {
                    let mut sum = 0u32;
                    for offset in -2i32..=2 {
                        let idx = ((center as i32 + offset + 360) % 360) as usize;
                        sum += self.hue_bins[idx];
                    }
                    sum / 5
                };

                // Check left side - use 5-bin average to bridge small gaps
                // Limit expansion to 15 degrees max (typical chromakey spread)
                for j in 1..=15 {
                    let idx = (i + 360 - j) % 360;
                    let local_avg = get_avg(idx);
                    if local_avg < valley_threshold {
                        break;
                    }
                    region_count += self.hue_bins[idx];
                    region_r_sum += self.rgb_accumulators[idx].r_sum;
                    region_g_sum += self.rgb_accumulators[idx].g_sum;
                    region_b_sum += self.rgb_accumulators[idx].b_sum;
                    region_pixel_count += self.rgb_accumulators[idx].count;
                }

                // Check right side - use 5-bin average to bridge small gaps
                // Limit expansion to 15 degrees max (typical chromakey spread)
                for j in 1..=15 {
                    let idx = (i + j) % 360;
                    let local_avg = get_avg(idx);
                    if local_avg < valley_threshold {
                        break;
                    }
                    region_count += self.hue_bins[idx];
                    region_r_sum += self.rgb_accumulators[idx].r_sum;
                    region_g_sum += self.rgb_accumulators[idx].g_sum;
                    region_b_sum += self.rgb_accumulators[idx].b_sum;
                    region_pixel_count += self.rgb_accumulators[idx].count;
                }

                // Calculate average color from the entire region
                let avg_color = if region_pixel_count > 0 {
                    RGB {
                        r: (region_r_sum / region_pixel_count as u64) as u8,
                        g: (region_g_sum / region_pixel_count as u64) as u8,
                        b: (region_b_sum / region_pixel_count as u64) as u8,
                    }
                } else {
                    self.rgb_accumulators[i].average()
                };

                peaks.push(Peak {
                    hue: i as f32,
                    count: region_count,
                    percentage: region_count as f32 / self.total_pixels as f32,
                    average_color: avg_color,
                });
            }
        }

        // Check for grayscale chromakey (black/white)
        let grayscale_percentage = self.grayscale_count as f32 / self.total_pixels as f32;
        if grayscale_percentage > min_percentage && self.grayscale_count > 0 {
            // Grayscale is significant - add it as a peak
            let avg_color = self.grayscale_accumulator.average();
            let avg_hsv = avg_color.to_hsv();

            peaks.push(Peak {
                hue: avg_hsv.h,
                count: self.grayscale_count,
                percentage: grayscale_percentage,
                average_color: avg_color,
            });
        }

        // Sort: colored peaks (by count desc), then grayscale peaks (by count desc)
        // This ensures we prefer chromakey colors over grayscale backgrounds
        peaks.sort_by(|a, b| {
            let a_is_grayscale = a.average_color.to_hsv().s < 0.15;
            let b_is_grayscale = b.average_color.to_hsv().s < 0.15;

            match (a_is_grayscale, b_is_grayscale) {
                (false, true) => std::cmp::Ordering::Less,    // a (colored) before b (grayscale)
                (true, false) => std::cmp::Ordering::Greater, // b (colored) before a (grayscale)
                _ => b.count.cmp(&a.count),                   // same type: sort by count
            }
        });
        peaks
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_histogram_population() {
        let mut hist = ColorHistogram::new();
        
        // Add 10 pure green pixels (Hue 120)
        let green = RGB { r: 0, g: 255, b: 0 };
        for _ in 0..10 {
            hist.add_pixel(green);
        }

        assert_eq!(hist.total_pixels, 10);
        assert_eq!(hist.hue_bins[120], 10);
    }

    #[test]
    fn test_histogram_filtering() {
        let mut hist = ColorHistogram::new();

        // Add 10 gray pixels (low saturation) - counted but stored as grayscale
        let gray = RGB { r: 100, g: 100, b: 100 };
        for _ in 0..10 {
            hist.add_pixel(gray);
        }

        // Gray pixels are counted in total but not in hue bins
        assert_eq!(hist.total_pixels, 10);
        assert_eq!(hist.grayscale_count, 10);
        // Hue bins should be empty since gray has no hue
        assert_eq!(hist.hue_bins.iter().sum::<u32>(), 0);
    }

    #[test]
    fn test_peak_finding() {
        let mut hist = ColorHistogram::new();

        // Create a peak at 120 (Green)
        let green = RGB { r: 0, g: 255, b: 0 };
        for _ in 0..100 {
            hist.add_pixel(green);
        }

        // Create a smaller peak at 240 (Blue)
        let blue = RGB { r: 0, g: 0, b: 255 };
        for _ in 0..50 {
            hist.add_pixel(blue);
        }

        let peaks = hist.find_peaks(0.1); // 10% threshold

        assert_eq!(peaks.len(), 2);
        assert!((peaks[0].hue - 120.0).abs() < 1.0);
        assert!((peaks[1].hue - 240.0).abs() < 1.0);
        assert_eq!(peaks[0].count, 100);
        assert_eq!(peaks[1].count, 50);
    }

    #[test]
    fn test_coverage_with_mixed_colors() {
        let mut hist = ColorHistogram::new();

        // Simulate realistic chromakey with continuous hue distribution
        // Real chromakeys spread across ~10-20 hue degrees due to lighting
        // We'll spread 600 pixels (60%) across hues 115-125
        for hue_offset in 0..=10 {
            let hue = 115 + hue_offset;
            // Use HSV to create accurate test colors
            let hsv = crate::color::HSV { h: hue as f32, s: 1.0, v: 1.0 };
            let rgb = hsv.to_rgb();
            // More pixels near center (peak distribution)
            let count = if hue_offset <= 5 { 80 } else { 40 };
            for _ in 0..count {
                hist.add_pixel(rgb);
            }
        }
        // Total green: 80*6 + 40*5 = 480 + 200 = 680 pixels

        // Simulate 40% other colored elements
        let skin = RGB { r: 230, g: 160, b: 120 };
        let blue = RGB { r: 50, g: 80, b: 200 };
        for _ in 0..200 { hist.add_pixel(skin); }
        for _ in 0..120 { hist.add_pixel(blue); }
        // Total other: 320 pixels

        // Total: 1000 pixels, 68% green, 32% other
        println!("Total pixels: {}", hist.total_pixels);
        println!("Hue bins 115-126: {:?}", &hist.hue_bins[115..127]);

        let peaks = hist.find_peaks(0.05); // 5% threshold

        println!("Found {} peaks", peaks.len());
        for (i, p) in peaks.iter().enumerate() {
            println!("Peak {}: hue={}, count={}, percentage={:.1}%", i, p.hue, p.count, p.percentage * 100.0);
        }

        // Green should be the dominant peak with ~68% coverage
        assert!(!peaks.is_empty());
        let green_peak = &peaks[0];
        assert!((green_peak.hue - 120.0).abs() < 10.0, "Hue should be ~115-125, got {}", green_peak.hue);
        assert!(green_peak.percentage > 0.50, "Coverage should be >50%, got {:.1}%", green_peak.percentage * 100.0);
        assert!(green_peak.percentage < 0.80, "Coverage should be <80%, got {:.1}%", green_peak.percentage * 100.0);
    }

    #[test]
    fn test_coverage_wide_chromakey_spread() {
        // Test a scenario more like real videos: chromakey spread across MANY hue degrees
        // with a gradual falloff that could cause over-expansion
        let mut hist = ColorHistogram::new();

        // Green chromakey spread across 40 degrees (100-139) with gradual falloff
        // Peak around 120, tapering off on both sides
        for hue in 100..140 {
            let distance_from_center = ((hue as i32) - 120).abs() as u32;
            let count = 100u32.saturating_sub(distance_from_center * 4); // Gradual falloff
            let hsv = crate::color::HSV { h: hue as f32, s: 0.9, v: 0.9 };
            let rgb = hsv.to_rgb();
            for _ in 0..count {
                hist.add_pixel(rgb);
            }
        }
        // Calculate total green pixels
        let green_total: u32 = (100..140).map(|hue| {
            let d = ((hue as i32) - 120).abs() as u32;
            100u32.saturating_sub(d * 4)
        }).sum();
        println!("Green pixels: {}", green_total);

        // Add non-green content: skin tones and other colors
        // These should NOT be counted in green coverage
        let skin = RGB { r: 220, g: 170, b: 130 }; // Hue ~30
        let hair = RGB { r: 60, g: 40, b: 30 };    // Dark brown, low sat
        let shirt = RGB { r: 50, g: 50, b: 180 };  // Blue ~235

        println!("Hair HSV: h={}, s={}", hair.to_hsv().h, hair.to_hsv().s);
        println!("Skin HSV: h={}, s={}", skin.to_hsv().h, skin.to_hsv().s);

        for _ in 0..400 { hist.add_pixel(skin); }
        for _ in 0..200 { hist.add_pixel(hair); }
        for _ in 0..300 { hist.add_pixel(shirt); }

        // Also print hue distribution around green range
        println!("Hue bins 95-145: {:?}", &hist.hue_bins[95..145]);

        println!("Total pixels: {}", hist.total_pixels);
        println!("Grayscale count: {}", hist.grayscale_count);

        let expected_coverage = green_total as f32 / hist.total_pixels as f32;
        println!("Expected green coverage: {:.1}%", expected_coverage * 100.0);

        let peaks = hist.find_peaks(0.05);
        println!("Found {} peaks", peaks.len());
        for (i, p) in peaks.iter().enumerate() {
            println!("Peak {}: hue={}, count={}, percentage={:.1}%", i, p.hue, p.count, p.percentage * 100.0);
        }

        let green_peak = &peaks[0];
        // With 15-degree expansion limit, we expect to capture less than the full spread
        // The test creates 40 degrees of spread, so we'll capture ~30 degrees (peak ± 15)
        // This should be 50-70% of total pixels
        assert!(green_peak.percentage > 0.40,
            "Coverage should be >40%, got {:.1}%",
            green_peak.percentage * 100.0);
        assert!(green_peak.percentage < 0.75,
            "Coverage should be <75%, got {:.1}%",
            green_peak.percentage * 100.0);
    }

    #[test]
    fn test_radioactive_sign_scenario() {
        // Simulate radioactive sign: 60% green background, 40% symbol (yellow + black)
        let mut hist = ColorHistogram::new();

        // Green background: 700 pixels with realistic spread using HSV
        // Peak at 127° with gradual falloff
        for hue_offset in -5i32..=5 {
            let hue = 127 + hue_offset;
            let hsv = crate::color::HSV {
                h: hue as f32,
                s: 0.95,
                v: 0.95,
            };
            let rgb = hsv.to_rgb();
            // Peak distribution: more pixels at center
            let count = 100 - (hue_offset.abs() * 15);
            for _ in 0..count {
                hist.add_pixel(rgb);
            }
        }
        // Total green: 100+85+70+55+40 + 40+55+70+85+100 = 700 pixels

        // Radioactive symbol:
        // Yellow parts: 150 pixels at hue ~60
        for _ in 0..150 { hist.add_pixel(RGB { r: 255, g: 255, b: 0 }); }  // ~60

        // Black center and borders: 150 pixels (low saturation)
        for _ in 0..150 { hist.add_pixel(RGB { r: 10, g: 10, b: 10 }); }  // black/grayscale
        // Total: 700 green (70%) + 150 yellow (15%) + 150 black (15%) = 1000 pixels

        println!("Total pixels: {}", hist.total_pixels);
        println!("Grayscale count: {}", hist.grayscale_count);

        // Print hue distribution
        println!("Hue bins 50-70 (yellow): {:?}", &hist.hue_bins[50..71]);
        println!("Hue bins 115-135 (green): {:?}", &hist.hue_bins[115..136]);

        // Check specific bins
        for i in 120..135 {
            if hist.hue_bins[i] > 0 {
                println!("Bin {}: {} pixels", i, hist.hue_bins[i]);
            }
        }

        let peaks = hist.find_peaks(0.05);
        println!("Found {} peaks", peaks.len());
        for (i, p) in peaks.iter().enumerate() {
            println!("Peak {}: hue={}, count={}, percentage={:.1}%",
                i, p.hue, p.count, p.percentage * 100.0);
        }

        // Green should be dominant with ~70% coverage, NOT 99%
        assert!(!peaks.is_empty());
        let green_peak = &peaks[0];
        assert!((green_peak.hue - 127.0).abs() < 5.0,
            "First peak should be green (~127°), got {}", green_peak.hue);
        assert!(green_peak.percentage > 0.60,
            "Green coverage should be >60%, got {:.1}%",
            green_peak.percentage * 100.0);
        assert!(green_peak.percentage < 0.80,
            "Green coverage should be <80% (not 99%!), got {:.1}%",
            green_peak.percentage * 100.0);
    }
}

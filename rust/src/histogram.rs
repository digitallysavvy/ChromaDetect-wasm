use crate::color::RGB;

pub struct ColorHistogram {
    hue_bins: Vec<u32>,        // 360 bins for hue (0-359°)
    saturation_bins: Vec<u32>, // 100 bins for saturation
    pub total_pixels: u32,
}

pub struct Peak {
    pub hue: f32,
    pub count: u32,
    pub percentage: f32,
}

impl ColorHistogram {
    pub fn new() -> Self {
        Self {
            hue_bins: vec![0; 360],
            saturation_bins: vec![0; 100],
            total_pixels: 0,
        }
    }
    
    pub fn add_pixel(&mut self, rgb: RGB) {
        let hsv = rgb.to_hsv();
        // Skip pixels that aren't good candidates for chromakey (low saturation/brightness)
        if !hsv.is_chromakey_candidate() {
            return;
        }

        let hue_idx = (hsv.h as usize).min(359);
        let sat_idx = ((hsv.s * 99.0) as usize).min(99);
        
        self.hue_bins[hue_idx] += 1;
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
                peaks.push(Peak {
                    hue: i as f32,
                    count,
                    percentage: count as f32 / self.total_pixels as f32,
                });
            }
        }
        
        // Sort by count descending
        peaks.sort_by(|a, b| b.count.cmp(&a.count));
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
        
        // Add 10 gray pixels (low saturation) - should be ignored
        let gray = RGB { r: 100, g: 100, b: 100 };
        for _ in 0..10 {
            hist.add_pixel(gray);
        }

        assert_eq!(hist.total_pixels, 0);
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
}

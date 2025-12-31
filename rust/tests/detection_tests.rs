use chroma_detect::detection::{detect_chromakey, DetectionConfig};

fn create_solid_color_image(width: u32, height: u32, r: u8, g: u8, b: u8) -> Vec<u8> {
    let mut pixels = Vec::with_capacity((width * height * 4) as usize);
    for _ in 0..height {
        for _ in 0..width {
            pixels.push(r);
            pixels.push(g);
            pixels.push(b);
            pixels.push(255); // Alpha
        }
    }
    pixels
}

#[test]
fn test_pure_green_screen() {
    let width = 100;
    let height = 100;
    let pixels = create_solid_color_image(width, height, 0, 255, 0);
    
    let config = DetectionConfig::default();
    let result = detect_chromakey(&pixels, width, height, &config).expect("Should detect green");
    
    // Green hue is 120
    assert!((result.hue - 120.0).abs() < 5.0, "Hue should be near 120, got {}", result.hue);
    assert!(result.confidence > 0.8, "Confidence should be high");
    assert!(result.color.g > 240);
}

#[test]
fn test_pure_blue_screen() {
    let width = 100;
    let height = 100;
    let pixels = create_solid_color_image(width, height, 0, 0, 255);
    
    let config = DetectionConfig::default();
    let result = detect_chromakey(&pixels, width, height, &config).expect("Should detect blue");
    
    // Blue hue is 240
    assert!((result.hue - 240.0).abs() < 5.0, "Hue should be near 240, got {}", result.hue);
    assert!(result.confidence > 0.8);
}

#[test]
fn test_center_subject_fallback() {
    let width = 100;
    let height = 100;
    // Create black image
    let mut pixels = create_solid_color_image(width, height, 0, 0, 0);
    
    // Draw green box in center (full width for middle rows to hit sampling points)
    // Rows 30-70, Cols 0-100
    for y in 30..70 {
        for x in 0..100 {
            let idx = ((y * width + x) * 4) as usize;
            pixels[idx] = 0;
            pixels[idx + 1] = 255;
            pixels[idx + 2] = 0;
            pixels[idx + 3] = 255;
        }
    }
    
    let config = DetectionConfig::default();
    let result = detect_chromakey(&pixels, width, height, &config).expect("Should detect green center");
    
    assert!((result.hue - 120.0).abs() < 5.0);
    // Coverage is 40% (40 rows of 100)
    assert!(result.coverage > 0.35);
}

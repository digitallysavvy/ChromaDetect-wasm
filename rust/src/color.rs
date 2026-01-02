use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct RGB {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Clone, Copy, Debug)]
pub struct HSV {
    pub h: f32,
    pub s: f32,
    pub v: f32,
}

impl RGB {
    #[inline]
    pub fn to_hsv(&self) -> HSV {
        let r = self.r as f32 / 255.0;
        let g = self.g as f32 / 255.0;
        let b = self.b as f32 / 255.0;

        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let delta = max - min;

        let mut h = 0.0;
        let s = if max == 0.0 { 0.0 } else { delta / max };
        let v = max;

        if delta != 0.0 {
            if max == r {
                h = (g - b) / delta + (if g < b { 6.0 } else { 0.0 });
            } else if max == g {
                h = (b - r) / delta + 2.0;
            } else {
                h = (r - g) / delta + 4.0;
            }
            h /= 6.0;
        }

        HSV {
            h: h * 360.0,
            s,
            v,
        }
    }
}

impl HSV {
    #[inline]
    pub fn to_rgb(&self) -> RGB {
        let h = self.h / 60.0;
        let s = self.s;
        let v = self.v;
        let c = v * s;
        let x = c * (1.0 - ((h % 2.0) - 1.0).abs());
        let m = v - c;

        let (r, g, b) = if h < 1.0 {
            (c, x, 0.0)
        } else if h < 2.0 {
            (x, c, 0.0)
        } else if h < 3.0 {
            (0.0, c, x)
        } else if h < 4.0 {
            (0.0, x, c)
        } else if h < 5.0 {
            (x, 0.0, c)
        } else {
            (c, 0.0, x)
        };

        RGB {
            r: ((r + m) * 255.0).round() as u8,
            g: ((g + m) * 255.0).round() as u8,
            b: ((b + m) * 255.0).round() as u8,
        }
    }

    pub fn is_chromakey_candidate(&self) -> bool {
        // Much more lenient: Accept any pixel with some color (not pure gray)
        // This allows darker/less saturated chromakeys and lighting variations
        self.s > 0.3 && self.v > 0.1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rgb_to_hsv_pure_red() {
        let rgb = RGB { r: 255, g: 0, b: 0 };
        let hsv = rgb.to_hsv();
        assert_eq!(hsv.h, 0.0);
        assert_eq!(hsv.s, 1.0);
        assert_eq!(hsv.v, 1.0);
    }

    #[test]
    fn test_rgb_to_hsv_pure_green() {
        let rgb = RGB { r: 0, g: 255, b: 0 };
        let hsv = rgb.to_hsv();
        assert_eq!(hsv.h, 120.0);
        assert_eq!(hsv.s, 1.0);
        assert_eq!(hsv.v, 1.0);
    }

    #[test]
    fn test_rgb_to_hsv_pure_blue() {
        let rgb = RGB { r: 0, g: 0, b: 255 };
        let hsv = rgb.to_hsv();
        assert_eq!(hsv.h, 240.0);
        assert_eq!(hsv.s, 1.0);
        assert_eq!(hsv.v, 1.0);
    }

    #[test]
    fn test_hsv_to_rgb_pure_red() {
        let hsv = HSV { h: 0.0, s: 1.0, v: 1.0 };
        let rgb = hsv.to_rgb();
        assert_eq!(rgb.r, 255);
        assert_eq!(rgb.g, 0);
        assert_eq!(rgb.b, 0);
    }

    #[test]
    fn test_hsv_to_rgb_pure_green() {
        let hsv = HSV { h: 120.0, s: 1.0, v: 1.0 };
        let rgb = hsv.to_rgb();
        assert_eq!(rgb.r, 0);
        assert_eq!(rgb.g, 255);
        assert_eq!(rgb.b, 0);
    }

    #[test]
    fn test_is_chromakey_candidate() {
        // High saturation, high value -> Candidate
        let hsv = HSV { h: 120.0, s: 0.8, v: 0.8 };
        assert!(hsv.is_chromakey_candidate());

        // Low saturation -> Not candidate
        let hsv_pale = HSV { h: 120.0, s: 0.2, v: 0.8 };
        assert!(!hsv_pale.is_chromakey_candidate());

        // Low value -> Not candidate
        let hsv_dark = HSV { h: 120.0, s: 0.8, v: 0.1 };
        assert!(!hsv_dark.is_chromakey_candidate());
    }
}

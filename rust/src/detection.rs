use serde::{Deserialize, Serialize};
use crate::color::{RGB, HSV};
use crate::histogram::ColorHistogram;
use crate::clustering::{KMeans, Cluster};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DetectionConfig {
    pub min_area_percentage: f32,     // Default: 0.25 (25% of frame)
    pub min_saturation: f32,           // Default: 0.6
    pub edge_sample_percentage: f32,   // Default: 0.15 (15% border)
    pub confidence_threshold: f32,     // Default: 0.7
}

impl Default for DetectionConfig {
    fn default() -> Self {
        Self {
            min_area_percentage: 0.25,
            min_saturation: 0.6,
            edge_sample_percentage: 0.15,
            confidence_threshold: 0.7,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChromakeyResult {
    pub color: RGB,
    pub confidence: f32,
    pub coverage: f32,              // % of image
    pub hue: f32,
    #[serde(rename = "method")]
    pub method_used: DetectionMethod,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DetectionMethod {
    Edge,           // Analyzed border pixels
    Cluster,        // K-means clustering
    Hybrid,         // Combined both methods
}

pub fn detect_chromakey(
    pixels: &[u8],
    width: u32,
    height: u32,
    config: &DetectionConfig,
) -> Option<ChromakeyResult> {
    // Strategy:
    // 1. Edge-based analysis (fast, catches most cases)
    // 2. If inconclusive, fall back to clustering
    
    // Step 1: Analyze edge pixels
    if let Some(edge_result) = analyze_edges(pixels, width, height, config) {
        if edge_result.confidence > config.confidence_threshold {
            return Some(edge_result);
        }
        
        // Step 2: Fall back to full-image clustering
        let cluster_result = analyze_clusters(pixels, width, height, config);
        
        // Step 3: Return best result
        return choose_best_result(Some(edge_result), cluster_result);
    }

    // If edges yielded nothing valid, try clusters
    analyze_clusters(pixels, width, height, config)
}

fn analyze_edges(
    pixels: &[u8],
    width: u32,
    height: u32,
    config: &DetectionConfig,
) -> Option<ChromakeyResult> {
    let mut histogram = ColorHistogram::new();
    
    // Sample border pixels (top, bottom, left, right)
    let border_width = (width as f32 * config.edge_sample_percentage) as u32;
    let border_height = (height as f32 * config.edge_sample_percentage) as u32;
    
    // Helper to get pixel safely
    let get_pixel = |x: u32, y: u32| -> Option<RGB> {
        if x >= width || y >= height { return None; }
        let idx = ((y * width + x) * 4) as usize;
        if idx + 2 < pixels.len() {
             Some(RGB {
                r: pixels[idx],
                g: pixels[idx + 1],
                b: pixels[idx + 2],
            })
        } else {
            None
        }
    };

    // Top and bottom edges
    for y in 0..border_height {
        for x in 0..width {
            if let Some(p) = get_pixel(x, y) { histogram.add_pixel(p); }
            if let Some(p) = get_pixel(x, height - 1 - y) { histogram.add_pixel(p); }
        }
    }
    
    // Left and right edges
    for x in 0..border_width {
        for y in border_height..height - border_height {
             if let Some(p) = get_pixel(x, y) { histogram.add_pixel(p); }
             if let Some(p) = get_pixel(width - 1 - x, y) { histogram.add_pixel(p); }
        }
    }
    
    // Find dominant color in edges
    let peaks = histogram.find_peaks(0.05); // Lower threshold for edges
    
    if let Some(best_peak) = peaks.first() {
        // Construct a result from the peak
        // We need to recover RGB from Hue. We can estimate.
        // Or better, we should have averaged the colors in the histogram bin.
        // For now, let's create a pure color from HSV.
        let hsv = HSV { h: best_peak.hue, s: 1.0, v: 1.0 }; // Assume full saturation/value for the "key" color representation
        
        Some(ChromakeyResult {
            color: hsv.to_rgb(),
            confidence: best_peak.percentage.min(1.0), // Simple confidence metric
            coverage: best_peak.percentage,
            hue: best_peak.hue,
            method_used: DetectionMethod::Edge,
        })
    } else {
        None
    }
}

fn analyze_clusters(
    pixels: &[u8],
    width: u32,
    height: u32,
    _config: &DetectionConfig,
) -> Option<ChromakeyResult> {
    let kmeans = KMeans::new(3); // k=3 usually enough
    let clusters = kmeans.find_clusters(pixels, width, height);
    
    // Filter for valid chromakey candidates
    let valid_clusters: Vec<&Cluster> = clusters.iter()
        .filter(|c| c.centroid.is_chromakey_candidate())
        .collect();
        
    if let Some(best) = valid_clusters.first() {
         Some(ChromakeyResult {
            color: best.centroid.to_rgb(),
            confidence: best.percentage.min(1.0),
            coverage: best.percentage,
            hue: best.centroid.h,
            method_used: DetectionMethod::Cluster,
        })
    } else {
        None
    }
}

fn choose_best_result(r1: Option<ChromakeyResult>, r2: Option<ChromakeyResult>) -> Option<ChromakeyResult> {
    match (r1, r2) {
        (Some(a), Some(b)) => {
            if a.confidence > b.confidence { Some(a) } else { Some(b) }
        },
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    }
}

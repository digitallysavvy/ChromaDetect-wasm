use crate::color::RGB;
use crate::detection::{ChromakeyResult, DetectionConfig, DetectionMethod};

pub struct VideoAnalyzer {
    // config is stored but currently unused in the logic below, keeping it for future use or matching plan
    #[allow(dead_code)] 
    config: DetectionConfig,
    frame_results: Vec<ChromakeyResult>,
}

impl VideoAnalyzer {
    pub fn new(config: DetectionConfig) -> Self {
        Self {
            config,
            frame_results: Vec::new(),
        }
    }
    
    pub fn add_frame_result(&mut self, result: ChromakeyResult) {
        self.frame_results.push(result);
    }
    
    pub fn compute_consensus(&self) -> Option<ChromakeyResult> {
        if self.frame_results.is_empty() {
            return None;
        }
        
        // Strategy: Find the most consistent color across frames
        // 1. Group similar colors (hue within ±10°)
        // 2. Find largest group
        // 3. Average properties within group
        // 4. Return high-confidence result
        
        let groups = self.group_similar_colors();
        let largest_group = groups.iter().max_by_key(|g| g.len())?;
        
        // Average the results in the largest group
        let consensus = self.average_results(largest_group);
        
        // Calculate consensus confidence: base confidence * agreement factor
        // agreement factor is essentially what % of frames agreed on this color
        let agreement_percentage = largest_group.len() as f32 / self.frame_results.len() as f32;
        
        Some(ChromakeyResult {
            color: consensus.color,
            confidence: consensus.confidence * agreement_percentage,
            coverage: consensus.coverage,
            hue: consensus.hue,
            method_used: DetectionMethod::Hybrid,
        })
    }
    
    fn group_similar_colors(&self) -> Vec<Vec<&ChromakeyResult>> {
        let mut groups: Vec<Vec<&ChromakeyResult>> = Vec::new();
        let hue_tolerance = 10.0; // ±10 degrees
        
        for result in &self.frame_results {
            let mut added = false;
            
            // Try to add to existing group
            for group in &mut groups {
                if let Some(first) = group.first() {
                    let hue_diff = (result.hue - first.hue).abs();
                    // Handle hue wraparound (0° = 360°)
                    let hue_diff = hue_diff.min(360.0 - hue_diff);
                    
                    if hue_diff < hue_tolerance {
                        group.push(result);
                        added = true;
                        break;
                    }
                }
            }
            
            // Create new group if needed
            if !added {
                groups.push(vec![result]);
            }
        }
        
        groups
    }
    
    fn average_results(&self, results: &[&ChromakeyResult]) -> ChromakeyResult {
        let mut avg_r = 0.0;
        let mut avg_g = 0.0;
        let mut avg_b = 0.0;
        let mut avg_confidence = 0.0;
        let mut avg_coverage = 0.0;
        let mut avg_hue = 0.0;
        
        for result in results {
            avg_r += result.color.r as f32;
            avg_g += result.color.g as f32;
            avg_b += result.color.b as f32;
            avg_confidence += result.confidence;
            avg_coverage += result.coverage;
            avg_hue += result.hue;
        }
        
        let count = results.len() as f32;
        
        ChromakeyResult {
            color: RGB {
                r: (avg_r / count).round() as u8,
                g: (avg_g / count).round() as u8,
                b: (avg_b / count).round() as u8,
            },
            confidence: avg_confidence / count,
            coverage: avg_coverage / count,
            hue: avg_hue / count,
            method_used: DetectionMethod::Hybrid,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_video_consensus_perfect_agreement() {
        let mut analyzer = VideoAnalyzer::new(DetectionConfig::default());
        
        // Add 5 identical frames (Green)
        for _ in 0..5 {
            analyzer.add_frame_result(ChromakeyResult {
                color: RGB { r: 0, g: 255, b: 0 },
                confidence: 0.9,
                coverage: 0.5,
                hue: 120.0,
                method_used: DetectionMethod::Edge,
            });
        }
        
        let consensus = analyzer.compute_consensus().unwrap();
        
        assert!((consensus.hue - 120.0).abs() < 0.1);
        assert!(consensus.confidence > 0.89); // 0.9 * 1.0 agreement
    }

    #[test]
    fn test_video_consensus_noise_handling() {
        let mut analyzer = VideoAnalyzer::new(DetectionConfig::default());
        
        // 4 frames Green (120)
        for _ in 0..4 {
            analyzer.add_frame_result(ChromakeyResult {
                color: RGB { r: 0, g: 255, b: 0 },
                confidence: 0.9,
                coverage: 0.5,
                hue: 120.0,
                method_used: DetectionMethod::Edge,
            });
        }
        
        // 1 frame Blue (240) - outlier
        analyzer.add_frame_result(ChromakeyResult {
            color: RGB { r: 0, g: 0, b: 255 },
            confidence: 0.9,
            coverage: 0.5,
            hue: 240.0,
            method_used: DetectionMethod::Edge,
        });
        
        let consensus = analyzer.compute_consensus().unwrap();
        
        // Should choose Green
        assert!((consensus.hue - 120.0).abs() < 1.0);
        // Agreement is 4/5 = 0.8
        // Confidence = 0.9 * 0.8 = 0.72
        assert!((consensus.confidence - 0.72).abs() < 0.01);
    }
}

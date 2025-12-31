pub mod color;
pub mod histogram;
pub mod clustering;
pub mod detection;
pub mod video;

use wasm_bindgen::prelude::*;
use crate::detection::{DetectionConfig, detect_chromakey};
use crate::video::VideoAnalyzer;

#[wasm_bindgen]
pub struct ChromaDetect {
    config: DetectionConfig,
    video_analyzer: Option<VideoAnalyzer>,
}

#[wasm_bindgen]
impl ChromaDetect {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // Set panic hook for better error messages
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();
        
        Self {
            config: DetectionConfig::default(),
            video_analyzer: None,
        }
    }
    
    /// Analyze a single image
    /// pixels: RGBA pixel data (Uint8Array from canvas)
    #[wasm_bindgen]
    pub fn detect_from_image(
        &self,
        pixels: &[u8],
        width: u32,
        height: u32,
    ) -> JsValue {
        match detect_chromakey(pixels, width, height, &self.config) {
            Some(result) => serde_wasm_bindgen::to_value(&result).unwrap(),
            None => JsValue::NULL,
        }
    }
    
    /// Initialize video analysis session
    #[wasm_bindgen]
    pub fn start_video_analysis(&mut self) {
        self.video_analyzer = Some(VideoAnalyzer::new(self.config.clone()));
    }
    
    /// Add a video frame to the analysis
    #[wasm_bindgen]
    pub fn add_video_frame(
        &mut self,
        pixels: &[u8],
        width: u32,
        height: u32,
    ) -> bool {
        if let Some(analyzer) = &mut self.video_analyzer {
            if let Some(result) = detect_chromakey(pixels, width, height, &self.config) {
                analyzer.add_frame_result(result);
                return true;
            }
        }
        false
    }
    
    /// Get consensus result from all analyzed frames
    #[wasm_bindgen]
    pub fn get_video_consensus(&self) -> JsValue {
        if let Some(analyzer) = &self.video_analyzer {
            match analyzer.compute_consensus() {
                Some(result) => serde_wasm_bindgen::to_value(&result).unwrap(),
                None => JsValue::NULL,
            }
        } else {
            JsValue::NULL
        }
    }
    
    /// Update detection configuration
    #[wasm_bindgen]
    pub fn set_config(&mut self, config: JsValue) {
        if let Ok(config) = serde_wasm_bindgen::from_value(config) {
            self.config = config;
        }
    }
}
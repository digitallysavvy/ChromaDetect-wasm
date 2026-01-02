export interface ChromakeyResult {
    color: {
        r: number;
        g: number;
        b: number;
    };
    confidence: number;
    coverage: number;
    hue: number;
    method?: 'edge' | 'cluster' | 'hybrid';
}
export interface DetectionConfig {
    minAreaPercentage?: number;
    minSaturation?: number;
    edgeSamplePercentage?: number;
    confidenceThreshold?: number;
}
export interface VideoConfig {
    frameSampleCount?: number;
    sampleStrategy?: 'uniform' | 'keyframes';
    maxDuration?: number;
}

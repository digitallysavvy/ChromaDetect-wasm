import { ChromakeyResult, DetectionConfig, VideoConfig } from './types';
export declare class ChromaDetect {
    private imageProcessor;
    private videoProcessor;
    private config;
    constructor();
    init(): Promise<void>;
    /**
     * Update detection configuration
     */
    setConfig(config: DetectionConfig): void;
    detectFromImage(source: HTMLImageElement | HTMLCanvasElement | ImageData | File): Promise<ChromakeyResult | null>;
    detectFromVideo(source: HTMLVideoElement | File, config?: VideoConfig): Promise<ChromakeyResult | null>;
    private loadImage;
}
export type { ChromakeyResult, DetectionConfig, VideoConfig };

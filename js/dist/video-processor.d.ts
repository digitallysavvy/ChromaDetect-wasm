import { ChromakeyResult, DetectionConfig, VideoConfig } from './types';
export declare class VideoProcessor {
    private detector;
    private initialized;
    init(): Promise<void>;
    setConfig(config: DetectionConfig): void;
    detectFromVideo(source: HTMLVideoElement | File, config?: VideoConfig): Promise<ChromakeyResult | null>;
    private calculateFrameTimestamps;
    private ensureVideoReady;
    private extractFrame;
    private loadVideoFile;
}

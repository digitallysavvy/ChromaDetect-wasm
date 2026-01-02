import { ChromakeyResult, DetectionConfig } from './types';
export declare class ImageProcessor {
    private detector;
    private initialized;
    init(): Promise<void>;
    setConfig(config: DetectionConfig): void;
    detectFromImage(source: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<ChromakeyResult | null>;
    private toImageData;
}

import { ImageProcessor } from './image-processor';
import { VideoProcessor } from './video-processor';
import type { ChromakeyResult, DetectionConfig, VideoConfig } from './types';

export class ChromaDetect {
  private imageProcessor: ImageProcessor;
  private videoProcessor: VideoProcessor;
  private config: DetectionConfig = {};

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.videoProcessor = new VideoProcessor();
  }

  async init(): Promise<void> {
    await Promise.all([this.imageProcessor.init(), this.videoProcessor.init()]);
  }

  /**
   * Update detection configuration
   */
  setConfig(config: DetectionConfig): void {
    this.config = { ...this.config, ...config };
    this.imageProcessor.setConfig(this.config);
    this.videoProcessor.setConfig(this.config);
  }

  // Simple API for images
  async detectFromImage(
    source: HTMLImageElement | HTMLCanvasElement | ImageData | File
  ): Promise<ChromakeyResult | null> {
    if (source instanceof File) {
      // Load image from file
      const img = await this.loadImage(source);
      return this.imageProcessor.detectFromImage(img);
    }
    return this.imageProcessor.detectFromImage(source);
  }

  // Simple API for videos
  async detectFromVideo(
    source: HTMLVideoElement | File,
    config?: VideoConfig
  ): Promise<ChromakeyResult | null> {
    return this.videoProcessor.detectFromVideo(source, config);
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }
}

// Re-export types
export type { ChromakeyResult, DetectionConfig, VideoConfig };

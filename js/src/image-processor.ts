import init, { ChromaDetect } from '../wasm/chroma_detect';
import { ChromakeyResult, DetectionConfig } from './types';

export class ImageProcessor {
  private detector: ChromaDetect | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    await init();
    this.detector = new ChromaDetect();
    this.initialized = true;
  }

  setConfig(config: DetectionConfig): void {
    if (this.detector) {
      this.detector.set_config(config);
    }
  }

  async detectFromImage(
    source: HTMLImageElement | HTMLCanvasElement | ImageData
  ): Promise<ChromakeyResult | null> {
    if (!this.detector) throw new Error('Not initialized');

    // Convert source to ImageData
    const imageData = this.toImageData(source);

    // Call WASM
    // result is JsValue, we need to cast it
    const pixelData = new Uint8Array(
      imageData.data.buffer,
      imageData.data.byteOffset,
      imageData.data.byteLength
    );
    const result = this.detector.detect_from_image(
      pixelData,
      imageData.width,
      imageData.height
    );

    return result as unknown as ChromakeyResult | null;
  }

  private toImageData(
    source: HTMLImageElement | HTMLCanvasElement | ImageData
  ): ImageData {
    if (source instanceof ImageData) {
      return source;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (source instanceof HTMLImageElement) {
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      ctx.drawImage(source, 0, 0);
    } else {
      canvas.width = source.width;
      canvas.height = source.height;
      ctx.drawImage(source, 0, 0);
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

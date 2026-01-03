import init, { ChromaDetect } from '../wasm/chroma_detect';
import { ChromakeyResult, DetectionConfig, VideoConfig } from './types';

export class VideoProcessor {
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

  async detectFromVideo(
    source: HTMLVideoElement | File,
    config: VideoConfig = {}
  ): Promise<ChromakeyResult | null> {
    if (!this.detector) throw new Error('Not initialized');

    const {
      frameSampleCount = 8,
      sampleStrategy = 'uniform',
      maxDuration = 30,
    } = config;

    // Get video element (load if File)
    const isFile = source instanceof File;
    const video = isFile ? await this.loadVideoFile(source) : source;

    try {
      // Ensure video is fully loaded and ready for seeking
      await this.ensureVideoReady(video);

      // Extract frame timestamps
      const timestamps = this.calculateFrameTimestamps(
        video.duration,
        frameSampleCount,
        sampleStrategy,
        maxDuration
      );

      // Initialize video analysis
      this.detector.start_video_analysis();

      // Process each frame
      for (const timestamp of timestamps) {
        try {
          const imageData = await this.extractFrame(video, timestamp);
          const pixelData = new Uint8Array(
            imageData.data.buffer,
            imageData.data.byteOffset,
            imageData.data.byteLength
          );
          this.detector.add_video_frame(
            pixelData,
            imageData.width,
            imageData.height
          );
        } catch (e) {
          console.warn(`Failed to extract frame at ${timestamp}s`, e);
        }
      }

      // Get consensus result
      const result = this.detector.get_video_consensus();
      return result as unknown as ChromakeyResult | null;
    } finally {
      // Clean up blob URL if we created one from a File
      if (isFile && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
      }
    }
  }

  private calculateFrameTimestamps(
    duration: number,
    count: number,
    strategy: 'uniform' | 'keyframes',
    maxDuration: number
  ): number[] {
    const effectiveDuration = Math.min(duration, maxDuration);

    if (strategy === 'uniform') {
      // Evenly spaced samples
      const interval = effectiveDuration / (count + 1);
      return Array.from({ length: count }, (_, i) => (i + 1) * interval);
    } else {
      // Sample more at beginning/end (where chromakeys usually are)
      const timestamps: number[] = [];

      // 40% of samples from first 10%
      const earlyCount = Math.floor(count * 0.4);
      for (let i = 0; i < earlyCount; i++) {
        timestamps.push((effectiveDuration * 0.1 * i) / earlyCount);
      }

      // 40% from last 10%
      const lateStart = effectiveDuration * 0.9;
      for (let i = 0; i < earlyCount; i++) {
        timestamps.push(lateStart + (effectiveDuration * 0.1 * i) / earlyCount);
      }

      // 20% from middle
      const middleCount = count - earlyCount * 2;
      const middleStart = effectiveDuration * 0.3;
      const middleEnd = effectiveDuration * 0.7;
      for (let i = 0; i < middleCount; i++) {
        timestamps.push(
          middleStart + ((middleEnd - middleStart) * i) / middleCount
        );
      }

      return timestamps.sort((a, b) => a - b);
    }
  }

  private async ensureVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      // If video is already ready (HAVE_ENOUGH_DATA), resolve immediately
      if (video.readyState >= 4) {
        resolve();
        return;
      }

      const onCanPlayThrough = () => {
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
        resolve();
      };

      const onError = (e: Event) => {
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
        reject(new Error('Video failed to load: ' + (e as ErrorEvent).message));
      };

      video.addEventListener('canplaythrough', onCanPlayThrough);
      video.addEventListener('error', onError);

      // Timeout after 30 seconds for large videos
      const timeoutId = setTimeout(() => {
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        reject(new Error('Video load timeout'));
      }, 30000);

      // Trigger loading if not already started
      video.load();
    });
  }

  private async extractFrame(
    video: HTMLVideoElement,
    timestamp: number
  ): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const onSeeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        video.removeEventListener('seeked', onSeeked);
        clearTimeout(timeoutId);
        resolve(imageData);
      };

      const onError = () => {
        video.removeEventListener('seeked', onSeeked);
        clearTimeout(timeoutId);
        reject(new Error('Seek failed'));
      };

      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.currentTime = timestamp;

      // Increased timeout to 5 seconds since video is now fully buffered
      const timeoutId = setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Frame extraction timeout'));
      }, 5000);
    });
  }

  private async loadVideoFile(file: File): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.preload = 'auto'; // Changed from 'metadata' to 'auto' to load full video
      video.muted = true;
      video.src = url;

      const onCanPlayThrough = () => {
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
        resolve(video);
      };

      const onError = () => {
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      video.addEventListener('canplaythrough', onCanPlayThrough);
      video.addEventListener('error', onError);

      // Timeout after 30 seconds for large video files
      const timeoutId = setTimeout(() => {
        video.removeEventListener('canplaythrough', onCanPlayThrough);
        video.removeEventListener('error', onError);
        URL.revokeObjectURL(url);
        reject(new Error('Video load timeout'));
      }, 30000);
    });
  }
}

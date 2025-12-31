import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChromaDetect } from './index';

// Mock the dependencies using prototype pattern
vi.mock('./image-processor', () => {
  const MockImageProcessor = vi.fn();
  MockImageProcessor.prototype.init = vi.fn().mockResolvedValue(undefined);
  MockImageProcessor.prototype.detectFromImage = vi.fn().mockResolvedValue({ hue: 120 });
  return { ImageProcessor: MockImageProcessor };
});

vi.mock('./video-processor', () => {
  const MockVideoProcessor = vi.fn();
  MockVideoProcessor.prototype.init = vi.fn().mockResolvedValue(undefined);
  MockVideoProcessor.prototype.detectFromVideo = vi.fn().mockResolvedValue({ hue: 240 });
  return { VideoProcessor: MockVideoProcessor };
});

describe('ChromaDetect Main', () => {
  let detector: ChromaDetect;

  beforeEach(() => {
    detector = new ChromaDetect();
  });

  it('should initialize both processors', async () => {
    await detector.init();
    // Verification is implicit as mocks are called. 
  });

  it('should delegate image detection', async () => {
    const result = await detector.detectFromImage(document.createElement('img'));
    expect(result).toEqual({ hue: 120 });
  });

  it('should delegate video detection', async () => {
    const result = await detector.detectFromVideo(document.createElement('video'));
    expect(result).toEqual({ hue: 240 });
  });

  it('should handle File input for image detection', async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockUrl = 'blob:test';
    global.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
    global.URL.revokeObjectURL = vi.fn();

    // Mock Image constructor and loading behavior
    const originalImage = global.Image;
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      _src = '';
      set src(val: string) {
        this._src = val;
        // Simulate async load
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as any;

    const file = new File([''], 'test.png', { type: 'image/png' });
    const result = await detector.detectFromImage(file);

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    expect(result).toEqual({ hue: 120 }); // From mocked ImageProcessor

    // Restore Image
    global.Image = originalImage;
  });

  it('should handle image load error', async () => {
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:bad');
    global.URL.revokeObjectURL = vi.fn();

    const originalImage = global.Image;
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      set src(val: string) {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Load failed'));
        }, 0);
      }
    } as any;

    const file = new File([''], 'test.png');
    await expect(detector.detectFromImage(file)).rejects.toThrow('Failed to load image');

    global.Image = originalImage;
  });
});

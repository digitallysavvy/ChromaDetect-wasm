import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageProcessor } from './image-processor';

// Mock the WASM module
vi.mock('../wasm/chroma_detect', () => {
  const ChromaDetectMock = vi.fn();
  ChromaDetectMock.prototype.detect_from_image = vi.fn();
  
  return {
    default: vi.fn().mockResolvedValue(undefined), // init function
    ChromaDetect: ChromaDetectMock,
  };
});

import init, { ChromaDetect } from '../wasm/chroma_detect';

describe('ImageProcessor', () => {
  let processor: ImageProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Polyfill ImageData if missing (JSDOM issue)
    if (typeof ImageData === 'undefined') {
      global.ImageData = class {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        constructor(sw: number, sh: number) {
            this.width = sw;
            this.height = sh;
            this.data = new Uint8ClampedArray(sw * sh * 4);
        }
      } as any;
    }
    
    processor = new ImageProcessor();
  });

  it('should initialize correctly', async () => {
    await processor.init();
    expect(init).toHaveBeenCalled();
    expect(ChromaDetect).toHaveBeenCalled();
  });

  it('should throw if not initialized', async () => {
    const img = document.createElement('img');
    await expect(processor.detectFromImage(img)).rejects.toThrow('Not initialized');
  });

  it('should process HTMLImageElement', async () => {
    await processor.init();
    
    // Mock ChromaDetect instance method
    const mockDetect = vi.fn().mockReturnValue({
      color: { r: 0, g: 255, b: 0 },
      confidence: 0.9,
      coverage: 0.5,
      hue: 120
    });
    // @ts-ignore - Accessing mock instance
    (ChromaDetect as any).mock.instances[0].detect_from_image = mockDetect;

    const img = document.createElement('img');
    // Mock natural dimensions
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });

    // Mock Canvas context
    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockImplementation((x, y, w, h) => {
        return new ImageData(w, h);
      }),
    };
    
    // Mock canvas creation
    const mockCanvas = document.createElement('canvas');
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        // @ts-ignore
        mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);
        return mockCanvas;
      }
      return document.createElement(tagName); // fallback
    });

    const result = await processor.detectFromImage(img);

    expect(mockContext.drawImage).toHaveBeenCalledWith(img, 0, 0);
    expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    expect(mockDetect).toHaveBeenCalled();
    expect(result).toEqual({
      color: { r: 0, g: 255, b: 0 },
      confidence: 0.9,
      coverage: 0.5,
      hue: 120
    });
  });

  it('should process HTMLCanvasElement', async () => {
    await processor.init();
    
    // Mock ChromaDetect instance method
    const mockDetect = vi.fn().mockReturnValue({ hue: 240 });
    // @ts-ignore
    (ChromaDetect as any).mock.instances[0].detect_from_image = mockDetect;

    const inputCanvas = document.createElement('canvas');
    inputCanvas.width = 50;
    inputCanvas.height = 50;
    
    // Internal canvas created by toImageData
    const internalContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(new ImageData(50, 50)),
    };
    const internalCanvas = document.createElement('canvas');
    internalCanvas.getContext = vi.fn().mockReturnValue(internalContext);

    // Spy on createElement to return our internal mock canvas
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
       if (tagName === 'canvas') return internalCanvas;
       return document.createElement(tagName);
    });

    const result = await processor.detectFromImage(inputCanvas);

    expect(internalContext.drawImage).toHaveBeenCalledWith(inputCanvas, 0, 0);
    expect(internalContext.getImageData).toHaveBeenCalledWith(0, 0, 50, 50);
    expect(mockDetect).toHaveBeenCalled();
    expect(result).toEqual({ hue: 240 });
    
    createElementSpy.mockRestore();
  });

  it('should process ImageData directly', async () => {
    await processor.init();
    
    const mockDetect = vi.fn().mockReturnValue({ hue: 60 });
    // @ts-ignore
    (ChromaDetect as any).mock.instances[0].detect_from_image = mockDetect;

    const imageData = new ImageData(10, 10);
    const result = await processor.detectFromImage(imageData);

    // Should NOT create a canvas or call drawImage
    const createElementSpy = vi.spyOn(document, 'createElement');
    expect(createElementSpy).not.toHaveBeenCalledWith('canvas');
    
    expect(mockDetect).toHaveBeenCalled();
    expect(result).toEqual({ hue: 60 });
  });

  it('should skip initialization if already initialized', async () => {
    await processor.init();
    await processor.init();
    // Verify init() from wasm was called only once.
    // Since we mocked the module default export:
    expect(init).toHaveBeenCalledTimes(1);
  });
});

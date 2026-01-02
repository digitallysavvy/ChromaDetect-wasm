import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoProcessor } from './video-processor';
import { ChromaDetect } from '../wasm/chroma_detect';

// Mock the WASM module
vi.mock('../wasm/chroma_detect', () => {
  const ChromaDetectMock = vi.fn();
  ChromaDetectMock.prototype.start_video_analysis = vi.fn();
  ChromaDetectMock.prototype.add_video_frame = vi.fn();
  ChromaDetectMock.prototype.get_video_consensus = vi.fn();

  return {
    default: vi.fn().mockResolvedValue(undefined),
    ChromaDetect: ChromaDetectMock,
  };
});

describe('VideoProcessor', () => {
  let processor: VideoProcessor;

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
    processor = new VideoProcessor();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateFrameTimestamps', () => {
    it('should calculate uniform timestamps', () => {
      const timestamps = (processor as any).calculateFrameTimestamps(
        10,
        4,
        'uniform',
        30
      );
      expect(timestamps).toEqual([2, 4, 6, 8]);
    });

    it('should respect maxDuration', () => {
      const timestamps = (processor as any).calculateFrameTimestamps(
        100,
        4,
        'uniform',
        10
      );
      expect(timestamps).toEqual([2, 4, 6, 8]);
    });

    it('should calculate keyframe strategy timestamps', () => {
      const timestamps = (processor as any).calculateFrameTimestamps(
        10,
        10,
        'keyframes',
        30
      );
      expect(timestamps.length).toBe(10);
      const sorted = [...timestamps].sort((a, b) => a - b);
      expect(timestamps).toEqual(sorted);
      expect(timestamps[0]).toBeLessThan(1.1);
      expect(timestamps[6]).toBeGreaterThan(8.9);
    });
  });

  it('should not re-initialize if already initialized', async () => {
    await processor.init();
    await processor.init();
    // Check mocks call count (init is the default export mock)
  });

  it('should detect from HTMLVideoElement', async () => {
    await processor.init();

    const mockAddFrame = vi.fn();
    const mockGetConsensus = vi.fn().mockReturnValue({ hue: 120 });
    // @ts-ignore
    (ChromaDetect as any).mock.instances[0].add_video_frame = mockAddFrame;
    // @ts-ignore
    (ChromaDetect as any).mock.instances[0].get_video_consensus =
      mockGetConsensus;

    // Use a plain object to avoid JSDOM readonly properties
    const video = {
      duration: 10,
      videoWidth: 100,
      videoHeight: 100,
      currentTime: 0,
      readyState: 4,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    // Mock seeking behavior
    let seekHandler: EventListener | null = null;
    video.addEventListener = vi.fn().mockImplementation((event, handler) => {
      if (event === 'seeked') seekHandler = handler as EventListener;
    });

    let currentTime = 0;
    Object.defineProperty(video, 'currentTime', {
      get: () => currentTime,
      set: (val) => {
        currentTime = val;
        // The code sets listener BEFORE setting currentTime now (fixed bug)
        // So seekHandler should be available
        if (seekHandler) setTimeout(seekHandler, 0);
      },
    });

    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(new ImageData(100, 100)),
    };
    const mockCanvas = document.createElement('canvas');
    mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return mockCanvas;
      return document.createElement(tagName);
    });

    const result = await processor.detectFromVideo(video, {
      frameSampleCount: 2,
    });

    expect(mockAddFrame).toHaveBeenCalledTimes(2);
    expect(mockGetConsensus).toHaveBeenCalled();
    expect(result).toEqual({ hue: 120 });
  });

  it('should handle File input and load video', async () => {
    vi.useFakeTimers();
    await processor.init();

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:video');
    global.URL.revokeObjectURL = vi.fn();

    let canPlayThroughHandler: EventListener | null = null;
    let seekedHandler: EventListener | null = null;
    let srcValue = '';

    const videoMock = {
      preload: '',
      muted: false,
      get src() { return srcValue; },
      set src(val: string) {
        srcValue = val;
        // Simulate canplaythrough event when src is set
        setTimeout(() => {
          if (canPlayThroughHandler) canPlayThroughHandler(new Event('canplaythrough'));
        }, 50);
      },
      duration: 5,
      videoWidth: 100,
      videoHeight: 100,
      get currentTime() { return 0; },
      set currentTime(_val: number) {
        setTimeout(() => {
          if (seekedHandler) seekedHandler(new Event('seeked'));
        }, 10);
      },
      readyState: 4, // HAVE_ENOUGH_DATA
      addEventListener: vi.fn().mockImplementation((event, handler) => {
        if (event === 'canplaythrough') canPlayThroughHandler = handler as EventListener;
        if (event === 'seeked') seekedHandler = handler as EventListener;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      load: vi.fn(),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        return videoMock as any;
      }
      if (tagName === 'canvas') {
        const c = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => new ImageData(10, 10),
          }),
        } as any;
        return c;
      }
      return {} as any;
    });

    const file = new File([''], 'test.mp4', { type: 'video/mp4' });
    const promise = processor.detectFromVideo(file, { frameSampleCount: 1 });

    // Run all timers to completion
    await vi.runAllTimersAsync();

    await promise;

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it('should handle video load error', async () => {
    await processor.init();

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:bad');
    global.URL.revokeObjectURL = vi.fn();

    let errorHandler: EventListener | null = null;

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        const v = {
          preload: '',
          muted: false,
          addEventListener: vi.fn().mockImplementation((event, handler) => {
            if (event === 'error') errorHandler = handler as EventListener;
          }),
          removeEventListener: vi.fn(),
          set src(_val: string) {
            setTimeout(() => {
              if (errorHandler) errorHandler(new ErrorEvent('error', { message: 'Load failed' }));
            }, 10);
          },
        } as any;
        return v;
      }
      return {} as any;
    });

    const file = new File([''], 'bad.mp4');
    await expect(processor.detectFromVideo(file)).rejects.toThrow(
      'Failed to load video'
    );
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:bad');
  });

  it('should handle frame extraction timeout', async () => {
    await processor.init();

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock video object
    const video = {
      duration: 10,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      currentTime: 0,
      readyState: 4,
    } as unknown as HTMLVideoElement;

    vi.useFakeTimers();

    const promise = processor.detectFromVideo(video, { frameSampleCount: 1 });

    // Fast-forward time
    await vi.advanceTimersByTimeAsync(2500);

    await promise;

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to extract frame'),
      expect.any(Error)
    );
    warnSpy.mockRestore();

    vi.useRealTimers();
  });
});

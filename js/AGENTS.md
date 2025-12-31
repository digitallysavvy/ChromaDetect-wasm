# Agent Instructions for chroma-detect

This document provides context for AI agents helping developers integrate the **chroma-detect** library.

## What This Library Does

Chroma Detect automatically identifies the dominant chromakey color (green screen, blue screen, or any high-saturation backdrop) in images and videos. It returns the detected color, confidence score, and coverage percentage.

## Quick Start

```typescript
import { ChromaDetect } from 'chroma-detect';

const detector = new ChromaDetect();
await detector.init(); // Required: loads WASM module

// Image detection
const result = await detector.detectFromImage(imageElement);
// result: { color: { r, g, b }, confidence: 0.95, coverage: 0.4, hue: 120 }

// Video detection (analyzes multiple frames)
const videoResult = await detector.detectFromVideo(videoFile, {
  frameSampleCount: 8,
  sampleStrategy: 'uniform',
  maxDuration: 30,
});
```

## API Reference

### `ChromaDetect` Class

#### `init(): Promise<void>`

Initializes the WASM module. **Must be called before any detection.**

#### `detectFromImage(source): Promise<ChromakeyResult | null>`

Detects chromakey color from an image source.

**Supported sources:**

- `HTMLImageElement`
- `HTMLCanvasElement`
- `ImageData`
- `File` (image file)

#### `detectFromVideo(source, config?): Promise<ChromakeyResult | null>`

Analyzes multiple video frames to find a consensus chromakey color.

**Supported sources:**

- `HTMLVideoElement`
- `File` (video file)

**Config options:**

- `frameSampleCount`: Number of frames to analyze (default: 8)
- `sampleStrategy`: `'uniform'` | `'keyframes'` (default: `'uniform'`)
- `maxDuration`: Max seconds to analyze (default: 30)

#### `setConfig(config): void`

Adjusts detection sensitivity. Call before detection.

```typescript
detector.setConfig({
  minSaturation: 0.4, // Min saturation for valid pixels (0.0-1.0)
  minAreaPercentage: 0.1, // Min coverage to be valid (0.0-1.0)
  confidenceThreshold: 0.6, // Min confidence to return result
  edgeSamplePercentage: 0.15, // Border scan percentage
});
```

### `ChromakeyResult` Interface

```typescript
interface ChromakeyResult {
  color: { r: number; g: number; b: number };
  confidence: number; // 0.0 - 1.0
  coverage: number; // 0.0 - 1.0, percentage of image
  hue: number; // 0 - 360, hue angle
  method?: 'edge' | 'cluster' | 'hybrid';
}
```

## Common Patterns

### Check if a valid chromakey was detected

```typescript
const result = await detector.detectFromImage(img);
if (result && result.confidence > 0.7) {
  console.log('High-confidence chromakey found:', result.color);
}
```

### Convert result to CSS color

```typescript
const { r, g, b } = result.color;
const cssColor = `rgb(${r}, ${g}, ${b})`;
```

### Handle video file upload

```typescript
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file.type.startsWith('video/')) {
    const result = await detector.detectFromVideo(file);
  }
});
```

## Notes

- Always call `init()` before using detection methods
- The library is hue-agnostic: it detects any saturated color, not just green/blue
- Large images are automatically downsampled for performance
- Video analysis extracts frames asynchronously without blocking the main thread

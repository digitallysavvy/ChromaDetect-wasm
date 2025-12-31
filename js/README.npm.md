# chroma-detect

**High-performance chromakey detection for the web, powered by Rust and WebAssembly.**

Automatically identify the optimal chromakey color (green screen, blue screen, or any solid high-saturation backdrop) in images and videos.

## Features

- **WASM Powered**: Core algorithms in Rust for near-native performance
- **Universal Detection**: Works with green, blue, or any solid-colored backdrop
- **Video Consensus**: Analyzes multiple frames to find the most consistent key color
- **Type-Safe**: Full TypeScript definitions included
- **Flexible Input**: Works with `<img>`, `<video>`, `<canvas>`, `File`, and `ImageData`

## Installation

```bash
npm install chroma-detect
```

## Quick Start

```typescript
import { ChromaDetect } from 'chroma-detect';

// Initialize (loads WASM module)
const detector = new ChromaDetect();
await detector.init();

// Detect from image
const img = document.getElementById('my-image') as HTMLImageElement;
const result = await detector.detectFromImage(img);

if (result) {
  console.log('Detected Color:', result.color); // { r: 0, g: 255, b: 0 }
  console.log('Confidence:', result.confidence); // 0.95
}
```

## Video Analysis

```typescript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const result = await detector.detectFromVideo(file, {
  frameSampleCount: 10,
  sampleStrategy: 'uniform',
  maxDuration: 60,
});

console.log('Consensus Key Color:', result.color);
```

## Configuration

```typescript
detector.setConfig({
  minSaturation: 0.4,
  minAreaPercentage: 0.1,
  confidenceThreshold: 0.6,
  edgeSamplePercentage: 0.15,
});
```

## Result Shape

```typescript
interface ChromakeyResult {
  color: { r: number; g: number; b: number };
  confidence: number; // 0.0 - 1.0
  coverage: number; // 0.0 - 1.0
  hue: number; // 0 - 360
  method?: 'edge' | 'cluster' | 'hybrid';
}
```

## Links

- [GitHub Repository](https://github.com/digitallysavvy/ChromaDetect-wasm)
- [Report Issues](https://github.com/digitallysavvy/ChromaDetect-wasm/issues)

## License

MIT

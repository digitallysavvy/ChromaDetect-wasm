# Chroma Detect

[![CI](https://github.com/digitallysavvy/ChromaDetect-wasm/actions/workflows/ci.yml/badge.svg)](https://github.com/digitallysavvy/ChromaDetect-wasm/actions/workflows/ci.yml)
[![Tests](https://github.com/digitallysavvy/ChromaDetect-wasm/actions/workflows/test.yml/badge.svg)](https://github.com/digitallysavvy/ChromaDetect-wasm/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/chroma-detect.svg)](https://www.npmjs.com/package/chroma-detect)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**High-performance chromakey detection for the web, powered by Rust and WebAssembly.**

Chroma Detect analyzes images and videos to automatically identify the optimal chromakey color (such as traditional green/blue or any solid high-saturation backdrop) for removal. It uses a hybrid approach, combining fast edge-based sampling with K-Means clustering to ensure accuracy even with uneven lighting.

## Features

- **WASM Powered**: Core algorithms written in Rust for near-native performance.
- **Hybrid Engine**: Uses edge scanning for speed and clustering for precision.
- **Universal Detection**: Works with green, blue, or any solid-colored backdrop.
- **Video Consensus**: Analyzes multiple frames to find the most consistent key color across a video.
- **Type-Safe**: Written in TypeScript with full type definitions.
- **Flexible**: Works with `<img>`, `<video>`, `<canvas>`, `File`, and `ImageData`.

## Installation

```bash
npm install chroma-detect
```

## Usage

### 1. Basic Image Detection

```typescript
import { ChromaDetect } from 'chroma-detect';

// 1. Initialize the WASM module
const detector = new ChromaDetect();
await detector.init();

// 2. Detect from an image element
const img = document.getElementById('my-image') as HTMLImageElement;
const result = await detector.detectFromImage(img);

if (result) {
  console.log('Detected Color:', result.color); // { r: 0, g: 255, b: 0 }
  console.log('Confidence:', result.confidence); // 0.95
}
```

### 2. Video Analysis

Automatically scans multiple frames of a video to find the best consensus color.

```typescript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const result = await detector.detectFromVideo(file, {
  frameSampleCount: 10, // Analyze 10 frames (default: 8)
  sampleStrategy: 'uniform', // Spread evenly across the video
  maxDuration: 60, // Limit analysis to first 60s (default: 30)
});

console.log('Consensus Key Color:', result.color);
```

## Configuration

You can customize the detection sensitivity before running detection:

```typescript
// Configure before detecting
detector.setConfig({
  minSaturation: 0.4, // Lower limit for "colorful" pixels (0.0 - 1.0)
  minAreaPercentage: 0.1, // Minimum screen coverage to be considered valid
  confidenceThreshold: 0.6, // Minimum confidence to return a result
  edgeSamplePercentage: 0.15, // % of image border to scan for edges
});

const result = await detector.detectFromImage(img);
```

## Result Shape

```typescript
interface ChromakeyResult {
  color: { r: number; g: number; b: number }; // Detected key color
  confidence: number; // 0.0 - 1.0, how confident the detection is
  coverage: number; // 0.0 - 1.0, % of image covered by this color
  hue: number; // 0 - 360, hue angle of the detected color
  method?: 'edge' | 'cluster' | 'hybrid'; // Detection method used
}
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Development

This project is a hybrid Rust + TypeScript workspace.

### Prerequisites

- Rust (stable)
- `wasm-pack`: `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`
- Node.js 20+

### Building Locally

Use the build script to compile the Rust code to WASM and bundle the TypeScript package:

```bash
./scripts/build.sh
```

### Running Tests

```bash
# Test Rust core
cd rust && cargo test

# Test JS wrapper
cd js && npm test
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

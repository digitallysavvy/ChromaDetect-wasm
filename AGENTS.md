# Agent Instructions for Chroma Detect

This document provides context and guidelines for AI agents (like Cursor, GitHub Copilot, etc.) working on the **Chroma Detect** project.

## Project Overview

Chroma Detect is a high-performance library for identifying the optimal chromakey (green screen) color in images and videos. It uses a hybrid approach:

1.  **Fast Edge Sampling**: Quickly scans image borders for dominant colors.
2.  **K-Means Clustering**: Provides high precision for uneven lighting or complex backdrops.
3.  **Video Consensus**: Analyzes multiple frames to find a stable key color.

## Tech Stack

- **Core**: Rust (compiled to WebAssembly via `wasm-pack`).
- **Wrapper**: TypeScript (bundled via Vite).
- **Communication**: `serde-wasm-bindgen` for efficient data transfer between WASM and JS.

## Repository Structure

- `/rust`: The core detection engine.
  - `src/lib.rs`: WASM entry point and JS bindings.
  - `src/detection.rs`: The hybrid detection orchestrator.
  - `src/clustering.rs`: K-Means clustering implementation.
  - `src/histogram.rs`: Color frequency analysis.
- `/js`: The TypeScript consumer-facing library.
  - `src/index.ts`: Main class (`ChromaDetect`) that coordinates image and video processing.
  - `src/video-processor.ts`: Handles frame extraction and seeking for `<video>` elements and `File` objects.
- `/scripts`:
  - `build.sh`: Orchestrates the full build (Rust → WASM → JS Bundle).

## Essential Commands

### Build Workflow

Always run the root build script after changing Rust code:

```bash
./scripts/build.sh
```

### Testing

- **Rust**: `cd rust && cargo test`
- **JavaScript**: `cd js && npm test`

## Key Patterns & Constraints

### 1. Data Serialization

We use `serde` to communicate between Rust and JS. To keep the JS API clean:

- Rust enums are renamed to lowercase in JS (e.g., `DetectionMethod::Edge` → `"edge"`).
- Use `#[serde(rename = "...")]` in Rust to maintain idiomatic names in both languages.

### 2. Video Processing

Video frame extraction is asynchronous and requires careful handling of the browser's `<video>` element (e.g., waiting for `seeked` events). Avoid blocking the main thread during heavy analysis.

### 3. Saturated Color Detection

The algorithm is hue-agnostic. It looks for **high saturation** and **reasonable brightness**. Do not hardcode checks for "green" (hue ~120) or "blue" (hue ~240) in the core logic; keep it universal.

## Guidance for Edits

1.  **Type Safety**: Ensure TypeScript interfaces in `js/src/types.ts` strictly match the `serde` output from Rust.
2.  **Performance**: Keep the Rust core optimized. Large images are automatically downsampled in `clustering.rs`.
3.  **Tests**: If you modify detection logic, update both Rust unit tests and JS integration tests.
4.  **Browser APIs**: `VideoProcessor` relies on `document.createElement('canvas')` and `URL.createObjectURL`. Ensure cleanup (e.g., `revokeObjectURL`) is handled to avoid memory leaks.

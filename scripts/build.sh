#!/bin/bash
set -e

echo "🦀 Building Rust WASM..."

# Build WASM with wasm-pack
cd rust
wasm-pack build \
  --target web \
  --out-dir ../js/wasm \
  --release

cd ..

echo "📦 Building JavaScript package..."
cd js
npm run build

echo "✅ Build complete!"


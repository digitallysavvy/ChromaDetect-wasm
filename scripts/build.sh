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
# Copy LICENSE and use npm-specific README for the package
cp LICENSE js/
cp js/README.npm.md js/README.md
cd js
npm run build

echo "✅ Build complete!"


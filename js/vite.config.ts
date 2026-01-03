import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts'],
    }) as any, // Type mismatch between vite and vitest's bundled vite
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChromaDetect',
      fileName: 'chroma-detect',
      formats: ['es', 'umd'],
    },
    // Prevent Vite from inlining WASM files as base64 data URLs
    assetsInlineLimit: 0,
    rollupOptions: {
      // Exclude wasm directory from bundling - it's published separately
      external: (id) => {
        // Keep wasm imports external so they resolve at runtime
        return id.includes('/wasm/') || id.endsWith('.wasm');
      },
      output: {
        // Preserve relative paths for wasm imports
        paths: (id) => {
          if (id.includes('/wasm/')) {
            // Return relative path from dist to wasm directory
            return id.replace(/.*\/wasm\//, '../wasm/');
          }
          return id;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});

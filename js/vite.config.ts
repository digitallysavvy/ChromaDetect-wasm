import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChromaDetect',
      fileName: 'chroma-detect',
      formats: ['es', 'umd'],
    },
  },
  test: {
    environment: 'jsdom',
  },
});

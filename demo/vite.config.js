import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: '.',
  // Set base path for GitHub Pages deployment
  base: process.env.GITHUB_ACTIONS ? '/ChromaDetect-wasm/' : '/',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'assets',
          dest: '.',
        },
        {
          src: 'expected-results.json',
          dest: '.',
        },
        {
          src: '*.png',
          dest: '.',
        },
        {
          src: '*.ico',
          dest: '.',
        },
        {
          src: '*.webmanifest',
          dest: '.',
        },
      ],
    }),
    // Plugin to handle WASM files correctly
    {
      name: 'wasm-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Handle WASM files with correct MIME type
          if (req.url.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        testRunner: resolve(__dirname, 'test-runner.html'),
      },
      // Don't inline WASM files
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'wasm/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Prevent Vite from inlining WASM files
    assetsInlineLimit: 0,
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
    open: true,
    // Configure server to handle larger headers and prevent 431 errors
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
    },
    // Allow serving files from parent directory (for local chroma-detect package wasm files)
    fs: {
      allow: ['..'],
    },
  },
});

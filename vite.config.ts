import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// COOP/COEP headers enable SharedArrayBuffer, required by the multithreaded
// Fairy-Stockfish WASM engine. The dev and preview servers send them here.
// On GitHub Pages (which cannot set headers) the same effect is achieved at
// runtime via coi-serviceworker (see index.html / public/coi-serviceworker.js).
const crossOriginIsolation = {
  name: 'cross-origin-isolation',
  configureServer(server: { middlewares: { use: (fn: (req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((_req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });
  },
  configurePreviewServer(server: { middlewares: { use: (fn: (req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((_req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });
  },
};

// GitHub Pages: served from https://uqdaddy.github.io/myapp/
// so the base path must match the repo name.
export default defineConfig({
  base: '/myapp/',
  plugins: [react(), crossOriginIsolation],
});

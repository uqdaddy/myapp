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

// Base path differs by host:
//  - GitHub Pages: served from https://uqdaddy.github.io/myapp/ -> base "/myapp/"
//  - Cloudflare Pages: served from the site root -> base "/"
// Controlled by APP_BASE (defaults to the GitHub Pages path).
declare const process: { env: Record<string, string | undefined> };
const base = process.env.APP_BASE ?? '/myapp/';

export default defineConfig({
  base,
  plugins: [react(), crossOriginIsolation],
});

// Copy the Fairy-Stockfish WASM engine artifacts from node_modules into
// public/engine so Vite serves them as static assets. Run automatically before
// dev/build (predev/prebuild). These files are NOT committed (see .gitignore).
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', 'fairy-stockfish-nnue.wasm');
const outDir = join(root, 'public', 'engine');

const files = ['stockfish.js', 'stockfish.wasm', 'stockfish.worker.js'];

mkdirSync(outDir, { recursive: true });
let copied = 0;
for (const f of files) {
  const src = join(srcDir, f);
  if (existsSync(src)) {
    copyFileSync(src, join(outDir, f));
    copied++;
  } else {
    console.warn(`[copy-wasm] missing: ${f}`);
  }
}
console.log(`[copy-wasm] copied ${copied} engine file(s) to public/engine/`);

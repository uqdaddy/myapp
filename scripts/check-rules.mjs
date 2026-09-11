import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'myapp-rules-'));
try {
  const outfile = join(directory, 'checks.mjs');
  await build({ entryPoints: ['scripts/rules-check.ts'], bundle: true, platform: 'node', format: 'esm', outfile });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(directory, { recursive: true, force: true });
}

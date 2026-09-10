// Adapter around Fairy-Stockfish (WASM) driving it over UCI for Janggi.
//
// The engine only chooses moves; our own code (moves.ts) still validates
// legality. If the engine cannot load (e.g. SharedArrayBuffer unavailable and
// the COOP/COEP workaround did not take effect), init() rejects and the app
// falls back to the built-in AI.
//
// Assets are served statically from `${BASE_URL}engine/stockfish.js` and
// `.wasm` (copied into public/engine by scripts/copy-wasm.mjs).

import { Board, Move, Side } from './types';
import { toJanggiFen, moveToUci, uciToMove } from './fen';

type StockfishModule = {
  postMessage: (cmd: string) => void;
  addMessageListener: (fn: (line: string) => void) => void;
};

let modulePromise: Promise<StockfishModule> | null = null;
let ready = false;

// Collects listeners waiting for a specific line pattern.
type LineHandler = (line: string) => void;
const lineHandlers = new Set<LineHandler>();

function onLine(line: string) {
  for (const h of lineHandlers) h(line);
}

function base(): string {
  // import.meta.env.BASE_URL is e.g. "/myapp/"
  return (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL || '/';
}

// Dynamically load the UMD stockfish.js and instantiate the WASM module.
async function loadModule(): Promise<StockfishModule> {
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    const b = base();
    // Fetch the loader script text and evaluate it to obtain the factory.
    const loaderUrl = `${b}engine/stockfish.js`;
    const resp = await fetch(loaderUrl);
    if (!resp.ok) throw new Error(`failed to fetch engine loader: ${resp.status}`);
    const code = await resp.text();
    // The script assigns `var Stockfish = (function(){...})()` and does
    // `module.exports = Stockfish`. Evaluate it in a function scope providing a
    // fake module/exports so we can capture the factory.
    const factory = new Function(
      'module',
      'exports',
      `${code}; return (typeof Stockfish!=='undefined') ? Stockfish : module.exports;`
    )({ exports: {} }, {}) as (opts: Record<string, unknown>) => Promise<StockfishModule>;

    const instance = await factory({
      locateFile: (path: string) => `${b}engine/${path}`,
    });
    instance.addMessageListener(onLine);
    return instance;
  })();

  return modulePromise;
}

// Send a command and wait until a line matching `until` predicate appears.
function sendAndWait(
  mod: StockfishModule,
  cmd: string,
  until: (line: string) => boolean,
  timeoutMs = 30000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const handler: LineHandler = (line) => {
      if (until(line)) {
        lineHandlers.delete(handler);
        clearTimeout(timer);
        resolve(line);
      }
    };
    const timer = setTimeout(() => {
      lineHandlers.delete(handler);
      reject(new Error(`engine timeout waiting after: ${cmd}`));
    }, timeoutMs);
    lineHandlers.add(handler);
    mod.postMessage(cmd);
  });
}

// Initialize the engine for Janggi. Resolves when ready, rejects on failure.
export async function initEngine(): Promise<void> {
  if (ready) return;
  const mod = await loadModule();
  await sendAndWait(mod, 'uci', (l) => l === 'uciok');
  mod.postMessage('setoption name UCI_Variant value janggi');
  await sendAndWait(mod, 'isready', (l) => l === 'readyok');
  ready = true;
}

export function isEngineReady(): boolean {
  return ready;
}

// Ask the engine for the best move in the given position.
// Returns from/to squares (our coordinates), or null if the engine passes or
// has no move.
export async function engineBestMove(
  board: Board,
  toMove: Side,
  movetimeMs: number
): Promise<{ from: { r: number; c: number }; to: { r: number; c: number } } | null> {
  const mod = await loadModule();
  if (!ready) await initEngine();

  const fen = toJanggiFen(board, toMove);
  mod.postMessage(`position fen ${fen}`);
  const line = await sendAndWait(
    mod,
    `go movetime ${movetimeMs}`,
    (l) => l.startsWith('bestmove'),
    movetimeMs + 20000
  );
  // "bestmove e2e3 ponder ..." or "bestmove (none)"
  const parts = line.split(/\s+/);
  const best = parts[1];
  if (!best || best === '(none)' || best === '0000') return null;
  return uciToMove(best);
}

// Optional: feed a specific starting FEN + move history if we later want the
// engine to track state via move lists instead of full FENs.
export function moveHistoryToUci(moves: Move[]): string[] {
  return moves.map(moveToUci);
}

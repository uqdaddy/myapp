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

// Difficulty levels map to a Fairy-Stockfish "Skill Level" (0..20) and a think
// time. Lower skill = the engine deliberately makes weaker moves.
export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_SETTINGS: Record<
  Difficulty,
  { skill: number; timeMs: number; label: string }
> = {
  easy: { skill: 1, timeMs: 500, label: '쉬움' },
  normal: { skill: 8, timeMs: 1000, label: '보통' },
  hard: { skill: 20, timeMs: 2000, label: '어려움' },
};

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

// Load stockfish.js via a <script> tag so that `document.currentScript.src`
// resolves and the Emscripten module can auto-locate stockfish.wasm and
// stockfish.worker.js relative to itself. The script defines a global
// `Stockfish` factory. (Evaluating it via new Function/import breaks the
// module's self-location and pthread worker spawning.)
function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-sf="1"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.dataset.sf = '1';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`failed to load engine script: ${src}`));
    document.head.appendChild(el);
  });
}

// Wrap a promise with a timeout so a hung step (e.g. Safari creating shared
// memory that never resolves) can't leave the AI stuck forever.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout: ${label}`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function loadModule(): Promise<StockfishModule> {
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('브라우저 환경이 아닙니다');
    }
    // The multithreaded WASM build REQUIRES cross-origin isolation +
    // SharedArrayBuffer. Require it strictly (=== true): on some browsers
    // (notably iOS Safari) crossOriginIsolated can be undefined before the SW
    // controls the page, in which case we must NOT proceed or the engine hangs.
    if (typeof SharedArrayBuffer === 'undefined' || self.crossOriginIsolated !== true) {
      throw new Error('이 브라우저에서 엔진 실행 조건(SharedArrayBuffer)을 사용할 수 없습니다');
    }

    const b = base();
    await withTimeout(injectScript(`${b}engine/stockfish.js`), 15000, 'load script');

    const factory = (window as unknown as {
      Stockfish?: (opts: Record<string, unknown>) => Promise<StockfishModule>;
    }).Stockfish;
    if (!factory) throw new Error('엔진 로더를 찾지 못했습니다');

    // Instantiating the WASM module can hang on unsupported browsers -> timeout.
    const instance = await withTimeout(
      factory({ locateFile: (path: string) => `${b}engine/${path}` }),
      20000,
      'instantiate wasm'
    );
    instance.addMessageListener(onLine);
    return instance;
  })();

  // Don't cache a failed attempt: reset so a later retry (or the error overlay)
  // works cleanly instead of reusing a rejected/hung promise.
  modulePromise.catch(() => {
    modulePromise = null;
  });

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
// Guarded so it can never hang indefinitely.
let initPromise: Promise<void> | null = null;
export async function initEngine(): Promise<void> {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const mod = await loadModule();
    await sendAndWait(mod, 'uci', (l) => l === 'uciok', 15000);
    mod.postMessage('setoption name UCI_Variant value janggi');
    await sendAndWait(mod, 'isready', (l) => l === 'readyok', 15000);
    ready = true;
  })();

  initPromise.catch(() => {
    initPromise = null; // allow a clean retry / surface the error
  });

  return initPromise;
}

export function isEngineReady(): boolean {
  return ready;
}

// Set the engine's playing strength. `level` is 0..20 (Fairy-Stockfish "Skill
// Level"): lower = weaker / more mistakes, 20 = full strength.
export async function setSkillLevel(level: number): Promise<void> {
  const mod = await loadModule();
  if (!ready) await initEngine();
  const clamped = Math.max(-20, Math.min(20, Math.round(level)));
  mod.postMessage(`setoption name Skill Level value ${clamped}`);
}

// Serialize engine queries: only one position/go/bestmove cycle runs at a
// time. Overlapping cycles (e.g. rapid turn changes or StrictMode double
// effects) would otherwise cross their UCI responses and hang. New requests
// wait for the previous one to finish.
let engineChain: Promise<unknown> = Promise.resolve();

// Ask the engine for the best move in the given position.
// Returns from/to squares (our coordinates), or null if none.
export async function engineBestMove(
  board: Board,
  toMove: Side,
  movetimeMs: number
): Promise<{ from: { r: number; c: number }; to: { r: number; c: number } } | null> {
  const run = engineChain.then(async () => {
    const mod = await loadModule();
    if (!ready) await initEngine();

    const fen = toJanggiFen(board, toMove);
    mod.postMessage(`position fen ${fen}`);
    const line = await sendAndWait(
      mod,
      `go movetime ${movetimeMs}`,
      (l) => l.startsWith('bestmove'),
      movetimeMs + 10000
    );
    const best = line.split(/\s+/)[1];
    if (!best || best === '(none)' || best === '0000') return null;
    return uciToMove(best);
  });

  // Keep the chain alive even if this request fails, so the next one still runs.
  engineChain = run.catch(() => undefined);
  return run;
}

// Optional: feed a specific starting FEN + move history if we later want the
// engine to track state via move lists instead of full FENs.
export function moveHistoryToUci(moves: Move[]): string[] {
  return moves.map(moveToUci);
}

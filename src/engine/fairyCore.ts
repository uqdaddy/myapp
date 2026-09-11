// Shared low-level Fairy-Stockfish (WASM) plumbing used by BOTH the Janggi and
// Chess adapters. Fairy-Stockfish is multi-variant: a single engine process can
// play janggi, chess, etc. Only one game is ever active at a time (RootApp
// swaps components), so we keep ONE engine and re-select the UCI variant
// whenever the requested variant differs from the one currently set.
//
// Assets are served statically from `${BASE_URL}engine/stockfish.js` and
// `.wasm` (copied into public/engine by scripts/copy-wasm.mjs).

type StockfishModule = {
  postMessage: (cmd: string) => void;
  addMessageListener: (fn: (line: string) => void) => void;
};

let modulePromise: Promise<StockfishModule> | null = null;
let uciInitialized = false; // has `uci`/`uciok` completed once
let currentVariant: string | null = null; // variant currently selected

type LineHandler = (line: string) => void;
const lineHandlers = new Set<LineHandler>();

function onLine(line: string) {
  for (const h of lineHandlers) h(line);
}

function base(): string {
  return (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL || '/';
}

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
    // SharedArrayBuffer. Require it strictly (=== true).
    if (typeof SharedArrayBuffer === 'undefined' || self.crossOriginIsolated !== true) {
      throw new Error('이 브라우저에서 엔진 실행 조건(SharedArrayBuffer)을 사용할 수 없습니다');
    }

    const b = base();
    await withTimeout(injectScript(`${b}engine/stockfish.js`), 15000, 'load script');

    const factory = (window as unknown as {
      Stockfish?: (opts: Record<string, unknown>) => Promise<StockfishModule>;
    }).Stockfish;
    if (!factory) throw new Error('엔진 로더를 찾지 못했습니다');

    const instance = await withTimeout(
      factory({ locateFile: (path: string) => `${b}engine/${path}` }),
      20000,
      'instantiate wasm'
    );
    instance.addMessageListener(onLine);
    return instance;
  })();

  modulePromise.catch(() => {
    modulePromise = null;
  });

  return modulePromise;
}

// Send a command and wait until a line matching `until` appears.
export function sendAndWait(
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

// Ensure the engine is loaded, UCI-initialized, and set to `variant`. Safe to
// call repeatedly; only re-selects the variant when it actually changes.
export async function ensureVariant(variant: string): Promise<StockfishModule> {
  const mod = await loadModule();
  if (!uciInitialized) {
    await sendAndWait(mod, 'uci', (l) => l === 'uciok', 15000);
    uciInitialized = true;
  }
  if (currentVariant !== variant) {
    mod.postMessage(`setoption name UCI_Variant value ${variant}`);
    await sendAndWait(mod, 'isready', (l) => l === 'readyok', 15000);
    currentVariant = variant;
  }
  return mod;
}

// Set the engine's playing strength (0..20 Skill Level). Requires the module
// to be loaded (caller should have run ensureVariant first).
export async function setSkill(level: number): Promise<void> {
  const mod = await loadModule();
  const clamped = Math.max(-20, Math.min(20, Math.round(level)));
  mod.postMessage(`setoption name Skill Level value ${clamped}`);
}

// Serialize engine queries so overlapping position/go cycles can't cross their
// UCI responses. Shared across variants (only one game runs at a time anyway).
let engineChain: Promise<unknown> = Promise.resolve();

// Run `fn` with exclusive access to the engine, chained after any in-flight
// request. `fn` receives the module and should do a full position/go/bestmove
// cycle. The variant must already be ensured by the caller inside `fn`.
export function runExclusive<T>(fn: (mod: StockfishModule) => Promise<T>): Promise<T> {
  const run = engineChain.then(async () => {
    const mod = await loadModule();
    return fn(mod);
  });
  engineChain = run.catch(() => undefined);
  return run;
}

export type { StockfishModule };

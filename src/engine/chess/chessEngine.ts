// Chess adapter around Fairy-Stockfish (WASM), built on the shared fairyCore.
// Fairy-Stockfish plays standard chess natively (UCI_Variant=chess). The engine
// only chooses moves; chess/moves.ts still validates legality.

import { CState } from './types';
import { toChessFen, uciToMove } from './fen';
import { ensureVariant, runExclusive, sendAndWait, setSkill } from '../fairyCore';

let ready = false;

export type ChessDifficulty = 'easy' | 'normal' | 'hard';

export const CHESS_DIFFICULTY: Record<
  ChessDifficulty,
  { skill: number; timeMs: number; label: string }
> = {
  easy: { skill: 1, timeMs: 500, label: '쉬움' },
  normal: { skill: 8, timeMs: 1000, label: '보통' },
  hard: { skill: 20, timeMs: 2000, label: '어려움' },
};

let initPromise: Promise<void> | null = null;
export async function initChessEngine(): Promise<void> {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await ensureVariant('chess');
    ready = true;
  })();

  initPromise.catch(() => {
    initPromise = null;
  });

  return initPromise;
}

export function isChessEngineReady(): boolean {
  return ready;
}

export async function setChessSkill(level: number): Promise<void> {
  if (!ready) await initChessEngine();
  await setSkill(level);
}

// Ask the engine for the best chess move. Returns from/to (+ promotion), or
// null if there is no move.
export async function chessBestMove(
  state: CState,
  movetimeMs: number
): Promise<{
  from: { r: number; c: number };
  to: { r: number; c: number };
  promotion?: import('./types').CPieceType;
} | null> {
  return runExclusive(async (mod) => {
    await ensureVariant('chess');
    ready = true;

    const fen = toChessFen(state);
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
}

// Janggi adapter around Fairy-Stockfish (WASM), built on the shared fairyCore.
// The engine only chooses moves; moves.ts still validates legality. If the
// engine cannot load, initEngine() rejects and the app shows an error.

import { Board, Move, Side } from './types';
import { toJanggiFen, moveToUci, uciToMove } from './fen';
import { ensureVariant, runExclusive, sendAndWait, setSkill } from './fairyCore';

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

// Initialize the engine for Janggi. Resolves when ready, rejects on failure.
let initPromise: Promise<void> | null = null;
export async function initEngine(): Promise<void> {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await ensureVariant('janggi');
    ready = true;
  })();

  initPromise.catch(() => {
    initPromise = null;
  });

  return initPromise;
}

export function isEngineReady(): boolean {
  return ready;
}

// Set the engine's playing strength (0..20). Ensures the engine is up first.
export async function setSkillLevel(level: number): Promise<void> {
  if (!ready) await initEngine();
  await setSkill(level);
}

// Ask the engine for the best Janggi move in the given position.
export async function engineBestMove(
  board: Board,
  toMove: Side,
  movetimeMs: number
): Promise<{ from: { r: number; c: number }; to: { r: number; c: number } } | null> {
  return runExclusive(async (mod) => {
    await ensureVariant('janggi'); // re-selects only if another variant was active
    ready = true;

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
}

export function moveHistoryToUci(moves: Move[]): string[] {
  return moves.map(moveToUci);
}

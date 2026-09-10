// Web Worker: runs the (synchronous, CPU-heavy) Janggi search off the main
// thread so the UI never freezes while the AI thinks.
import { chooseMove, Difficulty } from './ai';
import { Board, Move, Side } from './types';

export interface AiRequest {
  board: Board;
  side: Side;
  difficulty: Difficulty;
  timeMs: number;
  maxDepth?: number;
}

export interface AiResponse {
  move: Move | null;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { board, side, difficulty, timeMs, maxDepth } = e.data;
  const move = chooseMove(board, side, difficulty, { timeMs, maxDepth });
  const res: AiResponse = { move };
  (self as unknown as Worker).postMessage(res);
};

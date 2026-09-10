// Web Worker: runs the (synchronous, CPU-heavy) Janggi search off the main
// thread so the UI never freezes while the AI thinks.
import { chooseMove, Difficulty } from './ai';
import { openingMove, OPENING_PLIES } from './openings';
import { Board, Move, Side } from './types';

export interface AiRequest {
  board: Board;
  side: Side;
  difficulty: Difficulty;
  timeMs: number;
  maxDepth?: number;
  aiMoveNumber?: number; // how many moves this AI has already made (0-based)
}

export interface AiResponse {
  move: Move | null;
  fromBook?: boolean;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { board, side, difficulty, timeMs, maxDepth, aiMoveNumber } = e.data;

  // During the opening, try the development plan first.
  if (aiMoveNumber !== undefined && aiMoveNumber < OPENING_PLIES) {
    const book = openingMove(board, side, aiMoveNumber);
    if (book) {
      const res: AiResponse = { move: book, fromBook: true };
      (self as unknown as Worker).postMessage(res);
      return;
    }
  }

  const move = chooseMove(board, side, difficulty, { timeMs, maxDepth });
  const res: AiResponse = { move };
  (self as unknown as Worker).postMessage(res);
};

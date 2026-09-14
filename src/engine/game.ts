import { Board, Side, opponent } from './types';
import { allLegalMoves, isInCheck } from './moves';

export type GameStatus =
  | { kind: 'playing'; check: boolean }
  | { kind: 'checkmate'; winner: Side }
  | { kind: 'stalemate'; winner: Side }; // in Janggi, no legal move = loss

// Determine the status for the side that is about to move.
export function getStatus(board: Board, toMove: Side): GameStatus {
  const moves = allLegalMoves(board, toMove);
  const check = isInCheck(board, toMove);
  if (moves.length === 0 && check) {
    // A checked side with no escape loses. Without check the side may pass.
    return check
      ? { kind: 'checkmate', winner: opponent(toMove) }
      : { kind: 'stalemate', winner: opponent(toMove) };
  }
  return { kind: 'playing', check };
}

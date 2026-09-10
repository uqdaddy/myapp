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
  if (moves.length === 0) {
    // No legal move. Whether in check or not, the side to move loses in Janggi.
    return check
      ? { kind: 'checkmate', winner: opponent(toMove) }
      : { kind: 'stalemate', winner: opponent(toMove) };
  }
  return { kind: 'playing', check };
}

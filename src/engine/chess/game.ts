import { CBoard, CSide, CState, cOpponent, C_COLS, C_ROWS } from './types';
import { allLegalMoves, isInCheck } from './moves';

export type CGameStatus =
  | { kind: 'playing'; check: boolean }
  | { kind: 'checkmate'; winner: CSide }
  | { kind: 'stalemate' } // draw
  | { kind: 'draw'; reason: 'insufficient' | 'fifty' }; // draw

// Insufficient material: K vs K, K+B vs K, K+N vs K (and K+B vs K+B same color
// — we keep it simple and cover the common lone-minor cases).
function insufficientMaterial(board: CBoard): boolean {
  const pieces: { side: CSide; type: string; color: number }[] = [];
  for (let r = 0; r < C_ROWS; r++) {
    for (let c = 0; c < C_COLS; c++) {
      const p = board[r][c];
      if (p) pieces.push({ side: p.side, type: p.type, color: (r + c) % 2 });
    }
  }
  const nonKing = pieces.filter((p) => p.type !== 'king');
  if (nonKing.length === 0) return true; // K vs K
  if (nonKing.every(p => p.type === 'bishop') && nonKing.every(p => p.color === nonKing[0].color)) return true;
  if (nonKing.length === 1 && (nonKing[0].type === 'bishop' || nonKing[0].type === 'knight')) {
    return true; // K+minor vs K
  }
  return false;
}

// Determine the status for the side about to move.
export function getStatus(state: CState): CGameStatus {
  const { board, toMove, halfmove } = state;
  const moves = allLegalMoves(state, toMove);
  const check = isInCheck(board, toMove);
  if (moves.length === 0) {
    // No legal move: checkmate if in check, otherwise stalemate (a draw).
    return check ? { kind: 'checkmate', winner: cOpponent(toMove) } : { kind: 'stalemate' };
  }
  if (insufficientMaterial(board)) return { kind: 'draw', reason: 'insufficient' };
  if (halfmove >= 100) return { kind: 'draw', reason: 'fifty' }; // 50-move rule (100 plies)
  return { kind: 'playing', check };
}

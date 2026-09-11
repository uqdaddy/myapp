// Move notation for the chess game record (기보). Uses coordinate notation
// (e2→e4) with Korean piece names, plus castle/promotion/capture annotations.

import { CBoard, CMove, CPieceType, CSide } from './types';
import { CHESS_PIECE_KO } from './pieces';

export interface CGameMove {
  side: CSide;
  piece: CPieceType;
  from: { r: number; c: number };
  to: { r: number; c: number };
  captured: CPieceType | null;
  promotion?: CPieceType;
  castle?: 'king' | 'queen';
}

const SIDE_KO: Record<CSide, string> = { white: '백', black: '흑' };
const FILES = 'abcdefgh';

function sq(r: number, c: number): string {
  return `${FILES[c]}${8 - r}`;
}

export function formatMove(m: CGameMove): string {
  if (m.castle) {
    return `${SIDE_KO[m.side]} ${m.castle === 'king' ? '킹사이드 캐슬링 (O-O)' : '퀸사이드 캐슬링 (O-O-O)'}`;
  }
  let s = `${SIDE_KO[m.side]} ${CHESS_PIECE_KO[m.piece]} ${sq(m.from.r, m.from.c)} → ${sq(m.to.r, m.to.c)}`;
  if (m.captured) s += ` (${CHESS_PIECE_KO[m.captured]} 잡음)`;
  if (m.promotion) s += ` 승진→${CHESS_PIECE_KO[m.promotion]}`;
  return s;
}

export function toGameMove(boardBefore: CBoard, move: CMove, side: CSide): CGameMove {
  const p = boardBefore[move.from.r][move.from.c];
  return {
    side,
    piece: p ? p.type : 'pawn',
    from: { r: move.from.r, c: move.from.c },
    to: { r: move.to.r, c: move.to.c },
    captured: move.captured ? move.captured.type : null,
    promotion: move.promotion,
    castle: move.castle,
  };
}

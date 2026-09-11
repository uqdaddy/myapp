// Conversion between our chess state and standard FEN / UCI understood by
// Fairy-Stockfish (which plays standard chess natively).
//
// Board orientation: row 0 = rank 8 (top, black back rank), row 7 = rank 1
// (bottom, white back rank), col 0 = file a. FEN ranks are written rank 8
// first, so FEN rank order == our row order. Uppercase = White.

import { CBoard, CMove, CPiece, CPieceType, CSide, CState, C_COLS } from './types';
import { findKing } from './moves';

const TYPE_TO_LETTER: Record<CPieceType, string> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  pawn: 'p',
};

function letterFor(p: CPiece): string {
  const base = TYPE_TO_LETTER[p.type];
  return p.side === 'white' ? base.toUpperCase() : base;
}

export function boardToFenPlacement(board: CBoard): string {
  const ranks: string[] = [];
  for (let r = 0; r < board.length; r++) {
    let rank = '';
    let empty = 0;
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (!p) {
        empty++;
      } else {
        if (empty > 0) {
          rank += String(empty);
          empty = 0;
        }
        rank += letterFor(p);
      }
    }
    if (empty > 0) rank += String(empty);
    ranks.push(rank);
  }
  return ranks.join('/');
}

// Castling availability string (KQkq / -). Derived from king/rook `moved`
// flags and their presence on the standard home squares.
function castlingRights(board: CBoard): string {
  let s = '';
  const wk = board[7][4];
  const bk = board[0][4];
  const canK = (king: CPiece | null, side: CSide) =>
    !!king && king.type === 'king' && king.side === side && !king.moved;
  const rookUnmoved = (r: number, c: number, side: CSide) => {
    const p = board[r][c];
    return !!p && p.type === 'rook' && p.side === side && !p.moved;
  };
  if (canK(wk, 'white')) {
    if (rookUnmoved(7, 7, 'white')) s += 'K';
    if (rookUnmoved(7, 0, 'white')) s += 'Q';
  }
  if (canK(bk, 'black')) {
    if (rookUnmoved(0, 7, 'black')) s += 'k';
    if (rookUnmoved(0, 0, 'black')) s += 'q';
  }
  return s === '' ? '-' : s;
}

const FILES = 'abcdefgh';

// Our square -> UCI file+rank. row 7 -> rank 1, row 0 -> rank 8.
export function squareToUci(r: number, c: number): string {
  return `${FILES[c]}${8 - r}`;
}

export function uciToSquare(sq: string): { r: number; c: number } {
  const c = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rankNum = parseInt(sq[1], 10);
  return { r: 8 - rankNum, c };
}

// Full FEN for the given state.
export function toChessFen(state: CState): string {
  const placement = boardToFenPlacement(state.board);
  const stm = state.toMove === 'white' ? 'w' : 'b';
  const castle = castlingRights(state.board);
  const ep = state.epTarget ? squareToUci(state.epTarget.r, state.epTarget.c) : '-';
  return `${placement} ${stm} ${castle} ${ep} ${state.halfmove} ${state.fullmove}`;
}

// Our move -> UCI string, incl. promotion suffix (e.g. "e7e8q").
export function moveToUci(m: CMove): string {
  let s = squareToUci(m.from.r, m.from.c) + squareToUci(m.to.r, m.to.c);
  if (m.promotion) s += TYPE_TO_LETTER[m.promotion];
  return s;
}

// UCI move string -> from/to squares + optional promotion piece type.
export function uciToMove(uci: string): {
  from: { r: number; c: number };
  to: { r: number; c: number };
  promotion?: CPieceType;
} {
  const from = uciToSquare(uci.slice(0, 2));
  const to = uciToSquare(uci.slice(2, 4));
  const promoLetter = uci.length >= 5 ? uci[4].toLowerCase() : '';
  const promotion = (Object.keys(TYPE_TO_LETTER) as CPieceType[]).find(
    (t) => TYPE_TO_LETTER[t] === promoLetter && t !== 'pawn' && t !== 'king'
  );
  return promotion ? { from, to, promotion } : { from, to };
}

// (kept for symmetry with the janggi module / potential future use)
export { findKing, C_COLS };

// Conversion between our internal board representation and the Janggi FEN /
// UCI notation understood by Fairy-Stockfish (via ffish-es6).
//
// Fairy-Stockfish Janggi piece letters:
//   k = general(궁/장), a = guard/advisor(사), b = elephant(상),
//   n = horse(마), r = chariot(차), c = cannon(포), p = soldier(졸/병)
// Uppercase = one side, lowercase = the other. In Fairy-Stockfish's janggi the
// side that moves first (Cho, 초) is the LOWERCASE, bottom set in the default
// start FEN "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w".
// NOTE: We verify the exact side/orientation mapping with ffish in a test
// before relying on it; see scripts validation.
//
// Our board: row 0 = top (Han), row 9 = bottom (Cho), col 0 = left.
// Janggi FEN ranks are written top rank first. So FEN rank order == our row
// order (row 0 first). Files within a rank are col 0..8 left→right.

import { Board, Move, Piece, PieceType, Side } from './types';

const TYPE_TO_LETTER: Record<PieceType, string> = {
  general: 'k',
  guard: 'a',
  elephant: 'b',
  horse: 'n',
  chariot: 'r',
  cannon: 'c',
  soldier: 'p',
};

// Which side is uppercase in the FEN. In Fairy-Stockfish janggi the bottom
// side (our Cho) is uppercase in the standard start position, and Cho moves
// first as side "w". We therefore map:
//   Cho -> uppercase, side-to-move letter 'w'
//   Han -> lowercase, side-to-move letter 'b'
const UPPERCASE_SIDE: Side = 'cho';

function letterFor(piece: Piece): string {
  const base = TYPE_TO_LETTER[piece.type];
  return piece.side === UPPERCASE_SIDE ? base.toUpperCase() : base;
}

// Build the board portion of a Janggi FEN from our board.
export function boardToFenPlacement(board: Board): string {
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

// Full Janggi FEN for the given position and side to move.
export function toJanggiFen(board: Board, toMove: Side): string {
  const placement = boardToFenPlacement(board);
  const stm = toMove === UPPERCASE_SIDE ? 'w' : 'b';
  // halfmove/fullmove counters are not important for engine play here.
  return `${placement} ${stm} - - 0 1`;
}

// --- Coordinate / move notation ---------------------------------------------
// Fairy-Stockfish uses file letters a..i (col 0..8) and rank numbers where the
// bottom rank of the FEN is rank 1. Our row 9 (bottom) == rank 1, row 0 (top)
// == rank 10. So uciRank = 10 - row.
const FILES = 'abcdefghi';

export function squareToUci(r: number, c: number): string {
  const file = FILES[c];
  const rank = 10 - r; // row 9 -> 1, row 0 -> 10
  return `${file}${rank}`;
}

export function uciToSquare(sq: string): { r: number; c: number } {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rankNum = parseInt(sq.slice(1), 10);
  const r = 10 - rankNum;
  return { r, c: file };
}

// Our Move -> UCI move string (e.g. "e1e2"). Janggi has no promotion.
export function moveToUci(m: Move): string {
  return squareToUci(m.from.r, m.from.c) + squareToUci(m.to.r, m.to.c);
}

// UCI move string -> our from/to squares.
// A janggi square is <file a-i><rank 1-10>, so ranks can be TWO digits
// (rank 10). We must NOT slice at fixed offsets: e.g. "h10g8" splits into
// "h10" + "g8", not "h1" + "0g". Parse with a regex that captures each square.
const SQUARE_RE = /([a-i])(10|[1-9])/g;

export function uciToMove(uci: string): {
  from: { r: number; c: number };
  to: { r: number; c: number };
} {
  const squares = uci.match(SQUARE_RE);
  if (!squares || squares.length < 2) {
    // Fallback (shouldn't happen for valid janggi moves): best-effort split.
    return { from: uciToSquare(uci.slice(0, 2)), to: uciToSquare(uci.slice(2)) };
  }
  return { from: uciToSquare(squares[0]), to: uciToSquare(squares[1]) };
}

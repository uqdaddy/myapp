// Chess core types. Standard 8x8 board.

export type CSide = 'white' | 'black';

export type CPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface CPiece {
  type: CPieceType;
  side: CSide;
  // Whether this piece has moved (needed for castling & pawn double-step).
  moved?: boolean;
}

// Board is 8 rows (row 0 = rank 8, black's back rank; row 7 = rank 1, white's
// back rank) x 8 cols (col 0 = file a). null = empty square.
export type CBoard = (CPiece | null)[][];

export interface CPos {
  r: number; // 0..7
  c: number; // 0..7
}

export interface CMove {
  from: CPos;
  to: CPos;
  captured?: CPiece | null;
  // Special-move flags:
  promotion?: CPieceType; // pawn reaching the last rank -> which piece
  castle?: 'king' | 'queen'; // castling side
  enPassant?: boolean; // this pawn capture is en-passant
  // For en-passant we also record the captured pawn's square (differs from
  // `to`), so applyMove can remove it.
  epCapturedSquare?: CPos;
}

export const C_ROWS = 8;
export const C_COLS = 8;

export function cInBounds(r: number, c: number): boolean {
  return r >= 0 && r < C_ROWS && c >= 0 && c < C_COLS;
}

export function cOpponent(side: CSide): CSide {
  return side === 'white' ? 'black' : 'white';
}

export function cSamePos(a: CPos, b: CPos): boolean {
  return a.r === b.r && a.c === b.c;
}

// Game-level state needed for full legality: castling rights are derived from
// `moved` flags on kings/rooks, but en-passant depends on the immediately
// preceding move, so we track it explicitly alongside the board.
export interface CState {
  board: CBoard;
  toMove: CSide;
  // The square a pawn skipped over on a double-step last move (en-passant
  // target), or null. e.g. after white e2-e4 this is the e3 square.
  epTarget: CPos | null;
  // Halfmove clock (for 50-move rule) and fullmove number, for FEN.
  halfmove: number;
  fullmove: number;
}

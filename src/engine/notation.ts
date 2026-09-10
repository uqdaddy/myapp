// Human-friendly move notation for the game record (기보).
import { Move, Piece, PieceType, Side } from './types';

// A recorded move: who moved, which piece, from/to, and what was captured.
export interface GameMove {
  side: Side;
  piece: PieceType;
  from: { r: number; c: number };
  to: { r: number; c: number };
  captured: PieceType | null;
}

// Korean piece names for the record.
const PIECE_KO: Record<PieceType, string> = {
  general: '궁',
  guard: '사',
  elephant: '상',
  horse: '마',
  chariot: '차',
  cannon: '포',
  soldier: '졸',
};

const SIDE_KO: Record<Side, string> = { cho: '초', han: '한' };

// A square label that reads naturally: column a–i as 1–9 from the left, and the
// rank as 1–10 from the bottom (matching how players count files/lines). We use
// simple "열-줄" numbers so it's approachable without knowing formal notation.
// col 0..8 -> file 1..9 ; row 0(top)..9(bottom) -> line 10..1
function squareLabel(r: number, c: number): string {
  const file = c + 1; // 1..9 from the left
  const line = 10 - r; // 1..10 from the bottom
  return `${file}·${line}`;
}

// e.g. "초 마 2·1 → 3·3" or with a capture "한 차 9·10 → 9·4 (졸 잡음)"
export function formatMove(m: GameMove): string {
  const base = `${SIDE_KO[m.side]} ${PIECE_KO[m.piece]} ${squareLabel(
    m.from.r,
    m.from.c
  )} → ${squareLabel(m.to.r, m.to.c)}`;
  return m.captured ? `${base} (${PIECE_KO[m.captured]} 잡음)` : base;
}

// Build a GameMove record from a board (pre-move) and a Move.
export function toGameMove(
  boardBefore: (Piece | null)[][],
  move: Move,
  side: Side
): GameMove {
  const p = boardBefore[move.from.r][move.from.c];
  return {
    side,
    piece: p ? p.type : 'soldier',
    from: { r: move.from.r, c: move.from.c },
    to: { r: move.to.r, c: move.to.c },
    captured: move.captured ? move.captured.type : null,
  };
}

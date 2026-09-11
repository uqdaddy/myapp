import { GBoard, Stone } from './types';
import { hasWon, isFull } from './rules';

export type GStatus =
  | { kind: 'playing' }
  | { kind: 'win'; winner: Stone }
  | { kind: 'draw' };

// Status after the last move. `justMoved` is the color that just played (its
// win is the one to check first for efficiency), but we check both for safety.
export function gomokuStatus(b: GBoard): GStatus {
  if (hasWon(b, 'black')) return { kind: 'win', winner: 'black' };
  if (hasWon(b, 'white')) return { kind: 'win', winner: 'white' };
  if (isFull(b)) return { kind: 'draw' };
  return { kind: 'playing' };
}

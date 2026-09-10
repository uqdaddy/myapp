import { PieceType, Side } from './engine/types';

// Traditional Hanja labels used on Janggi pieces.
// Cho (초, green) and Han (한, red) use slightly different characters for
// some pieces by tradition.
export const PIECE_LABEL: Record<Side, Record<PieceType, string>> = {
  cho: {
    general: '楚', // 초 general
    guard: '士',
    elephant: '象',
    horse: '馬',
    chariot: '車',
    cannon: '包',
    soldier: '卒',
  },
  han: {
    general: '漢', // 한 general
    guard: '士',
    elephant: '象',
    horse: '馬',
    chariot: '車',
    cannon: '砲',
    soldier: '兵',
  },
};

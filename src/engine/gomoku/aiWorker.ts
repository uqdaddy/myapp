// Web Worker: runs the Gomoku search off the main thread so the UI stays
// responsive even at higher difficulty.
import { chooseGomokuMove, GDifficulty, GSearchResult } from './ai';
import { GBoard, Stone } from './types';

export interface GAiRequest {
  board: GBoard;
  me: Stone;
  difficulty: GDifficulty;
  timeMs: number;
}
export interface GAiResponse {
  result: GSearchResult;
}

self.onmessage = (e: MessageEvent<GAiRequest>) => {
  const { board, me, difficulty, timeMs } = e.data;
  const result = chooseGomokuMove(board, me, difficulty, timeMs);
  (self as unknown as Worker).postMessage({ result } as GAiResponse);
};

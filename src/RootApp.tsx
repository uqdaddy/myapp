import { useState } from 'react';
import { GameSelect, GameKind } from './GameSelect';
import JanggiApp from './App';
import { GomokuApp } from './GomokuApp';
import { isInAppBrowser } from './inapp';
import { InAppNotice } from './InAppNotice';

// Top-level: pick a game, then render it. Each game can return to this menu.
export default function RootApp() {
  const [game, setGame] = useState<GameKind | null>(null);

  // In-app browsers (KakaoTalk etc.) can't run the WASM engine — show guidance.
  if (isInAppBrowser()) return <InAppNotice />;

  if (game === 'janggi') return <JanggiApp onExit={() => setGame(null)} />;
  if (game === 'gomoku') return <GomokuApp onExit={() => setGame(null)} />;

  return <GameSelect onSelect={setGame} />;
}

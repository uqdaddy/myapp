import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { CapturedTray } from './CapturedTray';
import { SetupScreen, StartConfig } from './SetupScreen';
import { initialBoard } from './engine/board';
import { applyMove, legalMovesFor, allLegalMoves, findGeneral } from './engine/moves';
import { getStatus } from './engine/game';
import {
  initEngine,
  engineBestMove,
  setSkillLevel,
  DIFFICULTY_SETTINGS,
  Difficulty,
} from './engine/fairyEngine';
import { playPlaceSound, unlockAudio } from './sound';
import { materialScore, capturedByOpponentOf } from './engine/score';
import { GameMove, toGameMove } from './engine/notation';
import { GameRecord } from './GameRecord';
import { isInAppBrowser } from './inapp';
import { InAppNotice } from './InAppNotice';
import {
  Board as BoardState,
  Move,
  Pos,
  Side,
  SideSetup,
  WingSetup,
  opponent,
} from './engine/types';

const SIDE_NAME: Record<Side, string> = { cho: '초', han: '한' };

type Phase = 'setup' | 'playing';

export default function App({ onExit }: { onExit?: () => void } = {}) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [humanSide, setHumanSide] = useState<Side>('cho');
  const [board, setBoard] = useState<BoardState>(() => initialBoard());
  const [toMove, setToMove] = useState<Side>('cho'); // Cho (bottom) moves first
  const [selected, setSelected] = useState<Pos | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [thinking, setThinking] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  // Game record (기보): the move list and the starting board to replay from.
  const [history, setHistory] = useState<GameMove[]>([]);
  const [startBoard, setStartBoard] = useState<BoardState>(() => initialBoard());
  const [showRecord, setShowRecord] = useState(false);

  const status = useMemo(() => getStatus(board, toMove), [board, toMove]);
  const gameOver = status.kind !== 'playing';

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return legalMovesFor(board, selected);
  }, [board, selected]);

  const aiSide = opponent(humanSide);
  const aiTimer = useRef<number | null>(null);

  // This app plays exclusively on the Fairy-Stockfish engine — there is no
  // built-in-AI fallback. If the engine can't load, we show an error rather
  // than silently degrading to a weak AI.
  //  'loading' -> initializing, 'ready' -> engine up, 'failed' -> can't load
  const [engineState, setEngineState] = useState<'loading' | 'ready' | 'failed'>(
    'loading'
  );
  const [engineError, setEngineError] = useState<string>('');
  const engineReady = useRef(false);

  useEffect(() => {
    let alive = true;
    initEngine()
      .then(() => {
        if (!alive) return;
        engineReady.current = true;
        setEngineState('ready');
      })
      .catch((e) => {
        if (!alive) return;
        engineReady.current = false;
        setEngineState('failed');
        setEngineError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  // Scores and captured pieces derived from the current board.
  const humanScore = useMemo(() => materialScore(board, humanSide), [board, humanSide]);
  const aiScore = useMemo(() => materialScore(board, aiSide), [board, aiSide]);
  // Pieces the human captured = opponent (AI) pieces missing from the board.
  const humanCaptured = useMemo(
    () => capturedByOpponentOf(board, aiSide),
    [board, aiSide]
  );
  const aiCaptured = useMemo(
    () => capturedByOpponentOf(board, humanSide),
    [board, humanSide]
  );

  // Refs mirror the latest board / side so doMove can record the game log
  // without re-creating the callback (and without StrictMode double-updates).
  const boardRef = useRef(board);
  const toMoveRef = useRef(toMove);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    toMoveRef.current = toMove;
  }, [toMove]);

  const doMove = useCallback((move: Move) => {
    playPlaceSound(!!move.captured); // wooden "clack" on every move
    const mover = toMoveRef.current;
    const before = boardRef.current;
    setHistory((h) => [...h, toGameMove(before, move, mover)]);
    setBoard((b) => applyMove(b, move));
    setLastMove(move);
    setSelected(null);
    setToMove((s) => opponent(s));
  }, []);

  const onCellTap = useCallback(
    (r: number, c: number) => {
      unlockAudio(); // allow audio after the first user gesture (mobile)
      if (gameOver || thinking) return;
      if (toMove !== humanSide) return; // not your turn

      const piece = board[r][c];
      if (selected) {
        const move = legalTargets.find((m) => m.to.r === r && m.to.c === c);
        if (move) {
          doMove(move);
          return;
        }
        if (piece && piece.side === humanSide) {
          setSelected({ r, c });
        } else {
          setSelected(null);
        }
        return;
      }
      if (piece && piece.side === humanSide) {
        setSelected({ r, c });
      }
    },
    [board, selected, legalTargets, doMove, gameOver, thinking, toMove, humanSide]
  );

  // AI turn — Fairy-Stockfish only (no built-in fallback). A minimum total
  // delay keeps the opponent's move clearly noticeable.
  const MIN_AI_DELAY = 400; // ms — small floor so a move is visible
  // Think time comes from the chosen difficulty (harder = longer + higher skill).
  const AI_TIME_BUDGET = DIFFICULTY_SETTINGS[difficulty].timeMs;
  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameOver) return;
    if (toMove !== aiSide) return;
    if (engineState === 'failed') return; // no engine, no move (error shown)
    setThinking(true);

    const startedAt = Date.now();
    let cancelled = false;

    const legal = allLegalMoves(board, aiSide);
    // Safety: if there are no legal moves the game is already over; bail.
    if (legal.length === 0) {
      setThinking(false);
      return;
    }

    // Match the engine's (from,to) to one of our validated legal moves.
    const toLegalMove = (
      res: { from: { r: number; c: number }; to: { r: number; c: number } } | null
    ): Move | null => {
      if (!res) return null;
      return (
        legal.find(
          (m) =>
            m.from.r === res.from.r &&
            m.from.c === res.from.c &&
            m.to.r === res.to.r &&
            m.to.c === res.to.c
        ) ?? null
      );
    };

    // Apply a chosen move (or, as a last resort, a random legal one) so the
    // game NEVER stalls on the AI's turn.
    const finish = (move: Move | null) => {
      if (cancelled) return;
      const chosen = move ?? legal[Math.floor(Math.random() * legal.length)];
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_AI_DELAY - elapsed);
      aiTimer.current = window.setTimeout(() => {
        if (cancelled) return;
        setThinking(false);
        doMove(chosen);
      }, wait);
    };

    // Watchdog: if the engine doesn't answer in time, play a legal move anyway
    // instead of hanging on "AI가 생각하는 중…".
    const watchdog = window.setTimeout(
      () => finish(null),
      AI_TIME_BUDGET + 8000
    );

    engineBestMove(board, aiSide, AI_TIME_BUDGET)
      .then((res) => {
        if (cancelled) return;
        window.clearTimeout(watchdog);
        finish(toLegalMove(res)); // null -> random legal fallback
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(watchdog);
        // Engine errored on this move — don't kill the game; play a legal move.
        finish(null);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toMove, aiSide, gameOver, phase, engineState]);

  const startGame = useCallback((cfg: StartConfig) => {
    unlockAudio(); // gesture: prime audio so the AI's first clack isn't dropped
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    const human = cfg.humanSide;
    const humanSetup: SideSetup = cfg.humanSetup;
    // The AI picks one of the four valid wing formations at random (all are
    // legal Janggi 차림). The engine then plays from that position.
    const wings: WingSetup[] = ['horse-outer', 'elephant-outer'];
    const pick = () => wings[Math.floor(Math.random() * wings.length)];
    const aiSetup: SideSetup = { left: pick(), right: pick() };
    const choSetup = human === 'cho' ? humanSetup : aiSetup;
    const hanSetup = human === 'han' ? humanSetup : aiSetup;

    const initial = initialBoard(choSetup, hanSetup);
    setHumanSide(human);
    setDifficulty(cfg.difficulty);
    // Apply the chosen strength to the engine (best-effort; ignore if not ready).
    setSkillLevel(DIFFICULTY_SETTINGS[cfg.difficulty].skill).catch(() => {});
    setBoard(initial);
    setStartBoard(initial); // remember the starting position for replay
    setToMove('cho');
    setSelected(null);
    setLastMove(null);
    setThinking(false);
    setHistory([]); // fresh game log
    setShowRecord(false);
    setPhase('playing');
  }, []);

  const backToSetup = useCallback(() => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    setThinking(false);
    setSelected(null);
    setPhase('setup');
  }, []);

  const statusText = useMemo(() => {
    if (status.kind === 'checkmate') {
      return status.winner === humanSide ? '외통수! 승리했습니다' : '외통수… 패배했습니다';
    }
    if (status.kind === 'stalemate') {
      return status.winner === humanSide ? '상대가 둘 수 없습니다. 승리!' : '둘 곳이 없습니다. 패배…';
    }
    const turn = toMove === humanSide ? '내 차례' : 'AI 차례';
    return `${turn} (${SIDE_NAME[toMove]})`;
  }, [status, toMove, humanSide]);

  const inCheck = status.kind === 'playing' && status.check;
  // The general under check (the side to move's general) — highlighted on board.
  const checkedKing = useMemo(
    () => (inCheck ? findGeneral(board, toMove) : null),
    [inCheck, board, toMove]
  );

  // Game-over result for the overlay popup.
  const endResult = useMemo(() => {
    if (status.kind === 'checkmate') {
      const win = status.winner === humanSide;
      return {
        win,
        title: win ? '승리!' : '패배',
        detail: win ? '외통수로 이겼습니다' : '외통수… 아쉽네요',
      };
    }
    if (status.kind === 'stalemate') {
      const win = status.winner === humanSide;
      return {
        win,
        title: win ? '승리!' : '패배',
        detail: win ? '상대가 둘 수 없습니다' : '둘 곳이 없습니다',
      };
    }
    return null;
  }, [status, humanSide]);

  // In an in-app browser (KakaoTalk etc.) the engine can't run — show guidance
  // / auto-escape to a real browser instead of the game.
  if (isInAppBrowser()) {
    return <InAppNotice />;
  }

  if (phase === 'setup') {
    return <SetupScreen onStart={startGame} onBack={onExit} />;
  }

  return (
    <div className="app">
      <div className={`status-bar ${inCheck ? 'status-check' : ''}`}>
        {engineState === 'loading' && toMove === aiSide
          ? '엔진 준비 중…'
          : thinking
            ? 'AI가 생각하는 중…'
            : statusText}
      </div>
      {/* Opponent (AI) tray at the top: shows pieces the AI captured. */}
      <CapturedTray
        owner={aiSide}
        captured={aiCaptured}
        score={aiScore}
        label={`AI (${SIDE_NAME[aiSide]})`}
      />

      <div className="board-wrap">
        <Board
          board={board}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onCellTap={onCellTap}
          humanSide={humanSide}
          checkedKing={checkedKing}
        />

        {/* Floating overlay over the board — takes no layout space, so the
            board and bottom buttons never shift when 장군 appears. */}
        {inCheck && !gameOver && (
          <div className="check-banner">
            장군! {toMove === humanSide ? '내 궁이 위험합니다' : ''}
          </div>
        )}

        {endResult && (
          <div className="result-overlay">
            <div className={`result-card ${endResult.win ? 'win' : 'lose'}`}>
              <div className="result-title">{endResult.title}</div>
              <div className="result-detail">{endResult.detail}</div>
              <button className="btn primary result-btn" onClick={backToSetup}>
                새 게임
              </button>
              <button
                className="btn result-btn"
                onClick={() => setShowRecord(true)}
                disabled={history.length === 0}
              >
                기보 보기
              </button>
            </div>
          </div>
        )}

        {engineState === 'failed' && !endResult && (
          <div className="result-overlay">
            <div className="result-card lose">
              <div className="result-title">엔진을 열 수 없어요</div>
              {isInAppBrowser() ? (
                <div className="result-detail">
                  카카오톡·페이스북 같은 앱 안의 브라우저에서는 AI 엔진이 동작하지
                  않습니다. 오른쪽 위 메뉴에서 <b>“다른 브라우저로 열기”</b>(사파리 또는
                  크롬)를 선택해 주세요.
                </div>
              ) : (
                <div className="result-detail">
                  AI 엔진을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
                  {engineError ? ` (${engineError})` : ''}
                </div>
              )}
              <button
                className="btn primary result-btn"
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Human tray at the bottom: shows pieces the player captured. */}
      <CapturedTray
        owner={humanSide}
        captured={humanCaptured}
        score={humanScore}
        label={`나 (${SIDE_NAME[humanSide]})`}
      />

      <div className="game-actions">
        <button
          className="btn"
          onClick={() => setShowRecord(true)}
          disabled={history.length === 0}
        >
          기보
        </button>
        <button className="btn primary" onClick={backToSetup}>
          새 게임
        </button>
      </div>

      {showRecord && (
        <GameRecord
          startBoard={startBoard}
          history={history}
          humanSide={humanSide}
          onClose={() => setShowRecord(false)}
        />
      )}
    </div>
  );
}

import { CBoard, CMove, CPos, CSide } from './engine/chess/types';
import { ChessPiece } from './ChessPiece';

interface Props {
  board: CBoard;
  selected: CPos | null;
  legalTargets: CMove[];
  lastMove: CMove | null;
  onCellTap: (r: number, c: number) => void;
  humanSide: CSide;
  checkedKing?: CPos | null;
}

const N = 8;
const SQ = 44; // square size in px
const PAD = 18; // wooden border around the play area
const LABEL = 14; // margin for rank/file labels inside the frame
const BOARD = SQ * N;
const W = BOARD + LABEL * 2; // playfield incl. label gutters
const TOTAL = W + PAD * 2;

export function ChessBoard({
  board,
  selected,
  legalTargets,
  lastMove,
  onCellTap,
  humanSide,
  checkedKing,
}: Props) {
  // White plays from the bottom. If the human is black, flip the board so the
  // player's pieces are nearest them.
  const flipped = humanSide === 'black';
  const px = (c: number) => LABEL + (flipped ? N - 1 - c : c) * SQ;
  const py = (r: number) => LABEL + (flipped ? N - 1 - r : r) * SQ;

  const FILES = flipped ? 'hgfedcba' : 'abcdefgh';
  const RANKS = flipped ? '12345678' : '87654321';

  return (
    <svg
      className="cboard"
      viewBox={`${-PAD} ${-PAD} ${TOTAL} ${TOTAL}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="체스판"
    >
      <defs>
        {/* dark walnut frame (matches Janggi/Gomoku) */}
        <linearGradient id="cWoodBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4e28" />
          <stop offset="50%" stopColor="#5c3a1c" />
          <stop offset="100%" stopColor="#3c2410" />
        </linearGradient>
        {/* light + dark WOOD squares: warm maple vs walnut, with a soft
            diagonal sheen. Distinct enough to contrast the ivory/charcoal
            pieces. */}
        <linearGradient id="cLight" x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#e7bd82" />
          <stop offset="45%" stopColor="#d8a862" />
          <stop offset="100%" stopColor="#bf8c46" />
        </linearGradient>
        <linearGradient id="cDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9a6534" />
          <stop offset="100%" stopColor="#7d4f26" />
        </linearGradient>
        {/* broad figure grain + fine grain for premium hardwood */}
        <filter id="cGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.055" numOctaves={5} seed={7} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.40
                    0 0 0 0 0.25
                    0 0 0 0 0.08
                    0 0 0 0.55 0" />
        </filter>
        <filter id="cGrainFine" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves={3} seed={19} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.3
                    0 0 0 0 0.19
                    0 0 0 0 0.07
                    0 0 0 0.2 0" />
        </filter>
        <filter id="cBorderGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.16" numOctaves={3} seed={4} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.14
                    0 0 0 0 0.08
                    0 0 0 0 0.03
                    0 0 0 0.55 0" />
        </filter>
        <radialGradient id="cVignette" cx="50%" cy="46%" r="72%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(60,34,8,0.26)" />
        </radialGradient>

        <filter id="cBoardShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.45" />
        </filter>
        {/* piece drop shadow for a 3D "standing on the board" look */}
        <filter id="cPieceShadow" x="-50%" y="-60%" width="200%" height="220%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.3" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <filter id="cSelGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffcf5a" floodOpacity="1" />
        </filter>
      </defs>

      {/* wooden frame + grain */}
      <rect x={-PAD} y={-PAD} width={TOTAL} height={TOTAL} rx={12} fill="url(#cWoodBorder)" filter="url(#cBoardShadow)" />
      <rect x={-PAD} y={-PAD} width={TOTAL} height={TOTAL} rx={12} filter="url(#cBorderGrain)" opacity={0.5} />
      {/* inner bevel */}
      <rect x={-PAD / 2} y={-PAD / 2} width={W + PAD} height={W + PAD} rx={8} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
      <rect x={-PAD / 2 + 1.5} y={-PAD / 2 + 1.5} width={W + PAD - 3} height={W + PAD - 3} rx={7} fill="none" stroke="rgba(255,225,170,0.22)" strokeWidth={1} />

      {/* file/rank labels */}
      {Array.from({ length: N }, (_, i) => (
        <g key={`lbl${i}`} className="clabel">
          <text x={LABEL + i * SQ + SQ / 2} y={-PAD / 2 + 1} textAnchor="middle" dominantBaseline="middle">{FILES[i]}</text>
          <text x={LABEL + i * SQ + SQ / 2} y={W - LABEL / 2} textAnchor="middle" dominantBaseline="middle">{FILES[i]}</text>
          <text x={LABEL / 2 - PAD / 2} y={LABEL + i * SQ + SQ / 2} textAnchor="middle" dominantBaseline="middle">{RANKS[i]}</text>
          <text x={W - LABEL / 2} y={LABEL + i * SQ + SQ / 2} textAnchor="middle" dominantBaseline="middle">{RANKS[i]}</text>
        </g>
      ))}

      {/* checkered squares (iterate SCREEN positions so labels always match) */}
      {Array.from({ length: N }, (_, sr) =>
        Array.from({ length: N }, (_, sc) => {
          const dark = (sr + sc) % 2 === 1;
          return (
            <rect
              key={`sq${sr}-${sc}`}
              x={LABEL + sc * SQ}
              y={LABEL + sr * SQ}
              width={SQ}
              height={SQ}
              fill={dark ? 'url(#cDark)' : 'url(#cLight)'}
            />
          );
        })
      )}
      {/* wood grain across the whole playfield + vignette */}
      <rect x={LABEL} y={LABEL} width={BOARD} height={BOARD} filter="url(#cGrain)" opacity={0.5} />
      <rect x={LABEL} y={LABEL} width={BOARD} height={BOARD} filter="url(#cGrainFine)" opacity={0.35} />
      <rect x={LABEL} y={LABEL} width={BOARD} height={BOARD} fill="url(#cVignette)" />

      {/* last-move highlight */}
      {lastMove && (
        <>
          <rect x={px(lastMove.from.c) + 2.5} y={py(lastMove.from.r) + 2.5} width={SQ - 5} height={SQ - 5} rx={2} className="clast clast-from" />
          <rect x={px(lastMove.to.c) + 2.5} y={py(lastMove.to.r) + 2.5} width={SQ - 5} height={SQ - 5} rx={2} className="clast clast-to" />
        </>
      )}

      {/* selected square */}
      {selected && (
        <rect x={px(selected.c)} y={py(selected.r)} width={SQ} height={SQ} className="csel" />
      )}

      {/* check highlight */}
      {checkedKing && (
        <rect x={px(checkedKing.c)} y={py(checkedKing.r)} width={SQ} height={SQ} className="ccheck" />
      )}

      {/* pieces + legal targets + tap zones (iterate LOGICAL cells) */}
      {board.map((row, r) =>
        row.map((piece, c) => {
          const x = px(c);
          const y = py(r);
          const target = legalTargets.find((m) => m.to.r === r && m.to.c === c);
          const isSel = selected && selected.r === r && selected.c === c;
          return (
            <g key={`cell${r}-${c}`} onClick={() => onCellTap(r, c)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={SQ} height={SQ} fill="transparent" />
              {piece && (
                <g filter={isSel ? 'url(#cSelGlow)' : undefined}>
                  <ChessPiece
                    type={piece.type}
                    side={piece.side}
                    size={SQ * 0.92}
                    x={x + SQ * 0.04}
                    y={y + SQ * 0.02}
                    idPrefix={`cp-${r}-${c}`}
                  />
                </g>
              )}
              {target && (
                <circle
                  cx={x + SQ / 2}
                  cy={y + SQ / 2}
                  r={target.captured ? SQ * 0.42 : SQ * 0.16}
                  className={target.captured ? 'ctarget-capture' : 'ctarget-dot'}
                />
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

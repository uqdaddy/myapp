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
        {/* charcoal frame */}
        <linearGradient id="cWoodBorder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3e" />
          <stop offset="50%" stopColor="#2a2a2d" />
          <stop offset="100%" stopColor="#161618" />
        </linearGradient>
        {/* light + dark MARBLE squares: classic cream-ivory + green serpentine
            marble. The green/cream contrast reads clearly against BOTH the
            white (ivory) and black (charcoal) disc pieces. */}
        <linearGradient id="cLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3ead2" />
          <stop offset="100%" stopColor="#e2d3ad" />
        </linearGradient>
        <linearGradient id="cDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5f7d5a" />
          <stop offset="100%" stopColor="#48624a" />
        </linearGradient>
        {/* MARBLE VEINS: wispy turbulence turned into thin translucent streaks,
            overlaid across the whole playfield for a polished-marble look. */}
        <filter id="cMarble" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.014 0.03"
            numOctaves={4}
            seed={13}
            stitchTiles="stitch"
            result="turb"
          />
          {/* sharpen the turbulence into vein-like ridges */}
          <feColorMatrix
            in="turb"
            type="matrix"
            values="0 0 0 0 0.55
                    0 0 0 0 0.55
                    0 0 0 0 0.58
                    0 0 0 2.2 -0.9"
            result="veins"
          />
          {/* keep only the thin bright ridges (soft) */}
          <feComponentTransfer in="veins" result="softveins">
            <feFuncA type="gamma" amplitude="1" exponent="2.2" offset="0" />
          </feComponentTransfer>
          <feComposite in="softveins" operator="over" />
        </filter>
        <filter id="cBorderGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8 0.8" numOctaves={2} seed={4} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0.06
                    0 0 0 0 0.06
                    0 0 0 0 0.07
                    0 0 0 0.5 0" />
        </filter>
        <radialGradient id="cVignette" cx="50%" cy="46%" r="72%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(20,20,24,0.16)" />
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
      {/* marble veining across the whole playfield (light veins read on the
          dark squares; a second darker pass reads on the light squares) */}
      <rect x={LABEL} y={LABEL} width={BOARD} height={BOARD} filter="url(#cMarble)" opacity={0.5} style={{ mixBlendMode: 'screen' }} />
      <rect x={LABEL} y={LABEL} width={BOARD} height={BOARD} filter="url(#cMarble)" opacity={0.32} style={{ mixBlendMode: 'multiply' }} />
      {/* polished vignette over the squares */}
      <rect x={LABEL} y={LABEL} width={BOARD} height={BOARD} fill="url(#cVignette)" />

      {/* last-move highlight */}
      {lastMove && (
        <>
          <rect x={px(lastMove.from.c)} y={py(lastMove.from.r)} width={SQ} height={SQ} className="clast" />
          <rect x={px(lastMove.to.c)} y={py(lastMove.to.r)} width={SQ} height={SQ} className="clast" />
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

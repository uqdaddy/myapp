import { GBoard, GPos, SIZE, Stone, idx } from './engine/gomoku/types';

interface Props {
  board: GBoard;
  lastMove: GPos | null;
  onCellTap: (r: number, c: number) => void;
  disabled?: boolean;
}

const MARGIN = 24; // px padding around the grid
const GAP = 30; // px between grid lines
const W = MARGIN * 2 + GAP * (SIZE - 1);

function x(c: number) {
  return MARGIN + c * GAP;
}
function y(r: number) {
  return MARGIN + r * GAP;
}

// Traditional star points (화점) on a 15x15 board.
const STARS: [number, number][] = [
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
  [7, 7],
];

export function GomokuBoard({ board, lastMove, onCellTap, disabled }: Props) {
  return (
    <svg
      className="gboard"
      viewBox={`0 0 ${W} ${W}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="오목판"
    >
      <defs>
        <radialGradient id="gWoodGrad" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#f0c986" />
          <stop offset="100%" stopColor="#d9a95e" />
        </radialGradient>
        <radialGradient id="blackStone" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#6a6a6a" />
          <stop offset="45%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id="whiteStone" cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#eee" />
          <stop offset="100%" stopColor="#c8c8c8" />
        </radialGradient>
      </defs>

      {/* board surface */}
      <rect x={0} y={0} width={W} height={W} rx={6} fill="url(#gWoodGrad)" />

      {/* grid lines */}
      {Array.from({ length: SIZE }, (_, i) => (
        <g key={`l${i}`}>
          <line x1={x(0)} y1={y(i)} x2={x(SIZE - 1)} y2={y(i)} className="gline" />
          <line x1={x(i)} y1={y(0)} x2={x(i)} y2={y(SIZE - 1)} className="gline" />
        </g>
      ))}

      {/* star points */}
      {STARS.map(([r, c], i) => (
        <circle key={`s${i}`} cx={x(c)} cy={y(r)} r={3.5} className="gstar" />
      ))}

      {/* stones + tap zones */}
      {Array.from({ length: SIZE }, (_, r) =>
        Array.from({ length: SIZE }, (_, c) => {
          const v: Stone | null = board[idx(r, c)];
          const isLast = lastMove && lastMove.r === r && lastMove.c === c;
          return (
            <g
              key={`c${r}-${c}`}
              onClick={() => !disabled && onCellTap(r, c)}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
              <rect
                x={x(c) - GAP / 2}
                y={y(r) - GAP / 2}
                width={GAP}
                height={GAP}
                fill="transparent"
              />
              {v && (
                <>
                  <circle
                    cx={x(c)}
                    cy={y(r)}
                    r={GAP * 0.44}
                    fill={v === 'black' ? 'url(#blackStone)' : 'url(#whiteStone)'}
                    className="gstone"
                  />
                  {isLast && (
                    <circle
                      cx={x(c)}
                      cy={y(r)}
                      r={3.5}
                      className={`glast ${v === 'black' ? 'on-black' : 'on-white'}`}
                    />
                  )}
                </>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

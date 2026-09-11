# Gameplay validation

Run `node scripts/check-rules.mjs` after installing the project dependencies.
The checks cover chess move counts, castling through check, promotion choices,
en passant (including exposing the king), mate, stalemate, material draws and
the app's 50-move threshold; Janggi cannon screens, horse/elephant blockers,
palace moves and facing generals; freestyle Gomoku overlines, immediate AI
wins/blocks and safe timeout handling for every difficulty.

The UI uses blue last-move markers (dashed origin, solid destination), amber
selection and green available moves. Captured trays scroll after two rows.
At 320px, all three game screens were checked for horizontal overflow and
44px action buttons. Short screens may scroll vertically to preserve board size.

Local desktop browser engine timings at the initial position were approximately
0.5 / 1 / 2 seconds for Janggi and chess easy / normal / hard. Every returned
move was legal. These are not mobile-device performance measurements or Elo
ratings. Gomoku difficulty separates defensive lookahead and search breadth;
all levels still take an immediate win and defend an immediate loss.

## Explicit app rule variants

- Gomoku: freestyle, no forbidden moves, five or more wins.
- Janggi: facing generals is prohibited; passing and accepting bikjang are not
  implemented; no legal move loses. This is a simplified app ruleset.
- Chess: 50 moves without capture/pawn movement auto-draws in this app; repetition
  claims and automatic repetition draws are not implemented. FIDE tournament
  rules distinguish claimable 50-move draws from automatic 75-move draws.
  Reference: https://handbook.fide.com/chapter/e012023

Rule checks verify these explicit variants; they do not certify full tournament
rule compliance. No autosave or exit-confirmation feature was added.

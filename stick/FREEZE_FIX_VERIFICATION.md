# Freeze fixes — 2026-09-26

## Reproduced causes

1. A completed rotation calls `refresh()` and starts attack effects inside the same animation frame. The RAF timestamp predates the synchronous board search; an effect timestamp may therefore be more than 350 ms later. `drawBattleEffects()` previously passed a negative radius to Canvas `arc()`, which throws `IndexSizeError`. The next RAF was not scheduled, permanently stopping the render loop. Clamp effect age to zero; retain all attack timing and damage rules.
2. On a 4×4 board with enemy obstacles enabled, the first lock searched for integer coordinates (1, 1). No such tile exists on an even-sized cube. Accessing `locked` on the missing tile rejected attack resolution and left it in `resolving`. Use the front outer corner only when the original target is absent. Existing 3×3 and 5×5 targets and two-turn duration remain unchanged.

## Verification

- `freeze-regression.test.cjs`: 11 scenarios, including strict Canvas negative-radius validation, actual frame/attack resolution with 350/500 ms simulated search delay, and a full 4×4 counter/obstacle returning to ready. These reproduced the original failures and pass after the fix.
- Existing ring, stick, pointer-release, tutorial, entry parity, automatic battle, menu, orbit and battle-feed tests pass.
- Public pre-fix browser baseline: 26 turns across ring and trigger controls, including attacks/refills and six turns with the 2D map open at a 390px viewport. This alone did not reproduce the timing race and is not proof of absence.
- Fixed local browser: 4×4 with enemy obstacles enabled, six turns through two enemy actions, subsequent controls available and no console errors.
- No input method, ring design, board rotation algorithm, damage, refill balance, history or default settings changed.
- Physical Android LINE WebView and iPhone Safari were not available; viewport simulation and Node event tests do not replace real-device touch verification.

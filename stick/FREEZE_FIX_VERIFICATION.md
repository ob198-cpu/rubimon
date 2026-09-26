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

## Follow-up: shared input latch (2026-09-26)

The user reported the freeze again, including during combat with either control. Treat the earlier fixes as insufficient to establish resolution of that report.

- Confirmed by fault injection: when `setPointerCapture()` rejects a trigger gesture, `press` was left set. That same flag rejects subsequent cube selection, trigger gestures and ring readiness. Capture rejection now clears the gesture without rotating or clearing the chosen tile.
- Releases/cancellations delivered outside the trigger are now handled at window capture phase. This runs before the canvas stops propagation. The existing finish handler clears the latch before committing, so pad and window delivery cannot cause two turns.
- Cube capture rejection also clears its pending gesture. No board, battle, tutorial, visual or selection-policy changes.
- If every release notification is omitted, a fresh primary press from the same pointer type cancels the stale gesture before the new target receives input. Secondary touches, right clicks and simultaneous different pointer types do not cancel a held gesture. Old input is never replayed.
- `pointer-capture-failure.test.cjs`: 26 cases cover mouse/touch rejection, a later successful gesture, outside release/cancel, duplicate events, stale boards, unrelated pointers, cube capture failure and fresh-primary recovery. All existing `stick/*.test.cjs` tests pass.
- Local browser: 8 alternating ring/trigger turns (including release beyond trigger bounds), then 4 ring turns at 390×750. Controls returned after battle resolution; no observed console errors. These are mouse actions, not physical touch verification.
- Fresh public baseline already loaded the previous fixes and did not reproduce the user's persistent combat freeze in ordinary mouse operation. The injected capture failure is a verified defect, but is not proven to be the cause on the user's device. Android LINE WebView remains unverified.

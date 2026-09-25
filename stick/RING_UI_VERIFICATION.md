# Ring operation UI — 2026-09-23

## Scope
CSS/SVG continuous metal ring and real HTML direction buttons. Canvas, face selection and cube projection are reused. Row/column mode has been removed (2026-09-25). Select a tile, then choose any of four directions. The original trigger and keyboard also accept all four directions. Selection is cleared after a committed move, as before.

## Existing logic connection
`ring-interface.js` → `ringControls.move(direction)` → `stickMoveFor(picked, dx, dy)` → `B.canRotate(state, face)` → existing `userMove(face, dir)` → existing queue, animation, `E.move`, history and `resolveTurn`.

No engine, battle, balance, scoring or history algorithms changed. `game.js` changes only the rendered tile inset (.436 to .456 in this interface), reducing black gaps. Existing layer animation is reused; ring-issued moves set the existing duration option to 280 ms, or 1 ms with reduced motion. Other faces of the SAME physical layer necessarily move too, as with a real cube; on the front face only the selected row/column moves. No whole-cube permutation is issued.

## Verification
- `ring-interface.test.cjs`: 1,200 direction cases across six faces and sizes 3/4/5. Non-selected layers unchanged, visible affected line has exactly N tiles, direction agrees with projected motion. No-selection, busy, locked, repeat and reduced-motion checks.
- Existing stick tests: 18,900 view-relative directions; pointer release/cancellation; tutorial restoration; entry parity; per-move combat and third-move enemy action; menu, 2D map and combat feed regression tests pass.
- Browser (Chromium): all four HTML direction buttons executed; Historical check before the 2026-09-25 rollback: row/column gating was tested; that gating is now removed. no selection and animation disable all four. Combat resolves through existing flow.
- Responsive: 320px (280px stage, 44px targets), 390px (~336px stage, 47px targets), 768px (480px stage, ~67px targets). Canvas/ring center deltas 0/0, no horizontal overflow. Desktop 1280px visually inspected. Vertical scrolling is deliberate to avoid shrinking controls or overlapping explanations.
- Browser console: no errors in tested interactions.
- Not verified on physical Android LINE WebView or iPhone Safari. Browser clicks and simulated viewport sizes are not a claim of real-device touch verification.

## Assets and layout
No image-generated UI or new dependencies. SVG ring layers are pointer-events:none. HTML buttons own their disabled, hover, active and focus states. All share the ring-stage relative container. Foreground lower arc overlays the canvas layer without covering its front-face tiles. Perspective viewing is scaled inside the hole so buttons do not cover cube corners.

## 2026-09-25 scoped rollback
Removed the row/column selector and its input gate. Direction maps directly from the selected tile through existing stickMoveFor. Selection outline marks the tile; turn-start outline marks the chosen line. Ring artwork, camera release correction and game logic are unchanged. Physical mobile touch verification remains outstanding.

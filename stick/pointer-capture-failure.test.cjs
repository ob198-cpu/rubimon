const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/stick.js', 'utf8');

// These are event-delivery simulations, not a physical LINE/WebView device test.
const event = (id, x, y, pointerType = 'touch') => ({
  pointerType, isPrimary: true, button: 0, pointerId: id, clientX: x, clientY: y,
  preventDefault() {}, stopImmediatePropagation() {},
});

function setupPad() {
  const handlers = {}, windowHandlers = {}, windowCapture = {}, moves = [];
  const context = {
    press: null, preview: null, picked: { id: 1 }, mode: 'turn', state: [], boardPress: null,
    rejectCapture: false, knob: { style: {} }, status: {}, cancel: {}, selectedLayer: null, previewDir: 0,
    pad: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      addEventListener: (name, handler) => { handlers[name] = handler; },
      setPointerCapture() {
        if (context.rejectCapture) throw new DOMException('Pointer is no longer active', 'NotFoundError');
      },
      hasPointerCapture: () => false,
    },
    addEventListener: (name, handler, options) => {
      windowHandlers[name] = handler;
      windowCapture[name] = options === true || options?.capture === true;
    },
    ready: () => true,
    stickMoveFor: (tile, x, y) => Math.hypot(x, y) >= 12 ? { face: 'F', dir: y < 0 ? -1 : 1 } : null,
    updateGuide() {}, B: { canRotate: () => true },
    clearGuide: () => { context.preview = null; },
    userMove: (...args) => moves.push(args),
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf(' function movePad('), source.indexOf(" pad.addEventListener('keydown'")), context);
  return { context, handlers, windowHandlers, windowCapture, moves };
}

let cases = 0;
for (const pointerType of ['mouse', 'touch']) {
  // Rejected capture must not leave the same latch that also blocks selection
  // and ring input. A later valid pointer is a completely new gesture.
  {
    const { context: c, handlers, moves } = setupPad();
    c.rejectCapture = true; c.preview = { face: 'R', dir: 1 };
    assert.doesNotThrow(() => handlers.pointerdown(event(1, 50, 50, pointerType)));
    assert.equal(c.press, null, 'capture rejection must not permanently block cube/ring/pad input');
    assert.equal(c.preview, null, 'capture rejection must discard the interrupted preview');
    assert.equal(c.picked.id, 1, 'capture rejection must not change tile selection');
    c.rejectCapture = false;
    handlers.pointerdown(event(2, 50, 50, pointerType));
    handlers.pointerup(event(2, 50, 20, pointerType));
    assert.equal(moves.length, 1, 'a new valid gesture works after the interrupted gesture');
    assert.equal(c.press, null); cases++;
  }

  for (const scenario of ['outside-up', 'outside-cancel', 'stale-board', 'duplicate-up', 'other-pointer']) {
    const { context: c, handlers, windowHandlers, windowCapture, moves } = setupPad();
    assert.equal(typeof windowHandlers.pointerup, 'function', 'window release fallback must be registered');
    assert.equal(typeof windowHandlers.pointercancel, 'function', 'window cancellation fallback must be registered');
    assert.equal(windowCapture.pointerup, true, 'release fallback must precede canvas stopImmediatePropagation');
    assert.equal(windowCapture.pointercancel, true, 'cancellation fallback must precede descendants that stop propagation');
    handlers.pointerdown(event(1, 50, 50, pointerType));
    handlers.pointermove(event(1, 50, 20, pointerType));
    if (scenario === 'stale-board') c.state = [1];
    if (scenario === 'other-pointer') {
      windowHandlers.pointerup(event(2, 50, 20, pointerType));
      assert.equal(c.press.id, 1, 'another pointer must not release this gesture');
      assert.equal(moves.length, 0);
    }
    const release = event(1, 50, 20, pointerType);
    if (scenario === 'outside-cancel') windowHandlers.pointercancel(release);
    else windowHandlers.pointerup(release);
    if (scenario === 'duplicate-up') {
      handlers.pointerup(release);
      windowHandlers.pointerup(release);
    }
    assert.equal(c.press, null, scenario + ': release must clear the input latch');
    assert.equal(c.preview, null, scenario + ': release must clear the preview');
    assert.equal(moves.length, ['outside-cancel', 'stale-board'].includes(scenario) ? 0 : 1,
      scenario + ': valid release rotates once; cancelled or stale gestures never rotate');
    cases++;
  }

  // No up/cancel/lostcapture reaches the page. The next primary gesture of the
  // same pointer type cancels the abandoned gesture before a target handles it.
  for (const nextId of [1, 2]) {
    const { context: c, handlers, windowHandlers, windowCapture, moves } = setupPad();
    assert.equal(typeof windowHandlers.pointerdown, 'function', 'a fresh primary gesture must release stale input');
    assert.equal(windowCapture.pointerdown, true, 'stale input recovery must run before target pointerdown guards');
    handlers.pointerdown(event(1, 50, 50, pointerType));
    handlers.pointermove(event(1, 50, 20, pointerType));
    assert.ok(c.press);
    const next = event(nextId, 50, 50, pointerType);
    windowHandlers.pointerdown(next);
    assert.equal(c.press, null, 'a new primary gesture discards abandoned press, including reused pointer IDs');
    assert.equal(c.preview, null);
    assert.equal(c.picked.id, 1, 'recovery preserves the selected tile');
    assert.equal(moves.length, 0, 'recovery cancels rather than committing the missing release');
    handlers.pointerdown(next);
    windowHandlers.pointerup(event(nextId, 50, 20, pointerType));
    handlers.pointerup(event(nextId, 50, 20, pointerType));
    assert.equal(moves.length, 1, 'the new gesture can rotate once without reload');
    assert.equal(c.press, null); cases++;
  }

  for (const scenario of ['secondary', 'unknown-primary', 'other-button', 'other-pointer-type']) {
    const { context: c, handlers, windowHandlers, moves } = setupPad();
    handlers.pointerdown(event(1, 50, 50, pointerType));
    handlers.pointermove(event(1, 50, 20, pointerType));
    const originalPress = c.press, incoming = event(2, 50, 50, pointerType);
    if (scenario === 'secondary') incoming.isPrimary = false;
    if (scenario === 'unknown-primary') delete incoming.isPrimary;
    if (scenario === 'other-button') incoming.button = 2;
    if (scenario === 'other-pointer-type') incoming.pointerType = pointerType === 'touch' ? 'mouse' : 'touch';
    windowHandlers.pointerdown(incoming);
    assert.equal(c.press, originalPress, scenario + ': must not cancel the active legitimate gesture');
    assert.equal(moves.length, 0);
    windowHandlers.pointerup(event(1, 50, 20, pointerType));
    assert.equal(moves.length, 1, scenario + ': original gesture still works');
    cases++;
  }
}

function setupCanvas(ringTarget) {
  const handlers = {}, moves = [], sticker = { id: 4, p: [0, 0, 1], n: [0, 0, 1] };
  const c = {
    rejectCapture: true, boardPress: null, tutorial: null, press: null, compactBoard: false,
    viewYaw: 0, viewPitch: 0, state: [], picked: ringTarget ? sticker : null,
    cancel: {}, panelPick: null, ringTargets: ringTarget ? [{ x: 50, y: 50, face: 'F', dir: 1 }] : [],
    hitFaces: [{ sticker, points: [] }], inside: () => true, boardPointer: e => [e.clientX, e.clientY],
    canvas: {
      addEventListener: (name, handler) => { handlers[name] = handler; },
      setPointerCapture() {
        if (c.rejectCapture) throw new DOMException('Pointer is no longer active', 'NotFoundError');
      },
      hasPointerCapture: () => false,
    },
    ready: () => true, B: { canRotate: () => true }, setMode() {}, updateView() {},
    faceSelectedTile() {}, normalizeReleasedView() {}, clearGuide() {},
    userMove: (...args) => moves.push(args),
  };
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf(" canvas.addEventListener('pointerdown'"), source.indexOf(' function movePad(')), c);
  return { c, handlers, moves };
}

for (const ringTarget of [false, true]) {
  const { c, handlers, moves } = setupCanvas(ringTarget);
  assert.doesNotThrow(() => handlers.pointerdown(event(1, 50, 50)));
  assert.equal(c.boardPress, null, 'rejected canvas capture must not leave a live gesture');
  assert.equal(moves.length, 0, 'capture rejection must not commit any move');
  c.rejectCapture = false;
  handlers.pointerdown(event(2, 50, 50));
  handlers.pointerup(event(2, 50, 50));
  assert.equal(c.boardPress, null, 'subsequent canvas gesture releases cleanly');
  if (ringTarget) assert.equal(moves.length, 1, 'existing canvas ring target remains functional');
  else assert.equal(c.picked.id, 4, 'subsequent canvas tap still selects the requested tile');
  cases++;
}
console.log(`PASS: ${cases} pointer-capture rejection and outside-release lifecycle cases`);

// Pure-recognizer unit tests driven by SYNTHETIC input-frame sequences — no
// WebXR, no headset, no clock. This is the payoff of splitting the recognizer out
// as a pure function: every gesture edge is provable deterministically by feeding
// hand frames and an explicit `now`, then asserting the gestures and threading the
// returned state. [LAW:behavior-not-structure] we assert the gesture vocabulary
// the recognizer emits, never its internals.
//
// Run: deno test --no-check packages/avp-gestures/test/recognizer.test.ts
// (--no-check: the recognizer's only relative imports are `import type`, erased at
// runtime; type-checking is done by `tsc -p packages/avp-gestures/tsconfig.json`.)

import { strict as assert } from 'node:assert';
import { makeRecognizerState, recognizeGestures, type RecognizerState } from '../src/recognizer.ts';
import type { GripState, Hand, HandInputFrame, XrGesture } from '../src/types.ts';

function idle(): HandInputFrame {
  return {
    pinch: { active: false, origin: [0, 0, 0], current: [0, 0, 0], startTime: 0 },
    gazeRay: null, currentRay: null, ray: null, joints: null, palmNormal: null, grip: null,
  };
}

function hand(over: Partial<HandInputFrame>): HandInputFrame {
  return { ...idle(), ...over };
}

function bothHands(left: Partial<HandInputFrame>, right: Partial<HandInputFrame> = {}): Record<Hand, HandInputFrame> {
  return { left: hand(left), right: hand(right) };
}

function pinching(startTime: number): Partial<HandInputFrame> {
  return { pinch: { active: true, origin: [0, 0, 0], current: [0, 0, 0], startTime }, gazeRay: { origin: [0, 0, 0], dir: [0, 0, -1] } };
}

function released(startTime: number): Partial<HandInputFrame> {
  // The adapter sets active:false on release but keeps startTime; mirror that.
  return { pinch: { active: false, origin: [0, 0, 0], current: [0, 0, 0], startTime } };
}

function grip(thumbRing: boolean): GripState {
  return { thumbIndex: false, thumbMiddle: false, thumbRing, thumbPinky: false };
}

// The wrist joint at a given roll-about-X orientation — all the recognizer reads
// for wrist-flick.
function wristJoints(phi: number): HandInputFrame['joints'] {
  const quat = [Math.sin(phi / 2), 0, 0, Math.cos(phi / 2)];
  return { wrist: { position: [0, 0, 0], orientation: quat, radius: 0.01 } };
}

const kinds = (gestures: XrGesture[]): string[] => gestures.map((g) => g.kind);

Deno.test('pinch: start -> hold (with duration) -> end (with duration)', () => {
  let st: RecognizerState = makeRecognizerState();

  let r = recognizeGestures(bothHands(pinching(1000)), st, 1000);
  assert.deepEqual(kinds(r.gestures), ['pinch-start']);
  st = r.state;

  r = recognizeGestures(bothHands(pinching(1000)), st, 1500);
  assert.deepEqual(kinds(r.gestures), ['pinch-hold']);
  const hold = r.gestures[0];
  assert.equal(hold.kind === 'pinch-hold' && hold.dur, 500);
  st = r.state;

  r = recognizeGestures(bothHands(released(1000)), st, 1600);
  assert.deepEqual(kinds(r.gestures), ['pinch-end']);
  const end = r.gestures[0];
  assert.equal(end.kind === 'pinch-end' && end.dur, 600);
});

Deno.test('pinch-start requires a frozen gaze ray (none -> no start)', () => {
  const st = makeRecognizerState();
  // pinch active but gazeRay null (ray never resolved): no pinch-start emitted.
  const noGaze = hand({ pinch: { active: true, origin: [0, 0, 0], current: [0, 0, 0], startTime: 1000 }, gazeRay: null });
  const r = recognizeGestures({ left: noGaze, right: idle() }, st, 1000);
  assert.deepEqual(kinds(r.gestures), []);
});

Deno.test('two-hand pinch: both-hand edges then the two-hand edge, in order', () => {
  let st = makeRecognizerState();

  let r = recognizeGestures(bothHands(pinching(1000), pinching(1000)), st, 1000);
  assert.deepEqual(kinds(r.gestures), ['pinch-start', 'pinch-start', 'two-hand-pinch-start']);
  st = r.state;

  r = recognizeGestures(bothHands(released(1000), released(1000)), st, 1100);
  assert.deepEqual(kinds(r.gestures), ['pinch-end', 'pinch-end', 'two-hand-pinch-end']);
});

Deno.test('ring-pinch: on edge, steady (silent), off edge', () => {
  let st = makeRecognizerState();

  let r = recognizeGestures(bothHands({ grip: grip(true) }), st, 100);
  assert.deepEqual(kinds(r.gestures), ['ring-pinch-on']);
  st = r.state;

  r = recognizeGestures(bothHands({ grip: grip(true) }), st, 116);
  assert.deepEqual(kinds(r.gestures), []);
  st = r.state;

  r = recognizeGestures(bothHands({ grip: grip(false) }), st, 132);
  assert.deepEqual(kinds(r.gestures), ['ring-pinch-off']);
});

Deno.test('palm: hysteresis — up above enter, hold through the band, down below exit', () => {
  let st = makeRecognizerState();

  let r = recognizeGestures(bothHands({ palmNormal: [0, 0.8, 0] }), st, 0);
  assert.deepEqual(kinds(r.gestures), ['palm-up']);
  st = r.state;

  // 0.5 is below ENTER (0.7) but above EXIT (0.4): stays up, no edge.
  r = recognizeGestures(bothHands({ palmNormal: [0, 0.5, 0] }), st, 16);
  assert.deepEqual(kinds(r.gestures), []);
  st = r.state;

  r = recognizeGestures(bothHands({ palmNormal: [0, 0.3, 0] }), st, 32);
  assert.deepEqual(kinds(r.gestures), ['palm-down']);
});

Deno.test('wrist-flick: fires only when armed two frames past the refractory window', () => {
  let st = makeRecognizerState();

  // Frame 1: establishes the wrist orientation; no previous orientation yet.
  let r = recognizeGestures(bothHands({ joints: wristJoints(0) }), st, 1000);
  assert.deepEqual(kinds(r.gestures), []);
  st = r.state;

  // Frame 2: fast rotation (0.2 rad / 16 ms ≈ 12.5 rad/s) arms, but the previous
  // frame was not armed, so no flick yet.
  r = recognizeGestures(bothHands({ joints: wristJoints(0.2) }), st, 1016);
  assert.deepEqual(kinds(r.gestures), []);
  st = r.state;

  // Frame 3: still fast and now armed-on-armed past the refractory window → flick.
  r = recognizeGestures(bothHands({ joints: wristJoints(0.4) }), st, 1032);
  assert.equal(r.gestures.length, 1);
  const g = r.gestures[0];
  assert.equal(g.kind, 'wrist-flick');
  if (g.kind === 'wrist-flick') {
    assert.equal(g.axis, 'pitch');
    assert.equal(g.sign, 1);
  }
});

Deno.test('recognizeGestures is pure: it does not mutate the passed-in state', () => {
  const st = makeRecognizerState();
  const before = JSON.stringify(st);
  recognizeGestures(bothHands(pinching(1000)), st, 1000);
  assert.equal(JSON.stringify(st), before);
});

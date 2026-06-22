// The PURE gesture recognizer — the headline value of avp-gestures. It turns the
// per-frame hand substrate into the intent-neutral gesture vocabulary, carrying
// its own finite-state-machine state explicitly. [LAW:effects-at-boundaries] it
// reads no WebXR and no clock: `now` is an INPUT, supplied by the adapter (the
// one clock owner), so the recognizer is a deterministic function of (frames,
// state, now) and is unit-testable with synthetic frames and no headset.
// [LAW:no-ambient-temporal-coupling]
//
// It NEVER emits metrics, derives app gain, or mutates the world — it returns
// gestures as data and the next state. Mapping a gesture to meaning is the
// consumer's job. [LAW:dataflow-not-control-flow]

import type { Hand, HandInputFrame, XrGesture } from './types';

// Palm-facing hysteresis: enter "palm up" above ENTER, leave below EXIT.
const PALM_UP_ENTER = 0.7;
const PALM_UP_EXIT = 0.4;
// A wrist rotation faster than this (rad/s), held armed across two frames, fires
// one flick; refractory blocks a burst from the same motion.
const FLICK_SPEED_RAD_S = 4.0;
const FLICK_REFRACTORY_MS = 300;

// Per-hand FSM state the recognizer carries between frames. Named for the motion
// it tracks (ringActive = ring-pinch contact is held), not any app meaning.
interface HandRecognizerState {
  prevPinch: boolean;
  ringActive: boolean;
  palmUp: boolean;
  wristOrient: number[] | null;
  wristTime: number;
  flickArmed: boolean;
  lastFlickAt: number;
}

export interface RecognizerState {
  left: HandRecognizerState;
  right: HandRecognizerState;
}

function makeHandState(): HandRecognizerState {
  return { prevPinch: false, ringActive: false, palmUp: false, wristOrient: null, wristTime: 0, flickArmed: false, lastFlickAt: 0 };
}

export function makeRecognizerState(): RecognizerState {
  return { left: makeHandState(), right: makeHandState() };
}

function quatConj(q: number[]): number[] { return [-q[0], -q[1], -q[2], q[3]]; }
function quatMul(a: number[], b: number[]): number[] {
  return [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
  ];
}

// One hand's gesture edges for this frame, plus the state carried to the next.
function recognizeHand(
  hand: Hand,
  hf: HandInputFrame,
  prev: HandRecognizerState,
  nowMs: number,
): { gestures: XrGesture[]; next: HandRecognizerState } {
  const gestures: XrGesture[] = [];
  const isActive = hf.pinch.active;

  if (isActive && !prev.prevPinch && hf.gazeRay) {
    gestures.push({ kind: 'pinch-start', hand, gazeRay: hf.gazeRay });
  } else if (isActive && prev.prevPinch) {
    gestures.push({ kind: 'pinch-hold', hand, dur: nowMs - hf.pinch.startTime });
  } else if (!isActive && prev.prevPinch) {
    gestures.push({ kind: 'pinch-end', hand, dur: nowMs - hf.pinch.startTime });
  }

  // Ring-pinch: thumb-to-ring-finger contact edges. Carry the previous contact
  // when grip is untracked this frame so a tracking dropout is not read as a
  // release. [LAW:no-silent-failure]
  let ringActive = prev.ringActive;
  if (hf.grip) {
    const active = hf.grip.thumbRing === true;
    if (active && !prev.ringActive) gestures.push({ kind: 'ring-pinch-on', hand });
    else if (!active && prev.ringActive) gestures.push({ kind: 'ring-pinch-off', hand });
    ringActive = active;
  }

  let palmUp = prev.palmUp;
  if (hf.palmNormal) {
    const upDot = hf.palmNormal[1];
    const isUp = prev.palmUp ? (upDot > PALM_UP_EXIT) : (upDot > PALM_UP_ENTER);
    if (isUp && !prev.palmUp) gestures.push({ kind: 'palm-up', hand });
    else if (!isUp && prev.palmUp) gestures.push({ kind: 'palm-down', hand });
    palmUp = isUp;
  }

  // Wrist-flick: a fast wrist rotation while NOT pinching. The dominant rotation
  // axis picks roll/pitch/yaw; the sign is the component's sign on that axis.
  const wristQuat = hf.joints?.['wrist']?.orientation ?? null;
  let flickArmed = false;
  let lastFlickAt = prev.lastFlickAt;
  if (wristQuat && prev.wristOrient && !hf.pinch.active) {
    const dtSec = Math.max(0.001, (nowMs - prev.wristTime) / 1000);
    const delta = quatMul(wristQuat, quatConj(prev.wristOrient));
    const w = Math.min(1, Math.abs(delta[3]));
    const angle = 2 * Math.acos(w);
    const sinHalf = Math.sqrt(Math.max(0, 1 - w * w));
    const s = delta[3] < 0 ? -1 : 1;
    const ax = sinHalf > 1e-6 ? (delta[0] * s) / sinHalf : 0;
    const ay = sinHalf > 1e-6 ? (delta[1] * s) / sinHalf : 0;
    const az = sinHalf > 1e-6 ? (delta[2] * s) / sinHalf : 0;
    const flickSpeed = angle / dtSec;
    const armed = flickSpeed > FLICK_SPEED_RAD_S;
    if (armed && prev.flickArmed && (nowMs - prev.lastFlickAt) > FLICK_REFRACTORY_MS) {
      const absX = Math.abs(ax);
      const absY = Math.abs(ay);
      const absZ = Math.abs(az);
      const axis: 'roll' | 'pitch' | 'yaw' =
        absX >= absY && absX >= absZ ? 'pitch' :
        absY >= absZ ? 'yaw' : 'roll';
      const comp = axis === 'pitch' ? ax : axis === 'yaw' ? ay : az;
      const sign: 1 | -1 = comp >= 0 ? 1 : -1;
      gestures.push({ kind: 'wrist-flick', hand, axis, sign });
      lastFlickAt = nowMs;
    }
    flickArmed = armed;
  }

  const next: HandRecognizerState = {
    prevPinch: isActive,
    ringActive,
    palmUp,
    wristOrient: wristQuat ? [...wristQuat] : null,
    wristTime: nowMs,
    flickArmed,
    lastFlickAt,
  };
  return { gestures, next };
}

// Recognize one frame's gestures from both hands' substrate + carried state.
// Pure: never mutates `state`, returns the next state. Gesture order is left-hand
// edges, then right-hand edges, then the two-hand edge — the order the app's
// interaction FSM relies on (two-hand promotion sees both hands already pending).
export function recognizeGestures(
  hands: Record<Hand, HandInputFrame>,
  state: RecognizerState,
  nowMs: number,
): { gestures: XrGesture[]; state: RecognizerState } {
  const left = recognizeHand('left', hands.left, state.left, nowMs);
  const right = recognizeHand('right', hands.right, state.right, nowMs);
  const gestures: XrGesture[] = [...left.gestures, ...right.gestures];

  const bothActive = hands.left.pinch.active && hands.right.pinch.active;
  const prevBoth = state.left.prevPinch && state.right.prevPinch;
  if (bothActive && !prevBoth) gestures.push({ kind: 'two-hand-pinch-start' });
  else if (!bothActive && prevBoth) gestures.push({ kind: 'two-hand-pinch-end' });

  return { gestures, state: { left: left.next, right: right.next } };
}

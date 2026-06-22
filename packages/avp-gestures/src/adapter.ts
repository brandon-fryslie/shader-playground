// The impure boundary: the ONE part of avp-gestures that reads WebXR.
// [LAW:effects-at-boundaries] It turns the raw XRFrame + select events into the
// plain HandInputFrame substrate the pure recognizer and the menu consume. No
// WebXR object ever escapes into the substrate — only number arrays and flags.
//
// It is stateful by necessity: a pinch is not derivable from a single frame. AVP
// reports a pinch as select{start,end} events; the adapter assigns each pinching
// source to a hand, freezes the gaze ray at pinch-start, and tracks the live hand
// pose across frames. [LAW:no-ambient-temporal-coupling] the gaze ray is captured
// exactly once at pinch-start and never re-read. Tracking loss surfaces as `null`
// fields, never a substituted default pose. [LAW:no-silent-failure]
//
// The clock is NOT read here: `nowMs` is passed in by the caller (the one clock
// owner), so even this boundary stays deterministic given its inputs.

// This module is the one that reads the WebXR globals; pull their ambient
// declarations into any program that compiles it (a consumer's build does not
// include this package's include path). [LAW:locality-or-seam]
/// <reference path="./webxr.d.ts" />

import type { GripState, Hand, HandInputFrame, InputSubstrate, JointSample, Pose, Ray } from './types';
import { cross3, dot3, normalize3, sub3 } from './vec3';

const HANDS: Hand[] = ['left', 'right'];

// The full tracked-hand joint set, keyed by the WebXR joint vocabulary. Internal
// to the adapter: palmNormal, grip, and the advisory ray are derived from it and
// exposed as their own fields, so this never reaches the public substrate.
type FullJoints = Record<XRHandJoint, JointSample | null>;

// Fingertip-to-thumb distance under which a finger counts as touching the thumb.
const GRIP_THRESHOLD_M = 0.03;
const GRIP_THRESHOLD_SQ = GRIP_THRESHOLD_M * GRIP_THRESHOLD_M;

const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
] as const satisfies readonly XRHandJoint[];

function makeIdleFrame(): HandInputFrame {
  return {
    pinch: { active: false, startTime: 0, origin: [0, 0, 0], current: [0, 0, 0] },
    gazeRay: null,
    currentRay: null,
    ray: null,
    joints: null,
    palmNormal: null,
    grip: null,
  };
}

export interface AvpInputAdapter {
  // AVP signals a pinch via select{start,end}; feed both through.
  selectStart(source: XRInputSource): void;
  selectEnd(source: XRInputSource): void;
  // Derive this frame's substrate. `nowMs` stamps pinch-start time.
  frame(xrFrame: XRFrame, refSpace: XRReferenceSpace, nowMs: number): InputSubstrate;
  reset(): void;
}

export function createAvpInputAdapter(): AvpInputAdapter {
  const frames: Record<Hand, HandInputFrame> = { left: makeIdleFrame(), right: makeIdleFrame() };
  const sources: Record<Hand, XRInputSource | null> = { left: null, right: null };
  const pending: XRInputSource[] = [];

  function targetRayDir(transform: XRRigidTransform): number[] {
    const m = transform.matrix;
    return normalize3([-m[8], -m[9], -m[10]]);
  }

  function inputRay(xrFrame: XRFrame, source: XRInputSource, refSpace: XRReferenceSpace): Ray | null {
    const pose = xrFrame.getPose(source.targetRaySpace, refSpace);
    if (!pose) return null;
    const p = pose.transform.position;
    return { origin: [p.x, p.y, p.z], dir: targetRayDir(pose.transform) };
  }

  function handPosition(xrFrame: XRFrame, source: XRInputSource, refSpace: XRReferenceSpace): number[] | null {
    const pose = xrFrame.getPose(source.gripSpace || source.targetRaySpace, refSpace);
    if (!pose) return null;
    const p = pose.transform.position;
    return [p.x, p.y, p.z];
  }

  function assignHand(source: XRInputSource): Hand | null {
    const leftFree = !sources.left;
    const rightFree = !sources.right;
    if (source.handedness === 'left' && leftFree) return 'left';
    if (source.handedness === 'right' && rightFree) return 'right';
    if (leftFree) return 'left';
    if (rightFree) return 'right';
    return null;
  }

  function findHand(source: XRInputSource): Hand | null {
    if (sources.left === source) return 'left';
    if (sources.right === source) return 'right';
    return null;
  }

  function queryJoints(xrFrame: XRFrame, xrHand: XRHand, refSpace: XRReferenceSpace): FullJoints {
    const joints = {} as FullJoints;
    for (const name of JOINT_NAMES) {
      const space = xrHand.get(name);
      const pose = space ? xrFrame.getJointPose(space, refSpace) : null;
      if (!pose) { joints[name] = null; continue; }
      const p = pose.transform.position;
      const o = pose.transform.orientation;
      joints[name] = {
        position: [p.x, p.y, p.z],
        orientation: [o.x, o.y, o.z, o.w],
        radius: pose.radius,
      };
    }
    return joints;
  }

  function palmNormal(joints: FullJoints, hand: Hand): number[] | null {
    const wrist = joints['wrist'];
    const indexMeta = joints['index-finger-metacarpal'];
    const pinkyMeta = joints['pinky-finger-metacarpal'];
    if (!wrist || !indexMeta || !pinkyMeta) return null;
    const toIndex = sub3(indexMeta.position, wrist.position);
    const toPinky = sub3(pinkyMeta.position, wrist.position);
    const raw = hand === 'right' ? cross3(toPinky, toIndex) : cross3(toIndex, toPinky);
    const lenSq = raw[0]*raw[0] + raw[1]*raw[1] + raw[2]*raw[2];
    if (lenSq < 1e-12) return null;
    return normalize3(raw);
  }

  function gripState(joints: FullJoints): GripState | null {
    const thumb = joints['thumb-tip'];
    if (!thumb) return null;
    const flag = (tip: JointSample | null): boolean | null => {
      if (!tip) return null;
      const d = sub3(tip.position, thumb.position);
      return dot3(d, d) <= GRIP_THRESHOLD_SQ;
    };
    return {
      thumbIndex: flag(joints['index-finger-tip']),
      thumbMiddle: flag(joints['middle-finger-tip']),
      thumbRing: flag(joints['ring-finger-tip']),
      thumbPinky: flag(joints['pinky-finger-tip']),
    };
  }

  function advisoryRay(joints: FullJoints): Ray | null {
    const wrist = joints['wrist'];
    const knuckle = joints['index-finger-metacarpal'];
    if (!wrist || !knuckle) return null;
    const dir = normalize3(sub3(knuckle.position, wrist.position));
    if (dir[0] === 0 && dir[1] === 0 && dir[2] === 0) return null;
    return { origin: [...knuckle.position], dir };
  }

  function headPose(xrFrame: XRFrame, refSpace: XRReferenceSpace): Pose | null {
    const pose = xrFrame.getViewerPose(refSpace);
    if (!pose) return null;
    const t = pose.transform;
    return {
      position: [t.position.x, t.position.y, t.position.z],
      orientation: [t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w],
    };
  }

  return {
    selectStart(source) {
      pending.push(source);
    },
    selectEnd(source) {
      const hand = findHand(source);
      if (hand) {
        // End the pinch and free the hand for reassignment. gazeRay/currentRay
        // are not read for an idle hand (the menu reads them only while pinching),
        // so clearing here owns the whole pinch lifecycle in one place.
        const hf = frames[hand];
        hf.pinch.active = false;
        hf.gazeRay = null;
        hf.currentRay = null;
        sources[hand] = null;
      }
      const pendingIdx = pending.indexOf(source);
      if (pendingIdx >= 0) pending.splice(pendingIdx, 1);
    },
    frame(xrFrame, refSpace, nowMs) {
      // Activate any pending pinch whose ray resolves this frame: assign it a
      // hand and FREEZE the gaze ray. [LAW:no-ambient-temporal-coupling]
      for (let i = pending.length - 1; i >= 0; i--) {
        const source = pending[i];
        const ray = inputRay(xrFrame, source, refSpace);
        if (!ray) continue;
        pending.splice(i, 1);
        const hand = assignHand(source);
        if (!hand) continue;
        const pos = handPosition(xrFrame, source, refSpace) ?? ray.origin;
        const hf = frames[hand];
        sources[hand] = source;
        hf.pinch.active = true;
        hf.pinch.startTime = nowMs;
        hf.pinch.origin = pos;
        hf.pinch.current = pos;
        hf.gazeRay = { origin: [...ray.origin], dir: [...ray.dir] };
        hf.currentRay = ray;
      }

      // Track the live hand-steered ray + hand position for each active pinch.
      for (const hand of HANDS) {
        const hf = frames[hand];
        const src = sources[hand];
        if (!hf.pinch.active || !src) continue;
        const ray = inputRay(xrFrame, src, refSpace);
        if (ray) hf.currentRay = ray;
        const pos = handPosition(xrFrame, src, refSpace);
        if (pos) hf.pinch.current = pos;
      }

      // Joint/palm/grip/advisory-ray are cleared and repopulated every frame so
      // stale tracked-hand data cannot persist. [LAW:one-source-of-truth]
      for (const hand of HANDS) {
        const hf = frames[hand];
        hf.joints = null;
        hf.palmNormal = null;
        hf.grip = null;
        hf.ray = null;
      }
      for (const source of xrFrame.session.inputSources) {
        if (source.handedness === 'none' || !source.hand) continue;
        const hand: Hand = source.handedness;
        const hf = frames[hand];
        const joints = queryJoints(xrFrame, source.hand, refSpace);
        // Surface only the wrist; palmNormal/grip/advisory-ray below carry what
        // the rest of the joints inform. [LAW:decomposition]
        hf.joints = { wrist: joints['wrist'] };
        hf.palmNormal = palmNormal(joints, hand);
        hf.grip = gripState(joints);
        hf.ray = advisoryRay(joints);
      }

      return { hands: frames, headPose: headPose(xrFrame, refSpace) };
    },
    reset() {
      pending.length = 0;
      frames.left = makeIdleFrame();
      frames.right = makeIdleFrame();
      sources.left = null;
      sources.right = null;
    },
  };
}

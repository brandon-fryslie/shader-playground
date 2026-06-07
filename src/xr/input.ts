import type { AppState } from '../types';
import { cross3, dot3, normalize3, sub3 } from '../math/vec3';
import type { BindingRegistry } from '../xr-ui/bindings';
import {
  xrUiStep,
  applySideEffects as xrUiApplyEffects,
  makeIdlePrev as xrUiMakeIdlePrev,
  uiHandClaimed,
  type XrUiPrev,
  type XrUiRegistry,
  type RenderCommand as XrRenderCommand,
} from '../xr-ui/step';

export type XrHand = 'left' | 'right';
interface XrRay { origin: number[]; dir: number[] }

interface XrHandFrame {
  hand: XrHand;
  tracked: boolean;
  source: XRInputSource | null;
  pinch: {
    active: boolean;
    startTime: number;
    origin: number[];
    current: number[];
  };
  gazeRay: XrRay | null;
  currentRay: XrRay | null;
  ray: XrRay | null;
  palmNormal: number[] | null;
  joints: XrJoints | null;
  grip: XrGripState | null;
}

const XR_JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
] as const satisfies readonly XRHandJoint[];
type XrJointName = typeof XR_JOINT_NAMES[number];

interface XrJointPose {
  position: number[];
  orientation: number[];
  radius: number;
}

// [LAW:dataflow-not-control-flow] Null joints are data describing tracking
// loss; the pipeline still runs every frame and consumes the same shape.
type XrJoints = Record<XrJointName, XrJointPose | null>;

interface XrGripState {
  thumbIndex: boolean | null;
  thumbMiddle: boolean | null;
  thumbRing: boolean | null;
  thumbPinky: boolean | null;
}

function makeIdleHandFrame(hand: XrHand): XrHandFrame {
  return {
    hand,
    tracked: false,
    source: null,
    pinch: { active: false, startTime: 0, origin: [0, 0, 0], current: [0, 0, 0] },
    gazeRay: null,
    currentRay: null,
    ray: null,
    palmNormal: null,
    joints: null,
    grip: null,
  };
}

type XrGesture =
  | { kind: 'pinch-start'; hand: XrHand; gazeRay: XrRay }
  | { kind: 'pinch-hold'; hand: XrHand; dur: number }
  | { kind: 'pinch-end'; hand: XrHand; dur: number }
  | { kind: 'two-hand-pinch-start' }
  | { kind: 'two-hand-pinch-end' }
  | { kind: 'fine-modifier-on'; hand: XrHand }
  | { kind: 'fine-modifier-off'; hand: XrHand }
  | { kind: 'palm-up'; hand: XrHand }
  | { kind: 'palm-down'; hand: XrHand }
  | { kind: 'wrist-flick'; hand: XrHand; axis: 'roll' | 'pitch' | 'yaw'; sign: 1 | -1 };

type XrInteraction =
  | { kind: 'idle' }
  | { kind: 'pending'; deadline: number }
  | { kind: 'dragging'; handOrigin: number[]; hasSample: boolean }
  | { kind: 'two-hand-scale' };

interface XrGestureSnapshot {
  fineModifier: boolean;
  palmUp: boolean;
  wristOrient: number[] | null;
  wristTime: number;
  flickArmed: boolean;
  lastFlickAt: number;
}

function makeGestureSnapshot(): XrGestureSnapshot {
  return { fineModifier: false, palmUp: false, wristOrient: null, wristTime: 0, flickArmed: false, lastFlickAt: 0 };
}

export interface MetricChannel<T> {
  readonly name: string;
  readonly subscribers: Set<(payload: T) => void>;
}

export interface MetricsApi {
  channel<T>(name: string): MetricChannel<T>;
  emit<T>(chan: MetricChannel<T>, payload: T): void;
  subscribe<T>(chan: MetricChannel<T>, fn: (payload: T) => void): () => void;
}

export interface XrGestureEvent { hand: XrHand | null; gesture: XrGesture }
export interface XrStateEvent { hand: XrHand; from: XrInteraction['kind']; to: XrInteraction['kind'] }
export interface XrSnapEvent {
  hand: XrHand;
  handTracked: boolean;
  pinching: boolean;
  palmDot: number | null;
  palmUp: boolean;
  fineModifier: boolean;
  flickSpeed: number;
  grip: XrGripState | null;
}

export interface XrInputSystem {
  clearReferenceSpace(): void;
  getClaimed(): Record<XrHand, boolean>;
  getHandFrames(): Record<XrHand, XrHandFrame>;
  getPrev(): XrUiPrev;
  getRefSpace(): XRReferenceSpace | null;
  getRenderList(): XrRenderCommand[];
  getUiRegistry(): XrUiRegistry;
  initializeReferenceSpace(refSpace: XRReferenceSpace, gotFloor: boolean): void;
  inputStep(frame: XRFrame): void;
  onSelectEnd(source: XRInputSource): void;
  queuePendingSource(source: XRInputSource): void;
  reset(): void;
  setDebugLogging(on: boolean): void;
}

interface XrInputSystemDeps {
  bindings: BindingRegistry;
  closestPointOnRayToOrigin(origin: number[], dir: number[]): number[];
  createAttractor(pointerId: number, pos: number[]): void;
  intersectRayWithPlane(origin: number[], dir: number[], planeY: number): number[] | null;
  metrics: MetricsApi;
  moveAttractor(pointerId: number, pos: number[]): void;
  releaseAttractor(pointerId: number): void;
  setSimulationInteractionInactive(): void;
  state: AppState;
  worldToFluidUV(worldPoint: number[]): number[] | null;
}

const XR_PALM_UP_ENTER = 0.7;
const XR_PALM_UP_EXIT = 0.4;
const XR_FLICK_SPEED_RAD_S = 4.0;
const XR_FLICK_REFRACTORY_MS = 300;
const XR_LOG_SNAP_INTERVAL_MS = 200;
const XR_GRIP_THRESHOLD_M = 0.03;
const XR_GRIP_THRESHOLD_SQ = XR_GRIP_THRESHOLD_M * XR_GRIP_THRESHOLD_M;
const XR_SIMUL_WINDOW_MS = 150;
const XR_ATTRACTOR_POINTER_ID: Record<XrHand, number> = { left: -1, right: -2 };

function quatConj(q: number[]): number[] { return [-q[0], -q[1], -q[2], q[3]]; }
function quatMul(a: number[], b: number[]): number[] {
  return [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
  ];
}

export function createXrInputSystem(deps: XrInputSystemDeps): XrInputSystem {
  let xrRefSpace: XRReferenceSpace | null = null;
  let xrBaseRefSpace: XRReferenceSpace | null = null;
  const xrHandFrames: Record<XrHand, XrHandFrame> = {
    left: makeIdleHandFrame('left'),
    right: makeIdleHandFrame('right'),
  };
  const xrInteractions: Record<XrHand, XrInteraction> = {
    left: { kind: 'idle' },
    right: { kind: 'idle' },
  };
  const xrPendingSources: XRInputSource[] = [];
  const xrTuning = { gainMultiplier: 1.0 };
  const xrUiRegistry: XrUiRegistry = {
    bindings: deps.bindings,
    layouts: new Map(),
    activeLayoutId: null,
  };
  let xrUiPrev: XrUiPrev = xrUiMakeIdlePrev();
  let xrUiRenderList: XrRenderCommand[] = [];
  const xrUiClaimed: Record<XrHand, boolean> = { left: false, right: false };
  const xrViewOffset = { x: 0, y: 0, z: -5 };
  let xrViewOffsetY = 0;
  const twoHandState = {
    startDistance: 0,
    startOffset: { x: 0, y: 0, z: 0 },
  };
  const xrPrevPinch: Record<XrHand, boolean> = { left: false, right: false };
  const xrPrevGestureSnap: Record<XrHand, XrGestureSnapshot> = {
    left: makeGestureSnapshot(),
    right: makeGestureSnapshot(),
  };

  const chanXrGesture = deps.metrics.channel<XrGestureEvent>('xr.gesture');
  const chanXrState = deps.metrics.channel<XrStateEvent>('xr.state');
  const chanXrSnap = deps.metrics.channel<XrSnapEvent>('xr.snap');
  const xrLogState = {
    unsubs: [] as Array<() => void>,
    lastSnapMs: { left: 0, right: 0 } as Record<XrHand, number>,
  };

  function setDebugLogging(on: boolean): void {
    for (const unsub of xrLogState.unsubs) unsub();
    xrLogState.unsubs.length = 0;
    xrLogState.lastSnapMs.left = 0;
    xrLogState.lastSnapMs.right = 0;
    if (!on) return;
    xrLogState.unsubs.push(deps.metrics.subscribe(chanXrGesture, (payload) => {
      if (payload.gesture.kind === 'pinch-hold') return;
      const hand = payload.hand ? `(${payload.hand})` : '';
      // eslint-disable-next-line no-console
      console.log(`[xr] gesture:${payload.gesture.kind}${hand}`, payload.gesture);
    }));
    xrLogState.unsubs.push(deps.metrics.subscribe(chanXrState, (payload) => {
      // eslint-disable-next-line no-console
      console.log(`[xr] state:${payload.hand} ${payload.from}→${payload.to}`);
    }));
    xrLogState.unsubs.push(deps.metrics.subscribe(chanXrSnap, (payload) => {
      const now = performance.now();
      if (now - xrLogState.lastSnapMs[payload.hand] < XR_LOG_SNAP_INTERVAL_MS) return;
      xrLogState.lastSnapMs[payload.hand] = now;
      const palm = payload.palmDot !== null ? payload.palmDot.toFixed(2) : '—';
      // eslint-disable-next-line no-console
      console.log(`[xr] snap:${payload.hand} tracked=${payload.handTracked} pinch=${payload.pinching} palm=${palm} palmUp=${payload.palmUp} fine=${payload.fineModifier} flick=${payload.flickSpeed.toFixed(2)}`);
    }));
  }

  function xrSetInteraction(hand: XrHand, next: XrInteraction): void {
    const prev = xrInteractions[hand];
    xrInteractions[hand] = next;
    if (chanXrState.subscribers.size > 0 && prev.kind !== next.kind) {
      deps.metrics.emit(chanXrState, { hand, from: prev.kind, to: next.kind });
    }
  }

  function getXRTargetRayDirection(transform: XRRigidTransform): number[] {
    const m = transform.matrix;
    return normalize3([-m[8], -m[9], -m[10]]);
  }

  function getXrInputRay(frame: XRFrame, source: XRInputSource): XrRay | null {
    if (!xrRefSpace) return null;
    const pose = frame.getPose(source.targetRaySpace, xrRefSpace);
    if (!pose) return null;
    const p = pose.transform.position;
    return { origin: [p.x, p.y, p.z], dir: getXRTargetRayDirection(pose.transform) };
  }

  function getXrHandPosition(frame: XRFrame, source: XRInputSource): number[] | null {
    if (!xrRefSpace) return null;
    const pose = frame.getPose(source.gripSpace || source.targetRaySpace, xrRefSpace);
    if (!pose) return null;
    const p = pose.transform.position;
    return [p.x, p.y, p.z];
  }

  function assignHandToSource(source: XRInputSource): XrHand | null {
    const leftFree = !xrHandFrames.left.source;
    const rightFree = !xrHandFrames.right.source;
    if (source.handedness === 'left' && leftFree) return 'left';
    if (source.handedness === 'right' && rightFree) return 'right';
    if (leftFree) return 'left';
    if (rightFree) return 'right';
    return null;
  }

  function findHandForSource(source: XRInputSource): XrHand | null {
    if (xrHandFrames.left.source === source) return 'left';
    if (xrHandFrames.right.source === source) return 'right';
    return null;
  }

  function queryHandJoints(frame: XRFrame, xrHand: XRHand, refSpace: XRReferenceSpace): XrJoints {
    const joints = {} as XrJoints;
    for (const name of XR_JOINT_NAMES) {
      const space = xrHand.get(name);
      const pose = space ? frame.getJointPose(space, refSpace) : null;
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

  function computePalmNormal(joints: XrJoints, hand: XrHand): number[] | null {
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

  function computeGripState(joints: XrJoints): XrGripState | null {
    const thumb = joints['thumb-tip'];
    if (!thumb) return null;
    const flag = (tip: XrJointPose | null): boolean | null => {
      if (!tip) return null;
      const d = sub3(tip.position, thumb.position);
      return dot3(d, d) <= XR_GRIP_THRESHOLD_SQ;
    };
    return {
      thumbIndex: flag(joints['index-finger-tip']),
      thumbMiddle: flag(joints['middle-finger-tip']),
      thumbRing: flag(joints['ring-finger-tip']),
      thumbPinky: flag(joints['pinky-finger-tip']),
    };
  }

  function computeAdvisoryRay(joints: XrJoints): XrRay | null {
    const wrist = joints['wrist'];
    const knuckle = joints['index-finger-metacarpal'];
    if (!wrist || !knuckle) return null;
    const dir = normalize3(sub3(knuckle.position, wrist.position));
    if (dir[0] === 0 && dir[1] === 0 && dir[2] === 0) return null;
    return { origin: [...knuckle.position], dir };
  }

  function applyXrViewOffset(): void {
    if (!xrBaseRefSpace) return;
    type XRRigidTransformCtor = new (position: DOMPointInit, orientation?: DOMPointInit) => XRRigidTransform;
    const RigidTransform = (globalThis as unknown as { XRRigidTransform: XRRigidTransformCtor }).XRRigidTransform;
    xrRefSpace = xrBaseRefSpace.getOffsetReferenceSpace(
      new RigidTransform({ x: xrViewOffset.x, y: xrViewOffset.y + xrViewOffsetY, z: xrViewOffset.z }),
    );
  }

  function xrUpdateHandFrames(frame: XRFrame): void {
    for (let i = xrPendingSources.length - 1; i >= 0; i--) {
      const source = xrPendingSources[i];
      const ray = getXrInputRay(frame, source);
      if (!ray) continue;
      xrPendingSources.splice(i, 1);
      const hand = assignHandToSource(source);
      if (!hand) continue;
      const pos = getXrHandPosition(frame, source) ?? ray.origin;
      const hf = xrHandFrames[hand];
      hf.tracked = true;
      hf.source = source;
      hf.pinch.active = true;
      hf.pinch.startTime = performance.now();
      hf.pinch.origin = pos;
      hf.pinch.current = pos;
      hf.gazeRay = { origin: [...ray.origin], dir: [...ray.dir] };
      hf.currentRay = ray;
    }

    for (const hand of ['left', 'right'] as XrHand[]) {
      const hf = xrHandFrames[hand];
      if (!hf.pinch.active || !hf.source) continue;
      const ray = getXrInputRay(frame, hf.source);
      if (ray) hf.currentRay = ray;
      const pos = getXrHandPosition(frame, hf.source);
      if (pos) hf.pinch.current = pos;
    }

    // [LAW:one-source-of-truth] Joint, palm, grip, and advisory-ray state are
    // cleared and repopulated here every frame so stale tracked-hand data cannot persist.
    for (const hand of ['left', 'right'] as XrHand[]) {
      const hf = xrHandFrames[hand];
      hf.joints = null;
      hf.palmNormal = null;
      hf.grip = null;
      hf.ray = null;
    }
    if (!xrRefSpace) return;
    for (const source of frame.session.inputSources) {
      if (source.handedness === 'none' || !source.hand) continue;
      const hand: XrHand = source.handedness;
      const hf = xrHandFrames[hand];
      const joints = queryHandJoints(frame, source.hand, xrRefSpace);
      hf.joints = joints;
      hf.palmNormal = computePalmNormal(joints, hand);
      hf.grip = computeGripState(joints);
      hf.ray = computeAdvisoryRay(joints);
    }
  }

  function xrDetectGestures(): XrGesture[] {
    const gestures: XrGesture[] = [];
    const leftActive = xrHandFrames.left.pinch.active;
    const rightActive = xrHandFrames.right.pinch.active;
    const bothActive = leftActive && rightActive;
    const prevBoth = xrPrevPinch.left && xrPrevPinch.right;
    const now = performance.now();

    for (const hand of ['left', 'right'] as XrHand[]) {
      const hf = xrHandFrames[hand];
      const wasActive = xrPrevPinch[hand];
      const isActive = hf.pinch.active;

      if (isActive && !wasActive && hf.gazeRay) {
        gestures.push({ kind: 'pinch-start', hand, gazeRay: hf.gazeRay });
      } else if (isActive && wasActive) {
        gestures.push({ kind: 'pinch-hold', hand, dur: now - hf.pinch.startTime });
      } else if (!isActive && wasActive) {
        gestures.push({ kind: 'pinch-end', hand, dur: now - hf.pinch.startTime });
      }

      const prev = xrPrevGestureSnap[hand];
      if (hf.grip) {
        const active = hf.grip.thumbRing === true;
        if (active && !prev.fineModifier) gestures.push({ kind: 'fine-modifier-on', hand });
        else if (!active && prev.fineModifier) gestures.push({ kind: 'fine-modifier-off', hand });
        prev.fineModifier = active;
      }

      if (hf.palmNormal) {
        const upDot = hf.palmNormal[1];
        const isUp = prev.palmUp ? (upDot > XR_PALM_UP_EXIT) : (upDot > XR_PALM_UP_ENTER);
        if (isUp && !prev.palmUp) gestures.push({ kind: 'palm-up', hand });
        else if (!isUp && prev.palmUp) gestures.push({ kind: 'palm-down', hand });
        prev.palmUp = isUp;
      }

      const wristQuat = hf.joints?.['wrist']?.orientation ?? null;
      let flickSpeed = 0;
      if (wristQuat && prev.wristOrient && !hf.pinch.active) {
        const dtSec = Math.max(0.001, (now - prev.wristTime) / 1000);
        const delta = quatMul(wristQuat, quatConj(prev.wristOrient));
        const w = Math.min(1, Math.abs(delta[3]));
        const angle = 2 * Math.acos(w);
        const sinHalf = Math.sqrt(Math.max(0, 1 - w * w));
        const s = delta[3] < 0 ? -1 : 1;
        const ax = sinHalf > 1e-6 ? (delta[0] * s) / sinHalf : 0;
        const ay = sinHalf > 1e-6 ? (delta[1] * s) / sinHalf : 0;
        const az = sinHalf > 1e-6 ? (delta[2] * s) / sinHalf : 0;
        flickSpeed = angle / dtSec;
        const armed = flickSpeed > XR_FLICK_SPEED_RAD_S;
        if (armed && prev.flickArmed && (now - prev.lastFlickAt) > XR_FLICK_REFRACTORY_MS) {
          const absX = Math.abs(ax);
          const absY = Math.abs(ay);
          const absZ = Math.abs(az);
          const axis: 'roll' | 'pitch' | 'yaw' =
            absX >= absY && absX >= absZ ? 'pitch' :
            absY >= absZ ? 'yaw' : 'roll';
          const comp = axis === 'pitch' ? ax : axis === 'yaw' ? ay : az;
          const sign: 1 | -1 = comp >= 0 ? 1 : -1;
          gestures.push({ kind: 'wrist-flick', hand, axis, sign });
          prev.lastFlickAt = now;
        }
        prev.flickArmed = armed;
      } else {
        prev.flickArmed = false;
      }
      prev.wristOrient = wristQuat ? [...wristQuat] : null;
      prev.wristTime = now;

      if (chanXrSnap.subscribers.size > 0) {
        deps.metrics.emit(chanXrSnap, {
          hand,
          handTracked: hf.joints !== null,
          pinching: hf.pinch.active,
          palmDot: hf.palmNormal ? hf.palmNormal[1] : null,
          palmUp: prev.palmUp,
          fineModifier: prev.fineModifier,
          flickSpeed,
          grip: hf.grip,
        });
      }
    }

    if (bothActive && !prevBoth) gestures.push({ kind: 'two-hand-pinch-start' });
    else if (!bothActive && prevBoth) gestures.push({ kind: 'two-hand-pinch-end' });

    xrPrevPinch.left = leftActive;
    xrPrevPinch.right = rightActive;

    if (chanXrGesture.subscribers.size > 0) {
      for (const gesture of gestures) {
        deps.metrics.emit(chanXrGesture, { hand: 'hand' in gesture ? gesture.hand : null, gesture });
      }
    }
    return gestures;
  }

  function xrEndInteraction(hand: XrHand): void {
    const ix = xrInteractions[hand];
    switch (ix.kind) {
      case 'dragging':
        deps.setSimulationInteractionInactive();
        deps.releaseAttractor(XR_ATTRACTOR_POINTER_ID[hand]);
        break;
      case 'pending':
      case 'two-hand-scale':
      case 'idle':
        break;
    }
    xrSetInteraction(hand, { kind: 'idle' });
    const hf = xrHandFrames[hand];
    if (!hf.pinch.active) {
      hf.source = null;
      hf.gazeRay = null;
      hf.currentRay = null;
    }
  }

  function xrTransitionInteractions(gestures: XrGesture[]): void {
    for (const gesture of gestures) {
      switch (gesture.kind) {
        case 'pinch-start':
          xrSetInteraction(gesture.hand, { kind: 'pending', deadline: performance.now() + XR_SIMUL_WINDOW_MS });
          break;
        case 'two-hand-pinch-start':
          if (xrInteractions.left.kind === 'pending' && xrInteractions.right.kind === 'pending') {
            const d = sub3(xrHandFrames.left.pinch.current, xrHandFrames.right.pinch.current);
            twoHandState.startDistance = Math.max(0.01, Math.sqrt(dot3(d, d)));
            twoHandState.startOffset = { ...xrViewOffset };
            xrSetInteraction('left', { kind: 'two-hand-scale' });
            xrSetInteraction('right', { kind: 'two-hand-scale' });
          }
          break;
        case 'two-hand-pinch-end':
          if (xrInteractions.left.kind === 'two-hand-scale') xrSetInteraction('left', { kind: 'idle' });
          if (xrInteractions.right.kind === 'two-hand-scale') xrSetInteraction('right', { kind: 'idle' });
          break;
        case 'pinch-end':
          xrEndInteraction(gesture.hand);
          break;
        case 'pinch-hold':
          break;
        case 'fine-modifier-on':
          xrTuning.gainMultiplier = 0.1;
          break;
        case 'fine-modifier-off':
          xrTuning.gainMultiplier = 1.0;
          break;
        case 'palm-up':
        case 'palm-down':
        case 'wrist-flick':
          break;
      }
    }

    const now = performance.now();
    for (const hand of ['left', 'right'] as XrHand[]) {
      const ix = xrInteractions[hand];
      if (ix.kind === 'pending' && now >= ix.deadline) {
        // [LAW:single-enforcer] XR-UI claim is evaluated here once; the sim drag
        // promotion does not duplicate claim checks elsewhere in the pipeline.
        if (xrUiClaimed[hand]) {
          xrSetInteraction(hand, { kind: 'idle' });
        } else {
          xrSetInteraction(hand, { kind: 'dragging', handOrigin: [...xrHandFrames[hand].pinch.origin], hasSample: false });
        }
      }
    }
  }

  function xrApplyInteractions(): void {
    if (xrInteractions.left.kind === 'two-hand-scale' && xrInteractions.right.kind === 'two-hand-scale') {
      const d = sub3(xrHandFrames.left.pinch.current, xrHandFrames.right.pinch.current);
      const dist = Math.sqrt(dot3(d, d));
      if (twoHandState.startDistance >= 0.01) {
        const ratio = dist / twoHandState.startDistance;
        xrViewOffset.z = Math.max(-200, Math.min(-1, twoHandState.startOffset.z / ratio));
        applyXrViewOffset();
      }
      return;
    }

    let anySimDrag = false;
    for (const hand of ['left', 'right'] as XrHand[]) {
      const ix = xrInteractions[hand];
      const hf = xrHandFrames[hand];
      if (ix.kind !== 'dragging' || !hf.source) continue;
      const ray = hf.currentRay;
      if (!ray) continue;
      anySimDrag = true;
      const worldPoint = deps.state.mode === 'fluid'
        ? deps.intersectRayWithPlane(ray.origin, ray.dir, 0)
        : deps.closestPointOnRayToOrigin(ray.origin, ray.dir);
      if (!worldPoint) {
        deps.setSimulationInteractionInactive();
        ix.hasSample = false;
        continue;
      }
      deps.state.mouse.down = true;
      deps.state.mouse.worldX = worldPoint[0];
      deps.state.mouse.worldY = worldPoint[1];
      deps.state.mouse.worldZ = worldPoint[2];
      if (deps.state.mode === 'fluid') {
        const uv = deps.worldToFluidUV(worldPoint);
        if (!uv) {
          deps.setSimulationInteractionInactive();
          ix.hasSample = false;
          continue;
        }
        deps.state.mouse.dx = ix.hasSample ? (uv[0] - deps.state.mouse.x) * 10 : 0;
        deps.state.mouse.dy = ix.hasSample ? (uv[1] - deps.state.mouse.y) * 10 : 0;
        deps.state.mouse.x = uv[0];
        deps.state.mouse.y = uv[1];
      } else {
        deps.state.mouse.dx = 0;
        deps.state.mouse.dy = 0;
        deps.state.mouse.x = worldPoint[0];
        deps.state.mouse.y = worldPoint[1];
      }
      if (deps.state.mode === 'physics') {
        const pid = XR_ATTRACTOR_POINTER_ID[hand];
        if (deps.state.pointerToAttractor.has(pid)) deps.moveAttractor(pid, worldPoint);
        else deps.createAttractor(pid, worldPoint);
      }
      ix.hasSample = true;
    }

    if (!anySimDrag && deps.state.xrEnabled && deps.state.mouse.down) {
      deps.setSimulationInteractionInactive();
    }
  }

  function extractXrHeadPose(frame: XRFrame): { position: [number, number, number]; orientation: [number, number, number, number] } | null {
    if (!xrRefSpace) return null;
    const pose = frame.getViewerPose(xrRefSpace);
    if (!pose) return null;
    const t = pose.transform;
    return {
      position: [t.position.x, t.position.y, t.position.z],
      orientation: [t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w],
    };
  }

  return {
    clearReferenceSpace() {
      xrRefSpace = null;
      xrBaseRefSpace = null;
    },
    getClaimed() {
      return { ...xrUiClaimed };
    },
    getHandFrames() {
      return xrHandFrames;
    },
    getPrev() {
      return xrUiPrev;
    },
    getRefSpace() {
      return xrRefSpace;
    },
    getRenderList() {
      return xrUiRenderList;
    },
    getUiRegistry() {
      return xrUiRegistry;
    },
    initializeReferenceSpace(refSpace, gotFloor) {
      // [LAW:one-source-of-truth] XR reference-space mutation and view-offset
      // state live in this service so session setup and gestures share one owner.
      xrRefSpace = refSpace;
      xrBaseRefSpace = refSpace;
      xrViewOffsetY = gotFloor ? 1.6 : 0;
      xrViewOffset.x = 0;
      xrViewOffset.y = 0;
      xrViewOffset.z = -5;
      applyXrViewOffset();
    },
    inputStep(frame) {
      xrUpdateHandFrames(frame);
      const headPose = extractXrHeadPose(frame);
      const uiResult = xrUiStep(xrUiRegistry, xrHandFrames, xrUiPrev, { hands: xrHandFrames, headPose }, xrTuning, 16);
      xrUiApplyEffects(uiResult.sideEffects, xrUiRegistry);
      xrUiPrev = uiResult.next;
      xrUiRenderList = uiResult.renderList;
      xrUiClaimed.left = uiHandClaimed(uiResult.next.states.left);
      xrUiClaimed.right = uiHandClaimed(uiResult.next.states.right);
      const gestures = xrDetectGestures();
      xrTransitionInteractions(gestures);
      xrApplyInteractions();
    },
    onSelectEnd(source) {
      const hand = findHandForSource(source);
      if (hand) {
        const hf = xrHandFrames[hand];
        hf.pinch.active = false;
        hf.tracked = false;
      }
      const pendingIdx = xrPendingSources.indexOf(source);
      if (pendingIdx >= 0) xrPendingSources.splice(pendingIdx, 1);
    },
    queuePendingSource(source) {
      xrPendingSources.push(source);
    },
    reset() {
      xrPendingSources.length = 0;
      xrHandFrames.left = makeIdleHandFrame('left');
      xrHandFrames.right = makeIdleHandFrame('right');
      xrSetInteraction('left', { kind: 'idle' });
      xrSetInteraction('right', { kind: 'idle' });
      xrPrevPinch.left = false;
      xrPrevPinch.right = false;
      xrPrevGestureSnap.left = makeGestureSnapshot();
      xrPrevGestureSnap.right = makeGestureSnapshot();
      xrTuning.gainMultiplier = 1.0;
      xrUiPrev = xrUiMakeIdlePrev();
      xrUiRenderList = [];
      xrUiClaimed.left = false;
      xrUiClaimed.right = false;
      deps.setSimulationInteractionInactive();
      deps.releaseAttractor(XR_ATTRACTOR_POINTER_ID.left);
      deps.releaseAttractor(XR_ATTRACTOR_POINTER_ID.right);
    },
    setDebugLogging,
  };
}

import type { AppState } from '../types';
import { dot3, sub3 } from '../math/vec3';
import type { Metrics } from '../metrics/bus';
import {
  xrUiStep,
  applySideEffects as xrUiApplyEffects,
  makeIdlePrev as xrUiMakeIdlePrev,
  uiHandClaimed,
  type BindingRegistry,
  type XrUiPrev,
  type XrUiRegistry,
  type RenderCommand as XrRenderCommand,
} from '@shader-playground/xr-ui';
import {
  createAvpInput,
  type AvpInput,
  type Hand,
  type InputContext,
  type InputFrame,
  type XrGesture,
} from '@shader-playground/avp-gestures';

// [LAW:decomposition] Input derivation and gesture RECOGNITION are owned by
// avp-gestures; this module is the app's MAPPING layer. It derives input +
// gestures ONCE per frame from the library [LAW:one-source-of-truth], drives the
// menu with the same input frame, then maps gestures to camera/attractor actions
// and arbitrates against which hands the menu claimed. The WebXR boundary and the
// gesture FSM no longer live here.
export type XrHand = Hand;

const HANDS: XrHand[] = ['left', 'right'];

type XrInteraction =
  | { kind: 'idle' }
  | { kind: 'pending'; deadline: number }
  | { kind: 'dragging'; handOrigin: number[]; hasSample: boolean }
  | { kind: 'two-hand-scale' };

// [LAW:single-enforcer] One knob, declared once. 10× slowdown when a held
// ring-pinch maps to precision mode.
const XR_FINE_MODIFIER_GAIN = 0.1;
const XR_LOG_SNAP_INTERVAL_MS = 200;
const XR_SIMUL_WINDOW_MS = 150;
const XR_ATTRACTOR_POINTER_ID: Record<XrHand, number> = { left: -1, right: -2 };

// Metrics plumbing the app owns: gesture/state/snap channels for the XR recorder
// and debug logging. The gesture vocabulary is avp-gestures'; these wrappers tag
// each event for this app's recorder.
export interface XrGestureEvent { hand: XrHand | null; gesture: XrGesture }
export interface XrStateEvent { hand: XrHand; from: XrInteraction['kind']; to: XrInteraction['kind'] }
export interface XrSnapEvent {
  hand: XrHand;
  handTracked: boolean;
  pinching: boolean;
  palmDot: number | null;
  palmUp: boolean;
  fineModifier: boolean;
}

export interface XrInputSystem {
  clearReferenceSpace(): void;
  getClaimed(): Record<XrHand, boolean>;
  getHandFrames(): Record<XrHand, InputFrame>;
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
  metrics: Metrics;
  moveAttractor(pointerId: number, pos: number[]): void;
  releaseAttractor(pointerId: number): void;
  setSimulationInteractionInactive(): void;
  state: AppState;
  worldToFluidUV(worldPoint: number[]): number[] | null;
}

function makeIdleFrame(): InputFrame {
  return {
    pinch: { active: false, startTime: 0, origin: [0, 0, 0], current: [0, 0, 0] },
    gazeRay: null,
    currentRay: null,
    ray: null,
    joints: null,
    palmNormal: null,
  };
}

export function createXrInputSystem(deps: XrInputSystemDeps): XrInputSystem {
  let xrRefSpace: XRReferenceSpace | null = null;
  let xrBaseRefSpace: XRReferenceSpace | null = null;

  // The shared library does input derivation + gesture recognition; this app maps.
  const avpInput: AvpInput = createAvpInput();

  // Latest per-frame input frames, kept in a STABLE container so the devtools
  // anchor probe (captured once at startup) and the menu read live data.
  const xrHandFrames: Record<XrHand, InputFrame> = { left: makeIdleFrame(), right: makeIdleFrame() };
  let xrHeadPose: InputContext['headPose'] = null;

  const xrInteractions: Record<XrHand, XrInteraction> = {
    left: { kind: 'idle' },
    right: { kind: 'idle' },
  };
  // The app's MAPPING of the ring-pinch pose to precision mode, and of palm
  // orientation for snap telemetry — derived from the recognizer's intent-neutral
  // gestures. [LAW:decomposition] meaning lives here, not in the library.
  const xrFineModifier: Record<XrHand, boolean> = { left: false, right: false };
  const xrPalmUp: Record<XrHand, boolean> = { left: false, right: false };
  const xrTuning = { gainMultiplier: 1.0 };

  const xrUiRegistry: XrUiRegistry = {
    bindings: deps.bindings,
    layouts: new Map(),
    activeLayoutId: null,
    hudLayoutIds: [],
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
      console.log(`[xr] snap:${payload.hand} tracked=${payload.handTracked} pinch=${payload.pinching} palm=${palm} palmUp=${payload.palmUp} fine=${payload.fineModifier}`);
    }));
  }

  function xrSetInteraction(hand: XrHand, next: XrInteraction): void {
    const prev = xrInteractions[hand];
    xrInteractions[hand] = next;
    if (chanXrState.subscribers.size > 0 && prev.kind !== next.kind) {
      deps.metrics.emit(chanXrState, { hand, from: prev.kind, to: next.kind });
    }
  }

  function applyXrViewOffset(): void {
    if (!xrBaseRefSpace) return;
    type XRRigidTransformCtor = new (position: DOMPointInit, orientation?: DOMPointInit) => XRRigidTransform;
    const RigidTransform = (globalThis as unknown as { XRRigidTransform: XRRigidTransformCtor }).XRRigidTransform;
    xrRefSpace = xrBaseRefSpace.getOffsetReferenceSpace(
      new RigidTransform({ x: xrViewOffset.x, y: xrViewOffset.y + xrViewOffsetY, z: xrViewOffset.z }),
    );
  }

  // Map the frame's recognized gestures to app state: precision mode, palm
  // telemetry, and the interaction FSM. [LAW:decomposition] mapping + arbitration
  // are app policy; only the composer knows both the menu and the sim exist.
  function xrMapGestures(gestures: XrGesture[], now: number): void {
    for (const gesture of gestures) {
      switch (gesture.kind) {
        case 'pinch-start':
          xrSetInteraction(gesture.hand, { kind: 'pending', deadline: now + XR_SIMUL_WINDOW_MS });
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
        case 'ring-pinch-on':
          xrFineModifier[gesture.hand] = true;
          break;
        case 'ring-pinch-off':
          xrFineModifier[gesture.hand] = false;
          break;
        case 'palm-up':
          xrPalmUp[gesture.hand] = true;
          break;
        case 'palm-down':
          xrPalmUp[gesture.hand] = false;
          break;
        case 'pinch-hold':
        case 'wrist-flick':
          break;
      }
    }

    // [LAW:dataflow-not-control-flow] gain is derived from the current per-hand
    // precision-mode truth each frame, not mutated by matched event edges — so it
    // is unambiguous even if both hands toggle in quick succession.
    const fineActive = xrFineModifier.left || xrFineModifier.right;
    xrTuning.gainMultiplier = fineActive ? XR_FINE_MODIFIER_GAIN : 1.0;

    for (const hand of HANDS) {
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
    for (const hand of HANDS) {
      const ix = xrInteractions[hand];
      const hf = xrHandFrames[hand];
      if (ix.kind !== 'dragging') continue;
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

  function emitGestureMetrics(gestures: XrGesture[]): void {
    if (chanXrGesture.subscribers.size === 0) return;
    for (const gesture of gestures) {
      deps.metrics.emit(chanXrGesture, { hand: 'hand' in gesture ? gesture.hand : null, gesture });
    }
  }

  function emitSnapMetrics(): void {
    if (chanXrSnap.subscribers.size === 0) return;
    for (const hand of HANDS) {
      const hf = xrHandFrames[hand];
      deps.metrics.emit(chanXrSnap, {
        hand,
        handTracked: hf.joints !== null,
        pinching: hf.pinch.active,
        palmDot: hf.palmNormal ? hf.palmNormal[1] : null,
        palmUp: xrPalmUp[hand],
        fineModifier: xrFineModifier[hand],
      });
    }
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
      const refSpace = xrRefSpace;
      if (!refSpace) return;
      // One clock read per frame, passed into the library and the app FSM, so no
      // part reads the clock ambiently. [LAW:no-ambient-temporal-coupling]
      const now = performance.now();

      // [LAW:one-source-of-truth] input + gestures derived ONCE per frame.
      const { input, gestures } = avpInput.frame(frame, refSpace, now);
      xrHandFrames.left = input.hands.left;
      xrHandFrames.right = input.hands.right;
      xrHeadPose = input.headPose;
      const ctx: InputContext = { hands: xrHandFrames, headPose: xrHeadPose };

      // The menu consumes the same input frame and runs first; it reads the gain
      // from the prior frame's mapping, exactly as before the extraction.
      const uiResult = xrUiStep(xrUiRegistry, xrHandFrames, xrUiPrev, ctx, xrTuning, 16);
      xrUiApplyEffects(uiResult.sideEffects, xrUiRegistry);
      xrUiPrev = uiResult.next;
      xrUiRenderList = uiResult.renderList;
      xrUiClaimed.left = uiHandClaimed(uiResult.next.states.left);
      xrUiClaimed.right = uiHandClaimed(uiResult.next.states.right);

      emitGestureMetrics(gestures);
      xrMapGestures(gestures, now);
      xrApplyInteractions();
      emitSnapMetrics();
    },
    onSelectEnd(source) {
      avpInput.selectEnd(source);
    },
    queuePendingSource(source) {
      avpInput.selectStart(source);
    },
    reset() {
      avpInput.reset();
      xrHandFrames.left = makeIdleFrame();
      xrHandFrames.right = makeIdleFrame();
      xrHeadPose = null;
      xrSetInteraction('left', { kind: 'idle' });
      xrSetInteraction('right', { kind: 'idle' });
      xrFineModifier.left = false;
      xrFineModifier.right = false;
      xrPalmUp.left = false;
      xrPalmUp.right = false;
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

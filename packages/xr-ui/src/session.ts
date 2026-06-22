/// <reference types="@webgpu/types" />
// createXrUiSession — the menu package's PRIMARY entry point.
//
// A consumer constructs ONE session and drives the whole XR menu through it:
// register your bindings, hand it your layouts, and per frame give it the
// input-frame (from avp-gestures) plus the render targets/matrices you already
// compute for your own scene. The session owns everything the consumer should
// never have to sequence by hand: the BindingRegistry, the XrUiPrev interaction
// state, this frame's render list, and the GPU widget renderer (with its camera
// buffer). [LAW:composability] it does the whole UI job, asking only for what is
// genuinely the consumer's — its device, its bindings, its layouts, the
// input-frame, and its render targets.
//
// [LAW:effects-at-boundaries] the session reads NO WebXR. The input-frame is a
// plain InputContext value the consumer derives once per frame; the per-eye
// matrices are plain Float32Arrays. WebXR lives entirely in the consumer + the
// avp-gestures adapter, never here.
//
// TWO PHASES, ONE OWNER. Stereo rendering forces the per-frame work into two
// phases that the consumer's XR rAF loop sequences:
//   frame(input)      — the CPU step: run xrUiStep, apply side effects through
//                       the bindings, compute the per-hand UI claim, and stash
//                       this frame's render list. Returns { claimed } so the
//                       consumer can arbitrate its own gestures against which
//                       hands the menu took. Must run once per frame, before the
//                       consumer maps its gestures.
//   renderEye(target) — draw the stashed render list into one eye's target. Run
//                       once per eye, after frame(), interleaved with the
//                       consumer's own per-eye scene render.
// [LAW:no-ambient-temporal-coupling] the consumer's frame loop is the single
// owner of this order; renderEye draws whatever frame() last produced. With no
// frame() yet (or an empty layout) the render list is empty and renderEye draws
// nothing — absence flows as data, never a guard. [LAW:dataflow-not-control-flow]
//
// The granular pieces (xrUiStep, layout, createXrWidgetRenderer, BindingRegistry,
// applySideEffects) remain exported from the barrel as an advanced escape hatch;
// this façade is the documented happy path. [LAW:no-mode-explosion]

import type { InputContext, Hand } from '@shader-playground/avp-gestures';
import type { Container } from './widgets';
import { BindingRegistry } from './bindings';
import {
  xrUiStep,
  applySideEffects,
  makeIdlePrev,
  uiHandClaimed,
  type XrUiRegistry,
  type XrUiPrev,
  type XrUiTuning,
  type RenderCommand,
} from './step';
import { createXrWidgetRenderer, type XrWidgetRenderer } from './renderer';
import type { XrWidgetTheme } from './camera-uniform';

// The menu's interaction tweens advance against a fixed per-frame dt. The XR
// frame cadence is ~60fps on visionOS; tying tween speed to a measured frame
// delta would couple feel to frame-time jitter. One constant keeps the tween
// rates deterministic and matches the pre-façade call site exactly.
const STEP_DT_MS = 16;

// Construction inputs — the irreducible consumer-owned floor for setup.
export interface XrUiSessionConfig {
  // The consumer's GPU device. The widget renderer (and its camera buffer) is
  // created lazily on the first renderEye so a consumer that never enters XR
  // pays no GPU cost.
  device: GPUDevice;
  // Populate the session-owned BindingRegistry with the consumer's get/set
  // windows onto its own state. Invoked once, here, with the fresh registry.
  // [LAW:one-source-of-truth] one registry, owned by the session, populated by
  // the consumer — never a second copy.
  registerBindings: (registry: BindingRegistry) => void;
  // Optional starting tuning; the package supplies defaults. The live per-frame
  // value (e.g. a precision-mode gain the consumer maps from its own gestures)
  // is supplied to frame() as data, since it is consumer policy, not config.
  tuning?: Partial<XrUiTuning>;
}

// The consumer's UI trees and which one is active / which are passive HUDs.
// Supplied per session-activation (not at construction) so the consumer can
// rebuild fresh trees each time it enters XR. [LAW:decomposition] which layouts
// exist is consumer policy; hosting + driving them is the session's job.
export interface XrUiLayoutConfig {
  layouts: Map<string, Container & { kind: 'panel' }>;
  activeLayoutId: string | null;
  hudLayoutIds: string[];
}

// Everything the session needs to draw one eye — the consumer's encoder, the
// target it is rendering its scene into, that target's format, the eye index,
// and the per-eye view/proj matrices it already derived for its scene camera.
export interface XrUiEyeTarget {
  encoder: GPUCommandEncoder;
  targetView: GPUTextureView;
  targetFormat: GPUTextureFormat;
  viewIndex: number;
  view: Float32Array;
  proj: Float32Array;
  // Theme palette, shared across eyes. The consumer fetches it once per frame
  // and passes the same value for every eye [LAW:one-source-of-truth].
  theme: XrWidgetTheme;
}

export interface XrUiFrameArgs {
  // The per-frame input-frame from avp-gestures. The session reads it; it never
  // reads WebXR. AnchorContext (the menu's name) is a type alias of this.
  input: InputContext;
  // Live tuning for this frame; falls back to the construction/default tuning
  // when omitted.
  tuning?: XrUiTuning;
}

export interface XrUiFrameResult {
  // Per-hand: did the menu claim this hand this frame (pressing/dragging a
  // widget)? The consumer arbitrates its own gestures against this so a pinch
  // that drove a slider does not also drive the scene. [LAW:single-enforcer]
  claimed: Record<Hand, boolean>;
}

export interface XrUiSession {
  // (Re)install the consumer's layouts. Call on each XR activation to rebuild
  // fresh interaction trees; the session-owned bindings persist across calls.
  setLayouts(config: XrUiLayoutConfig): void;
  // CPU step: run the interaction update, apply side effects through the
  // bindings, stash this frame's render list, and return the per-hand claim.
  frame(args: XrUiFrameArgs): XrUiFrameResult;
  // Draw the stashed render list into one eye. Lazily creates the renderer.
  renderEye(target: XrUiEyeTarget): void;
  // Reset interaction state (idle hands, empty render list). Layouts persist;
  // rebuild them via setLayouts if a fresh tree is wanted.
  reset(): void;

  // ── Advanced escape hatch / diagnostics ────────────────────────────────────
  // The granular interaction surface for tooling (e.g. a devtools probe). The
  // happy path never touches these; they exist so an advanced consumer can
  // inspect or drive the pieces directly. [LAW:no-mode-explosion]
  readonly bindings: BindingRegistry;
  readonly registry: XrUiRegistry;
  getPrev(): XrUiPrev;
  getRenderList(): RenderCommand[];
  getClaimed(): Record<Hand, boolean>;
}

export function createXrUiSession(config: XrUiSessionConfig): XrUiSession {
  const bindings = new BindingRegistry();
  config.registerBindings(bindings);

  // [LAW:one-source-of-truth] the registry is the single arbiter of layouts +
  // active/HUD selection + bindings; setLayouts mutates its layout fields in
  // place, bindings are fixed at construction.
  const registry: XrUiRegistry = {
    bindings,
    layouts: new Map(),
    activeLayoutId: null,
    hudLayoutIds: [],
  };

  const tuning: XrUiTuning = { gainMultiplier: config.tuning?.gainMultiplier ?? 1 };

  let prev: XrUiPrev = makeIdlePrev();
  let renderList: RenderCommand[] = [];
  const claimed: Record<Hand, boolean> = { left: false, right: false };

  // Created on first renderEye so a non-XR session allocates no widget GPU
  // resources. [LAW:effects-at-boundaries] the GPU touch is deferred to the
  // render edge, never at construction.
  let renderer: XrWidgetRenderer | null = null;

  return {
    setLayouts(layoutConfig) {
      registry.layouts = layoutConfig.layouts;
      registry.activeLayoutId = layoutConfig.activeLayoutId;
      registry.hudLayoutIds = layoutConfig.hudLayoutIds;
    },

    frame({ input, tuning: frameTuning }) {
      const active = frameTuning ?? tuning;
      const result = xrUiStep(registry, input.hands, prev, input, active, STEP_DT_MS);
      applySideEffects(result.sideEffects, registry);
      prev = result.next;
      renderList = result.renderList;
      claimed.left = uiHandClaimed(result.next.states.left);
      claimed.right = uiHandClaimed(result.next.states.right);
      return { claimed: { left: claimed.left, right: claimed.right } };
    },

    renderEye(target) {
      if (!renderer) renderer = createXrWidgetRenderer(config.device);
      renderer.draw(
        target.encoder,
        target.targetView,
        target.targetFormat,
        target.viewIndex,
        { view: target.view, proj: target.proj },
        target.theme,
        renderList,
      );
    },

    reset() {
      prev = makeIdlePrev();
      renderList = [];
      claimed.left = false;
      claimed.right = false;
    },

    bindings,
    registry,
    getPrev() {
      return prev;
    },
    getRenderList() {
      return renderList;
    },
    getClaimed() {
      return { left: claimed.left, right: claimed.right };
    },
  };
}

// xrUiStep — integration layer for the XR UI rewrite.
//
// Runs ONCE per XR frame, after hand-frames are updated. Produces:
//   - next per-hand interaction state (idle / hovering / pressing / dragging)
//   - a side-effect list (binding-set, binding-invoke, tab-switch) the caller applies
//   - a render command list the renderer (.12) consumes
//
// THREE PIPELINES, NEVER CROSSING:
//   1. SELECTION  reads hf.gazeRay     (frozen at pinch-start)  — pinch-start hit-test
//   2. CANCEL     reads hf.currentRay  (hand-steered)           — slide-off-to-cancel
//   3. HOVER      reads hf.ray         (advisory laser)         — pre-pinch hover
// Every ray-reading site below cites the law and the source ray. If you find
// yourself reading currentRay for selection or gazeRay for hover, STOP — a
// subtle Vision Pro UX bug is one paste away.
//
// [LAW:one-source-of-truth] xrUiStep is the single arbiter of "did the user
// pinch on a widget?". Sim-side input (xrTransitionInteractions in main.ts)
// reads the per-hand claim flag derived from this module's output and skips
// the pending→dragging sim attractor promotion when claimed.
// [LAW:dataflow-not-control-flow] xrUiStep ALWAYS runs every frame. With no
// active layout it returns idle/empty — never short-circuit at the call site.
// [LAW:no-defensive-null-guards] Missing layout / missing anchor are DATA
// (return idle); we never substitute a default UI or swallow the absence.

import type { AnchorContext, Pose } from './anchors';
import type { Container, Widget, Vec2, ContinuousInteraction } from './widgets';
import type { Binding, BindingRegistry } from './bindings';
import { layout, hitTestWidgets } from './layout';

export type Hand = 'left' | 'right';

// Minimal hand-frame contract. main.ts's XrHandFrame satisfies this structurally.
export interface HandFrame {
  pinch: { active: boolean; origin: number[]; current: number[]; startTime: number };
  gazeRay:    { origin: number[]; dir: number[] } | null;
  currentRay: { origin: number[]; dir: number[] } | null;
  ray:        { origin: number[]; dir: number[] } | null;
  joints: { wrist: { position: number[]; orientation: number[] } | null } | null;
  palmNormal: number[] | null;
}

export type InteractionState =
  | { kind: 'idle' }
  | { kind: 'hovering'; widgetId: string }
  | { kind: 'pressing';
      widgetId: string; bindingId: string; startedAt: number;
      cancelPending: boolean }
  | { kind: 'dragging';
      widgetId: string; bindingId: string;
      handOriginPos: number[];        // world-space hand position at pinch-start
      valueAtOrigin: number;          // binding value snapshot at pinch-start
      interaction: ContinuousInteraction;
      cancelPending: boolean };

export type XrUiSideEffect =
  | { kind: 'binding-set';    bindingId: string; value: number | boolean | string }
  | { kind: 'binding-invoke'; bindingId: string }
  | { kind: 'tab-switch';     layoutId: string; tabId: string };

export interface RenderCommand {
  widgetId: string;
  pose: Pose;
  visualHalfExtent: Vec2;
  kind: Widget['kind'];
  state: { hover: boolean; pressed: boolean; dragging: boolean; value?: number };
}

export interface XrUiPrev {
  states:  Record<Hand, InteractionState>;
  pinches: Record<Hand, boolean>;       // last frame's hf.pinch.active per hand
}

export interface XrUiRegistry {
  bindings: BindingRegistry;
  layouts: Map<string, Container & { kind: 'panel' }>;
  activeLayoutId: string | null;
}

export interface XrUiTuning { gainMultiplier: number }

export interface XrUiStepResult {
  next: XrUiPrev;
  sideEffects: XrUiSideEffect[];
  renderList: RenderCommand[];
}

export function makeIdlePrev(): XrUiPrev {
  return {
    states:  { left: { kind: 'idle' }, right: { kind: 'idle' } },
    pinches: { left: false, right: false },
  };
}

const HANDS: Hand[] = ['left', 'right'];

export function xrUiStep(
  registry: XrUiRegistry,
  hands: Record<Hand, HandFrame>,
  prev: XrUiPrev,
  ctx: AnchorContext,
  tuning: XrUiTuning,
  _dtMs: number,
): XrUiStepResult {
  const sideEffects: XrUiSideEffect[] = [];
  const renderList: RenderCommand[] = [];
  const next: XrUiPrev = {
    states:  { left: prev.states.left,  right: prev.states.right  },
    pinches: { left: hands.left.pinch.active, right: hands.right.pinch.active },
  };

  const root = registry.activeLayoutId != null ? registry.layouts.get(registry.activeLayoutId) : undefined;
  if (!root) {
    next.states.left = { kind: 'idle' }; next.states.right = { kind: 'idle' };
    return { next, sideEffects, renderList };
  }
  const laid = layout(root, ctx);
  if (!laid) {
    next.states.left = { kind: 'idle' }; next.states.right = { kind: 'idle' };
    return { next, sideEffects, renderList };
  }

  for (const hand of HANDS) {
    const hf = hands[hand];
    const wasPinching = prev.pinches[hand];
    const isPinching  = hf.pinch.active;
    const prevState   = prev.states[hand];
    let nextState: InteractionState = prevState;

    if (isPinching && !wasPinching) {
      // PINCH-START → SELECTION pipeline.
      // [LAW:one-source-of-truth] Selection ALWAYS reads gazeRay (frozen at pinch-start).
      const id = hf.gazeRay ? hitTestWidgets(laid, hf.gazeRay) : null;
      const widget = id ? laid.get(id)?.widget ?? null : null;
      nextState = (widget && id) ? beginInteraction(widget, id, registry.bindings, hf) : { kind: 'idle' };
    } else if (!isPinching && wasPinching) {
      // PINCH-END → COMMIT or RELEASE.
      if (prevState.kind === 'pressing' && !prevState.cancelPending) {
        sideEffects.push({ kind: 'binding-invoke', bindingId: prevState.bindingId });
      }
      nextState = { kind: 'idle' };
    } else if (isPinching && wasPinching) {
      // HOLD frame → continuous drag updates + cancel test.
      // [LAW:one-source-of-truth] Cancel test ALWAYS reads currentRay (hand-steered).
      if (prevState.kind === 'dragging') {
        const binding = registry.bindings.get(prevState.bindingId);
        const onWidget = !!hf.currentRay && hitTestWidgets(laid, hf.currentRay) === prevState.widgetId;
        const cancel = !onWidget;
        if (binding && binding.kind === 'continuous' && !cancel) {
          const value = computeDragValue(prevState, hf, binding, tuning.gainMultiplier);
          sideEffects.push({ kind: 'binding-set', bindingId: prevState.bindingId, value });
        }
        nextState = { ...prevState, cancelPending: cancel };
      } else if (prevState.kind === 'pressing') {
        const onWidget = !!hf.currentRay && hitTestWidgets(laid, hf.currentRay) === prevState.widgetId;
        nextState = { ...prevState, cancelPending: !onWidget };
      }
      // pinch-unclaimed (held over empty space) → stay idle; nothing to update.
    } else {
      // NO PINCH → HOVER pipeline.
      // [LAW:one-source-of-truth] Hover ALWAYS reads hf.ray (advisory laser).
      const id = hf.ray ? hitTestWidgets(laid, hf.ray) : null;
      nextState = id ? { kind: 'hovering', widgetId: id } : { kind: 'idle' };
    }

    next.states[hand] = nextState;
  }

  // Build render command list. [LAW:single-enforcer] All UI rendering reads
  // this list — nothing else computes widget poses for display.
  for (const [id, entry] of laid) {
    if (!entry.widget) continue;
    const widget = entry.widget;
    const hover = anyState(next.states, s => s.kind === 'hovering' && s.widgetId === id);
    const pressed  = anyState(next.states, s => s.kind === 'pressing' && s.widgetId === id);
    const dragging = anyState(next.states, s => s.kind === 'dragging' && s.widgetId === id);
    renderList.push({
      widgetId: id,
      pose: entry.pose,
      visualHalfExtent: entry.visualRect.halfExtent,
      kind: widget.kind,
      state: { hover, pressed, dragging, value: readWidgetValue(widget, registry.bindings) },
    });
  }

  return { next, sideEffects, renderList };
}

// A hand is "claimed by UI" while its pinch is held on a widget. Sim-input code
// (xrTransitionInteractions in main.ts) reads this to skip the pending→dragging
// sim-attractor promotion. [LAW:single-enforcer]
export function uiHandClaimed(state: InteractionState): boolean {
  return state.kind === 'pressing' || state.kind === 'dragging';
}

export function applySideEffects(effects: XrUiSideEffect[], registry: XrUiRegistry): void {
  for (const effect of effects) {
    if (effect.kind === 'tab-switch') continue; // ticket .16 wires tab swapping
    const b = registry.bindings.get(effect.bindingId);
    if (!b) continue;
    if (effect.kind === 'binding-invoke' && b.kind === 'action') { b.invoke(); continue; }
    if (effect.kind === 'binding-set') {
      if (b.kind === 'continuous' && typeof effect.value === 'number') b.set(effect.value);
      else if (b.kind === 'toggle' && typeof effect.value === 'boolean') b.set(effect.value);
      else if (b.kind === 'enum' && typeof effect.value === 'string') b.set(effect.value);
    }
  }
}

// ── INTERNALS ──────────────────────────────────────────────────────────────

function anyState(states: Record<Hand, InteractionState>, fn: (s: InteractionState) => boolean): boolean {
  return fn(states.left) || fn(states.right);
}

function readWidgetValue(widget: Widget, bindings: BindingRegistry): number | undefined {
  if (widget.kind !== 'slider' && widget.kind !== 'dial' && widget.kind !== 'readout') return undefined;
  const b = bindings.get(widget.binding);
  return b && b.kind === 'continuous' ? b.get() : undefined;
}

function beginInteraction(
  widget: Widget,
  widgetId: string,
  bindings: BindingRegistry,
  hf: HandFrame,
): InteractionState {
  if (widget.kind === 'button' || widget.kind === 'preset-tile') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'action') return { kind: 'idle' };
    return { kind: 'pressing', widgetId, bindingId: b.id, startedAt: hf.pinch.startTime, cancelPending: false };
  }
  if (widget.kind === 'slider' || widget.kind === 'dial') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'continuous') return { kind: 'idle' };
    return {
      kind: 'dragging',
      widgetId, bindingId: b.id,
      handOriginPos: [...hf.pinch.origin],
      valueAtOrigin: b.get(),
      interaction: widget.interaction,
      cancelPending: false,
    };
  }
  // toggle, stepper, enum-chips, category-tile, readout — not yet wired.
  // Returning idle leaves the pinch unclaimed; sim-side input proceeds normally.
  return { kind: 'idle' };
}

function computeDragValue(
  state: Extract<InteractionState, { kind: 'dragging' }>,
  hf: HandFrame,
  binding: Extract<Binding, { kind: 'continuous' }>,
  gain: number,
): number {
  const dx = hf.pinch.current[0] - state.handOriginPos[0];
  const dy = hf.pinch.current[1] - state.handOriginPos[1];
  const dz = hf.pinch.current[2] - state.handOriginPos[2];
  const span = binding.range.max - binding.range.min;
  let delta = 0;
  switch (state.interaction.kind) {
    case 'direct-drag': {
      // 1m of hand travel → full slider range. Tuneable later if too sensitive.
      const raw = state.interaction.axis === 'x' ? dx : dy;
      delta = raw * span;
      break;
    }
    case 'pinch-pull': {
      const ax = state.interaction.axis;
      const raw = ax === 'forward' ? -dz : ax === 'up' ? dy : dx;
      delta = raw * state.interaction.unitsPerMeter;
      break;
    }
    case 'pinch-twist':
      // Wrist quat delta wiring lands in ticket .14 — for MVP, no twist response.
      delta = 0;
      break;
    case 'expand-to-focus':
      // Defers to inner interaction; full mechanic lands in ticket .14.
      delta = 0;
      break;
  }
  const v = state.valueAtOrigin + delta * gain;
  return Math.max(binding.range.min, Math.min(binding.range.max, v));
}

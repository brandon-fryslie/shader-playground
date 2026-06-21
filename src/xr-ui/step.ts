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
import { quatConj, quatRotateVec } from './anchors';
import type { Container, Node, Widget, Vec2, ContinuousInteraction } from './widgets';
import { isWidget } from './widgets';
import type { Binding, BindingRegistry } from './bindings';
import type { FocusViewVisualState } from './layout';
import { layout, hitTestWidgets } from './layout';

// 150ms tween between collapsed (t=0) and fully expanded (t=1) — matches the
// ticket spec. Tuned by feel; if it lands wrong in headset, tweak here only.
const FOCUS_TRANSITION_MS = 150;

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
      cancelPending: boolean;
      // Discriminator chosen at pinch-start; tells the commit handler which
      // side effect to emit if the press isn't cancelled. Captured here so the
      // commit doesn't have to look the widget up again at pinch-end.
      commit:
        | { kind: 'invoke' }                              // button / preset-tile → action binding
        | { kind: 'toggle'; valueAtOrigin: boolean }      // toggle widget → flip
        | { kind: 'increment'; valueAtOrigin: number; step: number; min: number; max: number } }
  | { kind: 'dragging';
      widgetId: string; bindingId: string;
      handOriginPos: number[];        // world-space hand position at pinch-start
      // Widget orientation frozen at pinch-start. Drag deltas are rotated into this frame so the
      // users mental axis (slider X, pinch-pull forward, etc.) matches panel-local space even when
      // the panel is wrist/palm anchored and tilted. Locked at start so a rotating wrist mid-drag
      // does not remap axes underneath the user.
      widgetOrientationAtOrigin: [number, number, number, number];
      valueAtOrigin: number;          // binding value snapshot at pinch-start
      interaction: ContinuousInteraction;
      cancelPending: boolean;
      // Id of the focus-view container whose `focused` we set at pinch-start
      // (null if the widget had no expand-to-focus ancestor). Stored so
      // drag-end clears the same container we set — the focus-view stays
      // the single source of truth for "which widget is expanded".
      focusViewId: string | null };

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
  // Pre-rendered text the label atlas should display on this widget.
  // null/undefined means "no label" — the renderer skips atlas allocation
  // for that instance. Computed in xrUiStep from binding.label / format(value)
  // so the renderer never reaches back to the binding registry.
  // [LAW:one-way-deps]
  label?: string;
}

export interface XrUiPrev {
  states:  Record<Hand, InteractionState>;
  pinches: Record<Hand, boolean>;       // last frame's hf.pinch.active per hand
  // Per-focus-view visual tween state, keyed by focus-view container id.
  // Independent from container.focused (the SoT for "which widget is
  // expanded"); this map holds only the in-flight visual amplitude and the
  // pinned `rendered` widget that the collapse tween keeps showing while
  // it falls from 1 → 0. [LAW:one-source-of-truth]
  focusTransitions: Map<string, FocusViewVisualState>;
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
    focusTransitions: new Map(),
  };
}

const HANDS: Hand[] = ['left', 'right'];

export function xrUiStep(
  registry: XrUiRegistry,
  hands: Record<Hand, HandFrame>,
  prev: XrUiPrev,
  ctx: AnchorContext,
  tuning: XrUiTuning,
  dtMs: number,
): XrUiStepResult {
  const sideEffects: XrUiSideEffect[] = [];
  const renderList: RenderCommand[] = [];
  const next: XrUiPrev = {
    states:  { left: prev.states.left,  right: prev.states.right  },
    pinches: { left: hands.left.pinch.active, right: hands.right.pinch.active },
    focusTransitions: prev.focusTransitions, // mutated in place below
  };

  const root = registry.activeLayoutId != null ? registry.layouts.get(registry.activeLayoutId) : undefined;
  if (!root) {
    next.states.left = { kind: 'idle' }; next.states.right = { kind: 'idle' };
    next.focusTransitions = new Map(); // no active panel → no transitions in flight
    return { next, sideEffects, renderList };
  }
  // Advance the focus tween for every focus-view in the active panel, BEFORE
  // layout, so this frame's renderList already reflects the new t. The map
  // also has any stale entries pruned (focus-views from a swapped layout).
  // [LAW:dataflow-not-control-flow] tween advancement is unconditional —
  // empty map / t=0 / no focus all flow through the same arithmetic.
  advanceFocusTransitions(root, next.focusTransitions, dtMs);
  const laid = layout(root, ctx, next.focusTransitions);
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
      const laidEntry = id ? laid.get(id) ?? null : null;
      const widget = laidEntry?.widget ?? null;
      nextState = (widget && id && laidEntry) ? beginInteraction(widget, id, laidEntry.pose, registry.bindings, hf, root) : { kind: 'idle' };
      // If we entered drag on a widget whose ancestor is a focus-view, switch
      // that focus-view's `focused` field — the tween toward expanded starts
      // next frame. [LAW:one-source-of-truth] the field is the only place
      // this is recorded; the renderer reads the tween via layout, not via
      // a side channel.
      if (nextState.kind === 'dragging' && nextState.focusViewId != null) {
        const fv = findFocusView(root, nextState.focusViewId);
        if (fv) fv.focused = nextState.widgetId;
      }
    } else if (!isPinching && wasPinching) {
      // PINCH-END → COMMIT or RELEASE.
      if (prevState.kind === 'pressing' && !prevState.cancelPending) {
        const c = prevState.commit;
        if (c.kind === 'invoke') {
          sideEffects.push({ kind: 'binding-invoke', bindingId: prevState.bindingId });
        } else if (c.kind === 'toggle') {
          sideEffects.push({ kind: 'binding-set', bindingId: prevState.bindingId, value: !c.valueAtOrigin });
        } else { // increment
          const next = Math.max(c.min, Math.min(c.max, c.valueAtOrigin + c.step));
          sideEffects.push({ kind: 'binding-set', bindingId: prevState.bindingId, value: next });
        }
      }
      // Clear the focus-view we set at drag-start (if any). The collapse tween
      // runs on subsequent frames as `focused` is null but t > 0.
      if (prevState.kind === 'dragging' && prevState.focusViewId != null) {
        const fv = findFocusView(root, prevState.focusViewId);
        if (fv) fv.focused = null;
      }
      nextState = { kind: 'idle' };
    } else if (isPinching && wasPinching) {
      // HOLD frame → continuous drag updates (sliders/dials) + cancel test (buttons).
      // Cancel-pending applies ONLY to pressing — dragging means the hand is
      // intentionally moving away from the widget center to scrub the value;
      // gating updates on currentRay-on-widget would freeze the slider the moment
      // the user starts dragging. (Bug fix from initial XR session feedback.)
      if (prevState.kind === 'dragging') {
        const binding = registry.bindings.get(prevState.bindingId);
        if (binding && binding.kind === 'continuous') {
          const value = computeDragValue(prevState, hf, binding, tuning.gainMultiplier);
          sideEffects.push({ kind: 'binding-set', bindingId: prevState.bindingId, value });
        }
        nextState = prevState;
      } else if (prevState.kind === 'pressing') {
        // [LAW:one-source-of-truth] Cancel test ALWAYS reads currentRay (hand-steered).
        const onWidget = !!hf.currentRay && hitTestWidgets(laid, hf.currentRay) === prevState.widgetId;
        nextState = { ...prevState, cancelPending: !onWidget };
      }
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
      label: readWidgetLabel(widget, registry.bindings),
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

type FocusView = Container & { kind: 'focus-view' };

// Walk the container tree once and call `visit` on every focus-view.
// Recursion lives in one place (here) so future container kinds with
// children don't grow a parallel walker. [LAW:locality-or-seam]
function forEachFocusView(node: Node, visit: (fv: FocusView) => void): void {
  if (isWidget(node)) return;
  if (node.kind === 'focus-view') visit(node);
  switch (node.kind) {
    case 'panel':
    case 'group':
    case 'focus-view':
      for (const child of node.children) forEachFocusView(child, visit);
      return;
    case 'tabs':
      for (const tab of node.tabs) forEachFocusView(tab.body, visit);
      return;
  }
}

function findFocusView(root: Node, id: string): FocusView | null {
  let found: FocusView | null = null;
  forEachFocusView(root, fv => { if (fv.id === id) found = fv; });
  return found;
}

// Return the id of the INNERMOST focus-view ancestor that transitively
// contains `widgetId`, or null. `forEachFocusView` is depth-first and
// outer-first, so by overwriting `found` on each match we end up with the
// deepest hit — the focus-view whose `focused` field semantically owns
// "what's expanded in this region". Nested focus-views aren't used by
// the clipboard today but will be once categories ship (.16).
function findFocusViewContaining(root: Node, widgetId: string): string | null {
  let found: string | null = null;
  forEachFocusView(root, fv => {
    if (fv.children.some(child => containsWidget(child, widgetId))) found = fv.id;
  });
  return found;
}

function containsWidget(node: Node, widgetId: string): boolean {
  if (isWidget(node)) return node.id === widgetId;
  switch (node.kind) {
    case 'panel':
    case 'group':
    case 'focus-view':
      return node.children.some(c => containsWidget(c, widgetId));
    case 'tabs':
      return node.tabs.some(t => containsWidget(t.body, widgetId));
  }
}

// Step every focus-view's tween toward its target (`focused != null` → 1,
// else → 0). `rendered` is kept pinned to the last focused widget through
// the collapse tail so the focus-view keeps drawing it on the way down.
// Stale map entries (focus-views removed from the active panel since last
// frame) are dropped — the map can never grow unbounded across layout swaps.
function advanceFocusTransitions(
  root: Container & { kind: 'panel' },
  transitions: Map<string, FocusViewVisualState>,
  dtMs: number,
): void {
  const live = new Set<string>();
  const step = Math.max(0, dtMs) / FOCUS_TRANSITION_MS;
  forEachFocusView(root, fv => {
    live.add(fv.id);
    const prevState = transitions.get(fv.id) ?? { rendered: null, t: 0 };
    const target = fv.focused != null ? 1 : 0;
    const dir = target > prevState.t ? 1 : (target < prevState.t ? -1 : 0);
    const tNext = clamp01(prevState.t + dir * step);
    // While focused is set, the rendered widget is the focused one (snap on
    // focus change). While focused becomes null but t > 0, hold the last
    // rendered id so the collapse tail keeps drawing it. At t === 0 with
    // no focused, drop the rendered id so siblings come back on next frame.
    const rendered = fv.focused != null
      ? fv.focused
      : (tNext > 0 ? prevState.rendered : null);
    transitions.set(fv.id, { rendered, t: tNext });
  });
  for (const id of transitions.keys()) {
    if (!live.has(id)) transitions.delete(id);
  }
}

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

// Compute the label text the renderer should rasterize for this widget.
// Continuous widgets show formatted value (binding.format or fixed-precision);
// action widgets show the binding's label; toggles show on/off; enum-chips and
// stepper show the current value. Returns undefined when no label makes sense
// (the renderer skips atlas allocation for that instance).
function readWidgetLabel(widget: Widget, bindings: BindingRegistry): string | undefined {
  if (widget.kind === 'category-tile') return undefined; // targetTabId, not a binding
  const b = bindings.get(widget.binding);
  if (!b) return undefined;
  if (widget.kind === 'slider' || widget.kind === 'dial' || widget.kind === 'readout' || widget.kind === 'stepper') {
    if (b.kind !== 'continuous') return b.label;
    const v = b.get();
    return b.format ? b.format(v) : formatNumber(v);
  }
  if (widget.kind === 'toggle') {
    if (b.kind === 'toggle') return b.get() ? 'On' : 'Off';
    return b.label;
  }
  if (widget.kind === 'enum-chips') {
    return b.kind === 'enum' ? b.get() : b.label;
  }
  if (widget.kind === 'button' || widget.kind === 'preset-tile') {
    return b.label;
  }
  return undefined;
}

function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10)  return v.toFixed(1);
  if (a >= 1)   return v.toFixed(2);
  return v.toFixed(3);
}

function readWidgetValue(widget: Widget, bindings: BindingRegistry): number | undefined {
  if (widget.kind !== 'slider' && widget.kind !== 'dial' && widget.kind !== 'readout') return undefined;
  const b = bindings.get(widget.binding);
  if (!b || b.kind !== 'continuous') return undefined;
  // Normalize to 0..1 by the binding's range so the renderer can position
  // sliders/dials independently of the binding's physical units. Readout still
  // gets the same field — ticket .19's text atlas formats it via b.format().
  const span = b.range.max - b.range.min;
  if (span <= 0) return 0;
  return (b.get() - b.range.min) / span;
}

function beginInteraction(
  widget: Widget,
  widgetId: string,
  pose: Pose,
  bindings: BindingRegistry,
  hf: HandFrame,
  root: Container & { kind: 'panel' },
): InteractionState {
  if (widget.kind === 'button' || widget.kind === 'preset-tile') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'action') return { kind: 'idle' };
    return { kind: 'pressing', widgetId, bindingId: b.id, startedAt: hf.pinch.startTime,
             cancelPending: false, commit: { kind: 'invoke' } };
  }
  if (widget.kind === 'toggle') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'toggle') return { kind: 'idle' };
    return { kind: 'pressing', widgetId, bindingId: b.id, startedAt: hf.pinch.startTime,
             cancelPending: false, commit: { kind: 'toggle', valueAtOrigin: b.get() } };
  }
  if (widget.kind === 'stepper') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'continuous') return { kind: 'idle' };
    return { kind: 'pressing', widgetId, bindingId: b.id, startedAt: hf.pinch.startTime,
             cancelPending: false,
             commit: { kind: 'increment', valueAtOrigin: b.get(), step: widget.step,
                       min: b.range.min, max: b.range.max } };
  }
  if (widget.kind === 'slider' || widget.kind === 'dial') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'continuous') return { kind: 'idle' };
    const focusViewId = findFocusViewContaining(root, widgetId);
    return {
      kind: 'dragging',
      widgetId, bindingId: b.id,
      handOriginPos: [...hf.pinch.origin],
      widgetOrientationAtOrigin: [
        pose.orientation[0], pose.orientation[1], pose.orientation[2], pose.orientation[3],
      ],
      valueAtOrigin: b.get(),
      interaction: widget.interaction,
      cancelPending: false,
      focusViewId,
    };
  }
  // enum-chips, category-tile, readout — not yet wired.
  // enum-chips needs chip-level hit zones (not just one big plate);
  // category-tile needs the tabs container behavior from ticket .16.
  // Returning idle leaves the pinch unclaimed; sim-side input proceeds normally.
  return { kind: 'idle' };
}

function computeDragValue(
  state: Extract<InteractionState, { kind: 'dragging' }>,
  hf: HandFrame,
  binding: Extract<Binding, { kind: 'continuous' }>,
  gain: number,
): number {
  // [LAW:one-source-of-truth] Drag delta is evaluated in widget-LOCAL space so slider-X / pinch-pull-forward
  // mean the same thing no matter how the panel is oriented in world. The widget orientation is frozen at
  // pinch-start (widgetOrientationAtOrigin) — re-reading the pose each frame would let a rotating wrist
  // remap the axes underneath the user mid-drag.
  const worldDelta: [number, number, number] = [
    hf.pinch.current[0] - state.handOriginPos[0],
    hf.pinch.current[1] - state.handOriginPos[1],
    hf.pinch.current[2] - state.handOriginPos[2],
  ];
  const localDelta = quatRotateVec(quatConj(state.widgetOrientationAtOrigin), worldDelta);
  const dx = localDelta[0];
  const dy = localDelta[1];
  const dz = localDelta[2];
  const span = binding.range.max - binding.range.min;
  const computeInteractionDelta = (interaction: ContinuousInteraction): number => {
    switch (interaction.kind) {
      case 'direct-drag': {
        // 1m of hand travel → full slider range. Tuneable later if too sensitive.
        const raw = interaction.axis === 'x' ? dx : dy;
        return raw * span;
      }
      case 'pinch-pull': {
        const ax = interaction.axis;
        const raw = ax === 'forward' ? -dz : ax === 'up' ? dy : dx;
        return raw * interaction.unitsPerMeter;
      }
      case 'pinch-twist':
        // Wrist quat delta wiring lands in a later ticket — for MVP, no twist response.
        return 0;
      case 'expand-to-focus':
        // Defensive: nothing in the current widget set declares this as its
        // interaction kind (expand-to-focus is structural — applied via a
        // focus-view container wrapping a slider/dial whose `interaction`
        // stays direct-drag / pinch-pull / pinch-twist). Treat as the
        // underlying interaction so a hand-authored layout can still use it
        // as a wrapper if it wants. [LAW:dataflow-not-control-flow] value
        // propagates by recursion, not by an early-return special case.
        return computeInteractionDelta(interaction.underlying);
    }
  };
  const delta = computeInteractionDelta(state.interaction);
  const v = state.valueAtOrigin + delta * gain;
  return Math.max(binding.range.min, Math.min(binding.range.max, v));
}

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
import type { Container, Node, Widget, Vec2, ContinuousInteraction, VisibilityGate } from './widgets';
import { isWidget } from './widgets';
import type { Binding, BindingRegistry } from './bindings';
import type { FocusViewVisualState, LaidOut } from './layout';
import { layout, hitTestWidgets } from './layout';

// 150ms tween between collapsed (t=0) and fully expanded (t=1) — matches the
// ticket spec. Tuned by feel; if it lands wrong in headset, tweak here only.
const FOCUS_TRANSITION_MS = 150;

// Visibility gate (.18). Smooth fade across ~200ms. Hysteresis thresholds for
// palm-facing-user keep the gate from flip-flopping at the boundary. Hit-test
// only fires on widgets whose owning panel is visible enough to read; below
// the hittable threshold the panel is still painted (at low alpha) but inert.
const VISIBILITY_TRANSITION_MS = 200;
const VISIBILITY_HITTABLE_THRESHOLD = 0.5;
const PALM_FACING_ENTER_DEFAULT = 0.7;
const PALM_FACING_EXIT = 0.4;
const HAND_RAISED_ENTER_Y_DEFAULT = 1.0;
const HAND_RAISED_EXIT_Y_BAND = 0.1;

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
  | { kind: 'hovering'; widgetId: string; subZoneId?: string }
  | { kind: 'pressing';
      widgetId: string;
      // Sub-zone the press is committed against (chip value, stepper side).
      // Captured at pinch-start and frozen — sliding across sub-zones within
      // the same widget does NOT re-pick the sub-zone (sliding off-widget
      // cancels via cancelPending; intra-widget movement is ignored). This
      // matches the cancel-pending invariant for slide-off-to-cancel.
      // [LAW:one-source-of-truth] the press's committed sub-zone lives here
      // and only here; render reads it via state for per-zone highlight.
      subZoneId?: string;
      startedAt: number;
      cancelPending: boolean;
      // Discriminator chosen at pinch-start; tells the commit handler which
      // side effect to emit if the press isn't cancelled. Captured here so the
      // commit doesn't have to look the widget up again at pinch-end. The
      // target id (bindingId for binding-affecting commits, layoutId+tabId for
      // tab-switch) lives ON the variant — keeping it on the outer pressing
      // would force the tab-switch variant to carry a meaningless bindingId.
      // [LAW:types-are-the-program]
      commit:
        | { kind: 'invoke';     bindingId: string }                                 // button / preset-tile → action binding
        | { kind: 'toggle';     bindingId: string; valueAtOrigin: boolean }         // toggle widget → flip
        | { kind: 'increment';  bindingId: string; valueAtOrigin: number; step: number; min: number; max: number }
        | { kind: 'enum-set';   bindingId: string; value: string }                  // enum-chips chip pinch → set option
        | { kind: 'tab-switch'; layoutId: string;  tabId: string } }                // category-tile → tab-switch effect
  | { kind: 'dragging';
      widgetId: string; bindingId: string;
      handOriginPos: number[];        // world-space hand position at origin
      // Widget orientation frozen at pinch-start. Drag deltas are rotated into this frame so the
      // users mental axis (slider X, pinch-pull forward, etc.) matches panel-local space even when
      // the panel is wrist/palm anchored and tilted. Locked at start so a rotating wrist mid-drag
      // does not remap axes underneath the user.
      widgetOrientationAtOrigin: [number, number, number, number];
      valueAtOrigin: number;          // binding value snapshot at origin
      // Gain multiplier under which valueAtOrigin/handOriginPos were captured.
      // When the global gain changes mid-drag (fine-modifier toggled), the
      // HOLD branch rebases origin to "current pose, current value" so the
      // value evolves smoothly with the new slope rather than jumping by
      // (newGain - oldGain) * delta. [LAW:types-are-the-program] storing the
      // gain under which the origin is valid makes the no-jump invariant
      // explicit in the type, not implicit in the loop.
      appliedGain: number;
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

// Per-widget sub-zone render state. Only widget kinds with sub-zones produce
// this; absence means "no sub-zone visuals to draw" (the shader takes the
// single-zone path it already had). Chip indices use -1 as the "none"
// sentinel — the renderer packs into a u32 instance slot, the shader unpacks.
// [LAW:dataflow-not-control-flow] the same shader path runs every frame;
// indices flow as data and gate visual highlights via mix() factors, not
// per-chip if-branches.
export type SubZoneRenderState =
  | { kind: 'chips';   count: number; activeIdx: number; hoverIdx: number; pressIdx: number }
  | { kind: 'stepper'; hoverSide: 'left' | 'right' | null; pressSide: 'left' | 'right' | null };

export interface RenderCommand {
  widgetId: string;
  pose: Pose;
  visualHalfExtent: Vec2;
  kind: Widget['kind'];
  state: { hover: boolean; pressed: boolean; dragging: boolean; value?: number };
  subZones?: SubZoneRenderState;
  // Pre-rendered text the label atlas should display on this widget.
  // null/undefined means "no label" — the renderer skips atlas allocation
  // for that instance. Computed in xrUiStep from binding.label / format(value)
  // so the renderer never reaches back to the binding registry.
  // [LAW:one-way-deps]
  label?: string;
  // Global per-frame stamp: dual-speed fine modifier is engaged. Renderer
  // draws a subtle accent border on every command so the user sees that
  // drag gain is reduced. Stamped on every command because it's a frame-
  // wide property, not per-widget — keeps RenderCommand the single seam
  // the renderer reads. [LAW:one-source-of-truth]
  fineMode: boolean;
  // Visibility opacity in [0, 1] driven by the owning panel's gate (.18).
  // Layout always runs; this is the data that lets the renderer fade the
  // panel uniformly. [LAW:dataflow-not-control-flow] no CPU-side "is this
  // visible?" branch — the value flows to the shader and modulates output
  // alpha; when 0 the shader still runs but writes transparent pixels.
  alpha: number;
}

// Per-panel visibility tween. `satisfied` is the gate's binary state with
// hysteresis applied — used as the prev-frame input so the gate doesn't
// flip-flop at the threshold. `alpha` is the smoothed [0,1] opacity that
// flows to render commands. Decoupling the two is the only way hysteresis
// can work; collapsing to a single number would let the in-flight tween
// flip the gate underneath itself. [LAW:types-are-the-program]
export interface PanelVisibilityState { satisfied: boolean; alpha: number }

export interface XrUiPrev {
  states:  Record<Hand, InteractionState>;
  pinches: Record<Hand, boolean>;       // last frame's hf.pinch.active per hand
  // Per-focus-view visual tween state, keyed by focus-view container id.
  // Independent from container.focused (the SoT for "which widget is
  // expanded"); this map holds only the in-flight visual amplitude and the
  // pinned `rendered` widget that the collapse tween keeps showing while
  // it falls from 1 → 0. [LAW:one-source-of-truth]
  focusTransitions: Map<string, FocusViewVisualState>;
  // Per-panel visibility tween, keyed by panel container id. Same lifecycle
  // pattern as focusTransitions: mutated in place each frame, pruned when
  // the panel leaves the active layout.
  visibilityTransitions: Map<string, PanelVisibilityState>;
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
    visibilityTransitions: new Map(),
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
    visibilityTransitions: prev.visibilityTransitions, // mutated in place below
  };

  const activeLayoutId = registry.activeLayoutId;
  const root = activeLayoutId != null ? registry.layouts.get(activeLayoutId) : undefined;
  if (!root || activeLayoutId == null) {
    next.states.left = { kind: 'idle' }; next.states.right = { kind: 'idle' };
    next.focusTransitions = new Map(); // no active panel → no transitions in flight
    next.visibilityTransitions = new Map();
    return { next, sideEffects, renderList };
  }
  // Advance the focus tween for every focus-view in the active panel, BEFORE
  // layout, so this frame's renderList already reflects the new t. The map
  // also has any stale entries pruned (focus-views from a swapped layout).
  // [LAW:dataflow-not-control-flow] tween advancement is unconditional —
  // empty map / t=0 / no focus all flow through the same arithmetic.
  advanceFocusTransitions(root, next.focusTransitions, dtMs);
  const laid = layout(root, ctx, next.focusTransitions, registry.bindings);
  if (!laid) {
    next.states.left = { kind: 'idle' }; next.states.right = { kind: 'idle' };
    return { next, sideEffects, renderList };
  }

  // Visibility (.18). Gate evaluates to a binary `satisfied` per panel with
  // hysteresis; alpha tweens toward 1 when satisfied OR when any hand has
  // claimed a widget owned by this panel (drag/press pins the panel visible
  // until release so a rotating wrist mid-drag never strands the user).
  // [LAW:one-source-of-truth] the gate's truth is computed once per frame
  // per panel; the smoothed alpha flows to layout (hit-test gating) and to
  // render commands (uniform fade). No second visibility flag elsewhere.
  advancePanelVisibility(root, next.visibilityTransitions, prev.states, laid, ctx, dtMs);
  const panelAlpha = next.visibilityTransitions.get(root.id)?.alpha ?? 0;
  const panelHittable = panelAlpha >= VISIBILITY_HITTABLE_THRESHOLD;

  for (const hand of HANDS) {
    const hf = hands[hand];
    const wasPinching = prev.pinches[hand];
    const isPinching  = hf.pinch.active;
    const prevState   = prev.states[hand];
    let nextState: InteractionState = prevState;

    if (isPinching && !wasPinching) {
      // PINCH-START → SELECTION pipeline.
      // [LAW:one-source-of-truth] Selection ALWAYS reads gazeRay (frozen at pinch-start).
      // [LAW:dataflow-not-control-flow] hit-test always runs when a ray is
      // available (the ray null-check is a structural prerequisite for the
      // call). Visibility is a separate filter applied to the result as data,
      // not a guard that decides whether to compute.
      const rawHit = hf.gazeRay ? hitTestWidgets(laid, hf.gazeRay) : null;
      const hit = panelHittable ? rawHit : null;
      const laidEntry = hit ? laid.get(hit.widgetId) ?? null : null;
      const widget = laidEntry?.widget ?? null;
      nextState = (widget && hit && laidEntry) ? beginInteraction(widget, hit.widgetId, hit.subZoneId, laidEntry.pose, registry.bindings, hf, root, activeLayoutId, tuning.gainMultiplier) : { kind: 'idle' };
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
          sideEffects.push({ kind: 'binding-invoke', bindingId: c.bindingId });
        } else if (c.kind === 'toggle') {
          sideEffects.push({ kind: 'binding-set', bindingId: c.bindingId, value: !c.valueAtOrigin });
        } else if (c.kind === 'increment') {
          const next = Math.max(c.min, Math.min(c.max, c.valueAtOrigin + c.step));
          sideEffects.push({ kind: 'binding-set', bindingId: c.bindingId, value: next });
        } else if (c.kind === 'enum-set') {
          sideEffects.push({ kind: 'binding-set', bindingId: c.bindingId, value: c.value });
        } else {
          sideEffects.push({ kind: 'tab-switch', layoutId: c.layoutId, tabId: c.tabId });
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
        let dragging = prevState;
        // Gain transition mid-drag (fine-modifier toggled) → rebase origin to
        // current pose + current value so the slider doesn't jump. The next
        // line evaluates as: new valueAtOrigin = current value under OLD gain,
        // then origin pose snaps to current pinch, then appliedGain stamps NEW.
        // [LAW:dataflow-not-control-flow] this is an unconditional rebase that
        // happens to be a no-op when gains match (delta from new origin = 0).
        if (binding && binding.kind === 'continuous' && dragging.appliedGain !== tuning.gainMultiplier) {
          const rebasedValue = computeDragValue(dragging, hf, binding, dragging.appliedGain);
          dragging = {
            ...dragging,
            valueAtOrigin: rebasedValue,
            handOriginPos: [hf.pinch.current[0], hf.pinch.current[1], hf.pinch.current[2]],
            appliedGain: tuning.gainMultiplier,
          };
        }
        if (binding && binding.kind === 'continuous') {
          const value = computeDragValue(dragging, hf, binding, tuning.gainMultiplier);
          sideEffects.push({ kind: 'binding-set', bindingId: dragging.bindingId, value });
        }
        nextState = dragging;
      } else if (prevState.kind === 'pressing') {
        // [LAW:one-source-of-truth] Cancel test ALWAYS reads currentRay (hand-steered).
        // Cancel keys on the WIDGET, not the sub-zone — sliding from chip A
        // to chip B inside the same enum-chips widget keeps the original
        // commit alive. Off-widget triggers cancelPending.
        const cancelHit = hf.currentRay ? hitTestWidgets(laid, hf.currentRay) : null;
        const onWidget = cancelHit !== null && cancelHit.widgetId === prevState.widgetId;
        nextState = { ...prevState, cancelPending: !onWidget };
      }
    } else {
      // NO PINCH → HOVER pipeline.
      // [LAW:one-source-of-truth] Hover ALWAYS reads hf.ray (advisory laser).
      // Same compute-then-filter shape as selection above. [LAW:dataflow-not-control-flow]
      const rawHit = hf.ray ? hitTestWidgets(laid, hf.ray) : null;
      const hit = panelHittable ? rawHit : null;
      nextState = hit ? { kind: 'hovering', widgetId: hit.widgetId, subZoneId: hit.subZoneId } : { kind: 'idle' };
    }

    next.states[hand] = nextState;
  }

  // Build render command list. [LAW:single-enforcer] All UI rendering reads
  // this list — nothing else computes widget poses for display.
  // Render iteration skips sub-zone entries: the widget entry produces the
  // single command, and per-zone highlight is encoded in `subZones` below.
  const fineMode = tuning.gainMultiplier < 1;
  for (const [id, entry] of laid) {
    if (!entry.widget || entry.subZoneId !== undefined) continue;
    const widget = entry.widget;
    const hover = anyState(next.states, s => s.kind === 'hovering' && s.widgetId === id);
    const pressed  = anyState(next.states, s => s.kind === 'pressing' && s.widgetId === id);
    const dragging = anyState(next.states, s => s.kind === 'dragging' && s.widgetId === id);
    // Per-widget alpha = its owning panel's smoothed visibility. Widgets
    // chain to the panel root via parentId (group/tabs/focus-view containers
    // don't appear in `laid`, so a leaf's parentId is always the panel id).
    // [LAW:one-source-of-truth] one map, one lookup, no per-kind branch.
    const ownerPanelId = entry.parentId;
    const widgetAlpha = ownerPanelId != null
      ? (next.visibilityTransitions.get(ownerPanelId)?.alpha ?? 1)
      : 1;
    renderList.push({
      widgetId: id,
      pose: entry.pose,
      visualHalfExtent: entry.visualRect.halfExtent,
      kind: widget.kind,
      state: { hover, pressed, dragging, value: readWidgetValue(widget, registry.bindings) },
      subZones: buildSubZoneRenderState(widget, id, next.states, registry.bindings),
      label: readWidgetLabel(widget, registry.bindings),
      fineMode,
      alpha: widgetAlpha,
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
    if (effect.kind === 'tab-switch') {
      // Walk the named layout once to find the tabs container that owns the
      // target tab id; flip its activeTabId. [LAW:one-source-of-truth] the
      // tabs container's activeTabId is the only place "which tab is active"
      // is recorded — no mirror in XrUiPrev, no per-panel flag elsewhere.
      // Tab ids are required to be unique within a layout (the inverse —
      // duplicated ids across tabs containers — would create ambiguity that
      // the type can't catch); the first match wins.
      const layout = registry.layouts.get(effect.layoutId);
      if (layout) setActiveTabId(layout, effect.tabId);
      continue;
    }
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

// Find the tabs container whose tabs include `tabId` and set its activeTabId.
// Returns true on success. The walk lives here rather than in step.ts because
// it's the side-effect applier's job to know how to mutate the layout tree;
// xrUiStep itself only emits the descriptor. [LAW:one-way-deps]
function setActiveTabId(node: Node, tabId: string): boolean {
  if (isWidget(node)) return false;
  if (node.kind === 'tabs' && node.tabs.some(t => t.id === tabId)) {
    node.activeTabId = tabId;
    return true;
  }
  switch (node.kind) {
    case 'panel':
    case 'group':
    case 'focus-view':
      for (const child of node.children) if (setActiveTabId(child, tabId)) return true;
      return false;
    case 'tabs':
      for (const tab of node.tabs) if (setActiveTabId(tab.body, tabId)) return true;
      return false;
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

// Evaluate a panel's visibility gate against the current frame's anchor data,
// using `prevSatisfied` to apply hysteresis. Tracking-loss (missing wrist /
// palmNormal / head pose) holds the previous decision rather than flipping the
// gate — the user's intent didn't change, the sensor did. [LAW:no-silent-failure]
// resolved by treating absence as "no new evidence", not as "rejected".
function evaluateVisibilityGate(
  gate: VisibilityGate | undefined,
  ctx: AnchorContext,
  prevSatisfied: boolean,
): boolean {
  if (!gate || gate.kind === 'always') return true;
  if (gate.kind === 'palm-facing-user') {
    const hf = ctx.hands[gate.hand];
    const wrist = hf.joints?.wrist;
    const palm = hf.palmNormal;
    const head = ctx.headPose;
    if (!wrist || !palm || !head) return prevSatisfied;
    // The palm faces the USER when the palm normal aligns with the wrist→head
    // vector — NOT world-up. This is the whole point of the gate: tilting your
    // head doesn't change what "facing me" means; rotating the wrist does.
    const dx = head.position[0] - wrist.position[0];
    const dy = head.position[1] - wrist.position[1];
    const dz = head.position[2] - wrist.position[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6) return prevSatisfied;
    const d = (palm[0] * dx + palm[1] * dy + palm[2] * dz) / len;
    const enter = gate.threshold ?? PALM_FACING_ENTER_DEFAULT;
    return prevSatisfied ? (d > PALM_FACING_EXIT) : (d > enter);
  }
  if (gate.kind === 'hand-raised') {
    const wrist = ctx.hands[gate.hand].joints?.wrist;
    if (!wrist) return prevSatisfied;
    const minY = gate.minY ?? HAND_RAISED_ENTER_Y_DEFAULT;
    const threshold = prevSatisfied ? minY - HAND_RAISED_EXIT_Y_BAND : minY;
    return wrist.position[1] > threshold;
  }
  // Exhaustiveness: every VisibilityGate variant is handled above. A future
  // variant must add its case here OR fall through to `true` (visible by
  // default) — choosing the latter is intentional so a missing case at
  // worst over-shows, never strands the user with a hidden panel.
  return true;
}

// Whether any hand has currently claimed a widget that belongs to this panel.
// Reads PREV states (this frame's loop hasn't run yet). A claim from last
// frame trivially implies the panel was visible enough to be hit; pinning it
// visible for this frame keeps the drag/press alive even if the user rotates
// their palm away mid-interaction. [LAW:dataflow-not-control-flow] the pin
// is just an extra OR into the visibility target — no second alpha channel.
function anyHandClaimedWidgetInPanel(
  states: Record<Hand, InteractionState>,
  laid: Map<string, LaidOut>,
  panelId: string,
): boolean {
  for (const hand of HANDS) {
    const s = states[hand];
    const widgetId =
      s.kind === 'pressing' ? s.widgetId :
      s.kind === 'dragging' ? s.widgetId : null;
    if (widgetId == null) continue;
    const entry = laid.get(widgetId);
    if (entry?.parentId === panelId) return true;
  }
  return false;
}

// Step every panel's visibility tween toward its target (gate satisfied OR a
// hand is currently dragging/pressing one of its widgets → 1; else → 0).
// Drops map entries for panels that aren't in the active layout this frame.
function advancePanelVisibility(
  root: Container & { kind: 'panel' },
  transitions: Map<string, PanelVisibilityState>,
  prevStates: Record<Hand, InteractionState>,
  laid: Map<string, LaidOut>,
  ctx: AnchorContext,
  dtMs: number,
): void {
  const stepAmt = Math.max(0, dtMs) / VISIBILITY_TRANSITION_MS;
  const prev = transitions.get(root.id) ?? { satisfied: false, alpha: 0 };
  const gateSatisfied = evaluateVisibilityGate(root.visibility, ctx, prev.satisfied);
  const pinned = anyHandClaimedWidgetInPanel(prevStates, laid, root.id);
  const target = (gateSatisfied || pinned) ? 1 : 0;
  const dir = target > prev.alpha ? 1 : (target < prev.alpha ? -1 : 0);
  const alpha = clamp01(prev.alpha + dir * stepAmt);
  transitions.set(root.id, { satisfied: gateSatisfied, alpha });
  for (const id of transitions.keys()) {
    if (id !== root.id) transitions.delete(id);
  }
}

// Compute the label text the renderer should rasterize for this widget.
// Continuous widgets show formatted value (binding.format or fixed-precision);
// action widgets show the binding's label; toggles show on/off; enum-chips and
// stepper show the current value. Returns undefined when no label makes sense
// (the renderer skips atlas allocation for that instance).
function readWidgetLabel(widget: Widget, bindings: BindingRegistry): string | undefined {
  if (widget.kind === 'category-tile') {
    // SummarySpec is opaque; the only field this seam reads is `label`. Other
    // future summary fields (icon, count, etc.) are consumed by the renderer
    // through the same single seam (RenderCommand.label / etc.) — no second
    // path into the SummarySpec. [LAW:single-enforcer]
    const label = widget.summary.label;
    return typeof label === 'string' ? label : undefined;
  }
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

// Derive the sub-zone render state for kinds whose visual splits by zone.
// Other kinds return undefined → the shader takes the single-zone path. Hover
// and press sub-zones are looked up by walking both hands' interaction state
// once; absence (the user is hovering a non-sub-zone widget, or no chip in
// this widget) leaves the indices at -1 (chips) or null (stepper sides).
// [LAW:single-enforcer] this is the only place sub-zone render packing happens.
function buildSubZoneRenderState(
  widget: Widget,
  widgetId: string,
  states: Record<Hand, InteractionState>,
  bindings: BindingRegistry,
): SubZoneRenderState | undefined {
  if (widget.kind === 'stepper') {
    const hoverZone = findSubZoneId(states, widgetId, 'hovering');
    const pressZone = findSubZoneId(states, widgetId, 'pressing');
    const asSide = (z: string | undefined): 'left' | 'right' | null =>
      z === 'left' ? 'left' : z === 'right' ? 'right' : null;
    return { kind: 'stepper', hoverSide: asSide(hoverZone), pressSide: asSide(pressZone) };
  }
  if (widget.kind === 'enum-chips') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'enum') return undefined;
    const valueToIdx = (v: string | undefined): number => {
      if (v === undefined) return -1;
      const i = b.options.findIndex(o => o.value === v);
      return i;
    };
    return {
      kind: 'chips',
      count: b.options.length,
      activeIdx: valueToIdx(b.get()),
      hoverIdx: valueToIdx(findSubZoneId(states, widgetId, 'hovering')),
      pressIdx: valueToIdx(findSubZoneId(states, widgetId, 'pressing')),
    };
  }
  return undefined;
}

function findSubZoneId(
  states: Record<Hand, InteractionState>,
  widgetId: string,
  stateKind: 'hovering' | 'pressing',
): string | undefined {
  for (const hand of HANDS) {
    const s = states[hand];
    if (s.kind === stateKind && s.widgetId === widgetId) return s.subZoneId;
  }
  return undefined;
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
  subZoneId: string | undefined,
  pose: Pose,
  bindings: BindingRegistry,
  hf: HandFrame,
  root: Container & { kind: 'panel' },
  activeLayoutId: string,
  gainAtStart: number,
): InteractionState {
  if (widget.kind === 'button' || widget.kind === 'preset-tile') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'action') return { kind: 'idle' };
    return { kind: 'pressing', widgetId, startedAt: hf.pinch.startTime,
             cancelPending: false, commit: { kind: 'invoke', bindingId: b.id } };
  }
  if (widget.kind === 'toggle') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'toggle') return { kind: 'idle' };
    return { kind: 'pressing', widgetId, startedAt: hf.pinch.startTime,
             cancelPending: false, commit: { kind: 'toggle', bindingId: b.id, valueAtOrigin: b.get() } };
  }
  if (widget.kind === 'stepper') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'continuous') return { kind: 'idle' };
    // Stepper sub-zones are intrinsic: 'left' decrements, 'right' increments.
    // A pinch with no sub-zone (e.g. hand-tracking glitch produced a hit on
    // the parent widget despite zero hitRect) collapses to idle rather than
    // silently incrementing in an arbitrary direction. [LAW:no-silent-failure]
    if (subZoneId !== 'left' && subZoneId !== 'right') return { kind: 'idle' };
    const signedStep = subZoneId === 'left' ? -widget.step : widget.step;
    return { kind: 'pressing', widgetId, subZoneId, startedAt: hf.pinch.startTime,
             cancelPending: false,
             commit: { kind: 'increment', bindingId: b.id, valueAtOrigin: b.get(),
                       step: signedStep, min: b.range.min, max: b.range.max } };
  }
  if (widget.kind === 'enum-chips') {
    const b = bindings.get(widget.binding);
    if (!b || b.kind !== 'enum' || subZoneId === undefined) return { kind: 'idle' };
    // The chip's sub-zone id IS the option's value (see deriveSubZones), so
    // no second lookup is needed. Confirm the value is still a registered
    // option in case the binding's options changed mid-frame — a stale chip
    // would otherwise set the binding to an unknown value. [LAW:no-silent-failure]
    if (!b.options.some(o => o.value === subZoneId)) return { kind: 'idle' };
    return { kind: 'pressing', widgetId, subZoneId, startedAt: hf.pinch.startTime,
             cancelPending: false,
             commit: { kind: 'enum-set', bindingId: b.id, value: subZoneId } };
  }
  if (widget.kind === 'category-tile') {
    // Tab navigation rides the same pressing → cancel-on-slide-off flow as
    // buttons: pinch-end on the tile commits a tab-switch effect, slide-off
    // cancels. [LAW:single-enforcer] tab-switching is exactly one mechanism —
    // pinch a category-tile whose targetTabId names the destination. Back
    // buttons are tiles whose targetTabId points at the root tab; no second
    // mechanism (no action-binding-with-side-channel) is needed.
    return { kind: 'pressing', widgetId, startedAt: hf.pinch.startTime,
             cancelPending: false,
             commit: { kind: 'tab-switch', layoutId: activeLayoutId, tabId: widget.targetTabId } };
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
      appliedGain: gainAtStart,
      interaction: widget.interaction,
      cancelPending: false,
      focusViewId,
    };
  }
  // readout — display-only.
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

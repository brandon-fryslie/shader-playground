// Layout pass for the XR UI rewrite.
//
// Takes a panel (root container with an Anchor) and a per-frame AnchorContext;
// returns a flat Map<id, LaidOut> of world-space widget rectangles. The map is
// the single source the rest of the XR UI reads — render (.12) and hit-test
// (here + interaction in .11) both consume it. Layout containers (group,
// tabs, focus-view) are pure transformations and do NOT appear in the map;
// the panel itself does, and so do all reachable widget leaves.
//
// [LAW:one-source-of-truth] One layout call per frame produces the one
// authoritative id→pose+rects map. Hit tests and rendering both read it.
// No other code computes widget poses.
//
// [LAW:dataflow-not-control-flow] HIG hit padding is applied unconditionally
// to every widget — there is no "is this in a dense grid?" branch. The same
// math runs every frame; the inputs (visualSize, hitPadding) decide the output.
//
// [LAW:no-defensive-null-guards] The function returns null in exactly one
// case: the root anchor is unavailable this frame. Callers handle null as
// data ("skip this frame"); they never receive a half-laid-out panel.
//
// Focus-view containers consult an optional `focusStates` map keyed by
// container id. When a focus-view has no entry (or t === 0), it lays out
// children as an implicit column stack — its "collapsed" form. When t > 0,
// it places only the `rendered` child at the focus-view center with its
// visual + hit half-extents linearly mixed between the natural rectangle
// and halve(expandedSize) by t; siblings disappear from the laid-out map
// (and therefore from rendering and hit tests). [LAW:dataflow-not-control-flow]
// the renderer never sees an "is expanded?" branch — the mixed half-extents
// flow through the same RenderCommand path as any other widget.

import type { AnchorContext, Pose } from './anchors';
import { evaluateAnchor, composePose, quatRotateVec, quatConj } from './anchors';
import type { Container, Node, Vec2, Widget } from './widgets';
import { HIG_DEFAULTS, isWidget } from './widgets';

// Per-focus-view visual state — provided by xrUiStep, consumed here.
// `rendered` is the widget id currently occupying the expanded slot (which
// stays pinned to the last focused child while t collapses from 1 → 0).
// `t` is the tween amplitude in [0, 1]: 0 = collapsed, 1 = fully expanded.
export interface FocusViewVisualState { rendered: string | null; t: number }
export type FocusStates = ReadonlyMap<string, FocusViewVisualState>;

export interface Rect { halfExtent: Vec2 }

export interface LaidOut {
  pose: Pose;
  visualRect: Rect;
  hitRect: Rect;
  widget: Widget | null;          // null for the panel container; never null for leaves
  containerKind?: Container['kind'];
  parentId?: string;
  childrenIds: string[];
}

export interface XrRay { origin: number[]; dir: number[] }

type RootPanel = Container & { kind: 'panel' };

export function layout(
  root: RootPanel,
  ctx: AnchorContext,
  focusStates?: FocusStates,
): Map<string, LaidOut> | null {
  const pose = evaluateAnchor(root.anchor, ctx);
  if (!pose) return null;

  const out = new Map<string, LaidOut>();
  const widgetIds: string[] = [];
  // Panel children stack as an implicit column at the panel center.
  // Inner `group` containers override with their own layout direction.
  placeAsColumn(root.children, pose, { x: 0, y: 0 }, root.id, out, widgetIds, focusStates);

  out.set(root.id, {
    pose,
    visualRect: { halfExtent: halve(root.size) },
    hitRect:    { halfExtent: halve(root.size) },
    widget: null,
    containerKind: 'panel',
    childrenIds: widgetIds,
  });
  return out;
}

// ── PLACEMENT (recursive) ──────────────────────────────────────────────────

function placeNode(
  node: Node,
  parentPose: Pose,
  localOffset: Vec2,
  parentId: string,
  out: Map<string, LaidOut>,
  parentChildrenIds: string[],
  focusStates: FocusStates | undefined,
): void {
  if (isWidget(node)) {
    const m = measure(node, focusStates);
    out.set(node.id, {
      pose: composeLocal(parentPose, localOffset),
      visualRect: { halfExtent: m.visualHalf },
      hitRect:    { halfExtent: m.hitHalf },
      widget: node,
      parentId,
      childrenIds: [],
    });
    parentChildrenIds.push(node.id);
    return;
  }
  switch (node.kind) {
    case 'group':       placeGroup(node, parentPose, localOffset, parentId, out, parentChildrenIds, focusStates); return;
    case 'tabs': {
      const active = node.tabs.find(t => t.id === node.activeTabId);
      if (active) placeNode(active.body, parentPose, localOffset, parentId, out, parentChildrenIds, focusStates);
      return;
    }
    case 'focus-view': {
      placeFocusView(node, parentPose, localOffset, parentId, out, parentChildrenIds, focusStates);
      return;
    }
    case 'panel':
      // Nested panels are out of scope for ticket .10. A nested panel would
      // need its own anchor evaluation and would shadow the outer pose; that
      // composition is a future concern.
      return;
  }
}

function placeFocusView(
  node: Container & { kind: 'focus-view' },
  parentPose: Pose,
  localOffset: Vec2,
  parentId: string,
  out: Map<string, LaidOut>,
  parentChildrenIds: string[],
  focusStates: FocusStates | undefined,
): void {
  const state = focusStates?.get(node.id);
  const t = state?.t ?? 0;
  // The focus-view itself never appears in `out` — it is a layout container,
  // not a hittable surface, and treats its `parentId` the same as `group`
  // does: passed through to children so they chain to the panel root.
  if (t <= 0) {
    // Collapsed → behave as an implicit column of children.
    placeAsColumn(node.children, parentPose, localOffset, parentId, out, parentChildrenIds, focusStates);
    return;
  }
  // Expanded (or transitioning) → place only the rendered child at center.
  const renderedId = state?.rendered ?? null;
  const child = renderedId != null ? node.children.find(c => c.id === renderedId) : undefined;
  if (!child || !isWidget(child)) return;
  const natural = measure(child, focusStates);
  const expandedVisual = halve(node.expandedSize);
  const expandedHit: Vec2 = {
    x: Math.max(expandedVisual.x + child.hitPadding.x, HIG_DEFAULTS.minHitHalfExtent.x),
    y: Math.max(expandedVisual.y + child.hitPadding.y, HIG_DEFAULTS.minHitHalfExtent.y),
  };
  out.set(child.id, {
    pose: composeLocal(parentPose, localOffset),
    visualRect: { halfExtent: lerpVec(natural.visualHalf, expandedVisual, t) },
    hitRect:    { halfExtent: lerpVec(natural.hitHalf,    expandedHit,    t) },
    widget: child,
    parentId,
    childrenIds: [],
  });
  parentChildrenIds.push(child.id);
}

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function placeAsColumn(
  children: Node[],
  parentPose: Pose,
  origin: Vec2,
  parentId: string,
  out: Map<string, LaidOut>,
  parentChildrenIds: string[],
  focusStates: FocusStates | undefined,
): void {
  const measured = children.map(c => measure(c, focusStates));
  const gap = HIG_DEFAULTS.minNeighborHitGap;
  const totalH = stackExtent(measured, 'y', gap);
  let cursor = totalH / 2;
  for (let i = 0; i < children.length; i++) {
    const m = measured[i];
    const cy = cursor - m.hitHalf.y;
    placeNode(children[i], parentPose, { x: origin.x, y: origin.y + cy }, parentId, out, parentChildrenIds, focusStates);
    cursor -= m.hitHalf.y * 2 + gap;
  }
}

function placeGroup(
  g: Container & { kind: 'group' },
  parentPose: Pose,
  groupOrigin: Vec2,
  parentId: string,
  out: Map<string, LaidOut>,
  parentChildrenIds: string[],
  focusStates: FocusStates | undefined,
): void {
  const gap = Math.max(g.gap ?? 0, HIG_DEFAULTS.minNeighborHitGap);
  const measured = g.children.map(c => measure(c, focusStates));

  if (g.layout === 'row') {
    const totalW = stackExtent(measured, 'x', gap);
    let cursor = -totalW / 2;
    for (let i = 0; i < g.children.length; i++) {
      const m = measured[i];
      const cx = cursor + m.hitHalf.x;
      placeNode(g.children[i], parentPose, { x: groupOrigin.x + cx, y: groupOrigin.y }, parentId, out, parentChildrenIds, focusStates);
      cursor += m.hitHalf.x * 2 + gap;
    }
    return;
  }
  if (g.layout === 'column') {
    const totalH = stackExtent(measured, 'y', gap);
    let cursor = totalH / 2;
    for (let i = 0; i < g.children.length; i++) {
      const m = measured[i];
      const cy = cursor - m.hitHalf.y;
      placeNode(g.children[i], parentPose, { x: groupOrigin.x, y: groupOrigin.y + cy }, parentId, out, parentChildrenIds, focusStates);
      cursor -= m.hitHalf.y * 2 + gap;
    }
    return;
  }
  // grid: uniform cell sized by the largest child, packed cols × rows.
  const cols = Math.max(1, g.columns ?? 1);
  const cellW = Math.max(0, ...measured.map(m => m.hitHalf.x));
  const cellH = Math.max(0, ...measured.map(m => m.hitHalf.y));
  const rows = Math.ceil(g.children.length / cols);
  const totalW = cols * cellW * 2 + Math.max(0, cols - 1) * gap;
  const totalH = rows * cellH * 2 + Math.max(0, rows - 1) * gap;
  for (let i = 0; i < g.children.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx = -totalW / 2 + c * (cellW * 2 + gap) + cellW;
    const cy = totalH / 2 - r * (cellH * 2 + gap) - cellH;
    placeNode(g.children[i], parentPose, { x: groupOrigin.x + cx, y: groupOrigin.y + cy }, parentId, out, parentChildrenIds, focusStates);
  }
}

// ── MEASURE (recursive) ────────────────────────────────────────────────────
// Hit half-extent is what packing decisions use. Visual half-extent is what
// the renderer draws. Widgets compute both; containers derive their bounds
// from packing children with the same algorithm placement uses.

interface Measured { hitHalf: Vec2; visualHalf: Vec2 }

function measure(node: Node, focusStates: FocusStates | undefined): Measured {
  if (isWidget(node)) {
    const visualHalf = halve(node.visualSize);
    const hitHalf: Vec2 = {
      x: Math.max(visualHalf.x + node.hitPadding.x, HIG_DEFAULTS.minHitHalfExtent.x),
      y: Math.max(visualHalf.y + node.hitPadding.y, HIG_DEFAULTS.minHitHalfExtent.y),
    };
    return { hitHalf, visualHalf };
  }
  switch (node.kind) {
    case 'panel':
      return { hitHalf: halve(node.size), visualHalf: halve(node.size) };
    case 'group': {
      const gap = Math.max(node.gap ?? 0, HIG_DEFAULTS.minNeighborHitGap);
      const m = node.children.map(c => measure(c, focusStates));
      if (node.layout === 'row') {
        const w = stackExtent(m, 'x', gap);
        const h = m.length === 0 ? 0 : Math.max(...m.map(x => x.hitHalf.y * 2));
        return { hitHalf: { x: w / 2, y: h / 2 }, visualHalf: { x: w / 2, y: h / 2 } };
      }
      if (node.layout === 'column') {
        const h = stackExtent(m, 'y', gap);
        const w = m.length === 0 ? 0 : Math.max(...m.map(x => x.hitHalf.x * 2));
        return { hitHalf: { x: w / 2, y: h / 2 }, visualHalf: { x: w / 2, y: h / 2 } };
      }
      const cols = Math.max(1, node.columns ?? 1);
      const cellW = m.length === 0 ? 0 : Math.max(...m.map(x => x.hitHalf.x));
      const cellH = m.length === 0 ? 0 : Math.max(...m.map(x => x.hitHalf.y));
      const rows = Math.ceil(node.children.length / cols);
      const w = cols * cellW * 2 + Math.max(0, cols - 1) * gap;
      const h = rows * cellH * 2 + Math.max(0, rows - 1) * gap;
      return { hitHalf: { x: w / 2, y: h / 2 }, visualHalf: { x: w / 2, y: h / 2 } };
    }
    case 'tabs': {
      const active = node.tabs.find(t => t.id === node.activeTabId);
      return active ? measure(active.body, focusStates) : { hitHalf: { x: 0, y: 0 }, visualHalf: { x: 0, y: 0 } };
    }
    case 'focus-view': {
      // The focus-view's measured footprint is the column stack of children
      // regardless of expansion. The expanded child overflows this footprint
      // by design — its parent (the panel) carries its own fixed size, so
      // we never need to "reserve" the expanded area in the parent's layout.
      const gap = HIG_DEFAULTS.minNeighborHitGap;
      const m = node.children.map(c => measure(c, focusStates));
      const h = stackExtent(m, 'y', gap);
      const w = m.length === 0 ? 0 : Math.max(...m.map(x => x.hitHalf.x * 2));
      return { hitHalf: { x: w / 2, y: h / 2 }, visualHalf: { x: w / 2, y: h / 2 } };
    }
  }
}

function stackExtent(measured: Measured[], axis: 'x' | 'y', gap: number): number {
  let total = 0;
  for (let i = 0; i < measured.length; i++) {
    total += (axis === 'x' ? measured[i].hitHalf.x : measured[i].hitHalf.y) * 2;
    if (i > 0) total += gap;
  }
  return total;
}

function halve(v: Vec2): Vec2 { return { x: v.x / 2, y: v.y / 2 }; }

function composeLocal(parentPose: Pose, offset: Vec2): Pose {
  return composePose(parentPose, {
    position: [offset.x, offset.y, 0],
    orientation: [0, 0, 0, 1],
  });
}

// ── HIT TEST ───────────────────────────────────────────────────────────────
// Ray vs widget hit rectangle (oriented in 3D). Returns the closest widget id
// the ray pierces, or null. Skips containers — they are not hittable surfaces.

export function hitTestWidgets(laidOut: Map<string, LaidOut>, ray: XrRay): string | null {
  let bestId: string | null = null;
  let bestT = Infinity;
  for (const [id, entry] of laidOut) {
    if (!entry.widget) continue;
    const t = rayPlaneIntersectLocal(ray, entry.pose, entry.hitRect.halfExtent);
    if (t !== null && t < bestT) {
      bestT = t;
      bestId = id;
    }
  }
  return bestId;
}

// Transform ray to the widget's local frame (rect in z=0 plane). Returns
// the t value of intersection with the rect, or null on miss / behind origin.
function rayPlaneIntersectLocal(ray: XrRay, pose: Pose, half: Vec2): number | null {
  const conj = quatConj(pose.orientation);
  const localOrigin = quatRotateVec(conj, [
    ray.origin[0] - pose.position[0],
    ray.origin[1] - pose.position[1],
    ray.origin[2] - pose.position[2],
  ]);
  const localDir = quatRotateVec(conj, [ray.dir[0], ray.dir[1], ray.dir[2]]);
  if (Math.abs(localDir[2]) < 1e-9) return null; // ray parallel to plane
  const t = -localOrigin[2] / localDir[2];
  if (t <= 0) return null;
  const x = localOrigin[0] + t * localDir[0];
  const y = localOrigin[1] + t * localDir[1];
  if (Math.abs(x) > half.x || Math.abs(y) > half.y) return null;
  return t;
}

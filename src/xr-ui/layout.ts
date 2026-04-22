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

import type { AnchorContext, Pose } from './anchors';
import { evaluateAnchor, composePose, quatRotateVec, quatConj } from './anchors';
import type { Container, Node, Vec2, Widget } from './widgets';
import { HIG_DEFAULTS, isWidget } from './widgets';

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

export function layout(root: RootPanel, ctx: AnchorContext): Map<string, LaidOut> | null {
  const pose = evaluateAnchor(root.anchor, ctx);
  if (!pose) return null;

  const out = new Map<string, LaidOut>();
  const widgetIds: string[] = [];
  // Panel children stack as an implicit column at the panel center.
  // Inner `group` containers override with their own layout direction.
  placeAsColumn(root.children, pose, { x: 0, y: 0 }, root.id, out, widgetIds);

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
): void {
  if (isWidget(node)) {
    const m = measure(node);
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
    case 'group':       placeGroup(node, parentPose, localOffset, parentId, out, parentChildrenIds); return;
    case 'tabs': {
      const active = node.tabs.find(t => t.id === node.activeTabId);
      if (active) placeNode(active.body, parentPose, localOffset, parentId, out, parentChildrenIds);
      return;
    }
    case 'focus-view': {
      if (node.focused == null) return;
      const focused = node.children.find(c => c.id === node.focused);
      if (focused) placeNode(focused, parentPose, localOffset, parentId, out, parentChildrenIds);
      return;
    }
    case 'panel':
      // Nested panels are out of scope for ticket .10. A nested panel would
      // need its own anchor evaluation and would shadow the outer pose; that
      // composition is a future concern.
      return;
  }
}

function placeAsColumn(
  children: Node[],
  parentPose: Pose,
  origin: Vec2,
  parentId: string,
  out: Map<string, LaidOut>,
  parentChildrenIds: string[],
): void {
  const measured = children.map(measure);
  const gap = HIG_DEFAULTS.minNeighborHitGap;
  const totalH = stackExtent(measured, 'y', gap);
  let cursor = totalH / 2;
  for (let i = 0; i < children.length; i++) {
    const m = measured[i];
    const cy = cursor - m.hitHalf.y;
    placeNode(children[i], parentPose, { x: origin.x, y: origin.y + cy }, parentId, out, parentChildrenIds);
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
): void {
  const gap = Math.max(g.gap ?? 0, HIG_DEFAULTS.minNeighborHitGap);
  const measured = g.children.map(measure);

  if (g.layout === 'row') {
    const totalW = stackExtent(measured, 'x', gap);
    let cursor = -totalW / 2;
    for (let i = 0; i < g.children.length; i++) {
      const m = measured[i];
      const cx = cursor + m.hitHalf.x;
      placeNode(g.children[i], parentPose, { x: groupOrigin.x + cx, y: groupOrigin.y }, parentId, out, parentChildrenIds);
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
      placeNode(g.children[i], parentPose, { x: groupOrigin.x, y: groupOrigin.y + cy }, parentId, out, parentChildrenIds);
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
    placeNode(g.children[i], parentPose, { x: groupOrigin.x + cx, y: groupOrigin.y + cy }, parentId, out, parentChildrenIds);
  }
}

// ── MEASURE (recursive) ────────────────────────────────────────────────────
// Hit half-extent is what packing decisions use. Visual half-extent is what
// the renderer draws. Widgets compute both; containers derive their bounds
// from packing children with the same algorithm placement uses.

interface Measured { hitHalf: Vec2; visualHalf: Vec2 }

function measure(node: Node): Measured {
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
      const m = node.children.map(measure);
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
      return active ? measure(active.body) : { hitHalf: { x: 0, y: 0 }, visualHalf: { x: 0, y: 0 } };
    }
    case 'focus-view': {
      if (node.focused == null) return { hitHalf: { x: 0, y: 0 }, visualHalf: { x: 0, y: 0 } };
      const focused = node.children.find(c => c.id === node.focused);
      return focused ? measure(focused) : { hitHalf: { x: 0, y: 0 }, visualHalf: { x: 0, y: 0 } };
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

// Anchor abstraction for the XR UI rewrite.
//
// An Anchor is a *description* of where a panel lives in space; evaluateAnchor
// turns that description into a world-space Pose given the current hand and head
// data. Swapping the panel from "head-locked HUD" to "held in the off-hand"
// becomes a data change (new Anchor value), not a code branch through the
// renderer.
//
// [LAW:one-source-of-truth] evaluateAnchor is the ONE place that translates
// (hands + head) → world pose. Widgets never read hand poses directly; they
// consume the computed Pose from their container.
//
// [LAW:dataflow-not-control-flow] evaluateAnchor always runs. Variability lives
// in the return value (null when a source is unavailable); callers handle null
// as data — "skip layout this frame" — not by branching around the call.
//
// [LAW:no-defensive-null-guards] The null checks below test fields whose type
// already declares optionality (joints: ... | null, palmNormal: number[] | null).
// They translate "data is unavailable" into "return null"; they are not
// defensive guards around hidden bugs and they never substitute a default pose.
//
// [LAW:one-way-deps] This module imports nothing from the app. The spatial and
// input-frame primitives are owned by avp-gestures — anchors evaluates against
// avp-gestures' per-frame InputContext, and the app's hand frames satisfy
// InputFrame structurally and are passed without conversion.

// [LAW:one-source-of-truth] The spatial primitives and the per-hand input-frame
// live in avp-gestures; re-exported here so the barrel and menu-internal modules
// import them from one place.
export type { Hand, Pose, JointPose, InputFrame } from '@shader-playground/avp-gestures';
import type { Hand, Pose, JointPose, InputContext } from '@shader-playground/avp-gestures';

// The menu evaluates anchors against avp-gestures' per-frame InputContext. It is
// the SAME type, named for the menu's role; not a second declaration.
export type AnchorContext = InputContext;

export type Anchor =
  | { kind: 'world';    pose: Pose }
  | { kind: 'wrist';    hand: Hand; offset: Pose }
  | { kind: 'palm';     hand: Hand; offset: Pose; facing: 'up' | 'down' }
  | { kind: 'held';     hand: Hand; offset: Pose }
  | { kind: 'head-hud'; distance: number; offset: Pose };

const IDENTITY_QUAT: [number, number, number, number] = [0, 0, 0, 1];

export function quatConj(q: [number, number, number, number]): [number, number, number, number] {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function evaluateAnchor(anchor: Anchor, ctx: AnchorContext): Pose | null {
  switch (anchor.kind) {
    case 'world':
      return anchor.pose;

    case 'wrist':
    case 'held': {
      // 'held' shares wrist math today — the bimanual semantic difference
      // (visibility, ownership) lives outside anchor evaluation per ticket .9.
      const wrist = ctx.hands[anchor.hand].joints?.wrist ?? null;
      if (!wrist) return null;
      return composePose(jointToPose(wrist), anchor.offset);
    }

    case 'palm': {
      const hf = ctx.hands[anchor.hand];
      const wrist = hf.joints?.wrist ?? null;
      const normal = hf.palmNormal;
      if (!wrist || !normal) return null;
      // Position at the wrist; orientation rotates the panel's local +Z to face
      // along the palm normal so the surface is visible to the user. `facing`
      // is preserved on the Anchor for visibility gating (ticket .18) but does
      // not change the math here — palmNormal already encodes hand orientation.
      const palmPose: Pose = {
        position: vec3ToTuple(wrist.position),
        orientation: quatFromVectors([0, 0, 1], vec3ToTuple(normal)),
      };
      return composePose(palmPose, anchor.offset);
    }

    case 'head-hud': {
      if (!ctx.headPose) return null;
      // headPose · translate(0, 0, -distance) · offset. WebXR view space looks
      // down -Z, so a negative-Z translation places the panel `distance` meters
      // in front of the head.
      const inFront = composePose(ctx.headPose, {
        position: [0, 0, -anchor.distance],
        orientation: IDENTITY_QUAT,
      });
      return composePose(inFront, anchor.offset);
    }
  }
}

function jointToPose(j: JointPose): Pose {
  return {
    position: vec3ToTuple(j.position),
    orientation: quat4ToTuple(j.orientation),
  };
}

function vec3ToTuple(v: number[]): [number, number, number] {
  return [v[0], v[1], v[2]];
}

function quat4ToTuple(q: number[]): [number, number, number, number] {
  return [q[0], q[1], q[2], q[3]];
}

// Compose `parent · offset`: apply offset in parent's local frame, return the
// world-space pose. Equivalent to mat4(parent) * mat4(offset).
export function composePose(parent: Pose, offset: Pose): Pose {
  const rot = quatRotateVec(parent.orientation, offset.position);
  return {
    position: [
      parent.position[0] + rot[0],
      parent.position[1] + rot[1],
      parent.position[2] + rot[2],
    ],
    orientation: quatMul(parent.orientation, offset.orientation),
  };
}

export function quatMul(
  a: [number, number, number, number],
  b: [number, number, number, number],
): [number, number, number, number] {
  return [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
  ];
}

// v' = v + 2 * cross(q.xyz, cross(q.xyz, v) + q.w * v)  (Rodrigues, optimized)
export function quatRotateVec(
  q: [number, number, number, number],
  v: [number, number, number],
): [number, number, number] {
  const ux = q[0], uy = q[1], uz = q[2], w = q[3];
  const cx = uy * v[2] - uz * v[1];
  const cy = uz * v[0] - ux * v[2];
  const cz = ux * v[1] - uy * v[0];
  const tx = cx + w * v[0];
  const ty = cy + w * v[1];
  const tz = cz + w * v[2];
  return [
    v[0] + 2 * (uy * tz - uz * ty),
    v[1] + 2 * (uz * tx - ux * tz),
    v[2] + 2 * (ux * ty - uy * tx),
  ];
}

// Shortest rotation that maps unit vector `from` to unit vector `to`.
// Half-vector formulation; degenerates (from ≈ -to) get a 180° rotation
// around an arbitrary perpendicular.
function quatFromVectors(
  from: [number, number, number],
  to: [number, number, number],
): [number, number, number, number] {
  const fx = from[0], fy = from[1], fz = from[2];
  const tx = to[0], ty = to[1], tz = to[2];
  const d = fx*tx + fy*ty + fz*tz;
  if (d > 0.999999) return [0, 0, 0, 1];
  if (d < -0.999999) {
    const ax: [number, number, number] = Math.abs(fx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const px = fy * ax[2] - fz * ax[1];
    const py = fz * ax[0] - fx * ax[2];
    const pz = fx * ax[1] - fy * ax[0];
    const len = Math.hypot(px, py, pz) || 1;
    return [px/len, py/len, pz/len, 0];
  }
  const hx = fx + tx, hy = fy + ty, hz = fz + tz;
  const hLen = Math.hypot(hx, hy, hz);
  const hxn = hx / hLen, hyn = hy / hLen, hzn = hz / hLen;
  return [
    fy * hzn - fz * hyn,
    fz * hxn - fx * hzn,
    fx * hyn - fy * hxn,
    fx * hxn + fy * hyn + fz * hzn,
  ];
}

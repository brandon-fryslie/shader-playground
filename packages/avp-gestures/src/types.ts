// The data contracts of avp-gestures: the Apple Vision Pro hand input-frame, the
// richer substrate the adapter derives, and the intent-neutral gesture
// vocabulary. These are pure types — no values — so every other module (adapter,
// recognizer, convenience) imports them here with no risk of a barrel cycle.
// index.ts re-exports them, so consumers still import only from the package root.
// [LAW:one-source-of-truth] [LAW:one-way-deps]
//
// Apple Vision Pro specific throughout: every field means exactly what visionOS
// WebXR provides. A `| null` field is DATA describing that AVP tracking dropped
// that datum this frame — never a substituted default. [LAW:no-silent-failure]

export type Hand = 'left' | 'right';

// A spatial ray in reference-space coordinates: an origin and a direction.
export interface Ray {
  origin: number[];
  dir: number[];
}

// A rigid pose in reference-space: position + xyzw quaternion orientation.
export interface Pose {
  position: [number, number, number];
  orientation: [number, number, number, number];
}

// A tracked hand-joint pose. The radius WebXR additionally reports is not part of
// this contract — a consumer that needs it carries its own richer joint type.
export interface JointPose {
  position: number[];      // length 3
  orientation: number[];   // length 4 (xyzw)
}

// One Apple Vision Pro hand as the adapter derives it each frame:
//  - pinch: the thumb-index select WebXR reports — active flag, origin (hand
//    position captured at pinch-start), current (live hand position), startTime.
//  - gazeRay: the select ray FROZEN at pinch-start (drives selection hit-test).
//  - currentRay: the hand-steered select ray, live (drives slide-off-to-cancel).
//  - ray: the advisory laser derived from the hand pose (drives pre-pinch hover).
//  - joints.wrist: the wrist joint pose (panel anchoring + wrist-relative motion).
//  - palmNormal: unit normal of the palm (palm-facing gates, palm gestures).
export interface InputFrame {
  pinch: { active: boolean; origin: number[]; current: number[]; startTime: number };
  gazeRay: Ray | null;
  currentRay: Ray | null;
  ray: Ray | null;
  joints: { wrist: JointPose | null } | null;
  palmNormal: number[] | null;
}

// The per-frame spatial context: both hands plus the head pose. xr-ui's anchors
// evaluate panel placement against this; the menu aliases it as AnchorContext.
export interface InputContext {
  hands: Record<Hand, InputFrame>;
  headPose: Pose | null;
}

// ── The richer substrate the adapter produces and the recognizer consumes ──
// InputFrame is the MENU-facing projection; the recognizer needs strictly more:
// the wrist orientation (for wrist-flick) and finger-to-thumb grip contacts (for
// ring-pinch). HandInputFrame carries them. Because it EXTENDS InputFrame, a
// Record<Hand, HandInputFrame> is a Record<Hand, InputFrame> — the menu reads it
// as-is, no projection step. [LAW:decomposition] the menu contract stays narrow;
// the recognizer's extra inputs do not leak into it.
//
// The full 25-joint set is NOT here: only the adapter reads every joint (to
// derive palmNormal/grip/the advisory ray), and it exposes those as their own
// fields. Surfacing the whole joint record would drag the WebXR joint-name
// vocabulary into this public type and onto every consumer's compile for data
// none of them read. [LAW:decomposition]

// A tracked joint with the radius WebXR reports. Assignable to JointPose, so a
// HandInputFrame's wrist joint satisfies InputFrame's wrist-only joints contract.
export interface JointSample {
  position: number[];
  orientation: number[];
  radius: number;
}

// Thumb-to-fingertip contact state. Each flag is null when either tip is
// untracked — absence as data, never a default. [LAW:no-silent-failure]
export interface GripState {
  thumbIndex: boolean | null;
  thumbMiddle: boolean | null;
  thumbRing: boolean | null;
  thumbPinky: boolean | null;
}

export interface HandInputFrame extends InputFrame {
  joints: { wrist: JointSample | null } | null;
  grip: GripState | null;
}

// What the impure adapter yields each frame: both hands' rich frames + head pose.
// Assignable to InputContext (HandInputFrame extends InputFrame).
export interface InputSubstrate {
  hands: Record<Hand, HandInputFrame>;
  headPose: Pose | null;
}

// The closed, intent-NEUTRAL gesture vocabulary. Every variant is named for the
// MOTION or POSE the hand makes, never for what an app makes it mean — the
// consumer supplies meaning. [FRAMING:representation] Naming a variant for an app
// intent (a 'zoom', a 'fine-modifier') would couple this library to one app.
//
// `ring-pinch` is a thumb-to-RING-finger contact, distinct from the thumb-index
// `pinch` WebXR surfaces as select. The app happens to use a held ring-pinch as a
// precision modifier, but the pose itself is just a ring pinch — so it is named
// for the pose, not the modifier role.
export type XrGesture =
  | { kind: 'pinch-start'; hand: Hand; gazeRay: Ray }
  | { kind: 'pinch-hold'; hand: Hand; dur: number }
  | { kind: 'pinch-end'; hand: Hand; dur: number }
  | { kind: 'two-hand-pinch-start' }
  | { kind: 'two-hand-pinch-end' }
  | { kind: 'ring-pinch-on'; hand: Hand }
  | { kind: 'ring-pinch-off'; hand: Hand }
  | { kind: 'palm-up'; hand: Hand }
  | { kind: 'palm-down'; hand: Hand }
  | { kind: 'wrist-flick'; hand: Hand; axis: 'roll' | 'pitch' | 'yaw'; sign: 1 | -1 };

// What the adapter + recognizer produce each frame: the input frame the menu
// consumes and the gestures the app maps to actions, derived ONCE per frame and
// shared by both. [LAW:one-source-of-truth]
export interface AvpFrameResult {
  input: InputContext;
  gestures: XrGesture[];
}

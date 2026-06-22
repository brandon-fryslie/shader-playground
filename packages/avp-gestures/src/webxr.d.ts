// Standard WebXR types the input adapter reads. The repo has no @types/webxr and
// TypeScript's DOM lib omits WebXR, so these are hand-authored. They live HERE,
// in the shared library, because avp-gestures is the package closest to the raw
// WebXR frame — it is the one part that must type-check standalone against these.
// [LAW:one-source-of-truth] The app's webxr-gpu.d.ts no longer re-declares them;
// it only augments these interfaces with the extra members the renderer/session
// need (XRSession.requestReferenceSpace, XRViewerPose.views, …) and owns the
// WebGPU-binding types (XRGPUBinding etc.) that avp-gestures never touches.
//
// This is an ambient (global-script) declaration file: no imports/exports, so the
// types are global in both the standalone package compile and the app compile.
// Only `interface`s appear here — they merge with the app's augmentations — plus
// the one `type` alias (XRHandJoint) the adapter needs, declared in exactly one
// place so the merged app compile sees no duplicate identifier.

interface XRSpace extends EventTarget {}

interface XRReferenceSpace extends XRSpace {}

interface XRRigidTransform {
  readonly position: DOMPointReadOnly;
  readonly orientation: DOMPointReadOnly;
  readonly matrix: Float32Array;
}

interface XRPose {
  readonly transform: XRRigidTransform;
}

interface XRJointPose extends XRPose {
  readonly radius: number;
}

interface XRViewerPose {
  readonly transform: XRRigidTransform;
}

interface XRInputSource {
  readonly handedness: 'none' | 'left' | 'right';
  readonly targetRayMode: 'gaze' | 'tracked-pointer' | 'screen';
  readonly targetRaySpace: XRSpace;
  readonly gripSpace?: XRSpace;
  readonly hand?: XRHand | null;
}

// The 25 standard WebXR hand-joint names, spelled exactly as the spec reports.
type XRHandJoint =
  | 'wrist'
  | 'thumb-metacarpal' | 'thumb-phalanx-proximal' | 'thumb-phalanx-distal' | 'thumb-tip'
  | 'index-finger-metacarpal' | 'index-finger-phalanx-proximal' | 'index-finger-phalanx-intermediate' | 'index-finger-phalanx-distal' | 'index-finger-tip'
  | 'middle-finger-metacarpal' | 'middle-finger-phalanx-proximal' | 'middle-finger-phalanx-intermediate' | 'middle-finger-phalanx-distal' | 'middle-finger-tip'
  | 'ring-finger-metacarpal' | 'ring-finger-phalanx-proximal' | 'ring-finger-phalanx-intermediate' | 'ring-finger-phalanx-distal' | 'ring-finger-tip'
  | 'pinky-finger-metacarpal' | 'pinky-finger-phalanx-proximal' | 'pinky-finger-phalanx-intermediate' | 'pinky-finger-phalanx-distal' | 'pinky-finger-tip';

interface XRJointSpace extends XRSpace {
  readonly jointName: XRHandJoint;
}

// XRHand is iterable like a Map<XRHandJoint, XRJointSpace>; the adapter only
// needs keyed lookup.
interface XRHand {
  get(key: XRHandJoint): XRJointSpace | undefined;
}

interface XRFrame {
  getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;
  getPose(space: XRSpace, baseSpace: XRSpace): XRPose | null;
  getJointPose(joint: XRJointSpace, baseSpace: XRSpace): XRJointPose | null;
  readonly session: XRSession;
}

interface XRSession extends EventTarget {
  readonly inputSources: readonly XRInputSource[];
}

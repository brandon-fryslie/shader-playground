// Public surface of avp-gestures: the Apple Vision Pro hand input substrate and
// the intent-neutral gesture vocabulary, plus the two layers that produce them —
// the impure WebXR adapter and the PURE recognizer — and a convenience that runs
// both per frame. Consumers import only from here. [LAW:one-source-of-truth]
// [LAW:one-way-deps] xr-ui imports the input-frame types; the app imports the
// gesture vocabulary and the per-frame entry; neither re-declares them.
//
// Apple Vision Pro specific throughout: every field means exactly what visionOS
// WebXR provides. A `| null` field is DATA describing that AVP tracking dropped
// that datum this frame — never a substituted default. [LAW:no-silent-failure]

// Data contracts: spatial primitives, the menu-facing input frame, the richer
// adapter substrate, and the gesture vocabulary.
export type {
  Hand,
  Ray,
  Pose,
  JointPose,
  InputFrame,
  InputContext,
  JointSample,
  GripState,
  HandInputFrame,
  InputSubstrate,
  XrGesture,
  AvpFrameResult,
} from './types';

// The impure boundary: the only WebXR reads in the library.
export { createAvpInputAdapter, type AvpInputAdapter } from './adapter';

// The pure recognizer: a deterministic function of (frames, state, now),
// unit-testable with synthetic frames and no headset.
export { recognizeGestures, makeRecognizerState, type RecognizerState } from './recognizer';

// The per-frame composition: adapter then recognizer, returning input + gestures.
export { createAvpInput, type AvpInput } from './input';

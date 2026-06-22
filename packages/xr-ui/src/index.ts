// Public surface of the xr-ui menu foundation. This barrel IS the package
// contract: consumers import only from here, never from internal modules.
// [LAW:one-source-of-truth] The spatial and input-frame primitives (Hand, Pose,
// JointPose, the per-hand input-frame) are owned by avp-gestures; anchors
// re-exports them so this barrel exposes one canonical set. AnchorContext is the
// menu's alias for avp-gestures' InputContext.

// Anchors: spatial placement of menu panels + quaternion helpers.
export type { Anchor, Pose, JointPose, AnchorContext, Hand } from './anchors';
export { evaluateAnchor, composePose, quatConj, quatMul, quatRotateVec } from './anchors';

// Widgets: the widget/container tree and its shared defaults.
export type {
  Widget,
  Container,
  Node,
  Vec2,
  WidgetCommon,
  ContainerCommon,
  PreviewSpec,
  SummarySpec,
  ContinuousInteraction,
  VisibilityGate,
} from './widgets';
export { HIG_DEFAULTS, isWidget } from './widgets';

// Bindings: the registry that maps widget interactions to app-supplied behavior.
export type {
  Binding,
  BindingCommon,
  ContinuousBinding,
  ToggleBinding,
  EnumBinding,
  ActionBinding,
} from './bindings';
export { BindingRegistry } from './bindings';

// Layout: place the widget tree in space and hit-test rays against it.
export type {
  LaidOut,
  Rect,
  HitTestResult,
  XrRay,
  FocusStates,
  FocusViewVisualState,
} from './layout';
export { layout, hitTestWidgets } from './layout';

// Step: the per-frame interaction update and its side-effect application.
export type {
  XrUiPrev,
  XrUiRegistry,
  XrUiStepResult,
  XrUiTuning,
  XrUiSideEffect,
  InteractionState,
  RenderCommand,
  SubZoneRenderState,
  PanelVisibilityState,
} from './step';
export { xrUiStep, applySideEffects, makeIdlePrev, uiHandClaimed } from './step';

// Renderer: the GPU factory that draws the laid-out menu.
export type { XrWidgetRenderer } from './renderer';
export { createXrWidgetRenderer } from './renderer';

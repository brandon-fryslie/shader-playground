// WebXR + WebGPU integration types
// TypeScript's DOM lib has incomplete/missing WebXR types, so we declare them here.

// ── Core WebXR types ──

type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';
type XREye = 'none' | 'left' | 'right';

interface XRSessionInit {
  requiredFeatures?: string[];
  optionalFeatures?: string[];
}

interface XRRenderStateInit {
  layers?: XRLayer[];
  depthNear?: number;
  depthFar?: number;
  baseLayer?: XRWebGLLayer;
}

interface XRSystem {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
  requestSession(mode: XRSessionMode, init?: XRSessionInit): Promise<XRSession>;
}

interface XRSession extends EventTarget {
  readonly enabledFeatures?: readonly string[];
  readonly inputSources: readonly XRInputSource[];
  requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  updateRenderState(init?: XRRenderStateInit): void;
  end(): Promise<void>;
}

type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void;

interface XRFrame {
  getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;
  getPose(space: XRSpace, baseSpace: XRSpace): XRPose | null;
  getJointPose(joint: XRJointSpace, baseSpace: XRSpace): XRJointPose | null;
  readonly session: XRSession;
}

interface XRSpace extends EventTarget {}

interface XRReferenceSpace extends XRSpace {
  getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace;
}

interface XRPose {
  readonly transform: XRRigidTransform;
}

interface XRInputSource {
  readonly handedness: 'none' | 'left' | 'right';
  readonly targetRayMode: 'gaze' | 'tracked-pointer' | 'screen';
  readonly targetRaySpace: XRSpace;
  readonly gripSpace?: XRSpace;
  readonly hand?: XRHand | null;
}

// ── Hand tracking ──
// Standard WebXR hand joint names (25 total). Names match the spec exactly.
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

interface XRJointPose extends XRPose {
  readonly radius: number;
}

// XRHand is iterable like a Map<XRHandJoint, XRJointSpace>. We only need `.get` here.
interface XRHand {
  readonly size: number;
  get(key: XRHandJoint): XRJointSpace | undefined;
  [Symbol.iterator](): IterableIterator<[XRHandJoint, XRJointSpace]>;
}

interface XRInputSourceEvent extends Event {
  readonly frame: XRFrame;
  readonly inputSource: XRInputSource;
}

interface XRViewerPose {
  readonly views: readonly XRView[];
  readonly transform: XRRigidTransform;
}

interface XRView {
  readonly eye: XREye;
  readonly projectionMatrix: Float32Array;
  readonly transform: XRRigidTransform;
}

interface XRRigidTransform {
  readonly position: DOMPointReadOnly;
  readonly orientation: DOMPointReadOnly;
  readonly matrix: Float32Array;
  readonly inverse: XRRigidTransform;
}

interface XRViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface XRLayer extends EventTarget {}
interface XRWebGLLayer extends XRLayer {}

interface Navigator {
  readonly xr?: XRSystem;
}

// ── WebXR + WebGPU binding types ──

declare class XRGPUBinding {
  constructor(session: XRSession, device: GPUDevice);
  readonly nativeProjectionScaleFactor: number;
  createProjectionLayer(init?: XRGPUProjectionLayerInit): XRProjectionLayer;
  getViewSubImage?(layer: XRProjectionLayer, view: XRView): XRGPUSubImage;
  getSubImage?(layer: XRProjectionLayer, view: XRView): XRGPUSubImage;
  getPreferredColorFormat(): GPUTextureFormat;
}

interface XRGPUProjectionLayerInit {
  colorFormat?: GPUTextureFormat;
  depthStencilFormat?: GPUTextureFormat;
  scaleFactor?: number;
  textureType?: 'texture' | 'texture-array';
}

interface XRGPUSubImage {
  readonly colorTexture: GPUTexture;
  readonly depthStencilTexture: GPUTexture | null;
  readonly viewport: XRViewport;
  getViewDescriptor(): GPUTextureViewDescriptor;
}

interface XRProjectionLayer extends XRLayer {
  readonly textureWidth: number;
  readonly textureHeight: number;
}

// Augment GPURequestAdapterOptions for XR compatibility
interface GPURequestAdapterOptions {
  xrCompatible?: boolean;
}

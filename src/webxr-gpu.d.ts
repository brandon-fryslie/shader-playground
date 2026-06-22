// WebXR + WebGPU integration types owned by the APP.
//
// The standard WebXR hand/frame/pose types now live in avp-gestures
// (packages/avp-gestures/src/webxr.d.ts) — the package closest to the raw frame
// owns them so it type-checks standalone. [LAW:one-source-of-truth] This file
// keeps only what avp-gestures does not need: the WebGPU-binding types the
// renderer uses, the session/rendering types, and small AUGMENTATIONS that add
// the extra members the app reads onto interfaces avp-gestures declares (those
// `interface` re-openings merge; they never re-declare the whole shape).

// ── App-only WebXR session/rendering types ──

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

type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void;

interface XRInputSourceEvent extends Event {
  readonly frame: XRFrame;
  readonly inputSource: XRInputSource;
}

interface XRView {
  readonly eye: XREye;
  readonly projectionMatrix: Float32Array;
  readonly transform: XRRigidTransform;
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

// ── Augmentations of the WebXR interfaces avp-gestures owns ──
// These re-open the base interfaces (declared in avp-gestures/src/webxr.d.ts)
// and add the members only the app's session setup / renderer reads.

interface XRSession {
  readonly enabledFeatures?: readonly string[];
  requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  updateRenderState(init?: XRRenderStateInit): void;
  end(): Promise<void>;
}

interface XRReferenceSpace {
  getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace;
}

interface XRViewerPose {
  readonly views: readonly XRView[];
}

interface XRRigidTransform {
  readonly inverse: XRRigidTransform;
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

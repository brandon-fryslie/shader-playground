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
  requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  updateRenderState(init?: XRRenderStateInit): void;
  end(): Promise<void>;
}

type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void;

interface XRFrame {
  getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;
  readonly session: XRSession;
}

interface XRReferenceSpace extends EventTarget {
  getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace;
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

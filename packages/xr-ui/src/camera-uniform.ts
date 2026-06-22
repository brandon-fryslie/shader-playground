// Single source of truth for the widget renderer's per-eye camera uniform byte
// layout. [LAW:one-source-of-truth] The WGSL `Camera` struct in xr-widgets.wgsl
// is the other half of this contract; the two MUST agree on offsets. That
// agreement is what camera-uniform.gpu.test.ts pins by compiling the real
// shader and reading back rendered pixels — neither tsc nor the build can catch
// a divergence, since the WGSL is an opaque string and these offsets are
// numbers. [LAW:effects-at-boundaries] This module is pure: it owns the layout
// and the packing, never a GPU resource. The renderer owns the buffer.
//
// Layout (floats), matching the WGSL uniform address-space rules for the
// `Camera` struct (mat4 align/size 16/64; vec3 align 16; trailing f32 pad):
//   floats  0..15  view  (mat4)        bytes   0..63
//   floats 16..31  proj  (mat4)        bytes  64..127
//   floats 32..34  primary   (35 pad)  bytes 128..143
//   floats 36..38  secondary (39 pad)  bytes 144..159
//   floats 40..42  accent    (43 pad)  bytes 160..175
// = 176 bytes. Per-eye slices are 256-aligned (minUniformBufferOffsetAlignment).

export const CAMERA_FLOATS = 44;
export const CAMERA_SIZE = CAMERA_FLOATS * 4;   // 176 — sizeof(Camera) in WGSL
export const CAMERA_STRIDE = 256;               // per-eye slice, 256-aligned
export const EYE_COUNT = 2;                      // Apple Vision Pro stereo

// Float offsets of each member within one eye's slice. The pad floats between
// the colour vec3s are never written — the scratch they land in is zeroed once.
const VIEW_OFFSET = 0;
const PROJ_OFFSET = 16;
const PRIMARY_OFFSET = 32;
const SECONDARY_OFFSET = 36;
const ACCENT_OFFSET = 40;

// Per-eye geometry the host supplies each draw. Column-major mat4 (16 floats
// each), the same convention WebXR's XRView matrices use. Distinct per eye.
export interface XrWidgetCamera {
  view: Float32Array;
  proj: Float32Array;
}

// The menu's theme palette. Shared across both eyes; rgb triplets. A separate
// concern from camera geometry [LAW:decomposition] — the host owes both, but as
// two values, not one fused buffer.
export interface XrWidgetTheme {
  primary: ArrayLike<number>;
  secondary: ArrayLike<number>;
  accent: ArrayLike<number>;
}

// Pack one eye's view+proj+palette into `scratch` (length CAMERA_FLOATS) in the
// layout above. The sole place that knows the byte layout. [LAW:single-enforcer]
// Returns the same scratch for chaining into queue.writeBuffer.
export function packCameraUniform(
  scratch: Float32Array,
  camera: XrWidgetCamera,
  theme: XrWidgetTheme,
): Float32Array {
  scratch.set(camera.view, VIEW_OFFSET);
  scratch.set(camera.proj, PROJ_OFFSET);
  scratch.set(theme.primary, PRIMARY_OFFSET);
  scratch.set(theme.secondary, SECONDARY_OFFSET);
  scratch.set(theme.accent, ACCENT_OFFSET);
  return scratch;
}

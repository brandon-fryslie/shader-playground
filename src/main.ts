import '../styles/main.css';
import type { SimMode, Simulation, AppState, ThemeColors, RGBThemeColors, ParamDef, ParamSection, ShapeParamDef, XRCameraOverride, DepthRef, ModeParamsMap, ShapeName } from './types';

// WGSL shader imports — Vite loads these as raw strings
import SHADER_BOIDS_COMPUTE from './shaders/boids.compute.wgsl?raw';
import SHADER_BOIDS_RENDER from './shaders/boids.render.wgsl?raw';
import SHADER_NBODY_COMPUTE from './shaders/nbody.compute.wgsl?raw';
import SHADER_NBODY_RENDER from './shaders/nbody.render.wgsl?raw';
import SHADER_FLUID_FORCES_ADVECT from './shaders/fluid.forces.wgsl?raw';
import SHADER_FLUID_DIFFUSE from './shaders/fluid.diffuse.wgsl?raw';
import SHADER_FLUID_PRESSURE from './shaders/fluid.pressure.wgsl?raw';
import SHADER_FLUID_DIVERGENCE from './shaders/fluid.divergence.wgsl?raw';
import SHADER_FLUID_GRADIENT from './shaders/fluid.gradient.wgsl?raw';
import SHADER_FLUID_RENDER from './shaders/fluid.render.wgsl?raw';
import SHADER_PARAMETRIC_COMPUTE from './shaders/parametric.compute.wgsl?raw';
import SHADER_PARAMETRIC_RENDER from './shaders/parametric.render.wgsl?raw';
import SHADER_GRID from './shaders/grid.wgsl?raw';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS, DEFAULTS, PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULTS: ModeParamsMap = {
  boids: {
    count: 1000, separationRadius: 25, alignmentRadius: 50, cohesionRadius: 50,
    maxSpeed: 2.0, maxForce: 0.05, visualRange: 100
  },
  physics: {
    count: 2000, G: 1.0, softening: 0.5, damping: 0.999, distribution: 'disk'
  },
  fluid: {
    resolution: 256, viscosity: 0.1, diffusionRate: 0.001, forceStrength: 100,
    dyeMode: 'rainbow', jacobiIterations: 40
  },
  parametric: {
    shape: 'torus', scale: 1.0,
    p1Min: 0.7,    p1Max: 1.3,  p1Rate: 0.3,
    p2Min: 0.2,    p2Max: 0.55, p2Rate: 0.5,
    p3Min: 0.15,   p3Max: 0.45, p3Rate: 0.7,
    p4Min: 0.5,    p4Max: 2.0,  p4Rate: 0.4,
    twistMin: 0.0, twistMax: 0.4, twistRate: 0.15,
  }
};

const PRESETS: Record<SimMode, Record<string, Record<string, number | string>>> = {
  boids: {
    'Default':     { ...DEFAULTS.boids },
    'Tight Flock': { count: 3000, separationRadius: 10, alignmentRadius: 30, cohesionRadius: 80, maxSpeed: 3.0, maxForce: 0.08, visualRange: 60 },
    'Dispersed':   { count: 2000, separationRadius: 60, alignmentRadius: 100, cohesionRadius: 20, maxSpeed: 1.5, maxForce: 0.03, visualRange: 200 },
    'Massive':     { count: 20000, separationRadius: 15, alignmentRadius: 40, cohesionRadius: 40, maxSpeed: 2.5, maxForce: 0.04, visualRange: 80 },
    'Slow Dance':  { count: 500, separationRadius: 40, alignmentRadius: 80, cohesionRadius: 100, maxSpeed: 0.5, maxForce: 0.01, visualRange: 150 },
  },
  physics: {
    'Default':  { ...DEFAULTS.physics },
    'Galaxy':   { count: 3000, G: 0.5, softening: 1.0, damping: 0.998, distribution: 'disk' },
    'Collapse': { count: 2000, G: 10.0, softening: 0.1, damping: 0.995, distribution: 'shell' },
    'Gentle':   { count: 1000, G: 0.1, softening: 2.0, damping: 0.9999, distribution: 'random' },
  },
  fluid: {
    'Default':   { ...DEFAULTS.fluid },
    'Thick':     { resolution: 256, viscosity: 0.8, diffusionRate: 0.005, forceStrength: 200, dyeMode: 'rainbow', jacobiIterations: 40 },
    'Turbulent': { resolution: 512, viscosity: 0.01, diffusionRate: 0.0001, forceStrength: 300, dyeMode: 'rainbow', jacobiIterations: 60 },
    'Ink Drop':  { resolution: 256, viscosity: 0.3, diffusionRate: 0.0, forceStrength: 50, dyeMode: 'single', jacobiIterations: 40 },
  },
  parametric: {
    'Default':       { shape: 'torus',   scale: 1.0, p1Min: 0.7,  p1Max: 1.3,  p1Rate: 0.3,  p2Min: 0.2,  p2Max: 0.55, p2Rate: 0.5,  p3Min: 0.15, p3Max: 0.45, p3Rate: 0.7,  p4Min: 0.5, p4Max: 2.0, p4Rate: 0.4,  twistMin: 0,   twistMax: 0.4, twistRate: 0.15 },
    'Rippling Ring': { shape: 'torus',   scale: 1.0, p1Min: 0.5,  p1Max: 1.5,  p1Rate: 0.5,  p2Min: 0.15, p2Max: 0.7,  p2Rate: 0.7,  p3Min: 0.3,  p3Max: 0.8,  p3Rate: 1.0,  p4Min: 1.0, p4Max: 3.0, p4Rate: 0.6,  twistMin: 0,   twistMax: 1.0, twistRate: 0.2  },
    'Wild Möbius':   { shape: 'mobius',  scale: 1.5, p1Min: 0.8,  p1Max: 2.0,  p1Rate: 0.3,  p2Min: 1.0,  p2Max: 3.0,  p2Rate: 0.15, p3Min: 0.2,  p3Max: 0.6,  p3Rate: 0.8,  p4Min: 0.5, p4Max: 2.5, p4Rate: 0.5,  twistMin: 1.0, twistMax: 4.0, twistRate: 0.1  },
    'Trefoil Pulse': { shape: 'trefoil', scale: 1.2, p1Min: 0.08, p1Max: 0.35, p1Rate: 0.9,  p2Min: 0.25, p2Max: 0.55, p2Rate: 0.4,  p3Min: 0.3,  p3Max: 0.9,  p3Rate: 1.2,  p4Min: 1.0, p4Max: 4.0, p4Rate: 0.7,  twistMin: 0,   twistMax: 0.5, twistRate: 0.2  },
    'Klein Chaos':   { shape: 'klein',   scale: 1.2, p1Min: 0.5,  p1Max: 1.5,  p1Rate: 0.4,  p2Min: 0,    p2Max: 0,    p2Rate: 0,    p3Min: 0.2,  p3Max: 0.6,  p3Rate: 0.9,  p4Min: 0.8, p4Max: 3.5, p4Rate: 0.5,  twistMin: 0,   twistMax: 0.8, twistRate: 0.15 },
  },
};

const PARAM_DEFS: Record<SimMode, ParamSection[]> = {
  boids: [
    { section: 'Flock', params: [
      { key: 'count', label: 'Count', min: 100, max: 30000, step: 100, requiresReset: true },
      { key: 'visualRange', label: 'Visual Range', min: 10, max: 500, step: 5 },
    ]},
    { section: 'Forces', params: [
      { key: 'separationRadius', label: 'Separation', min: 1, max: 100, step: 1 },
      { key: 'alignmentRadius', label: 'Alignment', min: 1, max: 200, step: 1 },
      { key: 'cohesionRadius', label: 'Cohesion', min: 1, max: 200, step: 1 },
      { key: 'maxSpeed', label: 'Max Speed', min: 0.1, max: 10.0, step: 0.1 },
      { key: 'maxForce', label: 'Max Force', min: 0.001, max: 0.5, step: 0.001 },
    ]},
  ],
  physics: [
    { section: 'Simulation', params: [
      { key: 'count', label: 'Bodies', min: 10, max: 10000, step: 10, requiresReset: true },
      { key: 'G', label: 'Gravity (G)', min: 0.01, max: 100.0, step: 0.01 },
      { key: 'softening', label: 'Softening', min: 0.01, max: 10.0, step: 0.01 },
      { key: 'damping', label: 'Damping', min: 0.9, max: 1.0, step: 0.001 },
    ]},
    { section: 'Initial State', params: [
      { key: 'distribution', label: 'Distribution', type: 'dropdown', options: ['random', 'disk', 'shell'] },
    ]},
  ],
  fluid: [
    { section: 'Grid', params: [
      { key: 'resolution', label: 'Resolution', type: 'dropdown', options: [64, 128, 256, 512], requiresReset: true },
    ]},
    { section: 'Physics', params: [
      { key: 'viscosity', label: 'Viscosity', min: 0.0, max: 1.0, step: 0.01 },
      { key: 'diffusionRate', label: 'Diffusion', min: 0.0, max: 0.01, step: 0.0001 },
      { key: 'forceStrength', label: 'Force', min: 1, max: 500, step: 1 },
      { key: 'jacobiIterations', label: 'Iterations', min: 10, max: 80, step: 5 },
    ]},
    { section: 'Appearance', params: [
      { key: 'dyeMode', label: 'Dye Mode', type: 'dropdown', options: ['rainbow', 'single', 'temperature'] },
    ]},
  ],
  parametric: [
    { section: 'Shape', params: [
      { key: 'shape', label: 'Equation', type: 'dropdown', options: ['torus', 'klein', 'mobius', 'sphere', 'trefoil'] },
    ]},
    { section: 'Shape Parameters', id: 'shape-params-section', params: [], dynamic: true },
    { section: 'Transform', params: [
      { key: 'scale', label: 'Scale', min: 0.1, max: 5.0, step: 0.1 },
    ]},
    { section: 'Twist', params: [
      { key: 'twistMin',  label: 'Min',  min: 0.0, max: 12.56, step: 0.05 },
      { key: 'twistMax',  label: 'Max',  min: 0.0, max: 12.56, step: 0.05 },
      { key: 'twistRate', label: 'Rate', min: 0.0, max: 3.0,   step: 0.05 },
    ]},
    { section: 'Wave Amplitude', params: [
      { key: 'p3Min',  label: 'Min',  min: 0.0, max: 2.0, step: 0.05 },
      { key: 'p3Max',  label: 'Max',  min: 0.0, max: 2.0, step: 0.05 },
      { key: 'p3Rate', label: 'Rate', min: 0.0, max: 3.0, step: 0.05 },
    ]},
    { section: 'Wave Frequency', params: [
      { key: 'p4Min',  label: 'Min',  min: 0.0, max: 5.0, step: 0.1  },
      { key: 'p4Max',  label: 'Max',  min: 0.0, max: 5.0, step: 0.1  },
      { key: 'p4Rate', label: 'Rate', min: 0.0, max: 3.0, step: 0.05 },
    ]},
  ],
};

const COLOR_THEMES: Record<string, ThemeColors> = {
  'Dracula':       { primary: '#BD93F9', secondary: '#FF79C6', accent: '#50FA7B', bg: '#282A36', fg: '#F8F8F2' },
  'Nord':          { primary: '#88C0D0', secondary: '#81A1C1', accent: '#A3BE8C', bg: '#2E3440', fg: '#D8DEE9' },
  'Monokai':       { primary: '#AE81FF', secondary: '#F82672', accent: '#A5E22E', bg: '#272822', fg: '#D6D6D6' },
  'Rose Pine':     { primary: '#C4A7E7', secondary: '#EBBCBA', accent: '#9CCFD8', bg: '#191724', fg: '#E0DEF4' },
  'Gruvbox':       { primary: '#85A598', secondary: '#F9BD2F', accent: '#B7BB26', bg: '#282828', fg: '#FBF1C7' },
  'Solarized':     { primary: '#268BD2', secondary: '#2AA198', accent: '#849900', bg: '#002B36', fg: '#839496' },
  'Tokyo Night':   { primary: '#BB9AF7', secondary: '#7AA2F7', accent: '#9ECE6A', bg: '#1A1B26', fg: '#A9B1D6' },
  'Catppuccin':    { primary: '#F5C2E7', secondary: '#CBA6F7', accent: '#ABE9B3', bg: '#181825', fg: '#CDD6F4' },
  'Atom One':      { primary: '#61AFEF', secondary: '#C678DD', accent: '#62F062', bg: '#282C34', fg: '#ABB2BF' },
  'Flexoki':       { primary: '#205EA6', secondary: '#24837B', accent: '#65800B', bg: '#100F0F', fg: '#FFFCF0' },
};

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function getThemeColors(): RGBThemeColors {
  const t = COLOR_THEMES[state.colorTheme] || COLOR_THEMES['Dracula'];
  return {
    primary: hexToRgb(t.primary),
    secondary: hexToRgb(t.secondary),
    accent: hexToRgb(t.accent),
    bg: hexToRgb(t.bg),
    fg: hexToRgb(t.fg),
    clearColor: { r: hexToRgb(t.bg)[0], g: hexToRgb(t.bg)[1], b: hexToRgb(t.bg)[2], a: 1 },
  };
}

// Dynamic access to mode-specific params — casts for TypeScript's correlated types limitation
function modeParams(mode: SimMode): Record<string, number | string> {
  return state[mode] as unknown as Record<string, number | string>;
}

const state: AppState = {
  mode: 'boids',
  colorTheme: 'Dracula',
  xrEnabled: false,
  paused: false,
  boids: { ...DEFAULTS.boids },
  physics: { ...DEFAULTS.physics },
  fluid: { ...DEFAULTS.fluid },
  parametric: { ...DEFAULTS.parametric },
  camera: { distance: 5.0, fov: 60, rotX: 0.3, rotY: 0.0, panX: 0, panY: 0 },
  mouse: { down: false, x: 0, y: 0, dx: 0, dy: 0, worldX: 0, worldY: 0, worldZ: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: WGSL SHADERS
// ═══════════════════════════════════════════════════════════════════════════════










const FLUID_GRID_RES = 96; // tessellation resolution for 3D fluid mesh

// Camera uniform buffer layout for stereo XR rendering.
// Each view's 192-byte Camera struct is placed at a 256-byte aligned offset so
// both eyes can coexist in one buffer. writeBuffer calls go to different offsets,
// so neither overwrites the other before the command buffer executes.
const CAMERA_SIZE = 192;   // sizeof(Camera) in WGSL
const CAMERA_STRIDE = 256; // >= CAMERA_SIZE, multiple of minUniformBufferOffsetAlignment
// [LAW:one-source-of-truth] Desktop projection range is owned here so every pass sees the same far-plane budget.
const DESKTOP_CAMERA_FAR = 160.0;


// All shape equations baked into one shader — shapeId uniform selects which runs.
// p1–p4 are per-shape parameters passed as uniforms (no recompilation on change).

// Shape ID mapping for the shader's switch statement
const SHAPE_IDS: Record<ShapeName, number> = { torus: 0, klein: 1, mobius: 2, sphere: 3, trefoil: 4 };

// Per-shape parameter definitions: label + default value for p1–p4
const SHAPE_PARAMS: Partial<Record<ShapeName, Record<string, ShapeParamDef>>> = {
  torus:   { p1: { label: 'Major Radius', animMin: 0.7,  animMax: 1.3,  animRate: 0.3,  min: 0.2,  max: 2.5, step: 0.05 },
             p2: { label: 'Minor Radius', animMin: 0.2,  animMax: 0.6,  animRate: 0.5,  min: 0.05, max: 1.2, step: 0.05 } },
  klein:   { p1: { label: 'Bulge',        animMin: 0.7,  animMax: 1.5,  animRate: 0.4,  min: 0.2,  max: 3.0, step: 0.05 } },
  mobius:  { p1: { label: 'Width',        animMin: 0.5,  animMax: 1.8,  animRate: 0.35, min: 0.1,  max: 3.0, step: 0.05 },
             p2: { label: 'Half-Twists',  animMin: 1.0,  animMax: 3.0,  animRate: 0.15, min: 0.5,  max: 5.0, step: 0.5  } },
  sphere:  { p1: { label: 'XY Stretch',  animMin: 0.6,  animMax: 1.5,  animRate: 0.4,  min: 0.1,  max: 3.0, step: 0.05 },
             p2: { label: 'Z Stretch',   animMin: 0.5,  animMax: 1.8,  animRate: 0.6,  min: 0.1,  max: 3.0, step: 0.05 } },
  trefoil: { p1: { label: 'Tube Radius', animMin: 0.08, animMax: 0.35, animRate: 0.6,  min: 0.05, max: 1.0, step: 0.05 },
             p2: { label: 'Knot Scale',  animMin: 0.25, animMax: 0.5,  animRate: 0.35, min: 0.1,  max: 1.0, step: 0.05 } },
};



// ═══════════════════════════════════════════════════════════════════════════════


// SECTION 3: MATH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const mat4 = {
  identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  },

  perspective(fovY: number, aspect: number, near: number, far: number) {
    const f = 1.0 / Math.tan(fovY * 0.5);
    const rangeInv = 1.0 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = far * rangeInv;
    out[11] = -1;
    out[14] = near * far * rangeInv;
    return out;
  },

  lookAt(eye: number[], target: number[], up: number[]) {
    const zAxis = normalize3(sub3(eye, target));
    const xAxis = normalize3(cross3(up, zAxis));
    const yAxis = cross3(zAxis, xAxis);
    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -dot3(xAxis, eye), -dot3(yAxis, eye), -dot3(zAxis, eye), 1
    ]);
  },

  multiply(a: ArrayLike<number>, b: ArrayLike<number>) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] +
                          a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
      }
    }
    return out;
  },

  rotateX(m: ArrayLike<number>, angle: number) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const r = mat4.identity();
    r[5] = c; r[6] = s; r[9] = -s; r[10] = c;
    return mat4.multiply(m, r);
  },

  rotateY(m: Float32Array, angle: number): Float32Array {
    const c = Math.cos(angle), s = Math.sin(angle);
    const r = mat4.identity();
    r[0] = c; r[2] = -s; r[8] = s; r[10] = c;
    return mat4.multiply(m, r);
  },

  rotateZ(m: ArrayLike<number>, angle: number) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const r = mat4.identity();
    r[0] = c; r[1] = s; r[4] = -s; r[5] = c;
    return mat4.multiply(m, r);
  },

  translate(m: ArrayLike<number>, x: number, y: number, z: number) {
    const t = mat4.identity();
    t[12] = x; t[13] = y; t[14] = z;
    return mat4.multiply(m, t);
  },
};

function normalize3(v: number[]): number[] {
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  return len > 0 ? [v[0]/len, v[1]/len, v[2]/len] : [0, 0, 0];
}
function cross3(a: number[], b: number[]): number[] {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function sub3(a: number[], b: number[]): number[] { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function dot3(a: number[], b: number[]): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

function getOrbitCamera() {
  const cam = state.camera;
  const eye = [
    cam.distance * Math.cos(cam.rotX) * Math.sin(cam.rotY),
    cam.distance * Math.sin(cam.rotX),
    cam.distance * Math.cos(cam.rotX) * Math.cos(cam.rotY)
  ];
  return {
    eye,
    view: mat4.lookAt(eye, [cam.panX, cam.panY, 0], [0, 1, 0]),
    proj: null // set per frame based on canvas aspect
  };
}

// When set by XR frame loop, overrides orbit camera and depth texture for all rendering
let xrCameraOverride: XRCameraOverride | null = null;
let xrDepthView: GPUTextureView | null = null;
const DESKTOP_SAMPLE_COUNT: number = 4;
const XR_SAMPLE_COUNT: number = 1;

function getOrCreateAttachmentTexture(
  current: GPUTexture | undefined,
  width: number,
  height: number,
  format: GPUTextureFormat,
  sampleCount: number
): GPUTexture {
  const matches = current &&
    current.width === width &&
    current.height === height &&
    current.format === format &&
    current.sampleCount === sampleCount;
  if (matches) return current;
  current?.destroy();
  return device.createTexture({
    size: [width, height],
    format,
    sampleCount,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

// Helper: get a depth texture view. In XR, use the XR-provided one.
// In desktop, manage a per-simulation depth texture that matches the canvas.
function getDepthView(simDepthRef: DepthRef): GPUTextureView {
  if (xrDepthView && renderSampleCount === 1) return xrDepthView;
  // Desktop path: create/resize depth texture to match canvas
  simDepthRef.tex = getOrCreateAttachmentTexture(simDepthRef.tex, canvas.width, canvas.height, 'depth24plus', renderSampleCount);
  return simDepthRef.tex.createView();
}

function getColorAttachment(
  simDepthRef: DepthRef,
  resolveTarget: GPUTextureView,
  viewport: number[] | null
): GPURenderPassColorAttachment {
  if (renderSampleCount === 1) {
    return {
      view: resolveTarget,
      clearValue: { r: 0.02, g: 0.02, b: 0.025, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    };
  }

  const width = viewport ? viewport[2] : canvas.width;
  const height = viewport ? viewport[3] : canvas.height;
  // [LAW:one-source-of-truth] MSAA color target sizing is derived from the active render target dimensions in one place.
  simDepthRef.msaaColorTex = getOrCreateAttachmentTexture(simDepthRef.msaaColorTex, width, height, renderTargetFormat, renderSampleCount);

  return {
    view: simDepthRef.msaaColorTex.createView(),
    resolveTarget,
    clearValue: { r: 0.02, g: 0.02, b: 0.025, a: 1 },
    loadOp: 'clear',
    storeOp: 'discard',
  };
}

function getDepthAttachment(simDepthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment {
  if (renderSampleCount > 1 && viewport) {
    const width = viewport[2];
    const height = viewport[3];
    simDepthRef.msaaDepthTex = getOrCreateAttachmentTexture(simDepthRef.msaaDepthTex, width, height, 'depth24plus', renderSampleCount);
    return {
      view: simDepthRef.msaaDepthTex.createView(),
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'discard',
    };
  }
  return {
    view: getDepthView(simDepthRef),
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  };
}

function getRenderViewport(viewport: number[] | null): number[] | null {
  if (!viewport) return null;
  if (renderSampleCount === 1) return viewport;
  // [LAW:one-source-of-truth] XR compositor viewport offsets apply only to the compositor-owned target; MSAA eye textures are sized to the eye rect itself.
  return [0, 0, viewport[2], viewport[3]];
}

function destroyDepthRef(depthRef: DepthRef) {
  depthRef.tex?.destroy();
  depthRef.msaaColorTex?.destroy();
  depthRef.msaaDepthTex?.destroy();
}

function getCameraUniformData(aspect: number) {
  const tc = getThemeColors();
  const data = new Float32Array(48);

  if (xrCameraOverride) {
    // Use XR-provided matrices (correct FOV, stereo offset, world-locked)
    data.set(xrCameraOverride.viewMatrix, 0);
    data.set(xrCameraOverride.projMatrix, 16);
    data.set(xrCameraOverride.eye, 32);
  } else {
    // Desktop: use orbit camera
    const cam = getOrbitCamera();
    const fovRad = state.camera.fov * Math.PI / 180;
    const proj = mat4.perspective(fovRad, aspect, 0.01, DESKTOP_CAMERA_FAR);
    data.set(cam.view, 0);
    data.set(proj, 16);
    data.set(cam.eye, 32);
  }

  // Theme colors (always appended)
  data.set(tc.primary, 36);
  data.set(tc.secondary, 40);
  data.set(tc.accent, 44);
  return data;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: WEBGPU INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

let device!: GPUDevice;
let canvas!: HTMLCanvasElement;
let context!: GPUCanvasContext;
let canvasFormat!: GPUTextureFormat;
let renderTargetFormat!: GPUTextureFormat;
let renderSampleCount = DESKTOP_SAMPLE_COUNT;

async function initWebGPU(): Promise<boolean> {
  const fallbackEl = document.getElementById('fallback')!;
  const showFallback = (msg: string): void => {
    fallbackEl.querySelector('p')!.textContent = msg;
    fallbackEl.classList.add('visible');
  };

  if (!navigator.gpu) {
    showFallback('navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.');
    return false;
  }

  let adapter;
  try {
    adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance', xrCompatible: true });
  } catch (e) {
    showFallback(`requestAdapter() failed: ${(e as Error).message}`);
    return false;
  }
  if (!adapter) {
    showFallback('requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.');
    return false;
  }

  try {
    device = await adapter.requestDevice();
  } catch (e) {
    showFallback(`requestDevice() failed: ${(e as Error).message}`);
    return false;
  }

  device.lost.then((info) => {
    console.error('WebGPU device lost:', info.message);
    if (info.reason !== 'destroyed') {
      initWebGPU().then(ok => { if (ok) { initGrid(); ensureSimulation(); requestAnimationFrame(frame); } });
    }
  });

  canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;
  context = canvas.getContext('webgpu') as GPUCanvasContext;
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  renderTargetFormat = renderTargetFormat || canvasFormat;
  renderSampleCount = renderSampleCount || DESKTOP_SAMPLE_COUNT;
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });

  return true;
}

function destroyAllSimulations() {
  for (const mode of Object.keys(simulations) as SimMode[]) {
    simulations[mode]?.destroy();
    delete simulations[mode];
  }
}

function syncRenderConfig(nextFormat: GPUTextureFormat, nextSampleCount: number) {
  if (renderTargetFormat === nextFormat && renderSampleCount === nextSampleCount) return;
  // [LAW:one-source-of-truth] All render pipelines and attachments derive from one active render config.
  renderTargetFormat = nextFormat;
  renderSampleCount = nextSampleCount;
  destroyAllSimulations();
  initGrid();
  ensureSimulation();
}


// ═══════════════════════════════════════════════════════════════════════════════
// ═══ SHARED GRID RENDERER ═══

let gridPipeline!: GPURenderPipeline;
let gridBGs!: GPUBindGroup[];
let gridCameraBuffer!: GPUBuffer;
let gridTimeBuffer!: GPUBuffer;
let gridTime = 0;

function initGrid() {
  gridCameraBuffer?.destroy();
  gridTimeBuffer?.destroy();
  gridCameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  gridTimeBuffer = device.createBuffer({ size: 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const gridModule = device.createShaderModule({ code: SHADER_GRID });

  const gridBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ]
  });

  gridPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [gridBGL] }),
    vertex: { module: gridModule, entryPoint: 'vs_main' },
    fragment: {
      module: gridModule, entryPoint: 'fs_main',
      targets: [{
        format: renderTargetFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        }
      }]
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: renderSampleCount },
  });

  gridBGs = [0, 1].map(vi => device.createBindGroup({ layout: gridBGL, entries: [
    { binding: 0, resource: { buffer: gridCameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
    { binding: 1, resource: { buffer: gridTimeBuffer } },
  ]}));
}

function renderGrid(pass: GPURenderPassEncoder, aspect: number, viewIndex = 0): void {
  gridTime += 0.016;
  device.queue.writeBuffer(gridCameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));
  device.queue.writeBuffer(gridTimeBuffer, 0, new Float32Array([gridTime]));
  pass.setPipeline(gridPipeline);
  pass.setBindGroup(0, gridBGs[viewIndex]);
  pass.draw(30);
}


// SECTION 5: SIMULATION MODULES
// ═══════════════════════════════════════════════════════════════════════════════

const simulations: Partial<Record<SimMode, Simulation>> = {};

// --- 5a: BOIDS ---

function createBoidsSimulation() {
  const count = state.boids.count;
  const particleBytes = count * 32; // vec3f pos (12) + pad(4) + vec3f vel (12) + pad(4) = 32

  // Initialize particles randomly in a cube
  const initData = new Float32Array(count * 8);
  const boundSize = 2.0;
  for (let i = 0; i < count; i++) {
    const off = i * 8;
    initData[off]     = (Math.random() - 0.5) * boundSize * 2;
    initData[off + 1] = (Math.random() - 0.5) * boundSize * 2;
    initData[off + 2] = (Math.random() - 0.5) * boundSize * 2;
    // pad
    initData[off + 4] = (Math.random() - 0.5) * 0.5;
    initData[off + 5] = (Math.random() - 0.5) * 0.5;
    initData[off + 6] = (Math.random() - 0.5) * 0.5;
    // pad
  }

  const bufferA = device.createBuffer({ size: particleBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();

  const bufferB = device.createBuffer({ size: particleBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

  // SimParams: dt, sepR, aliR, cohR, maxSpeed, maxForce, visualRange, count, boundSize,
  //            attractorX, attractorY, attractorZ, attractorActive = 13 values → 64 bytes
  const paramsBuffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const computeModule = device.createShaderModule({ code: SHADER_BOIDS_COMPUTE_EDIT || SHADER_BOIDS_COMPUTE });
  const renderModule = device.createShaderModule({ code: SHADER_BOIDS_RENDER_EDIT || SHADER_BOIDS_RENDER });

  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' }
  });

  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ]
  });

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule, entryPoint: 'fs_main',
      targets: [{ format: renderTargetFormat }]
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: renderSampleCount },
  });

  // Create bind groups for ping-pong
  const computeBG = [
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: bufferB } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: bufferA } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
  ];

  // renderBGs[viewIndex][pingPong] — per-eye camera offset × per-frame particle buffer
  const renderBGs: GPUBindGroup[][] = [0, 1].map(vi =>
    [bufferA, bufferB].map(buf => device.createBindGroup({ layout: renderBGL, entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
    ]}))
  );

  let pingPong = 0;
  const depthRef: DepthRef = {};

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = state.boids;
      const m = state.mouse;
      const fullParams = new Float32Array(16);
      fullParams[0] = 0.016;
      fullParams[1] = p.separationRadius / 50;
      fullParams[2] = p.alignmentRadius / 50;
      fullParams[3] = p.cohesionRadius / 50;
      fullParams[4] = p.maxSpeed;
      fullParams[5] = p.maxForce;
      fullParams[6] = p.visualRange / 50;
      // [7] = count (u32, set below)
      fullParams[8] = 2.0; // boundSize
      fullParams[9] = m.worldX;
      fullParams[10] = m.worldY;
      fullParams[11] = m.worldZ;
      fullParams[12] = m.down ? 1.0 : 0.0;
      new Uint32Array(fullParams.buffer)[7] = count;
      device.queue.writeBuffer(paramsBuffer, 0, fullParams);

      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();
      pingPong = 1 - pingPong;
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : (canvas.width / canvas.height);
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));

      const pass = encoder.beginRenderPass({
        colorAttachments: [getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: getDepthAttachment(depthRef, viewport),
      });

      const renderViewport = getRenderViewport(viewport);
      if (renderViewport) {
        pass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }

      renderGrid(pass, aspect, viewIndex);

      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBGs[viewIndex][pingPong]);
      pass.draw(3, count);
      pass.end();
    },

    getCount() { return count; },

    destroy() {
      bufferA.destroy(); bufferB.destroy();
      paramsBuffer.destroy(); cameraBuffer.destroy();
      destroyDepthRef(depthRef);
    }
  };
}

// --- 5b: N-BODY PHYSICS ---

function createPhysicsSimulation() {
  const count = state.physics.count;
  const bodyBytes = count * 32; // pos(12) + mass(4) + vel(12) + pad(4) = 32

  const initData = new Float32Array(count * 8);
  const dist = state.physics.distribution;
  for (let i = 0; i < count; i++) {
    const off = i * 8;
    let x, y, z, vx = 0, vy = 0, vz = 0;
    if (dist === 'disk') {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 2;
      x = Math.cos(angle) * r;
      y = (Math.random() - 0.5) * 0.1;
      z = Math.sin(angle) * r;
      // Orbital velocity
      const speed = 0.5 / Math.sqrt(r + 0.1);
      vx = -Math.sin(angle) * speed;
      vz = Math.cos(angle) * speed;
    } else if (dist === 'shell') {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 0.1;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
    } else {
      x = (Math.random() - 0.5) * 4;
      y = (Math.random() - 0.5) * 4;
      z = (Math.random() - 0.5) * 4;
    }
    initData[off] = x; initData[off + 1] = y; initData[off + 2] = z;
    initData[off + 3] = 0.5 + Math.random() * 2.0; // mass
    initData[off + 4] = vx; initData[off + 5] = vy; initData[off + 6] = vz;
  }

  const bufferA = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();
  const bufferB = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

  const paramsBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); // dt, G, soft, damp, count, pad*3, attractor*4
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const computeModule = device.createShaderModule({ code: SHADER_NBODY_COMPUTE_EDIT || SHADER_NBODY_COMPUTE });
  const renderModule = device.createShaderModule({ code: SHADER_NBODY_RENDER_EDIT || SHADER_NBODY_RENDER });

  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' }
  });

  // Attractor uniform for render shader (x, y, z, active = 16 bytes)
  const attractorBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ]
  });

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule, entryPoint: 'fs_main',
      targets: [{
        format: renderTargetFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        }
      }]
    },
    primitive: { topology: 'triangle-list' },
    // Additive-blended particles don't write depth but must declare the format
    // to match the render pass's depth attachment — omitting this causes a WebGPU
    // validation error that silently kills the entire render pass.
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    multisample: { count: renderSampleCount },
  });

  const computeBG = [
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: bufferB } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: bufferA } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
  ];

  // renderBGs[viewIndex][pingPong]
  const renderBGs: GPUBindGroup[][] = [0, 1].map(vi =>
    [bufferA, bufferB].map(buf => device.createBindGroup({ layout: renderBGL, entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
      { binding: 2, resource: { buffer: attractorBuffer } },
    ]}))
  );

  let pingPong = 0;
  const depthRef: DepthRef = {};

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = state.physics;
      const m = state.mouse;
      const paramsData = new ArrayBuffer(48);
      const f32 = new Float32Array(paramsData);
      const u32 = new Uint32Array(paramsData);
      f32[0] = 0.016; f32[1] = p.G * 0.001; f32[2] = p.softening; f32[3] = p.damping;
      u32[4] = count;
      f32[8] = m.worldX; f32[9] = m.worldY; f32[10] = m.worldZ;
      f32[11] = m.down ? 1.0 : 0.0;
      device.queue.writeBuffer(paramsBuffer, 0, new Uint8Array(paramsData));

      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();
      pingPong = 1 - pingPong;
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : (canvas.width / canvas.height);
      const m = state.mouse;
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));
      device.queue.writeBuffer(attractorBuffer, 0, new Float32Array([
        m.worldX, m.worldY, m.worldZ, m.down ? 1.0 : 0.0
      ]));

      const pass = encoder.beginRenderPass({
        colorAttachments: [getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: getDepthAttachment(depthRef, viewport),
      });

      const renderViewport = getRenderViewport(viewport);
      if (renderViewport) {
        pass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }

      renderGrid(pass, aspect, viewIndex);

      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBGs[viewIndex][pingPong]);
      pass.draw(6, count);
      pass.end();
    },

    getCount() { return count; },

    destroy() {
      bufferA.destroy(); bufferB.destroy();
      paramsBuffer.destroy(); cameraBuffer.destroy(); attractorBuffer.destroy();
      destroyDepthRef(depthRef);
    }
  };
}

// --- 5c: FLUID DYNAMICS ---

function createFluidSimulation() {
  const res = state.fluid.resolution;
  const cellCount = res * res;
  const velBytes = cellCount * 8;  // vec2f per cell
  const scalarBytes = cellCount * 4; // f32 per cell
  const dyeBytes = cellCount * 16; // vec4f per cell

  // All buffers get COPY_SRC so we can copy results back to canonical A buffers
  const BUF = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const velA = device.createBuffer({ size: velBytes, usage: BUF });
  const velB = device.createBuffer({ size: velBytes, usage: BUF });
  const pressA = device.createBuffer({ size: scalarBytes, usage: BUF });
  const pressB = device.createBuffer({ size: scalarBytes, usage: BUF });
  const divergenceBuf = device.createBuffer({ size: scalarBytes, usage: BUF });
  const dyeA = device.createBuffer({ size: dyeBytes, usage: BUF });
  const dyeB = device.createBuffer({ size: dyeBytes, usage: BUF });
  const paramsBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // Seed initial dye with theme-colored splats
  const initDye = new Float32Array(cellCount * 4);
  const tc = getThemeColors();
  const splats = [
    { x: 0.3, y: 0.3, r: tc.primary[0], g: tc.primary[1], b: tc.primary[2] },
    { x: 0.7, y: 0.7, r: tc.secondary[0], g: tc.secondary[1], b: tc.secondary[2] },
    { x: 0.5, y: 0.5, r: tc.accent[0], g: tc.accent[1], b: tc.accent[2] },
    { x: 0.2, y: 0.7, r: tc.primary[0] * 0.8, g: tc.accent[1], b: tc.secondary[2] },
    { x: 0.8, y: 0.3, r: tc.accent[0], g: tc.primary[1], b: tc.secondary[2] },
  ];
  // Also seed initial velocity for motion
  const initVel = new Float32Array(cellCount * 2);
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const i = y * res + x;
      const fx = x / res, fy = y / res;
      for (const s of splats) {
        const dx = fx - s.x, dy = fy - s.y;
        const d2 = dx * dx + dy * dy;
        const splat = Math.exp(-d2 / (2 * 0.02));
        initDye[i * 4]     += s.r * splat;
        initDye[i * 4 + 1] += s.g * splat;
        initDye[i * 4 + 2] += s.b * splat;
        initDye[i * 4 + 3] += splat;
      }
      // Swirl velocity
      const cx = fx - 0.5, cy = fy - 0.5;
      initVel[i * 2]     = -cy * 3.0;
      initVel[i * 2 + 1] =  cx * 3.0;
    }
  }
  device.queue.writeBuffer(dyeA, 0, initDye);
  device.queue.writeBuffer(velA, 0, initVel);

  // Compile shaders
  const forcesAdvectModule = device.createShaderModule({ code: SHADER_FLUID_FORCES_ADVECT_EDIT || SHADER_FLUID_FORCES_ADVECT });
  const diffuseModule = device.createShaderModule({ code: SHADER_FLUID_DIFFUSE_EDIT || SHADER_FLUID_DIFFUSE });
  const pressureModule = device.createShaderModule({ code: SHADER_FLUID_PRESSURE_EDIT || SHADER_FLUID_PRESSURE });
  const divergenceModule = device.createShaderModule({ code: SHADER_FLUID_DIVERGENCE_EDIT || SHADER_FLUID_DIVERGENCE });
  const gradientModule = device.createShaderModule({ code: SHADER_FLUID_GRADIENT_EDIT || SHADER_FLUID_GRADIENT });
  const renderModule = device.createShaderModule({ code: SHADER_FLUID_RENDER_EDIT || SHADER_FLUID_RENDER });

  // Forces + Advect pipeline: reads vel+dye from A, writes to B
  const faBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const faPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [faBGL] }),
    compute: { module: forcesAdvectModule, entryPoint: 'main' }
  });
  // Always reads A → writes B
  const faBG = device.createBindGroup({ layout: faBGL, entries: [
    { binding: 0, resource: { buffer: velA } }, { binding: 1, resource: { buffer: velB } },
    { binding: 2, resource: { buffer: dyeA } }, { binding: 3, resource: { buffer: dyeB } },
    { binding: 4, resource: { buffer: paramsBuffer } },
  ]});

  // Diffuse pipeline: ping-pong velocity
  const diffBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const diffPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [diffBGL] }),
    compute: { module: diffuseModule, entryPoint: 'main' }
  });
  const diffBGs = [
    device.createBindGroup({ layout: diffBGL, entries: [
      { binding: 0, resource: { buffer: velA } }, { binding: 1, resource: { buffer: velB } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
    device.createBindGroup({ layout: diffBGL, entries: [
      { binding: 0, resource: { buffer: velB } }, { binding: 1, resource: { buffer: velA } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
  ];

  // Divergence pipeline: reads vel, writes divergence
  const divBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const divPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [divBGL] }),
    compute: { module: divergenceModule, entryPoint: 'main' }
  });
  // Always reads velA (we copy back to A before this step)
  const divBG = device.createBindGroup({ layout: divBGL, entries: [
    { binding: 0, resource: { buffer: velA } },
    { binding: 1, resource: { buffer: divergenceBuf } },
    { binding: 2, resource: { buffer: paramsBuffer } },
  ]});

  // Pressure pipeline: ping-pong pressure
  const pressBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const pressPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [pressBGL] }),
    compute: { module: pressureModule, entryPoint: 'main' }
  });
  const pressBGs = [
    device.createBindGroup({ layout: pressBGL, entries: [
      { binding: 0, resource: { buffer: pressA } }, { binding: 1, resource: { buffer: pressB } },
      { binding: 2, resource: { buffer: divergenceBuf } }, { binding: 3, resource: { buffer: paramsBuffer } },
    ]}),
    device.createBindGroup({ layout: pressBGL, entries: [
      { binding: 0, resource: { buffer: pressB } }, { binding: 1, resource: { buffer: pressA } },
      { binding: 2, resource: { buffer: divergenceBuf } }, { binding: 3, resource: { buffer: paramsBuffer } },
    ]}),
  ];

  // Gradient subtract pipeline: reads vel + pressure, writes corrected vel
  const gradBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const gradPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [gradBGL] }),
    compute: { module: gradientModule, entryPoint: 'main' }
  });
  // Always reads velA + pressA → writes velB (we copy back to A before divergence,
  // and copy pressure back to A after pressure solve)
  const gradBG = device.createBindGroup({ layout: gradBGL, entries: [
    { binding: 0, resource: { buffer: velA } }, { binding: 1, resource: { buffer: velB } },
    { binding: 2, resource: { buffer: pressA } }, { binding: 3, resource: { buffer: paramsBuffer } },
  ]});

  // Render pipeline — tessellated grid with height displacement
  const fluidRenderParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(fluidRenderParamsBuffer, 0, new Float32Array([res, FLUID_GRID_RES, 1.5, 0]));

  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ]
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule, entryPoint: 'fs_main',
      targets: [{ format: renderTargetFormat }]
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: renderSampleCount },
  });
  // renderBGs[viewIndex] — fluid has no particle ping-pong for rendering
  const renderBGs: GPUBindGroup[] = [0, 1].map(vi => device.createBindGroup({ layout: renderBGL, entries: [
    { binding: 0, resource: { buffer: dyeA } },
    { binding: 1, resource: { buffer: fluidRenderParamsBuffer } },
    { binding: 2, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
  ]}));

  const workgroups = Math.ceil(res / 8);
  const depthRef: DepthRef = {};

  // Buffer management strategy: always keep canonical data in A buffers.
  // Each stage reads A → writes B, then we copy B → A.
  // For Jacobi iterations, we ping-pong and copy final result back to A.
  // This costs some copy bandwidth but makes bind group management trivial.

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = state.fluid;
      const dyeModeNum = p.dyeMode === 'rainbow' ? 0 : p.dyeMode === 'single' ? 1 : 2;
      const paramsData = new Float32Array([
        0.5, p.viscosity, p.diffusionRate, p.forceStrength,
        res, state.mouse.x, state.mouse.y, state.mouse.dx,
        state.mouse.dy, state.mouse.down ? 1.0 : 0.0, dyeModeNum, 0
      ]);
      device.queue.writeBuffer(paramsBuffer, 0, paramsData);

      // 1. Forces + advect: velA/dyeA → velB/dyeB
      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(faPipeline);
        pass.setBindGroup(0, faBG);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
      }
      // Copy results back to A
      encoder.copyBufferToBuffer(velB, 0, velA, 0, velBytes);
      encoder.copyBufferToBuffer(dyeB, 0, dyeA, 0, dyeBytes);

      // 2. Diffuse velocity (Jacobi iterations, ping-pong A↔B)
      // After even iterations: last write is to A. After odd: last write is to B.
      let velPong = 0; // 0 = A is current
      for (let i = 0; i < p.jacobiIterations; i++) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(diffPipeline);
        pass.setBindGroup(0, diffBGs[velPong]);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
        velPong = 1 - velPong;
      }
      // Ensure result is in A
      if (velPong === 1) {
        encoder.copyBufferToBuffer(velB, 0, velA, 0, velBytes);
      }

      // 3. Compute divergence from velA
      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(divPipeline);
        pass.setBindGroup(0, divBG);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
      }

      // 4. Pressure solve (Jacobi iterations, ping-pong A↔B)
      let pressPong = 0;
      for (let i = 0; i < p.jacobiIterations; i++) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(pressPipeline);
        pass.setBindGroup(0, pressBGs[pressPong]);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
        pressPong = 1 - pressPong;
      }
      // Ensure result is in A
      if (pressPong === 1) {
        encoder.copyBufferToBuffer(pressB, 0, pressA, 0, scalarBytes);
      }

      // 5. Gradient subtract: velA + pressA → velB, then copy to velA
      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(gradPipeline);
        pass.setBindGroup(0, gradBG);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
      }
      encoder.copyBufferToBuffer(velB, 0, velA, 0, velBytes);

      // Canonical data is now in A buffers for rendering
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : (canvas.width / canvas.height);
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));

      const pass = encoder.beginRenderPass({
        colorAttachments: [getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: getDepthAttachment(depthRef, viewport),
      });

      const renderViewport = getRenderViewport(viewport);
      if (renderViewport) {
        pass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }

      renderGrid(pass, aspect, viewIndex);

      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBGs[viewIndex]);
      pass.draw(6, FLUID_GRID_RES * FLUID_GRID_RES);
      pass.end();
    },

    getCount() { return res + 'x' + res; },

    destroy() {
      velA.destroy(); velB.destroy();
      pressA.destroy(); pressB.destroy();
      divergenceBuf.destroy();
      dyeA.destroy(); dyeB.destroy();
      paramsBuffer.destroy(); fluidRenderParamsBuffer.destroy();
      cameraBuffer.destroy();
      destroyDepthRef(depthRef);
    }
  };
}

// --- 5d: PARAMETRIC SHAPES ---

function createParametricSimulation() {
  // Fixed 256×256 resolution — no dynamic resizing needed
  const URES = 256;
  const VRES = 256;
  const vertexBytes = URES * VRES * 32; // pos(12)+glow(4)+normal(12)+pad(4) = 32 bytes
  const indexCount  = (URES - 1) * (VRES - 1) * 6;

  const vertexBuffer = device.createBuffer({ size: vertexBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
  const indexBuffer  = device.createBuffer({ size: indexCount * 4, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });

  // Generate index buffer once at creation
  {
    const indices = new Uint32Array(indexCount);
    let i = 0;
    for (let vi = 0; vi < VRES - 1; vi++) {
      for (let ui = 0; ui < URES - 1; ui++) {
        const tl = vi * URES + ui, tr = tl + 1;
        const bl = (vi + 1) * URES + ui, br = bl + 1;
        indices[i++] = tl; indices[i++] = bl; indices[i++] = tr;
        indices[i++] = tr; indices[i++] = bl; indices[i++] = br;
      }
    }
    device.queue.writeBuffer(indexBuffer, 0, indices);
  }

  const computeParamsBuffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const modelBuffer  = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  let time = 0;     // always advances; used only for param oscillation phase
  let animTime = 0; // advances only when any rate > 0; drives rotation + waves

  const computeModule = device.createShaderModule({ code: SHADER_PARAMETRIC_COMPUTE_EDIT || SHADER_PARAMETRIC_COMPUTE });
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' }
  });
  const computeBG = device.createBindGroup({ layout: computeBGL, entries: [
    { binding: 0, resource: { buffer: vertexBuffer } },
    { binding: 1, resource: { buffer: computeParamsBuffer } },
  ]});

  const renderModule = device.createShaderModule({ code: SHADER_PARAMETRIC_RENDER_EDIT || SHADER_PARAMETRIC_RENDER });
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ]
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule, entryPoint: 'fs_main',
      targets: [{ format: renderTargetFormat }]
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: renderSampleCount },
  });
  const renderBGs: GPUBindGroup[] = [0, 1].map(vi => device.createBindGroup({ layout: renderBGL, entries: [
    { binding: 0, resource: { buffer: vertexBuffer } },
    { binding: 1, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
    { binding: 2, resource: { buffer: modelBuffer } },
  ]}));

  const depthRef: DepthRef = {};

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = state.parametric;
      time += 0.016; // always advances; used for param oscillation phase
      const maxRate = Math.max(p.p1Rate, p.p2Rate, p.p3Rate, p.p4Rate, p.twistRate);
      animTime += 0.016 * (maxRate > 0 ? 1 : 0); // frozen when all rates = 0

      // Sinusoidal oscillation — natural ease-in-out at each extreme.
      // Phase offsets stagger the peaks so params don't all sync up.
      const osc = (mn: number, mx: number, rate: number, phase: number) =>
        mn + (mx - mn) * (0.5 + 0.5 * Math.sin(time * rate + phase));

      const p1    = osc(p.p1Min,    p.p1Max,    p.p1Rate,    0);
      const p2    = osc(p.p2Min,    p.p2Max,    p.p2Rate,    Math.PI * 0.7);
      const p3    = osc(p.p3Min,    p.p3Max,    p.p3Rate,    Math.PI * 1.3);
      const p4    = osc(p.p4Min,    p.p4Max,    p.p4Rate,    Math.PI * 0.4);
      const twist = osc(p.twistMin, p.twistMax, p.twistRate, Math.PI * 0.9);

      const m = state.mouse;
      const paramsData = new ArrayBuffer(64);
      const u32 = new Uint32Array(paramsData);
      const f32 = new Float32Array(paramsData);
      u32[0] = URES; u32[1] = VRES;
      f32[2] = p.scale; f32[3] = twist; f32[4] = animTime;
      u32[5] = SHAPE_IDS[p.shape] || 0;
      f32[6] = p1; f32[7] = p2; f32[8] = p3; f32[9] = p4;
      f32[10] = m.worldX; f32[11] = m.worldY; f32[12] = m.worldZ;
      f32[13] = m.down ? 1.0 : 0.0;
      device.queue.writeBuffer(computeParamsBuffer, 0, new Uint8Array(paramsData));

      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG);
      pass.dispatchWorkgroups(Math.ceil(URES / 8), Math.ceil(VRES / 8));
      pass.end();
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : (canvas.width / canvas.height);
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));

      // Slow tumble: Y-axis at 0.1 speed, X-axis at 0.03 (different rates = non-repeating path)
      const model = mat4.rotateX(mat4.rotateY(mat4.identity(), animTime * 0.1), animTime * 0.03);
      device.queue.writeBuffer(modelBuffer, 0, model as Float32Array<ArrayBuffer>);

      const pass = encoder.beginRenderPass({
        colorAttachments: [getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: getDepthAttachment(depthRef, viewport),
      });

      const renderViewport = getRenderViewport(viewport);
      if (renderViewport) {
        pass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }

      renderGrid(pass, aspect, viewIndex);

      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBGs[viewIndex]);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.drawIndexed(indexCount);
      pass.end();
    },

    getCount() { return `256×256 (${state.parametric.shape})`; },

    destroy() {
      vertexBuffer.destroy(); indexBuffer.destroy();
      computeParamsBuffer.destroy(); cameraBuffer.destroy(); modelBuffer.destroy();
      destroyDepthRef(depthRef);
    }
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: UI & CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

function buildControls() {
  for (const [modeStr, sections] of Object.entries(PARAM_DEFS)) {
    const mode = modeStr as SimMode;
    const container = document.getElementById(`params-${mode}`)!;
    const presetsDiv = document.createElement('div');
    presetsDiv.className = 'presets';

    for (const presetName of Object.keys(PRESETS[mode])) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn' + (presetName === 'Default' ? ' active' : '');
      btn.textContent = presetName;
      btn.dataset.preset = presetName;
      btn.dataset.mode = mode;
      btn.addEventListener('click', () => applyPreset(mode, presetName));
      presetsDiv.appendChild(btn);
    }
    container.appendChild(presetsDiv);

    for (const section of sections) {
      const secDiv = document.createElement('div');
      secDiv.className = 'param-section';
      const title = document.createElement('div');
      title.className = 'param-section-title';
      title.textContent = section.section;
      secDiv.appendChild(title);

      // Dynamic sections (shape params) get populated later
      if (section.dynamic) {
        secDiv.id = section.id ?? '';
        container.appendChild(secDiv);
        continue;
      }

      for (const param of section.params) {
        buildParamRow(secDiv, mode, param);
      }

      container.appendChild(secDiv);
    }
  }
}

function buildParamRow(container: HTMLElement, mode: SimMode, param: ParamDef) {
  const row = document.createElement('div');
  row.className = 'control-row';

  const label = document.createElement('span');
  label.className = 'control-label';
  label.textContent = param.label;
  row.appendChild(label);

  if (param.type === 'dropdown') {
    const select = document.createElement('select');
    select.dataset.mode = mode;
    select.dataset.key = param.key;
    for (const opt of param.options ?? []) {
      const option = document.createElement('option');
      option.value = String(opt);
      option.textContent = String(opt);
      select.appendChild(option);
    }
    select.value = String(modeParams(mode)[param.key]);
    select.addEventListener('change', () => {
      const val = Number.isNaN(Number(select.value)) ? select.value : Number(select.value);
      modeParams(mode)[param.key] = val;
      if (param.requiresReset) resetCurrentSim();
      // When shape changes, set default shape params and rebuild UI
      if (param.key === 'shape') {
        applyShapeDefaults(String(val));
        rebuildShapeParams();
      }
      updateAll();
    });
    row.appendChild(select);
  } else {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(param.min);
    input.max = String(param.max);
    input.step = String(param.step);
    input.value = String(modeParams(mode)[param.key]);
    input.dataset.mode = mode;
    input.dataset.key = param.key;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = formatValue(Number(modeParams(mode)[param.key]), param.step ?? 1);

    input.addEventListener('input', () => {
      const val = Number(input.value);
      modeParams(mode)[param.key] = val;
      valueSpan.textContent = formatValue(val, param.step ?? 1);
      if (param.requiresReset) {
        input.dataset.needsReset = '1';
      }
      updateAll();
    });
    input.addEventListener('change', () => {
      if (input.dataset.needsReset === '1') {
        input.dataset.needsReset = '0';
        resetCurrentSim();
      }
    });

    row.appendChild(input);
    row.appendChild(valueSpan);
  }

  container.appendChild(row);
  return row;
}

// Set shape-specific animated param ranges when switching shapes.
// Wave/twist params are global and not reset on shape change.
function applyShapeDefaults(shape: string) {
  const sp = SHAPE_PARAMS[shape as ShapeName] ?? {};
  const p = state.parametric;
  if (sp.p1) { p.p1Min = sp.p1.animMin; p.p1Max = sp.p1.animMax; p.p1Rate = sp.p1.animRate; }
  else        { p.p1Min = 0; p.p1Max = 0; p.p1Rate = 0; }
  if (sp.p2) { p.p2Min = sp.p2.animMin; p.p2Max = sp.p2.animMax; p.p2Rate = sp.p2.animRate; }
  else        { p.p2Min = 0; p.p2Max = 0; p.p2Rate = 0; }
}

// Rebuild the dynamic "Shape Parameters" section based on current shape.
// Each parameter renders as a labelled group with Min / Max / Rate sliders.
function rebuildShapeParams() {
  const container = document.getElementById('shape-params-section');
  if (!container) return;

  while (container.children.length > 1) container.removeChild(container.lastChild!);

  const shape = state.parametric.shape;
  const sp = SHAPE_PARAMS[shape] ?? {};

  for (const [pKey, def] of Object.entries(sp)) {
    const subLabel = document.createElement('div');
    subLabel.className = 'anim-param-label';
    subLabel.textContent = def.label;
    container.appendChild(subLabel);
    buildParamRow(container, 'parametric', { key: `${pKey}Min`,  label: 'Min',  min: def.min, max: def.max, step: def.step });
    buildParamRow(container, 'parametric', { key: `${pKey}Max`,  label: 'Max',  min: def.min, max: def.max, step: def.step });
    buildParamRow(container, 'parametric', { key: `${pKey}Rate`, label: 'Rate', min: 0.0,     max: 3.0,     step: 0.05    });
  }
}

function formatValue(val: number, step: number) {
  if (step >= 1) return String(Math.round(val));
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return val.toFixed(decimals);
}

function applyPreset(mode: SimMode, presetName: string) {
  const preset = PRESETS[mode][presetName];
  Object.assign(modeParams(mode), preset);

  // Update all sliders/dropdowns for this mode
  const container = document.getElementById(`params-${mode}`)!;
  container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(input => {
    const key = input.dataset.key!;
    if (key in preset) {
      input.value = String(preset[key]);
      const valueSpan = input.parentElement?.querySelector('.control-value');
      if (valueSpan) {
        const paramDef = findParamDef(mode, key);
        valueSpan.textContent = formatValue(Number(preset[key]), paramDef ? paramDef.step ?? 1 : 1);
      }
    }
  });
  container.querySelectorAll<HTMLSelectElement>('select').forEach(sel => {
    const key = sel.dataset.key!;
    if (key in preset) sel.value = String(preset[key]);
  });

  // Highlight active preset button
  container.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === presetName);
  });

  // Rebuild dynamic shape params when parametric preset changes shape
  if (mode === 'parametric') {
    rebuildShapeParams();
  }

  resetCurrentSim();
  updateAll();
}

function findParamDef(mode: SimMode, key: string): ParamDef | null {
  for (const section of PARAM_DEFS[mode]) {
    for (const param of section.params) {
      if (param.key === key) return param;
    }
  }
  return null;
}

function setupTabs() {
  document.querySelectorAll<HTMLElement>('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode as SimMode;
      state.mode = mode;

      document.querySelectorAll<HTMLElement>('.mode-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll<HTMLElement>('.param-group').forEach(g => g.classList.toggle('active', g.dataset.mode === mode));

      ensureSimulation();
      updateAll();
    });
  });
}

function setupGlobalControls() {
  document.getElementById('btn-pause')!.addEventListener('click', () => {
    state.paused = !state.paused;
    document.getElementById('btn-pause')!.textContent = state.paused ? 'Resume' : 'Pause';
    document.getElementById('btn-pause')!.classList.toggle('active', state.paused);
  });

  document.getElementById('btn-reset')!.addEventListener('click', () => {
    resetCurrentSim();
  });

  // Copy prompt
  document.getElementById('copy-btn')!.addEventListener('click', () => {
    const text = document.getElementById('prompt-text')!.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-btn')!;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });

  // Reset All — clear localStorage and reload
  document.getElementById('btn-reset-all')!.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // XR button setup
  setupXRButton();
}

function buildThemeSelector() {
  const container = document.getElementById('theme-presets')!;
  for (const name of Object.keys(COLOR_THEMES)) {
    const theme = COLOR_THEMES[name];
    const btn = document.createElement('button');
    btn.className = 'preset-btn' + (name === state.colorTheme ? ' active' : '');
    btn.textContent = name;
    btn.dataset.theme = name;
    // Color swatch hint
    btn.style.borderLeftWidth = '3px';
    btn.style.borderLeftColor = theme.primary;
    btn.addEventListener('click', () => {
      state.colorTheme = name;
      container.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.theme === name));
      // Reset all simulations to pick up new colors
      for (const mode of Object.keys(simulations) as SimMode[]) {
        if (simulations[mode]) { simulations[mode]!.destroy(); simulations[mode] = undefined; }
      }
      ensureSimulation();
      updateAll();
    });
    container.appendChild(btn);
  }
}

// Compute camera eye position and basis vectors from orbit state
function getCameraBasis() {
  const cam = state.camera;
  const cosRx = Math.cos(cam.rotX), sinRx = Math.sin(cam.rotX);
  const cosRy = Math.cos(cam.rotY), sinRy = Math.sin(cam.rotY);
  const eye = [cam.distance * cosRx * sinRy, cam.distance * sinRx, cam.distance * cosRx * cosRy];
  const forward = normalize3(sub3([0, 0, 0], eye));
  const worldUp = [0, 1, 0];
  const right = normalize3(cross3(forward, worldUp));
  const up = cross3(right, forward);
  return { eye, forward, right, up };
}

// Build a ray from screen coords (0-1) through the camera
function screenRay(mx: number, my: number) {
  const cam = state.camera;
  const fovRad = cam.fov * Math.PI / 180;
  const aspect = canvas.width / canvas.height;
  const { eye, forward, right, up } = getCameraBasis();
  const halfFov = Math.tan(fovRad * 0.5);
  const ndcX = (mx * 2 - 1) * halfFov * aspect;
  const ndcY = (my * 2 - 1) * halfFov;
  const dir = normalize3([
    forward[0] + right[0] * ndcX + up[0] * ndcY,
    forward[1] + right[1] * ndcX + up[1] * ndcY,
    forward[2] + right[2] * ndcX + up[2] * ndcY,
  ]);
  return { eye, dir };
}

// Unproject screen coords to a world-space point on a plane through the origin,
// perpendicular to the view direction.
function screenToWorld(mx: number, my: number) {
  const { dir } = screenRay(mx, my);
  // Intersect with a plane at origin perpendicular to the view
  const spread = state.camera.distance * 0.5;
  return [dir[0] * spread, dir[1] * spread, dir[2] * spread];
}

// Unproject screen coords onto the fluid plane (y=0, x/z from -2 to 2).
// Returns [u, v] in 0-1 range, or null if ray misses.
function screenToFluidUV(mx: number, my: number) {
  const { eye, dir } = screenRay(mx, my);
  if (Math.abs(dir[1]) < 0.0001) return null;
  const t = -eye[1] / dir[1];
  if (t < 0) return null;
  const hitX = eye[0] + dir[0] * t;
  const hitZ = eye[2] + dir[2] * t;
  // Fluid plane goes from (-2, 0, -2) to (2, 0, 2) → UV 0-1
  return [
    Math.max(0, Math.min(1, (hitX + 2) / 4)),
    Math.max(0, Math.min(1, (hitZ + 2) / 4)),
  ];
}

function worldToFluidUV(worldPoint: number[]) {
  return [
    Math.max(0, Math.min(1, (worldPoint[0] + 2) / 4)),
    Math.max(0, Math.min(1, (worldPoint[2] + 2) / 4)),
  ];
}

function intersectRayWithPlane(origin: number[], dir: number[], planeY: number) {
  if (Math.abs(dir[1]) < 0.0001) return null;
  const t = (planeY - origin[1]) / dir[1];
  if (t < 0) return null;
  return [
    origin[0] + dir[0] * t,
    origin[1] + dir[1] * t,
    origin[2] + dir[2] * t,
  ];
}

function closestPointOnRayToOrigin(origin: number[], dir: number[]) {
  const denom = dot3(dir, dir) || 1;
  const t = Math.max(0, -dot3(origin, dir) / denom);
  return [
    origin[0] + dir[0] * t,
    origin[1] + dir[1] * t,
    origin[2] + dir[2] * t,
  ];
}

function setSimulationInteractionInactive() {
  state.mouse.down = false;
  state.mouse.dx = 0;
  state.mouse.dy = 0;
}

function setupMouseControls() {
  const c = canvas;
  let dragging = false;
  let interacting = false; // ctrl/meta held = sim interaction mode

  c.addEventListener('pointerdown', (e) => {
    if (state.xrEnabled) return;
    dragging = true;
    interacting = e.ctrlKey || e.metaKey;
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = 1.0 - (e.clientY - rect.top) / rect.height;
    state.mouse.dx = 0;
    state.mouse.dy = 0;

    if (interacting) {
      state.mouse.down = true;
      const wp = screenToWorld(mx, my);
      state.mouse.worldX = wp[0];
      state.mouse.worldY = wp[1];
      state.mouse.worldZ = wp[2];
      // Set initial position in correct coord system for fluid
      if (state.mode === 'fluid') {
        const uv = screenToFluidUV(mx, my);
        if (uv) { state.mouse.x = uv[0]; state.mouse.y = uv[1]; }
      } else {
        state.mouse.x = mx; state.mouse.y = my;
      }
    } else {
      state.mouse.x = mx; state.mouse.y = my;
    }
    e.preventDefault();
  });

  c.addEventListener('pointermove', (e) => {
    if (state.xrEnabled) return;
    if (!dragging) return;
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = 1.0 - (e.clientY - rect.top) / rect.height;

    // Re-check modifier keys mid-drag
    const interact = interacting || e.ctrlKey || e.metaKey;

    if (interact) {
      // Sim interaction (ctrl+drag)
      state.mouse.down = true;
      const wp = screenToWorld(mx, my);
      state.mouse.worldX = wp[0];
      state.mouse.worldY = wp[1];
      state.mouse.worldZ = wp[2];

      // For fluid: ray-cast onto y=0 plane for camera-correct coordinates
      if (state.mode === 'fluid') {
        const uv = screenToFluidUV(mx, my);
        if (uv) {
          state.mouse.dx = (uv[0] - state.mouse.x) * 10;
          state.mouse.dy = (uv[1] - state.mouse.y) * 10;
          state.mouse.x = uv[0];
          state.mouse.y = uv[1];
        }
      } else {
        state.mouse.dx = (mx - state.mouse.x) * 10;
        state.mouse.dy = (my - state.mouse.y) * 10;
        state.mouse.x = mx;
        state.mouse.y = my;
      }
    } else {
      // Orbit camera (plain drag — all modes)
      state.camera.rotY += e.movementX * 0.005;
      state.camera.rotX += e.movementY * 0.005;
      state.camera.rotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, state.camera.rotX));
      state.mouse.down = false;
    }
  });

  c.addEventListener('pointerup', () => {
    if (state.xrEnabled) return;
    dragging = false;
    interacting = false;
    state.mouse.down = false;
    state.mouse.dx = 0;
    state.mouse.dy = 0;
  });

  c.addEventListener('contextmenu', (e) => e.preventDefault());

  c.addEventListener('wheel', (e) => {
    if (state.xrEnabled) return;
    state.camera.distance *= (1 + e.deltaY * 0.001);
    state.camera.distance = Math.max(0.5, Math.min(50, state.camera.distance));
    e.preventDefault();
  }, { passive: false });
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: PROMPT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_LABELS = {
  boids: 'boids/flocking',
  physics: 'N-body gravitational',
  fluid: 'fluid dynamics',
  parametric: 'parametric shape',
};

function updatePrompt() {
  const mode = state.mode;
  const params = modeParams(mode);
  const defaultParams = DEFAULTS[mode] as unknown as Record<string, number | string>;
  const parts: (string | null)[] = [];

  for (const [key, val] of Object.entries(params)) {
    if (val !== defaultParams[key]) {
      parts.push(describeParam(mode, key, val));
    }
  }

  let prompt = `WebGPU ${MODE_LABELS[mode]} simulation`;
  if (state.colorTheme !== 'Dracula') {
    prompt += ` (${state.colorTheme} theme)`;
  }
  if (parts.length > 0) {
    prompt += ` with ${parts.filter(Boolean).join(', ')}`;
  }
  prompt += '.';

  document.getElementById('prompt-text')!.textContent = prompt;
}

function describeParam(_mode: string, key: string, val: number | string): string | null {
  const n = Number(val);
  const descriptions: Record<string, () => string | null> = {
    count: () => `${val} particles`,
    separationRadius: () => n < 15 ? `tight separation (${val})` : n > 50 ? `wide separation (${val})` : `separation radius ${val}`,
    alignmentRadius: () => `alignment range ${val}`,
    cohesionRadius: () => n > 80 ? `strong cohesion (${val})` : `cohesion range ${val}`,
    maxSpeed: () => n > 4 ? `high speed (${val})` : n < 1 ? `slow movement (${val})` : `speed ${val}`,
    maxForce: () => n > 0.1 ? `strong steering (${val})` : `steering force ${val}`,
    visualRange: () => `visual range ${val}`,
    G: () => n > 5 ? `strong gravity (G=${val})` : n < 0.5 ? `weak gravity (G=${val})` : `G=${val}`,
    softening: () => `softening ${val}`,
    damping: () => n < 0.995 ? `high damping (${val})` : `damping ${val}`,
    distribution: () => `${val} distribution`,
    resolution: () => `${val}x${val} grid`,
    viscosity: () => n > 0.5 ? `thick fluid (viscosity ${val})` : n < 0.05 ? `thin fluid (viscosity ${val})` : `viscosity ${val}`,
    diffusionRate: () => `diffusion ${val}`,
    forceStrength: () => n > 200 ? `strong forces (${val})` : `force strength ${val}`,
    dyeMode: () => `${val} dye`,
    jacobiIterations: () => `${val} solver iterations`,
    shape: () => `${val} shape`,
    scale: () => n !== 1 ? `scale ${val}` : null,
    p1Min: () => null, p1Max: () => null, p1Rate: () => null,
    p2Min: () => null, p2Max: () => null, p2Rate: () => null,
    p3Min: () => null, p3Max: () => null, p3Rate: () => null,
    p4Min: () => null, p4Max: () => null, p4Rate: () => null,
    twistMin: () => null, twistMax: () => null, twistRate: () => null,
  };

  const fn = descriptions[key] as (() => string | null) | undefined;
  return fn ? fn() : `${key}: ${val}`;
}

function updateAll() {
  updatePrompt();
  updateStats();
  updateShaderPanel();
  saveState();
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7b: SHADER DEBUG PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// Maps simulation mode → named shader sources
function getShaderSources(mode: SimMode): Record<string, string> {
  const sources = {
    boids: {
      'Compute (Flocking)': SHADER_BOIDS_COMPUTE,
      'Render (Vert+Frag)': SHADER_BOIDS_RENDER,
    },
    physics: {
      'Compute (Gravity)': SHADER_NBODY_COMPUTE,
      'Render (Vert+Frag)': SHADER_NBODY_RENDER,
    },
    fluid: {
      'Forces + Advect': SHADER_FLUID_FORCES_ADVECT,
      'Diffuse': SHADER_FLUID_DIFFUSE,
      'Divergence': SHADER_FLUID_DIVERGENCE,
      'Pressure Solve': SHADER_FLUID_PRESSURE,
      'Gradient Sub': SHADER_FLUID_GRADIENT,
      'Render': SHADER_FLUID_RENDER,
    },
    parametric: {
      'Compute (All Shapes)': SHADER_PARAMETRIC_COMPUTE,
      'Render (Phong)': SHADER_PARAMETRIC_RENDER,
    },
  };
  return sources[mode] || {};
}

let shaderPanelOpen = false;
let activeShaderTab: string | null = null;
let currentShaderSources: Record<string, string> = {};
let originalShaderSources: Record<string, string> = {};

function setupShaderPanel() {
  const toggle = document.getElementById('shader-toggle')!;
  const panel = document.getElementById('shader-panel')!;

  toggle.addEventListener('click', () => {
    shaderPanelOpen = !shaderPanelOpen;
    panel.classList.toggle('open', shaderPanelOpen);
    toggle.classList.toggle('active', shaderPanelOpen);
    if (shaderPanelOpen) refreshShaderTabs();
  });

  document.getElementById('shader-compile')!.addEventListener('click', compileEditedShader);
  document.getElementById('shader-reset')!.addEventListener('click', resetEditedShader);

  // Tab key inserts spaces in editor instead of moving focus
  document.getElementById('shader-editor')!.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = start + 2;
    }
  });
}

function refreshShaderTabs() {
  const sources = getShaderSources(state.mode);
  originalShaderSources = { ...sources };
  // Preserve edits if mode hasn't changed
  if (!currentShaderSources._mode || currentShaderSources._mode !== state.mode) {
    currentShaderSources = { ...sources, _mode: state.mode };
  }

  const tabsEl = document.getElementById('shader-tabs')!;
  tabsEl.innerHTML = '';

  const names = Object.keys(sources);
  activeShaderTab = activeShaderTab && names.includes(activeShaderTab) ? activeShaderTab : names[0];

  for (const name of names) {
    const tab = document.createElement('button');
    tab.className = 'shader-tab' + (name === activeShaderTab ? ' active' : '');
    tab.textContent = name;
    tab.addEventListener('click', () => {
      // Save current editor content before switching
      saveEditorContent();
      activeShaderTab = name;
      tabsEl.querySelectorAll('.shader-tab').forEach(t => t.classList.toggle('active', t.textContent === name));
      loadEditorContent();
    });
    tabsEl.appendChild(tab);
  }

  loadEditorContent();
}

function saveEditorContent() {
  if (activeShaderTab) {
    currentShaderSources[activeShaderTab] = (document.getElementById('shader-editor') as HTMLTextAreaElement).value;
  }
}

function loadEditorContent() {
  const editor = document.getElementById('shader-editor') as HTMLTextAreaElement;
  editor.value = currentShaderSources[activeShaderTab!] || '';
  document.getElementById('shader-status')!.textContent = '';
  document.getElementById('shader-status')!.className = 'shader-success';
}

function updateShaderPanel() {
  if (shaderPanelOpen) {
    // Re-check if mode changed
    if (currentShaderSources._mode !== state.mode) {
      refreshShaderTabs();
    }
  }
}

function compileEditedShader() {
  saveEditorContent();
  const code = currentShaderSources[activeShaderTab!];
  const statusEl = document.getElementById('shader-status')!;

  // Attempt to create a shader module to validate
  try {
    const module = device.createShaderModule({ code });
    // Check for compilation errors via getCompilationInfo
    module.getCompilationInfo().then(info => {
      const errors = info.messages.filter(m => m.type === 'error');
      if (errors.length > 0) {
        statusEl.className = 'shader-error';
        statusEl.textContent = errors.map(e => `Line ${e.lineNum}: ${e.message}`).join('; ');
        statusEl.title = errors.map(e => `Line ${e.lineNum}: ${e.message}`).join('\n');
      } else {
        statusEl.className = 'shader-success';
        statusEl.textContent = 'Compiled OK — reset simulation to apply';
        statusEl.title = '';

        // Update the global shader source so next init uses it
        applyShaderEdit(state.mode, activeShaderTab!, code);
      }
    });
  } catch (e) {
    statusEl.className = 'shader-error';
    statusEl.textContent = (e as Error).message;
    statusEl.title = (e as Error).message;
  }
}

function resetEditedShader() {
  if (activeShaderTab && originalShaderSources[activeShaderTab]) {
    currentShaderSources[activeShaderTab] = originalShaderSources[activeShaderTab];
    loadEditorContent();

    // Also revert the global source
    applyShaderEdit(state.mode, activeShaderTab, originalShaderSources[activeShaderTab]);
    document.getElementById('shader-status')!.className = 'shader-success';
    document.getElementById('shader-status')!.textContent = 'Shader reset to original';
  }
}

// Apply edited shader code to the appropriate global variable
function applyShaderEdit(mode: SimMode, tabName: string, code: string) {
  const mapping = {
    boids: {
      'Compute (Flocking)': () => { SHADER_BOIDS_COMPUTE_EDIT = code; },
      'Render (Vert+Frag)': () => { SHADER_BOIDS_RENDER_EDIT = code; },
    },
    physics: {
      'Compute (Gravity)': () => { SHADER_NBODY_COMPUTE_EDIT = code; },
      'Render (Vert+Frag)': () => { SHADER_NBODY_RENDER_EDIT = code; },
    },
    fluid: {
      'Forces + Advect': () => { SHADER_FLUID_FORCES_ADVECT_EDIT = code; },
      'Diffuse': () => { SHADER_FLUID_DIFFUSE_EDIT = code; },
      'Divergence': () => { SHADER_FLUID_DIVERGENCE_EDIT = code; },
      'Pressure Solve': () => { SHADER_FLUID_PRESSURE_EDIT = code; },
      'Gradient Sub': () => { SHADER_FLUID_GRADIENT_EDIT = code; },
      'Render': () => { SHADER_FLUID_RENDER_EDIT = code; },
    },
    parametric: {
      'Compute (Mesh Gen)': () => { SHADER_PARAMETRIC_COMPUTE_EDIT = code; },
      'Render (Phong)': () => { SHADER_PARAMETRIC_RENDER_EDIT = code; },
    },
  };
  const modeMapping = mapping[mode] as Record<string, () => void> | undefined;
  const fn = modeMapping?.[tabName];
  if (fn) fn();
}

// Editable shader overrides — when set, simulations use these instead of originals
let SHADER_BOIDS_COMPUTE_EDIT: string | null = null;
let SHADER_BOIDS_RENDER_EDIT: string | null = null;
let SHADER_NBODY_COMPUTE_EDIT: string | null = null;
let SHADER_NBODY_RENDER_EDIT: string | null = null;
let SHADER_FLUID_FORCES_ADVECT_EDIT: string | null = null;
let SHADER_FLUID_DIFFUSE_EDIT: string | null = null;
let SHADER_FLUID_DIVERGENCE_EDIT: string | null = null;
let SHADER_FLUID_PRESSURE_EDIT: string | null = null;
let SHADER_FLUID_GRADIENT_EDIT: string | null = null;
let SHADER_FLUID_RENDER_EDIT: string | null = null;
let SHADER_PARAMETRIC_COMPUTE_EDIT: string | null = null;
let SHADER_PARAMETRIC_RENDER_EDIT: string | null = null;


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: WEBXR
// ═══════════════════════════════════════════════════════════════════════════════

let xrSession: XRSession | null = null;
let xrRefSpace: XRReferenceSpace | null = null;
let xrBinding: XRGPUBinding | null = null;
let xrLayer: XRProjectionLayer | null = null;
let xrFallbackDepth: GPUTexture | null = null;
let xrInteractionSource: XRInputSource | null = null;
let xrInteractionHasSample = false;

function setXRInteractionSource(inputSource: XRInputSource | null) {
  xrInteractionSource = inputSource;
  xrInteractionHasSample = false;
  setSimulationInteractionInactive();
}

function getXRTargetRayDirection(transform: XRRigidTransform) {
  const m = transform.matrix;
  return normalize3([-m[8], -m[9], -m[10]]);
}

function updateXRSimulationInteraction(frame: XRFrame) {
  const source = xrInteractionSource;
  if (!source || !xrRefSpace) {
    setSimulationInteractionInactive();
    return;
  }

  const pose = frame.getPose(source.targetRaySpace, xrRefSpace);
  if (!pose) {
    setSimulationInteractionInactive();
    xrInteractionHasSample = false;
    return;
  }

  const origin = [
    pose.transform.position.x,
    pose.transform.position.y,
    pose.transform.position.z,
  ];
  const dir = getXRTargetRayDirection(pose.transform);
  const worldPoint = state.mode === 'fluid'
    ? intersectRayWithPlane(origin, dir, 0)
    : closestPointOnRayToOrigin(origin, dir);

  if (!worldPoint) {
    setSimulationInteractionInactive();
    xrInteractionHasSample = false;
    return;
  }

  // [LAW:one-source-of-truth] Vision Pro pinch reuses the existing state.mouse interaction channel so simulations read one canonical input representation.
  state.mouse.down = true;
  state.mouse.worldX = worldPoint[0];
  state.mouse.worldY = worldPoint[1];
  state.mouse.worldZ = worldPoint[2];

  if (state.mode === 'fluid') {
    const uv = worldToFluidUV(worldPoint);
    state.mouse.dx = xrInteractionHasSample ? (uv[0] - state.mouse.x) * 10 : 0;
    state.mouse.dy = xrInteractionHasSample ? (uv[1] - state.mouse.y) * 10 : 0;
    state.mouse.x = uv[0];
    state.mouse.y = uv[1];
  } else {
    state.mouse.dx = 0;
    state.mouse.dy = 0;
    state.mouse.x = worldPoint[0];
    state.mouse.y = worldPoint[1];
  }

  xrInteractionHasSample = true;
}

function setupXRButton() {
  const btn = document.getElementById('btn-xr') as HTMLButtonElement;

  if (!navigator.xr) {
    btn.textContent = 'VR Not Available';
    return;
  }

  navigator.xr.isSessionSupported('immersive-vr').then((supported: boolean) => {
    if (supported) {
      btn.disabled = false;
      btn.addEventListener('click', toggleXR);
    } else {
      btn.textContent = 'VR Not Supported';
    }
  }).catch(() => { btn.textContent = 'VR Check Failed'; });
}

async function toggleXR() {
  if (xrSession) {
    xrSession.end();
    return;
  }

  const btn = document.getElementById('btn-xr')!;
  btn.textContent = 'Starting...';

  try {
    // Safari visionOS: 'webgpu' is required to get XRGPUBinding.
    // 'layers' is optional — Safari accepts it in updateRenderState({ layers: [...] })
    // even when not listed as required. 'local-floor' is optional; fall back to 'local'.
    xrSession = await navigator.xr!.requestSession('immersive-vr', {
      requiredFeatures: ['webgpu'],
      optionalFeatures: ['layers', 'local-floor'],
    });
    let gotFloor = false;
    try {
      xrRefSpace = await xrSession.requestReferenceSpace('local-floor');
      gotFloor = true;
    } catch (_) {
      xrRefSpace = await xrSession.requestReferenceSpace('local');
    }

    // The simulation geometry is centered at the world origin in a ~[-2, 2]³ cube.
    // Without an offset, the user spawns inside it. We push the reference space back
    // 5 units along -Z (the WebGL "forward" axis) so the simulation appears 5m ahead.
    //
    // With local-floor, the reference space origin is on the floor and the user's eyes
    // are ~1.6m up. We also lift the reference space by that amount so the simulation
    // center sits at roughly eye level rather than at the user's feet.
    const offsetY = gotFloor ? 1.6 : 0;
    // XRRigidTransform exists as a global constructor at runtime on visionOS but
    // TypeScript's DOM lib only declares the interface, not the constructor value.
    type XRRigidTransformCtor = new (position: DOMPointInit, orientation?: DOMPointInit) => XRRigidTransform;
    const RigidTransform = (globalThis as unknown as { XRRigidTransform: XRRigidTransformCtor }).XRRigidTransform;
    xrRefSpace = xrRefSpace!.getOffsetReferenceSpace(
      new RigidTransform({ x: 0, y: offsetY, z: -5 })
    );

    // XRGPUBinding is the WebXR–WebGPU bridge. It takes the XR session and the
    // GPUDevice (which must have been created with xrCompatible: true) and lets us
    // create GPU-backed projection layers and retrieve per-eye GPUTextureViews each frame.
    xrBinding = new XRGPUBinding(xrSession, device);

    // getPreferredColorFormat() returns the texture format the XR compositor expects.
    // nativeProjectionScaleFactor is the device's native render resolution multiplier —
    // passing it to scaleFactor renders at full resolution instead of a default lower res.
    const preferredFormat = xrBinding.getPreferredColorFormat();
    syncRenderConfig(preferredFormat, XR_SAMPLE_COUNT);
    const scaleFactor = xrBinding.nativeProjectionScaleFactor;

    // Try creating the projection layer with native scale, fall back to default scale.
    // Depth is managed per-frame (see xrFrame) so we don't request depthStencilFormat here.
    const layerConfigs: XRGPUProjectionLayerInit[] = [
      { colorFormat: preferredFormat, scaleFactor, textureType: 'texture-array' },
      { colorFormat: preferredFormat, textureType: 'texture-array' },
      { colorFormat: preferredFormat, scaleFactor },
      { colorFormat: preferredFormat },
    ];
    for (const config of layerConfigs) {
      try {
        xrLayer = xrBinding.createProjectionLayer(config);
        break;
      } catch (e) {
        console.warn('[XR] Projection layer config failed, trying next:', (e as Error).message);
        xrLayer = null;
      }
    }
    if (!xrLayer) throw new Error('All projection layer configurations failed');

    // Assign our GPU projection layer as the sole render target for this session.
    // This replaces the default baseLayer (canvas-backed) with our GPU texture layer.
    xrSession.updateRenderState({ layers: [xrLayer] });
    xrSession.addEventListener('selectstart', (event) => {
      setXRInteractionSource((event as XRInputSourceEvent).inputSource);
    });
    xrSession.addEventListener('selectend', (event) => {
      const inputSource = (event as XRInputSourceEvent).inputSource;
      const sameSource = xrInteractionSource === inputSource;
      setXRInteractionSource(sameSource ? null : xrInteractionSource);
    });

    btn.textContent = 'Exit VR';
    state.xrEnabled = true;

    xrSession.requestAnimationFrame(xrFrame);

    xrSession.addEventListener('end', () => {
      xrSession = null;
      xrRefSpace = null;
      xrBinding = null;
      xrLayer = null;
      state.xrEnabled = false;
      syncRenderConfig(canvasFormat, DESKTOP_SAMPLE_COUNT);
      setXRInteractionSource(null);
      btn.textContent = 'Enter VR';
      requestAnimationFrame(frame);
    });
  } catch (e) {
    console.error('[XR] Failed to start session:', e);
    btn.textContent = `XR Error: ${(e as Error).message}`;
    if (xrSession) { try { xrSession.end(); } catch (_) {} }
    xrSession = null;
    setTimeout(() => { btn.textContent = 'Enter VR'; }, 4000);
  }
}

function xrFrame(_time: DOMHighResTimeStamp, xrFrameData: XRFrame) {
  if (!xrSession) return;
  xrSession.requestAnimationFrame(xrFrame);

  try {
    const pose = xrFrameData.getViewerPose(xrRefSpace!);
    if (!pose) return;

    const sim = simulations[state.mode];
    if (!sim) return;

    updateXRSimulationInteraction(xrFrameData);

    const encoder = device.createCommandEncoder();

    // Compute runs once per frame — both eyes share the same simulation state.
    if (!state.paused) sim.compute(encoder);

    // Render once per eye. pose.views is typically [left, right] on stereo devices.
    //
    // Each eye writes its camera data to a different 256-byte-aligned offset in the
    // camera buffer (viewIndex * CAMERA_STRIDE), so both writeBuffer calls coexist
    // in the queue without overwriting each other before the command buffer executes.
    // Each eye's render pass binds the camera buffer at its own offset via renderBGs[viewIndex].
    for (let viewIndex = 0; viewIndex < pose.views.length; viewIndex++) {
      const view = pose.views[viewIndex];

      // getViewSubImage (Safari) / getSubImage (Chrome) returns the per-eye render target.
      // The returned GPUTexture is owned by the XR compositor — don't hold refs across frames.
      const binding = xrBinding!;
      const subImage = binding.getViewSubImage
        ? binding.getViewSubImage(xrLayer!, view)
        : binding.getSubImage!(xrLayer!, view);
      if (!subImage) continue;

      // getViewDescriptor() returns the correct GPUTextureViewDescriptor for this eye,
      // including the array layer index when the compositor uses a texture array.
      const viewDesc = subImage.getViewDescriptor ? subImage.getViewDescriptor() : {};
      const textureView = subImage.colorTexture.createView(viewDesc);

      // Use the XR-provided depth buffer if available; otherwise create a matching one.
      if (subImage.depthStencilTexture) {
        xrDepthView = subImage.depthStencilTexture.createView(viewDesc);
      } else {
        const ct = subImage.colorTexture;
        if (!xrFallbackDepth || xrFallbackDepth.width !== ct.width || xrFallbackDepth.height !== ct.height) {
          if (xrFallbackDepth) xrFallbackDepth.destroy();
          xrFallbackDepth = device.createTexture({
            size: [ct.width, ct.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
          });
        }
        xrDepthView = xrFallbackDepth.createView();
      }

      // Set the per-eye camera override so getCameraUniformData() uses XR matrices.
      const pos = view.transform.position;
      xrCameraOverride = {
        viewMatrix: new Float32Array(view.transform.inverse.matrix),
        projMatrix: new Float32Array(view.projectionMatrix),
        eye: [pos.x, pos.y, pos.z],
      };

      const { x, y, width, height } = subImage.viewport;
      sim.render(encoder, textureView, [x, y, width, height], viewIndex);
    }

    // Clear overrides after all eyes are encoded — desktop frame loop must not inherit XR state.
    xrCameraOverride = null;
    xrDepthView = null;

    device.queue.submit([encoder.finish()]);
  } catch (e) {
    console.error('[XR] Frame error:', e);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: RENDER LOOP & ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

let frameCount = 0;
let fpsTime = 0;
let currentFps = 0;

function ensureSimulation() {
  const mode = state.mode;
  if (!simulations[mode]) {
    const factories = {
      boids: createBoidsSimulation,
      physics: createPhysicsSimulation,
      fluid: createFluidSimulation,
      parametric: createParametricSimulation,
    };
    simulations[mode] = factories[mode]();
  }
}

function resetCurrentSim() {
  const mode = state.mode;
  if (simulations[mode]) {
    simulations[mode]!.destroy();
    delete simulations[mode];
  }
  ensureSimulation();
}

function updateStats() {
  document.getElementById('stat-fps')!.textContent = `FPS: ${currentFps}`;
  const sim = simulations[state.mode];
  const count = sim ? sim.getCount() : '--';
  document.getElementById('stat-count')!.textContent =
    state.mode === 'fluid' ? `Grid: ${count}` : `Particles: ${count}`;
}

function resizeCanvas() {
  const container = document.getElementById('canvas-container')!;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(container.clientWidth * dpr);
  const h = Math.floor(container.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function frame(now: DOMHighResTimeStamp) {
  if (state.xrEnabled) return; // XR has its own loop

  requestAnimationFrame(frame);
  resizeCanvas();

  // FPS calculation
  frameCount++;
  if (now - fpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    fpsTime = now;
    updateStats();
  }

  const sim = simulations[state.mode];
  if (!sim) return;

  const encoder = device.createCommandEncoder();

  if (!state.paused) {
    sim.compute(encoder);
  }

  const textureView = context.getCurrentTexture().createView();
  sim.render(encoder, textureView, null);

  device.queue.submit([encoder.finish()]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: STATE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'shader-playground-state';

function saveState() {
  try {
    // Only persist user-configurable state, not transient mouse/runtime data
    const toSave = {
      mode: state.mode,
      colorTheme: state.colorTheme,
      boids: state.boids,
      physics: state.physics,
      fluid: state.fluid,
      parametric: state.parametric,
      camera: state.camera,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) { /* ignore quota errors */ }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    // Merge carefully — don't clobber transient fields or break structure
    if (parsed.mode && parsed.mode in DEFAULTS) state.mode = parsed.mode as SimMode;
    if (parsed.colorTheme && COLOR_THEMES[parsed.colorTheme]) state.colorTheme = parsed.colorTheme;
    if (parsed.boids) Object.assign(state.boids, parsed.boids);
    if (parsed.physics) Object.assign(state.physics, parsed.physics);
    if (parsed.fluid) Object.assign(state.fluid, parsed.fluid);
    if (parsed.parametric) Object.assign(state.parametric, parsed.parametric);
    if (parsed.camera) Object.assign(state.camera, parsed.camera);
  } catch (e) { /* ignore parse errors — start fresh */ }
}

function syncUIFromState() {
  // Activate correct tab
  document.querySelectorAll<HTMLElement>('.mode-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === state.mode));
  document.querySelectorAll<HTMLElement>('.param-group').forEach(g =>
    g.classList.toggle('active', g.dataset.mode === state.mode));

  // Sync all sliders and dropdowns
  for (const modeStr of Object.keys(PARAM_DEFS)) {
    const mode = modeStr as SimMode;
    const container = document.getElementById(`params-${mode}`)!;
    const params = modeParams(mode);
    container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(input => {
      const key = input.dataset.key!;
      if (key && key in params) {
        input.value = String(params[key]);
        const valueSpan = input.parentElement?.querySelector('.control-value');
        if (valueSpan) {
          const paramDef = findParamDef(mode, key);
          valueSpan.textContent = formatValue(Number(params[key]), paramDef ? paramDef.step ?? 0.01 : 0.01);
        }
      }
    });
    container.querySelectorAll<HTMLSelectElement>('select').forEach(sel => {
      const key = sel.dataset.key!;
      if (key && key in params) sel.value = String(params[key]);
    });
  }

  // Sync theme buttons
  document.querySelectorAll<HTMLButtonElement>('#theme-presets .preset-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.theme === state.colorTheme));

  // Rebuild shape params for current parametric shape
  rebuildShapeParams();
}


async function main() {
  const ok = await initWebGPU();
  if (!ok) return;

  initGrid();
  loadState();
  buildControls();
  buildThemeSelector();
  setupTabs();
  setupGlobalControls();
  setupMouseControls();
  setupShaderPanel();
  syncUIFromState();
  resizeCanvas();
  ensureSimulation();
  updateAll();

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(document.getElementById('canvas-container')!);

  requestAnimationFrame(frame);
}

main();

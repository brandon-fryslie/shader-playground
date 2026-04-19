import '../styles/main.css';
import type { SimMode, Simulation, AppState, Attractor, ThemeColors, RGBThemeColors, ParamDef, ParamSection, ShapeParamDef, XRCameraOverride, DepthRef, ModeParamsMap, ShapeName } from './types';

// WGSL shader imports — Vite loads these as raw strings
import SHADER_BOIDS_COMPUTE from './shaders/boids.compute.wgsl?raw';
import SHADER_BOIDS_RENDER from './shaders/boids.render.wgsl?raw';
import SHADER_NBODY_COMPUTE from './shaders/nbody.compute.wgsl?raw';
import SHADER_NBODY_STATS from './shaders/nbody.stats.wgsl?raw';
import SHADER_NBODY_RENDER from './shaders/nbody.render.wgsl?raw';
import SHADER_NBODY_CLASSIC_COMPUTE from './shaders/nbody.classic.compute.wgsl?raw';
import SHADER_NBODY_CLASSIC_RENDER from './shaders/nbody.classic.render.wgsl?raw';
import SHADER_FLUID_FORCES_ADVECT from './shaders/fluid.forces.wgsl?raw';
import SHADER_FLUID_DIFFUSE from './shaders/fluid.diffuse.wgsl?raw';
import SHADER_FLUID_PRESSURE from './shaders/fluid.pressure.wgsl?raw';
import SHADER_FLUID_DIVERGENCE from './shaders/fluid.divergence.wgsl?raw';
import SHADER_FLUID_GRADIENT from './shaders/fluid.gradient.wgsl?raw';
import SHADER_FLUID_RENDER from './shaders/fluid.render.wgsl?raw';
import SHADER_PARAMETRIC_COMPUTE from './shaders/parametric.compute.wgsl?raw';
import SHADER_PARAMETRIC_RENDER from './shaders/parametric.render.wgsl?raw';
import SHADER_REACTION_COMPUTE from './shaders/reaction.compute.wgsl?raw';
import SHADER_REACTION_RENDER from './shaders/reaction.render.wgsl?raw';
import SHADER_GRID from './shaders/grid.wgsl?raw';
import SHADER_XR_UI from './shaders/xr.ui.wgsl?raw';
import SHADER_POST_FADE from './shaders/post.fade.wgsl?raw';
import SHADER_POST_DOWNSAMPLE from './shaders/post.downsample.wgsl?raw';
import SHADER_POST_UPSAMPLE from './shaders/post.upsample.wgsl?raw';
import SHADER_POST_COMPOSITE from './shaders/post.composite.wgsl?raw';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 0: DIAGNOSTIC LOGGING
// ═══════════════════════════════════════════════════════════════════════════════
// [LAW:single-enforcer] All error paths funnel through logError so nothing
// vanishes silently — the original motivation is that XR sessions on Vision Pro
// ran into issues that produced no console output at all. Every error now:
//   1. prints to console.error with a kind tag
//   2. appends to window.__errorLog (inspectable from remote Safari Web Inspector)
//   3. renders into the floating DOM overlay (visible on desktop; persistent)
//   4. attributes itself to the most recent GPU phase via currentGpuPhase
//
// Attribution matters because WebGPU validation errors surface asynchronously
// via onuncapturederror — without a phase tag, you can't tell which operation
// produced them.

interface ErrorLogEntry {
  t: number;
  kind: string;
  phase: string;
  msg: string;
  stack?: string;
}
// Ring-buffer cap: a misbehaving shader or device-lost loop can fire logError hundreds
// of times per second. Without a cap, __errorLog would grow unbounded and hold onto
// old stack traces indefinitely. 200 entries is enough for post-mortem context while
// keeping memory bounded to ~200KB worst-case.
const ERROR_LOG_MAX = 200;
const __errorLog: ErrorLogEntry[] = [];

// Most recent GPU-touching operation. Update before risky calls so that
// onuncapturederror and unhandledrejection can attribute blame.
let currentGpuPhase = 'boot';

function showErrorOverlay(line: string): void {
  let overlay = document.getElementById('gpu-error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gpu-error-overlay';
    overlay.style.cssText = 'position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;';
    document.body.appendChild(overlay);
  }
  const stamp = new Date().toLocaleTimeString();
  overlay.textContent = `[${stamp}] ${line}\n\n` + overlay.textContent;
}

function logError(kind: string, err: unknown, extra?: string): void {
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
  const msg = extra ? `${extra}: ${e.message}` : e.message;
  const entry: ErrorLogEntry = {
    t: performance.now(),
    kind,
    phase: currentGpuPhase,
    msg,
    stack: e.stack,
  };
  __errorLog.push(entry);
  if (__errorLog.length > ERROR_LOG_MAX) __errorLog.splice(0, __errorLog.length - ERROR_LOG_MAX);
  console.error(`[${kind}] (phase=${currentGpuPhase})`, msg, e.stack || '');
  showErrorOverlay(`[${kind}] (phase=${currentGpuPhase}) ${msg}`);
}

function logInfo(kind: string, msg: string, ...extra: unknown[]): void {
  console.info(`[${kind}] (phase=${currentGpuPhase})`, msg, ...extra);
}

// Expose the log for ad-hoc inspection from Safari Web Inspector.
(globalThis as unknown as { __errorLog: () => ErrorLogEntry[] }).__errorLog = () => __errorLog.slice();
(globalThis as unknown as { __gpuPhase: () => string }).__gpuPhase = () => currentGpuPhase;

// Catch anything that escapes our try/catch blocks or a rogue async path.
// Registered at module load so they see everything, even errors during init.
window.addEventListener('error', (ev) => {
  logError('window.error', ev.error ?? ev.message, `at ${ev.filename}:${ev.lineno}:${ev.colno}`);
});
window.addEventListener('unhandledrejection', (ev) => {
  logError('unhandledrejection', ev.reason);
});

// Wraps device.createShaderModule with async compilation-info reporting.
// In WebGPU, shader compile failures do NOT throw from createShaderModule —
// they surface later as pipeline-creation or render-time validation errors
// with messages that rarely pinpoint the shader line. Surfacing them here,
// with the offending source line quoted, is the only reliable diagnosis.
function createShaderModuleChecked(label: string, code: string): GPUShaderModule {
  const module = device.createShaderModule({ label, code });
  module.getCompilationInfo().then(info => {
    if (info.messages.length === 0) return;
    const lines = code.split('\n');
    let hasError = false;
    for (const m of info.messages) {
      const srcLine = (lines[m.lineNum - 1] || '').trimEnd();
      const marker = ' '.repeat(Math.max(0, m.linePos - 1)) + '^';
      const body = `[shader:${label}] ${m.type.toUpperCase()} line ${m.lineNum}:${m.linePos} ${m.message}\n  ${srcLine}\n  ${marker}`;
      if (m.type === 'error') {
        hasError = true;
        logError(`shader:${label}`, new Error(body));
      } else if (m.type === 'warning') {
        console.warn(body);
      } else {
        console.info(body);
      }
    }
    if (!hasError) logInfo(`shader:${label}`, `compiled with ${info.messages.length} non-error messages`);
  }).catch(e => logError(`shader:${label}:compilationInfo`, e));
  return module;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONSTANTS, DEFAULTS, PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULTS: ModeParamsMap = {
  boids: {
    count: 1000, separationRadius: 25, alignmentRadius: 50, cohesionRadius: 50,
    maxSpeed: 2.0, maxForce: 0.05, visualRange: 100
  },
  physics: {
    count: 80000, G: 1.0, softening: 1.5, distribution: 'disk',
    interactionStrength: 1.0, tidalStrength: 0.008,
    attractorDecayRatio: 0.5, attractorDecayCap: 2.0,
    haloMass: 5.0, haloScale: 2.0, diskMass: 3.0, diskScaleA: 1.5, diskScaleB: 0.3,
  },
  physics_classic: {
    // Verbatim defaults from the original shader-playground for fair A/B comparison.
    count: 500, G: 1.0, softening: 0.5, damping: 0.999, distribution: 'random',
  },
  fluid: {
    resolution: 256, viscosity: 0.1, diffusionRate: 0.001, forceStrength: 100, volumeScale: 1.5,
    dyeMode: 'rainbow', jacobiIterations: 40
  },
  parametric: {
    shape: 'torus', scale: 1.0,
    p1Min: 0.7,    p1Max: 1.3,  p1Rate: 0.3,
    p2Min: 0.2,    p2Max: 0.55, p2Rate: 0.5,
    p3Min: 0.15,   p3Max: 0.45, p3Rate: 0.7,
    p4Min: 0.5,    p4Max: 2.0,  p4Rate: 0.4,
    twistMin: 0.0, twistMax: 0.4, twistRate: 0.15,
  },
  reaction: {
    resolution: 128,
    feed: 0.055, kill: 0.062,
    Du: 0.2097, Dv: 0.105,
    stepsPerFrame: 4,
    isoThreshold: 0.25,
    preset: 'Spots',
  },
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
    'Default':       { ...DEFAULTS.physics },
    'Spiral Galaxy': { count: 100000, G: 1.5, softening: 0.15, distribution: 'spiral',
                       interactionStrength: 1.0, tidalStrength: 0.005,
                       haloMass: 8.0, haloScale: 2.5, diskMass: 4.0, diskScaleA: 1.2, diskScaleB: 0.15 },
    'Cosmic Web':    { count: 80000, G: 0.8, softening: 2.0, distribution: 'web',
                       interactionStrength: 1.0, tidalStrength: 0.025,
                       haloMass: 2.0, haloScale: 4.0, diskMass: 0.0, diskScaleA: 1.5, diskScaleB: 0.3 },
    'Star Cluster':  { count: 60000, G: 0.3, softening: 1.2, distribution: 'cluster',
                       interactionStrength: 1.0, tidalStrength: 0.001,
                       haloMass: 3.0, haloScale: 1.5, diskMass: 0.0, diskScaleA: 1.0, diskScaleB: 0.5 },
    'Maelstrom':     { count: 120000, G: 0.25, softening: 2.5, distribution: 'maelstrom',
                       interactionStrength: 1.5, tidalStrength: 0.005,
                       haloMass: 6.0, haloScale: 1.8, diskMass: 5.0, diskScaleA: 0.8, diskScaleB: 0.2 },
    'Dust Cloud':    { count: 150000, G: 0.08, softening: 3.5, distribution: 'dust',
                       interactionStrength: 0.5, tidalStrength: 0.003,
                       haloMass: 1.0, haloScale: 5.0, diskMass: 0.0, diskScaleA: 2.0, diskScaleB: 0.5 },
    'Binary':        { count: 80000, G: 0.6, softening: 1.0, distribution: 'binary',
                       interactionStrength: 1.0, tidalStrength: 0.04,
                       haloMass: 4.0, haloScale: 2.0, diskMass: 2.0, diskScaleA: 1.0, diskScaleB: 0.25 },
  },
  physics_classic: {
    'Default':  { ...DEFAULTS.physics_classic },
    'Galaxy':   { count: 3000, G: 0.5, softening: 1.0, damping: 0.998, distribution: 'disk' },
    'Collapse': { count: 2000, G: 10.0, softening: 0.1, damping: 0.995, distribution: 'shell' },
    'Gentle':   { count: 1000, G: 0.1, softening: 2.0, damping: 0.9999, distribution: 'random' },
  },
  fluid: {
    'Default':   { ...DEFAULTS.fluid },
    'Thick':     { resolution: 256, viscosity: 0.8, diffusionRate: 0.005, forceStrength: 200, volumeScale: 1.8, dyeMode: 'rainbow', jacobiIterations: 40 },
    'Turbulent': { resolution: 512, viscosity: 0.01, diffusionRate: 0.0001, forceStrength: 300, volumeScale: 1.3, dyeMode: 'rainbow', jacobiIterations: 60 },
    'Ink Drop':  { resolution: 256, viscosity: 0.3, diffusionRate: 0.0, forceStrength: 50, volumeScale: 2.1, dyeMode: 'single', jacobiIterations: 40 },
  },
  parametric: {
    'Default':       { shape: 'torus',   scale: 1.0, p1Min: 0.7,  p1Max: 1.3,  p1Rate: 0.3,  p2Min: 0.2,  p2Max: 0.55, p2Rate: 0.5,  p3Min: 0.15, p3Max: 0.45, p3Rate: 0.7,  p4Min: 0.5, p4Max: 2.0, p4Rate: 0.4,  twistMin: 0,   twistMax: 0.4, twistRate: 0.15 },
    'Rippling Ring': { shape: 'torus',   scale: 1.0, p1Min: 0.5,  p1Max: 1.5,  p1Rate: 0.5,  p2Min: 0.15, p2Max: 0.7,  p2Rate: 0.7,  p3Min: 0.3,  p3Max: 0.8,  p3Rate: 1.0,  p4Min: 1.0, p4Max: 3.0, p4Rate: 0.6,  twistMin: 0,   twistMax: 1.0, twistRate: 0.2  },
    'Wild Möbius':   { shape: 'mobius',  scale: 1.5, p1Min: 0.8,  p1Max: 2.0,  p1Rate: 0.3,  p2Min: 1.0,  p2Max: 3.0,  p2Rate: 0.15, p3Min: 0.2,  p3Max: 0.6,  p3Rate: 0.8,  p4Min: 0.5, p4Max: 2.5, p4Rate: 0.5,  twistMin: 1.0, twistMax: 4.0, twistRate: 0.1  },
    'Trefoil Pulse': { shape: 'trefoil', scale: 1.2, p1Min: 0.08, p1Max: 0.35, p1Rate: 0.9,  p2Min: 0.25, p2Max: 0.55, p2Rate: 0.4,  p3Min: 0.3,  p3Max: 0.9,  p3Rate: 1.2,  p4Min: 1.0, p4Max: 4.0, p4Rate: 0.7,  twistMin: 0,   twistMax: 0.5, twistRate: 0.2  },
    'Klein Chaos':   { shape: 'klein',   scale: 1.2, p1Min: 0.5,  p1Max: 1.5,  p1Rate: 0.4,  p2Min: 0,    p2Max: 0,    p2Rate: 0,    p3Min: 0.2,  p3Max: 0.6,  p3Rate: 0.9,  p4Min: 0.8, p4Max: 3.5, p4Rate: 0.5,  twistMin: 0,   twistMax: 0.8, twistRate: 0.15 },
  },
  reaction: {
    'Spots':   { resolution: 128, feed: 0.055,  kill: 0.062,  Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Spots' },
    'Mazes':   { resolution: 128, feed: 0.029,  kill: 0.057,  Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Mazes' },
    'Worms':   { resolution: 128, feed: 0.058,  kill: 0.065,  Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Worms' },
    'Mitosis': { resolution: 128, feed: 0.0367, kill: 0.0649, Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Mitosis' },
    'Coral':   { resolution: 128, feed: 0.062,  kill: 0.062,  Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Coral' },
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
      { key: 'count', label: 'Bodies', min: 10, max: 150000, step: 10, requiresReset: true },
      { key: 'G', label: 'Gravity (G)', min: 0.05, max: 5.0, step: 0.01 },
      { key: 'softening', label: 'Softening', min: 0.2, max: 4.0, step: 0.05 },
      { key: 'interactionStrength', label: 'Interaction Pull', min: 0.1, max: 3.0, step: 0.05 },
      { key: 'attractorDecayRatio', label: 'Decay Ratio', min: 0.1, max: 4.0, step: 0.05 },
      { key: 'attractorDecayCap', label: 'Decay Cap (s)', min: 0.5, max: 10.0, step: 0.1 },
      { key: 'tidalStrength', label: 'Tidal Field', min: 0.0, max: 0.05, step: 0.0005 },
    ]},
    { section: 'Initial State', params: [
      { key: 'distribution', label: 'Distribution', type: 'dropdown', options: ['random', 'disk', 'shell'] },
    ]},
    { section: 'Dark Matter', params: [
      { key: 'haloMass', label: 'Halo Mass', min: 0.0, max: 15.0, step: 0.1 },
      { key: 'haloScale', label: 'Halo Scale', min: 0.5, max: 8.0, step: 0.1 },
      { key: 'diskMass', label: 'Disk Mass', min: 0.0, max: 10.0, step: 0.1 },
      { key: 'diskScaleA', label: 'Disk Scale A', min: 0.1, max: 5.0, step: 0.05 },
      { key: 'diskScaleB', label: 'Disk Scale B', min: 0.05, max: 2.0, step: 0.01 },
    ]},
  ],
  physics_classic: [
    { section: 'Simulation', params: [
      { key: 'count', label: 'Bodies', min: 10, max: 10000, step: 10, requiresReset: true },
      { key: 'G', label: 'Gravity (G)', min: 0.01, max: 100.0, step: 0.01 },
      { key: 'softening', label: 'Softening', min: 0.01, max: 10.0, step: 0.01 },
      { key: 'damping', label: 'Damping', min: 0.9, max: 1.0, step: 0.001 },
    ]},
    { section: 'Initial State', params: [
      { key: 'distribution', label: 'Distribution', type: 'dropdown', options: ['random', 'disk', 'shell'], requiresReset: true },
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
      { key: 'volumeScale', label: 'Volume', min: 0.4, max: 3.0, step: 0.05 },
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
  reaction: [
    { section: 'Volume', params: [
      { key: 'resolution', label: 'Resolution', type: 'dropdown', options: [64, 128], requiresReset: true },
      { key: 'stepsPerFrame', label: 'Steps/Frame', min: 1, max: 12, step: 1 },
    ]},
    { section: 'Reaction', params: [
      { key: 'feed', label: 'Feed',  min: 0.01, max: 0.10, step: 0.0005 },
      { key: 'kill', label: 'Kill',  min: 0.03, max: 0.08, step: 0.0005 },
      { key: 'Du',   label: 'Du',    min: 0.05, max: 0.35, step: 0.001 },
      { key: 'Dv',   label: 'Dv',    min: 0.02, max: 0.20, step: 0.001 },
    ]},
    { section: 'Render', params: [
      { key: 'isoThreshold', label: 'Iso Threshold', min: 0.05, max: 0.6, step: 0.01 },
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
const DEFAULT_THEME = 'Dracula';
const THEME_FADE_MS = 12000;
const DEFAULT_CLEAR_COLOR: GPUColor = { r: 0.02, g: 0.02, b: 0.025, a: 1 };

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function getThemeColorsForName(themeName: string): RGBThemeColors {
  const t = COLOR_THEMES[themeName] || COLOR_THEMES[DEFAULT_THEME];
  return {
    primary: hexToRgb(t.primary),
    secondary: hexToRgb(t.secondary),
    accent: hexToRgb(t.accent),
    bg: hexToRgb(t.bg),
    fg: hexToRgb(t.fg),
    clearColor: { r: hexToRgb(t.bg)[0], g: hexToRgb(t.bg)[1], b: hexToRgb(t.bg)[2], a: 1 },
  };
}

function mixRgb(a: number[], b: number[], t: number): number[] {
  return a.map((value, index) => value + (b[index] - value) * t);
}

function mixThemeColors(from: RGBThemeColors, to: RGBThemeColors, t: number): RGBThemeColors {
  const bg = mixRgb(from.bg, to.bg, t);
  return {
    primary: mixRgb(from.primary, to.primary, t),
    secondary: mixRgb(from.secondary, to.secondary, t),
    accent: mixRgb(from.accent, to.accent, t),
    bg,
    fg: mixRgb(from.fg, to.fg, t),
    clearColor: { r: bg[0], g: bg[1], b: bg[2], a: 1 },
  };
}

// [LAW:one-source-of-truth] Selected theme name is canonical; animated render colors derive from this transition state.
const themeTransition = {
  from: getThemeColorsForName(DEFAULT_THEME),
  to: getThemeColorsForName(DEFAULT_THEME),
  startedAtMs: 0,
};

let currentThemeColors = getThemeColorsForName(DEFAULT_THEME);

function computeThemeColors(now: number): RGBThemeColors {
  const progress = Math.max(0, Math.min(1, (now - themeTransition.startedAtMs) / THEME_FADE_MS));
  return mixThemeColors(themeTransition.from, themeTransition.to, progress);
}

function getThemeColors(): RGBThemeColors {
  return currentThemeColors;
}

function refreshThemeColors(now: number): void {
  currentThemeColors = computeThemeColors(now);
}

function syncThemeTransition(themeName: string): void {
  const colors = getThemeColorsForName(themeName);
  themeTransition.from = colors;
  themeTransition.to = colors;
  themeTransition.startedAtMs = 0;
  currentThemeColors = colors;
}

function startThemeTransition(themeName: string, now = performance.now()): void {
  const nextColors = getThemeColorsForName(themeName);
  const currentColors = computeThemeColors(now);
  themeTransition.from = currentColors;
  themeTransition.to = nextColors;
  themeTransition.startedAtMs = now;
  currentThemeColors = currentColors;
}

// Dynamic access to mode-specific params — casts for TypeScript's correlated types limitation
function modeParams(mode: SimMode): Record<string, number | string> {
  return state[mode] as unknown as Record<string, number | string>;
}

const state: AppState = {
  mode: 'physics',
  colorTheme: 'Dracula',
  xrEnabled: false,
  paused: false,
  boids: { ...DEFAULTS.boids },
  physics: { ...DEFAULTS.physics },
  physics_classic: { ...DEFAULTS.physics_classic },
  fluid: { ...DEFAULTS.fluid },
  parametric: { ...DEFAULTS.parametric },
  reaction: { ...DEFAULTS.reaction },
  camera: { distance: 5.0, fov: 60, rotX: 0.3, rotY: 0.0, panX: 0, panY: 0 },
  mouse: { down: false, x: 0, y: 0, dx: 0, dy: 0, worldX: 0, worldY: 0, worldZ: 0 },
  // [LAW:one-source-of-truth] Attractors are the canonical N-body interaction state.
  // Held attractors have releaseTime < 0 and holdDuration < 0 (follow cursor, strength charging).
  // Released attractors decay over 2 × holdDuration, then get pruned from the array.
  // Max cap of 32 is a safety rail — in practice users hit 5-10 concurrent at most.
  attractors: [] as Attractor[],
  pointerToAttractor: new Map<number, number>() as Map<number, number>,
  fx: {
    bloomIntensity: 0.7,
    bloomThreshold: 4.0,
    bloomRadius: 1.0,
    trailPersistence: 0.0,
    exposure: 1.0,
    vignette: 0.35,
    chromaticAberration: 0.25,
    grading: 0.5,
    timeScale: 1.0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ATTRACTOR LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

// [LAW:one-source-of-truth] Timing constants own the attractor behavior contract.
// Decay ratio + cap are user-tunable via sliders on state.physics.
const ATTRACTOR_CHARGE_TIME = 1.5;        // seconds to reach full strength (quadratic ramp)
const ATTRACTOR_MAX = 32;                 // hard cap; oldest evicted if exceeded
const ATTRACTOR_MIN_DECAY = 0.05;         // seconds — floor so instant taps still visually decay

function nowSeconds() { return performance.now() * 0.001; }

// [LAW:single-enforcer] Decay duration owned here. Ratio/cap from user sliders, clamped at both ends.
function attractorDecayDuration(a: Attractor): number {
  const ratio = state.physics.attractorDecayRatio ?? 0.5;
  const cap = state.physics.attractorDecayCap ?? 2.0;
  return Math.max(ATTRACTOR_MIN_DECAY, Math.min(cap, ratio * a.holdDuration));
}

// [LAW:dataflow-not-control-flow] Strength is a pure function of (attractor, now).
function attractorStrength(a: Attractor, now: number, ceiling: number): number {
  if (a.releaseTime < 0) {
    const t = Math.min(1, (now - a.chargeStart) / ATTRACTOR_CHARGE_TIME);
    return t * t * ceiling;
  }
  const peakT = Math.min(1, a.holdDuration / ATTRACTOR_CHARGE_TIME);
  const peak = peakT * peakT * ceiling;
  const elapsed = now - a.releaseTime;
  const decayDur = attractorDecayDuration(a);
  if (elapsed >= decayDur) return 0;
  const remaining = 1 - elapsed / decayDur;
  return peak * remaining * remaining;
}

function attractorDead(a: Attractor, now: number): boolean {
  if (a.releaseTime < 0) return false;
  return (now - a.releaseTime) >= attractorDecayDuration(a);
}

// [LAW:single-enforcer] Pruning happens in exactly one place per frame, before uniform upload.
// Rebuilds pointerToAttractor index mapping since array indices shift after splice.
function pruneAttractors(now: number) {
  const kept: Attractor[] = [];
  const oldToNew = new Map<number, number>();
  for (let i = 0; i < state.attractors.length; i++) {
    const a = state.attractors[i];
    if (!attractorDead(a, now)) {
      oldToNew.set(i, kept.length);
      kept.push(a);
    }
  }
  state.attractors = kept;
  const newMap = new Map<number, number>();
  state.pointerToAttractor.forEach((oldIdx, pointerId) => {
    const newIdx = oldToNew.get(oldIdx);
    if (newIdx !== undefined) newMap.set(pointerId, newIdx);
  });
  state.pointerToAttractor = newMap;
}

function createAttractor(pointerId: number, pos: number[]): void {
  // [LAW:single-enforcer] Block attractor creation during reverse — the journal owns attractor forces.
  const sim = simulations[state.mode];
  if (sim && 'getTimeDirection' in sim && (sim as any).getTimeDirection() < 0) return;
  // Force-evict oldest if we're at the cap. Oldest by insertion order.
  if (state.attractors.length >= ATTRACTOR_MAX) {
    state.attractors.shift();
    // All indices shift down by 1.
    const rebuilt = new Map<number, number>();
    state.pointerToAttractor.forEach((idx, pid) => {
      if (idx > 0) rebuilt.set(pid, idx - 1);
    });
    state.pointerToAttractor = rebuilt;
  }
  const now = nowSeconds();
  state.attractors.push({
    x: pos[0], y: pos[1], z: pos[2],
    chargeStart: now, releaseTime: -1, holdDuration: -1,
  });
  state.pointerToAttractor.set(pointerId, state.attractors.length - 1);
}

function moveAttractor(pointerId: number, pos: number[]): void {
  const idx = state.pointerToAttractor.get(pointerId);
  if (idx === undefined) return;
  const a = state.attractors[idx];
  if (!a || a.releaseTime >= 0) return;
  a.x = pos[0]; a.y = pos[1]; a.z = pos[2];
}

function releaseAttractor(pointerId: number): void {
  const idx = state.pointerToAttractor.get(pointerId);
  if (idx === undefined) return;
  state.pointerToAttractor.delete(pointerId);
  const a = state.attractors[idx];
  if (!a || a.releaseTime >= 0) return;
  const now = nowSeconds();
  a.releaseTime = now;
  a.holdDuration = Math.max(0.05, now - a.chargeStart); // min 50ms to avoid zero-duration divide
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: WGSL SHADERS
// ═══════════════════════════════════════════════════════════════════════════════










const FLUID_GRID_RES = 96; // tessellation resolution for 3D fluid mesh
// [LAW:one-source-of-truth] Fluid world size is declared once so rendering and interaction use identical bounds.
const FLUID_WORLD_SIZE = 4; // full width/depth of the fluid volume in world units

// Camera uniform buffer layout for stereo XR rendering.
// Each view's 192-byte Camera struct is placed at a 256-byte aligned offset so
// both eyes can coexist in one buffer. writeBuffer calls go to different offsets,
// so neither overwrites the other before the command buffer executes.
const CAMERA_SIZE = 208;   // sizeof(Camera) in WGSL — includes interaction state
const CAMERA_STRIDE = 256; // >= CAMERA_SIZE, multiple of minUniformBufferOffsetAlignment
// [LAW:one-source-of-truth] Desktop projection range is owned here so every pass sees the same far-plane budget.
const DESKTOP_CAMERA_FAR = 500.0;


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

// When set by XR frame loop, overrides orbit camera for all rendering
let xrCameraOverride: XRCameraOverride | null = null;

// [LAW:one-source-of-truth] When set, getDepthAttachment uses this XR-compositor-owned
// depth view instead of postFx.depth. Submitting per-pixel depth to the compositor lets
// Vision Pro do parallax-correct reprojection during head motion — without it, the
// compositor can only planar-warp and the scene appears to shear/jitter as you turn.
let xrDepthOverride: GPUTextureView | null = null;

// ---------- HDR / Bloom / Post-FX shared state ----------
// [LAW:one-source-of-truth] HDR scene textures, bloom mip chain, and post pipelines are owned here. Sims never see them directly.
type PostFxState = {
  scene: GPUTexture[];     // ping-pong [0,1]
  sceneIdx: number;
  depth: GPUTexture | null;
  bloomMips: GPUTexture[]; // 5 mips, halved each level
  width: number;
  height: number;
  needsClear: boolean;     // forces a one-frame clear after resize / sim swap
  linSampler: GPUSampler | null;
  // pipelines
  fadePipeline: GPURenderPipeline | null;
  downsamplePipeline: GPURenderPipeline | null;
  upsamplePipelineAdditive: GPURenderPipeline | null;
  upsamplePipelineReplace: GPURenderPipeline | null;
  compositePipelines: Map<string, GPURenderPipeline>;
  // bind group layouts
  fadeBGL: GPUBindGroupLayout | null;
  downsampleBGL: GPUBindGroupLayout | null;
  upsampleBGL: GPUBindGroupLayout | null;
  compositeBGL: GPUBindGroupLayout | null;
  // per-frame uniform buffers (one each, rewritten per pass)
  fadeUBO: GPUBuffer | null;
  downsampleUBO: GPUBuffer[];   // one per mip level (so we can encode all in one frame)
  upsampleUBO: GPUBuffer[];
  compositeUBO: GPUBuffer | null;
  // Cached views and bind groups — rebuilt only on resize, not per-frame.
  sceneViews: GPUTextureView[];        // [0] and [1] for ping-pong
  bloomMipViews: GPUTextureView[];     // one per mip
  fadeBGs: GPUBindGroup[];             // [prevIdx] → bind group reading scene[prevIdx]
  downsampleBGs: GPUBindGroup[];       // [i] → downsample from scene(i=0) or mip[i-1]
  upsampleBGs: GPUBindGroup[];         // [i] → upsample from mip[i]
  // Pre-allocated staging arrays to avoid per-frame Float32Array allocations.
  // [LAW:one-source-of-truth] Explicit ArrayBuffer generic keeps WebGPU writeBuffer calls type-clean — TS 5.7+
  // widened Float32Array to ArrayBufferLike by default, which GPUAllowSharedBufferSource won't accept.
  fadeParams: Float32Array<ArrayBuffer>;
  downsampleParams: Float32Array<ArrayBuffer>[];
  upsampleParams: Float32Array<ArrayBuffer>[];
  compositeParams: Float32Array<ArrayBuffer>;
  compositeBGs: GPUBindGroup[];
};
const postFx: PostFxState = {
  scene: [],
  sceneIdx: 0,
  depth: null,
  bloomMips: [],
  width: 0,
  height: 0,
  needsClear: true,
  linSampler: null,
  fadePipeline: null,
  downsamplePipeline: null,
  upsamplePipelineAdditive: null,
  upsamplePipelineReplace: null,
  compositePipelines: new Map(),
  fadeBGL: null,
  downsampleBGL: null,
  upsampleBGL: null,
  compositeBGL: null,
  fadeUBO: null,
  downsampleUBO: [],
  upsampleUBO: [],
  compositeUBO: null,
  sceneViews: [],
  bloomMipViews: [],
  fadeBGs: [],
  downsampleBGs: [],
  upsampleBGs: [],
  fadeParams: new Float32Array(4),
  downsampleParams: [],
  upsampleParams: [],
  compositeBGs: [],
  compositeParams: new Float32Array(148), // 20 header + 32 × 4 attractor slots; matches 592-byte UBO
};
const HDR_FORMAT: GPUTextureFormat = 'rgba16float';
const BLOOM_LEVELS = 3; // 5 mips made the largest blur radius half-screen, fusing dense clusters into a giant white blob.

function initPostFx(): void {
  postFx.linSampler = device.createSampler({
    magFilter: 'linear', minFilter: 'linear',
    addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
  });

  // Bind group layouts
  postFx.fadeBGL = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
  ]});
  postFx.downsampleBGL = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
  ]});
  postFx.upsampleBGL = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
  ]});
  postFx.compositeBGL = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
  ]});

  const fadeMod = createShaderModuleChecked('post.fade', SHADER_POST_FADE);
  const downMod = createShaderModuleChecked('post.downsample', SHADER_POST_DOWNSAMPLE);
  const upMod = createShaderModuleChecked('post.upsample', SHADER_POST_UPSAMPLE);

  postFx.fadePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [postFx.fadeBGL] }),
    vertex: { module: fadeMod, entryPoint: 'vs_main' },
    fragment: { module: fadeMod, entryPoint: 'fs_main', targets: [{ format: HDR_FORMAT }] },
    primitive: { topology: 'triangle-list' },
  });
  postFx.downsamplePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [postFx.downsampleBGL] }),
    vertex: { module: downMod, entryPoint: 'vs_main' },
    fragment: { module: downMod, entryPoint: 'fs_main', targets: [{ format: HDR_FORMAT }] },
    primitive: { topology: 'triangle-list' },
  });
  postFx.upsamplePipelineAdditive = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [postFx.upsampleBGL] }),
    vertex: { module: upMod, entryPoint: 'vs_main' },
    fragment: { module: upMod, entryPoint: 'fs_main', targets: [{
      format: HDR_FORMAT,
      blend: {
        color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
      },
    }] },
    primitive: { topology: 'triangle-list' },
  });
  postFx.upsamplePipelineReplace = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [postFx.upsampleBGL] }),
    vertex: { module: upMod, entryPoint: 'vs_main' },
    fragment: { module: upMod, entryPoint: 'fs_main', targets: [{ format: HDR_FORMAT }] },
    primitive: { topology: 'triangle-list' },
  });

  // Allocate UBOs
  postFx.fadeUBO = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  postFx.downsampleUBO = [];
  postFx.upsampleUBO = [];
  for (let i = 0; i < BLOOM_LEVELS; i++) {
    postFx.downsampleUBO.push(device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
    postFx.upsampleUBO.push(device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
  }
  // [LAW:one-source-of-truth] Composite UBO size must match post.composite.wgsl CompositeParams:
  // 80 bytes of header + 32 × 16-byte ReticleAttractor = 592 bytes.
  postFx.compositeUBO = device.createBuffer({ size: 592, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // Pre-allocate staging arrays — reused every frame instead of allocating new Float32Arrays.
  postFx.fadeParams = new Float32Array(4);
  postFx.compositeParams = new Float32Array(148); // 20 header + 32 × 4 attractor slots
  postFx.downsampleParams = [];
  postFx.upsampleParams = [];
  for (let i = 0; i < BLOOM_LEVELS; i++) {
    postFx.downsampleParams.push(new Float32Array(4));
    postFx.upsampleParams.push(new Float32Array(4));
  }
}

function ensureCompositePipeline(format: GPUTextureFormat): GPURenderPipeline {
  let p = postFx.compositePipelines.get(format);
  if (p) return p;
  const mod = createShaderModuleChecked('post.composite', SHADER_POST_COMPOSITE);
  p = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [postFx.compositeBGL!] }),
    vertex: { module: mod, entryPoint: 'vs_main' },
    fragment: { module: mod, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });
  postFx.compositePipelines.set(format, p);
  return p;
}

function ensureHdrTargets(width: number, height: number): void {
  if (postFx.width === width && postFx.height === height && postFx.scene.length === 2) return;
  // destroy old
  for (const t of postFx.scene) t.destroy();
  for (const t of postFx.bloomMips) t.destroy();
  postFx.depth?.destroy();
  postFx.scene = [];
  postFx.bloomMips = [];

  postFx.width = width;
  postFx.height = height;
  for (let i = 0; i < 2; i++) {
    postFx.scene.push(device.createTexture({
      size: [width, height],
      format: HDR_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    }));
  }
  postFx.depth = device.createTexture({
    size: [width, height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  let w = Math.max(1, Math.floor(width / 2));
  let h = Math.max(1, Math.floor(height / 2));
  for (let i = 0; i < BLOOM_LEVELS; i++) {
    postFx.bloomMips.push(device.createTexture({
      size: [w, h],
      format: HDR_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    }));
    w = Math.max(1, Math.floor(w / 2));
    h = Math.max(1, Math.floor(h / 2));
  }
  postFx.needsClear = true;

  // Cache texture views — stable until next resize.
  postFx.sceneViews = postFx.scene.map(t => t.createView());
  postFx.bloomMipViews = postFx.bloomMips.map(t => t.createView());

  // Cache bind groups for fade (one per scene index as input).
  postFx.fadeBGs = postFx.sceneViews.map(view =>
    device.createBindGroup({ layout: postFx.fadeBGL!, entries: [
      { binding: 0, resource: view },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.fadeUBO! } },
    ]})
  );

  // Cache bind groups for downsample chain.
  // Index 0 reads scene (two variants for ping-pong); subsequent mips read the previous mip.
  postFx.downsampleBGs = [];
  // Two bind groups for mip 0 (one per scene texture)
  for (let s = 0; s < 2; s++) {
    postFx.downsampleBGs.push(device.createBindGroup({ layout: postFx.downsampleBGL!, entries: [
      { binding: 0, resource: postFx.sceneViews[s] },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.downsampleUBO[0] } },
    ]}));
  }
  // One bind group per subsequent mip level
  for (let i = 1; i < BLOOM_LEVELS; i++) {
    postFx.downsampleBGs.push(device.createBindGroup({ layout: postFx.downsampleBGL!, entries: [
      { binding: 0, resource: postFx.bloomMipViews[i - 1] },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.downsampleUBO[i] } },
    ]}));
  }

  // Cache bind groups for upsample chain.
  postFx.upsampleBGs = postFx.bloomMipViews.map((view, i) =>
    device.createBindGroup({ layout: postFx.upsampleBGL!, entries: [
      { binding: 0, resource: view },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.upsampleUBO[i] } },
    ]})
  );

  // Cache composite bind groups — one per scene index (ping-pong).
  // The render target (swapchain view) is not part of the bind group.
  postFx.compositeBGs = postFx.sceneViews.map(sceneView =>
    device.createBindGroup({ layout: postFx.compositeBGL!, entries: [
      { binding: 0, resource: sceneView },
      { binding: 1, resource: postFx.bloomMipViews[0] },
      { binding: 2, resource: postFx.linSampler! },
      { binding: 3, resource: { buffer: postFx.compositeUBO! } },
    ]})
  );
}

// Sims call this to get the current HDR scene texture view (the render target).
function getCurrentSceneView(): GPUTextureView {
  return postFx.scene[postFx.sceneIdx].createView();
}

// [LAW:dataflow-not-control-flow] All sims always render into HDR offscreen; loadOp is data-driven from postFx.needsClear / trail persistence.
function getColorAttachment(
  _simDepthRef: DepthRef,
  _resolveTarget: GPUTextureView,  // ignored — sims always render to HDR scene
  _viewport: number[] | null
): GPURenderPassColorAttachment {
  const trails = state.fx.trailPersistence > 0.001;
  const useLoad = trails && !postFx.needsClear;
  return {
    view: getCurrentSceneView(),
    clearValue: DEFAULT_CLEAR_COLOR,
    loadOp: useLoad ? 'load' : 'clear',
    storeOp: 'store',
  };
}

function getDepthAttachment(_simDepthRef: DepthRef, _viewport: number[] | null): GPURenderPassDepthStencilAttachment {
  // [LAW:dataflow-not-control-flow] Same attachment shape every call; only the view varies.
  // XR mode supplies the compositor's depth view so head-motion reprojection works correctly.
  return {
    view: xrDepthOverride ?? postFx.depth!.createView(),
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  };
}

function getRenderViewport(viewport: number[] | null): number[] | null {
  return viewport;
}

function destroyDepthRef(_depthRef: DepthRef) {
  // Depth and color targets are now shared/global; nothing per-sim to destroy.
}

function getCameraUniformData(aspect: number) {
  const tc = getThemeColors();
  const data = new Float32Array(52);

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

  // Interaction state — packed into camera buffer padding so render shaders can visualize it.
  const m = state.mouse;
  data[48] = m.worldX;
  data[49] = m.worldY;
  data[50] = m.worldZ;
  data[51] = m.down ? 1.0 : 0.0;
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
let renderSampleCount = 1;

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
    const wantFeatures: GPUFeatureName[] = [];
    if (adapter.features.has('timestamp-query')) wantFeatures.push('timestamp-query');
    device = await adapter.requestDevice({ requiredFeatures: wantFeatures });
  } catch (e) {
    showFallback(`requestDevice() failed: ${(e as Error).message}`);
    return false;
  }

  initGpuTimestamps();

  device.lost.then((info) => {
    logError('webgpu:device-lost', new Error(info.message), `reason=${info.reason}`);
    if (info.reason !== 'destroyed') {
      initWebGPU().then(ok => { if (ok) { initGrid(); initXrUi(); ensureSimulation(); requestAnimationFrame(frame); } });
    }
  });

  // Capture validation errors from any async GPU operation. Phase attribution
  // (via currentGpuPhase) tells us which operation was in flight when this
  // fired — critical for diagnosing XR frame failures where the validation
  // error arrives long after the offending encode call returned.
  device.onuncapturederror = (ev: GPUUncapturedErrorEvent) => {
    logError('webgpu:uncaptured', ev.error);
  };

  canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;
  context = canvas.getContext('webgpu') as GPUCanvasContext;
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  // [LAW:one-source-of-truth] Sims always render into HDR offscreen; the swapchain is only the final composite target.
  renderTargetFormat = 'rgba16float';
  renderSampleCount = 1; // MSAA dropped — bloom + HDR replace it.
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });
  initPostFx();

  return true;
}

function syncRenderConfig(_nextFormat: GPUTextureFormat, _nextSampleCount: number) {
  // [LAW:one-source-of-truth] All sims always render into HDR (rgba16float). Composite output format
  // is handled per-call by ensureCompositePipeline(); this function no longer needs to rebuild anything.
  postFx.needsClear = true;
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
  const gridModule = createShaderModuleChecked('grid', SHADER_GRID);

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


// ═══ XR UI PANEL RENDERER ═══
// [LAW:one-source-of-truth] Panel layout constants live here; positions and widths
// are mirrored in src/shaders/xr.ui.wgsl. Hit-test half-extents (e.g. GRAB_HALF_H)
// are intentionally larger than the rendered SDF extents for easier targeting.
const XR_UI_PANEL_CENTER: [number, number, number] = [0, -0.4, -3.5];
const XR_UI_PANEL_SIZE: [number, number] = [1.2, 0.55];
const XR_UI_BTN_Y = 0.16;
const XR_UI_BTN_HALF_W = 0.18;  // wide enough for chevron + label side-by-side
const XR_UI_BTN_HALF_H = 0.11;
const XR_UI_PREV_X_FRAC = -0.30;  // aspect-relative
const XR_UI_NEXT_X_FRAC =  0.30;
const XR_UI_SLIDER_Y = -0.20;
const XR_UI_SLIDER_HALF_H = 0.05;
const XR_UI_SLIDER_HALF_W_FRAC = 0.42; // aspect-relative
// Grab handle — thin pill at the bottom of the panel for repositioning.
const XR_UI_GRAB_Y = -0.40;
const XR_UI_GRAB_HALF_W = 0.10;
const XR_UI_GRAB_HALF_H = 0.035;

// Label atlas layout — single canvas with non-uniform sub-rects so each label's
// aspect matches the panel rect it will be sampled into (no squishing):
//   [0.00 .. 0.25] PREV   — sub-rect 256×128, aspect 2:1 (matches button label)
//   [0.25 .. 0.50] NEXT   — sub-rect 256×128, aspect 2:1
//   [0.50 .. 0.82] slider — sub-rect 328×128, aspect ~2.6:1 (matches slider label)
//   [0.82 .. 1.00] FPS    — sub-rect 184×128, aspect ~1.4:1 (small stats readout)
// u-ranges are mirrored in src/shaders/xr.ui.wgsl.
const XR_UI_LABEL_CANVAS_W = 1024;
const XR_UI_LABEL_CANVAS_H = 128;
const XR_UI_LABEL_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif';

let xrUiPipeline!: GPURenderPipeline;
let xrUiBGs!: GPUBindGroup[];
let xrUiCameraBuffer!: GPUBuffer;
let xrUiParamsBuffer!: GPUBuffer;
let xrUiLabelCanvas!: HTMLCanvasElement;
let xrUiLabelCtx!: CanvasRenderingContext2D;
let xrUiLabelTexture!: GPUTexture;
let xrUiLabelSampler!: GPUSampler;
let xrUiLabelCurrentMode: SimMode | null = null;

function initXrUi() {
  xrUiCameraBuffer?.destroy();
  xrUiParamsBuffer?.destroy();
  xrUiLabelTexture?.destroy();

  xrUiCameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  // UIParams layout (48 bytes): center.xyz, _pad, sizeX, sizeY, sliderValue, hover,
  //                             hitX, hitY, hitActive, _pad2
  xrUiParamsBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // Canvas used once per mode change to rasterize labels.
  if (!xrUiLabelCanvas) {
    xrUiLabelCanvas = document.createElement('canvas');
    xrUiLabelCanvas.width = XR_UI_LABEL_CANVAS_W;
    xrUiLabelCanvas.height = XR_UI_LABEL_CANVAS_H;
    xrUiLabelCtx = xrUiLabelCanvas.getContext('2d')!;
  }
  xrUiLabelTexture = device.createTexture({
    size: [XR_UI_LABEL_CANVAS_W, XR_UI_LABEL_CANVAS_H],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  xrUiLabelSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });
  xrUiLabelCurrentMode = null; // force first render to upload

  const uiModule = createShaderModuleChecked('xr.ui', SHADER_XR_UI);

  const uiBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    ]
  });

  xrUiPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [uiBGL] }),
    vertex: { module: uiModule, entryPoint: 'vs_main' },
    fragment: {
      module: uiModule, entryPoint: 'fs_main',
      targets: [{
        format: renderTargetFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        }
      }]
    },
    primitive: { topology: 'triangle-list' },
    // Depth-test disabled — the panel always renders on top of the sim.
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    multisample: { count: renderSampleCount },
  });

  xrUiBGs = [0, 1].map(vi => device.createBindGroup({ layout: uiBGL, entries: [
    { binding: 0, resource: { buffer: xrUiCameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
    { binding: 1, resource: { buffer: xrUiParamsBuffer } },
    { binding: 2, resource: xrUiLabelTexture.createView() },
    { binding: 3, resource: xrUiLabelSampler },
  ]}));
}

// Draw a single label into a sub-rect, auto-shrinking the font until the text
// fits with comfortable padding. Keeps long labels like "GRAVITY" from clipping.
function drawXrUiLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
): void {
  const maxTextW = rectW * 0.82;
  const maxTextH = rectH * 0.75;
  let fontPx = Math.floor(maxTextH);
  ctx.font = `bold ${fontPx}px ${XR_UI_LABEL_FONT_FAMILY}`;
  while (fontPx > 12 && ctx.measureText(text).width > maxTextW) {
    fontPx -= 2;
    ctx.font = `bold ${fontPx}px ${XR_UI_LABEL_FONT_FAMILY}`;
  }
  ctx.fillText(text, rectX + rectW / 2, rectY + rectH / 2);
}

// Rasterize label strings to the canvas and upload to the label texture.
// Redraws when mode changes or FPS updates (once per second).
let xrUiLastFps = -1;
function updateXrUiLabels(mode: SimMode): void {
  const fpsChanged = currentFps !== xrUiLastFps;
  const modeChanged = xrUiLabelCurrentMode !== mode;
  if (!modeChanged && !fpsChanged) return;
  xrUiLabelCurrentMode = mode;
  xrUiLastFps = currentFps;
  const ctx = xrUiLabelCtx;
  const w = XR_UI_LABEL_CANVAS_W;
  const h = XR_UI_LABEL_CANVAS_H;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Sub-rects (matching LABEL_*_U0/U1 in xr.ui.wgsl):
  //   PREV:   [0.00w .. 0.25w]  → 256×128
  //   NEXT:   [0.25w .. 0.50w]  → 256×128
  //   SLIDER: [0.50w .. 0.82w]  → 328×128
  //   FPS:    [0.82w .. 1.00w]  → 184×128
  const quarter = w / 4;
  const sliderEnd = Math.floor(w * 0.82);
  const sliderW = sliderEnd - quarter * 2;
  const fpsX = sliderEnd;
  const fpsW = w - sliderEnd;
  drawXrUiLabel(ctx, 'PREV', 0,             0, quarter,  h);
  drawXrUiLabel(ctx, 'NEXT', quarter,       0, quarter,  h);
  drawXrUiLabel(ctx, XR_UI_SLIDER_DEFS[mode].label.toUpperCase(),
                      quarter * 2,   0, sliderW, h);
  drawXrUiLabel(ctx, `${currentFps} FPS`, fpsX, 0, fpsW, h);

  device.queue.copyExternalImageToTexture(
    { source: xrUiLabelCanvas },
    { texture: xrUiLabelTexture },
    [w, h]
  );
}

function xrUiHoverAsFloat(): number {
  switch (xrUiState.hover) {
    case 'prev':   return 1.0;
    case 'next':   return 2.0;
    case 'slider': return 3.0;
    case 'grab':   return 4.0;
    default:       return 0.0;
  }
}

function renderXrUi(pass: GPURenderPassEncoder, aspect: number, viewIndex = 0): void {
  // Rasterize labels on mode change (no-op otherwise).
  updateXrUiLabels(state.mode);

  device.queue.writeBuffer(xrUiCameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));
  // Only write params once per frame (both eyes see the same UI state).
  if (viewIndex === 0) {
    const data = new Float32Array(12);
    data[0] = XR_UI_PANEL_CENTER[0];
    data[1] = XR_UI_PANEL_CENTER[1];
    data[2] = XR_UI_PANEL_CENTER[2];
    data[3] = 0; // _pad1
    data[4] = XR_UI_PANEL_SIZE[0];
    data[5] = XR_UI_PANEL_SIZE[1];
    data[6] = getXrSliderNormalized();
    data[7] = xrUiHoverAsFloat();
    data[8]  = xrUiState.lastHitPx;
    data[9]  = xrUiState.lastHitPy;
    data[10] = xrUiState.lastHitActive ? 1.0 : 0.0;
    data[11] = 0; // _pad2
    device.queue.writeBuffer(xrUiParamsBuffer, 0, data);
  }
  pass.setPipeline(xrUiPipeline);
  pass.setBindGroup(0, xrUiBGs[viewIndex]);
  pass.draw(6);
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

  const computeModule = createShaderModuleChecked('boids.compute', SHADER_BOIDS_COMPUTE_EDIT || SHADER_BOIDS_COMPUTE);
  const renderModule = createShaderModuleChecked('boids.render', SHADER_BOIDS_RENDER_EDIT || SHADER_BOIDS_RENDER);

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
      // [LAW:dataflow-not-control-flow] Time scaling lives in the dt value itself; the compute shader doesn't branch on pause/reverse.
      fullParams[0] = 0.016 * state.fx.timeScale;
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
  const bodyBytes = count * 48; // pos(12) + mass(4) + vel(12) + pad(4) + home(12) + pad(4) = 48

  // [LAW:one-source-of-truth] N-body orbit shaping constants live together so position thickness and velocity tilt stay in sync.
  const DISK_THICKNESS = 0.2;
  const VERTICAL_DRIFT = 0.18;
  // [LAW:one-source-of-truth] Massive-body seeding lives here so orbital structure and tracer distribution share one initialization model.
  // Source bodies drive the O(N*S) force loop — cap S to keep high particle counts interactive.
  const BIG_BODY_COUNT = Math.min(count, Math.max(1, Math.round(count * 0.03)));
  const MEDIUM_BODY_COUNT = Math.min(count - BIG_BODY_COUNT, Math.max(1, Math.round(count * 0.1)));
  const MASSIVE_BODY_COUNT = Math.min(BIG_BODY_COUNT + MEDIUM_BODY_COUNT, 8192);
  const CORE_BODY_MASS = 2.0;
  const BIG_BODY_MASS_MIN = 0.8;
  const BIG_BODY_MASS_MAX = 1.8;
  const MEDIUM_BODY_MASS_MIN = 0.3;
  const MEDIUM_BODY_MASS_MAX = 0.9;
  const BIG_BODY_RADIUS_MIN = 0.2;
  const BIG_BODY_RADIUS_MAX = 2.5;
  const MEDIUM_BODY_RADIUS_MIN = 0.5;
  const MEDIUM_BODY_RADIUS_MAX = 4.0;
  const BIG_BODY_HEIGHT = 0.12;
  const MEDIUM_BODY_HEIGHT = 0.2;
  // [LAW:one-source-of-truth] Circular velocity includes self-gravity + dark matter (halo + disk).
  // This is the single formula that determines whether particles start in equilibrium.
  const haloM = state.physics.haloMass ?? 5.0;
  const haloA = state.physics.haloScale ?? 2.0;
  const diskM = state.physics.diskMass ?? 3.0;
  const diskA = state.physics.diskScaleA ?? 1.5;
  const diskB = state.physics.diskScaleB ?? 0.3;
  function darkMatterVcirc2(r: number): number {
    // Plummer halo: v² = M * r² / (r² + a²)^(3/2)
    const r2 = r * r;
    const haloD2 = r2 + haloA * haloA;
    const v2halo = haloM * r2 / (haloD2 * Math.sqrt(haloD2));
    // Miyamoto-Nagai disk (in-plane, z≈0): v² = M * R² / (R² + (a+b)²)^(3/2)
    const ab = diskA + diskB;
    const diskD2 = r2 + ab * ab;
    const v2disk = diskM * r2 / (diskD2 * Math.sqrt(diskD2));
    return v2halo + v2disk;
  }
  const BIG_BODY_SWIRL = 0.6;    // fallback for non-spiral distributions
  const MEDIUM_BODY_SWIRL = 0.6;

  const initData = new Float32Array(count * 12);
  const dist = state.physics.distribution;
  const orbitalNormal = normalize3([0.18, 1.0, -0.12]);
  const orbitalTangent = normalize3(cross3([0, 1, 0], orbitalNormal));
  const orbitalBitangent = cross3(orbitalNormal, orbitalTangent);
  for (let i = 0; i < count; i++) {
    const off = i * 12;
    let x, y, z, vx = 0, vy = 0, vz = 0;
    let mass = 0.0;
    const isCoreBody = i === 0;
    const isBigBody = i < BIG_BODY_COUNT;
    const isMediumBody = i >= BIG_BODY_COUNT && i < MASSIVE_BODY_COUNT;
    if (isCoreBody) {
      x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0;
      mass = CORE_BODY_MASS;
    } else if (isBigBody || isMediumBody) {
      if (dist === 'spiral') {
        // Massive bodies follow the same exponential disk as tracers.
        // Same profile, same circular velocities, just heavier.
        const LAMBDA_M = 5.0;
        const SCALE_M = 3.5;
        const r_m = Math.exp(-LAMBDA_M * Math.random()) * SCALE_M;
        const angle_m = Math.random() * Math.PI * 2;
        const h_m = (Math.random() - 0.5) * 0.2;
        x = orbitalTangent[0]*Math.cos(angle_m)*r_m + orbitalBitangent[0]*Math.sin(angle_m)*r_m + orbitalNormal[0]*h_m;
        y = orbitalTangent[1]*Math.cos(angle_m)*r_m + orbitalBitangent[1]*Math.sin(angle_m)*r_m + orbitalNormal[1]*h_m;
        z = orbitalTangent[2]*Math.cos(angle_m)*r_m + orbitalBitangent[2]*Math.sin(angle_m)*r_m + orbitalNormal[2]*h_m;
        const intR_m = (-1/LAMBDA_M) * Math.exp(-LAMBDA_M * r_m / SCALE_M) + (1/LAMBDA_M);
        const intMax_m = (-1/LAMBDA_M) * Math.exp(-LAMBDA_M) + (1/LAMBDA_M);
        const avgM = ((BIG_BODY_MASS_MIN+BIG_BODY_MASS_MAX+MEDIUM_BODY_MASS_MIN+MEDIUM_BODY_MASS_MAX)/4);
        const refTotalM = 1000 * avgM;
        const Geff_m = (state.physics.G ?? 1.5) * 0.001 / Math.sqrt(Math.max(1, MASSIVE_BODY_COUNT) / 1000);
        // Circular velocity from enclosed particle mass + dark matter potential.
        const vC_m = Math.sqrt(Math.max(0.001, Geff_m * (intR_m/intMax_m) * refTotalM / Math.max(r_m, 0.05) + darkMatterVcirc2(r_m)));
        vx = (-Math.sin(angle_m)*orbitalTangent[0] + Math.cos(angle_m)*orbitalBitangent[0]) * vC_m;
        vy = (-Math.sin(angle_m)*orbitalTangent[1] + Math.cos(angle_m)*orbitalBitangent[1]) * vC_m;
        vz = (-Math.sin(angle_m)*orbitalTangent[2] + Math.cos(angle_m)*orbitalBitangent[2]) * vC_m;
        mass = isBigBody
          ? BIG_BODY_MASS_MIN + Math.pow(Math.random(), 0.4) * (BIG_BODY_MASS_MAX - BIG_BODY_MASS_MIN)
          : MEDIUM_BODY_MASS_MIN + Math.pow(Math.random(), 0.7) * (MEDIUM_BODY_MASS_MAX - MEDIUM_BODY_MASS_MIN);
      } else {
        // Standard massive body placement for non-spiral presets
        const bodyIndex = isBigBody ? i - 1 : i - BIG_BODY_COUNT;
        const bodyCount = isBigBody ? Math.max(1, BIG_BODY_COUNT - 1) : MEDIUM_BODY_COUNT;
        const bodyProgress = bodyCount > 1 ? bodyIndex / (bodyCount - 1) : 0.5;
        const radiusMin = isBigBody ? BIG_BODY_RADIUS_MIN : MEDIUM_BODY_RADIUS_MIN;
        const radiusMax = isBigBody ? BIG_BODY_RADIUS_MAX : MEDIUM_BODY_RADIUS_MAX;
        const radiusJitter = isBigBody ? 0.05 : 0.1;
        const radius = radiusMin + (radiusMax - radiusMin) * bodyProgress + (Math.random() - 0.5) * radiusJitter;
        const heightScale = isBigBody ? BIG_BODY_HEIGHT : MEDIUM_BODY_HEIGHT;
        const heightOffset = (Math.random() - 0.5) * heightScale;
        const angleOffset = isBigBody ? Math.PI * 0.18 : Math.PI / Math.max(3, MEDIUM_BODY_COUNT);
        const angle = (bodyIndex / Math.max(1, bodyCount)) * Math.PI * 2 + angleOffset;
        x = orbitalTangent[0]*Math.cos(angle)*radius + orbitalBitangent[0]*Math.sin(angle)*radius + orbitalNormal[0]*heightOffset;
        y = orbitalTangent[1]*Math.cos(angle)*radius + orbitalBitangent[1]*Math.sin(angle)*radius + orbitalNormal[1]*heightOffset;
        z = orbitalTangent[2]*Math.cos(angle)*radius + orbitalBitangent[2]*Math.sin(angle)*radius + orbitalNormal[2]*heightOffset;
        const swirl = isBigBody ? BIG_BODY_SWIRL : MEDIUM_BODY_SWIRL;
        const speed = swirl / Math.sqrt(radius + 0.05);
        vx = (-Math.sin(angle)*orbitalTangent[0] + Math.cos(angle)*orbitalBitangent[0])*speed;
        vy = (-Math.sin(angle)*orbitalTangent[1] + Math.cos(angle)*orbitalBitangent[1])*speed;
        vz = (-Math.sin(angle)*orbitalTangent[2] + Math.cos(angle)*orbitalBitangent[2])*speed;
        mass = isBigBody
          ? BIG_BODY_MASS_MIN + Math.pow(Math.random(), 0.4) * (BIG_BODY_MASS_MAX - BIG_BODY_MASS_MIN)
          : MEDIUM_BODY_MASS_MIN + Math.pow(Math.random(), 0.7) * (MEDIUM_BODY_MASS_MAX - MEDIUM_BODY_MASS_MIN);
      }
    } else if (dist === 'spiral') {
      // Smooth exponential disk — spiral arms emerge from N-body dynamics, not seeded.
      // Based on barnes-hut approach: exponential radial profile with enclosed-mass
      // circular velocities. Pure gravity + tidal perturbation creates arms via
      // swing amplification of N-body noise in the differentially rotating disk.
      const LAMBDA = 5.0;           // exponential steepness (higher = more concentrated)
      const DISK_SCALE = 3.5;       // max radius
      const HALO_FRAC_S = 0.04;

      const tracerFrac = (i - MASSIVE_BODY_COUNT) / Math.max(1, count - MASSIVE_BODY_COUNT);

      if (tracerFrac < HALO_FRAC_S) {
        // Spherical halo
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const hr = 0.3 + Math.pow(Math.random(), 0.5) * 4.0;
        x = hr*Math.sin(phi)*Math.cos(theta); y = hr*Math.sin(phi)*Math.sin(theta); z = hr*Math.cos(phi);
        const hs = 0.12 + Math.random() * 0.1;
        const rd = normalize3([x,y,z]); const tg = normalize3(cross3(rd, [0.3,1,-0.2]));
        vx = tg[0]*hs; vy = tg[1]*hs; vz = tg[2]*hs;
        mass = 0.01 + Math.random() * 0.05;
      } else {
        // Exponential disk: r = exp(-lambda * U) * scale
        const r = Math.exp(-LAMBDA * Math.random()) * DISK_SCALE;
        const angle = Math.random() * Math.PI * 2;

        // Enclosed mass fraction: integral of exponential from 0 to r / integral from 0 to scale
        // integral_exp(lambda, x) = (-1/lambda) * exp(-lambda*x) + (1/lambda)
        const intR = (-1/LAMBDA) * Math.exp(-LAMBDA * r / DISK_SCALE) + (1/LAMBDA);
        const intMax = (-1/LAMBDA) * Math.exp(-LAMBDA) + (1/LAMBDA);
        const massFrac = intR / intMax;

        // Circular velocity from enclosed mass. Use a fixed reference mass (1000 sources * avgMass)
        // so that vCirc is independent of particle count — the G_eff normalization already handles scaling.
        const REF_SOURCES = 1000;
        const avgMass = ((BIG_BODY_MASS_MIN + BIG_BODY_MASS_MAX) / 2 + (MEDIUM_BODY_MASS_MIN + MEDIUM_BODY_MASS_MAX) / 2) / 2;
        const refTotalMass = REF_SOURCES * avgMass;
        const enclosedMass = massFrac * refTotalMass;
        const Geff = (state.physics.G ?? 1.5) * 0.001 / Math.sqrt(Math.max(1, MASSIVE_BODY_COUNT) / 1000);
        // Circular velocity from enclosed particle mass + dark matter potential.
        const vCirc = Math.sqrt(Math.max(0.001, Geff * enclosedMass / Math.max(r, 0.05) + darkMatterVcirc2(r)));

        // Visible disk has real thickness — thicker at center, thinner at edge (like a real galaxy)
        const h = (Math.random() - 0.5) * (0.25 + r * 0.05);
        x = orbitalTangent[0]*Math.cos(angle)*r + orbitalBitangent[0]*Math.sin(angle)*r + orbitalNormal[0]*h;
        y = orbitalTangent[1]*Math.cos(angle)*r + orbitalBitangent[1]*Math.sin(angle)*r + orbitalNormal[1]*h;
        z = orbitalTangent[2]*Math.cos(angle)*r + orbitalBitangent[2]*Math.sin(angle)*r + orbitalNormal[2]*h;

        // Exact circular orbit velocity
        vx = (-Math.sin(angle)*orbitalTangent[0] + Math.cos(angle)*orbitalBitangent[0]) * vCirc;
        vy = (-Math.sin(angle)*orbitalTangent[1] + Math.cos(angle)*orbitalBitangent[1]) * vCirc;
        vz = (-Math.sin(angle)*orbitalTangent[2] + Math.cos(angle)*orbitalBitangent[2]) * vCirc;

        mass = Math.pow(Math.random(), 2.0) * 0.8;
      }
    } else if (dist === 'disk') {
      // Generic disk with subpopulations (default distribution)
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 4.5;
      mass = Math.pow(Math.random(), 3.0) * 0.8;
      const tracerFrac = (i - MASSIVE_BODY_COUNT) / Math.max(1, count - MASSIVE_BODY_COUNT);
      if (tracerFrac < 0.03) {
        const h = (Math.random() - 0.5) * DISK_THICKNESS * 0.5;
        x = orbitalTangent[0]*Math.cos(angle)*r + orbitalBitangent[0]*Math.sin(angle)*r + orbitalNormal[0]*h;
        y = orbitalTangent[1]*Math.cos(angle)*r + orbitalBitangent[1]*Math.sin(angle)*r + orbitalNormal[1]*h;
        z = orbitalTangent[2]*Math.cos(angle)*r + orbitalBitangent[2]*Math.sin(angle)*r + orbitalNormal[2]*h;
        const s = Math.sqrt(Math.max(0.001, darkMatterVcirc2(r)));
        vx = (Math.sin(angle)*orbitalTangent[0] - Math.cos(angle)*orbitalBitangent[0])*s;
        vy = (Math.sin(angle)*orbitalTangent[1] - Math.cos(angle)*orbitalBitangent[1])*s;
        vz = (Math.sin(angle)*orbitalTangent[2] - Math.cos(angle)*orbitalBitangent[2])*s;
        mass = 0.1 + Math.random() * 0.3;
      } else if (tracerFrac < 0.12) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const hr = 0.5 + Math.sqrt(Math.random()) * 3.5;
        x = hr*Math.sin(phi)*Math.cos(theta); y = hr*Math.sin(phi)*Math.sin(theta); z = hr*Math.cos(phi);
        const hs = 0.15 + Math.random() * 0.15;
        const rd = normalize3([x,y,z]); const tg = normalize3(cross3(rd, [0.3,1,-0.2]));
        vx = tg[0]*hs; vy = tg[1]*hs; vz = tg[2]*hs;
        mass = 0.02 + Math.random() * 0.1;
      } else {
        const h = (Math.random() - 0.5) * DISK_THICKNESS * (0.35 + r * 0.4);
        x = orbitalTangent[0]*Math.cos(angle)*r + orbitalBitangent[0]*Math.sin(angle)*r + orbitalNormal[0]*h;
        y = orbitalTangent[1]*Math.cos(angle)*r + orbitalBitangent[1]*Math.sin(angle)*r + orbitalNormal[1]*h;
        z = orbitalTangent[2]*Math.cos(angle)*r + orbitalBitangent[2]*Math.sin(angle)*r + orbitalNormal[2]*h;
        const s = Math.sqrt(Math.max(0.001, darkMatterVcirc2(r)));
        vx = (-Math.sin(angle)*orbitalTangent[0] + Math.cos(angle)*orbitalBitangent[0])*s + orbitalNormal[0]*h*VERTICAL_DRIFT;
        vy = (-Math.sin(angle)*orbitalTangent[1] + Math.cos(angle)*orbitalBitangent[1])*s + orbitalNormal[1]*h*VERTICAL_DRIFT;
        vz = (-Math.sin(angle)*orbitalTangent[2] + Math.cos(angle)*orbitalBitangent[2])*s + orbitalNormal[2]*h*VERTICAL_DRIFT;
      }
    } else if (dist === 'web') {
      // Cosmic web: particles on a large thin shell with density perturbations seeded by
      // a 3D grid of attractors. Creates filaments at intersections and voids between them.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const shellR = 3.0 + (Math.random() - 0.5) * 1.5;
      x = shellR * Math.sin(phi) * Math.cos(theta);
      y = shellR * Math.sin(phi) * Math.sin(theta);
      z = shellR * Math.cos(phi);
      // Perturb toward nearest grid node to seed filamentary structure
      const gridSpacing = 2.5;
      const nx = Math.round(x / gridSpacing) * gridSpacing;
      const ny = Math.round(y / gridSpacing) * gridSpacing;
      const nz = Math.round(z / gridSpacing) * gridSpacing;
      const pull = 0.15 + Math.random() * 0.1;
      x += (nx - x) * pull; y += (ny - y) * pull; z += (nz - z) * pull;
      // Very slow inward drift
      const radial = normalize3([x, y, z]);
      const infall = 0.02 + Math.random() * 0.03;
      vx = -radial[0] * infall; vy = -radial[1] * infall; vz = -radial[2] * infall;
      mass = Math.pow(Math.random(), 2.0) * 0.6;
    } else if (dist === 'cluster') {
      // Star cluster: dense Plummer-sphere-like profile — concentrated core, power-law halo.
      // Multiple sub-clumps offset from center to create a merging cluster scenario.
      const clumpCount = 5;
      const clumpIdx = i % clumpCount;
      // Each clump has a unique center offset
      const clumpAngle = (clumpIdx / clumpCount) * Math.PI * 2 + 0.7;
      const clumpR = 1.2 + clumpIdx * 0.3;
      const cx = Math.cos(clumpAngle) * clumpR;
      const cy = (clumpIdx - 2) * 0.4;
      const cz = Math.sin(clumpAngle) * clumpR;
      // Plummer profile: r = a / sqrt(u^(-2/3) - 1) approximated with power-law
      const u = Math.random();
      const pr = 0.6 * Math.pow(u, 0.33) / Math.pow(1 - u * u + 0.01, 0.25);
      const pTheta = Math.random() * Math.PI * 2;
      const pPhi = Math.acos(2 * Math.random() - 1);
      x = cx + pr * Math.sin(pPhi) * Math.cos(pTheta);
      y = cy + pr * Math.sin(pPhi) * Math.sin(pTheta);
      z = cz + pr * Math.cos(pPhi);
      // Slow random orbits within each clump + drift toward center
      const orbSpeed = 0.1 + Math.random() * 0.12;
      const rd = normalize3([x - cx, y - cy, z - cz]);
      const tg = normalize3(cross3(rd, [0.2, 1.0, -0.3]));
      vx = tg[0] * orbSpeed; vy = tg[1] * orbSpeed; vz = tg[2] * orbSpeed;
      mass = Math.pow(Math.random(), 2.5) * 1.0;
    } else if (dist === 'maelstrom') {
      // Maelstrom: multiple concentric rings at different inclinations, all spinning fast.
      // Creates a turbulent whirlpool as rings interact and merge into a disk.
      const ringCount = 4;
      const ringIdx = i % ringCount;
      const ringR = 1.0 + ringIdx * 1.2 + (Math.random() - 0.5) * 0.4;
      const ringTilt = (ringIdx - 1.5) * 0.35;
      const rn = normalize3([Math.sin(ringTilt * 1.3), Math.cos(ringTilt), Math.sin(ringTilt * 0.7)]);
      const rt = normalize3(cross3([0, 1, 0], rn));
      const rb = cross3(rn, rt);
      const angle = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 0.15;
      x = rt[0]*Math.cos(angle)*ringR + rb[0]*Math.sin(angle)*ringR + rn[0]*h;
      y = rt[1]*Math.cos(angle)*ringR + rb[1]*Math.sin(angle)*ringR + rn[1]*h;
      z = rt[2]*Math.cos(angle)*ringR + rb[2]*Math.sin(angle)*ringR + rn[2]*h;
      // Fast co-rotating velocity — alternating ring directions for turbulence
      const spinDir = (ringIdx % 2 === 0) ? 1 : -1;
      const s = spinDir * (1.2 + ringIdx * 0.3) / Math.sqrt(ringR + 0.1);
      vx = (-Math.sin(angle)*rt[0] + Math.cos(angle)*rb[0])*s;
      vy = (-Math.sin(angle)*rt[1] + Math.cos(angle)*rb[1])*s;
      vz = (-Math.sin(angle)*rt[2] + Math.cos(angle)*rb[2])*s;
      mass = Math.pow(Math.random(), 3.0) * 0.5;
    } else if (dist === 'dust') {
      // Dust cloud: vast uniform volume with gentle turbulent velocity field.
      // Seeded with large-scale coherent flow patterns (curl noise approximation).
      const span = 6.0;
      x = (Math.random() - 0.5) * span;
      y = (Math.random() - 0.5) * span;
      z = (Math.random() - 0.5) * span;
      // Approximate large-scale turbulent flow with sinusoidal curl
      const freq = 0.8;
      const amp = 0.08;
      vx = Math.sin(y * freq + 1.3) * Math.cos(z * freq + 0.7) * amp;
      vy = Math.sin(z * freq + 2.1) * Math.cos(x * freq + 1.1) * amp;
      vz = Math.sin(x * freq + 0.5) * Math.cos(y * freq + 2.5) * amp;
      mass = Math.pow(Math.random(), 4.0) * 0.4;
    } else if (dist === 'binary') {
      // Binary: two offset disks orbiting each other with a bridge of particles between them.
      const isSecond = Math.random() < 0.45;
      const diskR = Math.sqrt(Math.random()) * 2.2;
      const angle = Math.random() * Math.PI * 2;
      // Each sub-disk has its own slightly tilted plane
      const tilt = isSecond ? 0.25 : -0.15;
      const dn = normalize3([tilt, 1.0, tilt * 0.5]);
      const dt = normalize3(cross3([0, 1, 0], dn));
      const db = cross3(dn, dt);
      const h = (Math.random() - 0.5) * 0.15;
      x = dt[0]*Math.cos(angle)*diskR + db[0]*Math.sin(angle)*diskR + dn[0]*h + (isSecond ? 1.8 : -1.8);
      y = dt[1]*Math.cos(angle)*diskR + db[1]*Math.sin(angle)*diskR + dn[1]*h + (isSecond ? 0.3 : -0.3);
      z = dt[2]*Math.cos(angle)*diskR + db[2]*Math.sin(angle)*diskR + dn[2]*h;
      // Orbital velocity within each sub-disk + orbital velocity of the pair
      const diskSpeed = 0.7 / Math.sqrt(diskR + 0.15);
      const pairSpeed = isSecond ? 0.12 : -0.12;
      vx = (-Math.sin(angle)*dt[0] + Math.cos(angle)*db[0])*diskSpeed + pairSpeed * 0.3;
      vy = (-Math.sin(angle)*dt[1] + Math.cos(angle)*db[1])*diskSpeed;
      vz = (-Math.sin(angle)*dt[2] + Math.cos(angle)*db[2])*diskSpeed + pairSpeed;
      // 10% bridge particles connecting the two
      if (Math.random() < 0.1) {
        const t = Math.random();
        x = -1.8 + t * 3.6 + (Math.random() - 0.5) * 0.8;
        y = -0.3 + t * 0.6 + (Math.random() - 0.5) * 0.5;
        z = (Math.random() - 0.5) * 0.6;
        vx = (Math.random() - 0.5) * 0.1; vy = (Math.random() - 0.5) * 0.05; vz = (Math.random() - 0.5) * 0.1;
      }
      mass = Math.pow(Math.random(), 2.5) * 0.7;
    } else if (dist === 'shell') {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 0.1;
      x = r*Math.sin(phi)*Math.cos(theta); y = r*Math.sin(phi)*Math.sin(theta); z = r*Math.cos(phi);
      const radial = normalize3([x,y,z]); const tangent = normalize3(cross3(radial, [0.3,1,-0.2]));
      const bitangent = cross3(radial, tangent);
      const swirl = 0.18 + Math.random() * 0.08;
      vx = (tangent[0]+bitangent[0]*0.35)*swirl; vy = (tangent[1]+bitangent[1]*0.35)*swirl; vz = (tangent[2]+bitangent[2]*0.35)*swirl;
      mass = Math.pow(Math.random(), 3.0) * 0.8;
    } else {
      x = (Math.random()-0.5)*4; y = (Math.random()-0.5)*4; z = (Math.random()-0.5)*4;
      vx = (Math.random()-0.5)*0.12; vy = (Math.random()-0.5)*0.12; vz = (Math.random()-0.5)*0.12;
      mass = Math.pow(Math.random(), 3.0) * 0.8;
    }
    initData[off] = x; initData[off + 1] = y; initData[off + 2] = z;
    initData[off + 3] = mass;
    initData[off + 4] = vx; initData[off + 5] = vy; initData[off + 6] = vz;
    // Body._unused (was `home`): zero for DKD leapfrog — no stored acceleration needed.
    initData[off + 8] = 0;
    initData[off + 9] = 0;
    initData[off + 10] = 0;
  }

  const bufferA = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, mappedAtCreation: true });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();
  const bufferB = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });

  // [LAW:one-source-of-truth] Params struct size must match nbody.compute.wgsl:
  // 96 bytes of header + 32 × 16-byte Attractor = 608 bytes total.
  const paramsBuffer = device.createBuffer({ size: 608, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const computeModule = createShaderModuleChecked('nbody.compute', SHADER_NBODY_COMPUTE_EDIT || SHADER_NBODY_COMPUTE);
  const renderModule = createShaderModuleChecked('nbody.render', SHADER_NBODY_RENDER_EDIT || SHADER_NBODY_RENDER);

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

  // --- Stats reduction: KE, PE, rmsRadius, rmsHeight, angular momentum, total mass ---
  // [LAW:one-source-of-truth] Disk normal is derived from angular momentum (slots 4-6) in this same pass.
  const statsShaderModule = createShaderModuleChecked('nbody.stats', SHADER_NBODY_STATS);
  const statsBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const statsPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [statsBGL] }),
    compute: { module: statsShaderModule, entryPoint: 'main' }
  });
  const statsOutBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const statsStaging = device.createBuffer({ size: 32, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const statsParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const statsBG = [
    device.createBindGroup({ layout: statsBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: statsOutBuffer } },
      { binding: 2, resource: { buffer: statsParamsBuffer } },
    ]}),
    device.createBindGroup({ layout: statsBGL, entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: statsOutBuffer } },
      { binding: 2, resource: { buffer: statsParamsBuffer } },
    ]}),
  ];

  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
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
    // to match the render pass's depth attachment.
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
    ]}))
  );

  // Diagnostic readback: sample particles from the GPU for analysis.
  const DIAG_SAMPLE = 2048;
  const diagSampleBytes = Math.min(count, DIAG_SAMPLE) * 48;
  const diagStaging = device.createBuffer({ size: diagSampleBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  let diagPending = false;

  let pingPong = 0;
  const depthRef: DepthRef = {};
  // [LAW:one-source-of-truth] Simulation clock: monotonic step counter replaces wall-clock.
  // Deterministic tidal angle and attractor timing derive from simStep × dt, not performance.now().
  let simStep = 0;
  // Time direction: 1 = forward (normal), -1 = reverse (rewind).
  // Controlled by UI (hold R key / mobile FAB). Negating dt in the DKD leapfrog gives exact reversal.
  let timeDirection = 1;
  // [LAW:one-source-of-truth] Disk normal is fixed — the dark matter MN potential defines the disk plane.
  const diskNormal: [number, number, number] = [0, 1, 0];

  // ── ATTRACTOR JOURNAL ────────────────────────────────────────────────────────
  // [LAW:one-source-of-truth] The journal is the canonical record of attractor forces at each sim step.
  // Forward: compute attractor strengths normally, write to journal[simStep].
  // Reverse: read from journal[simStep], skip live attractor computation.
  // This ensures the reversed simulation sees the EXACT same forces that were applied forward.
  const JOURNAL_CAPACITY = 18000;         // 5 minutes at 60fps
  const JOURNAL_ENTRY_FLOATS = 1 + ATTRACTOR_MAX * 4; // count + 32 × (x, y, z, strength)
  const journal = new Float32Array(JOURNAL_CAPACITY * JOURNAL_ENTRY_FLOATS);
  let journalHighWater = 0;               // highest simStep ever written (for reverse boundary)

  // --- Diagnostic stats (no feedback into simulation) ---
  // Stats reduction still runs once/second for KE, PE, angular momentum readback.
  // Dark matter provides stability — no virial controller needed.
  let statsPendingMap = false;
  let lastStatsTime = 0;
  const STATS_INTERVAL_MS = 1000;
  let lastStats = { ke: 0, pe: 0, virial: 0, rmsR: 0, rmsH: 0 };

  // Pre-allocated params staging buffer — avoids GC churn from per-frame ArrayBuffer allocation.
  // 608 bytes = 96-byte header + 32 × 16-byte Attractor array. Matches nbody.compute.wgsl Params struct.
  const paramsData = new ArrayBuffer(608);
  const f32 = new Float32Array(paramsData);
  const u32 = new Uint32Array(paramsData);
  const paramsBytes = new Uint8Array(paramsData);

  return {
    setTimeDirection(dir: number) { timeDirection = dir; },
    getSimStep() { return simStep; },
    getTimeDirection() { return timeDirection; },
    getJournalCapacity() { return JOURNAL_CAPACITY; },
    getJournalHighWater() { return journalHighWater; },

    compute(encoder: GPUCommandEncoder) {
      // [LAW:dataflow-not-control-flow] Reverse boundary check: can't rewind past the journal start or step 0.
      if (timeDirection < 0 && simStep <= 0) {
        state.paused = true;
        return;
      }

      // [LAW:one-source-of-truth] simStep adjustment happens BEFORE param packing so that
      // time, attractor journal index, and tidal angle all refer to the same simulation step.
      // Forward: enter with simStep=N, pack params(N), advance to N+1 by end of compute.
      // Reverse: enter with simStep=N+1, decrement to N here, pack params(N) — same params
      // as the original forward step that produced the current state. reverse(forward(s)) = s.
      if (timeDirection < 0) simStep--;

      const p = state.physics;
      const baseDt = 0.016 * state.fx.timeScale;
      const dt = baseDt * timeDirection;
      // [LAW:one-source-of-truth] G normalized by sqrt(sourceCount) so gravity scales sub-linearly with particle count.
      f32[0] = dt;
      f32[1] = p.G * 0.001 / Math.sqrt(Math.max(1, MASSIVE_BODY_COUNT) / 1000);
      f32[2] = p.softening;
      f32[3] = p.haloMass ?? 5.0;
      u32[4] = count;
      u32[5] = MASSIVE_BODY_COUNT;
      f32[6] = p.haloScale ?? 2.0;
      // [LAW:one-source-of-truth] Simulation clock: simStep × baseDt gives deterministic tidal angle.
      f32[7] = simStep * baseDt;
      // diskNormal: fixed orientation for the Miyamoto-Nagai potential.
      f32[12] = diskNormal[0]; f32[13] = diskNormal[1]; f32[14] = diskNormal[2];
      f32[16] = p.diskMass ?? 3.0;
      f32[17] = p.diskScaleA ?? 1.5;
      f32[18] = p.diskScaleB ?? 0.3;
      f32[19] = 0; f32[20] = 0; f32[21] = 0; f32[22] = 0;
      f32[23] = p.tidalStrength ?? 0.005;

      // ── ATTRACTOR DATA: forward computes + journals; reverse reads from journal ──
      if (timeDirection > 0) {
        // Forward: compute attractor strengths from live state, write to journal.
        const nowSec = simStep * baseDt;
        const ceiling = p.interactionStrength ?? 1;
        const attractors = state.attractors;
        const attractorN = Math.min(attractors.length, ATTRACTOR_MAX);
        u32[8] = attractorN;
        u32[9] = 0; u32[10] = 0; u32[11] = 0;
        for (let i = 0; i < attractorN; i++) {
          const a = attractors[i];
          const base = 24 + i * 4;
          f32[base] = a.x;
          f32[base + 1] = a.y;
          f32[base + 2] = a.z;
          f32[base + 3] = attractorStrength(a, nowSec, ceiling);
        }
        for (let i = attractorN; i < ATTRACTOR_MAX; i++) {
          const base = 24 + i * 4;
          f32[base] = 0; f32[base + 1] = 0; f32[base + 2] = 0; f32[base + 3] = 0;
        }
        // Journal write: snapshot the packed attractor data at this simStep.
        const jBase = (simStep % JOURNAL_CAPACITY) * JOURNAL_ENTRY_FLOATS;
        journal[jBase] = attractorN;
        for (let i = 0; i < ATTRACTOR_MAX * 4; i++) journal[jBase + 1 + i] = f32[24 + i];
        journalHighWater = Math.max(journalHighWater, simStep);
        simStep++;
      } else {
        // Reverse: read attractor data from journal at simStep (already decremented above).
        const jBase = (simStep % JOURNAL_CAPACITY) * JOURNAL_ENTRY_FLOATS;
        u32[8] = journal[jBase]; // attractorCount
        u32[9] = 0; u32[10] = 0; u32[11] = 0;
        for (let i = 0; i < ATTRACTOR_MAX * 4; i++) f32[24 + i] = journal[jBase + 1 + i];
      }
      device.queue.writeBuffer(paramsBuffer, 0, paramsBytes);

      const cTsw = tsWrites(0);
      const pass = encoder.beginComputePass(cTsw ? { timestampWrites: cTsw } : undefined);
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 256));
      pass.end();

      // --- Stats + disk normal reduction: once per second ---
      // [LAW:one-source-of-truth] Angular momentum (stats slots 4-6) is the single source for disk normal.
      // Running this once/second instead of every frame eliminates a per-frame GPU pipeline bubble
      // (single-workgroup serial read of the entire particle buffer was stalling the pipeline).
      const nextPing = 1 - pingPong;
      const now = performance.now();
      if (!statsPendingMap && now - lastStatsTime > STATS_INTERVAL_MS) {
        lastStatsTime = now;
        const Geff = (p.G ?? 1.5) * 0.001 / Math.sqrt(Math.max(1, MASSIVE_BODY_COUNT) / 1000);
        const statsParamsData = new Float32Array(4);
        const statsParamsU32 = new Uint32Array(statsParamsData.buffer);
        statsParamsU32[0] = count;
        statsParamsU32[1] = MASSIVE_BODY_COUNT;
        statsParamsData[2] = (p.softening ?? 0.15) * (p.softening ?? 0.15);
        statsParamsData[3] = Geff;
        device.queue.writeBuffer(statsParamsBuffer, 0, statsParamsData);

        const statsPass = encoder.beginComputePass();
        statsPass.setPipeline(statsPipeline);
        statsPass.setBindGroup(0, statsBG[nextPing]);
        statsPass.dispatchWorkgroups(1);
        statsPass.end();

        encoder.copyBufferToBuffer(statsOutBuffer, 0, statsStaging, 0, 32);
        statsPendingMap = true;
        device.queue.onSubmittedWorkDone().then(() => {
          statsStaging.mapAsync(GPUMapMode.READ).then(() => {
            const d = new Float32Array(statsStaging.getMappedRange().slice(0));
            statsStaging.unmap();
            statsPendingMap = false;

            const ke = d[0], pe = d[1];
            const virial = Math.abs(pe) > 0.001 ? (2 * ke) / Math.abs(pe) : 1.0;
            const rmsR = Math.sqrt(d[2] / Math.max(count, 1));
            const rmsH = Math.sqrt(d[3] / Math.max(count, 1));
            lastStats = { ke, pe, virial, rmsR, rmsH };
          }).catch(() => { statsPendingMap = false; });
        });
      }

      pingPong = 1 - pingPong;
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : (canvas.width / canvas.height);
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));

      const rTsw = tsWrites(1);
      const pass = encoder.beginRenderPass({
        colorAttachments: [getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: getDepthAttachment(depthRef, viewport),
        ...(rTsw ? { timestampWrites: rTsw } : {}),
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

    getStats() { return lastStats; },

    async diagnose(): Promise<Record<string, number | number[]>> {
      if (diagPending) return { error: 1 };
      diagPending = true;
      // Copy several large chunks from evenly-spaced regions across the tracer population.
      const tracerCount = count - MASSIVE_BODY_COUNT;
      const sampleCount = Math.min(tracerCount, DIAG_SAMPLE);
      const NUM_CHUNKS = 8;
      const chunkBodies = Math.floor(sampleCount / NUM_CHUNKS);
      const regionSize = Math.floor(tracerCount / NUM_CHUNKS);
      const srcBuf = pingPong === 0 ? bufferA : bufferB;
      const encoder = device.createCommandEncoder();
      for (let c = 0; c < NUM_CHUNKS; c++) {
        const srcIdx = MASSIVE_BODY_COUNT + c * regionSize;
        encoder.copyBufferToBuffer(srcBuf, srcIdx * 48, diagStaging, c * chunkBodies * 48, chunkBodies * 48);
      }
      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      await diagStaging.mapAsync(GPUMapMode.READ);
      const raw = new Float32Array(diagStaging.getMappedRange().slice(0));
      diagStaging.unmap();
      diagPending = false;

      // Body layout: pos(3) mass(1) vel(3) pad(1) home(3) pad(1) = 12 floats
      const n = diskNormal;
      let comX = 0, comY = 0, comZ = 0;
      let rmsHeight = 0, rmsRadius = 0, rmsSpeed = 0;
      let totalMass = 0, maxR = 0;
      let tangVelSum = 0, tangVelCount = 0;
      // Radial bins (10 bins from 0 to 5)
      const radialBins = new Float64Array(10);
      // Angular bins (12 bins, 30° each) for arm detection
      const angularBins = new Float64Array(12);

      for (let i = 0; i < sampleCount; i++) {
        const o = i * 12;
        const px = raw[o], py = raw[o+1], pz = raw[o+2], m = raw[o+3];
        const vx = raw[o+4], vy = raw[o+5], vz = raw[o+6];
        comX += px; comY += py; comZ += pz;
        totalMass += m;

        const r = Math.sqrt(px*px + py*py + pz*pz);
        if (r > maxR) maxR = r;
        rmsRadius += r * r;

        // Height above disk plane
        const h = px*n[0] + py*n[1] + pz*n[2];
        rmsHeight += h * h;

        // Speed
        const spd = Math.sqrt(vx*vx + vy*vy + vz*vz);
        rmsSpeed += spd * spd;

        // Tangential velocity fraction (how circular are the orbits?)
        if (r > 0.1) {
          const rPlaneX = px - h*n[0], rPlaneY = py - h*n[1], rPlaneZ = pz - h*n[2];
          const rPlane = Math.sqrt(rPlaneX*rPlaneX + rPlaneY*rPlaneY + rPlaneZ*rPlaneZ);
          if (rPlane > 0.05) {
            const eRx = rPlaneX/rPlane, eRy = rPlaneY/rPlane, eRz = rPlaneZ/rPlane;
            const crossX = n[1]*eRz - n[2]*eRy, crossY = n[2]*eRx - n[0]*eRz, crossZ = n[0]*eRy - n[1]*eRx;
            const crossLen = Math.sqrt(crossX*crossX + crossY*crossY + crossZ*crossZ) || 1;
            const ePhiX = crossX/crossLen, ePhiY = crossY/crossLen, ePhiZ = crossZ/crossLen;
            const vPhi = vx*ePhiX + vy*ePhiY + vz*ePhiZ;
            tangVelSum += Math.abs(vPhi) / (spd + 0.001);
            tangVelCount++;
          }
        }

        // Radial bin
        const bin = Math.min(9, Math.floor(r * 2));
        radialBins[bin]++;

        // Angular bin (project onto disk plane, compute angle)
        const rPlaneX2 = px - h*n[0], rPlaneY2 = py - h*n[1], rPlaneZ2 = pz - h*n[2];
        const ang = Math.atan2(
          rPlaneX2 * orbitalBitangent[0] + rPlaneY2 * orbitalBitangent[1] + rPlaneZ2 * orbitalBitangent[2],
          rPlaneX2 * orbitalTangent[0] + rPlaneY2 * orbitalTangent[1] + rPlaneZ2 * orbitalTangent[2]
        );
        const aBin = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 12) % 12;
        angularBins[aBin]++;
      }

      const invN = 1 / sampleCount;
      const angularArr = Array.from(angularBins);
      const angMean = angularArr.reduce((a, b) => a + b, 0) / 12;
      const angVar = angularArr.reduce((a, b) => a + (b - angMean) ** 2, 0) / 12;
      const armContrast = angMean > 0 ? Math.sqrt(angVar) / angMean : 0;

      return {
        count,
        sampleCount,
        comX: comX * invN,
        comY: comY * invN,
        comZ: comZ * invN,
        rmsHeight: Math.sqrt(rmsHeight * invN),
        rmsRadius: Math.sqrt(rmsRadius * invN),
        rmsSpeed: Math.sqrt(rmsSpeed * invN),
        maxRadius: maxR,
        totalMass: totalMass * (count / sampleCount),
        tangentialFraction: tangVelCount > 0 ? tangVelSum / tangVelCount : 0,
        armContrast,
        radialProfile: Array.from(radialBins),
        angularProfile: angularArr,
        diskNormalX: n[0], diskNormalY: n[1], diskNormalZ: n[2],
      };
    },

    destroy() {
      bufferA.destroy(); bufferB.destroy();
      paramsBuffer.destroy(); cameraBuffer.destroy();
      statsOutBuffer.destroy(); statsStaging.destroy(); statsParamsBuffer.destroy();
      diagStaging.destroy();
      destroyDepthRef(depthRef);
    }
  };
}

// --- 5b': N-BODY CLASSIC ---
// Faithful recreation of the original n-body shader for A/B comparison.
// 32-byte Body struct, 48-byte Params (no disk recovery, no reduction, no home anchors).
// Renders into the shared HDR scene like every other sim, so bloom/tonemap still apply.

function createPhysicsClassicSimulation(): Simulation {
  const count = state.physics_classic.count;
  const bodyBytes = count * 32; // pos(12) + mass(4) + vel(12) + pad(4) = 32

  // [LAW:one-source-of-truth] Verbatim initial distribution from the original shader-playground.
  const initData = new Float32Array(count * 8);
  const dist = state.physics_classic.distribution;
  for (let i = 0; i < count; i++) {
    const off = i * 8;
    let x: number, y: number, z: number, vx = 0, vy = 0, vz = 0;
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
    initData[off    ] = x;
    initData[off + 1] = y;
    initData[off + 2] = z;
    initData[off + 3] = 0.5 + Math.random() * 2.0; // mass
    initData[off + 4] = vx;
    initData[off + 5] = vy;
    initData[off + 6] = vz;
  }

  const bufferA = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();
  const bufferB = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

  const paramsBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const attractorBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const computeModule = createShaderModuleChecked('nbody.classic.compute', SHADER_NBODY_CLASSIC_COMPUTE_EDIT || SHADER_NBODY_CLASSIC_COMPUTE);
  const renderModule = createShaderModuleChecked('nbody.classic.render', SHADER_NBODY_CLASSIC_RENDER_EDIT || SHADER_NBODY_CLASSIC_RENDER);

  const computeBGL = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
    { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
  ]});
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' },
  });

  const renderBGL = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
    { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
  ]});
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
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
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
      const p = state.physics_classic;
      const m = state.mouse;
      // Pack 12 floats: dt, G, softening, damping, count(u32), 3 pads, attractor.xyz, attractorActive
      const buf = new ArrayBuffer(48);
      const f32 = new Float32Array(buf);
      const u32 = new Uint32Array(buf);
      f32[0] = 0.016 * state.fx.timeScale;
      f32[1] = p.G * 0.001;
      f32[2] = p.softening;
      f32[3] = p.damping;
      u32[4] = count;
      f32[8] = m.down ? m.worldX : 0.0;
      f32[9] = m.down ? m.worldY : 0.0;
      f32[10] = m.down ? m.worldZ : 0.0;
      f32[11] = m.down ? 1.0 : 0.0;
      device.queue.writeBuffer(paramsBuffer, 0, new Uint8Array(buf));

      // Attractor uniform for the render pass (used for the per-body swell/glow effect).
      device.queue.writeBuffer(attractorBuffer, 0, new Float32Array([
        m.down ? m.worldX : 0.0,
        m.down ? m.worldY : 0.0,
        m.down ? m.worldZ : 0.0,
        m.down ? 1.0 : 0.0,
      ]));

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
      pass.draw(6, count);
      pass.end();
    },

    getCount() { return count; },

    destroy() {
      bufferA.destroy(); bufferB.destroy();
      paramsBuffer.destroy(); attractorBuffer.destroy(); cameraBuffer.destroy();
      destroyDepthRef(depthRef);
    },
  };
}

// --- 5c: FLUID DYNAMICS ---

function createFluidSimulation() {
  const FLUID_DT = 0.22;
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

  const initDye = new Float32Array(cellCount * 4);
  // Also seed initial velocity for motion
  const initVel = new Float32Array(cellCount * 2);
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const i = y * res + x;
      const fx = x / res, fy = y / res;
      // Swirl velocity
      const cx = fx - 0.5, cy = fy - 0.5;
      initVel[i * 2]     = -cy * 3.0;
      initVel[i * 2 + 1] =  cx * 3.0;
    }
  }
  device.queue.writeBuffer(dyeA, 0, initDye);
  device.queue.writeBuffer(velA, 0, initVel);

  // Compile shaders
  const forcesAdvectModule = createShaderModuleChecked('fluid.forces', SHADER_FLUID_FORCES_ADVECT_EDIT || SHADER_FLUID_FORCES_ADVECT);
  const diffuseModule = createShaderModuleChecked('fluid.diffuse', SHADER_FLUID_DIFFUSE_EDIT || SHADER_FLUID_DIFFUSE);
  const pressureModule = createShaderModuleChecked('fluid.pressure', SHADER_FLUID_PRESSURE_EDIT || SHADER_FLUID_PRESSURE);
  const divergenceModule = createShaderModuleChecked('fluid.divergence', SHADER_FLUID_DIVERGENCE_EDIT || SHADER_FLUID_DIVERGENCE);
  const gradientModule = createShaderModuleChecked('fluid.gradient', SHADER_FLUID_GRADIENT_EDIT || SHADER_FLUID_GRADIENT);
  const renderModule = createShaderModuleChecked('fluid.render', SHADER_FLUID_RENDER_EDIT || SHADER_FLUID_RENDER);

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

  // [LAW:one-source-of-truth] The dye buffer remains the canonical fluid state; the volumetric look is derived entirely in the render shader.
  // Render pipeline — extruded voxel columns derived from the 2D fluid field
  const fluidRenderParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(fluidRenderParamsBuffer, 0, new Float32Array([res, FLUID_GRID_RES, state.fluid.volumeScale, FLUID_WORLD_SIZE]));

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
  let simulationTime = 0;

  // Buffer management strategy: always keep canonical data in A buffers.
  // Each stage reads A → writes B, then we copy B → A.
  // For Jacobi iterations, we ping-pong and copy final result back to A.
  // This costs some copy bandwidth but makes bind group management trivial.

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = state.fluid;
      const dyeModeNum = p.dyeMode === 'rainbow' ? 0 : p.dyeMode === 'single' ? 1 : 2;
      simulationTime += 0.016 * state.fx.timeScale;
      const paramsData = new Float32Array([
        FLUID_DT * state.fx.timeScale, p.viscosity, p.diffusionRate, p.forceStrength,
        res, state.mouse.x, state.mouse.y, state.mouse.dx,
        state.mouse.dy, state.mouse.down ? 1.0 : 0.0, dyeModeNum, simulationTime
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
      device.queue.writeBuffer(fluidRenderParamsBuffer, 0, new Float32Array([res, FLUID_GRID_RES, state.fluid.volumeScale, FLUID_WORLD_SIZE]));

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
      pass.draw(36, FLUID_GRID_RES * FLUID_GRID_RES);
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

  const computeModule = createShaderModuleChecked('parametric.compute', SHADER_PARAMETRIC_COMPUTE_EDIT || SHADER_PARAMETRIC_COMPUTE);
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

  const renderModule = createShaderModuleChecked('parametric.render', SHADER_PARAMETRIC_RENDER_EDIT || SHADER_PARAMETRIC_RENDER);
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
      time += 0.016 * state.fx.timeScale; // scaled by FX time slider so pause/reverse works on the parametric animation
      const maxRate = Math.max(p.p1Rate, p.p2Rate, p.p3Rate, p.p4Rate, p.twistRate);
      animTime += 0.016 * state.fx.timeScale * (maxRate > 0 ? 1 : 0); // frozen when all rates = 0

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


// --- 5e: REACTION-DIFFUSION (Gray-Scott, 3D) ---

function createReactionSimulation() {
  // [LAW:one-source-of-truth] Volume resolution owned by state.reaction.resolution; everything else derives from it.
  const N = state.reaction.resolution;
  const WORLD_SIZE = 3.0;

  // [LAW:one-source-of-truth] rgba16float is the baseline WebGPU storage-capable
  // 16-bit float format. rg16float is NOT in the baseline storage-texture list,
  // so attempting to use it silently failed texture creation. Use rgba16float and
  // only read .rg in the shader — wastes 2 channels but plumbing stays simple.
  const texDesc: GPUTextureDescriptor = {
    size: [N, N, N],
    dimension: '3d',
    format: 'rgba16float',
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  };
  const uvTexA = device.createTexture(texDesc);
  const uvTexB = device.createTexture(texDesc);

  // Seed: u=1 everywhere, v=0 except a few random 3D blobs near the center.
  // rgba16float upload: 4 half-float channels × 2 bytes = 8 bytes/texel.
  const seed = new Uint16Array(N * N * N * 4);
  // Half-float encoder (IEEE 754 binary16).
  const f2h = (f: number): number => {
    const buf = new Float32Array(1);
    const i32 = new Int32Array(buf.buffer);
    buf[0] = f;
    const x = i32[0];
    const sign = (x >> 16) & 0x8000;
    let exp = ((x >> 23) & 0xff) - (127 - 15);
    const mant = x & 0x7fffff;
    if (exp <= 0) return sign;
    if (exp >= 31) return sign | 0x7c00;
    return sign | (exp << 10) | (mant >> 13);
  };
  const h_one = f2h(1.0);
  const h_zero = f2h(0.0);
  const h_half = f2h(0.5);
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = (z * N * N + y * N + x) * 4;
        seed[i] = h_one;      // r = u
        seed[i + 1] = h_zero; // g = v
        seed[i + 2] = h_zero;
        seed[i + 3] = h_zero;
      }
    }
  }
  // Scattered noise-style seed. Lots of tiny random points (radius 1-2) across
  // a tight central region. Each reset genuinely looks different because the
  // point set is different, and early-time the pattern is fine-grained instead
  // of the obviously-spherical big-blob look. Using many small seeds also lets
  // the reaction's pattern-formation regime dominate the final look rather
  // than the initial geometry.
  const seedCount = 80;
  // Center 40% of the volume → patterns have lots of room to grow into the
  // interior before the Dirichlet boundary's reservoir zone kicks in at ~80%.
  const lo = 0.30, hi = 0.70;
  for (let b = 0; b < seedCount; b++) {
    const cx = Math.floor(N * (lo + Math.random() * (hi - lo)));
    const cy = Math.floor(N * (lo + Math.random() * (hi - lo)));
    const cz = Math.floor(N * (lo + Math.random() * (hi - lo)));
    // Mix of point seeds and tiny 2-cell-radius blobs for variety.
    const r = Math.random() < 0.5 ? 1 : 2;
    for (let dz = -r; dz <= r; dz++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy + dz * dz > r * r) continue;
          const x = cx + dx, y = cy + dy, z = cz + dz;
          if (x < 0 || y < 0 || z < 0 || x >= N || y >= N || z >= N) continue;
          const i = (z * N * N + y * N + x) * 4;
          seed[i] = h_half;       // u → 0.5
          seed[i + 1] = h_half;   // v → 0.5
        }
      }
    }
  }
  // rgba16float = 8 bytes/texel, so bytesPerRow = N * 8.
  device.queue.writeTexture(
    { texture: uvTexA },
    seed.buffer,
    { bytesPerRow: N * 8, rowsPerImage: N },
    [N, N, N],
  );
  // Also initialize B with the same state so the first render (before any steps) looks right.
  device.queue.writeTexture(
    { texture: uvTexB },
    seed.buffer,
    { bytesPerRow: N * 8, rowsPerImage: N },
    [N, N, N],
  );

  // Compute pipeline
  const computeModule = createShaderModuleChecked('reaction.compute', SHADER_REACTION_COMPUTE_EDIT || SHADER_REACTION_COMPUTE);
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float', viewDimension: '3d' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba16float', viewDimension: '3d' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const paramsBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' },
  });
  const computeBGs = [
    // pong=0: read A, write B
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: uvTexA.createView({ dimension: '3d' }) },
      { binding: 1, resource: uvTexB.createView({ dimension: '3d' }) },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
    // pong=1: read B, write A
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: uvTexB.createView({ dimension: '3d' }) },
      { binding: 1, resource: uvTexA.createView({ dimension: '3d' }) },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ]}),
  ];

  // Render pipeline — raymarched volume
  const renderModule = createShaderModuleChecked('reaction.render', SHADER_REACTION_RENDER_EDIT || SHADER_REACTION_RENDER);
  const sampler = device.createSampler({
    magFilter: 'linear', minFilter: 'linear',
    addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge', addressModeW: 'clamp-to-edge',
  });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const renderParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '3d' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule, entryPoint: 'fs_main',
      targets: [{
        format: renderTargetFormat,
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
    // [LAW:feedback_nbody_depthstencil] Always declare depthStencil format to match the shared depth attachment.
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
    multisample: { count: renderSampleCount },
  });

  // renderBGs[viewIndex][pong] — pong is the value of the ping-pong counter
  // AFTER the compute loop completes. It points at which compute BG would run
  // NEXT, which equals which texture was READ last, which means the OTHER
  // texture holds the latest write. So:
  //   pong=0 → computeBGs[0] is "read A, write B" is next → last write was to A
  //   pong=1 → computeBGs[1] is "read B, write A" is next → last write was to B
  const renderBGs = [0, 1].map(vi => ([0, 1].map(pong => device.createBindGroup({
    layout: renderBGL, entries: [
      { binding: 0, resource: (pong === 0 ? uvTexA : uvTexB).createView({ dimension: '3d' }) },
      { binding: 1, resource: sampler },
      { binding: 2, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
      { binding: 3, resource: { buffer: renderParamsBuffer } },
    ],
  }))));

  // Workgroup size: 8×8×4 = 256 (within default maxComputeInvocationsPerWorkgroup).
  const wgX = Math.ceil(N / 8);
  const wgY = Math.ceil(N / 8);
  const wgZ = Math.ceil(N / 4);

  const depthRef: DepthRef = {};
  let pong = 0; // which compute BG to use NEXT; also selects which texture will be current after the step.

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = state.reaction;
      const steps = Math.max(1, Math.floor(p.stepsPerFrame));
      // [LAW:dataflow-not-control-flow] Explicit Euler stability bound is hard:
      // dt < 1/(6·max(Du,Dv)) ≈ 0.79 for Du=0.2097. The FX timeScale slider
      // globally modulates animation speed across all sims, but for reaction-
      // diffusion we must clamp the effective dt — otherwise cranking time
      // up (or going negative, which runs the reaction backward) instantly
      // blows the field to NaN and the sim "disappears". Run more substeps
      // to emulate "faster" time without violating stability.
      const STABLE_DT = 0.65;
      const requestedMul = Math.max(0, state.fx.timeScale); // no reverse for GS
      const dt = STABLE_DT;
      // When timeScale > 1, use more substeps within the same frame instead
      // of making dt bigger. When timeScale < 1, scale the number of steps
      // down (minimum 0 to honor pause-like semantics).
      const effectiveSteps = Math.max(0, Math.round(steps * requestedMul));
      device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([
        p.feed, p.kill, p.Du, p.Dv, dt, N, 0, 0,
      ]));
      for (let i = 0; i < effectiveSteps; i++) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, computeBGs[pong]);
        pass.dispatchWorkgroups(wgX, wgY, wgZ);
        pass.end();
        pong = 1 - pong;
      }
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : (canvas.width / canvas.height);
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, getCameraUniformData(aspect));
      // stepCount=256: enough samples through a 3-unit volume at 128³ to give
      // ~2 samples per texel along the longest ray, which combined with the
      // per-pixel jitter in the shader keeps aliasing below the bloom threshold.
      device.queue.writeBuffer(renderParamsBuffer, 0, new Float32Array([
        N, state.reaction.isoThreshold, WORLD_SIZE, 256,
      ]));

      const pass = encoder.beginRenderPass({
        colorAttachments: [getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: getDepthAttachment(depthRef, viewport),
      });

      const rv = getRenderViewport(viewport);
      if (rv) {
        pass.setViewport(rv[0], rv[1], rv[2], rv[3], 0, 1);
      }

      renderGrid(pass, aspect, viewIndex);

      // `pong` is flipped after each compute step, so after the loop it points
      // at the bind group / texture that would be used as the read side on the
      // next step. The current reaction volume is therefore the opposite side.
      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBGs[viewIndex][1 - pong]);
      pass.draw(3);
      pass.end();
    },

    getCount() { return `${N}³`; },

    destroy() {
      uvTexA.destroy();
      uvTexB.destroy();
      paramsBuffer.destroy();
      cameraBuffer.destroy();
      renderParamsBuffer.destroy();
      destroyDepthRef(depthRef);
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: UI & CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

const FX_PARAM_DEFS: { key: keyof typeof state.fx; label: string; min: number; max: number; step: number }[] = [
  { key: 'timeScale',           label: 'Time',        min: -2.0, max: 2.0, step: 0.05 },
  { key: 'bloomIntensity',      label: 'Bloom',       min: 0,    max: 4.0, step: 0.01 },
  { key: 'bloomThreshold',      label: 'Threshold',   min: 0,    max: 8.0, step: 0.01 },
  { key: 'bloomRadius',         label: 'Bloom Radius',min: 0.5,  max: 2.0, step: 0.01 },
  { key: 'trailPersistence',    label: 'Trails',      min: 0,    max: 0.995, step: 0.001 },
  { key: 'exposure',            label: 'Exposure',    min: 0.2,  max: 4.0, step: 0.01 },
  { key: 'vignette',            label: 'Vignette',    min: 0,    max: 1.5, step: 0.01 },
  { key: 'chromaticAberration', label: 'Chromatic',   min: 0,    max: 2.0, step: 0.01 },
  { key: 'grading',             label: 'Color Grade', min: 0,    max: 1.5, step: 0.01 },
];

function buildFxSection(container: HTMLElement) {
  const secDiv = document.createElement('div');
  secDiv.className = 'param-section';
  const title = document.createElement('div');
  title.className = 'param-section-title';
  title.textContent = 'Visual FX';
  secDiv.appendChild(title);

  for (const def of FX_PARAM_DEFS) {
    const row = document.createElement('div');
    row.className = 'control-row';
    const label = document.createElement('span');
    label.className = 'control-label';
    label.textContent = def.label;
    row.appendChild(label);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step);
    input.value = String(state.fx[def.key]);
    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = formatValue(state.fx[def.key], def.step);
    input.addEventListener('input', () => {
      const val = Number(input.value);
      state.fx[def.key] = val;
      valueSpan.textContent = formatValue(val, def.step);
      saveState();
    });
    row.appendChild(input);
    row.appendChild(valueSpan);
    secDiv.appendChild(row);
  }
  container.appendChild(secDiv);
}

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

    buildFxSection(container);
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

// [LAW:one-source-of-truth] Single entry point for switching simulation modes —
// used by both DOM tab clicks and the XR UI prev/next buttons so both paths
// keep state.mode, the DOM active classes, the simulation registry, and the
// on-screen slider values in sync.
const MODE_TAB_LABELS: Record<SimMode, string> = {
  boids: 'Boids', physics: 'N-Body', physics_classic: 'N-Body Classic',
  fluid: 'Fluid', parametric: 'Shapes', reaction: 'Reaction',
};

function selectMode(mode: SimMode): void {
  state.mode = mode;
  document.querySelectorAll<HTMLElement>('.mode-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode));
  document.querySelectorAll<HTMLElement>('.param-group').forEach(g =>
    g.classList.toggle('active', g.dataset.mode === mode));
  // Sync mobile stepper label
  const stepperLabel = document.getElementById('mode-stepper-label');
  if (stepperLabel) stepperLabel.textContent = MODE_TAB_LABELS[mode];
  ensureSimulation();
  updateAll();
}

function setupTabs() {
  document.querySelectorAll<HTMLElement>('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode as SimMode;
      selectMode(mode);
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

// [LAW:single-enforcer] Time-reverse input is owned here. Desktop: hold R. Mobile: hold rewind FAB.
// The physics sim's setTimeDirection() is the single channel for changing direction.
function setupTimeReverseControls() {
  const setReverse = (active: boolean) => {
    const sim = simulations[state.mode];
    if (!sim || !('setTimeDirection' in sim)) return;
    (sim as any).setTimeDirection(active ? -1 : 1);
    // Unblock pause if we were auto-paused at the journal boundary.
    if (!active && state.paused) state.paused = false;
  };

  // Desktop: hold R key to rewind.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      if (e.repeat) return;
      // Don't capture R when typing in an input or the shader editor.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setReverse(true);
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'r' || e.key === 'R') setReverse(false);
  });

  // Mobile: hold rewind FAB.
  const fabRewind = document.getElementById('fab-rewind');
  if (fabRewind) {
    fabRewind.addEventListener('pointerdown', () => setReverse(true));
    fabRewind.addEventListener('pointerup', () => setReverse(false));
    fabRewind.addEventListener('pointercancel', () => setReverse(false));
    fabRewind.addEventListener('pointerleave', () => setReverse(false));
  }
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
      if (state.colorTheme === name) return;
      state.colorTheme = name;
      startThemeTransition(name);
      container.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.theme === name));
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

// Unproject screen coords onto a plane through the origin perpendicular to the view direction.
// Unlike screenToWorld, this does a proper ray-plane intersection with no artificial spread cap.
function screenToSimPlane(mx: number, my: number) {
  const { eye, dir } = screenRay(mx, my);
  // Plane normal = direction from origin toward camera (view-perpendicular, through origin).
  const n = normalize3(eye);
  const denom = dot3(dir, n);
  // Ray nearly parallel to plane — fall back to closest approach to origin.
  if (Math.abs(denom) < 0.0001) return closestPointOnRayToOrigin(eye, dir);
  const t = -dot3(eye, n) / denom;
  return [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
}

// Unproject screen coords onto the fluid plane (y=0) using the shared fluid footprint.
// Returns [u, v] in 0-1 range, or null if ray misses.
function screenToFluidUV(mx: number, my: number) {
  const { eye, dir } = screenRay(mx, my);
  if (Math.abs(dir[1]) < 0.0001) return null;
  const t = -eye[1] / dir[1];
  if (t < 0) return null;
  const hitX = eye[0] + dir[0] * t;
  const hitZ = eye[2] + dir[2] * t;
  const halfSize = FLUID_WORLD_SIZE * 0.5;
  if (Math.abs(hitX) > halfSize || Math.abs(hitZ) > halfSize) return null;
  return [
    (hitX + halfSize) / FLUID_WORLD_SIZE,
    (hitZ + halfSize) / FLUID_WORLD_SIZE,
  ];
}

function worldToFluidUV(worldPoint: number[]) {
  const halfSize = FLUID_WORLD_SIZE * 0.5;
  if (Math.abs(worldPoint[0]) > halfSize || Math.abs(worldPoint[2]) > halfSize) return null;
  return [
    (worldPoint[0] + halfSize) / FLUID_WORLD_SIZE,
    (worldPoint[2] + halfSize) / FLUID_WORLD_SIZE,
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
  let interacting = false; // plain drag = sim interaction; ctrl/meta = orbit camera

  c.addEventListener('pointerdown', (e) => {
    if (state.xrEnabled) return;
    dragging = true;
    interacting = !(e.ctrlKey || e.metaKey);
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = 1.0 - (e.clientY - rect.top) / rect.height;
    state.mouse.dx = 0;
    state.mouse.dy = 0;

    if (interacting) {
      // Set initial position in correct coord system for fluid
      if (state.mode === 'fluid') {
        const uv = screenToFluidUV(mx, my);
        // [LAW:dataflow-not-control-flow] Out-of-bounds hits become null data and flow through the same interaction path as inactive input instead of being clamped to the edge.
        if (!uv) {
          setSimulationInteractionInactive();
        } else {
          state.mouse.down = true;
          const wp = screenToWorld(mx, my);
          state.mouse.worldX = wp[0];
          state.mouse.worldY = wp[1];
          state.mouse.worldZ = wp[2];
          state.mouse.x = uv[0];
          state.mouse.y = uv[1];
        }
      } else {
        // [LAW:one-source-of-truth] Ray-plane intersection at y=0 (the simulation disk plane) gives
        // unlimited spatial reach and stable depth mapping — no artificial spread limit.
        const hit = screenToSimPlane(mx, my);
        state.mouse.down = true;
        state.mouse.worldX = hit[0];
        state.mouse.worldY = hit[1];
        state.mouse.worldZ = hit[2];
        state.mouse.x = mx; state.mouse.y = my;
        // [LAW:single-enforcer] N-body interaction is owned by the attractor system exclusively.
        // Other sims still consume state.mouse.worldX/Y/Z; the attractor state is additive, not replacing.
        if (state.mode === 'physics') createAttractor(e.pointerId, hit);
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

    // Mode is committed at pointerdown — modifier changes mid-drag are ignored.
    const interact = interacting;

    if (interact) {
      // For fluid: ray-cast onto y=0 plane for camera-correct coordinates
      if (state.mode === 'fluid') {
        const uv = screenToFluidUV(mx, my);
        if (!uv) {
          setSimulationInteractionInactive();
        } else {
          state.mouse.down = true;
          const wp = screenToWorld(mx, my);
          state.mouse.worldX = wp[0];
          state.mouse.worldY = wp[1];
          state.mouse.worldZ = wp[2];
          state.mouse.dx = (uv[0] - state.mouse.x) * 10;
          state.mouse.dy = (uv[1] - state.mouse.y) * 10;
          state.mouse.x = uv[0];
          state.mouse.y = uv[1];
        }
      } else {
        // Sim interaction (plain drag — no modifier)
        const hit = screenToSimPlane(mx, my);
        state.mouse.down = true;
        state.mouse.worldX = hit[0];
        state.mouse.worldY = hit[1];
        state.mouse.worldZ = hit[2];
        state.mouse.dx = (mx - state.mouse.x) * 10;
        state.mouse.dy = (my - state.mouse.y) * 10;
        state.mouse.x = mx;
        state.mouse.y = my;
        // Wand behavior: held attractor tracks cursor.
        if (state.mode === 'physics') moveAttractor(e.pointerId, hit);
      }
    } else {
      // Orbit camera (cmd/ctrl+drag)
      state.camera.rotY += e.movementX * 0.005;
      state.camera.rotX += e.movementY * 0.005;
      state.camera.rotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, state.camera.rotX));
      state.mouse.down = false;
    }
  });

  const onPointerRelease = (e: PointerEvent) => {
    if (state.xrEnabled) return;
    dragging = false;
    interacting = false;
    state.mouse.down = false;
    state.mouse.dx = 0;
    state.mouse.dy = 0;
    releaseAttractor(e.pointerId); // no-op if pointer wasn't tracked
  };
  c.addEventListener('pointerup', onPointerRelease);
  c.addEventListener('pointercancel', onPointerRelease);
  c.addEventListener('pointerleave', onPointerRelease);

  c.addEventListener('contextmenu', (e) => e.preventDefault());

  c.addEventListener('wheel', (e) => {
    if (state.xrEnabled) return;
    state.camera.distance *= (1 + e.deltaY * 0.001);
    state.camera.distance = Math.max(0.5, Math.min(200, state.camera.distance));
    e.preventDefault();
  }, { passive: false });
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6b: MOBILE TOUCH & UI
// ═══════════════════════════════════════════════════════════════════════════════

const mobileQuery = matchMedia('(max-width: 768px)');
let isMobile = mobileQuery.matches;

function setupMobileTouchControls() {
  const c = canvas;
  const pointers = new Map<number, { x: number; y: number }>();
  let prevPinchDist = 0;
  let prevMidX = 0;
  let prevMidY = 0;

  // Reuse the same sim-interaction logic as desktop for 1-finger
  function applySimInteraction(pointerId: number, mx: number, my: number, isMove: boolean) {
    if (state.mode === 'fluid') {
      const uv = screenToFluidUV(mx, my);
      if (!uv) {
        setSimulationInteractionInactive();
      } else {
        state.mouse.down = true;
        const wp = screenToWorld(mx, my);
        state.mouse.worldX = wp[0];
        state.mouse.worldY = wp[1];
        state.mouse.worldZ = wp[2];
        state.mouse.dx = isMove ? (uv[0] - state.mouse.x) * 10 : 0;
        state.mouse.dy = isMove ? (uv[1] - state.mouse.y) * 10 : 0;
        state.mouse.x = uv[0];
        state.mouse.y = uv[1];
      }
    } else {
      const hit = screenToSimPlane(mx, my);
      state.mouse.down = true;
      state.mouse.worldX = hit[0];
      state.mouse.worldY = hit[1];
      state.mouse.worldZ = hit[2];
      state.mouse.dx = isMove ? (mx - state.mouse.x) * 10 : 0;
      state.mouse.dy = isMove ? (my - state.mouse.y) * 10 : 0;
      state.mouse.x = mx;
      state.mouse.y = my;
      // Wand: create on touch-start, track on move.
      if (state.mode === 'physics') {
        if (isMove) moveAttractor(pointerId, hit);
        else createAttractor(pointerId, hit);
      }
    }
  }

  c.addEventListener('pointerdown', (e) => {
    if (state.xrEnabled) return;
    e.preventDefault();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 1 finger: start sim interaction
    if (pointers.size === 1) {
      const rect = c.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = 1.0 - (e.clientY - rect.top) / rect.height;
      state.mouse.dx = 0;
      state.mouse.dy = 0;
      applySimInteraction(e.pointerId, mx, my, false);
    }
    // 2 fingers: initialize pinch/orbit baseline, stop sim interaction
    if (pointers.size === 2) {
      setSimulationInteractionInactive();
      // Release all held attractors — transitioning to orbit mode.
      pointers.forEach((_, pid) => releaseAttractor(pid));
      const pts = [...pointers.values()];
      prevMidX = (pts[0].x + pts[1].x) / 2;
      prevMidY = (pts[0].y + pts[1].y) / 2;
      prevPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  }, { passive: false });

  c.addEventListener('pointermove', (e) => {
    if (state.xrEnabled) return;
    if (!pointers.has(e.pointerId)) return;
    e.preventDefault();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      // 1 finger: sim interaction
      const rect = c.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = 1.0 - (e.clientY - rect.top) / rect.height;
      applySimInteraction(e.pointerId, mx, my, true);
    } else if (pointers.size === 2) {
      // 2 fingers: orbit + pinch zoom
      const pts = [...pointers.values()];
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

      // Orbit from midpoint delta
      state.camera.rotY += (midX - prevMidX) * 0.005;
      state.camera.rotX += (midY - prevMidY) * 0.005;
      state.camera.rotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, state.camera.rotX));

      // Pinch zoom
      if (prevPinchDist > 0) {
        state.camera.distance *= prevPinchDist / dist;
        state.camera.distance = Math.max(0.5, Math.min(200, state.camera.distance));
      }

      prevMidX = midX;
      prevMidY = midY;
      prevPinchDist = dist;
      state.mouse.down = false;
    }
  }, { passive: false });

  const onPointerEnd = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    releaseAttractor(e.pointerId); // no-op if not tracked as attractor
    if (pointers.size === 0) {
      state.mouse.down = false;
      state.mouse.dx = 0;
      state.mouse.dy = 0;
      prevPinchDist = 0;
    }
    // If going from 2→1 finger, re-initialize the remaining finger as sim interaction start
    if (pointers.size === 1) {
      const [remainingId, remaining] = [...pointers.entries()][0];
      const rect = c.getBoundingClientRect();
      const mx = (remaining.x - rect.left) / rect.width;
      const my = 1.0 - (remaining.y - rect.top) / rect.height;
      state.mouse.dx = 0;
      state.mouse.dy = 0;
      applySimInteraction(remainingId, mx, my, false);
    }
  };
  c.addEventListener('pointerup', onPointerEnd);
  c.addEventListener('pointercancel', onPointerEnd);

  c.addEventListener('contextmenu', (e) => e.preventDefault());
}

function setupMobileFab() {
  document.getElementById('fab-pause')!.addEventListener('click', () => {
    state.paused = !state.paused;
    document.getElementById('fab-pause')!.textContent = state.paused ? '\u25B6' : '\u23F8';
    document.getElementById('fab-pause')!.classList.toggle('active', state.paused);
    // Sync desktop button too
    document.getElementById('btn-pause')!.textContent = state.paused ? 'Resume' : 'Pause';
    document.getElementById('btn-pause')!.classList.toggle('active', state.paused);
  });

  document.getElementById('fab-reset')!.addEventListener('click', () => {
    resetCurrentSim();
  });

  // Mode stepper prev/next — reuse XR_UI_MODE_ORDER for consistent ordering
  const stepMode = (delta: number) => {
    const idx = XR_UI_MODE_ORDER.indexOf(state.mode);
    const next = XR_UI_MODE_ORDER[(idx + delta + XR_UI_MODE_ORDER.length) % XR_UI_MODE_ORDER.length];
    selectMode(next);
  };
  document.getElementById('mode-prev')!.addEventListener('click', () => stepMode(-1));
  document.getElementById('mode-next')!.addEventListener('click', () => stepMode(1));

  // Sync stepper label to initial state
  document.getElementById('mode-stepper-label')!.textContent = MODE_TAB_LABELS[state.mode];
}

function setupBottomSheet() {
  const controls = document.getElementById('controls')!;
  let startY = 0;
  let startScrollTop = 0;
  let tracking = false;
  const SWIPE_THRESHOLD = 30;

  // Touch on the entire sheet — decide whether to swipe-expand/collapse or scroll
  controls.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    startScrollTop = controls.scrollTop;
    const expanded = controls.classList.contains('mobile-expanded');
    // Track for swipe when: collapsed (always), or expanded and at scroll top
    tracking = !expanded || startScrollTop <= 0;
  }, { passive: true });

  controls.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const dy = e.touches[0].clientY - startY;
    const expanded = controls.classList.contains('mobile-expanded');

    // When collapsed and swiping up, prevent the sheet from scrolling
    if (!expanded && dy < 0) {
      e.preventDefault();
    }
    // When expanded at scroll top and pulling down, prevent scroll bounce
    if (expanded && startScrollTop <= 0 && dy > 0) {
      e.preventDefault();
    }
  }, { passive: false });

  controls.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dy = e.changedTouches[0].clientY - startY;
    const expanded = controls.classList.contains('mobile-expanded');

    if (!expanded && dy < -SWIPE_THRESHOLD) {
      controls.classList.add('mobile-expanded');
    } else if (expanded && startScrollTop <= 0 && dy > SWIPE_THRESHOLD) {
      controls.classList.remove('mobile-expanded');
    } else if (Math.abs(dy) < 10) {
      // Small move = tap on handle area — toggle
      const handleRect = controls.querySelector('.mobile-drag-handle')!.getBoundingClientRect();
      if (e.changedTouches[0].clientY >= handleRect.top && e.changedTouches[0].clientY <= handleRect.bottom) {
        controls.classList.toggle('mobile-expanded');
      }
    }
  });

  // Tap on canvas collapses the sheet
  canvas.addEventListener('pointerdown', () => {
    controls.classList.remove('mobile-expanded');
  }, { capture: true });
}

function applyMobileDefaults() {
  // [LAW:one-source-of-truth] Only override defaults for fresh installs — saved state is authoritative
  if (localStorage.getItem(STORAGE_KEY)) return;
  state.boids.count = 500;
  state.physics.count = 2000;
  state.physics_classic.count = 200;
  state.reaction.resolution = 64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: PROMPT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_LABELS = {
  boids: 'boids/flocking',
  physics: 'N-body gravitational',
  physics_classic: 'classic N-body (vintage shader)',
  fluid: 'fluid dynamics',
  parametric: 'parametric shape',
  reaction: 'Gray-Scott reaction-diffusion (3D)',
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
    damping: () => n < 0.995 ? `high damping (${val})` : `damping ${val}`,  // classic physics only
    haloMass: () => n > 8 ? `heavy halo (${val})` : n < 2 ? `light halo (${val})` : `halo mass ${val}`,
    haloScale: () => `halo scale ${val}`,
    diskMass: () => n < 0.1 ? `no disk potential` : `disk mass ${val}`,
    diskScaleA: () => `disk scale A ${val}`,
    diskScaleB: () => `disk scale B ${val}`,
    distribution: () => `${val} distribution`,
    resolution: () => `${val}x${val} grid`,
    viscosity: () => n > 0.5 ? `thick fluid (viscosity ${val})` : n < 0.05 ? `thin fluid (viscosity ${val})` : `viscosity ${val}`,
    diffusionRate: () => `diffusion ${val}`,
    forceStrength: () => n > 200 ? `strong forces (${val})` : `force strength ${val}`,
    volumeScale: () => n > 2 ? `large volume (${val})` : n < 1 ? `compact volume (${val})` : `volume scale ${val}`,
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
    physics_classic: {
      'Compute (Classic)': SHADER_NBODY_CLASSIC_COMPUTE,
      'Render (Classic)': SHADER_NBODY_CLASSIC_RENDER,
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
    reaction: {
      'Compute (Gray-Scott)': SHADER_REACTION_COMPUTE,
      'Render (Raymarch)': SHADER_REACTION_RENDER,
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
    physics_classic: {
      'Compute (Classic)': () => { SHADER_NBODY_CLASSIC_COMPUTE_EDIT = code; },
      'Render (Classic)': () => { SHADER_NBODY_CLASSIC_RENDER_EDIT = code; },
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
    reaction: {
      'Compute (Gray-Scott)': () => { SHADER_REACTION_COMPUTE_EDIT = code; },
      'Render (Raymarch)': () => { SHADER_REACTION_RENDER_EDIT = code; },
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
let SHADER_NBODY_CLASSIC_COMPUTE_EDIT: string | null = null;
let SHADER_NBODY_CLASSIC_RENDER_EDIT: string | null = null;
let SHADER_FLUID_FORCES_ADVECT_EDIT: string | null = null;
let SHADER_FLUID_DIFFUSE_EDIT: string | null = null;
let SHADER_FLUID_DIVERGENCE_EDIT: string | null = null;
let SHADER_FLUID_PRESSURE_EDIT: string | null = null;
let SHADER_FLUID_GRADIENT_EDIT: string | null = null;
let SHADER_FLUID_RENDER_EDIT: string | null = null;
let SHADER_PARAMETRIC_COMPUTE_EDIT: string | null = null;
let SHADER_PARAMETRIC_RENDER_EDIT: string | null = null;
let SHADER_REACTION_COMPUTE_EDIT: string | null = null;
let SHADER_REACTION_RENDER_EDIT: string | null = null;


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: WEBXR
// ═══════════════════════════════════════════════════════════════════════════════

let xrSession: XRSession | null = null;
let xrRefSpace: XRReferenceSpace | null = null;
let xrBinding: XRGPUBinding | null = null;
let xrLayer: XRProjectionLayer | null = null;
let xrInteractionSource: XRInputSource | null = null;
let xrInteractionHasSample = false;

// --- XR UI state ---
type XrUiElement = 'none' | 'prev' | 'next' | 'slider' | 'grab';

interface XrUiSliderDef { key: string; label: string; min: number; max: number; }
const XR_UI_SLIDER_DEFS: Record<SimMode, XrUiSliderDef> = {
  boids:           { key: 'maxSpeed',      label: 'Speed',   min: 0.1,  max: 10  },
  physics:         { key: 'G',             label: 'Gravity', min: 0.05, max: 5.0 },
  physics_classic: { key: 'G',             label: 'Gravity', min: 0.01, max: 100 },
  fluid:           { key: 'forceStrength', label: 'Force',   min: 1,    max: 500 },
  parametric:      { key: 'scale',         label: 'Scale',   min: 0.1,  max: 5   },
  reaction:        { key: 'feed',          label: 'Feed',    min: 0.0,  max: 0.1 },
};
const XR_UI_MODE_ORDER: SimMode[] = ['physics', 'boids', 'physics_classic', 'fluid', 'parametric', 'reaction'];

const xrUiState = {
  hover:              'none' as XrUiElement,
  pressed:            'none' as XrUiElement,
  pressingSource:     null as XRInputSource | null,
  pendingPressSource: null as XRInputSource | null,
  grabbed:            false,
  // Last ray/panel intersection — drives the in-shader reticle. Only set when
  // an XR input is pinching and its ray hits the panel plane.
  lastHitPx:          0,
  lastHitPy:          0,
  lastHitActive:      false,
  // Panel drag state — recorded at grab-start so we can compute deltas.
  grabDragOriginWorld: null as [number, number, number] | null,
  grabDragOriginCenter: null as [number, number, number] | null,
};

function getXrSliderNormalized(): number {
  const def = XR_UI_SLIDER_DEFS[state.mode];
  const modeParamsObj = state[state.mode] as unknown as Record<string, number>;
  const v = modeParamsObj[def.key];
  if (typeof v !== 'number') return 0;
  return Math.max(0, Math.min(1, (v - def.min) / (def.max - def.min)));
}

// Ray-plane intersection against the panel (plane at z = center[2], normal = +Z).
// Returns panel-local (px, py) in aspect-corrected coords and the element under the hit.
function hitTestXrUi(origin: number[], dir: number[]): { px: number; py: number; element: XrUiElement } | null {
  const [cx, cy, cz] = XR_UI_PANEL_CENTER;
  const [sx, sy] = XR_UI_PANEL_SIZE;
  if (Math.abs(dir[2]) < 1e-6) return null;
  const t = (cz - origin[2]) / dir[2];
  if (t < 0) return null;
  const hitX = origin[0] + dir[0] * t;
  const hitY = origin[1] + dir[1] * t;
  const u = (hitX - cx) / sx + 0.5;
  const v = (hitY - cy) / sy + 0.5;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;

  const aspect = sx / sy;
  const px = (u - 0.5) * aspect;
  const py = v - 0.5;

  // Classify — box tests matching the shader's element placements.
  let element: XrUiElement = 'none';
  if (Math.abs(px - XR_UI_PREV_X_FRAC * aspect) < XR_UI_BTN_HALF_W && Math.abs(py - XR_UI_BTN_Y) < XR_UI_BTN_HALF_H) {
    element = 'prev';
  } else if (Math.abs(px - XR_UI_NEXT_X_FRAC * aspect) < XR_UI_BTN_HALF_W && Math.abs(py - XR_UI_BTN_Y) < XR_UI_BTN_HALF_H) {
    element = 'next';
  } else if (Math.abs(py - XR_UI_GRAB_Y) < XR_UI_GRAB_HALF_H && Math.abs(px) < XR_UI_GRAB_HALF_W) {
    element = 'grab';
  } else {
    const trackHalfW = aspect * XR_UI_SLIDER_HALF_W_FRAC;
    if (Math.abs(py - XR_UI_SLIDER_Y) < XR_UI_SLIDER_HALF_H && Math.abs(px) < trackHalfW + 0.04) {
      element = 'slider';
    }
  }
  return { px, py, element };
}

// Intersect a ray with a Z-plane, returning the world-space hit point.
function xrRayPlaneHitWorld(origin: number[], dir: number[], planeZ: number): [number, number, number] | null {
  if (Math.abs(dir[2]) < 1e-6) return null;
  const t = (planeZ - origin[2]) / dir[2];
  if (t < 0) return null;
  return [origin[0] + dir[0] * t, origin[1] + dir[1] * t, planeZ];
}

function setXrSliderFromHit(px: number): void {
  const aspect = XR_UI_PANEL_SIZE[0] / XR_UI_PANEL_SIZE[1];
  const trackHalfW = aspect * XR_UI_SLIDER_HALF_W_FRAC;
  const t = Math.max(0, Math.min(1, (px + trackHalfW) / (2 * trackHalfW)));
  const def = XR_UI_SLIDER_DEFS[state.mode];
  const modeParamsObj = state[state.mode] as unknown as Record<string, number>;
  modeParamsObj[def.key] = def.min + (def.max - def.min) * t;
}

function cycleXrUiMode(delta: number): void {
  const idx = XR_UI_MODE_ORDER.indexOf(state.mode);
  const next = XR_UI_MODE_ORDER[(idx + delta + XR_UI_MODE_ORDER.length) % XR_UI_MODE_ORDER.length];
  // Route through the single mode-change enforcer so DOM, state, and
  // simulation registry all move together — even while we're in XR.
  selectMode(next);
}

function getXrInputRay(frame: XRFrame, source: XRInputSource): { origin: number[]; dir: number[] } | null {
  if (!xrRefSpace) return null;
  const pose = frame.getPose(source.targetRaySpace, xrRefSpace);
  if (!pose) return null;
  const p = pose.transform.position;
  return {
    origin: [p.x, p.y, p.z],
    dir: getXRTargetRayDirection(pose.transform),
  };
}

function applyHitToUiState(hit: { px: number; py: number; element: XrUiElement } | null): void {
  if (hit) {
    xrUiState.lastHitPx = hit.px;
    xrUiState.lastHitPy = hit.py;
    xrUiState.lastHitActive = true;
  } else {
    xrUiState.lastHitActive = false;
  }
}

function updateXrUiInput(frame: XRFrame): void {
  // Pending press from selectstart — resolve it against the first available ray.
  if (xrUiState.pendingPressSource) {
    const src = xrUiState.pendingPressSource;
    const ray = getXrInputRay(frame, src);
    if (ray) {
      const hit = hitTestXrUi(ray.origin, ray.dir);
      xrUiState.pendingPressSource = null;
      applyHitToUiState(hit);
      if (hit && hit.element !== 'none') {
        xrUiState.pressed = hit.element;
        xrUiState.pressingSource = src;
        xrUiState.hover = hit.element;
        if (hit.element === 'slider') {
          xrUiState.grabbed = true;
          setXrSliderFromHit(hit.px);
        } else if (hit.element === 'grab') {
          // Record the initial world-space hit and panel center for delta drag.
          const worldHit = xrRayPlaneHitWorld(ray.origin, ray.dir, XR_UI_PANEL_CENTER[2]);
          if (worldHit) {
            xrUiState.grabDragOriginWorld = worldHit;
            xrUiState.grabDragOriginCenter = [XR_UI_PANEL_CENTER[0], XR_UI_PANEL_CENTER[1], XR_UI_PANEL_CENTER[2]];
          }
        }
        return; // suppress sim interaction for this press
      }
      // Press is not on the UI — start sim interaction as normal.
      setXRInteractionSource(src);
    }
    return;
  }

  // Active UI press — keep the hover synced and drag the slider if grabbed.
  if (xrUiState.pressingSource) {
    const ray = getXrInputRay(frame, xrUiState.pressingSource);
    if (ray) {
      // Panel drag: move center by world-space delta from the grab origin.
      if (xrUiState.pressed === 'grab' && xrUiState.grabDragOriginWorld && xrUiState.grabDragOriginCenter) {
        const worldHit = xrRayPlaneHitWorld(ray.origin, ray.dir, xrUiState.grabDragOriginCenter[2]);
        if (worldHit) {
          XR_UI_PANEL_CENTER[0] = xrUiState.grabDragOriginCenter[0] + (worldHit[0] - xrUiState.grabDragOriginWorld[0]);
          XR_UI_PANEL_CENTER[1] = xrUiState.grabDragOriginCenter[1] + (worldHit[1] - xrUiState.grabDragOriginWorld[1]);
        }
        // During drag, reticle stays on the grab bar.
        xrUiState.lastHitPx = 0;
        xrUiState.lastHitPy = XR_UI_GRAB_Y;
        xrUiState.lastHitActive = true;
        xrUiState.hover = 'grab';
        return;
      }

      const hit = hitTestXrUi(ray.origin, ray.dir);
      applyHitToUiState(hit);
      xrUiState.hover = hit ? hit.element : 'none';
      if (xrUiState.grabbed && hit) {
        setXrSliderFromHit(hit.px);
      }
    } else {
      xrUiState.lastHitActive = false;
    }
    return;
  }

  // Even without a UI press, show the reticle whenever an active pinch
  // is aimed at the panel — this is the visual feedback loop the Vision Pro
  // interaction model relies on (the ray only exists during a pinch).
  if (xrInteractionSource) {
    const ray = getXrInputRay(frame, xrInteractionSource);
    if (ray) {
      const hit = hitTestXrUi(ray.origin, ray.dir);
      applyHitToUiState(hit);
    } else {
      xrUiState.lastHitActive = false;
    }
  } else {
    xrUiState.lastHitActive = false;
  }

  xrUiState.hover = 'none';
}

// Synthetic pointer id for the single XR interaction channel — keeps the attractor
// system's per-pointer-id contract uniform across desktop/mobile/XR.
const XR_ATTRACTOR_POINTER_ID = -1;

function setXRInteractionSource(inputSource: XRInputSource | null) {
  xrInteractionSource = inputSource;
  xrInteractionHasSample = false;
  setSimulationInteractionInactive();
  releaseAttractor(XR_ATTRACTOR_POINTER_ID); // harmless if none held
}

function getXRTargetRayDirection(transform: XRRigidTransform) {
  const m = transform.matrix;
  return normalize3([-m[8], -m[9], -m[10]]);
}

function updateXRSimulationInteraction(frame: XRFrame) {
  // [LAW:single-enforcer] UI press owns the pinch exclusively — sim interaction
  // must stay inactive so the two can't both respond to the same gesture.
  if (xrUiState.pressed !== 'none') {
    setSimulationInteractionInactive();
    return;
  }
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
    if (!uv) {
      setSimulationInteractionInactive();
      xrInteractionHasSample = false;
      return;
    }
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

  // Wand via XR pinch: create on first sample, track on each subsequent sample.
  if (state.mode === 'physics') {
    if (xrInteractionHasSample) moveAttractor(XR_ATTRACTOR_POINTER_ID, worldPoint);
    else createAttractor(XR_ATTRACTOR_POINTER_ID, worldPoint);
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
    logInfo('xr', 'exiting session (user clicked Exit VR)');
    currentGpuPhase = 'xr:session.end';
    xrSession.end();
    return;
  }

  const btn = document.getElementById('btn-xr')!;
  btn.textContent = 'Starting...';
  logInfo('xr', 'toggleXR start', {
    hasWebXR: !!navigator.xr,
    userAgent: navigator.userAgent,
  });

  try {
    // Safari visionOS: 'webgpu' is required to get XRGPUBinding.
    // 'layers' is optional — Safari accepts it in updateRenderState({ layers: [...] })
    // even when not listed as required. 'local-floor' is optional; fall back to 'local'.
    currentGpuPhase = 'xr:requestSession';
    xrSession = await navigator.xr!.requestSession('immersive-vr', {
      requiredFeatures: ['webgpu'],
      optionalFeatures: ['layers', 'local-floor'],
    });
    logInfo('xr', 'session acquired', {
      environmentBlendMode: (xrSession as unknown as { environmentBlendMode?: string }).environmentBlendMode,
      interactionMode: (xrSession as unknown as { interactionMode?: string }).interactionMode,
      visibilityState: (xrSession as unknown as { visibilityState?: string }).visibilityState,
    });
    let gotFloor = false;
    try {
      currentGpuPhase = 'xr:requestReferenceSpace(local-floor)';
      xrRefSpace = await xrSession.requestReferenceSpace('local-floor');
      gotFloor = true;
      logInfo('xr', 'reference space = local-floor');
    } catch (refErr) {
      logInfo('xr', 'local-floor unavailable, falling back to local', (refErr as Error).message);
      currentGpuPhase = 'xr:requestReferenceSpace(local)';
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
    currentGpuPhase = 'xr:new XRGPUBinding';
    xrBinding = new XRGPUBinding(xrSession, device);

    // getPreferredColorFormat() returns the texture format the XR compositor expects.
    // nativeProjectionScaleFactor is the device's native render resolution multiplier —
    // passing it to scaleFactor renders at full resolution instead of a default lower res.
    const preferredFormat = xrBinding.getPreferredColorFormat();
    const scaleFactor = xrBinding.nativeProjectionScaleFactor;
    logInfo('xr', 'binding ready', { preferredFormat, nativeProjectionScaleFactor: scaleFactor });
    syncRenderConfig(preferredFormat, 1);

    // Prefer texture-array configs WITH depth: the compositor needs per-pixel depth for
    // parallax-correct reprojection, and texture-array layers guarantee the per-eye
    // sub-image dimensions match our HDR scene target. Non-array layers share one wide
    // texture between eyes (viewport-offset right eye), so pairing them with depth
    // would produce a render-pass dimension mismatch (depth view wider than color view).
    //
    // depthStencilFormat is fixed to 'depth24plus' because all sim render pipelines are
    // compiled with that format — a 'depth32float' layer would hand us a depth texture
    // that no pipeline can bind. Adding 'depth32float' support would require either
    // dual-compiling every pipeline or copying depth between formats each frame; neither
    // is worth the complexity for a format fallback that likely never triggers in
    // practice (depth24plus is universally supported).
    //
    // Fallback priority:
    //   1. texture-array + depth24plus + native scale   ← ideal
    //   2. texture-array + depth24plus, default scale   ← native scale rejected
    //   3. texture-array, no depth                      ← depth rejected (loses reprojection)
    //   4. non-array, no depth                          ← texture-array rejected
    const layerConfigs: XRGPUProjectionLayerInit[] = [
      { colorFormat: preferredFormat, depthStencilFormat: 'depth24plus', scaleFactor, textureType: 'texture-array' },
      { colorFormat: preferredFormat, depthStencilFormat: 'depth24plus', textureType: 'texture-array' },
      { colorFormat: preferredFormat, scaleFactor, textureType: 'texture-array' },
      { colorFormat: preferredFormat, textureType: 'texture-array' },
      { colorFormat: preferredFormat, scaleFactor },
      { colorFormat: preferredFormat },
    ];
    currentGpuPhase = 'xr:createProjectionLayer';
    let chosenConfig: XRGPUProjectionLayerInit | null = null;
    const attemptLog: Array<{ config: XRGPUProjectionLayerInit; error: string }> = [];
    for (const config of layerConfigs) {
      try {
        xrLayer = xrBinding.createProjectionLayer(config);
        chosenConfig = config;
        break;
      } catch (e) {
        const msg = (e as Error).message;
        attemptLog.push({ config, error: msg });
        logInfo('xr', 'projection layer config rejected', { config, error: msg });
        xrLayer = null;
      }
    }
    if (!xrLayer) {
      throw new Error(`All projection layer configurations failed. Attempts: ${JSON.stringify(attemptLog)}`);
    }
    logInfo('xr', 'projection layer created', {
      config: chosenConfig,
      textureWidth: xrLayer.textureWidth,
      textureHeight: xrLayer.textureHeight,
      textureArrayLength: (xrLayer as unknown as { textureArrayLength?: number }).textureArrayLength,
      ignoreDepthValues: (xrLayer as unknown as { ignoreDepthValues?: boolean }).ignoreDepthValues,
    });

    // fixedFoveation = 0 → no peripheral blur. Vision Pro's default is non-zero and
    // visibly softens anything not in the center of view. Silently ignored if the
    // property isn't implemented on this platform.
    try {
      (xrLayer as unknown as { fixedFoveation: number }).fixedFoveation = 0;
      logInfo('xr', 'fixedFoveation set to 0');
    } catch (foveErr) {
      logInfo('xr', 'fixedFoveation unsupported on this platform', (foveErr as Error).message);
    }

    // Assign our GPU projection layer as the sole render target for this session.
    // This replaces the default baseLayer (canvas-backed) with our GPU texture layer.
    currentGpuPhase = 'xr:updateRenderState';
    try {
      xrSession.updateRenderState({ layers: [xrLayer] });
      logInfo('xr', 'render state updated with projection layer');
    } catch (rsErr) {
      logError('xr:updateRenderState', rsErr);
      throw rsErr;
    }
    xrSession.addEventListener('selectstart', (event) => {
      const src = (event as XRInputSourceEvent).inputSource;
      // Defer decision (UI vs sim interaction) until the next XRFrame when a
      // real pose is available.
      xrUiState.pendingPressSource = src;
    });
    xrSession.addEventListener('selectend', (event) => {
      const inputSource = (event as XRInputSourceEvent).inputSource;

      // If this release matches an active UI press, trigger button action and clear state.
      if (xrUiState.pressingSource === inputSource) {
        const pressed = xrUiState.pressed;
        const wasGrabbed = xrUiState.grabbed;
        if (pressed === 'prev' && xrUiState.hover === 'prev') cycleXrUiMode(-1);
        else if (pressed === 'next' && xrUiState.hover === 'next') cycleXrUiMode(1);
        xrUiState.pressed = 'none';
        xrUiState.pressingSource = null;
        xrUiState.grabbed = false;
        xrUiState.grabDragOriginWorld = null;
        xrUiState.grabDragOriginCenter = null;
        xrUiState.hover = 'none';
        xrUiState.lastHitActive = false;
        // Slider drag committed — persist and refresh the DOM so the value is
        // correct when the user exits VR.
        if (wasGrabbed) {
          syncUIFromState();
          saveState();
        }
        return;
      }

      // Pending press that never got resolved (released before first frame) — drop it.
      if (xrUiState.pendingPressSource === inputSource) {
        xrUiState.pendingPressSource = null;
        return;
      }

      const sameSource = xrInteractionSource === inputSource;
      setXRInteractionSource(sameSource ? null : xrInteractionSource);
    });

    btn.textContent = 'Exit VR';
    state.xrEnabled = true;
    currentGpuPhase = 'xr:awaiting first frame';

    xrSession.addEventListener('visibilitychange', () => {
      logInfo('xr', 'visibilitychange', {
        visibilityState: (xrSession as unknown as { visibilityState?: string } | null)?.visibilityState,
      });
    });

    xrSession.requestAnimationFrame(xrFrame);
    logInfo('xr', 'first frame requested; waiting for xrFrame callback');

    xrSession.addEventListener('end', () => {
      logInfo('xr', 'session ended', { finalPhase: currentGpuPhase, framesRendered: xrFrameCount });
      xrSession = null;
      xrRefSpace = null;
      xrBinding = null;
      xrLayer = null;
      state.xrEnabled = false;
      // Reset the frame counter so the first-frame diagnostics re-emit on re-entry —
      // critical for diagnosing intermittent XR issues where session 2 differs from 1.
      xrFrameCount = 0;
      currentGpuPhase = 'desktop';
      syncRenderConfig(canvasFormat, 1);
      setXRInteractionSource(null);
      btn.textContent = 'Enter VR';
      requestAnimationFrame(frame);
    });
  } catch (e) {
    logError('xr:toggle', e, `session failed to start (phase=${currentGpuPhase})`);
    btn.textContent = `XR Error: ${(e as Error).message}`;
    if (xrSession) { try { xrSession.end(); } catch (endErr) { logError('xr:cleanup-end', endErr); } }
    xrSession = null;
    currentGpuPhase = 'desktop';
    setTimeout(() => { btn.textContent = 'Enter VR'; }, 4000);
  }
}

let xrFrameCount = 0;
const XR_FIRST_FRAMES_TO_LOG = 3;

function xrFrame(time: DOMHighResTimeStamp, xrFrameData: XRFrame) {
  if (!xrSession) return;
  xrSession.requestAnimationFrame(xrFrame);
  refreshThemeColors(time);
  const isEarlyFrame = xrFrameCount < XR_FIRST_FRAMES_TO_LOG;
  if (isEarlyFrame) logInfo('xr:frame', `xrFrame #${xrFrameCount} entered`, { mode: state.mode });

  // FPS counter for XR — same logic as desktop frame loop
  frameCount++;
  if (time - fpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    fpsTime = time;
  }

  // Scope GPU validation errors to this frame so we can attribute them to the
  // XR render path specifically (otherwise uncapturederror reports them without
  // any indication that they came from XR encoding).
  currentGpuPhase = `xr:frame:${xrFrameCount}:pre-encode`;
  device.pushErrorScope('validation');

  try {
    const pose = xrFrameData.getViewerPose(xrRefSpace!);
    if (!pose) {
      if (isEarlyFrame) logInfo('xr:frame', 'no viewer pose yet');
      // Don't pop here — finally handles it. Popping twice corrupts the scope stack.
      return;
    }

    const sim = simulations[state.mode];
    if (!sim) {
      logError('xr:frame', new Error(`simulation for mode=${state.mode} is not initialized`));
      return;
    }

    // UI input runs first — it may claim a pinch that would otherwise drive the sim.
    updateXrUiInput(xrFrameData);
    updateXRSimulationInteraction(xrFrameData);

    currentGpuPhase = `xr:frame:${xrFrameCount}:createCommandEncoder`;
    const encoder = device.createCommandEncoder({ label: `xr-frame-${xrFrameCount}` });

    // Compute runs once per frame — both eyes share the same simulation state.
    if (!state.paused) {
      currentGpuPhase = `xr:frame:${xrFrameCount}:sim.compute(${state.mode})`;
      sim.compute(encoder);
    }

    // Render once per eye. pose.views is typically [left, right] on stereo devices.
    //
    // Each eye writes its camera data to a different 256-byte-aligned offset in the
    // camera buffer (viewIndex * CAMERA_STRIDE), so both writeBuffer calls coexist
    // in the queue without overwriting each other before the command buffer executes.
    // Each eye's render pass binds the camera buffer at its own offset via renderBGs[viewIndex].
    if (isEarlyFrame) logInfo('xr:frame', `pose has ${pose.views.length} views`);
    for (let viewIndex = 0; viewIndex < pose.views.length; viewIndex++) {
      const view = pose.views[viewIndex];

      // getViewSubImage (Safari) / getSubImage (Chrome) returns the per-eye render target.
      // The returned GPUTexture is owned by the XR compositor — don't hold refs across frames.
      currentGpuPhase = `xr:frame:${xrFrameCount}:getViewSubImage(eye=${viewIndex})`;
      const binding = xrBinding!;
      const subImage = binding.getViewSubImage
        ? binding.getViewSubImage(xrLayer!, view)
        : binding.getSubImage!(xrLayer!, view);
      if (!subImage) {
        logError('xr:frame', new Error(`subImage null for eye ${viewIndex}`));
        continue;
      }
      if (isEarlyFrame && viewIndex === 0) {
        logInfo('xr:frame', 'subImage', {
          viewport: subImage.viewport,
          colorFormat: subImage.colorTexture.format,
          hasDepth: !!subImage.depthStencilTexture,
        });
      }

      // getViewDescriptor() returns the correct GPUTextureViewDescriptor for this eye,
      // including the array layer index when the compositor uses a texture array.
      currentGpuPhase = `xr:frame:${xrFrameCount}:createView(color,eye=${viewIndex})`;
      const viewDesc = subImage.getViewDescriptor ? subImage.getViewDescriptor() : {};
      const textureView = subImage.colorTexture.createView(viewDesc);

      // [LAW:one-source-of-truth] Scene depth is written directly into the XR compositor's
      // depth texture. With depth in hand, Vision Pro does per-pixel parallax-correct
      // reprojection between render and scanout — eliminating the jitter/shear that
      // planar-only warp produces during head motion.
      //
      // Safety gate: only use the XR depth view when the layer is a texture-array. For
      // non-array layers the depth texture is full-width (2·eyeW) while our HDR scene
      // is per-eye (eyeW, eyeH); mixing them in one render pass fails dimension
      // validation. When we can't use it, getDepthAttachment falls back to postFx.depth
      // (renders fine, no reprojection benefit — same as if depth wasn't requested).
      currentGpuPhase = `xr:frame:${xrFrameCount}:createView(depth,eye=${viewIndex})`;
      const isTextureArray = ((xrLayer as unknown as { textureArrayLength?: number }).textureArrayLength ?? 1) > 1;
      const depthTex = subImage.depthStencilTexture;
      xrDepthOverride = (depthTex && isTextureArray) ? depthTex.createView(viewDesc) : null;

      // Set the per-eye camera override so getCameraUniformData() uses XR matrices.
      const pos = view.transform.position;
      xrCameraOverride = {
        viewMatrix: new Float32Array(view.transform.inverse.matrix),
        projMatrix: new Float32Array(view.projectionMatrix),
        eye: [pos.x, pos.y, pos.z],
      };

      const { x, y, width, height } = subImage.viewport;

      // [LAW:dataflow-not-control-flow] XR uses the same HDR + bloom + composite pipeline as desktop.
      // HDR scene is sized to the eye render area; we share one HDR scene across both eyes
      // (clobbered between eyes). Trails do not persist in XR.
      currentGpuPhase = `xr:frame:${xrFrameCount}:ensureHdrTargets(${width}x${height})`;
      ensureHdrTargets(width, height);
      postFx.needsClear = true; // force loadOp:clear; no XR trails
      const sceneIdx = postFx.sceneIdx;
      currentGpuPhase = `xr:frame:${xrFrameCount}:sim.render(${state.mode},eye=${viewIndex})`;
      sim.render(encoder, postFx.scene[sceneIdx].createView(), null, viewIndex);

      // Overlay the XR UI panel into the HDR scene so it picks up tonemap + bloom.
      // Reuse the same depth view so UI z-tests against scene depth and the stored
      // depth going to the compositor reflects the final pixel occlusion.
      const uiPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: postFx.scene[sceneIdx].createView(),
          loadOp: 'load',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: xrDepthOverride ?? postFx.depth!.createView(),
          depthLoadOp: 'load',
          depthStoreOp: 'store',
        },
      });
      currentGpuPhase = `xr:frame:${xrFrameCount}:xr-ui(eye=${viewIndex})`;
      renderXrUi(uiPass, width / height, viewIndex);
      uiPass.end();

      currentGpuPhase = `xr:frame:${xrFrameCount}:bloom(eye=${viewIndex})`;
      runBloomChain(encoder);
      currentGpuPhase = `xr:frame:${xrFrameCount}:composite(eye=${viewIndex})`;
      const ctFormat = subImage.colorTexture.format;
      runComposite(encoder, textureView, ctFormat, [x, y, width, height]);
    }

    currentGpuPhase = `xr:frame:${xrFrameCount}:submit`;
    device.queue.submit([encoder.finish()]);
    if (isEarlyFrame) logInfo('xr:frame', `frame #${xrFrameCount} submitted OK`);
  } catch (e) {
    logError('xr:frame', e, `frame #${xrFrameCount} threw synchronously`);
  } finally {
    // Clear overrides unconditionally: if anything threw inside the try, a non-null
    // xrDepthOverride would retain a compositor-owned GPUTextureView past the frame
    // boundary (unsafe — compositor reclaims these between frames). xrCameraOverride
    // leaking is less dangerous but would make the desktop frame loop use stale XR
    // matrices if the user exits VR right after an error.
    xrCameraOverride = null;
    xrDepthOverride = null;
    device.popErrorScope().then(err => {
      if (err) logError('xr:frame:validation', err, `frame #${xrFrameCount}`);
    }).catch(popErr => logError('xr:frame:popScope', popErr));
    xrFrameCount++;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: RENDER LOOP & ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

let frameCount = 0;
let fpsTime = 0;
let currentFps = 0;

// --- GPU profiling ---
// Two paths: GPU timestamp queries (Safari/Metal) give per-pass C/R/P breakdown.
// JS-side onSubmittedWorkDone fallback (Chrome/all) gives total frame GPU time.
let gpuFrameMs = 0;
let gpuTimingDetail = { compute: 0, render: 0, post: 0 };
let profilingPending = false;
let lastProfileTime = 0;
const PROFILE_INTERVAL_MS = 2000;

// GPU timestamp query state (null if unsupported)
const GPU_TS_COUNT = 6; // 3 pass pairs (begin/end): compute, render, composite
let gpuTs: { querySet: GPUQuerySet; resolveBuf: GPUBuffer; stagingBuf: GPUBuffer; pending: boolean } | null = null;

function initGpuTimestamps() {
  if (!device.features.has('timestamp-query')) return;
  gpuTs = {
    querySet: device.createQuerySet({ type: 'timestamp', count: GPU_TS_COUNT }),
    resolveBuf: device.createBuffer({ size: GPU_TS_COUNT * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC }),
    stagingBuf: device.createBuffer({ size: GPU_TS_COUNT * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }),
    pending: false,
  };
}

function tsWrites(slotPair: number): { querySet: GPUQuerySet; beginningOfPassWriteIndex: number; endOfPassWriteIndex: number } | undefined {
  if (!gpuTs) return undefined;
  return { querySet: gpuTs.querySet, beginningOfPassWriteIndex: slotPair * 2, endOfPassWriteIndex: slotPair * 2 + 1 };
}

function resolveTimestamps(encoder: GPUCommandEncoder, now: number) {
  if (!gpuTs || gpuTs.pending || now - lastProfileTime < PROFILE_INTERVAL_MS) return;
  lastProfileTime = now;
  encoder.resolveQuerySet(gpuTs.querySet, 0, GPU_TS_COUNT, gpuTs.resolveBuf, 0);
  encoder.copyBufferToBuffer(gpuTs.resolveBuf, 0, gpuTs.stagingBuf, 0, GPU_TS_COUNT * 8);
  gpuTs.pending = true;
  const ts = gpuTs;
  device.queue.onSubmittedWorkDone().then(() => {
    ts.stagingBuf.mapAsync(GPUMapMode.READ).then(() => {
      const ns = new BigInt64Array(ts.stagingBuf.getMappedRange().slice(0));
      ts.stagingBuf.unmap();
      ts.pending = false;
      const toMs = (a: bigint, b: bigint) => Number(b - a) / 1_000_000;
      gpuTimingDetail = {
        compute: toMs(ns[0], ns[1]),
        render: toMs(ns[2], ns[3]),
        post: toMs(ns[4], ns[5]),
      };
      gpuFrameMs = toMs(ns[0], ns[5]);
    }).catch(() => { ts.pending = false; });
  });
}

// JS-side fallback: total frame GPU time (when timestamps unavailable).
function measureGpuFrame(now: number) {
  if (gpuTs) return; // timestamps handle it
  if (profilingPending || now - lastProfileTime < PROFILE_INTERVAL_MS) return;
  lastProfileTime = now;
  profilingPending = true;
  const t0 = performance.now();
  device.queue.onSubmittedWorkDone().then(() => {
    gpuFrameMs = performance.now() - t0;
    profilingPending = false;
  }).catch(() => { profilingPending = false; });
}

// [LAW:single-enforcer] All sim creation funnels through here, so error surfacing
// (both sync throws and async GPU validation errors) happens in exactly one place.
// A failed factory leaves simulations[mode] unset so the render loop short-circuits
// instead of repeatedly hitting the same bad GPU state.
function showSimError(mode: SimMode, msg: string) {
  console.error(`[sim:${mode}]`, msg);
  let overlay = document.getElementById('gpu-error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gpu-error-overlay';
    overlay.style.cssText = 'position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;';
    document.body.appendChild(overlay);
  }
  const stamp = new Date().toLocaleTimeString();
  overlay.textContent = `[${stamp}] [sim:${mode}] ${msg}\n\n` + overlay.textContent;
}

function ensureSimulation() {
  const mode = state.mode;
  if (simulations[mode]) return;

  const factories = {
    boids: createBoidsSimulation,
    physics: createPhysicsSimulation,
    physics_classic: createPhysicsClassicSimulation,
    fluid: createFluidSimulation,
    parametric: createParametricSimulation,
    reaction: createReactionSimulation,
  };

  // Scope validation errors during creation so they surface loudly instead of
  // poisoning later frames. Without this, a bad texture format or pipeline
  // layout just leaves the user staring at a black canvas.
  device.pushErrorScope('validation');
  device.pushErrorScope('internal');
  device.pushErrorScope('out-of-memory');

  let sim: Simulation | null = null;
  try {
    sim = factories[mode]();
  } catch (e) {
    showSimError(mode, `factory threw: ${(e as Error).message}`);
  }

  // [LAW:single-enforcer] The async scope handlers must only act on the sim
  // instance we just created — not whatever lives at simulations[mode] by the
  // time the promise resolves. Otherwise, a stale error from a previously-
  // destroyed sim can delete a fresh one the user just reset to, and clicking
  // Reset "doesn't bring it back" mysteriously. Capturing `sim` in the closure
  // scopes the cleanup to exactly that instance.
  const capturedSim = sim;
  const capturedMode = mode;
  const dropIfBroken = (reason: string) => {
    showSimError(capturedMode, reason);
    // Only drop if the current sim is STILL the one we created — if the user
    // already reset and a new one took its place, leave it alone.
    if (capturedSim && simulations[capturedMode] === capturedSim) {
      try { capturedSim.destroy(); } catch { /* already bad */ }
      delete simulations[capturedMode];
    }
  };

  // Pop all three scopes regardless of throw, so we don't leak them.
  device.popErrorScope().then(err => { if (err) dropIfBroken(`OOM: ${err.message}`); });
  device.popErrorScope().then(err => { if (err) dropIfBroken(`internal: ${err.message}`); });
  device.popErrorScope().then(err => { if (err) dropIfBroken(`validation: ${err.message}`); });

  if (sim) {
    simulations[mode] = sim;
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
  const msPerFrame = currentFps > 0 ? (1000 / currentFps).toFixed(1) : '--';
  const d = gpuTimingDetail;
  const gpuDetail = d.compute > 0
    ? ` (C:${d.compute.toFixed(1)} R:${d.render.toFixed(1)} P:${d.post.toFixed(1)})`
    : gpuFrameMs > 0 ? ` gpu:${gpuFrameMs.toFixed(1)}ms` : '';
  document.getElementById('stat-fps')!.textContent = `${currentFps} fps ${msPerFrame}ms${gpuDetail}`;
  const sim = simulations[state.mode];
  const count = sim ? sim.getCount() : '--';
  document.getElementById('stat-count')!.textContent =
    (state.mode === 'fluid' || state.mode === 'reaction') ? `Grid: ${count}` : `Particles: ${count}`;

  // Step counter: visible only in physics mode. Shows direction arrow.
  const stepEl = document.getElementById('stat-step');
  if (stepEl) {
    if (state.mode === 'physics' && sim && 'getSimStep' in sim) {
      const step = (sim as any).getSimStep();
      const dir = (sim as any).getTimeDirection();
      stepEl.style.display = '';
      stepEl.textContent = `Step: ${step} ${dir < 0 ? '\u25C0' : '\u25B6'}`;
    } else {
      stepEl.style.display = 'none';
    }
  }
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
  ensureHdrTargets(canvas.width, canvas.height);
}

// [LAW:dataflow-not-control-flow] Post-process always runs the same passes; uniform values dictate strength.
// Before: caller has rendered the sim into the current HDR scene texture (postFx.scene[postFx.sceneIdx]).
// After: composite is written into `finalView` (canvas swapchain or XR compositor texture).
// `prevSceneIdx` (passed in) is the texture the fade pass should READ FROM (the previous frame's scene).
function runFadePass(encoder: GPUCommandEncoder, prevSceneIdx: number, currSceneIdx: number) {
  if (postFx.needsClear) return;
  const persistence = state.fx.trailPersistence;
  if (persistence < 0.001) return;
  postFx.fadeParams[0] = persistence;
  device.queue.writeBuffer(postFx.fadeUBO!, 0, postFx.fadeParams);
  const bg = device.createBindGroup({ layout: postFx.fadeBGL!, entries: [
    { binding: 0, resource: postFx.sceneViews[prevSceneIdx] },
    { binding: 1, resource: postFx.linSampler! },
    { binding: 2, resource: { buffer: postFx.fadeUBO! } },
  ]});
  const pass = encoder.beginRenderPass({ colorAttachments: [{
    view: postFx.sceneViews[currSceneIdx],
    clearValue: DEFAULT_CLEAR_COLOR,
    loadOp: 'clear',
    storeOp: 'store',
  }]});
  pass.setPipeline(postFx.fadePipeline!);
  pass.setBindGroup(0, bg);
  pass.draw(3);
  pass.end();
}

function runBloomChain(encoder: GPUCommandEncoder) {
  const fx = state.fx;
  // Downsample chain: scene → mip0 → mip1 → ... → mipN
  const sceneIdx = postFx.sceneIdx;
  for (let i = 0; i < BLOOM_LEVELS; i++) {
    const srcView = i === 0 ? postFx.sceneViews[sceneIdx] : postFx.bloomMipViews[i - 1];
    const src = i === 0 ? postFx.scene[sceneIdx] : postFx.bloomMips[i - 1];
    const p = postFx.downsampleParams[i];
    p[0] = 1.0 / src.width; p[1] = 1.0 / src.height;
    p[2] = fx.bloomThreshold; p[3] = i === 0 ? 1.0 : 0.0;
    device.queue.writeBuffer(postFx.downsampleUBO[i], 0, p);
    const bg = device.createBindGroup({ layout: postFx.downsampleBGL!, entries: [
      { binding: 0, resource: srcView },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.downsampleUBO[i] } },
    ]});
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: postFx.bloomMipViews[i],
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]});
    pass.setPipeline(postFx.downsamplePipeline!);
    pass.setBindGroup(0, bg);
    pass.draw(3);
    pass.end();
  }
  // Upsample chain: mipN → mipN-1 (additive), ..., mip1 → mip0 (additive).
  for (let i = BLOOM_LEVELS - 1; i > 0; i--) {
    const src = postFx.bloomMips[i];
    const p = postFx.upsampleParams[i];
    p[0] = 1.0 / src.width; p[1] = 1.0 / src.height;
    p[2] = fx.bloomRadius;
    device.queue.writeBuffer(postFx.upsampleUBO[i], 0, p);
    const bg = device.createBindGroup({ layout: postFx.upsampleBGL!, entries: [
      { binding: 0, resource: postFx.bloomMipViews[i] },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.upsampleUBO[i] } },
    ]});
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: postFx.bloomMipViews[i - 1],
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'load',
      storeOp: 'store',
    }]});
    pass.setPipeline(postFx.upsamplePipelineAdditive!);
    pass.setBindGroup(0, bg);
    pass.draw(3);
    pass.end();
  }
}

function runComposite(encoder: GPUCommandEncoder, finalView: GPUTextureView, finalFormat: GPUTextureFormat, viewport: number[] | null = null) {
  const fx = state.fx;
  const tc = getThemeColors();
  const buf = postFx.compositeParams;
  const u32buf = new Uint32Array(buf.buffer);
  buf[0] = fx.bloomIntensity;
  buf[1] = fx.exposure;
  buf[2] = fx.vignette;
  buf[3] = fx.chromaticAberration;
  buf[4] = fx.grading;

  // [LAW:single-enforcer] One matrix setup, reused for every attractor projection below.
  const aspect = viewport ? (viewport[2] / viewport[3]) : (canvas.width / canvas.height);
  const fovRad = state.camera.fov * Math.PI / 180;
  const orbitCam = getOrbitCamera();
  const viewMat = xrCameraOverride ? xrCameraOverride.viewMatrix : orbitCam.view;
  const projMat = xrCameraOverride ? xrCameraOverride.projMatrix : mat4.perspective(fovRad, aspect, 0.01, DESKTOP_CAMERA_FAR);

  // [LAW:one-source-of-truth] Attractor strengths re-derived from the same state.attractors array the compute
  // shader reads (via the N-body param packing). Projection from world-space to screen UV happens once per
  // attractor, per frame — ~32 matrix ops max, dwarfed by the render pass itself.
  const nowSec = performance.now() * 0.001;
  const ceiling = (state.physics as { interactionStrength?: number }).interactionStrength ?? 1;
  const attractors = state.attractors;
  const attractorN = Math.min(attractors.length, ATTRACTOR_MAX);
  u32buf[5] = attractorN; // attractorCount as u32
  buf[6] = 0; buf[7] = 0; // pad slots

  buf[8] = tc.primary[0]; buf[9] = tc.primary[1]; buf[10] = tc.primary[2];
  // pad 11
  buf[12] = tc.accent[0]; buf[13] = tc.accent[1]; buf[14] = tc.accent[2];
  // pad 15
  buf[16] = nowSec;
  // pad 17..19

  // Attractor array at byte offset 80 = f32 index 20. Each entry: (screenX, screenY, strength, pad) = 4 floats.
  for (let i = 0; i < attractorN; i++) {
    const a = attractors[i];
    const wx = a.x, wy = a.y, wz = a.z;
    const vx = viewMat[0]*wx + viewMat[4]*wy + viewMat[8]*wz + viewMat[12];
    const vy = viewMat[1]*wx + viewMat[5]*wy + viewMat[9]*wz + viewMat[13];
    const vz = viewMat[2]*wx + viewMat[6]*wy + viewMat[10]*wz + viewMat[14];
    const vw = viewMat[3]*wx + viewMat[7]*wy + viewMat[11]*wz + viewMat[15];
    const cx = projMat[0]*vx + projMat[4]*vy + projMat[8]*vz + projMat[12]*vw;
    const cy = projMat[1]*vx + projMat[5]*vy + projMat[9]*vz + projMat[13]*vw;
    const cw = projMat[3]*vx + projMat[7]*vy + projMat[11]*vz + projMat[15]*vw;
    const ndcX = cw !== 0 ? cx / cw : 0;
    const ndcY = cw !== 0 ? cy / cw : 0;
    const base = 20 + i * 4;
    buf[base] = ndcX * 0.5 + 0.5;
    buf[base + 1] = 1.0 - (ndcY * 0.5 + 0.5);
    buf[base + 2] = attractorStrength(a, nowSec, ceiling);
    buf[base + 3] = 0;
  }
  // Zero any trailing slots beyond active count (strength=0 is inert anyway, but keeps the buffer clean).
  for (let i = attractorN; i < ATTRACTOR_MAX; i++) {
    const base = 20 + i * 4;
    buf[base] = 0; buf[base + 1] = 0; buf[base + 2] = 0; buf[base + 3] = 0;
  }
  device.queue.writeBuffer(postFx.compositeUBO!, 0, buf);

  const pipeline = ensureCompositePipeline(finalFormat);
  const bg = device.createBindGroup({ layout: postFx.compositeBGL!, entries: [
    { binding: 0, resource: postFx.sceneViews[postFx.sceneIdx] },
    { binding: 1, resource: postFx.bloomMipViews[0] },
    { binding: 2, resource: postFx.linSampler! },
    { binding: 3, resource: { buffer: postFx.compositeUBO! } },
  ]});
  const pTsw = tsWrites(2);
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: finalView,
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
    ...(pTsw ? { timestampWrites: pTsw } : {}),
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bg);
  if (viewport) pass.setViewport(viewport[0], viewport[1], viewport[2], viewport[3], 0, 1);
  pass.draw(3);
  pass.end();
}

function frame(now: DOMHighResTimeStamp) {
  if (state.xrEnabled) return; // XR has its own loop

  requestAnimationFrame(frame);
  refreshThemeColors(now);
  resizeCanvas();
  // [LAW:single-enforcer] Attractor lifecycle prune runs every frame regardless of mode,
  // so mode switches can't leak dead attractors into the array.
  pruneAttractors(now * 0.001);

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

  // [LAW:single-enforcer] GPU validation errors are caught by device.onuncapturederror
  // (set up in initWebGPU) which surfaces them in the error overlay without per-frame
  // scope overhead. Targeted scopes in ensureSimulation() handle creation-time errors.
  const mode = state.mode;

  try {
    const encoder = device.createCommandEncoder();

    if (!state.paused) {
      sim.compute(encoder);
    }

    const prevIdx = postFx.sceneIdx;
    const currIdx = 1 - prevIdx;
    postFx.sceneIdx = currIdx;

    runFadePass(encoder, prevIdx, currIdx);

    sim.render(encoder, postFx.sceneViews[currIdx], null);

    runBloomChain(encoder);
    const swapchainView = context.getCurrentTexture().createView();
    runComposite(encoder, swapchainView, canvasFormat);

    resolveTimestamps(encoder, now);
    device.queue.submit([encoder.finish()]);
    measureGpuFrame(now);

    postFx.needsClear = false;
  } catch (e) {
    showSimError(mode, `frame threw: ${(e as Error).message}`);
    // Only drop the sim instance we were just rendering — not whatever lives
    // in the registry now, which could be a fresh one the user already reset.
    if (simulations[mode] === sim) {
      try { sim.destroy(); } catch { /* ignore */ }
      delete simulations[mode];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: STATE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'shader-playground-state';

function saveState() {
  try {
    // [LAW:one-source-of-truth] DEFAULTS is the canonical mode registry — no parallel list
    const modeSnapshot: Record<string, unknown> = {};
    for (const mode of Object.keys(DEFAULTS) as SimMode[]) {
      modeSnapshot[mode] = modeParams(mode);
    }
    const toSave = { mode: state.mode, colorTheme: state.colorTheme, camera: state.camera, fx: state.fx, ...modeSnapshot };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) { /* ignore quota errors */ }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (parsed.mode && parsed.mode in DEFAULTS) state.mode = parsed.mode as SimMode;
    if (parsed.colorTheme && COLOR_THEMES[parsed.colorTheme]) state.colorTheme = parsed.colorTheme;
    // [LAW:one-source-of-truth] loop over DEFAULTS so new modes get persistence automatically
    for (const mode of Object.keys(DEFAULTS) as SimMode[]) {
      if (parsed[mode]) Object.assign(modeParams(mode), parsed[mode]);
    }
    if (parsed.camera) Object.assign(state.camera, parsed.camera);
    if (parsed.fx) Object.assign(state.fx, parsed.fx);
    syncThemeTransition(state.colorTheme);
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

  // Mobile detection — gates touch controls, bottom sheet, and performance defaults
  isMobile = mobileQuery.matches;
  document.body.classList.toggle('mobile', isMobile);
  mobileQuery.addEventListener('change', (e) => {
    const nextIsMobile = e.matches;
    if (nextIsMobile === isMobile) return;
    isMobile = nextIsMobile;
    document.body.classList.toggle('mobile', isMobile);

    // Input handlers and mobile-only UI are initialized during startup, so
    // crossing the breakpoint requires a full re-init to avoid mixing
    // desktop and mobile interaction semantics.
    window.location.reload();
  });

  initGrid();
  initXrUi();
  loadState();
  if (isMobile) applyMobileDefaults();
  syncThemeTransition(state.colorTheme);
  buildControls();
  buildThemeSelector();
  setupTabs();
  setupGlobalControls();
  if (isMobile) {
    setupMobileTouchControls();
    setupMobileFab();
    setupBottomSheet();
  } else {
    setupMouseControls();
  }
  setupShaderPanel();
  setupTimeReverseControls();
  syncUIFromState();
  resizeCanvas();
  ensureSimulation();
  updateAll();

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(document.getElementById('canvas-container')!);

  requestAnimationFrame(frame);

  // Expose diagnostic tools for external analysis (Chrome DevTools MCP, etc.)
  (window as any).__simDiagnose = () => {
    const sim = simulations[state.mode];
    return sim?.diagnose ? sim.diagnose() : Promise.resolve({ error: 1, msg: 'no diagnose on this sim' });
  };
  (window as any).__simPreset = (name: string) => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) { if (b.textContent?.trim() === name) { (b as HTMLButtonElement).click(); return 'ok'; } }
    return 'preset not found';
  };
  (window as any).__simState = () => ({ mode: state.mode, ...state[state.mode] as any, fps: currentFps, gpuMs: gpuFrameMs, gpuDetail: gpuTimingDetail });
  (window as any).__simStats = () => {
    const sim = simulations[state.mode];
    const stats = (sim as any)?.getStats ? (sim as any).getStats() : { error: 'no stats on this sim' };
    return { ...stats, gpuMs: gpuFrameMs, gpuDetail: gpuTimingDetail };
  };
}

main();

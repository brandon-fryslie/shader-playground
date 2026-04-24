import '../../styles/main.css';
import type { SimMode, Simulation, AppState, Attractor, Marker, ThemeColors, RGBThemeColors, ParamDef, ParamSection, ShapeParamDef, XRCameraOverride, DepthRef, ModeParamsMap, ShapeName } from '../types';
import { bindingRegistry } from '../xr-ui/bindings';
import { evaluateAnchor, type Anchor } from '../xr-ui/anchors';
import { layout as xrUiLayout, hitTestWidgets } from '../xr-ui/layout';
import {
  xrUiStep, applySideEffects as xrUiApplyEffects, makeIdlePrev as xrUiMakeIdlePrev,
  uiHandClaimed, type XrUiPrev, type XrUiRegistry, type RenderCommand as XrRenderCommand,
} from '../xr-ui/step';
import { createXrWidgetRenderer, type XrWidgetRenderer } from '../xr-ui/renderer';
import { HIG_DEFAULTS } from '../xr-ui/widgets';
import { createGasReservoir, GAS_SHADER_SOURCES } from '../gasReservoir';

// WGSL shader imports — Vite loads these as raw strings
import SHADER_BOIDS_COMPUTE from '../shaders/boids.compute.wgsl?raw';
import SHADER_BOIDS_RENDER from '../shaders/boids.render.wgsl?raw';
import SHADER_NBODY_COMPUTE from '../shaders/nbody.compute.wgsl?raw';
import SHADER_NBODY_STATS from '../shaders/nbody.stats.wgsl?raw';
import SHADER_NBODY_RENDER from '../shaders/nbody.render.wgsl?raw';
import SHADER_MARKERS_RENDER from '../shaders/markers.render.wgsl?raw';
import SHADER_NBODY_CLASSIC_COMPUTE from '../shaders/nbody.classic.compute.wgsl?raw';
import SHADER_PM_DEPOSIT from '../shaders/pm.deposit.wgsl?raw';
import SHADER_PM_DENSITY_CONVERT from '../shaders/pm.density_convert.wgsl?raw';
import SHADER_PM_SMOOTH from '../shaders/pm.smooth.wgsl?raw';
import SHADER_PM_RESIDUAL from '../shaders/pm.residual.wgsl?raw';
import SHADER_PM_RESTRICT from '../shaders/pm.restrict.wgsl?raw';
import SHADER_PM_PROLONG from '../shaders/pm.prolong.wgsl?raw';
import SHADER_PM_INTERPOLATE from '../shaders/pm.interpolate.wgsl?raw';
import SHADER_PM_INTERPOLATE_NESTED from '../shaders/pm.interpolate_nested.wgsl?raw';
import SHADER_PM_BOUNDARY_SAMPLE from '../shaders/pm.boundary_sample.wgsl?raw';
import SHADER_NBODY_CLASSIC_RENDER from '../shaders/nbody.classic.render.wgsl?raw';
import SHADER_FLUID_FORCES_ADVECT from '../shaders/fluid.forces.wgsl?raw';
import SHADER_FLUID_DIFFUSE from '../shaders/fluid.diffuse.wgsl?raw';
import SHADER_FLUID_PRESSURE from '../shaders/fluid.pressure.wgsl?raw';
import SHADER_FLUID_DIVERGENCE from '../shaders/fluid.divergence.wgsl?raw';
import SHADER_FLUID_GRADIENT from '../shaders/fluid.gradient.wgsl?raw';
import SHADER_FLUID_RENDER from '../shaders/fluid.render.wgsl?raw';
import SHADER_PARAMETRIC_COMPUTE from '../shaders/parametric.compute.wgsl?raw';
import SHADER_PARAMETRIC_RENDER from '../shaders/parametric.render.wgsl?raw';
import SHADER_REACTION_COMPUTE from '../shaders/reaction.compute.wgsl?raw';
import SHADER_REACTION_RENDER from '../shaders/reaction.render.wgsl?raw';
import SHADER_GRID from '../shaders/grid.wgsl?raw';
import SHADER_POST_FADE from '../shaders/post.fade.wgsl?raw';
import SHADER_POST_DOWNSAMPLE from '../shaders/post.downsample.wgsl?raw';
import SHADER_POST_UPSAMPLE from '../shaders/post.upsample.wgsl?raw';
import SHADER_POST_COMPOSITE from '../shaders/post.composite.wgsl?raw';

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
    // G retuned for PM gravity (ticket .6). Old normalization divided G by
    // sqrt(MASSIVE_BODY_COUNT / 1000) ≈ 2.86 for typical N; PM applies G
    // directly with total_mass = 1.0. First-cut default; .7 handles proper
    // tuning.
    count: 80000, G: 0.3, softening: 1.5, distribution: 'disk',
    interactionStrength: 1.0, tidalStrength: 0.008,
    attractorDecayTime: 2.0,
    gasMassFraction: 0.15, gasSoundSpeed: 2.0, gasVisible: true,
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

const PRESETS: Record<SimMode, Record<string, Record<string, number | string | boolean>>> = {
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
      { key: 'interactionStrength', label: 'Interaction Pull', min: 0.1, max: 100, step: 0.01, logScale: true },
      { key: 'attractorDecayTime', label: 'Decay Time (s)', min: 0.1, max: 30.0, step: 0.1, maxLabel: 'Permanent' },
      { key: 'tidalStrength', label: 'Tidal Field', min: 0.0, max: 0.05, step: 0.0005 },
    ]},
    { section: 'Gas Reservoir', params: [
      { key: 'gasMassFraction', label: 'Gas Mass', min: 0.0, max: 0.5, step: 0.01, requiresReset: true },
      { key: 'gasSoundSpeed', label: 'Sound Speed', min: 0.5, max: 5.0, step: 0.05 },
      { key: 'gasVisible', label: 'Gas Visible', type: 'toggle' },
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
function modeParams(mode: SimMode): Record<string, number | string | boolean> {
  return state[mode] as unknown as Record<string, number | string | boolean>;
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
  // Held attractors have releaseStep < 0 and holdSteps < 0 (follow cursor, strength charging in sim steps).
  // Released attractors decay over attractorDecaySteps(a) sim steps, then get pruned from the array.
  // Max cap of 32 is a safety rail — in practice users hit 5-10 concurrent at most.
  attractors: [] as Attractor[],
  markers: [] as Marker[],
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
  debug: { xrLog: false },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ATTRACTOR LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

// [LAW:one-source-of-truth] Lifecycle is driven by sim step — forces are a pure function of (attractor, simStep).
// This makes reverse→forward→reverse deterministic: rewinding to step K and replaying forward produces the
// exact same force field unless the user branches (creates/moves a wand), in which case fresh journal entries
// from step K onward overwrite the old history. No wall-clock leaks in; no cross-clock drift possible.
// Step constants derive from the canonical base dt (0.016s at timeScale=1) so "seconds" sliders convert
// to the same step count the sim actually advances per simulated second. Actual wall-clock duration varies
// with timeScale, but the slider is intentionally indexed to simulated time at timeScale=1.
const PHYSICS_BASE_DT = 0.016;
const STEPS_PER_SECOND = 1 / PHYSICS_BASE_DT; // 62.5 — matches `baseDt = 0.016 * timeScale` in physics compute
const ATTRACTOR_CHARGE_STEPS = 90;          // ~1.5s at timeScale=1 — quadratic ramp to full strength
const ATTRACTOR_MAX = 32;                   // hard cap; oldest evicted if exceeded
const ATTRACTOR_MIN_DECAY_STEPS = 3;        // ~0.05s — lower bound so releases are always visible
// Slider values at or above this threshold treat the attractor as permanent
// (decaySteps = Infinity). Matches the PARAM_DEFS attractorDecayTime max of 30.
const ATTRACTOR_PERMANENT_THRESHOLD = 30.0;

// [LAW:single-enforcer] Sim step + time direction accessed through these helpers so attractor lifecycle
// always agrees with the physics sim's canonical clock. Returns safe defaults when physics is inactive.
function currentSimStep(): number {
  const sim = simulations['physics'];
  if (sim && 'getSimStep' in sim) return (sim as { getSimStep(): number }).getSimStep();
  return 0;
}

function currentTimeDirection(): number {
  const sim = simulations['physics'];
  if (sim && 'getTimeDirection' in sim) return (sim as { getTimeDirection(): number }).getTimeDirection();
  return 1;
}

// [LAW:single-enforcer] Decay window in steps is computed here, from the
// attractorDecayTime slider (seconds, converted via STEPS_PER_SECOND).
// Slider at max → Infinity (attractor never decays — "Permanent" mode).
// Minimum floor prevents zero-duration decay on instant-release taps.
// Unused `a` kept in signature for future per-attractor decay overrides.
function attractorDecaySteps(_a: Attractor): number {
  const decayTime = state.physics.attractorDecayTime ?? 2.0;
  if (decayTime >= ATTRACTOR_PERMANENT_THRESHOLD) return Number.POSITIVE_INFINITY;
  return Math.max(ATTRACTOR_MIN_DECAY_STEPS, decayTime * STEPS_PER_SECOND);
}

// [LAW:dataflow-not-control-flow] Strength is a pure function of (attractor, currentStep). The same quadratic
// formula handles charging and decay; step ordering selects which branch of the curve. No branches on wall time.
// The charging branch covers both "still held" (releaseStep < 0) and "held in the past, replaying before release"
// (currentStep < releaseStep) — after rewinding below a release point, forward replay must see the charging curve
// the original pass saw, otherwise the journal gets overwritten with 0 and reverse→forward→reverse diverges.
function attractorStrength(a: Attractor, currentStep: number, ceiling: number): number {
  if (a.releaseStep < 0 || currentStep < a.releaseStep) {
    const stepsHeld = Math.max(0, currentStep - a.chargeStep);
    const t = Math.min(1, stepsHeld / ATTRACTOR_CHARGE_STEPS);
    return t * t * ceiling;
  }
  const peakT = Math.min(1, a.holdSteps / ATTRACTOR_CHARGE_STEPS);
  const peak = peakT * peakT * ceiling;
  const elapsedSteps = currentStep - a.releaseStep;
  const decaySteps = attractorDecaySteps(a);
  if (elapsedSteps >= decaySteps) return 0;
  const remaining = 1 - elapsedSteps / decaySteps;
  return peak * remaining * remaining;
}

function attractorDead(a: Attractor, currentStep: number): boolean {
  if (a.releaseStep < 0) return false;
  return (currentStep - a.releaseStep) >= attractorDecaySteps(a);
}

// [LAW:single-enforcer] Pruning happens in exactly one place per frame, before uniform upload.
// Rebuilds pointerToAttractor index mapping since array indices shift after splice.
// Skipped during reverse: decrementing simStep could un-kill an attractor (d(currentStep - releaseStep) < 0),
// and prune-then-un-kill would leave the live array out of sync with the reverse branch's state.
function pruneAttractors(currentStep: number) {
  if (currentTimeDirection() < 0) return;
  const kept: Attractor[] = [];
  const oldToNew = new Map<number, number>();
  for (let i = 0; i < state.attractors.length; i++) {
    const a = state.attractors[i];
    if (!attractorDead(a, currentStep)) {
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
  reindexMarkers(oldToNew);
}

function createAttractor(pointerId: number, pos: number[]): void {
  // [LAW:single-enforcer] Block attractor creation during reverse — the journal owns attractor forces
  // there; a new wand would branch mid-reverse and its journal write would collide with the replay.
  if (currentTimeDirection() < 0) return;
  // Force-evict oldest if we're at the cap. Oldest by insertion order.
  if (state.attractors.length >= ATTRACTOR_MAX) {
    state.attractors.shift();
    // All indices shift down by 1.
    const rebuilt = new Map<number, number>();
    state.pointerToAttractor.forEach((idx, pid) => {
      if (idx > 0) rebuilt.set(pid, idx - 1);
    });
    state.pointerToAttractor = rebuilt;
    // Marker pool mirrors the shift — markers of the evicted attractor (idx 0) drop, rest shift down.
    const survivors: Marker[] = [];
    for (const m of state.markers) {
      if (m.attractorIdx > 0) { m.attractorIdx -= 1; survivors.push(m); }
    }
    state.markers = survivors;
  }
  const step = currentSimStep();
  state.attractors.push({
    x: pos[0], y: pos[1], z: pos[2],
    chargeStep: step, releaseStep: -1, holdSteps: -1,
  });
  const idx = state.attractors.length - 1;
  state.pointerToAttractor.set(pointerId, idx);
  spawnMarkersFor(idx, pos[0], pos[1], pos[2]);
}

function moveAttractor(pointerId: number, pos: number[]): void {
  const idx = state.pointerToAttractor.get(pointerId);
  if (idx === undefined) return;
  const a = state.attractors[idx];
  if (!a || a.releaseStep >= 0) return;
  a.x = pos[0]; a.y = pos[1]; a.z = pos[2];
}

function releaseAttractor(pointerId: number): void {
  const idx = state.pointerToAttractor.get(pointerId);
  if (idx === undefined) return;
  state.pointerToAttractor.delete(pointerId);
  const a = state.attractors[idx];
  if (!a || a.releaseStep >= 0) return;
  const step = currentSimStep();
  a.releaseStep = step;
  a.holdSteps = Math.max(1, step - a.chargeStep); // min 1 step to avoid zero-duration divide
}

// ─── MARKER PARTICLES (diegetic attractor indicator) ────────────────────────────
// [LAW:one-source-of-truth] Markers are a flat pool keyed by parent attractor index. Lifecycle mirrors
// the attractor's: spawnMarkersFor on createAttractor, reindexed on pruneAttractors, integrated each
// frame via tickMarkers. They render into the HDR scene so bloom carries them — no overlay pass.
const MARKERS_PER_ATTRACTOR = 36;
const MARKER_SPAWN_RADIUS = 0.22;
const MARKER_ORBIT_SPEED = 1.1;

function spawnMarkersFor(attractorIdx: number, x: number, y: number, z: number): void {
  const tc = getThemeColors();
  for (let i = 0; i < MARKERS_PER_ATTRACTOR; i++) {
    // Uniform point on sphere via inverse-CDF of cos(theta).
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(phi), dy = u, dz = s * Math.sin(phi);
    const r = MARKER_SPAWN_RADIUS * (0.6 + Math.random() * 0.8);
    // Tangent vector: cross(radial, arbitrary up) then normalize. Yields orbital velocity.
    let tx = -dz, ty = 0, tz = dx;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen; ty /= tLen; tz /= tLen;
    const orbitSign = Math.random() < 0.5 ? -1 : 1;
    const orbitSpeed = MARKER_ORBIT_SPEED * (0.7 + Math.random() * 0.6) * orbitSign;
    state.markers.push({
      x: x + dx * r, y: y + dy * r, z: z + dz * r,
      vx: tx * orbitSpeed, vy: ty * orbitSpeed, vz: tz * orbitSpeed,
      tintR: tc.accent[0], tintG: tc.accent[1], tintB: tc.accent[2],
      seed: Math.random(),
      attractorIdx,
    });
  }
}

function reindexMarkers(oldToNew: Map<number, number>): void {
  const kept: Marker[] = [];
  for (const m of state.markers) {
    const newIdx = oldToNew.get(m.attractorIdx);
    if (newIdx !== undefined) {
      m.attractorIdx = newIdx;
      kept.push(m);
    }
  }
  state.markers = kept;
}

// [LAW:dataflow-not-control-flow] Marker integration is a straight-line pass: every marker gets a pull
// from its parent attractor and a light global drag so orbits stay bounded. No branches skip work.
function tickMarkers(dt: number): void {
  if (state.markers.length === 0) return;
  const attractors = state.attractors;
  const softSq = 0.04; // softening squared — matches the visual scale of the well
  // Drag always dissipates regardless of sign(dt) — otherwise reverse play amplifies velocity.
  const drag = Math.exp(-0.6 * Math.abs(dt));
  for (const m of state.markers) {
    const a = attractors[m.attractorIdx];
    if (!a) continue; // safety; prune should keep these in sync
    const rx = a.x - m.x, ry = a.y - m.y, rz = a.z - m.z;
    const r2 = rx * rx + ry * ry + rz * rz + softSq;
    const inv = 1 / Math.sqrt(r2);
    const pull = 3.0 * inv * inv; // ~1/r² — mild spring-ish
    m.vx += rx * inv * pull * dt;
    m.vy += ry * inv * pull * dt;
    m.vz += rz * inv * pull * dt;
    m.vx *= drag; m.vy *= drag; m.vz *= drag;
    m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
  }
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
  nullColor: GPUTexture | null;
  nullDepth: GPUTexture | null;
  nullColorView: GPUTextureView | null;
  nullDepthView: GPUTextureView | null;
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
  nullColor: null,
  nullDepth: null,
  nullColorView: null,
  nullDepthView: null,
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
  compositeParams: new Float32Array(16), // 64-byte UBO: 5 fx scalars + pads + primary vec3 + accent vec3
};
const HDR_FORMAT: GPUTextureFormat = 'rgba16float';
const BLOOM_LEVELS = 3; // 5 mips made the largest blur radius half-screen, fusing dense clusters into a giant white blob.

function initPostFx(): void {
  // [LAW:dataflow-not-control-flow] Hidden optional render layers still encode
  // their pass; the data-selected null attachments keep that pass from loading
  // the full scene when the layer has no visible output.
  postFx.nullColor = device.createTexture({
    size: [1, 1],
    format: HDR_FORMAT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  postFx.nullDepth = device.createTexture({
    size: [1, 1],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  postFx.nullColorView = postFx.nullColor.createView();
  postFx.nullDepthView = postFx.nullDepth.createView();

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
  // 5 fx scalars + 3 pads = 32 bytes, + vec3 primary + pad + vec3 accent + pad = 64 bytes total.
  postFx.compositeUBO = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  // Pre-allocate staging arrays — reused every frame instead of allocating new Float32Arrays.
  postFx.fadeParams = new Float32Array(4);
  postFx.compositeParams = new Float32Array(16); // 64-byte composite UBO
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
      initWebGPU().then(ok => { if (ok) { initGrid(); ensureSimulation(); requestAnimationFrame(frame); } });
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
      // [LAW:one-source-of-truth] Buffer access mirrors boids.compute.wgsl:
      // particlesIn is read-only and particlesOut is the sole write target.
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

// [LAW:single-enforcer] Canonical multigrid V-cycle dispatcher used by every
// PM grid (inner, outer, future gas-coupled grid). Encapsulates the full
// descent → coarsest → ascent shape:
//   1. Clear coarse-level potentials (levels 1..maxLevel). Level 0 keeps
//      previous-frame warm-start so the solver converges in 1 cycle.
//   2. Descent (l = 0..maxLevel-1): pre-smooth, residual, restrict.
//   3. Coarsest level (l = maxLevel): over-smooth toward exact solve.
//   4. Ascent (l = maxLevel-1..0): prolong correction + post-smooth.
//
// Opens its own compute pass (WebGPU implicit-barrier boundary). The clear
// ops MUST run outside any compute pass, which is why the clears live in
// this helper rather than the caller.
interface PmVCycleArgs {
  levels: number;              // total multigrid levels (e.g. 6 → levels 0..5)
  wgCount: number[];           // workgroup count per level (@workgroup_size(4,4,4))
  potential: GPUBuffer[];      // phi[0..levels-1]
  smoothBG: GPUBindGroup[][];  // smoothBG[level][parity]  (parity: 0=red, 1=black)
  residualBG: GPUBindGroup[];  // residualBG[level]
  restrictBG: GPUBindGroup[];  // restrictBG[level] = transition level → level+1
  prolongBG: GPUBindGroup[];   // prolongBG[level]  = transition level+1 → level
  preSmooth: number;           // red-black GS sweeps before restriction (per level)
  postSmooth: number;          // red-black GS sweeps after prolongation (per level)
  coarsestSweeps: number;      // red-black GS sweeps on the coarsest level
  timingBucket?: GpuTimingBucket;
}

function runPmVCycle(encoder: GPUCommandEncoder, a: PmVCycleArgs): void {
  const maxLevel = a.levels - 1;

  // Clear coarse-level corrections. Level 0 is NOT cleared — its residual
  // warm-start is the whole reason one V-cycle suffices each frame.
  for (let l = 1; l < a.levels; l++) encoder.clearBuffer(a.potential[l]);

  // [LAW:dataflow-not-control-flow] Every level runs the same operations
  // every cycle; only the per-level bind group and workgroup count vary.
  // No phase check, no branch on simStep — the solver is a pure function of
  // (density, previous phi[0]).
  const vTsw = a.timingBucket ? tsWrites(a.timingBucket) : undefined;
  const pass = encoder.beginComputePass(vTsw ? { timestampWrites: vTsw } : undefined);

  // Descent: smooth + residual + restrict at each level down to maxLevel-1.
  for (let l = 0; l < maxLevel; l++) {
    const n = a.wgCount[l];
    pass.setPipeline(pmSmoothPipeline);
    for (let s = 0; s < a.preSmooth; s++) {
      pass.setBindGroup(0, a.smoothBG[l][0]); pass.dispatchWorkgroups(n, n, n);
      pass.setBindGroup(0, a.smoothBG[l][1]); pass.dispatchWorkgroups(n, n, n);
    }
    pass.setPipeline(pmResidualPipeline);
    pass.setBindGroup(0, a.residualBG[l]); pass.dispatchWorkgroups(n, n, n);
    pass.setPipeline(pmRestrictPipeline);
    pass.setBindGroup(0, a.restrictBG[l]);
    const nNext = a.wgCount[l + 1];
    pass.dispatchWorkgroups(nNext, nNext, nNext);
  }

  // Coarsest level: over-smooth toward exact solve. Level is tiny (4³ for
  // inner, 4³ for outer with 5 levels) so many sweeps are cheap.
  {
    const n = a.wgCount[maxLevel];
    pass.setPipeline(pmSmoothPipeline);
    for (let s = 0; s < a.coarsestSweeps; s++) {
      pass.setBindGroup(0, a.smoothBG[maxLevel][0]); pass.dispatchWorkgroups(n, n, n);
      pass.setBindGroup(0, a.smoothBG[maxLevel][1]); pass.dispatchWorkgroups(n, n, n);
    }
  }

  // Ascent: prolong correction up one level + post-smooth.
  for (let l = maxLevel - 1; l >= 0; l--) {
    const n = a.wgCount[l];
    pass.setPipeline(pmProlongPipeline);
    pass.setBindGroup(0, a.prolongBG[l]); pass.dispatchWorkgroups(n, n, n);
    pass.setPipeline(pmSmoothPipeline);
    for (let s = 0; s < a.postSmooth; s++) {
      pass.setBindGroup(0, a.smoothBG[l][0]); pass.dispatchWorkgroups(n, n, n);
      pass.setBindGroup(0, a.smoothBG[l][1]); pass.dispatchWorkgroups(n, n, n);
    }
  }

  pass.end();
}

// Pipeline handles reused by runPmVCycle. Declared here so the helper can
// reference them; populated once inside createPhysicsSimulation at init.
// [LAW:one-source-of-truth] Single module-scope pipeline object per stage.
let pmSmoothPipeline: GPUComputePipeline;
let pmResidualPipeline: GPUComputePipeline;
let pmRestrictPipeline: GPUComputePipeline;
let pmProlongPipeline: GPUComputePipeline;

function createPhysicsSimulation() {
  const count = state.physics.count;
  const bodyBytes = count * 48; // pos(12) + mass(4) + vel(12) + pad(4) + home(12) + pad(4) = 48
  const gasMassFraction = Math.max(0, Math.min(0.5, state.physics.gasMassFraction ?? 0.15));

  // [LAW:one-source-of-truth] N-body orbit shaping constants live together so position thickness and velocity tilt stay in sync.
  const DISK_THICKNESS = 0.2;
  const VERTICAL_DRIFT = 0.18;
  // PM gravity is uniform across all particles — no source/tracer distinction.
  // All particles deposit mass AND feel force from the Poisson potential, so
  // the old "cap N² cost with 3% heavy sources" machinery is gone.
  // [LAW:one-source-of-truth] Circular velocity includes self-gravity + dark matter (halo + disk).
  // This is the single formula that determines whether particles start in equilibrium.
  const haloM = state.physics.haloMass ?? 5.0;
  const haloA = state.physics.haloScale ?? 2.0;
  const diskM = state.physics.diskMass ?? 3.0;
  const diskA = state.physics.diskScaleA ?? 1.5;
  const diskB = state.physics.diskScaleB ?? 0.3;
  // [LAW:one-source-of-truth] Initial velocities must match the exact force the shader applies.
  // haloMass and diskMass are GM-equivalent parameters here (decoupled from state.physics.G for
  // the same reason as the shader — see nbody.compute.wgsl:142-148). Multiplying by G here would
  // break initial equilibrium with the shader forces.
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

  const initData = new Float32Array(count * 12);
  let totalStarMass = 0;
  const dist = state.physics.distribution;
  const orbitalNormal = normalize3([0.18, 1.0, -0.12]);
  const orbitalTangent = normalize3(cross3([0, 1, 0], orbitalNormal));
  const orbitalBitangent = cross3(orbitalNormal, orbitalTangent);
  // Uniform particle mass — total mass of the simulation = 1.0 regardless of
  // count. Simpler and more consistent than the old 3%/10%/87% big/medium/tracer
  // triad. Per-preset dynamics adjust via the G slider; .7 handles tuning.
  const PARTICLE_MASS = 1.0 / count;
  for (let i = 0; i < count; i++) {
    const off = i * 12;
    let x, y, z, vx = 0, vy = 0, vz = 0;
    let mass = PARTICLE_MASS;
    const tracerFrac = i / count;
    if (dist === 'spiral') {
      // Smooth exponential disk — spiral arms emerge from N-body dynamics, not seeded.
      // Based on barnes-hut approach: exponential radial profile with enclosed-mass
      // circular velocities. Pure gravity + tidal perturbation creates arms via
      // swing amplification of N-body noise in the differentially rotating disk.
      const LAMBDA = 5.0;           // exponential steepness (higher = more concentrated)
      const DISK_SCALE = 3.5;       // max radius
      const HALO_FRAC_S = 0.04;

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

        // Circular velocity from enclosed mass. Reference total = 1.0 (all
        // particles have PARTICLE_MASS = 1/count, so total mass = 1 regardless
        // of N). PM gravity applies uniformly — no source-cap normalization.
        const enclosedMass = massFrac * 1.0;
        const Geff = (state.physics.G ?? 0.3) * 0.001;
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
    totalStarMass += mass;
  }

  // ── PM (Particle-Mesh) gravity ──────────────────────────────────────────────
  // Solver pipeline: CIC deposit → mean-subtract → V-cycle → CIC interpolate.
  //
  // Nested-grid layout post-A4/A5/A6:
  //   Inner grid (this block): 128³ over ±16, cell 0.25 — subdomain. Uses
  //     Dirichlet BC seeded from the outer potential, NOT periodic wrap.
  //   Outer grid (allocated further below): 64³ over ±64, cell 2.0 — 3-torus.
  //     [LAW:one-source-of-truth] This outer grid is the one whose domain
  //     must match nbody.compute.wgsl's DOMAIN_HALF=64 periodic wrap so the
  //     integrator's positional domain and the PM periodic domain coincide.
  // The inner grid is intentionally a subdomain used via nested force
  // interpolation (pm.interpolate_nested.wgsl).
  //
  // Tuning (shader-physics-brr.7):
  //   PM_V_CYCLE_COUNT = 1
  //     The V=4 figure assumed a cold solve (residual entering = 100%). This
  //     simulation warm-starts: pmPotential[0] is preserved across frames
  //     (see V-cycle loop, where only levels 1+ are zeroed each cycle), so
  //     residual entering each frame is just the perturbation from one frame's
  //     density change — typically ~10% since particles move <1 cell/frame at
  //     dt≈0.016. One V-cycle then drops to ~1%, equivalent to the cold V=4
  //     target. Vision Pro at 90 Hz has an 11 ms budget; V=4 was consuming
  //     >50 ms by itself (~10 FPS in headset). Verify residual stays bounded
  //     with __pmMaxResidual() and reversibility with __pmReversibilityTest().
  //   PM_SMOOTH_PRE = PM_SMOOTH_POST = 2
  //     Red-black GS converges ~2× faster per pass than Jacobi; 2 sweeps each
  //     side of the V gives good damping of high-frequency error. 1 sweep is
  //     usable but residual rises.
  //   PM_FIXED_POINT_SCALE = 65536 (2¹⁶)
  //     PARTICLE_MASS = 1/count ≈ 1.25e-5 at N=80k → per-particle deposit =
  //     65536 × 1.25e-5 ≈ 0.82 integer units. Mean cell sum over all 2.1M
  //     cells ≈ 65536 (total mass × scale) — 5 orders below u32 overflow.
  //   DEFAULTS.physics.G = 0.3
  //     First-cut after removing the old √(MASSIVE_BODY_COUNT/1000) ≈ 2.86
  //     normalization. Sweep via the UI slider and __pmReversibilityTest to
  //     verify dynamics are stable at your preferred preset.
  //
  // Verification: __pmReversibilityTest(1000) → maxErr < 0.01 world units.
  // Values much larger indicate a sampling mismatch (pos vs posHalf) or a
  // non-reversible operation slipped in somewhere.
  const PM_GRID_RES = 128;                          // 128³ cells at level 0 (inner grid)
  // Inner grid covers the central ±16 region at cell size 0.25 — 4× sharper
  // than the ±64 uniform grid it replaces, enough to resolve the ~3–5 world-
  // unit initial cloud in 24–40 cells. The outer grid (allocated below at
  // ±64, cell 2.0) handles long-range gravity for particles outside the
  // inner domain. pm.interpolate_nested smoothstep-blends force across the
  // ±14..±16 transition shell so there is no seam.
  const PM_DOMAIN_HALF = 16.0;
  const PM_DOMAIN_SIZE = PM_DOMAIN_HALF * 2;        // = 32.0
  const PM_CELL_SIZE = PM_DOMAIN_SIZE / PM_GRID_RES; // = 0.25 world units per cell
  const PM_FIXED_POINT_SCALE = 65536;               // 2^16 — u32 atomic mass accumulation
  const PM_MULTIGRID_LEVELS = 6;                    // 128³, 64³, 32³, 16³, 8³, 4³
  const PM_V_CYCLE_COUNT = 1;                       // V-cycles per Poisson solve (warm-started; see header)
  // Reduced from 2→1 per sweep when we collapsed the phase-split V-cycle
  // (see compute() below). Each frame now runs ONE complete V-cycle instead
  // of half across two frames. With warm-start from the previous frame's
  // phi (density evolves slowly, so prior solution is a good initial guess),
  // 1 pre + 1 post smooth per level delivers ~1 order of magnitude residual
  // reduction per cycle — enough to hold maxResidual < 1% of peak density.
  // Net per-frame smoother work is actually LESS than the old split (1+1
  // vs 2+2 sweeps), so the full cycle fits well under the 11 ms budget.
  const PM_SMOOTH_PRE = 1;                          // red-black GS passes before restriction
  const PM_SMOOTH_POST = 1;                         // red-black GS passes after prolongation
  // V-cycle scheduling: ONE complete V-cycle (descent + coarsest + ascent)
  // runs each frame, producing a fully-solved pmPotential[0] every frame.
  // No phase split, no partial state visible to the integrator. The prior
  // scheme split the cycle across two frames; on "descent" frames the
  // integrator read a half-solved phi (pre-smooth only, no coarse correction),
  // making gravity alternate between short-range-only and full-range every
  // frame — visible as 2-state frame-by-frame oscillation under debug
  // stepping, and as subtle but real jitter at 60 Hz. The rewrite puts
  // density snapshot + full solve + consumer read on the same frame, so
  // every frame sees a consistent gravitational field.
  // Silence noUnusedLocals until downstream tickets (.3 deposition, .4
  // multigrid, .5 force sampling) reference these. Landing the canonical
  // values now establishes the contract; later tickets only tune usage.
  void PM_CELL_SIZE; void PM_FIXED_POINT_SCALE;
  void PM_V_CYCLE_COUNT; void PM_SMOOTH_PRE; void PM_SMOOTH_POST;

  const bufferA = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, mappedAtCreation: true });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();
  const bufferB = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });

  // [LAW:one-source-of-truth] Params struct size must match nbody.compute.wgsl:
  // 96 bytes of header + 32 × 16-byte Attractor = 608 bytes total.
  const paramsBuffer = device.createBuffer({ size: 608, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  // [LAW:one-source-of-truth] Motion-blur parameter owned by the sim. Written by setBlurTime() per frame
  // (non-zero only during skip). The shader's capsule geometry collapses to a point when blurTime=0.
  const blurBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const blurScratch = new Float32Array(4);
  device.queue.writeBuffer(blurBuffer, 0, blurScratch); // init to 0 so the first pre-skip frames render circles

  // PM grid buffers. All live at multigrid-level granularity — level 0 is the
  // full 128³; each successive level halves the resolution. Total ~36 MB for
  // the whole pyramid (density + potential + residual + per-particle force +
  // mean scratch). [LAW:single-enforcer] All PM allocations go here; destroy()
  // below is the sole cleanup site.
  const PM_BUF_USAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  const pmLevel0Cells = PM_GRID_RES * PM_GRID_RES * PM_GRID_RES;
  const pmDensityU32 = device.createBuffer({ size: pmLevel0Cells * 4, usage: PM_BUF_USAGE });
  const pmDensityF32 = device.createBuffer({ size: pmLevel0Cells * 4, usage: PM_BUF_USAGE });
  const pmPotential: GPUBuffer[] = [];
  const pmResidual: GPUBuffer[] = [];
  for (let l = 0; l < PM_MULTIGRID_LEVELS; l++) {
    const sizeL = PM_GRID_RES >> l;
    const bytesL = sizeL * sizeL * sizeL * 4;
    pmPotential.push(device.createBuffer({ size: bytesL, usage: PM_BUF_USAGE }));
    pmResidual.push(device.createBuffer({ size: bytesL, usage: PM_BUF_USAGE }));
  }
  // Per-particle force buffer: vec4<f32> per particle (16-byte alignment; xyz used, w pad).
  const pmForce = device.createBuffer({ size: count * 16, usage: PM_BUF_USAGE });
  // Mean density scratch (single f32 + padding to 16 bytes).
  const pmMeanScratch = device.createBuffer({ size: 16, usage: PM_BUF_USAGE });

  // Coarse-level RHS buffers for the V-cycle (restricted residuals).
  // [LAW:one-source-of-truth] pmRho[l] is the sole RHS buffer at level l.
  // Level 0 aliases pmDensityF32 (never overwritten); levels 1..5 are fresh
  // allocations written by restrict and read by smoother/residual.
  const pmRho: GPUBuffer[] = [pmDensityF32];
  for (let l = 1; l < PM_MULTIGRID_LEVELS; l++) {
    const sizeL = PM_GRID_RES >> l;
    pmRho.push(device.createBuffer({ size: sizeL * sizeL * sizeL * 4, usage: PM_BUF_USAGE }));
  }

  // PM uniform params — 32 bytes, shared by deposit + reduce + convert pipelines.
  // [LAW:one-source-of-truth] Single host-side uniform; both shader structs
  // (pm.deposit.wgsl and pm.density_convert.wgsl) declare the identical layout.
  const pmParamsBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const pmParamsData = new ArrayBuffer(32);
  const pmParamsF32 = new Float32Array(pmParamsData);
  const pmParamsU32 = new Uint32Array(pmParamsData);
  // Pack fields that don't change frame-to-frame once; dt is rewritten each frame.
  pmParamsU32[1] = count;                  // particle count
  pmParamsU32[2] = PM_GRID_RES;            // gridRes
  pmParamsF32[3] = PM_DOMAIN_HALF;         // domainHalf
  pmParamsF32[4] = PM_CELL_SIZE;           // cellSize
  pmParamsF32[5] = PM_FIXED_POINT_SCALE;   // fixedPointScale
  pmParamsU32[6] = pmLevel0Cells;          // cellCount = gridRes³
  pmParamsU32[7] = 1;                       // filterOutOfDomain = 1 (inner is a ±16 subdomain)

  // PM deposit pipeline: 1 read-only particle buffer + 1 atomic-u32 density + params.
  const pmDepositModule = createShaderModuleChecked('pm.deposit', SHADER_PM_DEPOSIT);
  const pmDepositBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const pmDepositPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [pmDepositBGL] }),
    compute: { module: pmDepositModule, entryPoint: 'main' }
  });

  // PM density convert pipelines (share one BGL + module; two entry points).
  const pmConvertModule = createShaderModuleChecked('pm.density_convert', SHADER_PM_DENSITY_CONVERT);
  const pmConvertBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const pmConvertLayout = device.createPipelineLayout({ bindGroupLayouts: [pmConvertBGL] });
  const pmReducePipeline = device.createComputePipeline({
    layout: pmConvertLayout,
    compute: { module: pmConvertModule, entryPoint: 'reduce' }
  });
  const pmConvertPipeline = device.createComputePipeline({
    layout: pmConvertLayout,
    compute: { module: pmConvertModule, entryPoint: 'convert' }
  });
  const pmConvertBG = device.createBindGroup({
    layout: pmConvertBGL, entries: [
      { binding: 0, resource: { buffer: pmDensityU32 } },
      { binding: 1, resource: { buffer: pmDensityF32 } },
      { binding: 2, resource: { buffer: pmMeanScratch } },
      { binding: 3, resource: { buffer: pmParamsBuffer } },
    ]
  });

  // Per-ping-pong deposit bind group: reads whichever body buffer is the
  // current frame's input. Index matches the main compute's pingPong value —
  // pmDepositBG[0] reads bufferA (pingPong=0 input), pmDepositBG[1] reads bufferB.
  const pmDepositBG = [
    device.createBindGroup({ layout: pmDepositBGL, entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: pmDensityU32 } },
      { binding: 2, resource: { buffer: pmParamsBuffer } },
    ]}),
    device.createBindGroup({ layout: pmDepositBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: pmDensityU32 } },
      { binding: 2, resource: { buffer: pmParamsBuffer } },
    ]}),
  ];

  // Dev-only staging for window.__pmDumpDensity / __pmDumpPotential. 128³ × 4
  // = 8 MB. Persistent allocation mirrors the existing diagStaging pattern.
  const pmDensityStaging = device.createBuffer({
    size: pmLevel0Cells * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  let pmDiagPending = false;

  // ── Multigrid V-cycle pipelines (smooth / residual / restrict / prolong) ──
  // [LAW:single-enforcer] All Poisson-solver pipelines declared here; the
  // V-cycle driver in compute() is the sole dispatcher.
  const pmSmoothModule   = createShaderModuleChecked('pm.smooth',   SHADER_PM_SMOOTH);
  const pmResidualModule = createShaderModuleChecked('pm.residual', SHADER_PM_RESIDUAL);
  const pmRestrictModule = createShaderModuleChecked('pm.restrict', SHADER_PM_RESTRICT);
  const pmProlongModule  = createShaderModuleChecked('pm.prolong',  SHADER_PM_PROLONG);

  const pmSmoothBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },          // phi (rw)
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },// rho
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const pmResidualBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },// phi
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },// rho
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },          // residual (rw)
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const pmRestrictBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },// fine
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },          // coarse (rw)
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const pmProlongBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },// coarse
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },          // fine (rw, accumulates)
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });

  // Assign to module-scope pipeline handles used by runPmVCycle().
  // [LAW:single-enforcer] These pipelines are created once per simulation
  // instance; the V-cycle helper at module scope references them.
  pmSmoothPipeline   = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [pmSmoothBGL] }),   compute: { module: pmSmoothModule,   entryPoint: 'main' } });
  pmResidualPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [pmResidualBGL] }), compute: { module: pmResidualModule, entryPoint: 'main' } });
  pmRestrictPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [pmRestrictBGL] }), compute: { module: pmRestrictModule, entryPoint: 'main' } });
  pmProlongPipeline  = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [pmProlongBGL] }),  compute: { module: pmProlongModule,  entryPoint: 'main' } });

  // PM nested force interpolation — reads BOTH grids' level-0 potential,
  // samples each at the particle position, and blends via smoothstep across
  // the transition shell. This is the sole force source for nbody.compute.
  // [LAW:one-source-of-truth] Single shader owns the inner/outer selection;
  // no fan-in at the integrator level.
  void SHADER_PM_INTERPOLATE;  // legacy import preserved (non-nested shader unused while nested is live)
  const pmInterpolateModule = createShaderModuleChecked('pm.interpolate_nested', SHADER_PM_INTERPOLATE_NESTED);
  const pmInterpolateBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }, // bodies
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }, // innerPhi
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }, // outerPhi
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },           // forceOut
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },           // innerParams
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },           // outerParams
      { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },           // blend shell
    ]
  });
  const pmInterpolatePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [pmInterpolateBGL] }),
    compute: { module: pmInterpolateModule, entryPoint: 'main' }
  });

  // Blend shell uniform: transitions pure-inner → pure-outer over [start, end].
  // start = PM_DOMAIN_HALF - 2, end = PM_DOMAIN_HALF so the full blend happens
  // in the last 2-unit-thick shell of the inner grid — the region where
  // periodic-wrap artifacts live until A5's Dirichlet BC lands.
  const pmBlendBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  {
    const ab = new ArrayBuffer(16);
    new Float32Array(ab, 0, 2).set([PM_DOMAIN_HALF - 2.0, PM_DOMAIN_HALF]);
    device.queue.writeBuffer(pmBlendBuffer, 0, ab);
  }

  // Per-ping-pong interpolate bind groups are created AFTER the outer-grid
  // allocation below (pmOuterPotential / pmOuterParamsBuffer not yet in scope).


  // Per-level uniform buffers, pre-populated at factory init. Each holds a
  // tiny struct (16 bytes) specific to its shader:
  //   smoothUniform[l][parity]  → { gridRes, parity, hSquared, fourPiG }
  //   residualUniform[l]        → { gridRes, _pad, hSquared, fourPiG }
  //   restrictUniform[l]        → { coarseGridRes, _pad×3 }   (for transition l → l+1)
  //   prolongUniform[l]         → { fineGridRes, dirichletBoundary, _pad×2 }  (for l+1 → l)
  //
  // [LAW:one-source-of-truth] The inner grid runs Dirichlet BC (flag = 1) at
  // every level — BC values at level 0 come from pm.boundary_sample; coarser
  // levels hold zero on faces because they store corrections (cleared at
  // V-cycle start). The outer grid keeps periodic (flag = 0), unchanged.
  const PM_INNER_DIRICHLET = 1;
  const PM_FOUR_PI_G = 4 * Math.PI * (state.physics.G ?? 0.3) * 0.001;
  const pmSmoothUniform: GPUBuffer[][] = [];
  const pmResidualUniform: GPUBuffer[] = [];
  const pmRestrictUniform: GPUBuffer[] = [];   // index l → transition l → l+1
  const pmProlongUniform: GPUBuffer[] = [];    // index l → transition l+1 → l
  for (let l = 0; l < PM_MULTIGRID_LEVELS; l++) {
    const sizeL = PM_GRID_RES >> l;
    const hL = PM_DOMAIN_SIZE / sizeL;
    const hSqL = hL * hL;
    pmSmoothUniform.push([0, 1].map(parity => {
      const buf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const ab = new ArrayBuffer(32);
      new Uint32Array(ab, 0, 2).set([sizeL, parity]);
      new Float32Array(ab, 8, 2).set([hSqL, PM_FOUR_PI_G]);
      new Uint32Array(ab, 16, 1).set([PM_INNER_DIRICHLET]);
      device.queue.writeBuffer(buf, 0, ab);
      return buf;
    }));
    {
      const buf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const ab = new ArrayBuffer(32);
      new Uint32Array(ab, 0, 2).set([sizeL, 0]);
      new Float32Array(ab, 8, 2).set([hSqL, PM_FOUR_PI_G]);
      new Uint32Array(ab, 16, 1).set([PM_INNER_DIRICHLET]);
      device.queue.writeBuffer(buf, 0, ab);
      pmResidualUniform.push(buf);
    }
    if (l + 1 < PM_MULTIGRID_LEVELS) {
      const coarseSize = PM_GRID_RES >> (l + 1);
      {
        const buf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const ab = new ArrayBuffer(16);
        new Uint32Array(ab, 0, 1).set([coarseSize]);
        device.queue.writeBuffer(buf, 0, ab);
        pmRestrictUniform.push(buf);
      }
      {
        const buf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const ab = new ArrayBuffer(16);
        new Uint32Array(ab, 0, 2).set([sizeL, PM_INNER_DIRICHLET]);  // fineGridRes, dirichletBoundary
        device.queue.writeBuffer(buf, 0, ab);
        pmProlongUniform.push(buf);
      }
    }
  }

  // Per-level bind groups.
  const pmSmoothBG: GPUBindGroup[][] = [];
  const pmResidualBG: GPUBindGroup[] = [];
  const pmRestrictBG: GPUBindGroup[] = [];   // transition l → l+1
  const pmProlongBG: GPUBindGroup[] = [];    // transition l+1 → l
  for (let l = 0; l < PM_MULTIGRID_LEVELS; l++) {
    pmSmoothBG.push([0, 1].map(parity => device.createBindGroup({
      layout: pmSmoothBGL, entries: [
        { binding: 0, resource: { buffer: pmPotential[l] } },
        { binding: 1, resource: { buffer: pmRho[l] } },
        { binding: 2, resource: { buffer: pmSmoothUniform[l][parity] } },
      ]
    })));
    pmResidualBG.push(device.createBindGroup({
      layout: pmResidualBGL, entries: [
        { binding: 0, resource: { buffer: pmPotential[l] } },
        { binding: 1, resource: { buffer: pmRho[l] } },
        { binding: 2, resource: { buffer: pmResidual[l] } },
        { binding: 3, resource: { buffer: pmResidualUniform[l] } },
      ]
    }));
    if (l + 1 < PM_MULTIGRID_LEVELS) {
      pmRestrictBG.push(device.createBindGroup({
        layout: pmRestrictBGL, entries: [
          { binding: 0, resource: { buffer: pmResidual[l] } },
          { binding: 1, resource: { buffer: pmRho[l + 1] } },
          { binding: 2, resource: { buffer: pmRestrictUniform[l] } },
        ]
      }));
      pmProlongBG.push(device.createBindGroup({
        layout: pmProlongBGL, entries: [
          { binding: 0, resource: { buffer: pmPotential[l + 1] } },
          { binding: 1, resource: { buffer: pmPotential[l] } },
          { binding: 2, resource: { buffer: pmProlongUniform[l] } },
        ]
      }));
    }
  }

  // Workgroup counts per level (each shader uses @workgroup_size(4,4,4)).
  const pmWgCount: number[] = [];
  for (let l = 0; l < PM_MULTIGRID_LEVELS; l++) {
    pmWgCount.push(Math.max(1, (PM_GRID_RES >> l) / 4));
  }

  // ── OUTER PM GRID (nested zoom-in scheme — fully live) ───────────────────
  // Second grid at 1/2 linear resolution covering the full periodic domain.
  // Together with the inner grid (above), delivers sharp central gravity +
  // cheap long-range coupling. Pipelines are reused from the inner grid —
  // only buffers, uniforms, and bind groups are outer-specific.
  //
  // Live per-frame role:
  //   1. Receives CIC deposit from every particle in the scene (filterOutOfDomain=0).
  //   2. Runs its own full V-cycle → fully-solved pmOuterPotential[0].
  //   3. pm.boundary_sample reads outerPhi and writes values into the inner
  //      grid's level-0 face cells (the inner grid's Dirichlet BC).
  //   4. pm.interpolate_nested reads outerPhi and smoothstep-blends it into
  //      the per-particle PM force outside the inner ±14 shell.
  // See CLAUDE.md "PM Solver (nested grids, full V-cycle per frame)" for
  // the top-level architecture summary.
  const PM_OUTER_GRID_RES = 64;
  const PM_OUTER_DOMAIN_HALF = 64.0;
  const PM_OUTER_DOMAIN_SIZE = PM_OUTER_DOMAIN_HALF * 2;  // 128
  const PM_OUTER_CELL_SIZE = PM_OUTER_DOMAIN_SIZE / PM_OUTER_GRID_RES;  // 2.0
  const PM_OUTER_LEVELS = 5;  // 64³, 32³, 16³, 8³, 4³

  const pmOuterLevel0Cells = PM_OUTER_GRID_RES * PM_OUTER_GRID_RES * PM_OUTER_GRID_RES;
  const pmOuterDensityU32 = device.createBuffer({ size: pmOuterLevel0Cells * 4, usage: PM_BUF_USAGE });
  const pmOuterDensityF32 = device.createBuffer({ size: pmOuterLevel0Cells * 4, usage: PM_BUF_USAGE });
  const pmOuterPotential: GPUBuffer[] = [];
  const pmOuterResidual: GPUBuffer[] = [];
  for (let l = 0; l < PM_OUTER_LEVELS; l++) {
    const sizeL = PM_OUTER_GRID_RES >> l;
    const bytesL = sizeL * sizeL * sizeL * 4;
    pmOuterPotential.push(device.createBuffer({ size: bytesL, usage: PM_BUF_USAGE }));
    pmOuterResidual.push(device.createBuffer({ size: bytesL, usage: PM_BUF_USAGE }));
  }
  const pmOuterRho: GPUBuffer[] = [pmOuterDensityF32];
  for (let l = 1; l < PM_OUTER_LEVELS; l++) {
    const sizeL = PM_OUTER_GRID_RES >> l;
    pmOuterRho.push(device.createBuffer({ size: sizeL * sizeL * sizeL * 4, usage: PM_BUF_USAGE }));
  }
  const pmOuterMeanScratch = device.createBuffer({ size: 16, usage: PM_BUF_USAGE });

  // Outer deposit/convert/interpolate params (same 32-byte struct as inner).
  const pmOuterParamsBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const pmOuterParamsData = new ArrayBuffer(32);
  const pmOuterParamsF32 = new Float32Array(pmOuterParamsData);
  const pmOuterParamsU32 = new Uint32Array(pmOuterParamsData);
  pmOuterParamsU32[1] = count;
  pmOuterParamsU32[2] = PM_OUTER_GRID_RES;
  pmOuterParamsF32[3] = PM_OUTER_DOMAIN_HALF;
  pmOuterParamsF32[4] = PM_OUTER_CELL_SIZE;
  pmOuterParamsF32[5] = PM_FIXED_POINT_SCALE;
  pmOuterParamsU32[6] = pmOuterLevel0Cells;
  pmOuterParamsU32[7] = 0;  // filterOutOfDomain = 0 (outer is the full 3-torus; wrapIdx handles near-boundary posHalf)


  // Per-level uniform buffers for the outer multigrid (matches inner pattern).
  const pmOuterSmoothUniform: GPUBuffer[][] = [];
  const pmOuterResidualUniform: GPUBuffer[] = [];
  const pmOuterRestrictUniform: GPUBuffer[] = [];
  const pmOuterProlongUniform: GPUBuffer[] = [];
  // Outer grid keeps periodic BC (flag = 0). Shares shader modules/pipelines
  // with the inner grid, but its uniforms pin dirichletBoundary to 0 so the
  // smoother/residual/prolong behave exactly as before this BC wiring landed.
  const PM_OUTER_DIRICHLET = 0;
  for (let l = 0; l < PM_OUTER_LEVELS; l++) {
    const sizeL = PM_OUTER_GRID_RES >> l;
    const hL = PM_OUTER_DOMAIN_SIZE / sizeL;
    const hSqL = hL * hL;
    pmOuterSmoothUniform.push([0, 1].map(parity => {
      const buf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const ab = new ArrayBuffer(32);
      new Uint32Array(ab, 0, 2).set([sizeL, parity]);
      new Float32Array(ab, 8, 2).set([hSqL, PM_FOUR_PI_G]);
      new Uint32Array(ab, 16, 1).set([PM_OUTER_DIRICHLET]);
      device.queue.writeBuffer(buf, 0, ab);
      return buf;
    }));
    {
      const buf = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const ab = new ArrayBuffer(32);
      new Uint32Array(ab, 0, 2).set([sizeL, 0]);
      new Float32Array(ab, 8, 2).set([hSqL, PM_FOUR_PI_G]);
      new Uint32Array(ab, 16, 1).set([PM_OUTER_DIRICHLET]);
      device.queue.writeBuffer(buf, 0, ab);
      pmOuterResidualUniform.push(buf);
    }
    if (l + 1 < PM_OUTER_LEVELS) {
      const coarseSize = PM_OUTER_GRID_RES >> (l + 1);
      {
        const buf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const ab = new ArrayBuffer(16);
        new Uint32Array(ab, 0, 1).set([coarseSize]);
        device.queue.writeBuffer(buf, 0, ab);
        pmOuterRestrictUniform.push(buf);
      }
      {
        const buf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const ab = new ArrayBuffer(16);
        new Uint32Array(ab, 0, 2).set([sizeL, PM_OUTER_DIRICHLET]);
        device.queue.writeBuffer(buf, 0, ab);
        pmOuterProlongUniform.push(buf);
      }
    }
  }

  // Outer-grid bind groups (reuse existing BGLs from the inner pipelines).
  const pmOuterDepositBG = [bufferA, bufferB].map(buf => device.createBindGroup({
    layout: pmDepositBGL, entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: pmOuterDensityU32 } },
      { binding: 2, resource: { buffer: pmOuterParamsBuffer } },
    ]
  }));
  const pmOuterConvertBG = device.createBindGroup({
    layout: pmConvertBGL, entries: [
      { binding: 0, resource: { buffer: pmOuterDensityU32 } },
      { binding: 1, resource: { buffer: pmOuterDensityF32 } },
      { binding: 2, resource: { buffer: pmOuterMeanScratch } },
      { binding: 3, resource: { buffer: pmOuterParamsBuffer } },
    ]
  });
  const pmOuterSmoothBG: GPUBindGroup[][] = [];
  const pmOuterResidualBG: GPUBindGroup[] = [];
  const pmOuterRestrictBG: GPUBindGroup[] = [];
  const pmOuterProlongBG: GPUBindGroup[] = [];
  for (let l = 0; l < PM_OUTER_LEVELS; l++) {
    pmOuterSmoothBG.push([0, 1].map(parity => device.createBindGroup({
      layout: pmSmoothBGL, entries: [
        { binding: 0, resource: { buffer: pmOuterPotential[l] } },
        { binding: 1, resource: { buffer: pmOuterRho[l] } },
        { binding: 2, resource: { buffer: pmOuterSmoothUniform[l][parity] } },
      ]
    })));
    pmOuterResidualBG.push(device.createBindGroup({
      layout: pmResidualBGL, entries: [
        { binding: 0, resource: { buffer: pmOuterPotential[l] } },
        { binding: 1, resource: { buffer: pmOuterRho[l] } },
        { binding: 2, resource: { buffer: pmOuterResidual[l] } },
        { binding: 3, resource: { buffer: pmOuterResidualUniform[l] } },
      ]
    }));
    if (l + 1 < PM_OUTER_LEVELS) {
      pmOuterRestrictBG.push(device.createBindGroup({
        layout: pmRestrictBGL, entries: [
          { binding: 0, resource: { buffer: pmOuterResidual[l] } },
          { binding: 1, resource: { buffer: pmOuterRho[l + 1] } },
          { binding: 2, resource: { buffer: pmOuterRestrictUniform[l] } },
        ]
      }));
      pmOuterProlongBG.push(device.createBindGroup({
        layout: pmProlongBGL, entries: [
          { binding: 0, resource: { buffer: pmOuterPotential[l + 1] } },
          { binding: 1, resource: { buffer: pmOuterPotential[l] } },
          { binding: 2, resource: { buffer: pmOuterProlongUniform[l] } },
        ]
      }));
    }
  }

  const pmOuterWgCount: number[] = [];
  for (let l = 0; l < PM_OUTER_LEVELS; l++) {
    pmOuterWgCount.push(Math.max(1, (PM_OUTER_GRID_RES >> l) / 4));
  }

  // Dev-only staging for __pmDumpOuter diagnostics (matches inner pattern).
  const pmOuterDensityStaging = device.createBuffer({
    size: pmOuterLevel0Cells * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  let pmOuterDiagPending = false;

  // ── Boundary-sample pass: outer φ → inner φ face cells ────────────────────
  // [LAW:single-enforcer] Sole bridge between the two grids during the inner
  // solve. Runs AFTER the outer V-cycle (so outerPhi[0] is fully solved) and
  // BEFORE the inner V-cycle (so the smoother sees valid BC on face cells).
  // [LAW:one-source-of-truth] The uniform is written once at init — inner
  // and outer grid geometry are immutable after createPhysicsSimulation ends.
  const pmBoundarySampleModule = createShaderModuleChecked('pm.boundary_sample', SHADER_PM_BOUNDARY_SAMPLE);
  const pmBoundarySampleBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }, // outerPhi
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },           // innerPhi (rw)
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const pmBoundarySamplePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [pmBoundarySampleBGL] }),
    compute: { module: pmBoundarySampleModule, entryPoint: 'main' }
  });
  const pmBoundarySampleParams = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  {
    const ab = new ArrayBuffer(32);
    const bsU32 = new Uint32Array(ab);
    const bsF32 = new Float32Array(ab);
    bsU32[0] = PM_GRID_RES;
    bsF32[2] = PM_DOMAIN_HALF;
    bsF32[3] = PM_CELL_SIZE;
    bsU32[4] = PM_OUTER_GRID_RES;
    bsF32[6] = PM_OUTER_DOMAIN_HALF;
    bsF32[7] = PM_OUTER_CELL_SIZE;
    device.queue.writeBuffer(pmBoundarySampleParams, 0, ab);
  }
  const pmBoundarySampleBG = device.createBindGroup({
    layout: pmBoundarySampleBGL,
    entries: [
      { binding: 0, resource: { buffer: pmOuterPotential[0] } },
      { binding: 1, resource: { buffer: pmPotential[0] } },
      { binding: 2, resource: { buffer: pmBoundarySampleParams } },
    ]
  });
  const pmBoundarySampleWg = pmWgCount[0];  // same as finest inner level

  // Deferred interpolate bind groups — all dependencies now in scope.
  // Per-ping-pong: binds whichever body buffer is the current frame's input,
  // both grids' level-0 potentials, both param buffers, and the blend shell.
  const pmInterpolateBG = [
    device.createBindGroup({ layout: pmInterpolateBGL, entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: pmPotential[0] } },
      { binding: 2, resource: { buffer: pmOuterPotential[0] } },
      { binding: 3, resource: { buffer: pmForce } },
      { binding: 4, resource: { buffer: pmParamsBuffer } },
      { binding: 5, resource: { buffer: pmOuterParamsBuffer } },
      { binding: 6, resource: { buffer: pmBlendBuffer } },
    ]}),
    device.createBindGroup({ layout: pmInterpolateBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: pmPotential[0] } },
      { binding: 2, resource: { buffer: pmOuterPotential[0] } },
      { binding: 3, resource: { buffer: pmForce } },
      { binding: 4, resource: { buffer: pmParamsBuffer } },
      { binding: 5, resource: { buffer: pmOuterParamsBuffer } },
      { binding: 6, resource: { buffer: pmBlendBuffer } },
    ]}),
  ];

  // [LAW:locality-or-seam] Gas reservoir owns its buffers/shaders in
  // gasReservoir.ts; main.ts only dispatches it at the existing PM seams.
  const gas = createGasReservoir({
    device,
    createShaderModuleChecked,
    renderTargetFormat,
    renderSampleCount,
    cameraBuffer,
    cameraStride: CAMERA_STRIDE,
    cameraSize: CAMERA_SIZE,
    starCount: count,
    starBuffers: [bufferA, bufferB],
    totalStarMass,
    gasMassFraction,
    pmBufUsage: PM_BUF_USAGE,
    fixedPointScale: PM_FIXED_POINT_SCALE,
    pmDepositBGL,
    pmDepositPipeline,
    pmInterpolateBGL,
    pmInterpolatePipeline,
    innerDensityU32: pmDensityU32,
    innerPotential: pmPotential[0],
    innerParams: { gridRes: PM_GRID_RES, domainHalf: PM_DOMAIN_HALF, cellSize: PM_CELL_SIZE, cellCount: pmLevel0Cells, filterOutOfDomain: 1 },
    outerDensityU32: pmOuterDensityU32,
    outerPotential: pmOuterPotential[0],
    outerParams: { gridRes: PM_OUTER_GRID_RES, domainHalf: PM_OUTER_DOMAIN_HALF, cellSize: PM_OUTER_CELL_SIZE, cellCount: pmOuterLevel0Cells, filterOutOfDomain: 0 },
    pmBlendBuffer,
  });

  const computeModule = createShaderModuleChecked('nbody.compute', SHADER_NBODY_COMPUTE_EDIT || SHADER_NBODY_COMPUTE);
  const renderModule = createShaderModuleChecked('nbody.render', SHADER_NBODY_RENDER_EDIT || SHADER_NBODY_RENDER);

  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }, // pmForce
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
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
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
      { binding: 3, resource: { buffer: pmForce } },
    ]}),
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: bufferA } },
      { binding: 2, resource: { buffer: paramsBuffer } },
      { binding: 3, resource: { buffer: pmForce } },
    ]}),
  ];

  // [LAW:one-source-of-truth] Render-side attractor field for particle HDR boost + marker rendering.
  // 16-byte header (count u32 + pad) + 32 × 16-byte FieldAttractor = 528 bytes. Packed each render
  // with log-normalized strength so the shader just does a linear gaussian sum.
  const attractorFieldBuffer = device.createBuffer({ size: 528, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const attractorFieldData = new ArrayBuffer(528);
  const attractorFieldF32 = new Float32Array(attractorFieldData);
  const attractorFieldU32 = new Uint32Array(attractorFieldData);

  // renderBGs[viewIndex][pingPong]
  const renderBGs: GPUBindGroup[][] = [0, 1].map(vi =>
    [bufferA, bufferB].map(buf => device.createBindGroup({ layout: renderBGL, entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
      { binding: 2, resource: { buffer: blurBuffer } },
      { binding: 3, resource: { buffer: attractorFieldBuffer } },
    ]}))
  );

  // ── MARKER PARTICLES: rendered into the HDR scene so bloom carries them ──
  // [LAW:one-source-of-truth] Per-marker payload is 32 bytes: pos(12) + strength(4) + tint(12) + seed(4).
  // Pool is sized to the hard cap (32 attractors × 36 markers) and re-uploaded each frame from state.markers.
  const MARKER_POOL = ATTRACTOR_MAX * MARKERS_PER_ATTRACTOR;
  const MARKER_STRIDE = 32;
  const markerBuffer = device.createBuffer({ size: MARKER_POOL * MARKER_STRIDE, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const markerData = new Float32Array(MARKER_POOL * 8);

  const markerModule = createShaderModuleChecked('markers.render', SHADER_MARKERS_RENDER);
  const markerBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ]
  });
  const markerPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [markerBGL] }),
    vertex: { module: markerModule, entryPoint: 'vs_main' },
    fragment: {
      module: markerModule, entryPoint: 'fs_main',
      targets: [{
        format: renderTargetFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        }
      }]
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    multisample: { count: renderSampleCount },
  });
  const markerBGs: GPUBindGroup[] = [0, 1].map(vi => device.createBindGroup({
    layout: markerBGL, entries: [
      { binding: 0, resource: { buffer: markerBuffer } },
      { binding: 1, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
    ]
  }));

  function renderMarkers(pass: GPURenderPassEncoder, viewIndex: number) {
    const markers = state.markers;
    const n = Math.min(markers.length, MARKER_POOL);
    if (n === 0) return;
    // [LAW:one-source-of-truth] Parent strength drives marker brightness/size. Log-normalize against the
    // current interaction ceiling so the visual curve matches the log slider.
    const p = state.physics as { interactionStrength?: number };
    const ceiling = p.interactionStrength ?? 1;
    const step = simStep;
    const invLogMax = 1 / Math.log(1 + Math.max(ceiling, 1));
    for (let i = 0; i < n; i++) {
      const m = markers[i];
      const a = state.attractors[m.attractorIdx];
      const s = a ? attractorStrength(a, step, ceiling) : 0;
      const strengthNorm = Math.max(0, Math.min(1, Math.log(1 + s) * invLogMax));
      const o = i * 8;
      markerData[o] = m.x;
      markerData[o + 1] = m.y;
      markerData[o + 2] = m.z;
      markerData[o + 3] = strengthNorm;
      markerData[o + 4] = m.tintR;
      markerData[o + 5] = m.tintG;
      markerData[o + 6] = m.tintB;
      markerData[o + 7] = m.seed;
    }
    device.queue.writeBuffer(markerBuffer, 0, markerData.buffer, 0, n * MARKER_STRIDE);
    pass.setPipeline(markerPipeline);
    pass.setBindGroup(0, markerBGs[viewIndex]);
    pass.draw(6, n);
  }

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
    // [LAW:single-enforcer] blurTime is written here, nowhere else, so the per-frame blurBuffer state
    // is always synchronized with whatever runDebugCompute computed for this frame.
    setBlurTime(blurTime: number) {
      blurScratch[0] = blurTime;
      blurScratch[1] = 0; blurScratch[2] = 0; blurScratch[3] = 0;
      device.queue.writeBuffer(blurBuffer, 0, blurScratch);
    },
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
      const baseDt = PHYSICS_BASE_DT * state.fx.timeScale;
      const dt = baseDt * timeDirection;
      // PM gravity is uniform across all particles — no sqrt(sourceCount)
      // normalization. Total mass is now 1.0 (PARTICLE_MASS = 1/count) so
      // the effective gravity strength is set purely by G.
      f32[0] = dt;
      f32[1] = p.G * 0.001;
      f32[2] = p.softening;
      f32[3] = p.haloMass ?? 5.0;
      u32[4] = count;
      u32[5] = 0;  // was sourceCount; tile-pair gravity removed in ticket .6
      f32[6] = p.haloScale ?? 2.0;
      // [LAW:one-source-of-truth] Simulation clock: simStep × baseDt gives deterministic tidal angle.
      f32[7] = simStep * baseDt;
      // diskNormal: fixed orientation for the Miyamoto-Nagai potential.
      f32[12] = diskNormal[0]; f32[13] = diskNormal[1]; f32[14] = diskNormal[2];
      f32[16] = p.diskMass ?? 3.0;
      f32[17] = p.diskScaleA ?? 1.5;
      f32[18] = p.diskScaleB ?? 0.3;
      f32[19] = 0;  // was pmBlend; tile-pair gravity removed in ticket .6
      f32[20] = 0; f32[21] = 0; f32[22] = 0;
      f32[23] = p.tidalStrength ?? 0.005;

      // ── ATTRACTOR DATA: forward computes + journals; reverse reads from journal ──
      if (timeDirection > 0) {
        // Forward: compute attractor strengths from live state, write to journal.
        // [LAW:one-source-of-truth] simStep drives the lifecycle — forces are a pure function of step,
        // so rewinding to step K and replaying forward produces identical forces unless the user branches
        // (moves/creates a wand). Branching naturally overwrites journal[K..] with the new force field,
        // and subsequent reverse reads those fresh entries. No wall-clock drift between write and read.
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
          f32[base + 3] = attractorStrength(a, simStep, ceiling);
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

      // ── PM density field (CIC deposition → mean reduction → subtract/convert) ──
      // Produces pmDensityF32 (mean-zero density) for the Poisson solver in .4.
      // No force yet — this shader's output is not read by any other stage in
      // this ticket. Once .5 lands, PM force adds alongside tile-pair gravity.
      // [LAW:dataflow-not-control-flow] Runs every frame; same code path whether
      // or not the density is consumed downstream.
      pmParamsF32[0] = dt;  // only field that varies per-frame
      device.queue.writeBuffer(pmParamsBuffer, 0, pmParamsData);
      pmOuterParamsF32[0] = dt;
      device.queue.writeBuffer(pmOuterParamsBuffer, 0, pmOuterParamsData);
      gas.prepareFrame(dt, p.gasSoundSpeed ?? 2.0);

      encoder.clearBuffer(pmDensityU32);
      encoder.clearBuffer(pmMeanScratch);
      encoder.clearBuffer(pmOuterDensityU32);
      encoder.clearBuffer(pmOuterMeanScratch);
      gas.clear(encoder);
      const pmTsw = tsWrites('pmDepositConvert');
      const pmPass = encoder.beginComputePass(pmTsw ? { timestampWrites: pmTsw } : undefined);
      // Inner grid: CIC deposit → mean reduce → mean-subtract convert.
      pmPass.setPipeline(pmDepositPipeline);
      pmPass.setBindGroup(0, pmDepositBG[pingPong]);
      pmPass.dispatchWorkgroups(Math.ceil(count / 256));
      gas.depositInnerPm(pmPass, pingPong);
      pmPass.setPipeline(pmReducePipeline);
      pmPass.setBindGroup(0, pmConvertBG);
      pmPass.dispatchWorkgroups(Math.ceil(pmLevel0Cells / 256));
      pmPass.setPipeline(pmConvertPipeline);
      pmPass.dispatchWorkgroups(Math.ceil(pmLevel0Cells / 256));
      // Outer grid: same pipeline instances, separate bind groups + params.
      // [LAW:one-source-of-truth] Every particle contributes mass to both grids
      // IF it is inside the grid's domain. Deposit's domain filter (in
      // pm.deposit.wgsl) makes the inner grid see only particles within ±16;
      // the outer grid (domainHalf = periodic-wrap radius) sees all of them.
      // The nested interpolate shader reads the same particles back against
      // whichever grid's force contribution its blend weight selects — so
      // mass-source and force-target are consistent per grid.
      pmPass.setPipeline(pmDepositPipeline);
      pmPass.setBindGroup(0, pmOuterDepositBG[pingPong]);
      pmPass.dispatchWorkgroups(Math.ceil(count / 256));
      gas.depositOuterPm(pmPass, pingPong);
      pmPass.setPipeline(pmReducePipeline);
      pmPass.setBindGroup(0, pmOuterConvertBG);
      pmPass.dispatchWorkgroups(Math.ceil(pmOuterLevel0Cells / 256));
      pmPass.setPipeline(pmConvertPipeline);
      pmPass.dispatchWorkgroups(Math.ceil(pmOuterLevel0Cells / 256));
      gas.depositGasAndBuildPressure(pmPass, pingPong);
      pmPass.end();

      // ── Multigrid V-cycle Poisson solver (full cycle per frame) ──────────
      // Input:  pmRho[0] = pmDensityF32 (mean-zero RHS at level 0)
      // Output: pmPotential[0] (φ satisfying ∇²φ = 4πGρ)
      //
      // [LAW:single-enforcer] runPmVCycle is the sole dispatcher of the
      // multigrid V-cycle; both grids use it. It owns the descent → coarsest
      // → ascent sequence and the level-0 warm-start convention.
      //
      // [LAW:one-source-of-truth] Each V-cycle completes within ONE frame.
      // pmPotential[0] is always a fully-solved state when the interpolate
      // reads it — no mid-solve snapshots bleed to consumers.
      //
      // Ordering matters: the outer grid solves first (periodic BC on the
      // full ±64 box), then pm.boundary_sample writes outer φ values into
      // the inner grid's level-0 face cells, then the inner V-cycle runs
      // with Dirichlet BC (smoother / residual / prolong freeze face cells).
      // This is the nested-PM scheme: inner resolution is driven by outer
      // long-range φ at its boundary, not by periodic wrap of ±16.
      //
      // Levels 1..maxLevel are cleared at the start of each cycle because
      // they accumulate corrections; level 0 keeps the previous frame's
      // solution as warm-start (density evolves slowly frame-to-frame,
      // so the prior phi is a near-converged initial guess).
      const PM_COARSEST_SWEEPS = 16;

      // Outer first — its fully-solved φ becomes the inner grid's Dirichlet BC.
      runPmVCycle(encoder, {
        levels: PM_OUTER_LEVELS,
        wgCount: pmOuterWgCount,
        potential: pmOuterPotential,
        smoothBG: pmOuterSmoothBG,
        residualBG: pmOuterResidualBG,
        restrictBG: pmOuterRestrictBG,
        prolongBG: pmOuterProlongBG,
        preSmooth: PM_SMOOTH_PRE,
        postSmooth: PM_SMOOTH_POST,
        coarsestSweeps: PM_COARSEST_SWEEPS,
        timingBucket: 'outerVCycle',
      });

      // Boundary-sample: write outer φ into inner φ's level-0 face cells.
      // Separate pass so WebGPU's implicit pass-boundary barriers serialize
      // the outer-write vs. outer-read dependency without any explicit sync.
      {
        const bsTsw = tsWrites('boundarySample');
        const bsPass = encoder.beginComputePass(bsTsw ? { timestampWrites: bsTsw } : undefined);
        bsPass.setPipeline(pmBoundarySamplePipeline);
        bsPass.setBindGroup(0, pmBoundarySampleBG);
        bsPass.dispatchWorkgroups(pmBoundarySampleWg, pmBoundarySampleWg, pmBoundarySampleWg);
        bsPass.end();
      }

      // Inner V-cycle — reads face cells as Dirichlet BC (flag = 1 in uniforms).
      runPmVCycle(encoder, {
        levels: PM_MULTIGRID_LEVELS,
        wgCount: pmWgCount,
        potential: pmPotential,
        smoothBG: pmSmoothBG,
        residualBG: pmResidualBG,
        restrictBG: pmRestrictBG,
        prolongBG: pmProlongBG,
        preSmooth: PM_SMOOTH_PRE,
        postSmooth: PM_SMOOTH_POST,
        coarsestSweeps: PM_COARSEST_SWEEPS,
        timingBucket: 'innerVCycle',
      });

      // ── PM force interpolation ─────────────────────────────────────────
      // Sample the freshly-solved pmPotential[0] at each particle via the CIC
      // transpose kernel; write vec4 force to pmForce. Dispatched AFTER the
      // V-cycle (reads phi) and BEFORE the main n-body compute (reads pmForce).
      const iTsw = tsWrites('starInterpolate');
      const iPass = encoder.beginComputePass(iTsw ? { timestampWrites: iTsw } : undefined);
      iPass.setPipeline(pmInterpolatePipeline);
      iPass.setBindGroup(0, pmInterpolateBG[pingPong]);
      iPass.dispatchWorkgroups(Math.ceil(count / 256));
      iPass.end();

      const gTsw = tsWrites('gasInterpolatePressure');
      const gPass = encoder.beginComputePass(gTsw ? { timestampWrites: gTsw } : undefined);
      gas.interpolateForces(gPass, pingPong);
      gPass.end();

      const cTsw = tsWrites('starGasIntegrate');
      const pass = encoder.beginComputePass(cTsw ? { timestampWrites: cTsw } : undefined);
      // [LAW:dataflow-not-control-flow] Gas and stars integrate every frame in
      // a fixed order; gasMassFraction=0 makes gas forces zero by value.
      gas.integrate(pass, pingPong);
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
        const Geff = (p.G ?? 0.3) * 0.001;
        const statsParamsData = new Float32Array(4);
        const statsParamsU32 = new Uint32Array(statsParamsData.buffer);
        statsParamsU32[0] = count;
        statsParamsU32[1] = count;  // was MASSIVE_BODY_COUNT; every particle is a source now
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

      // [LAW:one-source-of-truth] Pack render-side attractor field from the same lifecycle state the
      // compute pass reads. Strength is log-normalized to [0,1] so the shader's gaussian sum is stable
      // across the 0.1..100 interaction slider range.
      {
        const p = state.physics as { interactionStrength?: number };
        const ceiling = p.interactionStrength ?? 1;
        const step = simStep;
        const attractors = state.attractors;
        const n = Math.min(attractors.length, ATTRACTOR_MAX);
        const invLogMax = 1 / Math.log(1 + Math.max(ceiling, 1));
        attractorFieldU32[0] = n;
        attractorFieldU32[1] = 0; attractorFieldU32[2] = 0; attractorFieldU32[3] = 0;
        for (let i = 0; i < n; i++) {
          const a = attractors[i];
          const s = attractorStrength(a, step, ceiling);
          const base = 4 + i * 4;
          attractorFieldF32[base] = a.x;
          attractorFieldF32[base + 1] = a.y;
          attractorFieldF32[base + 2] = a.z;
          attractorFieldF32[base + 3] = Math.max(0, Math.min(1, Math.log(1 + s) * invLogMax));
        }
        for (let i = n; i < ATTRACTOR_MAX; i++) {
          const base = 4 + i * 4;
          attractorFieldF32[base] = 0;
          attractorFieldF32[base + 1] = 0;
          attractorFieldF32[base + 2] = 0;
          attractorFieldF32[base + 3] = 0;
        }
        device.queue.writeBuffer(attractorFieldBuffer, 0, attractorFieldData);
      }

      const rTsw = tsWrites('starsRender');
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

      renderMarkers(pass, viewIndex);
      pass.end();

      const gasVisible = state.physics.gasVisible;
      const gasColorView = gasVisible ? getCurrentSceneView() : postFx.nullColorView!;
      const gasDepthView = gasVisible ? (xrDepthOverride ?? postFx.depth!.createView()) : postFx.nullDepthView!;
      const gasViewport = gasVisible ? renderViewport : null;
      const gTsw = tsWrites('gasRender');
      const gasPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: gasColorView,
          clearValue: DEFAULT_CLEAR_COLOR,
          loadOp: 'load',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: gasDepthView,
          depthClearValue: 1.0,
          depthLoadOp: 'load',
          depthStoreOp: 'store',
        },
        ...(gTsw ? { timestampWrites: gTsw } : {}),
      });
      if (gasViewport) {
        gasPass.setViewport(gasViewport[0], gasViewport[1], gasViewport[2], gasViewport[3], 0, 1);
      }
      gas.render(gasPass, viewIndex, gasVisible);
      gasPass.end();
    },

    getCount() { return count; },

    getStats() { return lastStats; },

    async diagnose(): Promise<Record<string, number | number[]>> {
      if (diagPending) return { error: 1 };
      diagPending = true;
      // Copy several large chunks from evenly-spaced regions across the population.
      // No source/tracer distinction — every particle is a sample candidate.
      const sampleCount = Math.min(count, DIAG_SAMPLE);
      const NUM_CHUNKS = 8;
      const chunkBodies = Math.floor(sampleCount / NUM_CHUNKS);
      const regionSize = Math.floor(count / NUM_CHUNKS);
      const srcBuf = pingPong === 0 ? bufferA : bufferB;
      const encoder = device.createCommandEncoder();
      for (let c = 0; c < NUM_CHUNKS; c++) {
        const srcIdx = c * regionSize;
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

    // Dev diagnostic: copy pmDensityF32 → staging → host, return as Float32Array.
    // Mirrors the diagnose() pattern: gated by a pending flag so overlapping
    // calls return null rather than tangle the staging buffer. 128³ ≈ 2.1M
    // floats returned per call.
    async dumpDensity(): Promise<Float32Array | null> {
      if (pmDiagPending) return null;
      pmDiagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(pmDensityF32, 0, pmDensityStaging, 0, pmLevel0Cells * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await pmDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(pmDensityStaging.getMappedRange().slice(0));
      pmDensityStaging.unmap();
      pmDiagPending = false;
      return out;
    },

    // Dumps level-0 potential φ (128³ f32). Reuses pmDensityStaging since the
    // buffer sizes match; diagPending flag serializes access.
    async dumpPotential(): Promise<Float32Array | null> {
      if (pmDiagPending) return null;
      pmDiagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(pmPotential[0], 0, pmDensityStaging, 0, pmLevel0Cells * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await pmDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(pmDensityStaging.getMappedRange().slice(0));
      pmDensityStaging.unmap();
      pmDiagPending = false;
      return out;
    },

    // Max |residual| at level 0 — the convergence metric for the V-cycle.
    // Below ~1% of peak density value after 4 V-cycles indicates good solve.
    async maxResidual(): Promise<{ inner: number; outer: number } | null> {
      if (pmDiagPending || pmOuterDiagPending) return null;
      pmDiagPending = true;
      pmOuterDiagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(pmResidual[0], 0, pmDensityStaging, 0, pmLevel0Cells * 4);
      enc.copyBufferToBuffer(pmOuterResidual[0], 0, pmOuterDensityStaging, 0, pmOuterLevel0Cells * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await pmDensityStaging.mapAsync(GPUMapMode.READ);
      const innerArr = new Float32Array(pmDensityStaging.getMappedRange());
      let inner = 0;
      for (let i = 0; i < innerArr.length; i++) {
        const a = Math.abs(innerArr[i]);
        if (a > inner) inner = a;
      }
      pmDensityStaging.unmap();
      pmDiagPending = false;

      await pmOuterDensityStaging.mapAsync(GPUMapMode.READ);
      const outerArr = new Float32Array(pmOuterDensityStaging.getMappedRange());
      let outer = 0;
      for (let i = 0; i < outerArr.length; i++) {
        const a = Math.abs(outerArr[i]);
        if (a > outer) outer = a;
      }
      pmOuterDensityStaging.unmap();
      pmOuterDiagPending = false;
      return { inner, outer };
    },

    // Outer-grid density + potential dumps. Separate staging buffer keeps
    // these independent of the inner-grid diagnostic in-flight flag.
    async dumpOuterDensity(): Promise<Float32Array | null> {
      if (pmOuterDiagPending) return null;
      pmOuterDiagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(pmOuterDensityF32, 0, pmOuterDensityStaging, 0, pmOuterLevel0Cells * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await pmOuterDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(pmOuterDensityStaging.getMappedRange().slice(0));
      pmOuterDensityStaging.unmap();
      pmOuterDiagPending = false;
      return out;
    },
    async dumpOuterPotential(): Promise<Float32Array | null> {
      if (pmOuterDiagPending) return null;
      pmOuterDiagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(pmOuterPotential[0], 0, pmOuterDensityStaging, 0, pmOuterLevel0Cells * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await pmOuterDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(pmOuterDensityStaging.getMappedRange().slice(0));
      pmOuterDensityStaging.unmap();
      pmOuterDiagPending = false;
      return out;
    },

    gasDumpDensity: () => gas.dumpDensity(),

    gasEnergyBreakdown: () => gas.energyBreakdown(pingPong, state.physics.gasSoundSpeed ?? 2.0),

    gasWakeProbe: (starIdx = 0) => gas.wakeProbe(pingPong, starIdx),

    async gasReversibilityTest(nSteps: number): Promise<{ maxPosErr: number; maxVelErr: number; count: number } | null> {
      const wasPaused = state.paused;
      const savedDir = timeDirection;
      state.paused = true;
      const start = await gas.snapshot(pingPong);
      if (!start) {
        timeDirection = savedDir;
        state.paused = wasPaused;
        return null;
      }
      timeDirection = 1;
      for (let i = 0; i < nSteps; i++) {
        const e = device.createCommandEncoder();
        this.compute(e);
        device.queue.submit([e.finish()]);
      }
      timeDirection = -1;
      for (let i = 0; i < nSteps; i++) {
        const e = device.createCommandEncoder();
        this.compute(e);
        device.queue.submit([e.finish()]);
      }
      timeDirection = savedDir;
      state.paused = wasPaused;

      const end = await gas.snapshot(pingPong);
      if (!end) return null;
      let maxPosErr = 0;
      let maxVelErr = 0;
      for (let i = 0; i < gas.count; i++) {
        const o = i * 12;
        const posErr = Math.hypot(end[o] - start[o], end[o + 1] - start[o + 1], end[o + 2] - start[o + 2]);
        const velErr = Math.hypot(end[o + 4] - start[o + 4], end[o + 5] - start[o + 5], end[o + 6] - start[o + 6]);
        if (posErr > maxPosErr) maxPosErr = posErr;
        if (velErr > maxVelErr) maxVelErr = velErr;
      }
      return { maxPosErr, maxVelErr, count: gas.count };
    },

    // PM reversibility harness. Snapshots particle positions, runs N forward
    // steps, then N reverse steps, then compares. A sound PM implementation
    // should return particles to within ~1e-3 world units for N=1000 thanks
    // to the fixed-point u32 atomic deposit (order-independent) + DKD
    // half-step symmetry. Values much larger indicate a bug:
    //   • Deposition/interpolation sampling at pos (not posHalf)
    //   • f32 atomics (non-associative)
    //   • State-dependent iteration count in the multigrid
    //
    // Pauses the sim for the test duration and restores on exit. Shares
    // pmDiagPending with other PM dumps — no concurrent use.
    async reversibilityTest(nSteps: number): Promise<{ maxErr: number; meanErr: number; count: number } | null> {
      if (pmDiagPending) return null;
      const particleBytes = count * 48;
      if (particleBytes > pmDensityStaging.size) return null;
      pmDiagPending = true;
      const wasPaused = state.paused;
      const savedDir = timeDirection;
      state.paused = true;

      const snapshotPositions = async (): Promise<Float32Array> => {
        const e = device.createCommandEncoder();
        const src = pingPong === 0 ? bufferA : bufferB;
        e.copyBufferToBuffer(src, 0, pmDensityStaging, 0, particleBytes);
        device.queue.submit([e.finish()]);
        await device.queue.onSubmittedWorkDone();
        await pmDensityStaging.mapAsync(GPUMapMode.READ);
        const out = new Float32Array(pmDensityStaging.getMappedRange(0, particleBytes).slice(0));
        pmDensityStaging.unmap();
        return out;
      };

      const startPos = await snapshotPositions();

      // Forward N, then reverse N. One submit per step — simple and unambiguous
      // ordering relative to each step's params writeBuffer.
      timeDirection = 1;
      for (let i = 0; i < nSteps; i++) {
        const e = device.createCommandEncoder();
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        this.compute(e);
        device.queue.submit([e.finish()]);
      }
      timeDirection = -1;
      for (let i = 0; i < nSteps; i++) {
        const e = device.createCommandEncoder();
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        this.compute(e);
        device.queue.submit([e.finish()]);
      }
      timeDirection = savedDir;
      state.paused = wasPaused;

      const endPos = await snapshotPositions();

      // Body layout: pos(3) mass(1) vel(3) pad(1) home(3) pad(1) = 12 floats.
      // Compare the position triplet per body.
      let maxErr = 0;
      let sumErr = 0;
      for (let i = 0; i < count; i++) {
        const o = i * 12;
        const dx = endPos[o]     - startPos[o];
        const dy = endPos[o + 1] - startPos[o + 1];
        const dz = endPos[o + 2] - startPos[o + 2];
        const err = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (err > maxErr) maxErr = err;
        sumErr += err;
      }
      pmDiagPending = false;
      return { maxErr, meanErr: sumErr / count, count };
    },

    destroy() {
      bufferA.destroy(); bufferB.destroy();
      gas.destroy();
      paramsBuffer.destroy(); cameraBuffer.destroy(); blurBuffer.destroy();
      attractorFieldBuffer.destroy(); markerBuffer.destroy();
      statsOutBuffer.destroy(); statsStaging.destroy(); statsParamsBuffer.destroy();
      diagStaging.destroy();
      // PM scaffolding cleanup. Every buffer allocated in the PM block above
      // is released here. [LAW:single-enforcer] No other destroy site exists.
      pmDensityU32.destroy(); pmDensityF32.destroy();
      for (const b of pmPotential) b.destroy();
      for (const b of pmResidual) b.destroy();
      pmForce.destroy();
      pmMeanScratch.destroy();
      pmParamsBuffer.destroy(); pmDensityStaging.destroy();
      // V-cycle: coarse-level RHS buffers (pmRho[0] aliases pmDensityF32, skip).
      for (let l = 1; l < pmRho.length; l++) pmRho[l].destroy();
      // V-cycle: per-level uniforms.
      for (const pair of pmSmoothUniform) for (const b of pair) b.destroy();
      for (const b of pmResidualUniform) b.destroy();
      for (const b of pmRestrictUniform) b.destroy();
      for (const b of pmProlongUniform) b.destroy();
      // Outer grid (same resource bundle — mirrors the inner cleanup above).
      pmOuterDensityU32.destroy(); pmOuterDensityF32.destroy();
      for (const b of pmOuterPotential) b.destroy();
      for (const b of pmOuterResidual) b.destroy();
      pmOuterMeanScratch.destroy();
      pmOuterParamsBuffer.destroy(); pmOuterDensityStaging.destroy();
      for (let l = 1; l < pmOuterRho.length; l++) pmOuterRho[l].destroy();
      for (const pair of pmOuterSmoothUniform) for (const b of pair) b.destroy();
      for (const b of pmOuterResidualUniform) b.destroy();
      for (const b of pmOuterRestrictUniform) b.destroy();
      for (const b of pmOuterProlongUniform) b.destroy();
      pmBlendBuffer.destroy();
      destroyDepthRef(depthRef);
    },
    // PM internal state — not read by external callers today. Future tickets
    // (CIC deposition .3, Poisson solver .4, force sampling .5) will dispatch
    // compute work against these from inside this factory's closure.
    pmDensityU32,
    pmDensityF32,
    pmPotential,
    pmResidual,
    pmForce,
    pmMeanScratch,
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
  } else if (param.type === 'toggle') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.mode = mode;
    input.dataset.key = param.key;
    input.checked = Boolean(modeParams(mode)[param.key]);
    input.addEventListener('change', () => {
      modeParams(mode)[param.key] = input.checked;
      updateAll();
    });
    row.appendChild(input);
  } else {
    const input = document.createElement('input');
    input.type = 'range';
    // [LAW:dataflow-not-control-flow] logScale shapes the slider's tick-space
    // vs. real-value-space mapping. Dataset flags let sync code (applyPreset,
    // syncUIFromState) do the same mapping without re-reading PARAM_DEFS.
    if (param.logScale && param.min !== undefined && param.max !== undefined) {
      input.min = '0';
      input.max = String(LOG_SLIDER_TICKS);
      input.step = '1';
      input.value = String(realToLogTick(Number(modeParams(mode)[param.key]), param.min, param.max));
      input.dataset.logScale = '1';
    } else {
      input.min = String(param.min);
      input.max = String(param.max);
      input.step = String(param.step);
      input.value = String(modeParams(mode)[param.key]);
    }
    input.dataset.mode = mode;
    input.dataset.key = param.key;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = formatValueWithMax(Number(modeParams(mode)[param.key]), param);

    input.addEventListener('input', () => {
      const val = (param.logScale && param.min !== undefined && param.max !== undefined)
        ? logTickToReal(Number(input.value), param.min, param.max)
        : Number(input.value);
      modeParams(mode)[param.key] = val;
      valueSpan.textContent = formatValueWithMax(val, param);
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

// [LAW:single-enforcer] All slider value readouts flow through this so the
// "Permanent"-at-max behavior (and any future label overrides) never drifts
// between buildParamRow, applyPreset, and syncUIFromState.
function formatValueWithMax(val: number, def: ParamDef | null): string {
  const step = def?.step ?? 0.01;
  if (def?.maxLabel !== undefined && def.max !== undefined && val >= def.max - step / 2) {
    return def.maxLabel;
  }
  return formatValue(val, step);
}

// Linear-to-log tick mapping: slider position lives in [0, 1000] tick space,
// real values span [min, max] logarithmically. Kept here (not inlined) so the
// three slider touchpoints (build, preset apply, load sync) agree exactly.
const LOG_SLIDER_TICKS = 1000;
function realToLogTick(real: number, min: number, max: number): number {
  const t = (Math.log(real) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return Math.round(LOG_SLIDER_TICKS * Math.max(0, Math.min(1, t)));
}
function logTickToReal(tick: number, min: number, max: number): number {
  const t = tick / LOG_SLIDER_TICKS;
  return Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)));
}

function applyPreset(mode: SimMode, presetName: string) {
  const preset = PRESETS[mode][presetName];
  Object.assign(modeParams(mode), preset);

  // Update all sliders/dropdowns for this mode
  const container = document.getElementById(`params-${mode}`)!;
  container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(input => {
    const key = input.dataset.key!;
    if (key in preset) {
      const paramDef = findParamDef(mode, key);
      const realVal = Number(preset[key]);
      input.value = (paramDef?.logScale && paramDef.min !== undefined && paramDef.max !== undefined)
        ? String(realToLogTick(realVal, paramDef.min, paramDef.max))
        : String(preset[key]);
      const valueSpan = input.parentElement?.querySelector('.control-value');
      if (valueSpan) valueSpan.textContent = formatValueWithMax(realVal, paramDef);
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
  document.querySelectorAll<HTMLElement>('.debug-panel').forEach(g =>
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

// [LAW:single-enforcer] Pause-button text/active-state is reflected in exactly one place so the
// desktop button, mobile FAB, and any programmatic pause (breakpoint, skip completion) all agree.
function syncPauseButtons() {
  const btn = document.getElementById('btn-pause');
  if (btn) {
    btn.textContent = state.paused ? 'Resume' : 'Pause';
    btn.classList.toggle('active', state.paused);
  }
  const fab = document.getElementById('fab-pause');
  if (fab) {
    fab.textContent = state.paused ? '\u25B6' : '\u23F8';
    fab.classList.toggle('active', state.paused);
  }
}

function setupGlobalControls() {
  document.getElementById('btn-pause')!.addEventListener('click', () => {
    state.paused = !state.paused;
    if (state.paused) cancelDebugMovement();
    syncPauseButtons();
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

  setupRecordButton();

  // XR debug-log toggle: subscribes/unsubscribes the live console consumer.
  // [LAW:single-enforcer] Single site that flips state.debug.xrLog + the
  // metrics subscription in lockstep so the two cannot disagree.
  const xrLogToggle = document.getElementById('toggle-xr-log') as HTMLInputElement;
  xrLogToggle.addEventListener('change', () => {
    state.debug.xrLog = xrLogToggle.checked;
    setXrDebugLogging(state.debug.xrLog);
    saveState();
  });

  // XR button setup
  setupXRButton();
}

// One-click XR record button: enter XR and begin an unbounded recording;
// the recording terminates when the XR session ends (user exits). Samples
// publish to console + window.__xrLastRecording on stop.
function setupRecordButton(): void {
  const btn = document.getElementById('btn-xr-record') as HTMLButtonElement | null;
  if (!btn) return;
  const idleLabel = 'Record XR Session';
  const tick = () => {
    const s = metrics.status();
    if (s.phase === 'idle') {
      btn.textContent = idleLabel;
      btn.disabled = !!xrSession;  // also disabled while XR session alive
      return;
    }
    btn.textContent = 'Recording — exit XR to stop';
    btn.disabled = true;
    requestAnimationFrame(tick);
  };
  btn.addEventListener('click', async () => {
    if (metrics.status().phase !== 'idle' || xrSession) return;
    // Start the recording before the session so we capture session-setup
    // signals too. Producers are dormant until xrInputStep runs, so no
    // samples actually arrive until the first XR frame — this just ensures
    // subscribers are live when they do.
    metrics.record({}).then((samples) => {
      // Full sample array on window for programmatic inspection. Console only
      // shows edge events (gestures + state transitions) to avoid 90 Hz × 2-hand
      // snap spam. To walk snaps yourself: __xrLastRecording.filter(s => s.channel === 'xr.snap').
      (window as unknown as { __xrLastRecording?: MetricSample[] }).__xrLastRecording = samples;
      const counts: Record<string, number> = {};
      for (const s of samples) counts[s.channel] = (counts[s.channel] ?? 0) + 1;
      const summary = Object.entries(counts).map(([c, n]) => `${c}: ${n}`).join(', ');
      // eslint-disable-next-line no-console
      console.group(`[xr] recording — ${samples.length} samples (${summary})`);
      for (const s of samples) {
        if (s.channel === 'xr.snap') continue;  // bulk data; inspect via __xrLastRecording
        // pinch-hold fires every frame during a pinch — also bulk; skip from console.
        if (s.channel === 'xr.gesture'
          && (s.payload as XrGestureEvent).gesture.kind === 'pinch-hold') continue;
        // Inline kind/transition into the prefix so Safari doesn't collapse nested
        // objects to "Object" — the string prefix always prints fully.
        let label = s.channel;
        if (s.channel === 'xr.gesture') {
          const p = s.payload as XrGestureEvent;
          label = `xr.gesture:${p.gesture.kind}${p.hand ? `(${p.hand})` : ''}`;
        } else if (s.channel === 'xr.state') {
          const p = s.payload as XrStateEvent;
          label = `xr.state:${p.hand} ${p.from}→${p.to}`;
        }
        // eslint-disable-next-line no-console
        console.log(`[t=${s.t.toFixed(0).padStart(5)}ms] ${label}`, s.payload);
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    });
    requestAnimationFrame(tick);
    await toggleXR();
    // toggleXR assigns the module-level xrSession during the await — but the
    // early guard's narrowing of that variable persists past the await in TS,
    // so we un-narrow via an explicit cast to read the live value.
    const session = xrSession as unknown as XRSession | null;
    if (!session) {
      // Session failed to start — end the recording with whatever we have.
      metrics.stop();
      return;
    }
    // [LAW:single-enforcer] Our listener only calls metrics.stop(); the
    // existing session-end handler in toggleXR owns the XR-side cleanup.
    session.addEventListener('end', () => metrics.stop(), { once: true });
  });
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

// ═══════════════════════════════════════════════════════════════════════════════
// DEBUG / TIME CONTROL
// ═══════════════════════════════════════════════════════════════════════════════
// [LAW:one-source-of-truth] Debug state drives three behaviors that would otherwise diverge:
// manual step (discrete advance), skip-to-step (bounded seek), and breakpoint (auto-pause at step).
// All three funnel through runDebugCompute() in the frame loop so the frame-level gating stays uniform.

interface DebugState {
  skipTarget: number | null;          // step we're seeking toward (null = not skipping)
  targetStepsPerSec: number;          // "Target speed" selector: desired sim steps per wall-second (nominal)
  adaptiveChunk: number;              // current budget-adapted per-frame chunk, updated from rAF-delta feedback
  breakAtStep: number | null;         // auto-pause when simStep reaches this (null = no breakpoint)
  manualStepsRemaining: number;       // discrete-step requests pending (from ±1 / ±10 / ±60 buttons)
  manualDirection: number;            // +1 or -1 for the manual-step queue
  lastSkipDispatches: number;         // dispatches run in the most recent skip frame (for the feedback loop)
}

// Base dt nominal = 0.016s (matches nbody compute). At timeScale=1 → 60 sim-steps per second of live play.
// targetStepsPerSec labels in UI: 60=1x, 600=10x, 6000=100x, 60000=1000x, 1e9=Max (GPU-capped).
const debugState: DebugState = {
  skipTarget: null,
  targetStepsPerSec: 6000,            // default 100x — visible time-lapse, smooth on typical hardware
  adaptiveChunk: 8,                   // conservative start; rAF-delta feedback grows it quickly
  breakAtStep: null,
  manualStepsRemaining: 0,
  manualDirection: 1,
  lastSkipDispatches: 0,
};

// rAF-delta thresholds for the adaptive-chunk feedback loop. 60fps target = 16.7ms/frame;
// we grow the chunk below 14ms (genuine headroom) and shrink above 20ms (missed a frame).
const DEBUG_FRAME_OVER_MS = 20.0;
const DEBUG_FRAME_UNDER_MS = 14.0;
const DEBUG_ADAPTIVE_GROW = 1.3;
const DEBUG_ADAPTIVE_SHRINK = 0.7;
const DEBUG_ADAPTIVE_MIN = 1;
const DEBUG_ADAPTIVE_MAX = 5000;      // hard ceiling so runaway growth can't starve render

// [LAW:single-enforcer] Adaptive chunk feedback is updated in exactly one place per frame so the
// "what chunk should I use next" decision is authoritative. Call after each frame with rAF delta.
function updateAdaptiveChunk(frameDeltaMs: number): void {
  if (debugState.lastSkipDispatches <= 0) return; // only adapt during actual skip activity
  const targetPerFrame = Math.max(1, Math.ceil(debugState.targetStepsPerSec / 60));
  if (frameDeltaMs > DEBUG_FRAME_OVER_MS) {
    debugState.adaptiveChunk = Math.max(DEBUG_ADAPTIVE_MIN, Math.floor(debugState.adaptiveChunk * DEBUG_ADAPTIVE_SHRINK));
  } else if (frameDeltaMs < DEBUG_FRAME_UNDER_MS && debugState.adaptiveChunk < targetPerFrame) {
    debugState.adaptiveChunk = Math.min(DEBUG_ADAPTIVE_MAX, Math.ceil(debugState.adaptiveChunk * DEBUG_ADAPTIVE_GROW));
  }
}

// [LAW:single-enforcer] Clearing pending movement happens in exactly one place so "user pressed pause"
// and "user pressed anything else that cancels" produce identical internal state.
function cancelDebugMovement() {
  debugState.skipTarget = null;
  debugState.manualStepsRemaining = 0;
  debugState.lastSkipDispatches = 0;
}

// [LAW:dataflow-not-control-flow] Same dispatch every frame — runDebugCompute always runs on physics mode.
// What varies is (a) how many steps, (b) which direction, (c) whether motion blur is engaged — all pure
// functions of debugState + pause state. Non-physics modes fall through to simple "compute iff not paused".
function runDebugCompute(sim: Simulation, encoder: GPUCommandEncoder): void {
  if (state.mode !== 'physics' || !('getSimStep' in sim)) {
    // Non-physics modes: no skip/step state applies; keep the adaptive-chunk feedback quiet so
    // mode-switch-during-skip doesn't leave a stale lastSkipDispatches value driving adjustments.
    debugState.lastSkipDispatches = 0;
    if (!state.paused) sim.compute(encoder);
    return;
  }
  const pSim = sim as Simulation & {
    getSimStep(): number;
    getTimeDirection(): number;
    setTimeDirection(d: number): void;
    setBlurTime(t: number): void;
  };

  let stepCount = 0;
  let overrideDir: number | null = null;
  let skipActiveThisFrame = false;

  if (debugState.skipTarget !== null) {
    const delta = debugState.skipTarget - pSim.getSimStep();
    if (delta === 0) {
      debugState.skipTarget = null;
      debugState.lastSkipDispatches = 0;
      pSim.setBlurTime(0);  // clean frame at the target
      state.paused = true;
      syncPauseButtons();
      return;
    }
    overrideDir = delta > 0 ? 1 : -1;
    // Chunk capped by: user's target-rate ceiling, GPU-budget feedback, and remaining distance.
    const targetPerFrame = Math.max(1, Math.ceil(debugState.targetStepsPerSec / 60));
    stepCount = Math.min(targetPerFrame, debugState.adaptiveChunk, Math.abs(delta));
    skipActiveThisFrame = true;
  } else if (debugState.manualStepsRemaining > 0) {
    overrideDir = debugState.manualDirection;
    // Manual step buttons don't engage motion blur (plan: crisp frame-by-frame debugging).
    // They still respect the adaptive chunk cap so clicking +60 doesn't stall the UI.
    stepCount = Math.min(debugState.adaptiveChunk, debugState.manualStepsRemaining);
    debugState.manualStepsRemaining -= stepCount;
  } else if (!state.paused) {
    stepCount = 1;
  }

  if (stepCount === 0) {
    // Not running compute this frame — ensure blurTime is 0 so a leftover skip value doesn't linger.
    pSim.setBlurTime(0);
    debugState.lastSkipDispatches = 0;
    return;
  }

  const savedDir = pSim.getTimeDirection();
  const needRestore = overrideDir !== null && overrideDir !== savedDir;
  if (needRestore) pSim.setTimeDirection(overrideDir!);

  // Motion-blur time = world-time span of this frame's worth of steps, signed by direction.
  // Reverse (overrideDir=-1 or savedDir=-1) produces negative blurTime; the shader's
  // tail = pos - vel*blurTime then places the trail on the correct side.
  const dirForBlur = overrideDir !== null ? overrideDir : savedDir;
  const baseDt = 0.016 * state.fx.timeScale;
  const blurTime = skipActiveThisFrame ? (stepCount * baseDt * dirForBlur) : 0;
  pSim.setBlurTime(blurTime);
  debugState.lastSkipDispatches = skipActiveThisFrame ? stepCount : 0;

  // NOTE: we do NOT check `state.paused` inside this loop. stepBy/initiateSkip deliberately
  // set state.paused=true to freeze normal play while the chunk executes, so a `paused` check
  // would abort after iteration 0. The sim's reverse-boundary guard inside compute() already
  // early-returns as a no-op once simStep <= 0 with negative dir, so finishing the chunk is safe.
  for (let i = 0; i < stepCount; i++) {
    pSim.compute(encoder);
    const curStep = pSim.getSimStep();
    // Breakpoint: auto-pause on exact match, regardless of direction.
    if (debugState.breakAtStep !== null && curStep === debugState.breakAtStep) {
      debugState.breakAtStep = null;
      cancelDebugMovement();
      state.paused = true;
      syncPauseButtons();
      refreshBreakpointUI();
      // Force clean final frame even if we hit the breakpoint mid-skip.
      pSim.setBlurTime(0);
      break;
    }
    // Skip target: finish when we hit it.
    if (debugState.skipTarget !== null && curStep === debugState.skipTarget) {
      debugState.skipTarget = null;
      state.paused = true;
      syncPauseButtons();
      pSim.setBlurTime(0);
      debugState.lastSkipDispatches = 0;
      break;
    }
  }

  if (needRestore) pSim.setTimeDirection(savedDir);
}

function refreshBreakpointUI(): void {
  const status = document.getElementById('debug-break-status');
  const val = document.getElementById('debug-break-val');
  if (!status || !val) return;
  if (debugState.breakAtStep !== null) {
    val.textContent = String(debugState.breakAtStep);
    status.style.display = '';
  } else {
    status.style.display = 'none';
  }
}

function setupDebugControls() {
  const byId = <T extends HTMLElement>(id: string): T | null =>
    document.getElementById(id) as T | null;

  const stepBy = (n: number, dir: number) => {
    cancelDebugMovement();
    state.paused = true;
    syncPauseButtons();
    debugState.manualStepsRemaining = n;
    debugState.manualDirection = dir;
  };

  byId('debug-rev60')?.addEventListener('click', () => stepBy(60, -1));
  byId('debug-rev10')?.addEventListener('click', () => stepBy(10, -1));
  byId('debug-rev1')?.addEventListener('click', () => stepBy(1, -1));
  byId('debug-fwd1')?.addEventListener('click', () => stepBy(1, 1));
  byId('debug-fwd10')?.addEventListener('click', () => stepBy(10, 1));
  byId('debug-fwd60')?.addEventListener('click', () => stepBy(60, 1));

  const chunkSelect = byId<HTMLSelectElement>('debug-skip-chunk');
  if (chunkSelect) {
    // Initialize debugState from the rendered <select>'s selected option (keeps HTML + JS synced).
    const initial = parseInt(chunkSelect.value, 10);
    if (Number.isFinite(initial) && initial > 0) debugState.targetStepsPerSec = initial;
    chunkSelect.addEventListener('change', () => {
      const n = parseInt(chunkSelect.value, 10);
      if (Number.isFinite(n) && n > 0) debugState.targetStepsPerSec = n;
    });
  }

  const initiateSkip = (target: number) => {
    if (target < 0) return;
    cancelDebugMovement();
    state.paused = true;
    syncPauseButtons();
    debugState.skipTarget = target;
  };

  const skipInput = byId<HTMLInputElement>('debug-skip-target');
  byId('debug-skip-btn')?.addEventListener('click', () => {
    const v = parseInt(skipInput?.value ?? '', 10);
    if (Number.isFinite(v)) initiateSkip(v);
  });
  skipInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = parseInt(skipInput.value, 10);
      if (Number.isFinite(v)) initiateSkip(v);
    }
  });

  const breakInput = byId<HTMLInputElement>('debug-break-step');
  byId('debug-break-btn')?.addEventListener('click', () => {
    const v = parseInt(breakInput?.value ?? '', 10);
    if (Number.isFinite(v) && v >= 0) {
      debugState.breakAtStep = v;
      refreshBreakpointUI();
    }
  });
  breakInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = parseInt(breakInput.value, 10);
      if (Number.isFinite(v) && v >= 0) {
        debugState.breakAtStep = v;
        refreshBreakpointUI();
      }
    }
  });
  byId('debug-break-clear')?.addEventListener('click', () => {
    debugState.breakAtStep = null;
    refreshBreakpointUI();
  });

  const scrub = byId<HTMLInputElement>('debug-scrub');
  // 'change' fires on release; drag is cheap since each "live" change would queue a skip.
  // Use 'change' so we don't spam the sim with seek requests during the drag.
  scrub?.addEventListener('change', () => {
    const v = parseInt(scrub.value, 10);
    if (Number.isFinite(v)) initiateSkip(v);
  });

  byId('debug-screenshot')?.addEventListener('click', () => {
    const sim = simulations['physics'];
    const step = sim && 'getSimStep' in sim
      ? (sim as { getSimStep(): number }).getSimStep()
      : 0;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shader-playground-step-${step}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  });
}

// Per-frame update for the big step display + scrubber position. Cheap — DOM text only.
function updateDebugPanel(): void {
  if (state.mode !== 'physics') return;
  const sim = simulations['physics'];
  if (!sim || !('getSimStep' in sim)) return;
  const p = sim as unknown as { getSimStep(): number; getTimeDirection(): number; getJournalHighWater(): number };
  const step = p.getSimStep();
  const dir = p.getTimeDirection();
  const highWater = p.getJournalHighWater();

  const numEl = document.getElementById('debug-step-num');
  if (numEl) numEl.textContent = String(step);
  const dirEl = document.getElementById('debug-step-dir');
  if (dirEl) dirEl.textContent = dir < 0 ? '\u25C0' : '\u25B6';

  const scrub = document.getElementById('debug-scrub') as HTMLInputElement | null;
  const scrubHigh = document.getElementById('debug-scrub-high');
  if (scrub && scrubHigh) {
    const max = Math.max(highWater, step);
    if (scrub.max !== String(max)) scrub.max = String(max);
    // Don't clobber the value while the user is dragging (matches :active on thumb).
    if (document.activeElement !== scrub) scrub.value = String(step);
    scrubHigh.textContent = String(max);
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
    if (state.paused) cancelDebugMovement();
    syncPauseButtons();
  });

  document.getElementById('fab-reset')!.addEventListener('click', () => {
    resetCurrentSim();
  });

  const modeOrder: SimMode[] = ['physics', 'boids', 'physics_classic', 'fluid', 'parametric', 'reaction'];
  const stepMode = (delta: number) => {
    const idx = modeOrder.indexOf(state.mode);
    const next = modeOrder[(idx + delta + modeOrder.length) % modeOrder.length];
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
  const defaultParams = DEFAULTS[mode] as unknown as Record<string, number | string | boolean>;
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

function describeParam(_mode: string, key: string, val: number | string | boolean): string | null {
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
    gasMassFraction: () => n < 0.01 ? 'no gas reservoir' : `gas mass fraction ${val}`,
    gasSoundSpeed: () => `gas sound speed ${val}`,
    gasVisible: () => val ? null : 'gas hidden',
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
      ...GAS_SHADER_SOURCES,
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
// METRICS BUS
// ═══════════════════════════════════════════════════════════════════════════════
// Typed pub/sub channels with first-class burst-capture recording. Producers
// guard emit with `chan.subscribers.size > 0` for zero-cost-when-idle — no
// payload is constructed when nobody is listening. All consumers (console
// loggers, HUDs, the burst recorder) subscribe the same way; adding a new
// consumer is free at producer sites. [LAW:one-source-of-truth] One registry
// of channels and one recorder state.

interface MetricChannel<T> {
  readonly name: string;
  readonly subscribers: Set<(payload: T) => void>;
}
interface MetricSample {
  t: number;             // ms since recording-window start (pre-delay is invisible)
  channel: string;
  payload: unknown;
}
type RecordPhase = 'idle' | 'pre-delay' | 'recording';
interface RecordOptions {
  preDelayMs?: number;   // default 0: skip pre-delay, go straight to recording
  durationMs?: number;   // omit = unbounded; caller must call metrics.stop()
  channels?: MetricChannel<unknown>[];  // omit = all registered channels
}
interface RecordStatus {
  phase: RecordPhase;
  remainingMs: number;   // 0 when unbounded or idle
  bounded: boolean;      // false for open-ended sessions (no durationMs)
}

const metricsChannels = new Map<string, MetricChannel<unknown>>();
const metricsRecord = {
  phase: 'idle' as RecordPhase,
  phaseDeadline: 0,       // 0 when unbounded or idle
  bounded: false,
  samples: [] as MetricSample[],
  startedAt: 0,
  unsubs: [] as Array<() => void>,
  preDelayTimer: null as ReturnType<typeof setTimeout> | null,
  stopTimer: null as ReturnType<typeof setTimeout> | null,
  resolve: null as ((samples: MetricSample[]) => void) | null,
};

const metrics = {
  channel<T>(name: string): MetricChannel<T> {
    const existing = metricsChannels.get(name);
    if (existing) return existing as MetricChannel<T>;
    const chan: MetricChannel<T> = { name, subscribers: new Set() };
    metricsChannels.set(name, chan as unknown as MetricChannel<unknown>);
    return chan;
  },
  subscribe<T>(chan: MetricChannel<T>, fn: (p: T) => void): () => void {
    chan.subscribers.add(fn);
    return () => { chan.subscribers.delete(fn); };
  },
  emit<T>(chan: MetricChannel<T>, payload: T): void {
    for (const fn of chan.subscribers) fn(payload);
  },
  // Begin a recording. Returns a Promise that resolves with the collected
  // samples when the recording ends — either via the duration timer (bounded)
  // or via metrics.stop() (unbounded).
  record(opts: RecordOptions): Promise<MetricSample[]> {
    if (metricsRecord.phase !== 'idle') {
      return Promise.reject(new Error('metrics.record: recording already in progress'));
    }
    const preDelayMs = opts.preDelayMs ?? 0;
    metricsRecord.samples = [];
    metricsRecord.bounded = opts.durationMs !== undefined;
    return new Promise<MetricSample[]>((resolve) => {
      metricsRecord.resolve = resolve;
      const begin = () => {
        const targets = opts.channels ?? Array.from(metricsChannels.values());
        metricsRecord.startedAt = performance.now();
        metricsRecord.phase = 'recording';
        metricsRecord.phaseDeadline = opts.durationMs !== undefined
          ? metricsRecord.startedAt + opts.durationMs
          : 0;
        metricsRecord.preDelayTimer = null;
        for (const chan of targets) {
          const chanName = chan.name;
          metricsRecord.unsubs.push(metrics.subscribe(chan, (payload) => {
            metricsRecord.samples.push({
              t: performance.now() - metricsRecord.startedAt,
              channel: chanName,
              payload,
            });
          }));
        }
        if (opts.durationMs !== undefined) {
          metricsRecord.stopTimer = setTimeout(() => metrics.stop(), opts.durationMs);
        }
      };
      if (preDelayMs > 0) {
        metricsRecord.phase = 'pre-delay';
        metricsRecord.phaseDeadline = performance.now() + preDelayMs;
        metricsRecord.preDelayTimer = setTimeout(begin, preDelayMs);
      } else {
        begin();
      }
    });
  },
  // End the current recording (bounded or unbounded). Cancels any pending
  // timers, unsubscribes, resolves the promise with the collected samples.
  // No-op when idle. [LAW:single-enforcer] Sole cleanup path for recordings.
  stop(): void {
    if (metricsRecord.phase === 'idle') return;
    if (metricsRecord.preDelayTimer) {
      clearTimeout(metricsRecord.preDelayTimer);
      metricsRecord.preDelayTimer = null;
    }
    if (metricsRecord.stopTimer) {
      clearTimeout(metricsRecord.stopTimer);
      metricsRecord.stopTimer = null;
    }
    for (const u of metricsRecord.unsubs) u();
    metricsRecord.unsubs = [];
    const samples = metricsRecord.samples;
    metricsRecord.samples = [];
    metricsRecord.phase = 'idle';
    metricsRecord.phaseDeadline = 0;
    metricsRecord.bounded = false;
    const res = metricsRecord.resolve;
    metricsRecord.resolve = null;
    if (res) res(samples);
  },
  status(): RecordStatus {
    if (metricsRecord.phase === 'idle') return { phase: 'idle', remainingMs: 0, bounded: false };
    return {
      phase: metricsRecord.phase,
      remainingMs: metricsRecord.phaseDeadline === 0
        ? 0
        : Math.max(0, metricsRecord.phaseDeadline - performance.now()),
      bounded: metricsRecord.bounded,
    };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: WEBXR
// ═══════════════════════════════════════════════════════════════════════════════

let xrSession: XRSession | null = null;
let xrRefSpace: XRReferenceSpace | null = null;
let xrBaseRefSpace: XRReferenceSpace | null = null; // pre-gesture reference space
let xrBinding: XRGPUBinding | null = null;
let xrLayer: XRProjectionLayer | null = null;
// Diagnostic only: logged at session acquisition so the acquired-session log
// line records whether the runtime granted hand-tracking. The hot path does
// NOT consult this flag — per-source `source.hand` is the canonical truth
// (xrUpdateHandFrames already gates joint queries on it). Mirroring that into
// a session-level boolean and reading both would be a [LAW:one-source-of-truth]
// violation. Reset on session end so a re-acquisition doesn't read stale state.
let xrHandTrackingAvailable = false;

// ═══════════════════════════════════════════════════════════════════════════════
// XR INPUT PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════
// Architecture from design-docs/XR-UX-PROPOSALS.md:
//   raw XR inputs → HandFrame[] → Gesture[] → InteractionState transitions → side effects
//
// [LAW:one-source-of-truth] All XR input flows through this pipeline.
// selectstart/selectend produce raw pinch events.
// Each frame: update HandFrames → detect Gestures → transition InteractionStates → apply effects.

// ─── TYPES ───────────────────────────────────────────────────────────────────

type XrHand = 'left' | 'right';
interface XrRay { origin: number[]; dir: number[] }

// Per-hand, per-frame snapshot. Core of the input pipeline.
// Joints/palmNormal/grip are stubs — populated when hand-tracking feature lands.
interface XrHandFrame {
  hand: XrHand;
  tracked: boolean;
  source: XRInputSource | null;  // the XR input source for this hand (null when idle)
  pinch: {
    active: boolean;
    startTime: number;          // performance.now() at pinch-start
    origin: number[];           // hand position at pinch-start
    current: number[];          // current hand position
  };
  // Gaze-seeded ray: frozen at pinch-start, authoritative for SELECTION.
  gazeRay: XrRay | null;
  // Hand-steered ray: updated each frame during pinch. Drives drag/scrub.
  currentRay: XrRay | null;
  // Advisory hover laser ray. Synthesized from joints every frame when
  // tracked. NEVER used for selection — that is gazeRay at pinch-start.
  ray: XrRay | null;
  // Hand-tracking data: populated each frame when the XR runtime grants
  // hand-tracking and this handedness has an input source with `.hand`.
  // joints is null ONLY when no hand data is available at all; when non-null
  // it has all 25 keys but individual entries may be null (joint occluded,
  // off-sensor, not yet converged). palmNormal and grip are derived from
  // joints and synchronized atomically by xrUpdateHandFrames.
  palmNormal: number[] | null;
  joints: XrJoints | null;
  grip: XrGripState | null;
}

// 25 hand joints per WebXR spec. Ordered canonically for readability.
const XR_JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
] as const satisfies readonly XRHandJoint[];
type XrJointName = typeof XR_JOINT_NAMES[number];

interface XrJointPose {
  position: number[];      // 3 floats, in xrRefSpace
  orientation: number[];   // 4 floats (xyzw quaternion)
  radius: number;          // meters
}

// [LAW:dataflow-not-control-flow] When non-null, the record always has all 25
// keys; individual entries are null when a joint is momentarily un-tracked.
// Consumers branch on null per-joint via data, not by skipping updates.
type XrJoints = Record<XrJointName, XrJointPose | null>;

// Thumb-tip-to-fingertip geometric contact flags. NOT authoritative for
// selection — pinch.active (from XR selectstart/selectend) is the authoritative
// pinch signal. grip.* exists to represent compound / geometric gestures that
// can't be expressed by the system-recognized pinch alone. Per-flag nullability
// so a single occluded finger-tip doesn't null unrelated flags.
interface XrGripState {
  thumbIndex:  boolean | null;
  thumbMiddle: boolean | null;
  thumbRing:   boolean | null;
  thumbPinky:  boolean | null;
}

function makeIdleHandFrame(hand: XrHand): XrHandFrame {
  return {
    hand, tracked: false, source: null,
    pinch: { active: false, startTime: 0, origin: [0, 0, 0], current: [0, 0, 0] },
    gazeRay: null, currentRay: null, ray: null,
    palmNormal: null, joints: null, grip: null,
  };
}

// Gesture events — pure data produced by the detector, consumed by the state machine.
type XrGesture =
  | { kind: 'pinch-start'; hand: XrHand; gazeRay: XrRay }
  | { kind: 'pinch-hold';  hand: XrHand; dur: number }
  | { kind: 'pinch-end';   hand: XrHand; dur: number }
  // Cooperative gestures (involve both hands):
  | { kind: 'two-hand-pinch-start' }
  | { kind: 'two-hand-pinch-end' }
  // Stubs — detected when hand-tracking joints are available:
  | { kind: 'fine-modifier-on';  hand: XrHand }
  | { kind: 'fine-modifier-off'; hand: XrHand }
  | { kind: 'palm-up';   hand: XrHand }
  | { kind: 'palm-down'; hand: XrHand }
  | { kind: 'wrist-flick'; hand: XrHand; axis: 'roll' | 'pitch' | 'yaw'; sign: 1 | -1 };

// Per-hand interaction state machine.
// [LAW:one-source-of-truth] At most one interaction per hand.
// [LAW:one-type-per-behavior] Single-hand dragging always means sim interaction.
// Widget/UI interactions will add their own variants when the new panel lands.
type XrInteraction =
  | { kind: 'idle' }
  // Pinch-start arrived but we haven't committed yet. If the other hand
  // pinch-starts before deadline, both convert to two-hand-scale (simultaneous
  // = zoom). If deadline passes alone, commit to single-hand dragging (sequential
  // = independent attractor). [LAW:dataflow-not-control-flow] The variant encodes
  // the "waiting to decide" state explicitly instead of branching on timestamps.
  | { kind: 'pending'; deadline: number }
  | { kind: 'dragging';
      handOrigin: number[];      // hand position at drag start
      hasSample: boolean;
    }
  | { kind: 'two-hand-scale' };

// ─── STATE ───────────────────────────────────────────────────────────────────

// Hand frames — updated every XR frame.
const xrHandFrames: Record<XrHand, XrHandFrame> = {
  left: makeIdleHandFrame('left'),
  right: makeIdleHandFrame('right'),
};

// Per-hand interaction state.
const xrInteractions: Record<XrHand, XrInteraction> = {
  left: { kind: 'idle' },
  right: { kind: 'idle' },
};

// Pending pinch-starts: sources added at selectstart, resolved to a hand
// on the first frame with a pose available.
const xrPendingSources: XRInputSource[] = [];

// Gesture tuning — global modifier state.
const xrTuning = {
  gainMultiplier: 1.0,  // 0.1 when fine-modifier active (future)
};

// Which hand carries the bimanual clipboard panel. The other hand is free to
// pinch widgets on the panel. [LAW:one-source-of-truth] One constant; don't
// hardcode 'left' anywhere else in the XR code.
const XR_PANEL_HAND: XrHand = 'left';

// XR-UI module state. Single source of truth for the new widget pipeline:
// - xrUiRegistry holds bindings + named layouts. Empty layouts map until ticket .13
//   registers the first panel. xrUiStep returns idle/empty in that state.
// - xrUiPrev is threaded into xrUiStep each frame and rebuilt from its result.
// - xrUiClaimed mirrors uiHandClaimed(prev.states[hand]) so xrTransitionInteractions
//   can short-circuit the pending→dragging sim promotion when UI owns the pinch.
//   [LAW:single-enforcer] xrUiStep is the only writer of this flag.
const xrUiRegistry: XrUiRegistry = {
  bindings: bindingRegistry,
  layouts: new Map(),
  activeLayoutId: null,
};
let xrUiPrev: XrUiPrev = xrUiMakeIdlePrev();
let xrUiRenderList: XrRenderCommand[] = [];
const xrUiClaimed: Record<XrHand, boolean> = { left: false, right: false };
// Created lazily on first XR frame (needs device + camera buffer). Empty render list
// produces zero draw calls, so guarding the call site keeps desktop frames cheap.
let xrWidgetRenderer: XrWidgetRenderer | null = null;
let xrWidgetCameraBuffer: GPUBuffer | null = null;

// View offset (modified by two-hand scale).
// [LAW:one-source-of-truth] xrViewOffset is the single source for the user's
// virtual viewpoint position relative to the simulation.
const xrViewOffset = { x: 0, y: 0, z: -5 };
let xrViewOffsetY = 0;

// Two-hand scale shared state.
const twoHandState = {
  startDistance: 0,
  startOffset: { x: 0, y: 0, z: 0 },
};

// Previous frame's pinch state for edge detection (gesture events).
const xrPrevPinch: Record<XrHand, boolean> = { left: false, right: false };

// Previous-frame snapshot for joint-derived gesture detection. Parallel to
// xrPrevPinch. [LAW:one-source-of-truth] Sole previous-state store for the
// fine-modifier / palm-up / wrist-flick detectors.
interface XrGestureSnapshot {
  fineModifier: boolean;        // thumb-ring contact state last frame
  palmUp: boolean;              // palm-up state last frame (post-hysteresis)
  wristOrient: number[] | null; // wrist quaternion last frame (null when untracked)
  wristTime: number;            // performance.now() when wristOrient was captured
  flickArmed: boolean;          // last frame's angular speed above threshold
  lastFlickAt: number;          // performance.now() of last emitted flick (refractory)
}
function makeGestureSnapshot(): XrGestureSnapshot {
  return { fineModifier: false, palmUp: false, wristOrient: null, wristTime: 0, flickArmed: false, lastFlickAt: 0 };
}
const xrPrevGestureSnap: Record<XrHand, XrGestureSnapshot> = {
  left: makeGestureSnapshot(),
  right: makeGestureSnapshot(),
};

// Palm-up hysteresis on palmNormal·worldUp. Enter >0.7 (~45° of vertical),
// exit <0.4 (~65°). The dead zone absorbs frame-to-frame noise when the palm
// is held vertical.
const XR_PALM_UP_ENTER = 0.7;
const XR_PALM_UP_EXIT = 0.4;

// Wrist-flick thresholds. 4 rad/s ≈ 230°/s — a deliberate snap, not casual
// motion. 2-frame consensus (flickArmed) plus 300ms refractory suppresses
// ringing and oscillation on the flick peak.
const XR_FLICK_SPEED_RAD_S = 4.0;
const XR_FLICK_REFRACTORY_MS = 300;

// ── METRIC CHANNELS ────────────────────────────────────────────────────────────
// Declared once; producers below guard emit with `chan.subscribers.size > 0`.
// Payload shapes are typed here and flow through subscribers unchanged.
interface XrGestureEvent { hand: XrHand | null; gesture: XrGesture }
interface XrStateEvent { hand: XrHand; from: XrInteraction['kind']; to: XrInteraction['kind'] }
interface XrSnapEvent {
  hand: XrHand;
  handTracked: boolean;      // hand-tracking is producing joints this frame
  pinching: boolean;         // a pinch source is currently active (system gesture)
  palmDot: number | null;    // palmNormal · worldUp
  palmUp: boolean;
  fineModifier: boolean;
  flickSpeed: number;        // rad/s, 0 when no prior orientation
  grip: XrGripState | null;
}
const chanXrGesture = metrics.channel<XrGestureEvent>('xr.gesture');
const chanXrState   = metrics.channel<XrStateEvent>('xr.state');
const chanXrSnap    = metrics.channel<XrSnapEvent>('xr.snap');

// Live console logger — a consumer of the three XR channels. Toggled on/off
// from the UI + persisted via state.debug.xrLog. [LAW:single-enforcer] This is
// the sole wiring for console output; the XR recording feature (one-shot dump at
// session end) keeps its own independent subscription lifecycle. Snap events
// are rate-limited here so the 180 Hz raw stream doesn't flood the console —
// the producer still emits every frame, each consumer samples at its cadence.
const xrLogState = {
  unsubs: [] as Array<() => void>,
  lastSnapMs: { left: 0, right: 0 } as Record<XrHand, number>,
};
const XR_LOG_SNAP_INTERVAL_MS = 200;  // 5 Hz console cadence for snap stream

function setXrDebugLogging(on: boolean): void {
  for (const u of xrLogState.unsubs) u();
  xrLogState.unsubs.length = 0;
  xrLogState.lastSnapMs.left = 0;
  xrLogState.lastSnapMs.right = 0;
  if (!on) return;
  xrLogState.unsubs.push(metrics.subscribe(chanXrGesture, (p) => {
    if (p.gesture.kind === 'pinch-hold') return;  // per-frame noise
    const h = p.hand ? `(${p.hand})` : '';
    // eslint-disable-next-line no-console
    console.log(`[xr] gesture:${p.gesture.kind}${h}`, p.gesture);
  }));
  xrLogState.unsubs.push(metrics.subscribe(chanXrState, (p) => {
    // eslint-disable-next-line no-console
    console.log(`[xr] state:${p.hand} ${p.from}→${p.to}`);
  }));
  xrLogState.unsubs.push(metrics.subscribe(chanXrSnap, (p) => {
    const now = performance.now();
    if (now - xrLogState.lastSnapMs[p.hand] < XR_LOG_SNAP_INTERVAL_MS) return;
    xrLogState.lastSnapMs[p.hand] = now;
    const palm = p.palmDot !== null ? p.palmDot.toFixed(2) : '—';
    // eslint-disable-next-line no-console
    console.log(`[xr] snap:${p.hand} tracked=${p.handTracked} pinch=${p.pinching} palm=${palm} palmUp=${p.palmUp} fine=${p.fineModifier} flick=${p.flickSpeed.toFixed(2)}`);
  }));
}

// State-transition helper: routes every xrInteractions[hand] assignment so the
// change emits on xr.state exactly once per kind-change. Kind-identical writes
// (e.g. re-entering pending with a fresh deadline) do not emit.
function xrSetInteraction(hand: XrHand, next: XrInteraction): void {
  const prev = xrInteractions[hand];
  xrInteractions[hand] = next;
  if (chanXrState.subscribers.size > 0 && prev.kind !== next.kind) {
    metrics.emit(chanXrState, { hand, from: prev.kind, to: next.kind });
  }
}

// Synthetic pointer ids for XR attractors — one per hand so left and right
// create independent concurrent attractors. [LAW:one-source-of-truth] Each hand
// owns exactly one slot in the attractor system's pointer-id map.
const XR_ATTRACTOR_POINTER_ID: Record<XrHand, number> = { left: -1, right: -2 };

// Pinch-start simultaneity window. Two pinch-starts within this window are
// treated as "both at once" → two-hand zoom. Outside the window, sequential
// pinches each commit to their own attractor. First attractor carries this
// latency — the tradeoff for disambiguating zoom from sequential-attractor.
const XR_SIMUL_WINDOW_MS = 150;

// ─── LOW-LEVEL HELPERS ───────────────────────────────────────────────────────

function getXRTargetRayDirection(transform: XRRigidTransform) {
  const m = transform.matrix;
  return normalize3([-m[8], -m[9], -m[10]]);
}

function getXrInputRay(frame: XRFrame, source: XRInputSource): XrRay | null {
  if (!xrRefSpace) return null;
  const pose = frame.getPose(source.targetRaySpace, xrRefSpace);
  if (!pose) return null;
  const p = pose.transform.position;
  return { origin: [p.x, p.y, p.z], dir: getXRTargetRayDirection(pose.transform) };
}

function getXrHandPosition(frame: XRFrame, source: XRInputSource): number[] | null {
  if (!xrRefSpace) return null;
  const pose = frame.getPose(source.gripSpace || source.targetRaySpace, xrRefSpace);
  if (!pose) return null;
  const p = pose.transform.position;
  return [p.x, p.y, p.z];
}

// [LAW:one-source-of-truth] Source→hand assignment is decided once at resolution
// time (assignHandToSource) and then queried by identity (findHandForSource).
// Deriving it from handedness on every call collapses multiple `'none'` sources
// onto the same channel and can misroute selectend to the wrong hand.
function assignHandToSource(source: XRInputSource): XrHand | null {
  const leftFree = !xrHandFrames.left.source;
  const rightFree = !xrHandFrames.right.source;
  if (source.handedness === 'left' && leftFree) return 'left';
  if (source.handedness === 'right' && rightFree) return 'right';
  if (leftFree) return 'left';
  if (rightFree) return 'right';
  return null;
}

function findHandForSource(source: XRInputSource): XrHand | null {
  if (xrHandFrames.left.source === source) return 'left';
  if (xrHandFrames.right.source === source) return 'right';
  return null;
}

// ── HAND-TRACKING HELPERS ──────────────────────────────────────────────────────
// Thumb-tip-to-fingertip squared-distance threshold for grip.* flags. 3cm is
// the common visionOS pinch-contact heuristic; squared so we skip the sqrt.
const XR_GRIP_THRESHOLD_M = 0.03;
const XR_GRIP_THRESHOLD_SQ = XR_GRIP_THRESHOLD_M * XR_GRIP_THRESHOLD_M;

// Quaternion helpers (xyzw convention, matching XRJointPose.orientation).
function quatConj(q: number[]): number[] { return [-q[0], -q[1], -q[2], q[3]]; }
function quatMul(a: number[], b: number[]): number[] {
  return [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
  ];
}

// Always returns a fully-populated record (all 25 keys). Entries are null when
// `XRHand.get(name)` is missing or `frame.getJointPose` returns null for that
// joint. [LAW:no-defensive-null-guards] The nulls here represent data state
// ("joint not tracked right now"), not defensive guards around bugs.
function queryHandJoints(frame: XRFrame, xrHand: XRHand, refSpace: XRReferenceSpace): XrJoints {
  const joints = {} as XrJoints;
  for (const name of XR_JOINT_NAMES) {
    const space = xrHand.get(name);
    const pose = space ? frame.getJointPose(space, refSpace) : null;
    if (!pose) { joints[name] = null; continue; }
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    joints[name] = {
      position: [p.x, p.y, p.z],
      orientation: [o.x, o.y, o.z, o.w],
      radius: pose.radius,
    };
  }
  return joints;
}

// Palm normal points OUT of the palm (away from the back of the hand).
// Derived from wrist, index-finger-metacarpal, pinky-finger-metacarpal.
// Sign convention differs by handedness: the same cross-product ordering
// gives opposite normals for left vs right because the hands are mirrored.
// Null ⟺ any of the three source joints is currently untracked OR the
// metacarpals are collinear with the wrist (degenerate cross product).
function computePalmNormal(joints: XrJoints, hand: XrHand): number[] | null {
  const wrist = joints['wrist'];
  const indexMeta = joints['index-finger-metacarpal'];
  const pinkyMeta = joints['pinky-finger-metacarpal'];
  if (!wrist || !indexMeta || !pinkyMeta) return null;
  const toIndex = sub3(indexMeta.position, wrist.position);
  const toPinky = sub3(pinkyMeta.position, wrist.position);
  // Right hand: cross(toPinky, toIndex) points out of palm.
  // Left  hand: cross(toIndex, toPinky) points out of palm (mirror).
  const raw = hand === 'right' ? cross3(toPinky, toIndex) : cross3(toIndex, toPinky);
  // Reject near-collinear metacarpals: a healthy cross product has |raw|² on
  // the order of (5cm × 5cm)² ≈ 6e-6 m⁴; floor at 1e-12 catches both exact
  // zeros and the noisy unit vectors normalize3 would produce from tiny inputs.
  const lenSq = raw[0]*raw[0] + raw[1]*raw[1] + raw[2]*raw[2];
  if (lenSq < 1e-12) return null;
  return normalize3(raw);
}

// Thumb-tip-to-fingertip geometric grip flags. Outer null ⟺ thumb-tip is
// untracked (no anchor for any distance). Per-flag null ⟺ that specific
// finger-tip is untracked. A tracked finger-tip → boolean contact flag.
function computeGripState(joints: XrJoints): XrGripState | null {
  const thumb = joints['thumb-tip'];
  if (!thumb) return null;
  const flag = (tip: XrJointPose | null): boolean | null => {
    if (!tip) return null;
    const d = sub3(thumb.position, tip.position);
    return dot3(d, d) < XR_GRIP_THRESHOLD_SQ;
  };
  return {
    thumbIndex:  flag(joints['index-finger-tip']),
    thumbMiddle: flag(joints['middle-finger-tip']),
    thumbRing:   flag(joints['ring-finger-tip']),
    thumbPinky:  flag(joints['pinky-finger-tip']),
  };
}

// ── REFERENCE SPACE MANAGEMENT ─────────────────────────────────────────────────
function applyXrViewOffset(): void {
  if (!xrBaseRefSpace) return;
  type XRRigidTransformCtor = new (position: DOMPointInit, orientation?: DOMPointInit) => XRRigidTransform;
  const RigidTransform = (globalThis as unknown as { XRRigidTransform: XRRigidTransformCtor }).XRRigidTransform;
  xrRefSpace = xrBaseRefSpace.getOffsetReferenceSpace(
    new RigidTransform({ x: xrViewOffset.x, y: xrViewOffset.y + xrViewOffsetY, z: xrViewOffset.z })
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 1: UPDATE HAND FRAMES
// ═══════════════════════════════════════════════════════════════════════════════
// Resolve pending sources, update rays and positions for active pinches.

function xrUpdateHandFrames(frame: XRFrame): void {
  // Resolve pending sources: get their first ray and assign to a hand.
  for (let i = xrPendingSources.length - 1; i >= 0; i--) {
    const source = xrPendingSources[i];
    const ray = getXrInputRay(frame, source);
    if (!ray) continue; // no pose yet — keep pending
    xrPendingSources.splice(i, 1);

    // [LAW:one-source-of-truth] Identity-based channel assignment. Drops source
    // if both channels occupied — WebXR spec permits more than two input sources
    // but we only track left/right.
    const hand = assignHandToSource(source);
    if (!hand) continue;
    const pos = getXrHandPosition(frame, source) ?? ray.origin;
    const hf = xrHandFrames[hand];
    hf.tracked = true;
    hf.source = source;
    hf.pinch.active = true;
    hf.pinch.startTime = performance.now();
    hf.pinch.origin = pos;
    hf.pinch.current = pos;
    // [LAW:one-source-of-truth] gazeRay frozen at pinch-start — authoritative for selection.
    hf.gazeRay = { origin: [...ray.origin], dir: [...ray.dir] };
    hf.currentRay = ray;
  }

  // Update current ray and position for all active hands.
  for (const hand of ['left', 'right'] as XrHand[]) {
    const hf = xrHandFrames[hand];
    if (!hf.pinch.active || !hf.source) continue;
    const ray = getXrInputRay(frame, hf.source);
    if (ray) hf.currentRay = ray;
    const pos = getXrHandPosition(frame, hf.source);
    if (pos) hf.pinch.current = pos;
  }

  // Hand-tracking update. Independent of pinch state — a visible, non-pinching
  // hand still produces joint poses. Clear-then-populate: the clear guarantees
  // that when a hand disappears from inputSources, its joint fields become null
  // on the next frame, so stale data can't linger. [LAW:one-source-of-truth]
  // xrHandFrames[hand].joints is the sole store of per-frame joint data;
  // palmNormal and grip are derived here and written atomically with joints.
  for (const hand of ['left', 'right'] as XrHand[]) {
    const hf = xrHandFrames[hand];
    hf.joints = null;
    hf.palmNormal = null;
    hf.grip = null;
    hf.ray = null;
  }
  if (xrRefSpace) {
    for (const source of frame.session.inputSources) {
      // 'none' handedness (e.g. transient gaze input) has no left/right slot.
      // !source.hand means the runtime didn't expose hand tracking for this
      // source — the per-source data itself tells us to skip, no need to
      // consult the session-level xrHandTrackingAvailable flag.
      if (source.handedness === 'none' || !source.hand) continue;
      const hand: XrHand = source.handedness;
      const hf = xrHandFrames[hand];
      const joints = queryHandJoints(frame, source.hand, xrRefSpace);
      hf.joints = joints;
      hf.palmNormal = computePalmNormal(joints, hand);
      hf.grip = computeGripState(joints);
      // [LAW:one-source-of-truth] Advisory hover ray — synthesized always when
      // the two source joints are present. NEVER drives selection (that's
      // gazeRay) and NEVER drives drag (that's currentRay).
      hf.ray = computeAdvisoryRay(joints);
    }
  }
}

// Advisory hand ray from joints. Origin at the index knuckle (feels natural
// in VR — ray emanates from the pointing hand, not the wrist). Direction
// along knuckle−wrist, so the ray points forward past the knuckle and
// rotates with the hand independently of index-finger curl.
function computeAdvisoryRay(joints: XrJoints): XrRay | null {
  const wrist = joints['wrist'];
  const knuckle = joints['index-finger-metacarpal'];
  if (!wrist || !knuckle) return null;
  const dir = normalize3(sub3(knuckle.position, wrist.position));
  if (dir[0] === 0 && dir[1] === 0 && dir[2] === 0) return null;
  return { origin: [...knuckle.position], dir };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 2: DETECT GESTURES
// ═══════════════════════════════════════════════════════════════════════════════
// [LAW:dataflow-not-control-flow] Pure function of current + previous hand state.
// Produces gesture events; no side effects.

function xrDetectGestures(): XrGesture[] {
  const gestures: XrGesture[] = [];
  const leftActive = xrHandFrames.left.pinch.active;
  const rightActive = xrHandFrames.right.pinch.active;
  const bothActive = leftActive && rightActive;
  const prevBoth = xrPrevPinch.left && xrPrevPinch.right;

  const now = performance.now();
  for (const hand of ['left', 'right'] as XrHand[]) {
    const hf = xrHandFrames[hand];
    const wasActive = xrPrevPinch[hand];
    const isActive = hf.pinch.active;

    if (isActive && !wasActive && hf.gazeRay) {
      gestures.push({ kind: 'pinch-start', hand, gazeRay: hf.gazeRay });
    } else if (isActive && wasActive) {
      gestures.push({ kind: 'pinch-hold', hand, dur: now - hf.pinch.startTime });
    } else if (!isActive && wasActive) {
      gestures.push({ kind: 'pinch-end', hand, dur: now - hf.pinch.startTime });
    }

    const prev = xrPrevGestureSnap[hand];

    // Fine-modifier: thumb-to-ring-finger contact edge. grip is null when the
    // thumb-tip or all finger-tips are untracked — skip detection but keep prev
    // so we don't spuriously re-fire 'off' when tracking returns.
    if (hf.grip) {
      const active = hf.grip.thumbRing === true;
      if (active && !prev.fineModifier) gestures.push({ kind: 'fine-modifier-on', hand });
      else if (!active && prev.fineModifier) gestures.push({ kind: 'fine-modifier-off', hand });
      prev.fineModifier = active;
    }

    // Palm orientation: palmNormal · worldUp. Hysteresis band ENTER>0.7, EXIT<0.4
    // prevents flicker when the palm is held near vertical.
    if (hf.palmNormal) {
      const upDot = hf.palmNormal[1];
      const isUp = prev.palmUp ? (upDot > XR_PALM_UP_EXIT) : (upDot > XR_PALM_UP_ENTER);
      if (isUp && !prev.palmUp) gestures.push({ kind: 'palm-up', hand });
      else if (!isUp && prev.palmUp) gestures.push({ kind: 'palm-down', hand });
      prev.palmUp = isUp;
    }

    // Wrist-flick: angular speed of wrist-quaternion delta. Dominant world axis
    // → roll/pitch/yaw bucket (approximation; refine to forearm basis if needed).
    // 2-frame consensus (flickArmed) + 300ms refractory suppresses ringing at
    // the flick peak and prevents a single quick motion firing twice.
    // Gated on !pinch.active — during a drag, rotational motion is a side
    // effect of positioning the attractor, not an intentional flick gesture.
    const wristQuat = hf.joints?.['wrist']?.orientation ?? null;
    let flickSpeed = 0;
    if (wristQuat && prev.wristOrient && !hf.pinch.active) {
      const dtSec = Math.max(0.001, (now - prev.wristTime) / 1000);
      const delta = quatMul(wristQuat, quatConj(prev.wristOrient));
      const w = Math.min(1, Math.abs(delta[3]));
      const angle = 2 * Math.acos(w);
      const sinHalf = Math.sqrt(Math.max(0, 1 - w * w));
      const s = delta[3] < 0 ? -1 : 1;
      const ax = sinHalf > 1e-6 ? (delta[0] * s) / sinHalf : 0;
      const ay = sinHalf > 1e-6 ? (delta[1] * s) / sinHalf : 0;
      const az = sinHalf > 1e-6 ? (delta[2] * s) / sinHalf : 0;
      flickSpeed = angle / dtSec;
      const armed = flickSpeed > XR_FLICK_SPEED_RAD_S;
      if (armed && prev.flickArmed && (now - prev.lastFlickAt) > XR_FLICK_REFRACTORY_MS) {
        const absX = Math.abs(ax), absY = Math.abs(ay), absZ = Math.abs(az);
        const axis: 'roll' | 'pitch' | 'yaw' =
          absX >= absY && absX >= absZ ? 'pitch' :
          absY >= absZ                 ? 'yaw'   :
                                         'roll';
        const comp = axis === 'pitch' ? ax : axis === 'yaw' ? ay : az;
        const sign: 1 | -1 = comp >= 0 ? 1 : -1;
        gestures.push({ kind: 'wrist-flick', hand, axis, sign });
        prev.lastFlickAt = now;
      }
      prev.flickArmed = armed;
    } else {
      prev.flickArmed = false;
    }
    prev.wristOrient = wristQuat ? [...wristQuat] : null;
    prev.wristTime = now;

    // Per-hand per-frame snapshot. Zero-cost when no subscriber — the recorder
    // (or any future HUD / chart) subscribes only while active.
    if (chanXrSnap.subscribers.size > 0) {
      metrics.emit(chanXrSnap, {
        hand,
        handTracked: hf.joints !== null,
        pinching: hf.pinch.active,
        palmDot: hf.palmNormal ? hf.palmNormal[1] : null,
        palmUp: prev.palmUp,
        fineModifier: prev.fineModifier,
        flickSpeed,
        grip: hf.grip,
      });
    }
  }

  // Two-hand cooperative gestures.
  if (bothActive && !prevBoth) {
    gestures.push({ kind: 'two-hand-pinch-start' });
  } else if (!bothActive && prevBoth) {
    gestures.push({ kind: 'two-hand-pinch-end' });
  }

  // Snapshot for next frame's edge detection.
  xrPrevPinch.left = leftActive;
  xrPrevPinch.right = rightActive;

  // Emit each gesture on the metrics bus. Guarded so no payloads or per-event
  // property reads happen when nobody is subscribed. Two-hand gestures have no
  // hand field — encode as null.
  if (chanXrGesture.subscribers.size > 0) {
    for (const g of gestures) {
      metrics.emit(chanXrGesture, { hand: 'hand' in g ? g.hand : null, gesture: g });
    }
  }

  return gestures;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 3: TRANSITION INTERACTION STATES
// ═══════════════════════════════════════════════════════════════════════════════
// Consumes gesture events and transitions per-hand InteractionState.

function xrTransitionInteractions(gestures: XrGesture[], _frame: XRFrame): void {
  for (const g of gestures) {
    switch (g.kind) {
      case 'pinch-start': {
        // Enter pending window. Commit happens via two-hand-pinch-start
        // (simultaneous → zoom) OR via the deadline pass below (sequential →
        // single-hand attractor). No immediate dragging start.
        xrSetInteraction(g.hand, {
          kind: 'pending',
          deadline: performance.now() + XR_SIMUL_WINDOW_MS,
        });
        break;
      }
      case 'two-hand-pinch-start': {
        // Simultaneous pinch-start detected (both pinches within window →
        // both hands are still 'pending'). Convert both to two-hand-scale.
        // If either hand has already committed to 'dragging', the pinches
        // were sequential — leave the committed hand alone and let the newly
        // pending hand deadline-commit to its own attractor.
        if (xrInteractions.left.kind === 'pending' && xrInteractions.right.kind === 'pending') {
          const d = sub3(xrHandFrames.left.pinch.current, xrHandFrames.right.pinch.current);
          twoHandState.startDistance = Math.max(0.01, Math.sqrt(dot3(d, d)));
          twoHandState.startOffset = { ...xrViewOffset };
          xrSetInteraction('left', { kind: 'two-hand-scale' });
          xrSetInteraction('right', { kind: 'two-hand-scale' });
        }
        break;
      }
      case 'two-hand-pinch-end': {
        // End scale on both hands. No auto-promote of the remaining pinching
        // hand — user must release and re-pinch to create an attractor.
        if (xrInteractions.left.kind === 'two-hand-scale') xrSetInteraction('left', { kind: 'idle' });
        if (xrInteractions.right.kind === 'two-hand-scale') xrSetInteraction('right', { kind: 'idle' });
        break;
      }
      case 'pinch-end': {
        xrEndInteraction(g.hand);
        break;
      }
      case 'pinch-hold':
        break;
      // Stubs — consumed when hand-tracking features land:
      case 'fine-modifier-on':  xrTuning.gainMultiplier = 0.1; break;
      case 'fine-modifier-off': xrTuning.gainMultiplier = 1.0; break;
      case 'palm-up':
      case 'palm-down':
      case 'wrist-flick':
        break;
    }
  }

  // Deadline pass: any hand still 'pending' whose window has elapsed commits
  // to single-hand dragging. Runs every frame — same code path whether the
  // hand is fresh-pending (stays pending) or past-deadline (promotes).
  // [LAW:dataflow-not-control-flow] Same work every frame; the state decides.
  const now = performance.now();
  for (const hand of ['left', 'right'] as XrHand[]) {
    const ix = xrInteractions[hand];
    if (ix.kind === 'pending' && now >= ix.deadline) {
      // [LAW:single-enforcer] UI selection wins over sim attractor on the same
      // pinch. xrUiStep set xrUiClaimed[hand] at the pinch-start frame; if true,
      // drop the pending pinch instead of starting a sim drag. The pinch will
      // continue feeding xrUiStep until pinch-end.
      if (xrUiClaimed[hand]) {
        xrSetInteraction(hand, { kind: 'idle' });
      } else {
        xrSetInteraction(hand, {
          kind: 'dragging',
          handOrigin: [...xrHandFrames[hand].pinch.origin],
          hasSample: false,
        });
      }
    }
  }
}

// Clean up when a hand releases its pinch.
function xrEndInteraction(hand: XrHand): void {
  const ix = xrInteractions[hand];
  switch (ix.kind) {
    case 'dragging':
      setSimulationInteractionInactive();
      releaseAttractor(XR_ATTRACTOR_POINTER_ID[hand]);
      break;
    case 'pending':
    case 'two-hand-scale':
    case 'idle':
      break;
  }
  xrSetInteraction(hand, { kind: 'idle' });
  // [LAW:one-source-of-truth] Release ray has now been consumed (if needed by
  // the 'pressing' case above). Final hand-frame cleanup here — guarded on
  // !pinch.active so two-hand-pinch-start (which calls xrEndInteraction with
  // pinches still active) doesn't stomp live channels.
  const hf = xrHandFrames[hand];
  if (!hf.pinch.active) {
    hf.source = null;
    hf.gazeRay = null;
    hf.currentRay = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 4: APPLY SIDE EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════
// Reads current InteractionState + HandFrame, produces outputs (state mutations,
// reference space changes, UI state for rendering).

function xrApplyInteractions(_frame: XRFrame): void {
  // Two-hand scale: both hands cooperating.
  if (xrInteractions.left.kind === 'two-hand-scale' && xrInteractions.right.kind === 'two-hand-scale') {
    const d = sub3(xrHandFrames.left.pinch.current, xrHandFrames.right.pinch.current);
    const dist = Math.sqrt(dot3(d, d));
    if (twoHandState.startDistance >= 0.01) {
      const ratio = dist / twoHandState.startDistance;
      xrViewOffset.z = Math.max(-200, Math.min(-1, twoHandState.startOffset.z / ratio));
      applyXrViewOffset();
    }
    return;
  }

  // Per-hand sim interaction — attractor (physics) / force injection (fluid).
  let anySimDrag = false;
  for (const hand of ['left', 'right'] as XrHand[]) {
    const ix = xrInteractions[hand];
    const hf = xrHandFrames[hand];
    if (ix.kind !== 'dragging' || !hf.source) continue;
    const ray = hf.currentRay;
    if (!ray) continue;

    anySimDrag = true;
    const worldPoint = state.mode === 'fluid'
      ? intersectRayWithPlane(ray.origin, ray.dir, 0)
      : closestPointOnRayToOrigin(ray.origin, ray.dir);
    if (!worldPoint) {
      setSimulationInteractionInactive();
      ix.hasSample = false;
      continue;
    }
    state.mouse.down = true;
    state.mouse.worldX = worldPoint[0];
    state.mouse.worldY = worldPoint[1];
    state.mouse.worldZ = worldPoint[2];
    if (state.mode === 'fluid') {
      const uv = worldToFluidUV(worldPoint);
      if (!uv) { setSimulationInteractionInactive(); ix.hasSample = false; continue; }
      state.mouse.dx = ix.hasSample ? (uv[0] - state.mouse.x) * 10 : 0;
      state.mouse.dy = ix.hasSample ? (uv[1] - state.mouse.y) * 10 : 0;
      state.mouse.x = uv[0];
      state.mouse.y = uv[1];
    } else {
      state.mouse.dx = 0; state.mouse.dy = 0;
      state.mouse.x = worldPoint[0]; state.mouse.y = worldPoint[1];
    }
    if (state.mode === 'physics') {
      const pid = XR_ATTRACTOR_POINTER_ID[hand];
      if (state.pointerToAttractor.has(pid)) {
        moveAttractor(pid, worldPoint);
      } else {
        createAttractor(pid, worldPoint);
      }
    }
    ix.hasSample = true;
  }

  // [LAW:single-enforcer] If no sim drag is active, ensure sim interaction state is clean.
  if (!anySimDrag) {
    // Only deactivate if we were previously active (avoid clobbering desktop mouse).
    if (state.xrEnabled && state.mouse.down) setSimulationInteractionInactive();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
// Called once per XR frame. Runs all four stages in order.

// Extract head pose in current xrRefSpace as the AnchorContext shape.
// Returns null while the viewer pose is unavailable (e.g. tracking dropouts).
function extractXrHeadPose(frame: XRFrame): { position: [number, number, number]; orientation: [number, number, number, number] } | null {
  if (!xrRefSpace) return null;
  const pose = frame.getViewerPose(xrRefSpace);
  if (!pose) return null;
  const t = pose.transform;
  return {
    position: [t.position.x, t.position.y, t.position.z],
    orientation: [t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w],
  };
}

function xrInputStep(frame: XRFrame): void {
  xrUpdateHandFrames(frame);
  // [LAW:single-enforcer] xrUiStep runs BEFORE gesture/transition stages so
  // its claim flag is current by the time xrTransitionInteractions's deadline
  // pass decides whether to promote a pending pinch to a sim attractor drag.
  // [LAW:dataflow-not-control-flow] Always called; with no active layout it
  // returns idle/empty. No "if UI active" branch around it.
  const headPose = extractXrHeadPose(frame);
  const uiResult = xrUiStep(xrUiRegistry, xrHandFrames, xrUiPrev, { hands: xrHandFrames, headPose }, xrTuning, 16);
  xrUiApplyEffects(uiResult.sideEffects, xrUiRegistry);
  xrUiPrev = uiResult.next;
  xrUiRenderList = uiResult.renderList;
  xrUiClaimed.left  = uiHandClaimed(uiResult.next.states.left);
  xrUiClaimed.right = uiHandClaimed(uiResult.next.states.right);

  const gestures = xrDetectGestures();
  xrTransitionInteractions(gestures, frame);
  xrApplyInteractions(frame);
}

// Called by selectend to release a hand's pinch state.
// [LAW:one-source-of-truth] Leaves source/gazeRay/currentRay intact so the
// next xrFrame's gesture pipeline (pinch-end → xrEndInteraction) can use the
// release ray for the button-press commit hit test. Final hand-frame cleanup
// happens in xrEndInteraction once the release ray has been consumed.
function xrOnSelectEnd(source: XRInputSource): void {
  const hand = findHandForSource(source);
  if (hand) {
    const hf = xrHandFrames[hand];
    hf.pinch.active = false;
    hf.tracked = false;
  }
  // Also remove from pending if it never resolved.
  const pendingIdx = xrPendingSources.indexOf(source);
  if (pendingIdx >= 0) xrPendingSources.splice(pendingIdx, 1);
}

// Reset all gesture state (called on session end).
function xrResetInputState(): void {
  xrPendingSources.length = 0;
  xrHandFrames.left = makeIdleHandFrame('left');
  xrHandFrames.right = makeIdleHandFrame('right');
  xrSetInteraction('left', { kind: 'idle' });
  xrSetInteraction('right', { kind: 'idle' });
  xrPrevPinch.left = false;
  xrPrevPinch.right = false;
  xrPrevGestureSnap.left = makeGestureSnapshot();
  xrPrevGestureSnap.right = makeGestureSnapshot();
  xrTuning.gainMultiplier = 1.0;
  xrUiPrev = xrUiMakeIdlePrev();
  xrUiRenderList = [];
  xrUiClaimed.left = false;
  xrUiClaimed.right = false;
  setSimulationInteractionInactive();
  releaseAttractor(XR_ATTRACTOR_POINTER_ID.left);
  releaseAttractor(XR_ATTRACTOR_POINTER_ID.right);
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
      optionalFeatures: ['layers', 'local-floor', 'hand-tracking'],
    });
    // [LAW:one-source-of-truth] enabledFeatures is the WebXR-spec synchronous report
    // of which optional features the runtime granted. Missing/empty → false, which
    // is the correct conservative default ([LAW:no-defensive-null-guards]).
    const enabledFeatures = xrSession.enabledFeatures;
    xrHandTrackingAvailable = !!enabledFeatures && enabledFeatures.includes('hand-tracking');
    logInfo('xr', 'session acquired', {
      environmentBlendMode: (xrSession as unknown as { environmentBlendMode?: string }).environmentBlendMode,
      interactionMode: (xrSession as unknown as { interactionMode?: string }).interactionMode,
      visibilityState: (xrSession as unknown as { visibilityState?: string }).visibilityState,
      handTracking: xrHandTrackingAvailable,
      enabledFeatures,
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

    // [LAW:one-source-of-truth] Store the base reference space before any offset.
    // The gesture system rebuilds xrRefSpace from this base + xrViewOffset each frame
    // that the two-hand scale gesture modifies the offset.
    xrBaseRefSpace = xrRefSpace!;
    xrViewOffsetY = gotFloor ? 1.6 : 0;
    xrViewOffset.x = 0;
    xrViewOffset.y = 0;
    xrViewOffset.z = -5;
    applyXrViewOffset();

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
    // [LAW:single-enforcer] All XR input enters through xrPendingSources.
    // selectstart queues a source; xrUpdateHandFrames resolves it to a hand.
    // selectend releases the hand via xrOnSelectEnd.
    xrSession.addEventListener('selectstart', (event) => {
      xrPendingSources.push((event as XRInputSourceEvent).inputSource);
    });
    xrSession.addEventListener('selectend', (event) => {
      xrOnSelectEnd((event as XRInputSourceEvent).inputSource);
    });

    btn.textContent = 'Exit VR';
    state.xrEnabled = true;
    currentGpuPhase = 'xr:awaiting first frame';

    // Auto-register debug widget fixture so the renderer always has something
    // visible without a console snippet. Expanded for ticket .19 to cover all
    // 9 widget kinds — two rows, the new kinds in the second row. Remove when
    // ticket .13 lands the real clipboard.
    const idQuat: [number, number, number, number] = [0, 0, 0, 1];
    const widgetSize = { x: 0.16, y: 0.06 };
    const widgetPad  = { x: 0.02, y: 0.02 };
    xrUiRegistry.layouts.set('debug', {
      id: 'debug-panel', kind: 'panel',
      // head-hud anchor pins the debug fixture ~70cm in front of the user's
      // face so it stays interactive regardless of xrViewOffset (the
      // simulation pan/zoom). World-anchored at z=-0.6 it appeared 4.4m
      // away because the default xrViewOffset.z = -5 puts the camera 5m
      // back from world origin — widgets shrunk to pixel-sized squares
      // (per first XR session screenshots). Offset y=-0.15 drops the panel
      // below eye-line so it doesn't block the simulation.
      anchor: { kind: 'head-hud', distance: 0.7,
                offset: { position: [0, -0.15, 0], orientation: idQuat } },
      size: { x: 1.1, y: 0.5 },
      children: [
        {
          id: 'debug-row-1', kind: 'group', layout: 'row',
          children: [
            { id: 'debug-s1', kind: 'slider', binding: 'physics.G',
              orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' },
              visualSize: widgetSize, hitPadding: widgetPad },
            { id: 'debug-b1', kind: 'button', binding: 'preset.physics.Default',
              style: 'primary', visualSize: widgetSize, hitPadding: widgetPad },
            { id: 'debug-r1', kind: 'readout', binding: 'physics.G',
              visualSize: widgetSize, hitPadding: widgetPad },
            { id: 'debug-d1', kind: 'dial', binding: 'physics.softening',
              interaction: { kind: 'direct-drag', axis: 'x' },
              visualSize: widgetSize, hitPadding: widgetPad },
          ],
        },
        {
          id: 'debug-row-2', kind: 'group', layout: 'row',
          children: [
            { id: 'debug-tg1', kind: 'toggle', binding: 'app.paused', style: 'switch',
              visualSize: widgetSize, hitPadding: widgetPad },
            { id: 'debug-st1', kind: 'stepper', binding: 'physics.count', step: 1000,
              visualSize: widgetSize, hitPadding: widgetPad },
            { id: 'debug-en1', kind: 'enum-chips', binding: 'physics.distribution',
              visualSize: widgetSize, hitPadding: widgetPad },
            { id: 'debug-pt1', kind: 'preset-tile', binding: 'preset.physics.Spiral Galaxy',
              visualSize: widgetSize, hitPadding: widgetPad },
            { id: 'debug-ct1', kind: 'category-tile', targetTabId: 'physics',
              summary: {},
              visualSize: widgetSize, hitPadding: widgetPad },
          ],
        },
      ],
    });

    // Bimanual clipboard — first real XR panel (ticket .13). Held on the non-
    // dominant hand; the dominant hand pinches widgets.
    //
    // The anchor is stored by reference in clipboardAnchor so the offset can
    // be live-tweaked from DevTools (window.__xrUi.registry.layouts.get('clipboard').anchor)
    // without re-deploying. Expect several iterations of on-headset tuning
    // before these values feel right.
    //
    // Position: +0.15m "up" in wrist frame to lift the panel above the arm,
    // -0.10m along wrist-local Z so it's on the palm side.
    // Orientation: ~60° rotation around wrist-local X so the panel tilts up
    // toward the user instead of lying flat along the forearm.
    const tiltX = Math.sin(Math.PI * 0.33);
    const tiltW = Math.cos(Math.PI * 0.33);
    const clipboardOffset = {
      position: [0.00, 0.15, -0.10] as [number, number, number],
      orientation: [tiltX, 0, 0, tiltW] as [number, number, number, number],
    };
    const clipboardAnchor: Anchor = { kind: 'held', hand: XR_PANEL_HAND, offset: clipboardOffset };
    const sliderSize = { x: 0.17, y: 0.030 };
    const readoutSize = { x: 0.18, y: 0.025 };
    xrUiRegistry.layouts.set('clipboard', {
      id: 'clipboard-panel', kind: 'panel',
      anchor: clipboardAnchor,
      size: { x: 0.20, y: 0.28 },
      children: [{
        id: 'clipboard-col', kind: 'group', layout: 'column', gap: 0.015,
        children: [
          // Title readout uses a concrete continuous binding. app.mode is an
          // EnumBinding and the MVP readout renderer formats continuous values.
          { id: 'clipboard-title', kind: 'readout', binding: 'physics.G',
            visualSize: readoutSize, hitPadding: { x: 0, y: 0 } },
          { id: 'clipboard-G', kind: 'slider', binding: 'physics.G',
            orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' },
            visualSize: sliderSize, hitPadding: HIG_DEFAULTS.defaultHitPadding },
          { id: 'clipboard-soft', kind: 'slider', binding: 'physics.softening',
            orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' },
            visualSize: sliderSize, hitPadding: HIG_DEFAULTS.defaultHitPadding },
          { id: 'clipboard-int', kind: 'slider', binding: 'physics.interactionStrength',
            orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' },
            visualSize: sliderSize, hitPadding: HIG_DEFAULTS.defaultHitPadding },
        ],
      }],
    });
    // Default to the clipboard. The 'debug' layout remains registered — switch
    // via window.__xrUi-style inspection tools when the renderer test fixture
    // is needed.
    xrUiRegistry.activeLayoutId = 'clipboard';

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
      xrBaseRefSpace = null;
      xrBinding = null;
      xrLayer = null;
      xrHandTrackingAvailable = false;
      state.xrEnabled = false;
      xrFrameCount = 0;
      currentGpuPhase = 'desktop';
      syncRenderConfig(canvasFormat, 1);
      xrResetInputState();
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
  // [LAW:single-enforcer] Same prune + marker tick as the desktop loop — XR must see the same visual state.
  pruneAttractors(currentSimStep());
  const xrFrameDeltaMs = lastFrameTimestamp >= 0 ? time - lastFrameTimestamp : 16.7;
  lastFrameTimestamp = time;
  tickMarkers(Math.min(0.05, xrFrameDeltaMs * 0.001) * state.fx.timeScale * currentTimeDirection());

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

    // [LAW:single-enforcer] Four-stage input pipeline:
    // HandFrames → Gestures → InteractionState transitions → side effects.
    xrInputStep(xrFrameData);

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
      const sceneView = postFx.scene[sceneIdx].createView();
      sim.render(encoder, sceneView, null, viewIndex);

      // [LAW:dataflow-not-control-flow] Always run the UI render pass — empty
      // render list → zero draw calls → effectively a no-op. Lazy-init the
      // renderer on first frame so it doesn't allocate when XR is never used.
      if (!xrWidgetRenderer) {
        xrWidgetCameraBuffer = device.createBuffer({
          label: 'xr-widgets-camera',
          size: CAMERA_STRIDE * 2,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        xrWidgetRenderer = createXrWidgetRenderer(device, xrWidgetCameraBuffer, () => {
          const aspect = width / height;
          return getCameraUniformData(aspect);
        });
      }
      currentGpuPhase = `xr:frame:${xrFrameCount}:xr-widgets(eye=${viewIndex})`;
      xrWidgetRenderer.draw(encoder, sceneView, postFx.scene[sceneIdx].format, viewIndex, xrUiRenderList);

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
// Last rAF timestamp — drives the adaptive-chunk feedback in debug skip. Seeded to -1 so the first
// frame's delta isn't a garbage huge number that would shrink the chunk unnecessarily.
let lastFrameTimestamp = -1;

// --- GPU profiling ---
// Two paths: GPU timestamp queries give named per-bucket breakdowns when
// supported. JS-side onSubmittedWorkDone fallback gives total frame GPU time.
let gpuFrameMs = 0;
const GPU_TIMING_BUCKETS = [
  'pmDepositConvert',
  'outerVCycle',
  'boundarySample',
  'innerVCycle',
  'starInterpolate',
  'gasInterpolatePressure',
  'starGasIntegrate',
  'starsRender',
  'gasRender',
  'bloomComposite',
] as const;
type GpuTimingBucket = typeof GPU_TIMING_BUCKETS[number];
// [LAW:one-source-of-truth] This registry is the only source for GPU timing
// query indices, public bucket names, and the zero-valued fallback shape.
const GPU_TIMING_INDEX: Record<GpuTimingBucket, number> = Object.fromEntries(
  GPU_TIMING_BUCKETS.map((bucket, index) => [bucket, index])
) as Record<GpuTimingBucket, number>;
function makeZeroGpuTimingDetail(): Record<GpuTimingBucket, number> {
  return Object.fromEntries(GPU_TIMING_BUCKETS.map(bucket => [bucket, 0])) as Record<GpuTimingBucket, number>;
}
let gpuTimingDetail: Record<GpuTimingBucket, number> = makeZeroGpuTimingDetail();
let activeGpuTimingBuckets = new Set<GpuTimingBucket>();
let gpuTimingFrameActive = false;
let profilingPending = false;
let lastProfileTime = 0;
const PROFILE_INTERVAL_MS = 2000;

// GPU timestamp query state (null if unsupported)
const GPU_TS_COUNT = GPU_TIMING_BUCKETS.length * 2; // begin/end pair per bucket
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

function beginGpuTimingFrame() {
  activeGpuTimingBuckets = new Set<GpuTimingBucket>();
  gpuTimingFrameActive = true;
}

type TimestampWrites = { querySet: GPUQuerySet; beginningOfPassWriteIndex?: number; endOfPassWriteIndex?: number };

function tsWrites(bucket: GpuTimingBucket): TimestampWrites | undefined {
  if (!gpuTs || !gpuTimingFrameActive) return undefined;
  activeGpuTimingBuckets.add(bucket);
  const slotPair = GPU_TIMING_INDEX[bucket];
  return { querySet: gpuTs.querySet, beginningOfPassWriteIndex: slotPair * 2, endOfPassWriteIndex: slotPair * 2 + 1 };
}

function tsBegin(bucket: GpuTimingBucket): TimestampWrites | undefined {
  if (!gpuTs || !gpuTimingFrameActive) return undefined;
  activeGpuTimingBuckets.add(bucket);
  return { querySet: gpuTs.querySet, beginningOfPassWriteIndex: GPU_TIMING_INDEX[bucket] * 2 };
}

function tsEnd(bucket: GpuTimingBucket): TimestampWrites | undefined {
  if (!gpuTs || !gpuTimingFrameActive) return undefined;
  activeGpuTimingBuckets.add(bucket);
  return { querySet: gpuTs.querySet, endOfPassWriteIndex: GPU_TIMING_INDEX[bucket] * 2 + 1 };
}

function resolveTimestamps(encoder: GPUCommandEncoder, now: number) {
  gpuTimingFrameActive = false;
  if (!gpuTs || gpuTs.pending || now - lastProfileTime < PROFILE_INTERVAL_MS) return;
  const activeBuckets = Array.from(activeGpuTimingBuckets);
  if (activeBuckets.length === 0) return;
  lastProfileTime = now;
  encoder.resolveQuerySet(gpuTs.querySet, 0, GPU_TS_COUNT, gpuTs.resolveBuf, 0);
  encoder.copyBufferToBuffer(gpuTs.resolveBuf, 0, gpuTs.stagingBuf, 0, GPU_TS_COUNT * 8);
  gpuTs.pending = true;
  const ts = gpuTs;
  device.queue.onSubmittedWorkDone().then(() => {
    ts.stagingBuf.mapAsync(GPUMapMode.READ).then(() => {
      // [LAW:one-source-of-truth] GPU timestamp queries are unsigned 64-bit counters.
      // BigUint64Array avoids negative durations if the high bit is ever set.
      const ns = new BigUint64Array(ts.stagingBuf.getMappedRange().slice(0));
      ts.stagingBuf.unmap();
      ts.pending = false;
      const toMs = (a: bigint, b: bigint) => b > a ? Number(b - a) / 1_000_000 : 0;
      const detail = makeZeroGpuTimingDetail();
      let first = 0n;
      let last = 0n;
      for (const bucket of activeBuckets) {
        const idx = GPU_TIMING_INDEX[bucket] * 2;
        const begin = ns[idx];
        const end = ns[idx + 1];
        detail[bucket] = toMs(begin, end);
        if (begin > 0n && (first === 0n || begin < first)) first = begin;
        if (end > last) last = end;
      }
      gpuTimingDetail = detail;
      gpuFrameMs = first > 0n && last > first ? Number(last - first) / 1_000_000 : 0;
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
  const hasDetailedTiming = GPU_TIMING_BUCKETS.some(bucket => d[bucket] > 0);
  const gpuDetail = hasDetailedTiming
    ? ` (PM:${d.pmDepositConvert.toFixed(1)} V:${(d.outerVCycle + d.innerVCycle).toFixed(1)} R:${(d.starsRender + d.gasRender).toFixed(1)} P:${d.bloomComposite.toFixed(1)})`
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
  // [LAW:single-enforcer] Bind group is owned by ensureHdrTargets — allocate-on-resize, reuse-per-frame.
  const pass = encoder.beginRenderPass({ colorAttachments: [{
    view: postFx.sceneViews[currSceneIdx],
    clearValue: DEFAULT_CLEAR_COLOR,
    loadOp: 'clear',
    storeOp: 'store',
  }]});
  pass.setPipeline(postFx.fadePipeline!);
  pass.setBindGroup(0, postFx.fadeBGs[prevSceneIdx]);
  pass.draw(3);
  pass.end();
}

function runBloomChain(encoder: GPUCommandEncoder, timingBucket?: GpuTimingBucket) {
  const fx = state.fx;
  // Downsample chain: scene → mip0 → mip1 → ... → mipN
  const sceneIdx = postFx.sceneIdx;
  for (let i = 0; i < BLOOM_LEVELS; i++) {
    const src = i === 0 ? postFx.scene[sceneIdx] : postFx.bloomMips[i - 1];
    const p = postFx.downsampleParams[i];
    p[0] = 1.0 / src.width; p[1] = 1.0 / src.height;
    p[2] = fx.bloomThreshold; p[3] = i === 0 ? 1.0 : 0.0;
    device.queue.writeBuffer(postFx.downsampleUBO[i], 0, p);
    // [LAW:single-enforcer] downsampleBGs cache layout: [0]=mip0 reading scene[0], [1]=mip0 reading scene[1],
    // [2..BLOOM_LEVELS]=mipK reading mipK-1. Keyed from (sceneIdx, i) here.
    const bg = postFx.downsampleBGs[i === 0 ? sceneIdx : i + 1];
    const bTsw = timingBucket && i === 0 ? tsBegin(timingBucket) : undefined;
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: postFx.bloomMipViews[i],
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      ...(bTsw ? { timestampWrites: bTsw } : {}),
    });
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
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: postFx.bloomMipViews[i - 1],
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'load',
      storeOp: 'store',
    }]});
    pass.setPipeline(postFx.upsamplePipelineAdditive!);
    pass.setBindGroup(0, postFx.upsampleBGs[i]);
    pass.draw(3);
    pass.end();
  }
}

function runComposite(
  encoder: GPUCommandEncoder,
  finalView: GPUTextureView,
  finalFormat: GPUTextureFormat,
  viewport: number[] | null = null,
  timingBucket?: GpuTimingBucket
) {
  const fx = state.fx;
  const tc = getThemeColors();
  const buf = postFx.compositeParams;
  buf[0] = fx.bloomIntensity;
  buf[1] = fx.exposure;
  buf[2] = fx.vignette;
  buf[3] = fx.chromaticAberration;
  buf[4] = fx.grading;
  // f32 5..7 are padding.
  buf[8] = tc.primary[0]; buf[9] = tc.primary[1]; buf[10] = tc.primary[2];
  // pad 11
  buf[12] = tc.accent[0]; buf[13] = tc.accent[1]; buf[14] = tc.accent[2];
  // pad 15
  device.queue.writeBuffer(postFx.compositeUBO!, 0, buf);

  const pipeline = ensureCompositePipeline(finalFormat);
  // [LAW:single-enforcer] compositeBGs cache is indexed by scene ping-pong slot; allocate-on-resize, reuse-per-frame.
  const bg = postFx.compositeBGs[postFx.sceneIdx];
  const pTsw = timingBucket ? tsEnd(timingBucket) : undefined;
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

  // Adaptive-chunk feedback: use the gap since the previous rAF as a proxy for "is the GPU keeping up?"
  // When a heavy frame pushes delta over ~20ms, the adaptive chunk shrinks next frame; when we have
  // headroom (delta < 14ms), it grows. This is the only place we measure frame pacing, so the feedback
  // decision stays in one place (single-enforcer).
  const frameDeltaMs = lastFrameTimestamp >= 0 ? now - lastFrameTimestamp : 16.7;
  if (lastFrameTimestamp >= 0) {
    updateAdaptiveChunk(frameDeltaMs);
  }
  lastFrameTimestamp = now;

  refreshThemeColors(now);
  resizeCanvas();
  // [LAW:single-enforcer] Attractor lifecycle is updated here, before any sim/compute/composite runs,
  // so mode switches can't leak dead attractors into the array or render loop.
  pruneAttractors(currentSimStep());

  // [LAW:single-enforcer] Markers tick once per visual frame, with dt bounded to kill lag-spike
  // teleports. timeScale + timeDirection make the swarm track the simulation's sense of time.
  tickMarkers(Math.min(0.05, frameDeltaMs * 0.001) * state.fx.timeScale * currentTimeDirection());

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
    beginGpuTimingFrame();
    const encoder = device.createCommandEncoder();

    // Debug stepping/skipping and normal play both funnel through runDebugCompute so the
    // "when do we dispatch compute" decision is owned in one place.
    runDebugCompute(sim, encoder);
    updateDebugPanel();

    const prevIdx = postFx.sceneIdx;
    const currIdx = 1 - prevIdx;
    postFx.sceneIdx = currIdx;

    runFadePass(encoder, prevIdx, currIdx);

    sim.render(encoder, postFx.sceneViews[currIdx], null);

    runBloomChain(encoder, 'bloomComposite');
    const swapchainView = context.getCurrentTexture().createView();
    runComposite(encoder, swapchainView, canvasFormat, null, 'bloomComposite');

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
    const toSave = { mode: state.mode, colorTheme: state.colorTheme, camera: state.camera, fx: state.fx, debug: state.debug, ...modeSnapshot };
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
    if (parsed.debug) Object.assign(state.debug, parsed.debug);
    syncThemeTransition(state.colorTheme);
  } catch (e) { /* ignore parse errors — start fresh */ }
}

function syncUIFromState() {
  // Activate correct tab
  document.querySelectorAll<HTMLElement>('.mode-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === state.mode));
  document.querySelectorAll<HTMLElement>('.param-group').forEach(g =>
    g.classList.toggle('active', g.dataset.mode === state.mode));
  document.querySelectorAll<HTMLElement>('.debug-panel').forEach(g =>
    g.classList.toggle('active', g.dataset.mode === state.mode));

  // Sync all sliders and dropdowns
  for (const modeStr of Object.keys(PARAM_DEFS)) {
    const mode = modeStr as SimMode;
    const container = document.getElementById(`params-${mode}`)!;
    const params = modeParams(mode);
    container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(input => {
      const key = input.dataset.key!;
      if (key && key in params) {
        const paramDef = findParamDef(mode, key);
        const realVal = Number(params[key]);
        input.value = (paramDef?.logScale && paramDef.min !== undefined && paramDef.max !== undefined)
          ? String(realToLogTick(realVal, paramDef.min, paramDef.max))
          : String(params[key]);
        const valueSpan = input.parentElement?.querySelector('.control-value');
        if (valueSpan) valueSpan.textContent = formatValueWithMax(realVal, paramDef);
      }
    });
    container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => {
      const key = input.dataset.key!;
      if (key && key in params) input.checked = Boolean(params[key]);
    });
    container.querySelectorAll<HTMLSelectElement>('select').forEach(sel => {
      const key = sel.dataset.key!;
      if (key && key in params) sel.value = String(params[key]);
    });
  }

  // Sync theme buttons
  document.querySelectorAll<HTMLButtonElement>('#theme-presets .preset-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.theme === state.colorTheme));

  // Sync XR debug-log checkbox + subscription to loaded state.
  const xrLogToggle = document.getElementById('toggle-xr-log') as HTMLInputElement | null;
  if (xrLogToggle) xrLogToggle.checked = state.debug.xrLog;
  setXrDebugLogging(state.debug.xrLog);

  // Rebuild shape params for current parametric shape
  rebuildShapeParams();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BINDING REGISTRATION (parallel data source for the new XR widget system)
// ═══════════════════════════════════════════════════════════════════════════════
// [LAW:one-source-of-truth] Each Binding read/writes the canonical state field directly.
// The DOM controls also write the same fields — both paths converge on the same state.
// No widget consumes these bindings yet (that lands in ticket .10+); for now this is a
// parallel descriptor tree the future widget layer will compose against.
// [LAW:one-way-deps] bindings.ts knows nothing about main.ts; we register from here
// using closures that capture state and mode-helper functions.
function initBindings(): void {
  // Continuous + enum bindings derived from PARAM_DEFS. id = `${mode}.${key}`.
  for (const mode of Object.keys(PARAM_DEFS) as SimMode[]) {
    for (const section of PARAM_DEFS[mode]) {
      // Dynamic sections (parametric shape params) are rebuilt at runtime; skip them
      // here — a follow-up ticket can register them from SHAPE_PARAMS metadata.
      if (section.dynamic) continue;
      for (const param of section.params) {
        if (param.type === 'dropdown') {
          bindingRegistry.register({
            kind: 'enum',
            id: `${mode}.${param.key}`,
            label: param.label,
            group: mode,
            get: () => String(modeParams(mode)[param.key]),
            set: (v) => {
              const target = modeParams(mode);
              const current = target[param.key];
              target[param.key] = typeof current === 'number' ? Number(v) : v;
            },
            options: (param.options ?? []).map(o => ({ value: String(o), label: String(o) })),
          });
        } else if (param.type === 'toggle') {
          bindingRegistry.register({
            kind: 'toggle',
            id: `${mode}.${param.key}`,
            label: param.label,
            group: mode,
            get: () => Boolean(modeParams(mode)[param.key]),
            set: (v) => { modeParams(mode)[param.key] = v; },
          });
        } else if (param.min !== undefined && param.max !== undefined) {
          bindingRegistry.register({
            kind: 'continuous',
            id: `${mode}.${param.key}`,
            label: param.label,
            group: mode,
            get: () => Number(modeParams(mode)[param.key]),
            set: (v) => { modeParams(mode)[param.key] = v; },
            range: { min: param.min, max: param.max },
            step: param.step,
            scale: param.logScale ? 'log' : 'linear',
          });
        }
      }
    }
  }

  // Preset actions. id = `preset.${mode}.${name}`. group = 'presets'.
  for (const mode of Object.keys(PRESETS) as SimMode[]) {
    for (const presetName of Object.keys(PRESETS[mode])) {
      bindingRegistry.register({
        kind: 'action',
        id: `preset.${mode}.${presetName}`,
        label: presetName,
        group: 'presets',
        invoke: () => applyPreset(mode, presetName),
      });
    }
  }

  // Mode + theme enums. group = 'app'. set() routes through the canonical helpers
  // (selectMode, startThemeTransition) so DOM tabs and theme buttons stay in sync.
  bindingRegistry.register({
    kind: 'enum',
    id: 'app.mode',
    label: 'Mode',
    group: 'app',
    get: () => state.mode,
    set: (v) => selectMode(v as SimMode),
    options: (Object.keys(MODE_TAB_LABELS) as SimMode[])
      .map(m => ({ value: m, label: MODE_TAB_LABELS[m] })),
  });
  bindingRegistry.register({
    kind: 'enum',
    id: 'app.theme',
    label: 'Theme',
    group: 'app',
    get: () => state.colorTheme,
    set: (v) => { state.colorTheme = v; startThemeTransition(v); },
    options: Object.keys(COLOR_THEMES).map(name => ({ value: name, label: name })),
  });

  // Boolean toggles. PARAM_DEFS doesn't carry boolean params today; the
  // app-level state has a few (paused) that the XR toggle widget can flip.
  bindingRegistry.register({
    kind: 'toggle',
    id: 'app.paused',
    label: 'Pause',
    group: 'app',
    get: () => state.paused,
    set: (v) => { state.paused = v; syncPauseButtons(); },
  });
}


export async function startLegacyRuntime() {
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
  loadState();
  if (isMobile) applyMobileDefaults();
  syncThemeTransition(state.colorTheme);
  initBindings();
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
  setupDebugControls();
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
  // PM diagnostics — only wired for the physics sim (other modes don't have
  // the PM pipeline). Each returns null if a prior dump is still in flight or
  // if the active mode lacks the diagnostic.
  type PmDiag = {
    dumpDensity?: () => Promise<Float32Array | null>,
    dumpPotential?: () => Promise<Float32Array | null>,
    dumpOuterDensity?: () => Promise<Float32Array | null>,
    dumpOuterPotential?: () => Promise<Float32Array | null>,
    maxResidual?: () => Promise<{ inner: number; outer: number } | null>,
    reversibilityTest?: (n: number) => Promise<{ maxErr: number; meanErr: number; count: number } | null>,
    gasDumpDensity?: () => Promise<Float32Array | null>,
    gasEnergyBreakdown?: () => Promise<{ starKinetic: number; gasKinetic: number; gasInternal: number; total: number } | null>,
    gasWakeProbe?: (starIdx?: number) => Promise<{ aheadDensity: number; behindDensity: number; asymmetry: number } | null>,
    gasReversibilityTest?: (n: number) => Promise<{ maxPosErr: number; maxVelErr: number; count: number } | null>,
  };
  (window as any).__pmDumpDensity = () => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.dumpDensity ? sim.dumpDensity() : Promise.resolve(null);
  };
  (window as any).__pmDumpPotential = () => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.dumpPotential ? sim.dumpPotential() : Promise.resolve(null);
  };
  (window as any).__pmDumpOuterDensity = () => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.dumpOuterDensity ? sim.dumpOuterDensity() : Promise.resolve(null);
  };
  (window as any).__pmDumpOuterPotential = () => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.dumpOuterPotential ? sim.dumpOuterPotential() : Promise.resolve(null);
  };
  (window as any).__pmMaxResidual = () => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.maxResidual ? sim.maxResidual() : Promise.resolve(null);
  };
  // Reversibility harness. Runs N forward + N reverse compute() steps and
  // returns per-particle position error vs the starting state. Pauses the
  // sim for the duration; restores on exit. Expected: maxErr < 1e-3 for N=1000.
  (window as any).__pmReversibilityTest = (n = 1000) => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.reversibilityTest ? sim.reversibilityTest(n) : Promise.resolve(null);
  };
  (window as any).__gasDumpDensity = () => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.gasDumpDensity ? sim.gasDumpDensity() : Promise.resolve(null);
  };
  (window as any).__gasEnergyBreakdown = () => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.gasEnergyBreakdown ? sim.gasEnergyBreakdown() : Promise.resolve(null);
  };
  (window as any).__gasWakeProbe = (starIdx = 0) => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.gasWakeProbe ? sim.gasWakeProbe(starIdx) : Promise.resolve(null);
  };
  (window as any).__gasReversibilityTest = (n = 1000) => {
    const sim = simulations[state.mode] as unknown as PmDiag;
    return sim?.gasReversibilityTest ? sim.gasReversibilityTest(n) : Promise.resolve(null);
  };
  (window as any).__bindings = bindingRegistry;
  (window as any).__anchors = { evaluateAnchor, handFrames: xrHandFrames };
  (window as any).__xrUi = {
    layout: xrUiLayout, hitTestWidgets,
    step: xrUiStep, applyEffects: xrUiApplyEffects,
    registry: xrUiRegistry, makeIdlePrev: xrUiMakeIdlePrev,
    getRenderList: () => xrUiRenderList,
    getPrev: () => xrUiPrev,
    getClaimed: () => ({ ...xrUiClaimed }),
  };
  (window as any).__simStats = () => {
    const sim = simulations[state.mode];
    const stats = (sim as any)?.getStats ? (sim as any).getStats() : { error: 'no stats on this sim' };
    return { ...stats, gpuMs: gpuFrameMs, gpuDetail: gpuTimingDetail };
  };
}


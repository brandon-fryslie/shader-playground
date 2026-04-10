import '../styles/main.css';
import type { SimMode, Simulation, AppState, ThemeColors, RGBThemeColors, ParamDef, ParamSection, ShapeParamDef, XRCameraOverride, DepthRef, ModeParamsMap, ShapeName } from './types';

// WGSL shader imports — Vite loads these as raw strings
import SHADER_BOIDS_COMPUTE from './shaders/boids.compute.wgsl?raw';
import SHADER_BOIDS_RENDER from './shaders/boids.render.wgsl?raw';
import SHADER_NBODY_COMPUTE from './shaders/nbody.compute.wgsl?raw';
import SHADER_NBODY_REDUCE from './shaders/nbody.reduce.wgsl?raw';
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
// SECTION 1: CONSTANTS, DEFAULTS, PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULTS: ModeParamsMap = {
  boids: {
    count: 1000, separationRadius: 25, alignmentRadius: 50, cohesionRadius: 50,
    maxSpeed: 2.0, maxForce: 0.05, visualRange: 100
  },
  physics: {
    count: 10000, G: 1.0, softening: 0.5, damping: 1.0, coreOrbit: 0.28, distribution: 'disk',
    interactionStrength: 1.0,
    diskVertDamp: 0.35, diskRadDamp: 0.12, diskTangGain: 0.18, diskTangSpeed: 0.5,
    diskVertSpring: 0.0, diskAlignGain: 0.0,
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
    'Default':  { ...DEFAULTS.physics },
    'Galaxy':   { count: 3000, G: 0.5, softening: 1.0, damping: 1.0, coreOrbit: 0.32, distribution: 'disk',
                  interactionStrength: 1.0, diskVertDamp: 0.4, diskRadDamp: 0.15, diskTangGain: 0.22, diskTangSpeed: 0.5, diskVertSpring: 0.0, diskAlignGain: 0.0 },
    'Collapse': { count: 2000, G: 10.0, softening: 0.1, damping: 0.998, coreOrbit: 0.14, distribution: 'shell',
                  interactionStrength: 1.0, diskVertDamp: 0.05, diskRadDamp: 0.02, diskTangGain: 0.0, diskTangSpeed: 0.5, diskVertSpring: 0.0, diskAlignGain: 0.0 },
    'Gentle':   { count: 1000, G: 0.1, softening: 2.0, damping: 1.0, coreOrbit: 0.2, distribution: 'random',
                  interactionStrength: 1.0, diskVertDamp: 0.2, diskRadDamp: 0.08, diskTangGain: 0.12, diskTangSpeed: 0.4, diskVertSpring: 0.0, diskAlignGain: 0.0 },
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
      { key: 'count', label: 'Bodies', min: 10, max: 50000, step: 10, requiresReset: true },
      { key: 'G', label: 'Gravity (G)', min: 0.01, max: 100.0, step: 0.01 },
      { key: 'softening', label: 'Softening', min: 0.01, max: 10.0, step: 0.01 },
      { key: 'damping', label: 'Damping', min: 0.9, max: 1.0, step: 0.001 },
      { key: 'coreOrbit', label: 'Core Friction', min: 0.0, max: 1.5, step: 0.01 },
      { key: 'interactionStrength', label: 'Interaction Pull', min: 0.0, max: 10.0, step: 0.05 },
    ]},
    { section: 'Initial State', params: [
      { key: 'distribution', label: 'Distribution', type: 'dropdown', options: ['random', 'disk', 'shell'] },
    ]},
    { section: 'Disk Recovery', params: [
      { key: 'diskVertDamp', label: 'Vertical Damp', min: 0.0, max: 2.0, step: 0.001 },
      { key: 'diskRadDamp', label: 'Radial Damp', min: 0.0, max: 2.0, step: 0.001 },
      { key: 'diskTangGain', label: 'Tangential Nudge', min: 0.0, max: 2.0, step: 0.001 },
      { key: 'diskTangSpeed', label: 'Orbit Speed', min: 0.0, max: 2.0, step: 0.01 },
      { key: 'diskVertSpring', label: 'Plane Spring', min: 0.0, max: 2.0, step: 0.001 },
      { key: 'diskAlignGain', label: 'Flow Align', min: 0.0, max: 2.0, step: 0.001 },
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
  mode: 'boids',
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
// SECTION 2: WGSL SHADERS
// ═══════════════════════════════════════════════════════════════════════════════










const FLUID_GRID_RES = 96; // tessellation resolution for 3D fluid mesh
// [LAW:one-source-of-truth] Fluid world size is declared once so rendering and interaction use identical bounds.
const FLUID_WORLD_SIZE = 4; // full width/depth of the fluid volume in world units

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

// When set by XR frame loop, overrides orbit camera for all rendering
let xrCameraOverride: XRCameraOverride | null = null;

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

  const fadeMod = device.createShaderModule({ code: SHADER_POST_FADE });
  const downMod = device.createShaderModule({ code: SHADER_POST_DOWNSAMPLE });
  const upMod = device.createShaderModule({ code: SHADER_POST_UPSAMPLE });

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
  postFx.compositeUBO = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
}

function ensureCompositePipeline(format: GPUTextureFormat): GPURenderPipeline {
  let p = postFx.compositePipelines.get(format);
  if (p) return p;
  const mod = device.createShaderModule({ code: SHADER_POST_COMPOSITE });
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
  return {
    view: postFx.depth!.createView(),
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
    device = await adapter.requestDevice();
  } catch (e) {
    showFallback(`requestDevice() failed: ${(e as Error).message}`);
    return false;
  }

  device.lost.then((info) => {
    console.error('WebGPU device lost:', info.message);
    if (info.reason !== 'destroyed') {
      initWebGPU().then(ok => { if (ok) { initGrid(); initXrUi(); ensureSimulation(); requestAnimationFrame(frame); } });
    }
  });

  // Capture validation errors and render them into a visible overlay div for diagnosis.
  device.onuncapturederror = (ev: GPUUncapturedErrorEvent) => {
    console.error('[WebGPU]', ev.error.message);
    let overlay = document.getElementById('gpu-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'gpu-error-overlay';
      overlay.style.cssText = 'position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;';
      document.body.appendChild(overlay);
    }
    const stamp = new Date().toLocaleTimeString();
    overlay.textContent = `[${stamp}] ${ev.error.message}\n\n` + overlay.textContent;
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


// ═══ XR UI PANEL RENDERER ═══
// [LAW:one-source-of-truth] Panel layout constants live here and are mirrored
// (with matching comments) in src/shaders/xr.ui.wgsl. Keep them in sync.
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
//   [0.50 .. 1.00] slider — sub-rect 512×128, aspect 4:1 (matches slider label)
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

  const uiModule = device.createShaderModule({ code: SHADER_XR_UI });

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

// Rasterize the three label strings to the canvas and upload to the label texture.
// No-op if the mode hasn't changed since the last call.
function updateXrUiLabels(mode: SimMode): void {
  if (xrUiLabelCurrentMode === mode) return;
  xrUiLabelCurrentMode = mode;
  const ctx = xrUiLabelCtx;
  const w = XR_UI_LABEL_CANVAS_W;
  const h = XR_UI_LABEL_CANVAS_H;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Sub-rects (matching LABEL_*_U0/U1 in xr.ui.wgsl):
  //   PREV:   [0, 0]    .. [0.25w, h]  → 256×128
  //   NEXT:   [0.25w, 0].. [0.50w, h]  → 256×128
  //   SLIDER: [0.50w, 0].. [w, h]      → 512×128
  const quarter = w / 4;
  drawXrUiLabel(ctx, 'PREV', 0,             0, quarter,     h);
  drawXrUiLabel(ctx, 'NEXT', quarter,       0, quarter,     h);
  drawXrUiLabel(ctx, XR_UI_SLIDER_DEFS[mode].label.toUpperCase(),
                      quarter * 2,   0, quarter * 2, h);

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
  const ORBITAL_TILT = 0.45;
  const DISK_THICKNESS = 0.35;
  const VERTICAL_DRIFT = 0.18;
  // [LAW:one-source-of-truth] Massive-body seeding lives here so orbital structure and tracer distribution share one initialization model.
  const BIG_BODY_COUNT = Math.min(count, Math.max(1, Math.round(count * 0.05)));
  const MEDIUM_BODY_COUNT = Math.min(count - BIG_BODY_COUNT, Math.max(1, Math.round(count * 0.2)));
  const MASSIVE_BODY_COUNT = BIG_BODY_COUNT + MEDIUM_BODY_COUNT;
  const TRACER_MASS = 0.0;
  const CORE_BODY_MASS = 42.0;
  const BIG_BODY_MASS_MIN = 14.0;
  const BIG_BODY_MASS_MAX = 30.0;
  const MEDIUM_BODY_MASS_MIN = 2.5;
  const MEDIUM_BODY_MASS_MAX = 9.0;
  const BIG_BODY_RADIUS_MIN = 0.2;
  const BIG_BODY_RADIUS_MAX = 0.85;
  const MEDIUM_BODY_RADIUS_MIN = 0.95;
  const MEDIUM_BODY_RADIUS_MAX = 1.85;
  const BIG_BODY_HEIGHT = 0.12;
  const MEDIUM_BODY_HEIGHT = 0.2;
  const BIG_BODY_SWIRL = 0.9;
  const MEDIUM_BODY_SWIRL = 0.6;

  const initData = new Float32Array(count * 12);
  const dist = state.physics.distribution;
  const orbitalNormal = normalize3([0.18, 1.0, -0.12]);
  const orbitalTangent = normalize3(cross3([0, 1, 0], orbitalNormal));
  const orbitalBitangent = cross3(orbitalNormal, orbitalTangent);
  for (let i = 0; i < count; i++) {
    const off = i * 12;
    let x, y, z, vx = 0, vy = 0, vz = 0;
    let mass = TRACER_MASS;
    const isCoreBody = i === 0;
    const isBigBody = i < BIG_BODY_COUNT;
    const isMediumBody = i >= BIG_BODY_COUNT && i < MASSIVE_BODY_COUNT;
    if (isCoreBody) {
      // [LAW:one-source-of-truth] The dominant well is seeded once here so orbital structure does not depend on emergent drift.
      x = 0;
      y = 0;
      z = 0;
      vx = 0;
      vy = 0;
      vz = 0;
      mass = CORE_BODY_MASS;
    } else if (isBigBody || isMediumBody) {
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
      const orbitOffset = [
        orbitalTangent[0] * Math.cos(angle) * radius + orbitalBitangent[0] * Math.sin(angle) * radius + orbitalNormal[0] * heightOffset,
        orbitalTangent[1] * Math.cos(angle) * radius + orbitalBitangent[1] * Math.sin(angle) * radius + orbitalNormal[1] * heightOffset,
        orbitalTangent[2] * Math.cos(angle) * radius + orbitalBitangent[2] * Math.sin(angle) * radius + orbitalNormal[2] * heightOffset,
      ];
      x = orbitOffset[0];
      y = orbitOffset[1];
      z = orbitOffset[2];

      const swirl = isBigBody ? BIG_BODY_SWIRL : MEDIUM_BODY_SWIRL;
      const speed = swirl / Math.sqrt(radius + 0.05);
      const orbitVelocity = [
        (-Math.sin(angle) * orbitalTangent[0] + Math.cos(angle) * orbitalBitangent[0]) * speed,
        (-Math.sin(angle) * orbitalTangent[1] + Math.cos(angle) * orbitalBitangent[1]) * speed,
        (-Math.sin(angle) * orbitalTangent[2] + Math.cos(angle) * orbitalBitangent[2]) * speed,
      ];
      vx = orbitVelocity[0];
      vy = orbitVelocity[1];
      vz = orbitVelocity[2];
      mass = isBigBody
        ? BIG_BODY_MASS_MIN + Math.pow(Math.random(), 0.4) * (BIG_BODY_MASS_MAX - BIG_BODY_MASS_MIN)
        : MEDIUM_BODY_MASS_MIN + Math.pow(Math.random(), 0.7) * (MEDIUM_BODY_MASS_MAX - MEDIUM_BODY_MASS_MIN);
    } else if (dist === 'disk') {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 2;
      const normal = normalize3([
        (Math.random() - 0.5) * ORBITAL_TILT,
        1.0,
        (Math.random() - 0.5) * ORBITAL_TILT,
      ]);
      const tangent = normalize3(cross3([0, 1, 0], normal));
      const bitangent = cross3(normal, tangent);
      const heightOffset = (Math.random() - 0.5) * DISK_THICKNESS * (0.35 + r * 0.4);
      const orbitOffset = [
        tangent[0] * Math.cos(angle) * r + bitangent[0] * Math.sin(angle) * r + normal[0] * heightOffset,
        tangent[1] * Math.cos(angle) * r + bitangent[1] * Math.sin(angle) * r + normal[1] * heightOffset,
        tangent[2] * Math.cos(angle) * r + bitangent[2] * Math.sin(angle) * r + normal[2] * heightOffset,
      ];
      x = orbitOffset[0];
      y = orbitOffset[1];
      z = orbitOffset[2];

      const speed = 0.5 / Math.sqrt(r + 0.1);
      const orbitVelocity = [
        (-Math.sin(angle) * tangent[0] + Math.cos(angle) * bitangent[0]) * speed,
        (-Math.sin(angle) * tangent[1] + Math.cos(angle) * bitangent[1]) * speed,
        (-Math.sin(angle) * tangent[2] + Math.cos(angle) * bitangent[2]) * speed,
      ];
      const drift = heightOffset * VERTICAL_DRIFT;
      vx = orbitVelocity[0] + normal[0] * drift;
      vy = orbitVelocity[1] + normal[1] * drift;
      vz = orbitVelocity[2] + normal[2] * drift;
    } else if (dist === 'shell') {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 0.1;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
      const radial = normalize3([x, y, z]);
      const tangent = normalize3(cross3(radial, [0.3, 1.0, -0.2]));
      const bitangent = cross3(radial, tangent);
      const swirl = 0.18 + Math.random() * 0.08;
      vx = (tangent[0] + bitangent[0] * 0.35) * swirl;
      vy = (tangent[1] + bitangent[1] * 0.35) * swirl;
      vz = (tangent[2] + bitangent[2] * 0.35) * swirl;
    } else {
      x = (Math.random() - 0.5) * 4;
      y = (Math.random() - 0.5) * 4;
      z = (Math.random() - 0.5) * 4;
      vx = (Math.random() - 0.5) * 0.12;
      vy = (Math.random() - 0.5) * 0.12;
      vz = (Math.random() - 0.5) * 0.12;
    }
    initData[off] = x; initData[off + 1] = y; initData[off + 2] = z;
    initData[off + 3] = mass;
    initData[off + 4] = vx; initData[off + 5] = vy; initData[off + 6] = vz;
    initData[off + 8] = x;
    initData[off + 9] = y;
    initData[off + 10] = z;
  }

  const bufferA = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();
  const bufferB = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

  const paramsBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const cameraBuffer = device.createBuffer({ size: CAMERA_STRIDE * 2, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  // [LAW:one-source-of-truth] Disk-normal estimation owns its own buffers; the smoothed result lives in the closure below.
  const reduceParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const reduceOutBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const reduceStaging = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });

  const computeModule = device.createShaderModule({ code: SHADER_NBODY_COMPUTE_EDIT || SHADER_NBODY_COMPUTE });
  const reduceShaderModule = device.createShaderModule({ code: SHADER_NBODY_REDUCE });
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

  const reduceBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });
  const reducePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [reduceBGL] }),
    compute: { module: reduceShaderModule, entryPoint: 'main' }
  });
  const reduceBG = [
    device.createBindGroup({ layout: reduceBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: reduceOutBuffer } },
      { binding: 2, resource: { buffer: reduceParamsBuffer } },
    ]}),
    device.createBindGroup({ layout: reduceBGL, entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: reduceOutBuffer } },
      { binding: 2, resource: { buffer: reduceParamsBuffer } },
    ]}),
  ];
  device.queue.writeBuffer(reduceParamsBuffer, 0, new Uint32Array([count]));

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

  let pingPong = 0;
  const depthRef: DepthRef = {};
  // [LAW:one-source-of-truth] Disk normal is owned here; smoothed copy is the only thing the shader ever sees.
  const diskNormal: [number, number, number] = [0, 1, 0];
  let pendingMap = false;
  const DISK_NORMAL_SMOOTH = 0.02;
  const DISK_L_MIN = 1e-4;

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = state.physics;
      const m = state.mouse;
      const paramsData = new ArrayBuffer(96);
      const f32 = new Float32Array(paramsData);
      const u32 = new Uint32Array(paramsData);
      f32[0] = 0.016 * state.fx.timeScale; f32[1] = p.G * 0.001; f32[2] = p.softening; f32[3] = p.damping;
      u32[4] = count;
      u32[5] = MASSIVE_BODY_COUNT;
      f32[6] = p.coreOrbit;
      f32[8] = m.down ? m.worldX : 0.0;
      f32[9] = m.down ? m.worldY : 0.0;
      f32[10] = m.down ? m.worldZ : 0.0;
      f32[11] = m.down ? 1.0 : 0.0;
      // diskNormal at offsets 12..14, pad at 15
      f32[12] = diskNormal[0]; f32[13] = diskNormal[1]; f32[14] = diskNormal[2];
      // disk gain sliders 16..22, must match Params struct order in nbody.compute.wgsl
      f32[16] = p.diskVertDamp ?? 0;
      f32[17] = p.diskRadDamp ?? 0;
      f32[18] = p.diskTangGain ?? 0;
      f32[19] = p.diskVertSpring ?? 0;
      f32[20] = p.diskAlignGain ?? 0;
      f32[21] = p.interactionStrength ?? 1;
      f32[22] = p.diskTangSpeed ?? 0.5;
      device.queue.writeBuffer(paramsBuffer, 0, new Uint8Array(paramsData));

      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();

      // Reduction reads the freshly-written buffer (= input to next main pass).
      const nextPing = 1 - pingPong;
      const reducePass = encoder.beginComputePass();
      reducePass.setPipeline(reducePipeline);
      reducePass.setBindGroup(0, reduceBG[nextPing]);
      reducePass.dispatchWorkgroups(1);
      reducePass.end();

      if (!pendingMap) {
        encoder.copyBufferToBuffer(reduceOutBuffer, 0, reduceStaging, 0, 16);
        pendingMap = true;
        device.queue.onSubmittedWorkDone().then(() => {
          reduceStaging.mapAsync(GPUMapMode.READ).then(() => {
            const data = new Float32Array(reduceStaging.getMappedRange().slice(0));
            reduceStaging.unmap();
            const lx = data[0], ly = data[1], lz = data[2];
            const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
            // [LAW:dataflow-not-control-flow] When |L| is below threshold, keep the previous normal — never overwrite with garbage.
            if (lLen > DISK_L_MIN) {
              const nx = lx / lLen, ny = ly / lLen, nz = lz / lLen;
              const sx = diskNormal[0] + (nx - diskNormal[0]) * DISK_NORMAL_SMOOTH;
              const sy = diskNormal[1] + (ny - diskNormal[1]) * DISK_NORMAL_SMOOTH;
              const sz = diskNormal[2] + (nz - diskNormal[2]) * DISK_NORMAL_SMOOTH;
              const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
              diskNormal[0] = sx / sLen; diskNormal[1] = sy / sLen; diskNormal[2] = sz / sLen;
            }
            pendingMap = false;
          }).catch(() => { pendingMap = false; });
        });
      }

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
      paramsBuffer.destroy(); cameraBuffer.destroy();
      reduceParamsBuffer.destroy(); reduceOutBuffer.destroy(); reduceStaging.destroy();
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

  const computeModule = device.createShaderModule({ code: SHADER_NBODY_CLASSIC_COMPUTE_EDIT || SHADER_NBODY_CLASSIC_COMPUTE });
  const renderModule = device.createShaderModule({ code: SHADER_NBODY_CLASSIC_RENDER_EDIT || SHADER_NBODY_CLASSIC_RENDER });

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
  const computeModule = device.createShaderModule({ code: SHADER_REACTION_COMPUTE_EDIT || SHADER_REACTION_COMPUTE });
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
  const renderModule = device.createShaderModule({ code: SHADER_REACTION_RENDER_EDIT || SHADER_REACTION_RENDER });
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
function selectMode(mode: SimMode): void {
  state.mode = mode;
  document.querySelectorAll<HTMLElement>('.mode-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode));
  document.querySelectorAll<HTMLElement>('.param-group').forEach(g =>
    g.classList.toggle('active', g.dataset.mode === mode));
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
        state.mouse.down = true;
        const wp = screenToWorld(mx, my);
        state.mouse.worldX = wp[0];
        state.mouse.worldY = wp[1];
        state.mouse.worldZ = wp[2];
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
        state.mouse.down = true;
        const wp = screenToWorld(mx, my);
        state.mouse.worldX = wp[0];
        state.mouse.worldY = wp[1];
        state.mouse.worldZ = wp[2];
        state.mouse.dx = (mx - state.mouse.x) * 10;
        state.mouse.dy = (my - state.mouse.y) * 10;
        state.mouse.x = mx;
        state.mouse.y = my;
      }
    } else {
      // Orbit camera (cmd/ctrl+drag)
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
    damping: () => n < 0.995 ? `high damping (${val})` : `damping ${val}`,
    coreOrbit: () => n < 0.1 ? `minimal core friction (${val})` : n > 0.8 ? `strong core friction (${val})` : `core friction ${val}`,
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
  physics:         { key: 'G',             label: 'Gravity', min: 0.01, max: 100 },
  physics_classic: { key: 'G',             label: 'Gravity', min: 0.01, max: 100 },
  fluid:           { key: 'forceStrength', label: 'Force',   min: 1,    max: 500 },
  parametric:      { key: 'scale',         label: 'Scale',   min: 0.1,  max: 5   },
  reaction:        { key: 'feed',          label: 'Feed',    min: 0.0,  max: 0.1 },
};
const XR_UI_MODE_ORDER: SimMode[] = ['boids', 'physics', 'physics_classic', 'fluid', 'parametric', 'reaction'];

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
    syncRenderConfig(preferredFormat, 1);
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

    xrSession.requestAnimationFrame(xrFrame);

    xrSession.addEventListener('end', () => {
      xrSession = null;
      xrRefSpace = null;
      xrBinding = null;
      xrLayer = null;
      state.xrEnabled = false;
      syncRenderConfig(canvasFormat, 1);
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

function xrFrame(time: DOMHighResTimeStamp, xrFrameData: XRFrame) {
  if (!xrSession) return;
  xrSession.requestAnimationFrame(xrFrame);
  refreshThemeColors(time);

  try {
    const pose = xrFrameData.getViewerPose(xrRefSpace!);
    if (!pose) return;

    const sim = simulations[state.mode];
    if (!sim) return;

    // UI input runs first — it may claim a pinch that would otherwise drive the sim.
    updateXrUiInput(xrFrameData);
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
      ensureHdrTargets(width, height);
      postFx.needsClear = true; // force loadOp:clear; no XR trails
      const sceneIdx = postFx.sceneIdx;
      sim.render(encoder, postFx.scene[sceneIdx].createView(), null, viewIndex);

      // Overlay the XR UI panel into the HDR scene so it picks up tonemap + bloom.
      const uiPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: postFx.scene[sceneIdx].createView(),
          loadOp: 'load',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: postFx.depth!.createView(),
          depthLoadOp: 'load',
          depthStoreOp: 'store',
        },
      });
      renderXrUi(uiPass, width / height, viewIndex);
      uiPass.end();

      runBloomChain(encoder, postFx.scene[sceneIdx]);
      const ctFormat = subImage.colorTexture.format;
      runComposite(encoder, postFx.scene[sceneIdx], textureView, ctFormat, [x, y, width, height]);
    }

    // Clear overrides after all eyes are encoded — desktop frame loop must not inherit XR state.
    xrCameraOverride = null;

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
  document.getElementById('stat-fps')!.textContent = `FPS: ${currentFps}`;
  const sim = simulations[state.mode];
  const count = sim ? sim.getCount() : '--';
  document.getElementById('stat-count')!.textContent =
    (state.mode === 'fluid' || state.mode === 'reaction') ? `Grid: ${count}` : `Particles: ${count}`;
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
  if (postFx.needsClear) return; // skip — sim's loadOp:clear handles it
  const persistence = state.fx.trailPersistence;
  if (persistence < 0.001) return; // trails disabled — sim's loadOp:clear handles it
  device.queue.writeBuffer(postFx.fadeUBO!, 0, new Float32Array([persistence, 0, 0, 0]));
  const bg = device.createBindGroup({ layout: postFx.fadeBGL!, entries: [
    { binding: 0, resource: postFx.scene[prevSceneIdx].createView() },
    { binding: 1, resource: postFx.linSampler! },
    { binding: 2, resource: { buffer: postFx.fadeUBO! } },
  ]});
  const pass = encoder.beginRenderPass({ colorAttachments: [{
    view: postFx.scene[currSceneIdx].createView(),
    clearValue: DEFAULT_CLEAR_COLOR,
    loadOp: 'clear',
    storeOp: 'store',
  }]});
  pass.setPipeline(postFx.fadePipeline!);
  pass.setBindGroup(0, bg);
  pass.draw(3);
  pass.end();
}

function runBloomChain(encoder: GPUCommandEncoder, sceneTex: GPUTexture) {
  const fx = state.fx;
  // Downsample chain: scene → mip0 → mip1 → ... → mip4
  for (let i = 0; i < BLOOM_LEVELS; i++) {
    const src = i === 0 ? sceneTex : postFx.bloomMips[i - 1];
    const dst = postFx.bloomMips[i];
    const srcW = src.width;
    const srcH = src.height;
    device.queue.writeBuffer(postFx.downsampleUBO[i], 0, new Float32Array([
      1.0 / srcW, 1.0 / srcH,
      fx.bloomThreshold,
      i === 0 ? 1.0 : 0.0,
    ]));
    const bg = device.createBindGroup({ layout: postFx.downsampleBGL!, entries: [
      { binding: 0, resource: src.createView() },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.downsampleUBO[i] } },
    ]});
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: dst.createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]});
    pass.setPipeline(postFx.downsamplePipeline!);
    pass.setBindGroup(0, bg);
    pass.draw(3);
    pass.end();
  }
  // Upsample chain: mip4 → mip3 (additive), mip3 → mip2 (additive), ..., mip1 → mip0 (additive).
  // The smaller mip's content is added on top of the larger mip's existing data.
  for (let i = BLOOM_LEVELS - 1; i > 0; i--) {
    const src = postFx.bloomMips[i];
    const dst = postFx.bloomMips[i - 1];
    device.queue.writeBuffer(postFx.upsampleUBO[i], 0, new Float32Array([
      1.0 / src.width, 1.0 / src.height,
      fx.bloomRadius,
      0,
    ]));
    const bg = device.createBindGroup({ layout: postFx.upsampleBGL!, entries: [
      { binding: 0, resource: src.createView() },
      { binding: 1, resource: postFx.linSampler! },
      { binding: 2, resource: { buffer: postFx.upsampleUBO[i] } },
    ]});
    const pass = encoder.beginRenderPass({ colorAttachments: [{
      view: dst.createView(),
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

function runComposite(encoder: GPUCommandEncoder, sceneTex: GPUTexture, finalView: GPUTextureView, finalFormat: GPUTextureFormat, viewport: number[] | null = null) {
  const fx = state.fx;
  const tc = getThemeColors();
  const buf = new Float32Array(16);
  buf[0] = fx.bloomIntensity;
  buf[1] = fx.exposure;
  buf[2] = fx.vignette;
  buf[3] = fx.chromaticAberration;
  buf[4] = fx.grading;
  // pad 5,6,7
  buf[8] = tc.primary[0]; buf[9] = tc.primary[1]; buf[10] = tc.primary[2];
  // pad 11
  buf[12] = tc.accent[0]; buf[13] = tc.accent[1]; buf[14] = tc.accent[2];
  // pad 15
  device.queue.writeBuffer(postFx.compositeUBO!, 0, buf);

  const pipeline = ensureCompositePipeline(finalFormat);
  const bg = device.createBindGroup({ layout: postFx.compositeBGL!, entries: [
    { binding: 0, resource: sceneTex.createView() },
    { binding: 1, resource: postFx.bloomMips[0].createView() },
    { binding: 2, resource: postFx.linSampler! },
    { binding: 3, resource: { buffer: postFx.compositeUBO! } },
  ]});
  const pass = encoder.beginRenderPass({ colorAttachments: [{
    view: finalView,
    clearValue: { r: 0, g: 0, b: 0, a: 1 },
    loadOp: 'clear',
    storeOp: 'store',
  }]});
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

  // [LAW:single-enforcer] Frame-level validation scope: if the sim produces bad
  // GPU work, drop it once and surface the error instead of freezing silently.
  // The scope promise runs async, so it reports on the next tick — that's fine;
  // we just need to stop repeatedly feeding the GPU bad commands.
  device.pushErrorScope('validation');

  const mode = state.mode;
  const encoder = device.createCommandEncoder();

  try {
    if (!state.paused) {
      sim.compute(encoder);
    }

    const prevIdx = postFx.sceneIdx;
    const currIdx = 1 - prevIdx;
    postFx.sceneIdx = currIdx;

    // Trail decay (no-op if trails disabled or first frame after clear)
    runFadePass(encoder, prevIdx, currIdx);

    // Sim renders into HDR scene[currIdx] (loadOp determined by getColorAttachment).
    const sceneViewDummy = postFx.scene[currIdx].createView();
    sim.render(encoder, sceneViewDummy, null);

    // Bloom + composite
    runBloomChain(encoder, postFx.scene[currIdx]);
    const swapchainView = context.getCurrentTexture().createView();
    runComposite(encoder, postFx.scene[currIdx], swapchainView, canvasFormat);

    device.queue.submit([encoder.finish()]);

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

  device.popErrorScope().then(err => {
    if (!err) return;
    showSimError(mode, `frame validation: ${err.message}`);
    if (simulations[mode] === sim) {
      try { sim.destroy(); } catch { /* ignore */ }
      delete simulations[mode];
    }
  });
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
      fx: state.fx,
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

  initGrid();
  initXrUi();
  loadState();
  syncThemeTransition(state.colorTheme);
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

import '../../styles/main.css';
import type { SimMode, Simulation, AppState, Attractor, Marker, ThemeColors, RGBThemeColors, ParamDef, ParamSection, ShapeParamDef, DepthRef, ModeParamsMap, ShapeName } from '../types';
import { bindingRegistry } from '../xr-ui/bindings';
import { evaluateAnchor } from '../xr-ui/anchors';
import { layout as xrUiLayout, hitTestWidgets } from '../xr-ui/layout';
import {
  xrUiStep, applySideEffects as xrUiApplyEffects, makeIdlePrev as xrUiMakeIdlePrev,
  uiHandClaimed, type XrUiPrev, type XrUiRegistry, type RenderCommand as XrRenderCommand,
} from '../xr-ui/step';
import { GAS_SHADER_SOURCES } from '../gasReservoir';
import { DEFAULTS as catalogDefaults, PRESETS as catalogPresets, PARAM_DEFS as catalogParamDefs, COLOR_THEMES as catalogColorThemes, DEFAULT_THEME as catalogDefaultTheme, THEME_FADE_MS as catalogThemeFadeMs, DEFAULT_CLEAR_COLOR as catalogDefaultClearColor, SHAPE_IDS as catalogShapeIds, SHAPE_PARAMS as catalogShapeParams, FX_PARAM_DEFS as catalogFxParamDefs, MODE_TAB_LABELS as catalogModeTabLabels } from './catalog';
import { createInitialState } from './state';
import { registerAppBindings } from './bindings';
import { saveState as persistState, loadState as hydrateState, STORAGE_KEY as storageKey } from '../persistence/local-storage';
import { updatePrompt as renderPrompt } from '../ui/prompt';
import { createThemeSystem } from '../ui/theme';
import { createControls, type ControlsApi } from '../ui/controls';
import { createBoidsSimulation as createBoidsSimulationModule } from '../simulations/boids';
import { createFluidSimulation as createFluidSimulationModule } from '../simulations/fluid';
import { createParametricSimulation as createParametricSimulationModule } from '../simulations/parametric';
import { createPhysicsSimulation as createPhysicsSimulationModule } from '../simulations/physics';
import { createPhysicsClassicSimulation as createPhysicsClassicSimulationModule } from '../simulations/physics-classic';
import { isPhysicsSimulation, type PhysicsSimulation } from '../simulations/types';
import { createReactionSimulation as createReactionSimulationModule } from '../simulations/reaction';
import { createSimulationRegistry, type SimulationRegistry } from '../simulations/registry';
import { getShaderSources as getCatalogShaderSources, applyShaderEdit as applyCatalogShaderEdit, resetShaderEdit as resetCatalogShaderEdit } from '../gpu/shaders';
import { createGpuTimingService, type GpuTimingBucket, type TimestampWrites } from '../gpu/timestamps';
import { installDevtools } from '../diagnostics/devtools';
import { createDiagnosticsLogger } from '../diagnostics/logging';
import { cross3, dot3, normalize3, sub3 } from '../math/vec3';
import { createCameraSystem, type CameraSystem } from '../render/camera';
import { createFrameStatsService } from '../render/frame-stats';
import { createGridRenderer, type GridRenderer } from '../render/grid';
import { createPostFxService, type PostFxService } from '../render/post-fx';
import { createXrRuntime, type XrRuntime } from '../xr/runtime';

// WGSL shader imports — Vite loads these as raw strings
import SHADER_BOIDS_COMPUTE from '../shaders/boids.compute.wgsl?raw';
import SHADER_BOIDS_RENDER from '../shaders/boids.render.wgsl?raw';
import SHADER_NBODY_COMPUTE from '../shaders/nbody.compute.wgsl?raw';
import SHADER_NBODY_RENDER from '../shaders/nbody.render.wgsl?raw';
import SHADER_NBODY_CLASSIC_COMPUTE from '../shaders/nbody.classic.compute.wgsl?raw';
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

let currentGpuPhase = 'boot';
const diagnosticsLogger = createDiagnosticsLogger({
  getDevice: () => device,
  getPhase: () => currentGpuPhase,
});
diagnosticsLogger.installGlobalHandlers();
const { createShaderModuleChecked, logError, logInfo, showSimError } = diagnosticsLogger;


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
  return themeSystem.getThemeColors();
}

function refreshThemeColors(now: number): void {
  themeSystem.refreshThemeColors(now);
}

function syncThemeTransition(themeName: string): void {
  themeSystem.syncThemeTransition(themeName);
}

function startThemeTransition(themeName: string, now = performance.now()): void {
  themeSystem.startThemeTransition(themeName, now);
}

function syncThemeButtons(themeName: string): void {
  themeSystem.syncThemeButtons(themeName);
}

// Dynamic access to mode-specific params — casts for TypeScript's correlated types limitation
function modeParams(mode: SimMode): Record<string, number | string | boolean> {
  return state[mode] as unknown as Record<string, number | string | boolean>;
}

// [LAW:one-source-of-truth] AppState creation is centralized in app/state.ts so
// boot and tests share one canonical initialization shape.
const state: AppState = createInitialState(catalogDefaults);

const themeSystem = createThemeSystem({
  // [LAW:one-source-of-truth] Theme metadata and transition ownership live in
  // app/catalog.ts and ui/theme.ts; the runtime consumes that service.
  defaultTheme: catalogDefaultTheme,
  fadeMs: catalogThemeFadeMs,
  onThemeSelected: () => updateAll(),
  state,
  themes: catalogColorThemes,
});

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
  if (isPhysicsSimulation(sim)) return sim.getSimStep();
  return 0;
}

function currentTimeDirection(): number {
  const sim = simulations['physics'];
  if (isPhysicsSimulation(sim)) return sim.getTimeDirection();
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

let cameraSystem!: CameraSystem;
let postFx!: PostFxService;
let xrRuntime: XrRuntime | null = null;

function initPostFx(): void {
  postFx = createPostFxService({
    createShaderModuleChecked,
    device,
    renderSampleCount,
  });
  postFx.init();
}

function ensureHdrTargets(width: number, height: number): void {
  postFx.ensureHdrTargets(width, height);
}

function getCurrentSceneView(): GPUTextureView {
  return postFx.getCurrentSceneView();
}

function getColorAttachment(
  simDepthRef: DepthRef,
  resolveTarget: GPUTextureView,
  viewport: number[] | null,
): GPURenderPassColorAttachment {
  return postFx.getColorAttachment(simDepthRef, resolveTarget, viewport, state.fx.trailPersistence, catalogDefaultClearColor);
}

function getDepthAttachment(simDepthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment {
  return postFx.getDepthAttachment(simDepthRef, viewport, xrRuntime?.getDepthOverride() ?? null);
}

function getRenderViewport(viewport: number[] | null): number[] | null {
  return viewport;
}

function destroyDepthRef(_depthRef: DepthRef) {
  // Depth and color targets are now shared/global; nothing per-sim to destroy.
}

function getCameraUniformData(aspect: number) {
  return cameraSystem.getUniformData(aspect, getThemeColors(), state.mouse);
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
const gpuTiming = createGpuTimingService();

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

  gpuTiming.init(device);

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
  cameraSystem = createCameraSystem(state.camera);
  initPostFx();

  return true;
}

function syncRenderConfig(_nextFormat: GPUTextureFormat, _nextSampleCount: number) {
  // [LAW:one-source-of-truth] All sims always render into HDR (rgba16float). Composite output format
  // is handled per-call by ensureCompositePipeline(); this function no longer needs to rebuild anything.
  postFx.markNeedsClear();
}


// ═══════════════════════════════════════════════════════════════════════════════
// ═══ SHARED GRID RENDERER ═══

let gridRenderer: GridRenderer | null = null;

function initGrid() {
  gridRenderer?.destroy();
  gridRenderer = createGridRenderer({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    device,
    getCameraUniformData,
    renderSampleCount,
    renderTargetFormat,
  });
}

function renderGrid(pass: GPURenderPassEncoder, aspect: number, viewIndex = 0): void {
  gridRenderer?.render(pass, aspect, viewIndex);
}


// SECTION 5: SIMULATION MODULES
// ═══════════════════════════════════════════════════════════════════════════════

// [LAW:one-source-of-truth] The extracted simulation registry owns the live
// instances. This map is a compatibility cache for the remaining legacy seam.
const simulations: Partial<Record<SimMode, Simulation>> = {};
let simulationRegistry: SimulationRegistry | null = null;

function syncSimulationCache(mode: SimMode): void {
  const sim = simulationRegistry?.get(mode);
  if (sim) simulations[mode] = sim;
  else delete simulations[mode];
}

function dropSimulationIfCurrent(mode: SimMode, expected: Simulation): void {
  simulationRegistry?.dropIfCurrent(mode, expected);
  syncSimulationCache(mode);
}

function initializeSimulationRegistry(): void {
  simulationRegistry = createSimulationRegistry({
    device,
    factories: {
      boids: createBoidsSimulation,
      physics: createPhysicsSimulation,
      physics_classic: createPhysicsClassicSimulation,
      fluid: createFluidSimulation,
      parametric: createParametricSimulation,
      reaction: createReactionSimulation,
    },
    reportError: (mode, message) => {
      showSimError(mode, message);
      delete simulations[mode];
    },
  });
}

// --- 5a: BOIDS ---

function createBoidsSimulation() {
  // [LAW:locality-or-seam] Boids now owns its own pipelines and buffers in
  // simulations/boids.ts; runtime only supplies shared rendering capabilities.
  return createBoidsSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
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
function createPhysicsSimulation() {
  // [LAW:locality-or-seam] Physics now owns its assembly in
  // simulations/physics/index.ts; runtime only supplies shared capabilities.
  return createPhysicsSimulationModule({
    attractorMax: ATTRACTOR_MAX,
    baseDt: PHYSICS_BASE_DT,
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    clearColor: catalogDefaultClearColor,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getAttractorStrength: attractorStrength,
    getCameraUniformData,
    getColorAttachment,
    getCurrentSceneView,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    getXrDepthOverride: () => xrRuntime?.getDepthOverride() ?? null,
    markersPerAttractor: MARKERS_PER_ATTRACTOR,
    nullColorView: postFx.getNullColorView(),
    nullDepthView: postFx.getNullDepthView(),
    postFxDepthView: () => postFx.getDepthView(),
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
    tsWrites,
  });
}

// --- 5b': N-BODY CLASSIC ---
// Faithful recreation of the original n-body shader for A/B comparison.
// 32-byte Body struct, 48-byte Params (no disk recovery, no reduction, no home anchors).
// Renders into the shared HDR scene like every other sim, so bloom/tonemap still apply.

function createPhysicsClassicSimulation(): Simulation {
  return createPhysicsClassicSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
}

// --- 5c: FLUID DYNAMICS ---

function createFluidSimulation() {
  return createFluidSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    fluidGridResolution: FLUID_GRID_RES,
    fluidWorldSize: FLUID_WORLD_SIZE,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
}

// --- 5d: PARAMETRIC SHAPES ---

function createParametricSimulation() {
  return createParametricSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    shapeIds: catalogShapeIds,
    state,
  });
}


// --- 5e: REACTION-DIFFUSION (Gray-Scott, 3D) ---

function createReactionSimulation() {
  return createReactionSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
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
  getControlsApi().buildControls();
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
  getControlsApi().applyPreset(mode, presetName);
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
  getControlsApi().selectMode(mode);
}

function setupTabs() {
  getControlsApi().setupTabs();
}

// [LAW:single-enforcer] Pause-button text/active-state is reflected in exactly one place so the
// desktop button, mobile FAB, and any programmatic pause (breakpoint, skip completion) all agree.
function syncPauseButtons() {
  getControlsApi().syncPauseButtons();
}

function setupGlobalControls() {
  getControlsApi().setupGlobalControls();
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
    const session = xrRuntime?.getSession() ?? null;
    if (s.phase === 'idle') {
      btn.textContent = idleLabel;
      btn.disabled = !!session;  // also disabled while XR session alive
      return;
    }
    btn.textContent = 'Recording — exit XR to stop';
    btn.disabled = true;
    requestAnimationFrame(tick);
  };
  btn.addEventListener('click', async () => {
    if (metrics.status().phase !== 'idle' || xrRuntime?.getSession()) return;
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
    const session = xrRuntime?.getSession() ?? null;
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
    if (!isPhysicsSimulation(sim)) return;
    sim.setTimeDirection(active ? -1 : 1);
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
  if (state.mode !== 'physics' || !isPhysicsSimulation(sim)) {
    // Non-physics modes: no skip/step state applies; keep the adaptive-chunk feedback quiet so
    // mode-switch-during-skip doesn't leave a stale lastSkipDispatches value driving adjustments.
    debugState.lastSkipDispatches = 0;
    if (!state.paused) sim.compute(encoder);
    return;
  }
  const pSim: PhysicsSimulation = sim;

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
    const step = isPhysicsSimulation(sim) ? sim.getSimStep() : 0;
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
  if (!isPhysicsSimulation(sim)) return;
  const step = sim.getSimStep();
  const dir = sim.getTimeDirection();
  const highWater = sim.getJournalHighWater();

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
  themeSystem.buildThemeSelector();
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
  if (localStorage.getItem(storageKey)) return;
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
  renderPrompt(state, catalogDefaults, modeParams);
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

let controlsApi: ControlsApi | null = null;

function getControlsApi(): ControlsApi {
  if (!controlsApi) {
    controlsApi = createControls({
      cancelDebugMovement,
      config: {
        fxParamDefs: catalogFxParamDefs,
        modeTabLabels: catalogModeTabLabels,
        paramDefs: catalogParamDefs,
        presets: catalogPresets,
        shapeParams: catalogShapeParams,
      },
      ensureSimulation,
      modeParams,
      resetCurrentSimulation: resetCurrentSim,
      saveState,
      setXrDebugLogging,
      setupRecordButton,
      setupXRButton,
      state,
      storageKey,
      syncThemeButtons,
      updateAll,
    });
  }
  return controlsApi;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7b: SHADER DEBUG PANEL
// ═══════════════════════════════════════════════════════════════════════════════

// Maps simulation mode → named shader sources
function getShaderSources(mode: SimMode): Record<string, string> {
  if (mode === 'physics') {
    return { ...getCatalogShaderSources(mode), ...GAS_SHADER_SOURCES };
  }
  return getCatalogShaderSources(mode);
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
    currentShaderSources[activeShaderTab] = resetCatalogShaderEdit(state.mode, activeShaderTab) ?? originalShaderSources[activeShaderTab];
    loadEditorContent();
    document.getElementById('shader-status')!.className = 'shader-success';
    document.getElementById('shader-status')!.textContent = 'Shader reset to original';
  }
}

// Apply edited shader code to the appropriate global variable
function applyShaderEdit(mode: SimMode, tabName: string, code: string) {
  applyCatalogShaderEdit(mode, tabName, code);
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
// SECTION 8: WEBXR INPUT PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

let xrRefSpace: XRReferenceSpace | null = null;
let xrBaseRefSpace: XRReferenceSpace | null = null; // pre-gesture reference space

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

function initializeXrReferenceSpace(refSpace: XRReferenceSpace, gotFloor: boolean): void {
  // [LAW:one-source-of-truth] xrRefSpace/xrBaseRefSpace/xrViewOffset stay owned by
  // the input pipeline so gesture updates and XR session startup mutate one shared state.
  xrRefSpace = refSpace;
  xrBaseRefSpace = refSpace;
  xrViewOffsetY = gotFloor ? 1.6 : 0;
  xrViewOffset.x = 0;
  xrViewOffset.y = 0;
  xrViewOffset.z = -5;
  applyXrViewOffset();
}

function clearXrReferenceSpace(): void {
  xrRefSpace = null;
  xrBaseRefSpace = null;
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
  await xrRuntime?.toggle();
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: RENDER LOOP & ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

const frameStats = createFrameStatsService();

function tsWrites(bucket: GpuTimingBucket): TimestampWrites | undefined {
  return gpuTiming.tsWrites(bucket);
}

function tsBegin(bucket: GpuTimingBucket): TimestampWrites | undefined {
  return gpuTiming.tsBegin(bucket);
}

function tsEnd(bucket: GpuTimingBucket): TimestampWrites | undefined {
  return gpuTiming.tsEnd(bucket);
}

function resolveTimestamps(encoder: GPUCommandEncoder, now: number) {
  gpuTiming.endFrame(encoder, now);
}

function measureGpuFrame(now: number) {
  gpuTiming.measure(now);
}

function ensureSimulation() {
  const mode = state.mode;
  if (!simulationRegistry) initializeSimulationRegistry();
  simulationRegistry?.ensure(mode);
  syncSimulationCache(mode);
}

function resetCurrentSim() {
  const mode = state.mode;
  if (!simulationRegistry) initializeSimulationRegistry();
  simulationRegistry?.reset(mode);
  syncSimulationCache(mode);
}

function updateStats() {
  const { gpuFrameMs, gpuTimingDetail } = gpuTiming.getStats();
  const sim = simulations[state.mode];
  frameStats.updateHud({
    count: sim ? sim.getCount() : '--',
    currentFps: frameStats.getCurrentFps(),
    gpuFrameMs,
    gpuTimingDetail,
    isGridMode: state.mode === 'fluid' || state.mode === 'reaction',
    physicsDirection: state.mode === 'physics' && isPhysicsSimulation(sim) ? sim.getTimeDirection() : undefined,
    physicsStep: state.mode === 'physics' && isPhysicsSimulation(sim) ? sim.getSimStep() : undefined,
  });
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
  postFx.runFadePass(encoder, prevSceneIdx, currSceneIdx, state.fx.trailPersistence, catalogDefaultClearColor);
}

function runBloomChain(encoder: GPUCommandEncoder, timingBucket?: GpuTimingBucket) {
  postFx.runBloomChain(encoder, state.fx, timingBucket ? tsBegin(timingBucket) : undefined);
}

function runComposite(
  encoder: GPUCommandEncoder,
  finalView: GPUTextureView,
  finalFormat: GPUTextureFormat,
  viewport: number[] | null = null,
  timingBucket?: GpuTimingBucket
) {
  postFx.runComposite(
    encoder,
    finalView,
    finalFormat,
    viewport,
    state.fx,
    getThemeColors(),
    timingBucket ? tsEnd(timingBucket) : undefined,
  );
}

function frame(now: DOMHighResTimeStamp) {
  if (state.xrEnabled) return; // XR has its own loop

  requestAnimationFrame(frame);

  // Adaptive-chunk feedback: use the gap since the previous rAF as a proxy for "is the GPU keeping up?"
  // When a heavy frame pushes delta over ~20ms, the adaptive chunk shrinks next frame; when we have
  // headroom (delta < 14ms), it grows. This is the only place we measure frame pacing, so the feedback
  // decision stays in one place (single-enforcer).
  const { frameDeltaMs, fpsUpdated, hadPreviousTimestamp } = frameStats.tick(now);
  if (hadPreviousTimestamp) {
    updateAdaptiveChunk(frameDeltaMs);
  }

  refreshThemeColors(now);
  resizeCanvas();
  // [LAW:single-enforcer] Attractor lifecycle is updated here, before any sim/compute/composite runs,
  // so mode switches can't leak dead attractors into the array or render loop.
  pruneAttractors(currentSimStep());

  // [LAW:single-enforcer] Markers tick once per visual frame, with dt bounded to kill lag-spike
  // teleports. timeScale + timeDirection make the swarm track the simulation's sense of time.
  tickMarkers(Math.min(0.05, frameDeltaMs * 0.001) * state.fx.timeScale * currentTimeDirection());

  if (fpsUpdated) updateStats();

  const sim = simulations[state.mode];
  if (!sim) return;

  // [LAW:single-enforcer] GPU validation errors are caught by device.onuncapturederror
  // (set up in initWebGPU) which surfaces them in the error overlay without per-frame
  // scope overhead. Targeted scopes in ensureSimulation() handle creation-time errors.
  const mode = state.mode;

  try {
    gpuTiming.beginFrame();
    const encoder = device.createCommandEncoder();

    // Debug stepping/skipping and normal play both funnel through runDebugCompute so the
    // "when do we dispatch compute" decision is owned in one place.
    runDebugCompute(sim, encoder);
    updateDebugPanel();

    const prevIdx = postFx.getSceneIndex();
    const currIdx = 1 - prevIdx;
    postFx.setSceneIndex(currIdx);

    runFadePass(encoder, prevIdx, currIdx);

    sim.render(encoder, postFx.getSceneView(currIdx), null);

    runBloomChain(encoder, 'bloomComposite');
    const swapchainView = context.getCurrentTexture().createView();
    runComposite(encoder, swapchainView, canvasFormat, null, 'bloomComposite');

    resolveTimestamps(encoder, now);
    device.queue.submit([encoder.finish()]);
    measureGpuFrame(now);

  } catch (e) {
    showSimError(mode, `frame threw: ${(e as Error).message}`);
    // Only drop the sim instance we were just rendering — not whatever lives
    // in the registry now, which could be a fresh one the user already reset.
    if (simulations[mode] === sim) {
      dropSimulationIfCurrent(mode, sim);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: STATE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

function saveState() {
  persistState(state, catalogDefaults, modeParams);
}

function loadState() {
  hydrateState(state, catalogDefaults, catalogColorThemes, modeParams, syncThemeTransition);
}

function syncUIFromState() {
  getControlsApi().syncUiFromState();
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
  registerAppBindings({
    applyPreset,
    modeParams,
    modeTabLabels: catalogModeTabLabels,
    paramDefs: catalogParamDefs,
    presets: catalogPresets,
    registry: bindingRegistry,
    selectMode,
    selectTheme: (themeName) => themeSystem.selectTheme(themeName),
    setPaused: (paused) => {
      state.paused = paused;
      if (paused) cancelDebugMovement();
      syncPauseButtons();
    },
    state,
    themes: catalogColorThemes,
  });
}

// [LAW:locality-or-seam] This reintegration pass reassigns ownership without
// deleting every legacy helper in the same change. Keep explicit references so
// the build stays green while the next extraction pass removes the orphaned
// implementations wholesale instead of mixing rewiring with risky mass deletion.
const legacyRewireKeepalive = {
  SHADER_BOIDS_COMPUTE,
  SHADER_BOIDS_RENDER,
  SHADER_NBODY_COMPUTE,
  SHADER_NBODY_RENDER,
  SHADER_NBODY_CLASSIC_COMPUTE,
  SHADER_NBODY_CLASSIC_RENDER,
  SHADER_FLUID_FORCES_ADVECT,
  SHADER_FLUID_DIFFUSE,
  SHADER_FLUID_PRESSURE,
  SHADER_FLUID_DIVERGENCE,
  SHADER_FLUID_GRADIENT,
  SHADER_FLUID_RENDER,
  SHADER_PARAMETRIC_COMPUTE,
  SHADER_PARAMETRIC_RENDER,
  SHADER_REACTION_COMPUTE,
  SHADER_REACTION_RENDER,
  PRESETS,
  DEFAULT_CLEAR_COLOR,
  currentThemeColors,
  computeThemeColors,
  startThemeTransition,
  SHAPE_IDS,
  buildFxSection,
  findParamDef,
  MODE_LABELS,
  describeParam,
  SHADER_BOIDS_COMPUTE_EDIT,
  SHADER_BOIDS_RENDER_EDIT,
  SHADER_NBODY_COMPUTE_EDIT,
  SHADER_NBODY_RENDER_EDIT,
  SHADER_NBODY_CLASSIC_COMPUTE_EDIT,
  SHADER_NBODY_CLASSIC_RENDER_EDIT,
  SHADER_FLUID_FORCES_ADVECT_EDIT,
  SHADER_FLUID_DIFFUSE_EDIT,
  SHADER_FLUID_DIVERGENCE_EDIT,
  SHADER_FLUID_PRESSURE_EDIT,
  SHADER_FLUID_GRADIENT_EDIT,
  SHADER_FLUID_RENDER_EDIT,
  SHADER_PARAMETRIC_COMPUTE_EDIT,
  SHADER_PARAMETRIC_RENDER_EDIT,
  SHADER_REACTION_COMPUTE_EDIT,
  SHADER_REACTION_RENDER_EDIT,
};
void legacyRewireKeepalive;


export async function startAppRuntimeImpl() {
  const ok = await initWebGPU();
  if (!ok) return;
  initializeSimulationRegistry();
  xrRuntime = createXrRuntime({
    cameraStride: CAMERA_STRIDE,
    cameraSystem,
    canvasFormat: () => canvasFormat,
    currentSimStep,
    currentTimeDirection,
    device,
    ensureHdrTargets,
    getCameraUniformData,
    getCurrentPhase: () => currentGpuPhase,
    getCurrentSimulation: () => simulations[state.mode],
    getPostFxSceneFormat: (index) => postFx.getSceneFormat(index),
    getPostFxSceneIndex: () => postFx.getSceneIndex(),
    getPostFxSceneView: (index) => postFx.getSceneView(index),
    getRefSpace: () => xrRefSpace,
    getUiRenderList: () => xrUiRenderList,
    initializeReferenceSpace: initializeXrReferenceSpace,
    inputStep: xrInputStep,
    logError,
    logInfo,
    markPostFxNeedsClear: () => postFx.markNeedsClear(),
    onSelectEnd: xrOnSelectEnd,
    postFxRunBloomChain: runBloomChain,
    postFxRunComposite: runComposite,
    pruneAttractors,
    queuePendingSource: (source) => { xrPendingSources.push(source); },
    refreshThemeColors,
    requestDesktopFrame: () => requestAnimationFrame(frame),
    resetInputState: xrResetInputState,
    clearReferenceSpace: clearXrReferenceSpace,
    setCurrentPhase: (phase) => { currentGpuPhase = phase; },
    setHandTrackingAvailable: () => {},
    state,
    syncRenderConfig,
    tickFrameStats: (time) => frameStats.tick(time),
    tickMarkers,
    uiRegistry: xrUiRegistry,
    updateStats,
  });

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
  installDevtools({
    state,
    getCurrentSimulation: () => simulations[state.mode],
    getGpuStats: () => ({
      currentFps: frameStats.getCurrentFps(),
      ...gpuTiming.getStats(),
    }),
    bindings: bindingRegistry,
    anchors: { evaluateAnchor, handFrames: xrHandFrames },
    xrUi: {
      layout: xrUiLayout,
      hitTestWidgets,
      step: xrUiStep,
      applyEffects: xrUiApplyEffects,
      registry: xrUiRegistry,
      makeIdlePrev: xrUiMakeIdlePrev,
      getRenderList: () => xrUiRenderList,
      getPrev: () => xrUiPrev,
      getClaimed: () => ({ ...xrUiClaimed }),
    },
  });
}

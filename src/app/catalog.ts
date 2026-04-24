import type { AppState, ModeParamsMap, ParamSection, ShapeName, ShapeParamDef, SimMode, ThemeColors } from '../types';

export const DEFAULTS: ModeParamsMap = {
  boids: {
    count: 1000, separationRadius: 25, alignmentRadius: 50, cohesionRadius: 50,
    maxSpeed: 2.0, maxForce: 0.05, visualRange: 100,
  },
  physics: {
    count: 80000, G: 0.3, softening: 1.5, distribution: 'disk',
    interactionStrength: 1.0, tidalStrength: 0.008,
    attractorDecayTime: 2.0,
    gasMassFraction: 0.15, gasSoundSpeed: 2.0, gasVisible: true,
    haloMass: 5.0, haloScale: 2.0, diskMass: 3.0, diskScaleA: 1.5, diskScaleB: 0.3,
  },
  physics_classic: {
    count: 500, G: 1.0, softening: 0.5, damping: 0.999, distribution: 'random',
  },
  fluid: {
    resolution: 256, viscosity: 0.1, diffusionRate: 0.001, forceStrength: 100, volumeScale: 1.5,
    dyeMode: 'rainbow', jacobiIterations: 40,
  },
  parametric: {
    shape: 'torus', scale: 1.0,
    p1Min: 0.7, p1Max: 1.3, p1Rate: 0.3,
    p2Min: 0.2, p2Max: 0.55, p2Rate: 0.5,
    p3Min: 0.15, p3Max: 0.45, p3Rate: 0.7,
    p4Min: 0.5, p4Max: 2.0, p4Rate: 0.4,
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

export const PRESETS: Record<SimMode, Record<string, Record<string, number | string | boolean>>> = {
  boids: {
    Default: { ...DEFAULTS.boids },
    'Tight Flock': { count: 3000, separationRadius: 10, alignmentRadius: 30, cohesionRadius: 80, maxSpeed: 3.0, maxForce: 0.08, visualRange: 60 },
    Dispersed: { count: 2000, separationRadius: 60, alignmentRadius: 100, cohesionRadius: 20, maxSpeed: 1.5, maxForce: 0.03, visualRange: 200 },
    Massive: { count: 20000, separationRadius: 15, alignmentRadius: 40, cohesionRadius: 40, maxSpeed: 2.5, maxForce: 0.04, visualRange: 80 },
    'Slow Dance': { count: 500, separationRadius: 40, alignmentRadius: 80, cohesionRadius: 100, maxSpeed: 0.5, maxForce: 0.01, visualRange: 150 },
  },
  physics: {
    Default: { ...DEFAULTS.physics },
    'Spiral Galaxy': { count: 100000, G: 1.5, softening: 0.15, distribution: 'spiral', interactionStrength: 1.0, tidalStrength: 0.005, haloMass: 8.0, haloScale: 2.5, diskMass: 4.0, diskScaleA: 1.2, diskScaleB: 0.15 },
    'Cosmic Web': { count: 80000, G: 0.8, softening: 2.0, distribution: 'web', interactionStrength: 1.0, tidalStrength: 0.025, haloMass: 2.0, haloScale: 4.0, diskMass: 0.0, diskScaleA: 1.5, diskScaleB: 0.3 },
    'Star Cluster': { count: 60000, G: 0.3, softening: 1.2, distribution: 'cluster', interactionStrength: 1.0, tidalStrength: 0.001, haloMass: 3.0, haloScale: 1.5, diskMass: 0.0, diskScaleA: 1.0, diskScaleB: 0.5 },
    Maelstrom: { count: 120000, G: 0.25, softening: 2.5, distribution: 'maelstrom', interactionStrength: 1.5, tidalStrength: 0.005, haloMass: 6.0, haloScale: 1.8, diskMass: 5.0, diskScaleA: 0.8, diskScaleB: 0.2 },
    'Dust Cloud': { count: 150000, G: 0.08, softening: 3.5, distribution: 'dust', interactionStrength: 0.5, tidalStrength: 0.003, haloMass: 1.0, haloScale: 5.0, diskMass: 0.0, diskScaleA: 2.0, diskScaleB: 0.5 },
    Binary: { count: 80000, G: 0.6, softening: 1.0, distribution: 'binary', interactionStrength: 1.0, tidalStrength: 0.04, haloMass: 4.0, haloScale: 2.0, diskMass: 2.0, diskScaleA: 1.0, diskScaleB: 0.25 },
  },
  physics_classic: {
    Default: { ...DEFAULTS.physics_classic },
    Galaxy: { count: 3000, G: 0.5, softening: 1.0, damping: 0.998, distribution: 'disk' },
    Collapse: { count: 2000, G: 10.0, softening: 0.1, damping: 0.995, distribution: 'shell' },
    Gentle: { count: 1000, G: 0.1, softening: 2.0, damping: 0.9999, distribution: 'random' },
  },
  fluid: {
    Default: { ...DEFAULTS.fluid },
    Thick: { resolution: 256, viscosity: 0.8, diffusionRate: 0.005, forceStrength: 200, volumeScale: 1.8, dyeMode: 'rainbow', jacobiIterations: 40 },
    Turbulent: { resolution: 512, viscosity: 0.01, diffusionRate: 0.0001, forceStrength: 300, volumeScale: 1.3, dyeMode: 'rainbow', jacobiIterations: 60 },
    'Ink Drop': { resolution: 256, viscosity: 0.3, diffusionRate: 0.0, forceStrength: 50, volumeScale: 2.1, dyeMode: 'single', jacobiIterations: 40 },
  },
  parametric: {
    Default: { shape: 'torus', scale: 1.0, p1Min: 0.7, p1Max: 1.3, p1Rate: 0.3, p2Min: 0.2, p2Max: 0.55, p2Rate: 0.5, p3Min: 0.15, p3Max: 0.45, p3Rate: 0.7, p4Min: 0.5, p4Max: 2.0, p4Rate: 0.4, twistMin: 0, twistMax: 0.4, twistRate: 0.15 },
    'Rippling Ring': { shape: 'torus', scale: 1.0, p1Min: 0.5, p1Max: 1.5, p1Rate: 0.5, p2Min: 0.15, p2Max: 0.7, p2Rate: 0.7, p3Min: 0.3, p3Max: 0.8, p3Rate: 1.0, p4Min: 1.0, p4Max: 3.0, p4Rate: 0.6, twistMin: 0, twistMax: 1.0, twistRate: 0.2 },
    'Wild Möbius': { shape: 'mobius', scale: 1.5, p1Min: 0.8, p1Max: 2.0, p1Rate: 0.3, p2Min: 1.0, p2Max: 3.0, p2Rate: 0.15, p3Min: 0.2, p3Max: 0.6, p3Rate: 0.8, p4Min: 0.5, p4Max: 2.5, p4Rate: 0.5, twistMin: 1.0, twistMax: 4.0, twistRate: 0.1 },
    'Trefoil Pulse': { shape: 'trefoil', scale: 1.2, p1Min: 0.08, p1Max: 0.35, p1Rate: 0.9, p2Min: 0.25, p2Max: 0.55, p2Rate: 0.4, p3Min: 0.3, p3Max: 0.9, p3Rate: 1.2, p4Min: 1.0, p4Max: 4.0, p4Rate: 0.7, twistMin: 0, twistMax: 0.5, twistRate: 0.2 },
    'Klein Chaos': { shape: 'klein', scale: 1.2, p1Min: 0.5, p1Max: 1.5, p1Rate: 0.4, p2Min: 0, p2Max: 0, p2Rate: 0, p3Min: 0.2, p3Max: 0.6, p3Rate: 0.9, p4Min: 0.8, p4Max: 3.5, p4Rate: 0.5, twistMin: 0, twistMax: 0.8, twistRate: 0.15 },
  },
  reaction: {
    Spots: { resolution: 128, feed: 0.055, kill: 0.062, Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Spots' },
    Mazes: { resolution: 128, feed: 0.029, kill: 0.057, Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Mazes' },
    Worms: { resolution: 128, feed: 0.058, kill: 0.065, Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Worms' },
    Mitosis: { resolution: 128, feed: 0.0367, kill: 0.0649, Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Mitosis' },
    Coral: { resolution: 128, feed: 0.062, kill: 0.062, Du: 0.2097, Dv: 0.105, stepsPerFrame: 4, isoThreshold: 0.25, preset: 'Coral' },
  },
};

export const PARAM_DEFS: Record<SimMode, ParamSection[]> = {
  boids: [
    { section: 'Flock', params: [
      { key: 'count', label: 'Count', min: 100, max: 30000, step: 100, requiresReset: true },
      { key: 'visualRange', label: 'Visual Range', min: 10, max: 500, step: 5 },
    ] },
    { section: 'Forces', params: [
      { key: 'separationRadius', label: 'Separation', min: 1, max: 100, step: 1 },
      { key: 'alignmentRadius', label: 'Alignment', min: 1, max: 200, step: 1 },
      { key: 'cohesionRadius', label: 'Cohesion', min: 1, max: 200, step: 1 },
      { key: 'maxSpeed', label: 'Max Speed', min: 0.1, max: 10.0, step: 0.1 },
      { key: 'maxForce', label: 'Max Force', min: 0.001, max: 0.5, step: 0.001 },
    ] },
  ],
  physics: [
    { section: 'Simulation', params: [
      { key: 'count', label: 'Bodies', min: 10, max: 150000, step: 10, requiresReset: true },
      { key: 'G', label: 'Gravity (G)', min: 0.05, max: 5.0, step: 0.01 },
      { key: 'softening', label: 'Softening', min: 0.2, max: 4.0, step: 0.05 },
      { key: 'interactionStrength', label: 'Interaction Pull', min: 0.1, max: 100, step: 0.01, logScale: true },
      { key: 'attractorDecayTime', label: 'Decay Time (s)', min: 0.1, max: 30.0, step: 0.1, maxLabel: 'Permanent' },
      { key: 'tidalStrength', label: 'Tidal Field', min: 0.0, max: 0.05, step: 0.0005 },
    ] },
    { section: 'Gas Reservoir', params: [
      { key: 'gasMassFraction', label: 'Gas Mass', min: 0.0, max: 0.5, step: 0.01, requiresReset: true },
      { key: 'gasSoundSpeed', label: 'Sound Speed', min: 0.5, max: 5.0, step: 0.05 },
      { key: 'gasVisible', label: 'Gas Visible', type: 'toggle' },
    ] },
    { section: 'Initial State', params: [{ key: 'distribution', label: 'Distribution', type: 'dropdown', options: ['random', 'disk', 'shell'] }] },
    { section: 'Dark Matter', params: [
      { key: 'haloMass', label: 'Halo Mass', min: 0.0, max: 15.0, step: 0.1 },
      { key: 'haloScale', label: 'Halo Scale', min: 0.5, max: 8.0, step: 0.1 },
      { key: 'diskMass', label: 'Disk Mass', min: 0.0, max: 10.0, step: 0.1 },
      { key: 'diskScaleA', label: 'Disk Scale A', min: 0.1, max: 5.0, step: 0.05 },
      { key: 'diskScaleB', label: 'Disk Scale B', min: 0.05, max: 2.0, step: 0.01 },
    ] },
  ],
  physics_classic: [
    { section: 'Simulation', params: [
      { key: 'count', label: 'Bodies', min: 10, max: 10000, step: 10, requiresReset: true },
      { key: 'G', label: 'Gravity (G)', min: 0.01, max: 100.0, step: 0.01 },
      { key: 'softening', label: 'Softening', min: 0.01, max: 10.0, step: 0.01 },
      { key: 'damping', label: 'Damping', min: 0.9, max: 1.0, step: 0.001 },
    ] },
    { section: 'Initial State', params: [{ key: 'distribution', label: 'Distribution', type: 'dropdown', options: ['random', 'disk', 'shell'], requiresReset: true }] },
  ],
  fluid: [
    { section: 'Grid', params: [{ key: 'resolution', label: 'Resolution', type: 'dropdown', options: [64, 128, 256, 512], requiresReset: true }] },
    { section: 'Physics', params: [
      { key: 'viscosity', label: 'Viscosity', min: 0.0, max: 1.0, step: 0.01 },
      { key: 'diffusionRate', label: 'Diffusion', min: 0.0, max: 0.01, step: 0.0001 },
      { key: 'forceStrength', label: 'Force', min: 1, max: 500, step: 1 },
      { key: 'jacobiIterations', label: 'Iterations', min: 10, max: 80, step: 5 },
    ] },
    { section: 'Appearance', params: [
      { key: 'volumeScale', label: 'Volume', min: 0.4, max: 3.0, step: 0.05 },
      { key: 'dyeMode', label: 'Dye Mode', type: 'dropdown', options: ['rainbow', 'single', 'temperature'] },
    ] },
  ],
  parametric: [
    { section: 'Shape', params: [{ key: 'shape', label: 'Equation', type: 'dropdown', options: ['torus', 'klein', 'mobius', 'sphere', 'trefoil'] }] },
    { section: 'Shape Parameters', id: 'shape-params-section', params: [], dynamic: true },
    { section: 'Transform', params: [{ key: 'scale', label: 'Scale', min: 0.1, max: 5.0, step: 0.1 }] },
    { section: 'Twist', params: [
      { key: 'twistMin', label: 'Min', min: 0.0, max: 12.56, step: 0.05 },
      { key: 'twistMax', label: 'Max', min: 0.0, max: 12.56, step: 0.05 },
      { key: 'twistRate', label: 'Rate', min: 0.0, max: 3.0, step: 0.05 },
    ] },
    { section: 'Wave Amplitude', params: [
      { key: 'p3Min', label: 'Min', min: 0.0, max: 2.0, step: 0.05 },
      { key: 'p3Max', label: 'Max', min: 0.0, max: 2.0, step: 0.05 },
      { key: 'p3Rate', label: 'Rate', min: 0.0, max: 3.0, step: 0.05 },
    ] },
    { section: 'Wave Frequency', params: [
      { key: 'p4Min', label: 'Min', min: 0.0, max: 5.0, step: 0.1 },
      { key: 'p4Max', label: 'Max', min: 0.0, max: 5.0, step: 0.1 },
      { key: 'p4Rate', label: 'Rate', min: 0.0, max: 3.0, step: 0.05 },
    ] },
  ],
  reaction: [
    { section: 'Volume', params: [
      { key: 'resolution', label: 'Resolution', type: 'dropdown', options: [64, 128], requiresReset: true },
      { key: 'stepsPerFrame', label: 'Steps/Frame', min: 1, max: 12, step: 1 },
    ] },
    { section: 'Reaction', params: [
      { key: 'feed', label: 'Feed', min: 0.01, max: 0.10, step: 0.0005 },
      { key: 'kill', label: 'Kill', min: 0.03, max: 0.08, step: 0.0005 },
      { key: 'Du', label: 'Du', min: 0.05, max: 0.35, step: 0.001 },
      { key: 'Dv', label: 'Dv', min: 0.02, max: 0.20, step: 0.001 },
    ] },
    { section: 'Render', params: [{ key: 'isoThreshold', label: 'Iso Threshold', min: 0.05, max: 0.6, step: 0.01 }] },
  ],
};

export const COLOR_THEMES: Record<string, ThemeColors> = {
  Dracula: { primary: '#BD93F9', secondary: '#FF79C6', accent: '#50FA7B', bg: '#282A36', fg: '#F8F8F2' },
  Nord: { primary: '#88C0D0', secondary: '#81A1C1', accent: '#A3BE8C', bg: '#2E3440', fg: '#D8DEE9' },
  Monokai: { primary: '#AE81FF', secondary: '#F82672', accent: '#A5E22E', bg: '#272822', fg: '#D6D6D6' },
  'Rose Pine': { primary: '#C4A7E7', secondary: '#EBBCBA', accent: '#9CCFD8', bg: '#191724', fg: '#E0DEF4' },
  Gruvbox: { primary: '#85A598', secondary: '#F9BD2F', accent: '#B7BB26', bg: '#282828', fg: '#FBF1C7' },
  Solarized: { primary: '#268BD2', secondary: '#2AA198', accent: '#849900', bg: '#002B36', fg: '#839496' },
  'Tokyo Night': { primary: '#BB9AF7', secondary: '#7AA2F7', accent: '#9ECE6A', bg: '#1A1B26', fg: '#A9B1D6' },
  Catppuccin: { primary: '#F5C2E7', secondary: '#CBA6F7', accent: '#ABE9B3', bg: '#181825', fg: '#CDD6F4' },
  'Atom One': { primary: '#61AFEF', secondary: '#C678DD', accent: '#62F062', bg: '#282C34', fg: '#ABB2BF' },
  Flexoki: { primary: '#205EA6', secondary: '#24837B', accent: '#65800B', bg: '#100F0F', fg: '#FFFCF0' },
};

export const DEFAULT_THEME = 'Dracula';
export const THEME_FADE_MS = 12000;
export const DEFAULT_CLEAR_COLOR: GPUColor = { r: 0.02, g: 0.02, b: 0.025, a: 1 };

export const SHAPE_IDS: Record<ShapeName, number> = { torus: 0, klein: 1, mobius: 2, sphere: 3, trefoil: 4 };

export const SHAPE_PARAMS: Partial<Record<ShapeName, Record<string, ShapeParamDef>>> = {
  torus: { p1: { label: 'Major Radius', animMin: 0.7, animMax: 1.3, animRate: 0.3, min: 0.2, max: 2.5, step: 0.05 }, p2: { label: 'Minor Radius', animMin: 0.2, animMax: 0.6, animRate: 0.5, min: 0.05, max: 1.2, step: 0.05 } },
  klein: { p1: { label: 'Bulge', animMin: 0.7, animMax: 1.5, animRate: 0.4, min: 0.2, max: 3.0, step: 0.05 } },
  mobius: { p1: { label: 'Width', animMin: 0.5, animMax: 1.8, animRate: 0.35, min: 0.1, max: 3.0, step: 0.05 }, p2: { label: 'Half-Twists', animMin: 1.0, animMax: 3.0, animRate: 0.15, min: 0.5, max: 5.0, step: 0.5 } },
  sphere: { p1: { label: 'XY Stretch', animMin: 0.6, animMax: 1.5, animRate: 0.4, min: 0.1, max: 3.0, step: 0.05 }, p2: { label: 'Z Stretch', animMin: 0.5, animMax: 1.8, animRate: 0.6, min: 0.1, max: 3.0, step: 0.05 } },
  trefoil: { p1: { label: 'Tube Radius', animMin: 0.08, animMax: 0.35, animRate: 0.6, min: 0.05, max: 1.0, step: 0.05 }, p2: { label: 'Knot Scale', animMin: 0.25, animMax: 0.5, animRate: 0.35, min: 0.1, max: 1.0, step: 0.05 } },
};

export const FX_PARAM_DEFS: { key: keyof AppState['fx']; label: string; min: number; max: number; step: number }[] = [
  { key: 'timeScale', label: 'Time', min: -2.0, max: 2.0, step: 0.05 },
  { key: 'bloomIntensity', label: 'Bloom', min: 0, max: 4.0, step: 0.01 },
  { key: 'bloomThreshold', label: 'Threshold', min: 0, max: 8.0, step: 0.01 },
  { key: 'bloomRadius', label: 'Bloom Radius', min: 0.5, max: 2.0, step: 0.01 },
  { key: 'trailPersistence', label: 'Trails', min: 0, max: 0.995, step: 0.001 },
  { key: 'exposure', label: 'Exposure', min: 0.2, max: 4.0, step: 0.01 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 1.5, step: 0.01 },
  { key: 'chromaticAberration', label: 'Chromatic', min: 0, max: 2.0, step: 0.01 },
  { key: 'grading', label: 'Color Grade', min: 0, max: 1.5, step: 0.01 },
];

export const MODE_TAB_LABELS: Record<SimMode, string> = {
  boids: 'Boids',
  physics: 'N-Body',
  physics_classic: 'N-Body Classic',
  fluid: 'Fluid',
  parametric: 'Shapes',
  reaction: 'Reaction',
};

export type SimMode = 'boids' | 'physics' | 'physics_classic' | 'fluid' | 'parametric' | 'reaction';
export type ShapeName = 'torus' | 'klein' | 'mobius' | 'sphere' | 'trefoil';
export type Distribution = 'random' | 'disk' | 'shell' | 'spiral' | 'web' | 'cluster' | 'maelstrom' | 'dust' | 'binary';
export type DyeMode = 'rainbow' | 'single' | 'temperature';

export interface Simulation {
  compute(encoder: GPUCommandEncoder): void;
  // viewIndex selects which per-view camera data slot to use (0 = left/desktop, 1 = right).
  render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex?: number): void;
  getCount(): string | number;
  destroy(): void;
  diagnose?(): Promise<Record<string, number | number[]>>;
  getStats?(): { ke: number; pe: number; virial: number; rmsR: number; rmsH: number };
}

export interface BoidsParams {
  count: number;
  separationRadius: number;
  alignmentRadius: number;
  cohesionRadius: number;
  maxSpeed: number;
  maxForce: number;
  visualRange: number;
}

export interface PhysicsParams {
  count: number;
  G: number;
  softening: number;
  distribution: Distribution;
  interactionStrength: number;
  tidalStrength: number;
  attractorDecayRatio: number;  // decay duration = this × holdDuration, capped by attractorDecayCap
  attractorDecayCap: number;    // seconds — upper bound on decay duration
  // Dark matter potential — conservative forces replacing dissipative disk recovery.
  haloMass: number;       // Plummer halo gravitational mass
  haloScale: number;      // Plummer halo softening radius
  diskMass: number;       // Miyamoto-Nagai disk mass
  diskScaleA: number;     // MN radial scale length
  diskScaleB: number;     // MN vertical scale height
}

export interface ClassicPhysicsParams {
  count: number;
  G: number;
  softening: number;
  damping: number;
  distribution: Distribution;
}

export interface FluidParams {
  resolution: number;
  viscosity: number;
  diffusionRate: number;
  forceStrength: number;
  volumeScale: number;
  dyeMode: DyeMode;
  jacobiIterations: number;
}

export interface ReactionParams {
  resolution: number;      // N for N×N×N volume
  feed: number;
  kill: number;
  Du: number;
  Dv: number;
  stepsPerFrame: number;
  isoThreshold: number;
  preset: string;          // informational
}

export interface ParametricParams {
  shape: ShapeName;
  scale: number;
  // Each param oscillates: value = min + (max-min) * (0.5 + 0.5 * sin(t * rate + phase))
  p1Min: number; p1Max: number; p1Rate: number;
  p2Min: number; p2Max: number; p2Rate: number;
  p3Min: number; p3Max: number; p3Rate: number;  // wave amplitude
  p4Min: number; p4Max: number; p4Rate: number;  // wave frequency
  twistMin: number; twistMax: number; twistRate: number;
}

export type ModeParamsMap = {
  boids: BoidsParams;
  physics: PhysicsParams;
  physics_classic: ClassicPhysicsParams;
  fluid: FluidParams;
  parametric: ParametricParams;
  reaction: ReactionParams;
};

export interface CameraState {
  distance: number;
  fov: number;
  rotX: number;
  rotY: number;
  panX: number;
  panY: number;
}

export interface MouseState {
  down: boolean;
  x: number;
  y: number;
  dx: number;
  dy: number;
  worldX: number;
  worldY: number;
  worldZ: number;
}

export interface FxParams {
  bloomIntensity: number;
  bloomThreshold: number;
  bloomRadius: number;
  trailPersistence: number;
  exposure: number;
  vignette: number;
  chromaticAberration: number;
  grading: number;
  timeScale: number;
}

export interface Attractor {
  x: number; y: number; z: number;
  chargeStart: number;
  releaseTime: number;
  holdDuration: number;
}

export interface AppState {
  mode: SimMode;
  colorTheme: string;
  xrEnabled: boolean;
  paused: boolean;
  boids: BoidsParams;
  physics: PhysicsParams;
  physics_classic: ClassicPhysicsParams;
  fluid: FluidParams;
  parametric: ParametricParams;
  reaction: ReactionParams;
  camera: CameraState;
  mouse: MouseState;
  attractors: Attractor[];
  pointerToAttractor: Map<number, number>;
  fx: FxParams;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  fg: string;
}

export interface RGBThemeColors {
  primary: number[];
  secondary: number[];
  accent: number[];
  bg: number[];
  fg: number[];
  clearColor: GPUColor;
}

export interface ParamDef {
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  type?: string;
  options?: (string | number)[];
  requiresReset?: boolean;
}

export interface ParamSection {
  section: string;
  id?: string;
  params: ParamDef[];
  dynamic?: boolean;
}

export interface ShapeParamDef {
  label: string;
  animMin: number;  // default animation range min
  animMax: number;  // default animation range max
  animRate: number; // default animation rate
  min: number;      // slider bound for Min/Max controls
  max: number;
  step: number;
}

export interface XRCameraOverride {
  viewMatrix: Float32Array;
  projMatrix: Float32Array;
  eye: number[];
}

export interface DepthRef {
  tex?: GPUTexture;
  msaaColorTex?: GPUTexture;
  msaaDepthTex?: GPUTexture;
}

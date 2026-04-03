export type SimMode = 'boids' | 'physics' | 'fluid' | 'parametric';
export type ShapeName = 'torus' | 'klein' | 'mobius' | 'sphere' | 'trefoil';
export type Distribution = 'random' | 'disk' | 'shell';
export type DyeMode = 'rainbow' | 'single' | 'temperature';

export interface Simulation {
  compute(encoder: GPUCommandEncoder): void;
  // viewIndex selects which per-view camera data slot to use (0 = left/desktop, 1 = right).
  render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex?: number): void;
  getCount(): string | number;
  destroy(): void;
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
  damping: number;
  coreOrbit: number;
  distribution: Distribution;
}

export interface FluidParams {
  resolution: number;
  viscosity: number;
  diffusionRate: number;
  forceStrength: number;
  dyeMode: DyeMode;
  jacobiIterations: number;
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
  fluid: FluidParams;
  parametric: ParametricParams;
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

export interface AppState {
  mode: SimMode;
  colorTheme: string;
  xrEnabled: boolean;
  paused: boolean;
  boids: BoidsParams;
  physics: PhysicsParams;
  fluid: FluidParams;
  parametric: ParametricParams;
  camera: CameraState;
  mouse: MouseState;
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

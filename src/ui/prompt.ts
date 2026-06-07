import type { AppState, ModeParamsMap, SimMode } from '../types';

const MODE_LABELS: Record<SimMode, string> = {
  boids: 'boids/flocking',
  physics: 'N-body gravitational',
  physics_classic: 'classic N-body (vintage shader)',
  fluid: 'fluid dynamics',
  parametric: 'parametric shape',
  reaction: 'Gray-Scott reaction-diffusion (3D)',
};

type ModeParamsReader = (mode: SimMode) => Record<string, number | string | boolean>;

// [LAW:dataflow-not-control-flow] Prompt text is derived from state/default deltas; callers always run this renderer with current data.
export function updatePrompt(state: AppState, defaults: ModeParamsMap, modeParams: ModeParamsReader): void {
  const mode = state.mode;
  const params = modeParams(mode);
  const defaultParams = defaults[mode] as unknown as Record<string, number | string | boolean>;
  const parts: (string | null)[] = [];

  for (const [key, val] of Object.entries(params)) {
    if (val !== defaultParams[key]) {
      parts.push(describeParam(key, val));
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

function describeParam(key: string, val: number | string | boolean): string | null {
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
    haloMass: () => n > 8 ? `heavy halo (${val})` : n < 2 ? `light halo (${val})` : `halo mass ${val}`,
    haloScale: () => `halo scale ${val}`,
    diskMass: () => n < 0.1 ? 'no disk potential' : `disk mass ${val}`,
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

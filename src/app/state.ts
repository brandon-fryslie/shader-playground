import type { AppState, Attractor, Marker, ModeParamsMap } from '../types';

// [LAW:one-source-of-truth] AppState instances are created here; callers may mutate the returned canonical state but do not duplicate its initial shape.
export function createInitialState(defaults: ModeParamsMap): AppState {
  return {
    mode: 'physics',
    colorTheme: 'Dracula',
    xrEnabled: false,
    paused: false,
    boids: { ...defaults.boids },
    physics: { ...defaults.physics },
    physics_classic: { ...defaults.physics_classic },
    fluid: { ...defaults.fluid },
    parametric: { ...defaults.parametric },
    reaction: { ...defaults.reaction },
    camera: { distance: 5.0, fov: 60, rotX: 0.3, rotY: 0.0, panX: 0, panY: 0 },
    mouse: { down: false, x: 0, y: 0, dx: 0, dy: 0, worldX: 0, worldY: 0, worldZ: 0 },
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
}

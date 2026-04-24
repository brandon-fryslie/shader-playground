import type { AppState, Simulation } from '../types';

type PmDiag = {
  dumpDensity?: () => Promise<Float32Array | null>;
  dumpPotential?: () => Promise<Float32Array | null>;
  dumpOuterDensity?: () => Promise<Float32Array | null>;
  dumpOuterPotential?: () => Promise<Float32Array | null>;
  maxResidual?: () => Promise<{ inner: number; outer: number } | null>;
  reversibilityTest?: (n: number) => Promise<{ maxErr: number; meanErr: number; count: number } | null>;
  gasDumpDensity?: () => Promise<Float32Array | null>;
  gasEnergyBreakdown?: () => Promise<{ starKinetic: number; gasKinetic: number; gasInternal: number; total: number } | null>;
  gasWakeProbe?: (starIdx?: number) => Promise<{ aheadDensity: number; behindDensity: number; asymmetry: number } | null>;
  gasReversibilityTest?: (n: number) => Promise<{ maxPosErr: number; maxVelErr: number; count: number } | null>;
};

export interface DevtoolsOptions {
  state: AppState;
  getCurrentSimulation: () => Simulation | undefined;
  getGpuStats: () => {
    currentFps: number;
    gpuFrameMs: number;
    gpuTimingDetail: Record<string, number>;
  };
  bindings: unknown;
  anchors: unknown;
  xrUi: unknown;
}

// [LAW:single-enforcer] All diagnostic globals are installed in one boundary module; app code passes capabilities instead of writing window directly.
export function installDevtools(options: DevtoolsOptions): void {
  const target = window as unknown as Record<string, unknown>;
  target.__simDiagnose = () => {
    const sim = options.getCurrentSimulation();
    return sim?.diagnose ? sim.diagnose() : Promise.resolve({ error: 1, msg: 'no diagnose on this sim' });
  };
  target.__simPreset = (name: string) => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      if (b.textContent?.trim() === name) {
        (b as HTMLButtonElement).click();
        return 'ok';
      }
    }
    return 'preset not found';
  };
  target.__simState = () => {
    const stats = options.getGpuStats();
    return {
      mode: options.state.mode,
      ...(options.state[options.state.mode] as unknown as Record<string, unknown>),
      fps: stats.currentFps,
      gpuMs: stats.gpuFrameMs,
      gpuDetail: stats.gpuTimingDetail,
    };
  };
  target.__pmDumpDensity = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.dumpDensity ? sim.dumpDensity() : Promise.resolve(null);
  };
  target.__pmDumpPotential = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.dumpPotential ? sim.dumpPotential() : Promise.resolve(null);
  };
  target.__pmDumpOuterDensity = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.dumpOuterDensity ? sim.dumpOuterDensity() : Promise.resolve(null);
  };
  target.__pmDumpOuterPotential = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.dumpOuterPotential ? sim.dumpOuterPotential() : Promise.resolve(null);
  };
  target.__pmMaxResidual = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.maxResidual ? sim.maxResidual() : Promise.resolve(null);
  };
  target.__pmReversibilityTest = (n = 1000) => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.reversibilityTest ? sim.reversibilityTest(n) : Promise.resolve(null);
  };
  target.__gasDumpDensity = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.gasDumpDensity ? sim.gasDumpDensity() : Promise.resolve(null);
  };
  target.__gasEnergyBreakdown = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.gasEnergyBreakdown ? sim.gasEnergyBreakdown() : Promise.resolve(null);
  };
  target.__gasWakeProbe = (starIdx = 0) => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.gasWakeProbe ? sim.gasWakeProbe(starIdx) : Promise.resolve(null);
  };
  target.__gasReversibilityTest = (n = 1000) => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.gasReversibilityTest ? sim.gasReversibilityTest(n) : Promise.resolve(null);
  };
  target.__bindings = options.bindings;
  target.__anchors = options.anchors;
  target.__xrUi = options.xrUi;
  target.__simStats = () => {
    const sim = options.getCurrentSimulation();
    const simStats = sim && 'getStats' in sim && typeof sim.getStats === 'function'
      ? sim.getStats()
      : { error: 'no stats on this sim' };
    const stats = options.getGpuStats();
    return { ...simStats, gpuMs: stats.gpuFrameMs, gpuDetail: stats.gpuTimingDetail };
  };
}

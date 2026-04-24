import type { AppState, Simulation } from '../types';

type PmDiag = {
  dumpDensity?: () => Promise<Float32Array | null>;
  dumpPotential?: () => Promise<Float32Array | null>;
  maxResidual?: () => Promise<number | null>;
  reversibilityTest?: (n: number) => Promise<{ maxErr: number; meanErr: number; count: number } | null>;
};

export interface DevtoolsOptions {
  state: AppState;
  getCurrentSimulation: () => Simulation | undefined;
  getGpuStats: () => {
    currentFps: number;
    gpuFrameMs: number;
    gpuTimingDetail: { compute: number; render: number; post: number };
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
  target.__pmMaxResidual = () => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.maxResidual ? sim.maxResidual() : Promise.resolve(null);
  };
  target.__pmReversibilityTest = (n = 1000) => {
    const sim = options.getCurrentSimulation() as unknown as PmDiag;
    return sim?.reversibilityTest ? sim.reversibilityTest(n) : Promise.resolve(null);
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

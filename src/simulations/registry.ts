import type { SimMode, Simulation } from '../types';

export type SimulationFactory = () => Simulation;

export interface SimulationRegistry {
  dropIfCurrent(mode: SimMode, expected: Simulation): void;
  ensure(mode: SimMode): Simulation | null;
  get(mode: SimMode): Simulation | undefined;
  reset(mode: SimMode): Simulation | null;
}

export interface SimulationRegistryDependencies {
  device: GPUDevice;
  factories: Record<SimMode, SimulationFactory>;
  reportError(mode: SimMode, message: string): void;
}

export function createSimulationRegistry(deps: SimulationRegistryDependencies): SimulationRegistry {
  const simulations: Partial<Record<SimMode, Simulation>> = {};

  function get(mode: SimMode): Simulation | undefined {
    return simulations[mode];
  }

  // [LAW:single-enforcer] Creation-time GPU error scopes are owned here so all
  // simulation factories get identical validation, internal, and OOM handling.
  function ensure(mode: SimMode): Simulation | null {
    const existing = simulations[mode];
    if (existing) return existing;

    deps.device.pushErrorScope('validation');
    deps.device.pushErrorScope('internal');
    deps.device.pushErrorScope('out-of-memory');

    let sim: Simulation | null = null;
    try {
      sim = deps.factories[mode]();
    } catch (e) {
      deps.reportError(mode, `factory threw: ${(e as Error).message}`);
    }

    const capturedSim = sim;
    const capturedMode = mode;
    const dropIfBroken = (reason: string) => {
      deps.reportError(capturedMode, reason);
      if (capturedSim && simulations[capturedMode] === capturedSim) {
        try { capturedSim.destroy(); } catch { /* already broken */ }
        delete simulations[capturedMode];
      }
    };

    deps.device.popErrorScope().then((err) => { if (err) dropIfBroken(`OOM: ${err.message}`); });
    deps.device.popErrorScope().then((err) => { if (err) dropIfBroken(`internal: ${err.message}`); });
    deps.device.popErrorScope().then((err) => { if (err) dropIfBroken(`validation: ${err.message}`); });

    if (sim) simulations[mode] = sim;
    return sim;
  }

  function reset(mode: SimMode): Simulation | null {
    const existing = simulations[mode];
    if (existing) {
      existing.destroy();
      delete simulations[mode];
    }
    return ensure(mode);
  }

  function dropIfCurrent(mode: SimMode, expected: Simulation) {
    if (simulations[mode] === expected) {
      try { expected.destroy(); } catch { /* ignore */ }
      delete simulations[mode];
    }
  }

  return {
    dropIfCurrent,
    ensure,
    get,
    reset,
  };
}

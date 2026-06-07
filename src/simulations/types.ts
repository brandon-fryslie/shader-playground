import type { Simulation } from '../types';

export interface PhysicsSimulation extends Simulation {
  dumpDensity(): Promise<Float32Array | null>;
  dumpOuterDensity(): Promise<Float32Array | null>;
  dumpOuterPotential(): Promise<Float32Array | null>;
  dumpPotential(): Promise<Float32Array | null>;
  gasDumpDensity(): Promise<Float32Array | null>;
  gasEnergyBreakdown(): Promise<{ gasInternal: number; gasKinetic: number; starKinetic: number; total: number } | null>;
  gasReversibilityTest(n: number): Promise<{ count: number; maxPosErr: number; maxVelErr: number } | null>;
  gasWakeProbe(starIdx?: number): Promise<{ aheadDensity: number; asymmetry: number; behindDensity: number } | null>;
  getJournalCapacity(): number;
  getJournalHighWater(): number;
  getSimStep(): number;
  getStats(): { ke: number; pe: number; rmsH: number; rmsR: number; virial: number };
  getTimeDirection(): number;
  maxResidual(): Promise<{ inner: number; outer: number } | null>;
  reversibilityTest(n: number): Promise<{ count: number; maxErr: number; meanErr: number } | null>;
  setBlurTime(blurTime: number): void;
  setTimeDirection(dir: number): void;
}

export function isPhysicsSimulation(sim: Simulation | null | undefined): sim is PhysicsSimulation {
  return !!sim
    && typeof (sim as Partial<PhysicsSimulation>).getSimStep === 'function'
    && typeof (sim as Partial<PhysicsSimulation>).getTimeDirection === 'function'
    && typeof (sim as Partial<PhysicsSimulation>).setTimeDirection === 'function'
    && typeof (sim as Partial<PhysicsSimulation>).setBlurTime === 'function';
}

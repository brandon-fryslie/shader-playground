import type { SimMode } from '../types';

import { createBoidsSimulation } from './boids';
import { createFluidSimulation } from './fluid';
import { createParametricSimulation } from './parametric';
import { createPhysicsSimulation } from './physics';
import { createPhysicsClassicSimulation } from './physics-classic';
import { createReactionSimulation } from './reaction';
import type { SimulationFactory } from './registry';
import type { SimulationContextFactory, SimulationFactoryContext } from './shared';

const MODE_FACTORIES: Record<SimMode, SimulationContextFactory> = {
  boids: createBoidsSimulation,
  physics: createPhysicsSimulation,
  physics_classic: createPhysicsClassicSimulation,
  fluid: createFluidSimulation,
  parametric: createParametricSimulation,
  reaction: createReactionSimulation,
};

export function createSimulationFactories(
  context: SimulationFactoryContext,
): Record<SimMode, SimulationFactory> {
  // [LAW:one-source-of-truth] Simulation mode dispatch is owned in one table so
  // runtime code stops re-describing shared capability wiring per mode.
  return Object.fromEntries(
    (Object.keys(MODE_FACTORIES) as SimMode[]).map((mode) => [mode, () => MODE_FACTORIES[mode](context)]),
  ) as Record<SimMode, SimulationFactory>;
}

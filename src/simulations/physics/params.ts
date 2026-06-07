import type { AppState, Attractor, PhysicsParams } from '../../types';

interface PhysicsStepControllerArgs {
  attractorMax: number;
  baseDt: number;
  count: number;
  device: GPUDevice;
  diskNormal: [number, number, number];
  getAttractorStrength(attractor: Attractor, currentStep: number, ceiling: number): number;
  journalCapacity?: number;
  state: AppState;
}

interface PreparedPhysicsStep {
  dt: number;
  physics: PhysicsParams;
}

export interface PhysicsStepController {
  blurBuffer: GPUBuffer;
  destroy(): void;
  getJournalCapacity(): number;
  getJournalHighWater(): number;
  getSimStep(): number;
  getTimeDirection(): number;
  paramsBuffer: GPUBuffer;
  prepareComputeStep(): PreparedPhysicsStep | null;
  setBlurTime(blurTime: number): void;
  setTimeDirection(direction: number): void;
}

export function createPhysicsStepController(
  args: PhysicsStepControllerArgs,
): PhysicsStepController {
  const {
    attractorMax,
    baseDt,
    count,
    device,
    diskNormal,
    getAttractorStrength,
    journalCapacity = 18000,
    state,
  } = args;

  const paramsBuffer = device.createBuffer({ size: 608, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const blurBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const blurScratch = new Float32Array(4);
  device.queue.writeBuffer(blurBuffer, 0, blurScratch);

  const journalEntryFloats = 1 + attractorMax * 4;
  const journal = new Float32Array(journalCapacity * journalEntryFloats);
  let journalHighWater = 0;
  let simStep = 0;
  let timeDirection = 1;

  // [LAW:one-source-of-truth] Params packing, simulation clock advancement,
  // and attractor journal writes/reads live in one owner so compute always
  // consumes the same authoritative step state.
  const paramsData = new ArrayBuffer(608);
  const f32 = new Float32Array(paramsData);
  const u32 = new Uint32Array(paramsData);
  const paramsBytes = new Uint8Array(paramsData);

  function prepareComputeStep(): PreparedPhysicsStep | null {
    if (timeDirection < 0 && simStep <= 0) {
      state.paused = true;
      return null;
    }

    if (timeDirection < 0) simStep--;

    const physics = state.physics;
    const frameBaseDt = baseDt * state.fx.timeScale;
    const dt = frameBaseDt * timeDirection;

    f32[0] = dt;
    f32[1] = physics.G * 0.001;
    f32[2] = physics.softening;
    f32[3] = physics.haloMass ?? 5.0;
    u32[4] = count;
    u32[5] = 0;
    f32[6] = physics.haloScale ?? 2.0;
    f32[7] = simStep * frameBaseDt;
    f32[12] = diskNormal[0];
    f32[13] = diskNormal[1];
    f32[14] = diskNormal[2];
    f32[16] = physics.diskMass ?? 3.0;
    f32[17] = physics.diskScaleA ?? 1.5;
    f32[18] = physics.diskScaleB ?? 0.3;
    f32[19] = 0;
    f32[20] = 0;
    f32[21] = 0;
    f32[22] = 0;
    f32[23] = physics.tidalStrength ?? 0.005;

    if (timeDirection > 0) {
      const ceiling = physics.interactionStrength ?? 1;
      const attractors = state.attractors;
      const attractorCount = Math.min(attractors.length, attractorMax);
      u32[8] = attractorCount;
      u32[9] = 0;
      u32[10] = 0;
      u32[11] = 0;
      for (let i = 0; i < attractorCount; i++) {
        const attractor = attractors[i];
        const base = 24 + i * 4;
        f32[base] = attractor.x;
        f32[base + 1] = attractor.y;
        f32[base + 2] = attractor.z;
        f32[base + 3] = getAttractorStrength(attractor, simStep, ceiling);
      }
      for (let i = attractorCount; i < attractorMax; i++) {
        const base = 24 + i * 4;
        f32[base] = 0;
        f32[base + 1] = 0;
        f32[base + 2] = 0;
        f32[base + 3] = 0;
      }

      const journalBase = (simStep % journalCapacity) * journalEntryFloats;
      journal[journalBase] = attractorCount;
      for (let i = 0; i < attractorMax * 4; i++) {
        journal[journalBase + 1 + i] = f32[24 + i];
      }
      journalHighWater = Math.max(journalHighWater, simStep);
      simStep++;
    } else {
      const journalBase = (simStep % journalCapacity) * journalEntryFloats;
      u32[8] = journal[journalBase];
      u32[9] = 0;
      u32[10] = 0;
      u32[11] = 0;
      for (let i = 0; i < attractorMax * 4; i++) {
        f32[24 + i] = journal[journalBase + 1 + i];
      }
    }

    device.queue.writeBuffer(paramsBuffer, 0, paramsBytes);
    return { dt, physics };
  }

  return {
    blurBuffer,
    destroy() {
      paramsBuffer.destroy();
      blurBuffer.destroy();
    },
    getJournalCapacity() {
      return journalCapacity;
    },
    getJournalHighWater() {
      return journalHighWater;
    },
    getSimStep() {
      return simStep;
    },
    getTimeDirection() {
      return timeDirection;
    },
    paramsBuffer,
    prepareComputeStep,
    setBlurTime(blurTime: number) {
      // [LAW:single-enforcer] Blur uniform updates go through one writer so
      // skip-motion blur cannot drift from the simulation step owner.
      blurScratch[0] = blurTime;
      blurScratch[1] = 0;
      blurScratch[2] = 0;
      blurScratch[3] = 0;
      device.queue.writeBuffer(blurBuffer, 0, blurScratch);
    },
    setTimeDirection(direction: number) {
      timeDirection = direction;
    },
  };
}

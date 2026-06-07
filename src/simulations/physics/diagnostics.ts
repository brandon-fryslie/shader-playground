import type { GasReservoir } from '../../gasReservoir';
import type { PhysicsSimulation } from '../types';

type Vec3 = [number, number, number];

interface PhysicsStats {
  ke: number;
  pe: number;
  rmsH: number;
  rmsR: number;
  virial: number;
}

export interface PhysicsDiagnosticsDependencies {
  bufferA: GPUBuffer;
  bufferB: GPUBuffer;
  computeStep(encoder: GPUCommandEncoder): void;
  count: number;
  device: GPUDevice;
  diagSample: number;
  diagStaging: GPUBuffer;
  diskNormal: Vec3;
  gas: GasReservoir;
  getLastStats(): PhysicsStats;
  getPingPong(): number;
  getPmDiagPending(): boolean;
  getPmOuterDiagPending(): boolean;
  getTimeDirection(): number;
  orbitalBitangent: Vec3;
  orbitalTangent: Vec3;
  pmDensityF32: GPUBuffer;
  pmDensityStaging: GPUBuffer;
  pmLevel0Cells: number;
  pmOuterDensityF32: GPUBuffer;
  pmOuterDensityStaging: GPUBuffer;
  pmOuterLevel0Cells: number;
  pmOuterPotential: GPUBuffer;
  pmOuterResidual: GPUBuffer;
  pmPotential: GPUBuffer;
  pmResidual: GPUBuffer;
  setPmDiagPending(value: boolean): void;
  setPmOuterDiagPending(value: boolean): void;
  setPaused(value: boolean): void;
  setTimeDirection(dir: number): void;
  state: {
    paused: boolean;
    physics: {
      gasSoundSpeed?: number;
    };
  };
}

type PhysicsDiagnostics = Pick<
  PhysicsSimulation,
  | 'dumpDensity'
  | 'dumpOuterDensity'
  | 'dumpOuterPotential'
  | 'dumpPotential'
  | 'gasDumpDensity'
  | 'gasEnergyBreakdown'
  | 'gasReversibilityTest'
  | 'gasWakeProbe'
  | 'getStats'
  | 'maxResidual'
  | 'reversibilityTest'
> & {
  diagnose: () => Promise<Record<string, number | number[]>>;
};

export function createPhysicsDiagnostics(deps: PhysicsDiagnosticsDependencies): PhysicsDiagnostics {
  return {
    getStats() {
      return deps.getLastStats();
    },

    async diagnose(): Promise<Record<string, number | number[]>> {
      if (deps.getPmDiagPending()) return { error: 1 };
      deps.setPmDiagPending(true);
      const sampleCount = Math.min(deps.count, deps.diagSample);
      const chunkCount = 8;
      const chunkBodies = Math.floor(sampleCount / chunkCount);
      const regionSize = Math.floor(deps.count / chunkCount);
      const srcBuffer = deps.getPingPong() === 0 ? deps.bufferA : deps.bufferB;
      const encoder = deps.device.createCommandEncoder();
      for (let c = 0; c < chunkCount; c++) {
        const srcIdx = c * regionSize;
        encoder.copyBufferToBuffer(srcBuffer, srcIdx * 48, deps.diagStaging, c * chunkBodies * 48, chunkBodies * 48);
      }
      deps.device.queue.submit([encoder.finish()]);
      await deps.device.queue.onSubmittedWorkDone();
      await deps.diagStaging.mapAsync(GPUMapMode.READ);
      const raw = new Float32Array(deps.diagStaging.getMappedRange().slice(0));
      deps.diagStaging.unmap();
      deps.setPmDiagPending(false);

      const n = deps.diskNormal;
      let comX = 0;
      let comY = 0;
      let comZ = 0;
      let rmsHeight = 0;
      let rmsRadius = 0;
      let rmsSpeed = 0;
      let totalMass = 0;
      let maxR = 0;
      let tangentialVelocitySum = 0;
      let tangentialVelocityCount = 0;
      const radialBins = new Float64Array(10);
      const angularBins = new Float64Array(12);

      for (let i = 0; i < sampleCount; i++) {
        const o = i * 12;
        const px = raw[o];
        const py = raw[o + 1];
        const pz = raw[o + 2];
        const m = raw[o + 3];
        const vx = raw[o + 4];
        const vy = raw[o + 5];
        const vz = raw[o + 6];
        comX += px;
        comY += py;
        comZ += pz;
        totalMass += m;

        const r = Math.sqrt(px * px + py * py + pz * pz);
        if (r > maxR) maxR = r;
        rmsRadius += r * r;

        const h = px * n[0] + py * n[1] + pz * n[2];
        rmsHeight += h * h;

        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        rmsSpeed += speed * speed;

        if (r > 0.1) {
          const rPlaneX = px - h * n[0];
          const rPlaneY = py - h * n[1];
          const rPlaneZ = pz - h * n[2];
          const rPlane = Math.sqrt(rPlaneX * rPlaneX + rPlaneY * rPlaneY + rPlaneZ * rPlaneZ);
          if (rPlane > 0.05) {
            const eRx = rPlaneX / rPlane;
            const eRy = rPlaneY / rPlane;
            const eRz = rPlaneZ / rPlane;
            const crossX = n[1] * eRz - n[2] * eRy;
            const crossY = n[2] * eRx - n[0] * eRz;
            const crossZ = n[0] * eRy - n[1] * eRx;
            const crossLen = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ) || 1;
            const ePhiX = crossX / crossLen;
            const ePhiY = crossY / crossLen;
            const ePhiZ = crossZ / crossLen;
            const vPhi = vx * ePhiX + vy * ePhiY + vz * ePhiZ;
            tangentialVelocitySum += Math.abs(vPhi) / (speed + 0.001);
            tangentialVelocityCount++;
          }
        }

        const radialBin = Math.min(9, Math.floor(r * 2));
        radialBins[radialBin]++;

        const rPlaneX2 = px - h * n[0];
        const rPlaneY2 = py - h * n[1];
        const rPlaneZ2 = pz - h * n[2];
        const angle = Math.atan2(
          rPlaneX2 * deps.orbitalBitangent[0] + rPlaneY2 * deps.orbitalBitangent[1] + rPlaneZ2 * deps.orbitalBitangent[2],
          rPlaneX2 * deps.orbitalTangent[0] + rPlaneY2 * deps.orbitalTangent[1] + rPlaneZ2 * deps.orbitalTangent[2]
        );
        const angularBin = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 12) % 12;
        angularBins[angularBin]++;
      }

      const invN = 1 / sampleCount;
      const angularProfile = Array.from(angularBins);
      const angularMean = angularProfile.reduce((a, b) => a + b, 0) / 12;
      const angularVariance = angularProfile.reduce((a, b) => a + (b - angularMean) ** 2, 0) / 12;
      const armContrast = angularMean > 0 ? Math.sqrt(angularVariance) / angularMean : 0;

      return {
        armContrast,
        angularProfile,
        comX: comX * invN,
        comY: comY * invN,
        comZ: comZ * invN,
        count: deps.count,
        diskNormalX: n[0],
        diskNormalY: n[1],
        diskNormalZ: n[2],
        maxRadius: maxR,
        radialProfile: Array.from(radialBins),
        rmsHeight: Math.sqrt(rmsHeight * invN),
        rmsRadius: Math.sqrt(rmsRadius * invN),
        rmsSpeed: Math.sqrt(rmsSpeed * invN),
        sampleCount,
        tangentialFraction: tangentialVelocityCount > 0 ? tangentialVelocitySum / tangentialVelocityCount : 0,
        totalMass: totalMass * (deps.count / sampleCount),
      };
    },

    async dumpDensity(): Promise<Float32Array | null> {
      if (deps.getPmDiagPending()) return null;
      deps.setPmDiagPending(true);
      const encoder = deps.device.createCommandEncoder();
      encoder.copyBufferToBuffer(deps.pmDensityF32, 0, deps.pmDensityStaging, 0, deps.pmLevel0Cells * 4);
      deps.device.queue.submit([encoder.finish()]);
      await deps.device.queue.onSubmittedWorkDone();
      await deps.pmDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(deps.pmDensityStaging.getMappedRange().slice(0));
      deps.pmDensityStaging.unmap();
      deps.setPmDiagPending(false);
      return out;
    },

    async dumpPotential(): Promise<Float32Array | null> {
      if (deps.getPmDiagPending()) return null;
      deps.setPmDiagPending(true);
      const encoder = deps.device.createCommandEncoder();
      encoder.copyBufferToBuffer(deps.pmPotential, 0, deps.pmDensityStaging, 0, deps.pmLevel0Cells * 4);
      deps.device.queue.submit([encoder.finish()]);
      await deps.device.queue.onSubmittedWorkDone();
      await deps.pmDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(deps.pmDensityStaging.getMappedRange().slice(0));
      deps.pmDensityStaging.unmap();
      deps.setPmDiagPending(false);
      return out;
    },

    async maxResidual(): Promise<{ inner: number; outer: number } | null> {
      if (deps.getPmDiagPending() || deps.getPmOuterDiagPending()) return null;
      deps.setPmDiagPending(true);
      deps.setPmOuterDiagPending(true);
      const encoder = deps.device.createCommandEncoder();
      encoder.copyBufferToBuffer(deps.pmResidual, 0, deps.pmDensityStaging, 0, deps.pmLevel0Cells * 4);
      encoder.copyBufferToBuffer(deps.pmOuterResidual, 0, deps.pmOuterDensityStaging, 0, deps.pmOuterLevel0Cells * 4);
      deps.device.queue.submit([encoder.finish()]);
      await deps.device.queue.onSubmittedWorkDone();

      await deps.pmDensityStaging.mapAsync(GPUMapMode.READ);
      const innerArray = new Float32Array(deps.pmDensityStaging.getMappedRange());
      let inner = 0;
      for (let i = 0; i < innerArray.length; i++) {
        const value = Math.abs(innerArray[i]);
        if (value > inner) inner = value;
      }
      deps.pmDensityStaging.unmap();
      deps.setPmDiagPending(false);

      await deps.pmOuterDensityStaging.mapAsync(GPUMapMode.READ);
      const outerArray = new Float32Array(deps.pmOuterDensityStaging.getMappedRange());
      let outer = 0;
      for (let i = 0; i < outerArray.length; i++) {
        const value = Math.abs(outerArray[i]);
        if (value > outer) outer = value;
      }
      deps.pmOuterDensityStaging.unmap();
      deps.setPmOuterDiagPending(false);

      return { inner, outer };
    },

    async dumpOuterDensity(): Promise<Float32Array | null> {
      if (deps.getPmOuterDiagPending()) return null;
      deps.setPmOuterDiagPending(true);
      const encoder = deps.device.createCommandEncoder();
      encoder.copyBufferToBuffer(deps.pmOuterDensityF32, 0, deps.pmOuterDensityStaging, 0, deps.pmOuterLevel0Cells * 4);
      deps.device.queue.submit([encoder.finish()]);
      await deps.device.queue.onSubmittedWorkDone();
      await deps.pmOuterDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(deps.pmOuterDensityStaging.getMappedRange().slice(0));
      deps.pmOuterDensityStaging.unmap();
      deps.setPmOuterDiagPending(false);
      return out;
    },

    async dumpOuterPotential(): Promise<Float32Array | null> {
      if (deps.getPmOuterDiagPending()) return null;
      deps.setPmOuterDiagPending(true);
      const encoder = deps.device.createCommandEncoder();
      encoder.copyBufferToBuffer(deps.pmOuterPotential, 0, deps.pmOuterDensityStaging, 0, deps.pmOuterLevel0Cells * 4);
      deps.device.queue.submit([encoder.finish()]);
      await deps.device.queue.onSubmittedWorkDone();
      await deps.pmOuterDensityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(deps.pmOuterDensityStaging.getMappedRange().slice(0));
      deps.pmOuterDensityStaging.unmap();
      deps.setPmOuterDiagPending(false);
      return out;
    },

    gasDumpDensity: () => deps.gas.dumpDensity(),

    gasEnergyBreakdown: () => deps.gas.energyBreakdown(deps.getPingPong(), deps.state.physics.gasSoundSpeed ?? 2.0),

    gasWakeProbe: (starIdx = 0) => deps.gas.wakeProbe(deps.getPingPong(), starIdx),

    async gasReversibilityTest(nSteps: number): Promise<{ maxPosErr: number; maxVelErr: number; count: number } | null> {
      const wasPaused = deps.state.paused;
      const savedDir = deps.getTimeDirection();
      deps.setPaused(true);
      const start = await deps.gas.snapshot(deps.getPingPong());
      if (!start) {
        deps.setTimeDirection(savedDir);
        deps.setPaused(wasPaused);
        return null;
      }

      deps.setTimeDirection(1);
      for (let i = 0; i < nSteps; i++) {
        const encoder = deps.device.createCommandEncoder();
        deps.computeStep(encoder);
        deps.device.queue.submit([encoder.finish()]);
      }

      deps.setTimeDirection(-1);
      for (let i = 0; i < nSteps; i++) {
        const encoder = deps.device.createCommandEncoder();
        deps.computeStep(encoder);
        deps.device.queue.submit([encoder.finish()]);
      }

      deps.setTimeDirection(savedDir);
      deps.setPaused(wasPaused);

      const end = await deps.gas.snapshot(deps.getPingPong());
      if (!end) return null;
      let maxPosErr = 0;
      let maxVelErr = 0;
      for (let i = 0; i < deps.gas.count; i++) {
        const o = i * 12;
        const posErr = Math.hypot(end[o] - start[o], end[o + 1] - start[o + 1], end[o + 2] - start[o + 2]);
        const velErr = Math.hypot(end[o + 4] - start[o + 4], end[o + 5] - start[o + 5], end[o + 6] - start[o + 6]);
        if (posErr > maxPosErr) maxPosErr = posErr;
        if (velErr > maxVelErr) maxVelErr = velErr;
      }
      return { maxPosErr, maxVelErr, count: deps.gas.count };
    },

    async reversibilityTest(nSteps: number): Promise<{ maxErr: number; meanErr: number; count: number } | null> {
      if (deps.getPmDiagPending()) return null;
      const particleBytes = deps.count * 48;
      if (particleBytes > deps.pmDensityStaging.size) return null;
      deps.setPmDiagPending(true);
      const wasPaused = deps.state.paused;
      const savedDir = deps.getTimeDirection();
      deps.setPaused(true);

      const snapshotPositions = async (): Promise<Float32Array> => {
        const encoder = deps.device.createCommandEncoder();
        const src = deps.getPingPong() === 0 ? deps.bufferA : deps.bufferB;
        encoder.copyBufferToBuffer(src, 0, deps.pmDensityStaging, 0, particleBytes);
        deps.device.queue.submit([encoder.finish()]);
        await deps.device.queue.onSubmittedWorkDone();
        await deps.pmDensityStaging.mapAsync(GPUMapMode.READ);
        const out = new Float32Array(deps.pmDensityStaging.getMappedRange(0, particleBytes).slice(0));
        deps.pmDensityStaging.unmap();
        return out;
      };

      const startPos = await snapshotPositions();

      deps.setTimeDirection(1);
      for (let i = 0; i < nSteps; i++) {
        const encoder = deps.device.createCommandEncoder();
        deps.computeStep(encoder);
        deps.device.queue.submit([encoder.finish()]);
      }

      deps.setTimeDirection(-1);
      for (let i = 0; i < nSteps; i++) {
        const encoder = deps.device.createCommandEncoder();
        deps.computeStep(encoder);
        deps.device.queue.submit([encoder.finish()]);
      }

      deps.setTimeDirection(savedDir);
      deps.setPaused(wasPaused);

      const endPos = await snapshotPositions();
      let maxErr = 0;
      let sumErr = 0;
      for (let i = 0; i < deps.count; i++) {
        const o = i * 12;
        const dx = endPos[o] - startPos[o];
        const dy = endPos[o + 1] - startPos[o + 1];
        const dz = endPos[o + 2] - startPos[o + 2];
        const err = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (err > maxErr) maxErr = err;
        sumErr += err;
      }
      deps.setPmDiagPending(false);
      return { maxErr, meanErr: sumErr / deps.count, count: deps.count };
    },
  };
}

import { runPmVCycle } from '../physics-vcycle';
import { shaderSource } from '../../gpu/shaders';
import type { PhysicsParticleMeshContext } from './particle-mesh';
import type { PhysicsStepController } from './params';
import type { PhysicsStatsService } from './stats';

type ShaderFactory = (label: string, source: string) => GPUShaderModule;

interface PhysicsComputeServiceArgs {
  bodyBuffers: [GPUBuffer, GPUBuffer];
  count: number;
  createShaderModuleChecked: ShaderFactory;
  device: GPUDevice;
  particleMesh: PhysicsParticleMeshContext;
  paramsBuffer: GPUBuffer;
  physicsStats: PhysicsStatsService;
  softeningDefault: number;
  stepController: PhysicsStepController;
  tsWrites(name: string): GPUComputePassTimestampWrites | undefined;
}

export interface PhysicsComputeService {
  compute(encoder: GPUCommandEncoder): void;
  getPingPong(): number;
}

export function createPhysicsComputeService(
  args: PhysicsComputeServiceArgs,
): PhysicsComputeService {
  const {
    bodyBuffers,
    count,
    createShaderModuleChecked,
    device,
    paramsBuffer,
    particleMesh,
    physicsStats,
    softeningDefault,
    stepController,
    tsWrites,
  } = args;

  const pmForce = particleMesh.inner.force!;
  const computeModule = createShaderModuleChecked('nbody.compute', shaderSource('nbody.compute'));
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
    ],
  });
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' },
  });
  const computeBG = bodyBuffers.map((buffer, index) => device.createBindGroup({
    layout: computeBGL,
    entries: [
      { binding: 0, resource: { buffer } },
      { binding: 1, resource: { buffer: bodyBuffers[1 - index] } },
      { binding: 2, resource: { buffer: paramsBuffer } },
      { binding: 3, resource: { buffer: pmForce } },
    ],
  })) as [GPUBindGroup, GPUBindGroup];

  let pingPong = 0;

  return {
    compute(encoder) {
      const preparedStep = stepController.prepareComputeStep();
      if (!preparedStep) return;
      const { dt, physics } = preparedStep;

      particleMesh.prepareFrame(dt, physics.gasSoundSpeed ?? 2.0);
      particleMesh.depositAndConvert(encoder, pingPong, tsWrites('pmDepositConvert'));

      const coarsestSweeps = 16;
      runPmVCycle(encoder, {
        levels: particleMesh.outer.levels,
        pipelines: {
          prolong: particleMesh.prolongPipeline,
          residual: particleMesh.residualPipeline,
          restrict: particleMesh.restrictPipeline,
          smooth: particleMesh.smoothPipeline,
        },
        wgCount: particleMesh.outer.wgCount,
        potential: particleMesh.outer.potential,
        smoothBG: particleMesh.outer.smoothBG,
        residualBG: particleMesh.outer.residualBG,
        restrictBG: particleMesh.outer.restrictBG,
        prolongBG: particleMesh.outer.prolongBG,
        preSmooth: 1,
        postSmooth: 1,
        coarsestSweeps,
        timestampWrites: tsWrites('outerVCycle'),
      });

      {
        const pass = encoder.beginComputePass(tsWrites('boundarySample') ? { timestampWrites: tsWrites('boundarySample') } : undefined);
        pass.setPipeline(particleMesh.boundarySamplePipeline);
        pass.setBindGroup(0, particleMesh.boundarySampleBG);
        pass.dispatchWorkgroups(
          particleMesh.boundarySampleWg,
          particleMesh.boundarySampleWg,
          particleMesh.boundarySampleWg,
        );
        pass.end();
      }

      runPmVCycle(encoder, {
        levels: particleMesh.inner.levels,
        pipelines: {
          prolong: particleMesh.prolongPipeline,
          residual: particleMesh.residualPipeline,
          restrict: particleMesh.restrictPipeline,
          smooth: particleMesh.smoothPipeline,
        },
        wgCount: particleMesh.inner.wgCount,
        potential: particleMesh.inner.potential,
        smoothBG: particleMesh.inner.smoothBG,
        residualBG: particleMesh.inner.residualBG,
        restrictBG: particleMesh.inner.restrictBG,
        prolongBG: particleMesh.inner.prolongBG,
        preSmooth: 1,
        postSmooth: 1,
        coarsestSweeps,
        timestampWrites: tsWrites('innerVCycle'),
      });

      particleMesh.interpolateForces(
        encoder,
        count,
        pingPong,
        tsWrites('starInterpolate'),
        tsWrites('gasInterpolatePressure'),
      );

      const pass = encoder.beginComputePass(tsWrites('starGasIntegrate') ? { timestampWrites: tsWrites('starGasIntegrate') } : undefined);
      particleMesh.gas.integrate(pass, pingPong);
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 256));
      pass.end();

      physicsStats.schedule(
        encoder,
        count,
        (physics.G ?? 0.3) * 0.001,
        performance.now(),
        pingPong,
        physics.softening ?? softeningDefault,
      );

      pingPong = 1 - pingPong;
    },
    getPingPong() {
      return pingPong;
    },
  };
}

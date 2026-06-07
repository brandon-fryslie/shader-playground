import SHADER_NBODY_STATS from '../../shaders/nbody.stats.wgsl?raw';

type ShaderFactory = (label: string, source: string) => GPUShaderModule;

export interface PhysicsStatsSnapshot {
  ke: number;
  pe: number;
  rmsH: number;
  rmsR: number;
  virial: number;
}

interface PhysicsStatsServiceArgs {
  buffers: [GPUBuffer, GPUBuffer];
  createShaderModuleChecked: ShaderFactory;
  device: GPUDevice;
  intervalMs?: number;
}

export interface PhysicsStatsService {
  destroy(): void;
  getLastStats(): PhysicsStatsSnapshot;
  schedule(
    encoder: GPUCommandEncoder,
    count: number,
    gravityScale: number,
    nowMs: number,
    pingPong: number,
    softening: number,
  ): void;
}

export function createPhysicsStatsService(
  args: PhysicsStatsServiceArgs,
): PhysicsStatsService {
  const {
    buffers,
    createShaderModuleChecked,
    device,
    intervalMs = 1000,
  } = args;

  const shaderModule = createShaderModuleChecked('nbody.stats', SHADER_NBODY_STATS);
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: shaderModule, entryPoint: 'main' },
  });

  const outBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const staging = device.createBuffer({ size: 32, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const paramsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const bindGroups = [
    device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: buffers[1] } },
        { binding: 1, resource: { buffer: outBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
    device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: buffers[0] } },
        { binding: 1, resource: { buffer: outBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
  ] as const;

  let pendingMap = false;
  let lastStatsTime = 0;
  let lastStats: PhysicsStatsSnapshot = { ke: 0, pe: 0, virial: 0, rmsR: 0, rmsH: 0 };

  return {
    destroy() {
      // [LAW:single-enforcer] The stats pass owns its pipeline outputs and
      // readback buffers, so their cleanup happens only here.
      outBuffer.destroy();
      staging.destroy();
      paramsBuffer.destroy();
    },
    getLastStats() {
      return lastStats;
    },
    schedule(encoder, count, gravityScale, nowMs, pingPong, softening) {
      if (pendingMap || nowMs - lastStatsTime <= intervalMs) return;
      lastStatsTime = nowMs;

      const paramsData = new Float32Array(4);
      const paramsU32 = new Uint32Array(paramsData.buffer);
      paramsU32[0] = count;
      paramsU32[1] = count;
      paramsData[2] = softening * softening;
      paramsData[3] = gravityScale;
      device.queue.writeBuffer(paramsBuffer, 0, paramsData);

      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroups[1 - pingPong]);
      pass.dispatchWorkgroups(1);
      pass.end();

      encoder.copyBufferToBuffer(outBuffer, 0, staging, 0, 32);
      pendingMap = true;
      device.queue.onSubmittedWorkDone().then(() => {
        staging.mapAsync(GPUMapMode.READ).then(() => {
          const data = new Float32Array(staging.getMappedRange().slice(0));
          staging.unmap();
          pendingMap = false;

          const ke = data[0];
          const pe = data[1];
          const virial = Math.abs(pe) > 0.001 ? (2 * ke) / Math.abs(pe) : 1.0;
          const rmsR = Math.sqrt(data[2] / Math.max(count, 1));
          const rmsH = Math.sqrt(data[3] / Math.max(count, 1));
          lastStats = { ke, pe, virial, rmsR, rmsH };
        }).catch(() => {
          pendingMap = false;
        });
      });
    },
  };
}

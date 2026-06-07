import { shaderSource } from '../gpu/shaders';
import type { DepthRef, Simulation } from '../types';

import type { SimulationFactoryContext } from './shared';

function floatToHalf(value: number): number {
  const buf = new Float32Array(1);
  const i32 = new Int32Array(buf.buffer);
  buf[0] = value;
  const x = i32[0];
  const sign = (x >> 16) & 0x8000;
  const exp = ((x >> 23) & 0xff) - (127 - 15);
  const mantissa = x & 0x7fffff;
  if (exp <= 0) return sign;
  if (exp >= 31) return sign | 0x7c00;
  return sign | (exp << 10) | (mantissa >> 13);
}

export function createReactionSimulation(deps: SimulationFactoryContext): Simulation {
  const volumeResolution = deps.state.reaction.resolution;
  const worldSize = 3.0;

  const texDesc: GPUTextureDescriptor = {
    size: [volumeResolution, volumeResolution, volumeResolution],
    dimension: '3d',
    format: 'rgba16float',
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  };
  const uvTextureA = deps.device.createTexture(texDesc);
  const uvTextureB = deps.device.createTexture(texDesc);

  const seed = new Uint16Array(volumeResolution * volumeResolution * volumeResolution * 4);
  const halfOne = floatToHalf(1.0);
  const halfZero = floatToHalf(0.0);
  const halfHalf = floatToHalf(0.5);
  for (let z = 0; z < volumeResolution; z++) {
    for (let y = 0; y < volumeResolution; y++) {
      for (let x = 0; x < volumeResolution; x++) {
        const i = (z * volumeResolution * volumeResolution + y * volumeResolution + x) * 4;
        seed[i] = halfOne;
        seed[i + 1] = halfZero;
        seed[i + 2] = halfZero;
        seed[i + 3] = halfZero;
      }
    }
  }

  const seedCount = 80;
  const low = 0.3;
  const high = 0.7;
  for (let b = 0; b < seedCount; b++) {
    const cx = Math.floor(volumeResolution * (low + Math.random() * (high - low)));
    const cy = Math.floor(volumeResolution * (low + Math.random() * (high - low)));
    const cz = Math.floor(volumeResolution * (low + Math.random() * (high - low)));
    const r = Math.random() < 0.5 ? 1 : 2;
    for (let dz = -r; dz <= r; dz++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy + dz * dz > r * r) continue;
          const x = cx + dx;
          const y = cy + dy;
          const z = cz + dz;
          if (x < 0 || y < 0 || z < 0 || x >= volumeResolution || y >= volumeResolution || z >= volumeResolution) continue;
          const i = (z * volumeResolution * volumeResolution + y * volumeResolution + x) * 4;
          seed[i] = halfHalf;
          seed[i + 1] = halfHalf;
        }
      }
    }
  }

  deps.device.queue.writeTexture(
    { texture: uvTextureA },
    seed.buffer,
    { bytesPerRow: volumeResolution * 8, rowsPerImage: volumeResolution },
    [volumeResolution, volumeResolution, volumeResolution]
  );
  deps.device.queue.writeTexture(
    { texture: uvTextureB },
    seed.buffer,
    { bytesPerRow: volumeResolution * 8, rowsPerImage: volumeResolution },
    [volumeResolution, volumeResolution, volumeResolution]
  );

  const computeModule = deps.createShaderModuleChecked('reaction.compute', shaderSource('reaction.compute'));
  const computeBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float', viewDimension: '3d' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba16float', viewDimension: '3d' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const paramsBuffer = deps.device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const computePipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' },
  });
  const computeBindGroups = [
    deps.device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: uvTextureA.createView({ dimension: '3d' }) },
        { binding: 1, resource: uvTextureB.createView({ dimension: '3d' }) },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
    deps.device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: uvTextureB.createView({ dimension: '3d' }) },
        { binding: 1, resource: uvTextureA.createView({ dimension: '3d' }) },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
  ];

  const renderModule = deps.createShaderModuleChecked('reaction.render', shaderSource('reaction.render'));
  const sampler = deps.device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
    addressModeW: 'clamp-to-edge',
  });
  const cameraBuffer = deps.device.createBuffer({
    size: deps.cameraStride * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const renderParamsBuffer = deps.device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const renderBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '3d' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });
  const renderPipeline = deps.device.createRenderPipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule,
      entryPoint: 'fs_main',
      targets: [{
        format: deps.renderTargetFormat,
        blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'less' },
    multisample: { count: deps.renderSampleCount },
  });

  const renderBindGroups = [0, 1].map((viewIndex) =>
    [0, 1].map((pong) =>
      deps.device.createBindGroup({
        layout: renderBGL,
        entries: [
          { binding: 0, resource: (pong === 0 ? uvTextureA : uvTextureB).createView({ dimension: '3d' }) },
          { binding: 1, resource: sampler },
          {
            binding: 2,
            resource: {
              buffer: cameraBuffer,
              offset: viewIndex * deps.cameraStride,
              size: deps.cameraSize,
            },
          },
          { binding: 3, resource: { buffer: renderParamsBuffer } },
        ],
      })
    )
  );

  const workgroupsX = Math.ceil(volumeResolution / 8);
  const workgroupsY = Math.ceil(volumeResolution / 8);
  const workgroupsZ = Math.ceil(volumeResolution / 4);
  const depthRef: DepthRef = {};
  let pong = 0;

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = deps.state.reaction;
      const steps = Math.max(1, Math.floor(p.stepsPerFrame));
      // [LAW:dataflow-not-control-flow] Stability is encoded in dt/substep data;
      // the compute pass always runs the same step kernel shape.
      const stableDt = 0.65;
      const requestedMultiplier = Math.max(0, deps.state.fx.timeScale);
      const effectiveSteps = Math.max(0, Math.round(steps * requestedMultiplier));
      deps.device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([
        p.feed, p.kill, p.Du, p.Dv, stableDt, volumeResolution, 0, 0,
      ]));
      for (let i = 0; i < effectiveSteps; i++) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, computeBindGroups[pong]);
        pass.dispatchWorkgroups(workgroupsX, workgroupsY, workgroupsZ);
        pass.end();
        pong = 1 - pong;
      }
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : deps.getDefaultAspect();
      deps.device.queue.writeBuffer(
        cameraBuffer,
        viewIndex * deps.cameraStride,
        deps.getCameraUniformData(aspect)
      );
      deps.device.queue.writeBuffer(
        renderParamsBuffer,
        0,
        new Float32Array([volumeResolution, deps.state.reaction.isoThreshold, worldSize, 256])
      );

      const pass = encoder.beginRenderPass({
        colorAttachments: [deps.getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: deps.getDepthAttachment(depthRef, viewport),
      });

      const renderViewport = deps.getRenderViewport(viewport);
      if (renderViewport) {
        pass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }

      deps.renderGrid(pass, aspect, viewIndex);
      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBindGroups[viewIndex][1 - pong]);
      pass.draw(3);
      pass.end();
    },

    getCount() {
      return `${volumeResolution}³`;
    },

    destroy() {
      uvTextureA.destroy();
      uvTextureB.destroy();
      paramsBuffer.destroy();
      cameraBuffer.destroy();
      renderParamsBuffer.destroy();
      deps.destroyDepthRef(depthRef);
    },
  };
}

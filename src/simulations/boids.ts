import { shaderSource } from '../gpu/shaders';
import type { DepthRef, Simulation } from '../types';

import type { SimulationFactoryContext } from './shared';

export function createBoidsSimulation(deps: SimulationFactoryContext): Simulation {
  const count = deps.state.boids.count;
  const particleBytes = count * 32;

  const initData = new Float32Array(count * 8);
  const boundSize = 2.0;
  for (let i = 0; i < count; i++) {
    const off = i * 8;
    initData[off] = (Math.random() - 0.5) * boundSize * 2;
    initData[off + 1] = (Math.random() - 0.5) * boundSize * 2;
    initData[off + 2] = (Math.random() - 0.5) * boundSize * 2;
    initData[off + 4] = (Math.random() - 0.5) * 0.5;
    initData[off + 5] = (Math.random() - 0.5) * 0.5;
    initData[off + 6] = (Math.random() - 0.5) * 0.5;
  }

  const bufferA = deps.device.createBuffer({
    size: particleBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();

  const bufferB = deps.device.createBuffer({
    size: particleBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const paramsBuffer = deps.device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraBuffer = deps.device.createBuffer({
    size: deps.cameraStride * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const computeModule = deps.createShaderModuleChecked('boids.compute', shaderSource('boids.compute'));
  const renderModule = deps.createShaderModuleChecked('boids.render', shaderSource('boids.render'));

  const computeBGL = deps.device.createBindGroupLayout({
    entries: [
      // [LAW:one-source-of-truth] Buffer access mirrors boids.compute.wgsl:
      // particlesIn is read-only and particlesOut is the sole write target.
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const computePipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' },
  });

  const renderBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ],
  });

  const renderPipeline = deps.device.createRenderPipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule,
      entryPoint: 'fs_main',
      targets: [{ format: deps.renderTargetFormat }],
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: deps.renderSampleCount },
  });

  const computeBG = [
    deps.device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: { buffer: bufferA } },
        { binding: 1, resource: { buffer: bufferB } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
    deps.device.createBindGroup({
      layout: computeBGL,
      entries: [
        { binding: 0, resource: { buffer: bufferB } },
        { binding: 1, resource: { buffer: bufferA } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
  ];

  // [LAW:locality-or-seam] View-specific camera offsets stay local to boids
  // so the runtime only provides the shared camera buffer layout contract.
  const renderBGs: GPUBindGroup[][] = [0, 1].map((viewIndex) =>
    [bufferA, bufferB].map((buffer) =>
      deps.device.createBindGroup({
        layout: renderBGL,
        entries: [
          { binding: 0, resource: { buffer } },
          {
            binding: 1,
            resource: {
              buffer: cameraBuffer,
              offset: viewIndex * deps.cameraStride,
              size: deps.cameraSize,
            },
          },
        ],
      })
    )
  );

  let pingPong = 0;
  const depthRef: DepthRef = {};

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = deps.state.boids;
      const m = deps.state.mouse;
      const fullParams = new Float32Array(16);
      // [LAW:dataflow-not-control-flow] Time scaling lives in the dt value itself; the compute shader doesn't branch on pause or reverse.
      fullParams[0] = 0.016 * deps.state.fx.timeScale;
      fullParams[1] = p.separationRadius / 50;
      fullParams[2] = p.alignmentRadius / 50;
      fullParams[3] = p.cohesionRadius / 50;
      fullParams[4] = p.maxSpeed;
      fullParams[5] = p.maxForce;
      fullParams[6] = p.visualRange / 50;
      fullParams[8] = boundSize;
      fullParams[9] = m.worldX;
      fullParams[10] = m.worldY;
      fullParams[11] = m.worldZ;
      fullParams[12] = m.down ? 1.0 : 0.0;
      new Uint32Array(fullParams.buffer)[7] = count;
      deps.device.queue.writeBuffer(paramsBuffer, 0, fullParams);

      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();
      pingPong = 1 - pingPong;
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : deps.getDefaultAspect();
      deps.device.queue.writeBuffer(cameraBuffer, viewIndex * deps.cameraStride, deps.getCameraUniformData(aspect));

      const pass = encoder.beginRenderPass({
        colorAttachments: [deps.getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: deps.getDepthAttachment(depthRef, viewport),
      });

      const renderViewport = viewport;
      if (renderViewport) {
        pass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }

      deps.renderGrid(pass, aspect, viewIndex);
      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBGs[viewIndex][pingPong]);
      pass.draw(3, count);
      pass.end();
    },

    getCount() {
      return count;
    },

    destroy() {
      bufferA.destroy();
      bufferB.destroy();
      paramsBuffer.destroy();
      cameraBuffer.destroy();
    },
  };
}

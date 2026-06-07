import { shaderSource } from '../gpu/shaders';
import type { DepthRef, Simulation } from '../types';

import type { SimulationFactoryContext } from './shared';

export function createPhysicsClassicSimulation(deps: SimulationFactoryContext): Simulation {
  const count = deps.state.physics_classic.count;
  const bodyBytes = count * 32;

  const initData = new Float32Array(count * 8);
  const dist = deps.state.physics_classic.distribution;
  for (let i = 0; i < count; i++) {
    const off = i * 8;
    let x: number;
    let y: number;
    let z: number;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    if (dist === 'disk') {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 2;
      x = Math.cos(angle) * r;
      y = (Math.random() - 0.5) * 0.1;
      z = Math.sin(angle) * r;
      const speed = 0.5 / Math.sqrt(r + 0.1);
      vx = -Math.sin(angle) * speed;
      vz = Math.cos(angle) * speed;
    } else if (dist === 'shell') {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 0.1;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
    } else {
      x = (Math.random() - 0.5) * 4;
      y = (Math.random() - 0.5) * 4;
      z = (Math.random() - 0.5) * 4;
    }
    initData[off] = x;
    initData[off + 1] = y;
    initData[off + 2] = z;
    initData[off + 3] = 0.5 + Math.random() * 2.0;
    initData[off + 4] = vx;
    initData[off + 5] = vy;
    initData[off + 6] = vz;
  }

  const bufferA = deps.device.createBuffer({
    size: bodyBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();

  const bufferB = deps.device.createBuffer({
    size: bodyBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const paramsBuffer = deps.device.createBuffer({
    size: 48,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const attractorBuffer = deps.device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraBuffer = deps.device.createBuffer({
    size: deps.cameraStride * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const computeModule = deps.createShaderModuleChecked(
    'nbody.classic.compute',
    shaderSource('nbody.classic.compute')
  );
  const renderModule = deps.createShaderModuleChecked(
    'nbody.classic.render',
    shaderSource('nbody.classic.render')
  );

  const computeBGL = deps.device.createBindGroupLayout({
    entries: [
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
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
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
          color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
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
          { binding: 2, resource: { buffer: attractorBuffer } },
        ],
      })
    )
  );

  let pingPong = 0;
  const depthRef: DepthRef = {};

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = deps.state.physics_classic;
      const m = deps.state.mouse;
      const buf = new ArrayBuffer(48);
      const f32 = new Float32Array(buf);
      const u32 = new Uint32Array(buf);
      f32[0] = 0.016 * deps.state.fx.timeScale;
      f32[1] = p.G * 0.001;
      f32[2] = p.softening;
      f32[3] = p.damping;
      u32[4] = count;
      f32[8] = m.down ? m.worldX : 0.0;
      f32[9] = m.down ? m.worldY : 0.0;
      f32[10] = m.down ? m.worldZ : 0.0;
      f32[11] = m.down ? 1.0 : 0.0;
      deps.device.queue.writeBuffer(paramsBuffer, 0, new Uint8Array(buf));

      deps.device.queue.writeBuffer(attractorBuffer, 0, new Float32Array([
        m.down ? m.worldX : 0.0,
        m.down ? m.worldY : 0.0,
        m.down ? m.worldZ : 0.0,
        m.down ? 1.0 : 0.0,
      ]));

      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 64));
      pass.end();
      pingPong = 1 - pingPong;
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : deps.getDefaultAspect();
      deps.device.queue.writeBuffer(
        cameraBuffer,
        viewIndex * deps.cameraStride,
        deps.getCameraUniformData(aspect)
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
      pass.setBindGroup(0, renderBGs[viewIndex][pingPong]);
      pass.draw(6, count);
      pass.end();
    },

    getCount() {
      return count;
    },

    destroy() {
      bufferA.destroy();
      bufferB.destroy();
      paramsBuffer.destroy();
      attractorBuffer.destroy();
      cameraBuffer.destroy();
      deps.destroyDepthRef(depthRef);
    },
  };
}

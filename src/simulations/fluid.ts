import { shaderSource } from '../gpu/shaders';
import type { DepthRef, Simulation } from '../types';

import type { SimulationFactoryContext } from './shared';

export function createFluidSimulation(deps: SimulationFactoryContext): Simulation {
  const fluidDt = 0.22;
  const res = deps.state.fluid.resolution;
  const cellCount = res * res;
  const velBytes = cellCount * 8;
  const scalarBytes = cellCount * 4;
  const dyeBytes = cellCount * 16;

  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const velA = deps.device.createBuffer({ size: velBytes, usage });
  const velB = deps.device.createBuffer({ size: velBytes, usage });
  const pressA = deps.device.createBuffer({ size: scalarBytes, usage });
  const pressB = deps.device.createBuffer({ size: scalarBytes, usage });
  const divergenceBuffer = deps.device.createBuffer({ size: scalarBytes, usage });
  const dyeA = deps.device.createBuffer({ size: dyeBytes, usage });
  const dyeB = deps.device.createBuffer({ size: dyeBytes, usage });
  const paramsBuffer = deps.device.createBuffer({
    size: 48,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraBuffer = deps.device.createBuffer({
    size: deps.cameraStride * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const initDye = new Float32Array(cellCount * 4);
  const initVelocity = new Float32Array(cellCount * 2);
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const i = y * res + x;
      const fx = x / res;
      const fy = y / res;
      const cx = fx - 0.5;
      const cy = fy - 0.5;
      initVelocity[i * 2] = -cy * 3.0;
      initVelocity[i * 2 + 1] = cx * 3.0;
    }
  }
  deps.device.queue.writeBuffer(dyeA, 0, initDye);
  deps.device.queue.writeBuffer(velA, 0, initVelocity);

  const forcesAdvectModule = deps.createShaderModuleChecked('fluid.forces', shaderSource('fluid.forces'));
  const diffuseModule = deps.createShaderModuleChecked('fluid.diffuse', shaderSource('fluid.diffuse'));
  const pressureModule = deps.createShaderModuleChecked('fluid.pressure', shaderSource('fluid.pressure'));
  const divergenceModule = deps.createShaderModuleChecked('fluid.divergence', shaderSource('fluid.divergence'));
  const gradientModule = deps.createShaderModuleChecked('fluid.gradient', shaderSource('fluid.gradient'));
  const renderModule = deps.createShaderModuleChecked('fluid.render', shaderSource('fluid.render'));

  const forcesAdvectBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const forcesAdvectPipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [forcesAdvectBGL] }),
    compute: { module: forcesAdvectModule, entryPoint: 'main' },
  });
  const forcesAdvectBindGroup = deps.device.createBindGroup({
    layout: forcesAdvectBGL,
    entries: [
      { binding: 0, resource: { buffer: velA } },
      { binding: 1, resource: { buffer: velB } },
      { binding: 2, resource: { buffer: dyeA } },
      { binding: 3, resource: { buffer: dyeB } },
      { binding: 4, resource: { buffer: paramsBuffer } },
    ],
  });

  const diffuseBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const diffusePipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [diffuseBGL] }),
    compute: { module: diffuseModule, entryPoint: 'main' },
  });
  const diffuseBindGroups = [
    deps.device.createBindGroup({
      layout: diffuseBGL,
      entries: [
        { binding: 0, resource: { buffer: velA } },
        { binding: 1, resource: { buffer: velB } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
    deps.device.createBindGroup({
      layout: diffuseBGL,
      entries: [
        { binding: 0, resource: { buffer: velB } },
        { binding: 1, resource: { buffer: velA } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    }),
  ];

  const divergenceBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const divergencePipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [divergenceBGL] }),
    compute: { module: divergenceModule, entryPoint: 'main' },
  });
  const divergenceBindGroup = deps.device.createBindGroup({
    layout: divergenceBGL,
    entries: [
      { binding: 0, resource: { buffer: velA } },
      { binding: 1, resource: { buffer: divergenceBuffer } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ],
  });

  const pressureBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const pressurePipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [pressureBGL] }),
    compute: { module: pressureModule, entryPoint: 'main' },
  });
  const pressureBindGroups = [
    deps.device.createBindGroup({
      layout: pressureBGL,
      entries: [
        { binding: 0, resource: { buffer: pressA } },
        { binding: 1, resource: { buffer: pressB } },
        { binding: 2, resource: { buffer: divergenceBuffer } },
        { binding: 3, resource: { buffer: paramsBuffer } },
      ],
    }),
    deps.device.createBindGroup({
      layout: pressureBGL,
      entries: [
        { binding: 0, resource: { buffer: pressB } },
        { binding: 1, resource: { buffer: pressA } },
        { binding: 2, resource: { buffer: divergenceBuffer } },
        { binding: 3, resource: { buffer: paramsBuffer } },
      ],
    }),
  ];

  const gradientBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const gradientPipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [gradientBGL] }),
    compute: { module: gradientModule, entryPoint: 'main' },
  });
  const gradientBindGroup = deps.device.createBindGroup({
    layout: gradientBGL,
    entries: [
      { binding: 0, resource: { buffer: velA } },
      { binding: 1, resource: { buffer: velB } },
      { binding: 2, resource: { buffer: pressA } },
      { binding: 3, resource: { buffer: paramsBuffer } },
    ],
  });

  const fluidRenderParamsBuffer = deps.device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  deps.device.queue.writeBuffer(
    fluidRenderParamsBuffer,
    0,
    new Float32Array([res, deps.fluidGridResolution, deps.state.fluid.volumeScale, deps.fluidWorldSize])
  );

  const renderBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
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
  const renderBindGroups: GPUBindGroup[] = [0, 1].map((viewIndex) =>
    deps.device.createBindGroup({
      layout: renderBGL,
      entries: [
        { binding: 0, resource: { buffer: dyeA } },
        { binding: 1, resource: { buffer: fluidRenderParamsBuffer } },
        {
          binding: 2,
          resource: {
            buffer: cameraBuffer,
            offset: viewIndex * deps.cameraStride,
            size: deps.cameraSize,
          },
        },
      ],
    })
  );

  const workgroups = Math.ceil(res / 8);
  const depthRef: DepthRef = {};
  let simulationTime = 0;

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = deps.state.fluid;
      const dyeMode = p.dyeMode === 'rainbow' ? 0 : p.dyeMode === 'single' ? 1 : 2;
      simulationTime += 0.016 * deps.state.fx.timeScale;
      const paramsData = new Float32Array([
        fluidDt * deps.state.fx.timeScale, p.viscosity, p.diffusionRate, p.forceStrength,
        res, deps.state.mouse.x, deps.state.mouse.y, deps.state.mouse.dx,
        deps.state.mouse.dy, deps.state.mouse.down ? 1.0 : 0.0, dyeMode, simulationTime,
      ]);
      deps.device.queue.writeBuffer(paramsBuffer, 0, paramsData);

      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(forcesAdvectPipeline);
        pass.setBindGroup(0, forcesAdvectBindGroup);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
      }
      encoder.copyBufferToBuffer(velB, 0, velA, 0, velBytes);
      encoder.copyBufferToBuffer(dyeB, 0, dyeA, 0, dyeBytes);

      let velocityPong = 0;
      for (let i = 0; i < p.jacobiIterations; i++) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(diffusePipeline);
        pass.setBindGroup(0, diffuseBindGroups[velocityPong]);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
        velocityPong = 1 - velocityPong;
      }
      if (velocityPong === 1) {
        encoder.copyBufferToBuffer(velB, 0, velA, 0, velBytes);
      }

      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(divergencePipeline);
        pass.setBindGroup(0, divergenceBindGroup);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
      }

      let pressurePong = 0;
      for (let i = 0; i < p.jacobiIterations; i++) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(pressurePipeline);
        pass.setBindGroup(0, pressureBindGroups[pressurePong]);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
        pressurePong = 1 - pressurePong;
      }
      if (pressurePong === 1) {
        encoder.copyBufferToBuffer(pressB, 0, pressA, 0, scalarBytes);
      }

      {
        const pass = encoder.beginComputePass();
        pass.setPipeline(gradientPipeline);
        pass.setBindGroup(0, gradientBindGroup);
        pass.dispatchWorkgroups(workgroups, workgroups);
        pass.end();
      }
      encoder.copyBufferToBuffer(velB, 0, velA, 0, velBytes);
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : deps.getDefaultAspect();
      deps.device.queue.writeBuffer(
        cameraBuffer,
        viewIndex * deps.cameraStride,
        deps.getCameraUniformData(aspect)
      );
      deps.device.queue.writeBuffer(
        fluidRenderParamsBuffer,
        0,
        new Float32Array([res, deps.fluidGridResolution, deps.state.fluid.volumeScale, deps.fluidWorldSize])
      );

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
      pass.setBindGroup(0, renderBindGroups[viewIndex]);
      pass.draw(36, deps.fluidGridResolution * deps.fluidGridResolution);
      pass.end();
    },

    getCount() {
      return `${res}x${res}`;
    },

    destroy() {
      velA.destroy();
      velB.destroy();
      pressA.destroy();
      pressB.destroy();
      divergenceBuffer.destroy();
      dyeA.destroy();
      dyeB.destroy();
      paramsBuffer.destroy();
      fluidRenderParamsBuffer.destroy();
      cameraBuffer.destroy();
    },
  };
}

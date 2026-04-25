import SHADER_GRID from '../shaders/grid.wgsl?raw';

type ShaderFactory = (label: string, source: string) => GPUShaderModule;

export interface GridRendererDependencies {
  cameraSize: number;
  cameraStride: number;
  createShaderModuleChecked: ShaderFactory;
  device: GPUDevice;
  getCameraUniformData(aspect: number): BufferSource;
  renderSampleCount: number;
  renderTargetFormat: GPUTextureFormat;
}

export interface GridRenderer {
  destroy(): void;
  render(pass: GPURenderPassEncoder, aspect: number, viewIndex?: number): void;
}

export function createGridRenderer(deps: GridRendererDependencies): GridRenderer {
  const cameraBuffer = deps.device.createBuffer({
    size: deps.cameraStride * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const timeBuffer = deps.device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const timeData = new Float32Array(1);
  const gridModule = deps.createShaderModuleChecked('grid', SHADER_GRID);

  const gridBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });

  const pipeline = deps.device.createRenderPipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [gridBGL] }),
    vertex: { module: gridModule, entryPoint: 'vs_main' },
    fragment: {
      module: gridModule,
      entryPoint: 'fs_main',
      targets: [{
        format: deps.renderTargetFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: deps.renderSampleCount },
  });

  const bindGroups = [0, 1].map((viewIndex) => deps.device.createBindGroup({
    layout: gridBGL,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: cameraBuffer,
          offset: viewIndex * deps.cameraStride,
          size: deps.cameraSize,
        },
      },
      { binding: 1, resource: { buffer: timeBuffer } },
    ],
  }));

  let gridTime = 0;

  return {
    destroy() {
      cameraBuffer.destroy();
      timeBuffer.destroy();
    },
    render(pass, aspect, viewIndex = 0) {
      // [LAW:dataflow-not-control-flow] Grid animation advances on every render
      // call; the same render path runs for every simulation and view.
      gridTime += 0.016;
      timeData[0] = gridTime;
      deps.device.queue.writeBuffer(cameraBuffer, viewIndex * deps.cameraStride, deps.getCameraUniformData(aspect));
      deps.device.queue.writeBuffer(timeBuffer, 0, timeData);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroups[viewIndex]);
      pass.draw(30);
    },
  };
}

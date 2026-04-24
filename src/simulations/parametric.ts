import { mat4 } from '../math/mat4';
import { shaderSource } from '../gpu/shaders';
import type { DepthRef, ShapeName, Simulation } from '../types';

import type { SharedSimulationDependencies } from './shared';

export interface ParametricSimulationDependencies extends SharedSimulationDependencies {
  shapeIds: Record<ShapeName, number>;
}

export function createParametricSimulation(deps: ParametricSimulationDependencies): Simulation {
  const uResolution = 256;
  const vResolution = 256;
  const vertexBytes = uResolution * vResolution * 32;
  const indexCount = (uResolution - 1) * (vResolution - 1) * 6;

  const vertexBuffer = deps.device.createBuffer({
    size: vertexBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
  });
  const indexBuffer = deps.device.createBuffer({
    size: indexCount * 4,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  {
    const indices = new Uint32Array(indexCount);
    let i = 0;
    for (let vi = 0; vi < vResolution - 1; vi++) {
      for (let ui = 0; ui < uResolution - 1; ui++) {
        const tl = vi * uResolution + ui;
        const tr = tl + 1;
        const bl = (vi + 1) * uResolution + ui;
        const br = bl + 1;
        indices[i++] = tl;
        indices[i++] = bl;
        indices[i++] = tr;
        indices[i++] = tr;
        indices[i++] = bl;
        indices[i++] = br;
      }
    }
    deps.device.queue.writeBuffer(indexBuffer, 0, indices);
  }

  const computeParamsBuffer = deps.device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraBuffer = deps.device.createBuffer({
    size: deps.cameraStride * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const modelBuffer = deps.device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let time = 0;
  let animationTime = 0;

  const computeModule = deps.createShaderModuleChecked('parametric.compute', shaderSource('parametric.compute'));
  const computeBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const computePipeline = deps.device.createComputePipeline({
    layout: deps.device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' },
  });
  const computeBindGroup = deps.device.createBindGroup({
    layout: computeBGL,
    entries: [
      { binding: 0, resource: { buffer: vertexBuffer } },
      { binding: 1, resource: { buffer: computeParamsBuffer } },
    ],
  });

  const renderModule = deps.createShaderModuleChecked('parametric.render', shaderSource('parametric.render'));
  const renderBGL = deps.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
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
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    multisample: { count: deps.renderSampleCount },
  });
  const renderBindGroups: GPUBindGroup[] = [0, 1].map((viewIndex) =>
    deps.device.createBindGroup({
      layout: renderBGL,
      entries: [
        { binding: 0, resource: { buffer: vertexBuffer } },
        {
          binding: 1,
          resource: {
            buffer: cameraBuffer,
            offset: viewIndex * deps.cameraStride,
            size: deps.cameraSize,
          },
        },
        { binding: 2, resource: { buffer: modelBuffer } },
      ],
    })
  );

  const depthRef: DepthRef = {};

  return {
    compute(encoder: GPUCommandEncoder) {
      const p = deps.state.parametric;
      time += 0.016 * deps.state.fx.timeScale;
      const maxRate = Math.max(p.p1Rate, p.p2Rate, p.p3Rate, p.p4Rate, p.twistRate);
      animationTime += 0.016 * deps.state.fx.timeScale * (maxRate > 0 ? 1 : 0);

      const oscillate = (min: number, max: number, rate: number, phase: number) =>
        min + (max - min) * (0.5 + 0.5 * Math.sin(time * rate + phase));

      const p1 = oscillate(p.p1Min, p.p1Max, p.p1Rate, 0);
      const p2 = oscillate(p.p2Min, p.p2Max, p.p2Rate, Math.PI * 0.7);
      const p3 = oscillate(p.p3Min, p.p3Max, p.p3Rate, Math.PI * 1.3);
      const p4 = oscillate(p.p4Min, p.p4Max, p.p4Rate, Math.PI * 0.4);
      const twist = oscillate(p.twistMin, p.twistMax, p.twistRate, Math.PI * 0.9);

      const m = deps.state.mouse;
      const paramsData = new ArrayBuffer(64);
      const u32 = new Uint32Array(paramsData);
      const f32 = new Float32Array(paramsData);
      u32[0] = uResolution;
      u32[1] = vResolution;
      f32[2] = p.scale;
      f32[3] = twist;
      f32[4] = animationTime;
      u32[5] = deps.shapeIds[p.shape] || 0;
      f32[6] = p1;
      f32[7] = p2;
      f32[8] = p3;
      f32[9] = p4;
      f32[10] = m.worldX;
      f32[11] = m.worldY;
      f32[12] = m.worldZ;
      f32[13] = m.down ? 1.0 : 0.0;
      deps.device.queue.writeBuffer(computeParamsBuffer, 0, new Uint8Array(paramsData));

      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBindGroup);
      pass.dispatchWorkgroups(Math.ceil(uResolution / 8), Math.ceil(vResolution / 8));
      pass.end();
    },

    render(encoder: GPUCommandEncoder, textureView: GPUTextureView, viewport: number[] | null, viewIndex = 0) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : deps.getDefaultAspect();
      deps.device.queue.writeBuffer(
        cameraBuffer,
        viewIndex * deps.cameraStride,
        deps.getCameraUniformData(aspect)
      );

      const model = mat4.rotateX(mat4.rotateY(mat4.identity(), animationTime * 0.1), animationTime * 0.03);
      deps.device.queue.writeBuffer(modelBuffer, 0, model as Float32Array<ArrayBuffer>);

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
      pass.setBindGroup(0, renderBindGroups[viewIndex]);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.drawIndexed(indexCount);
      pass.end();
    },

    getCount() {
      return `256×256 (${deps.state.parametric.shape})`;
    },

    destroy() {
      vertexBuffer.destroy();
      indexBuffer.destroy();
      computeParamsBuffer.destroy();
      cameraBuffer.destroy();
      modelBuffer.destroy();
      deps.destroyDepthRef(depthRef);
    },
  };
}

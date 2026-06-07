import type { AppState, Attractor, DepthRef } from '../../types';

import { createPhysicsRenderOverlays } from './markers';
import type { GasReservoir } from '../../gasReservoir';
import { shaderSource } from '../../gpu/shaders';

type ShaderFactory = (label: string, source: string) => GPUShaderModule;

interface PhysicsRenderServiceArgs {
  attractorMax: number;
  bodyBuffers: [GPUBuffer, GPUBuffer];
  cameraBuffer: GPUBuffer;
  cameraSize: number;
  cameraStride: number;
  clearColor: GPUColor;
  count: number;
  createShaderModuleChecked: ShaderFactory;
  device: GPUDevice;
  gas: GasReservoir;
  getAttractorStrength(attractor: Attractor, simStep: number, ceiling: number): number;
  getCameraUniformData(aspect: number): BufferSource;
  getColorAttachment(depthRef: DepthRef, textureView: GPUTextureView, viewport: number[] | null): GPURenderPassColorAttachment;
  getCurrentSceneView(): GPUTextureView;
  getDefaultAspect(): number;
  getDepthAttachment(depthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment;
  getRenderViewport(viewport: number[] | null): number[] | null;
  getSimStep(): number;
  getXrDepthOverride(): GPUTextureView | null;
  markersPerAttractor: number;
  nullColorView: GPUTextureView;
  nullDepthView: GPUTextureView;
  postFxDepthView(): GPUTextureView;
  renderGrid(pass: GPURenderPassEncoder, aspect: number, viewIndex: number): void;
  renderSampleCount: number;
  renderTargetFormat: GPUTextureFormat;
  state: AppState;
  trailBlurBuffer: GPUBuffer;
}

export interface PhysicsRenderService {
  destroy(): void;
  render(
    encoder: GPUCommandEncoder,
    textureView: GPUTextureView,
    viewport: number[] | null,
    viewIndex: number,
    pingPong: number,
    depthRef: DepthRef,
    timestampWrites: {
      gasRender?: GPURenderPassTimestampWrites;
      starsRender?: GPURenderPassTimestampWrites;
    },
  ): void;
}

export function createPhysicsRenderService(
  args: PhysicsRenderServiceArgs,
): PhysicsRenderService {
  const {
    attractorMax,
    bodyBuffers,
    cameraBuffer,
    cameraSize,
    cameraStride,
    clearColor,
    count,
    createShaderModuleChecked,
    device,
    gas,
    getAttractorStrength,
    getCameraUniformData,
    getColorAttachment,
    getCurrentSceneView,
    getDefaultAspect,
    getDepthAttachment,
    getRenderViewport,
    getSimStep,
    getXrDepthOverride,
    markersPerAttractor,
    nullColorView,
    nullDepthView,
    postFxDepthView,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
    trailBlurBuffer,
  } = args;

  const renderModule = createShaderModuleChecked('nbody.render', shaderSource('nbody.render'));
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    ],
  });

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule,
      entryPoint: 'fs_main',
      targets: [{
        format: renderTargetFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    multisample: { count: renderSampleCount },
  });

  const overlays = createPhysicsRenderOverlays({
    attractorMax,
    cameraBuffer,
    cameraSize,
    cameraStride,
    createShaderModuleChecked,
    device,
    getAttractorStrength,
    getSimStep,
    markersPerAttractor,
    renderSampleCount,
    renderTargetFormat,
    state,
  });

  const renderBGs: GPUBindGroup[][] = [0, 1].map((viewIndex) =>
    bodyBuffers.map((buffer) => device.createBindGroup({
      layout: renderBGL,
      entries: [
        { binding: 0, resource: { buffer } },
        { binding: 1, resource: { buffer: cameraBuffer, offset: viewIndex * cameraStride, size: cameraSize } },
        { binding: 2, resource: { buffer: trailBlurBuffer } },
        { binding: 3, resource: { buffer: overlays.attractorFieldBuffer } },
      ],
    })),
  );

  return {
    destroy() {
      overlays.destroy();
    },
    render(encoder, textureView, viewport, viewIndex, pingPong, depthRef, timestampWrites) {
      const aspect = viewport ? (viewport[2] / viewport[3]) : getDefaultAspect();
      device.queue.writeBuffer(cameraBuffer, viewIndex * cameraStride, getCameraUniformData(aspect));
      overlays.syncAttractorField();

      const pass = encoder.beginRenderPass({
        colorAttachments: [getColorAttachment(depthRef, textureView, viewport)],
        depthStencilAttachment: getDepthAttachment(depthRef, viewport),
        ...(timestampWrites.starsRender ? { timestampWrites: timestampWrites.starsRender } : {}),
      });

      const renderViewport = getRenderViewport(viewport);
      if (renderViewport) {
        pass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }

      renderGrid(pass, aspect, viewIndex);
      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBGs[viewIndex][pingPong]);
      pass.draw(6, count);
      overlays.renderMarkers(pass, viewIndex);
      pass.end();

      const gasVisible = state.physics.gasVisible;
      const gasColorView = gasVisible ? getCurrentSceneView() : nullColorView;
      const xrDepthOverride = getXrDepthOverride();
      const gasDepthView = gasVisible ? (xrDepthOverride ?? postFxDepthView()) : nullDepthView;
      const gasPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: gasColorView,
          clearValue: clearColor,
          loadOp: 'load',
          storeOp: 'store',
        }],
        depthStencilAttachment: {
          view: gasDepthView,
          depthClearValue: 1.0,
          depthLoadOp: 'load',
          depthStoreOp: 'store',
        },
        ...(timestampWrites.gasRender ? { timestampWrites: timestampWrites.gasRender } : {}),
      });
      if (gasVisible && renderViewport) {
        gasPass.setViewport(renderViewport[0], renderViewport[1], renderViewport[2], renderViewport[3], 0, 1);
      }
      gas.render(gasPass, viewIndex, gasVisible);
      gasPass.end();
    },
  };
}

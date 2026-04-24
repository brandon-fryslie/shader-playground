import type { AppState, DepthRef } from '../types';

export interface SharedSimulationDependencies {
  cameraSize: number;
  cameraStride: number;
  createShaderModuleChecked(label: string, code: string): GPUShaderModule;
  destroyDepthRef(depthRef: DepthRef): void;
  device: GPUDevice;
  getCameraUniformData(aspect: number): Float32Array<ArrayBuffer>;
  getColorAttachment(
    depthRef: DepthRef,
    textureView: GPUTextureView,
    viewport: number[] | null
  ): GPURenderPassColorAttachment;
  getDefaultAspect(): number;
  getDepthAttachment(depthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment;
  getRenderViewport(viewport: number[] | null): number[] | null;
  renderGrid(pass: GPURenderPassEncoder, aspect: number, viewIndex?: number): void;
  renderSampleCount: number;
  renderTargetFormat: GPUTextureFormat;
  state: AppState;
}

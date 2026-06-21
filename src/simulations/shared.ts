import type { GpuTimingBucket, TimestampWrites } from '../gpu/timestamps';
import type { AppState, Attractor, DepthRef, ShapeName, Simulation } from '../types';

export interface SharedSimulationDependencies {
  cameraSize: number;
  cameraStride: number;
  createShaderModuleChecked(label: string, code: string): GPUShaderModule;
  device: GPUDevice;
  getCameraUniformData(aspect: number): Float32Array<ArrayBuffer>;
  getColorAttachment(
    depthRef: DepthRef,
    textureView: GPUTextureView,
    viewport: number[] | null
  ): GPURenderPassColorAttachment;
  getDefaultAspect(): number;
  getDepthAttachment(depthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment;
  renderGrid(pass: GPURenderPassEncoder, aspect: number, viewIndex?: number): void;
  renderSampleCount: number;
  renderTargetFormat: GPUTextureFormat;
  state: AppState;
}

export interface SimulationFactoryContext extends SharedSimulationDependencies {
  attractorMax: number;
  baseDt: number;
  clearColor: GPUColor;
  fluidGridResolution: number;
  fluidWorldSize: number;
  getAttractorStrength(attractor: Attractor, simStep: number, ceiling: number): number;
  getCurrentSceneView(): GPUTextureView;
  getXrDepthOverride(): GPUTextureView | null;
  markersPerAttractor: number;
  nullColorView: GPUTextureView;
  nullDepthView: GPUTextureView;
  postFxDepthView(): GPUTextureView;
  shapeIds: Record<ShapeName, number>;
  tsWrites(bucket: GpuTimingBucket): TimestampWrites | undefined;
}

export type SimulationContextFactory = (context: SimulationFactoryContext) => Simulation;

import type { AppState, Attractor } from '../../types';

import SHADER_MARKERS_RENDER from '../../shaders/markers.render.wgsl?raw';

export interface PhysicsRenderOverlays {
  attractorFieldBuffer: GPUBuffer;
  syncAttractorField(): void;
  renderMarkers(pass: GPURenderPassEncoder, viewIndex: number): void;
  destroy(): void;
}

interface PhysicsRenderOverlayDependencies {
  attractorMax: number;
  cameraBuffer: GPUBuffer;
  cameraSize: number;
  cameraStride: number;
  createShaderModuleChecked(label: string, source: string): GPUShaderModule;
  device: GPUDevice;
  getAttractorStrength(attractor: Attractor, simStep: number, ceiling: number): number;
  getSimStep(): number;
  markersPerAttractor: number;
  renderSampleCount: number;
  renderTargetFormat: GPUTextureFormat;
  state: AppState;
}

export function createPhysicsRenderOverlays(
  deps: PhysicsRenderOverlayDependencies,
): PhysicsRenderOverlays {
  const {
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
  } = deps;

  // [LAW:one-source-of-truth] This module is the only owner of the render-side
  // attractor field + marker GPU mirrors for the physics simulation.
  const attractorFieldBuffer = device.createBuffer({
    size: 528,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const attractorFieldData = new ArrayBuffer(528);
  const attractorFieldF32 = new Float32Array(attractorFieldData);
  const attractorFieldU32 = new Uint32Array(attractorFieldData);

  const markerPool = attractorMax * markersPerAttractor;
  const markerStride = 32;
  const markerBuffer = device.createBuffer({
    size: markerPool * markerStride,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const markerData = new Float32Array(markerPool * 8);

  const markerModule = createShaderModuleChecked('markers.render', SHADER_MARKERS_RENDER);
  const markerBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });
  const markerPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [markerBGL] }),
    vertex: { module: markerModule, entryPoint: 'vs_main' },
    fragment: {
      module: markerModule,
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
  const markerBGs: GPUBindGroup[] = [0, 1].map((viewIndex) => device.createBindGroup({
    layout: markerBGL,
    entries: [
      { binding: 0, resource: { buffer: markerBuffer } },
      { binding: 1, resource: { buffer: cameraBuffer, offset: viewIndex * cameraStride, size: cameraSize } },
    ],
  }));

  function syncAttractorField(): void {
    const ceiling = state.physics.interactionStrength ?? 1;
    const step = getSimStep();
    const attractors = state.attractors;
    const n = Math.min(attractors.length, attractorMax);
    const invLogMax = 1 / Math.log(1 + Math.max(ceiling, 1));
    attractorFieldU32[0] = n;
    attractorFieldU32[1] = 0;
    attractorFieldU32[2] = 0;
    attractorFieldU32[3] = 0;
    for (let i = 0; i < n; i++) {
      const attractor = attractors[i];
      const strength = getAttractorStrength(attractor, step, ceiling);
      const base = 4 + i * 4;
      attractorFieldF32[base] = attractor.x;
      attractorFieldF32[base + 1] = attractor.y;
      attractorFieldF32[base + 2] = attractor.z;
      attractorFieldF32[base + 3] = Math.max(0, Math.min(1, Math.log(1 + strength) * invLogMax));
    }
    for (let i = n; i < attractorMax; i++) {
      const base = 4 + i * 4;
      attractorFieldF32[base] = 0;
      attractorFieldF32[base + 1] = 0;
      attractorFieldF32[base + 2] = 0;
      attractorFieldF32[base + 3] = 0;
    }
    device.queue.writeBuffer(attractorFieldBuffer, 0, attractorFieldData);
  }

  function renderMarkers(pass: GPURenderPassEncoder, viewIndex: number): void {
    const markers = state.markers;
    const n = Math.min(markers.length, markerPool);
    if (n === 0) return;

    // [LAW:one-source-of-truth] Marker brightness is derived from the same
    // attractor-strength function used by physics compute and field packing.
    const ceiling = state.physics.interactionStrength ?? 1;
    const step = getSimStep();
    const invLogMax = 1 / Math.log(1 + Math.max(ceiling, 1));
    for (let i = 0; i < n; i++) {
      const marker = markers[i];
      const attractor = state.attractors[marker.attractorIdx];
      const strength = attractor ? getAttractorStrength(attractor, step, ceiling) : 0;
      const strengthNorm = Math.max(0, Math.min(1, Math.log(1 + strength) * invLogMax));
      const offset = i * 8;
      markerData[offset] = marker.x;
      markerData[offset + 1] = marker.y;
      markerData[offset + 2] = marker.z;
      markerData[offset + 3] = strengthNorm;
      markerData[offset + 4] = marker.tintR;
      markerData[offset + 5] = marker.tintG;
      markerData[offset + 6] = marker.tintB;
      markerData[offset + 7] = marker.seed;
    }
    device.queue.writeBuffer(markerBuffer, 0, markerData.buffer, 0, n * markerStride);
    pass.setPipeline(markerPipeline);
    pass.setBindGroup(0, markerBGs[viewIndex]);
    pass.draw(6, n);
  }

  return {
    attractorFieldBuffer,
    syncAttractorField,
    renderMarkers,
    destroy() {
      // [LAW:single-enforcer] Overlay GPU resources are released from exactly
      // one owner so physics destroy cannot drift across callsites.
      attractorFieldBuffer.destroy();
      markerBuffer.destroy();
    },
  };
}

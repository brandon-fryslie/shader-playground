// XR widget GPU renderer.
// Owns the pipeline, instance buffer, and bind group for xr-widgets.wgsl.
// One draw call per eye per frame. CPU work is data-driven: build the
// instance buffer from RenderCommand[] and instanced-draw, regardless of
// kind. [LAW:dataflow-not-control-flow] no per-kind CPU branch.
//
// [LAW:one-source-of-truth] RenderCommand is the single source the renderer
// reads. Widget poses/values are NOT cached in the renderer.
// [LAW:one-way-deps] Renderer imports RenderCommand from step.ts; step.ts
// never imports the renderer.

import type { RenderCommand } from './step';
import type { Widget } from './widgets';
import SHADER_XR_WIDGETS from '../shaders/xr-widgets.wgsl?raw';

const MAX_INSTANCES = 64;
// 48 bytes per instance. Layout matches xr-widgets.wgsl Instance struct.
//   vec3 position (12) + f32 halfExtentX (4)
//   vec4 orientation (16) + f32 halfExtentY (4)
//   u32 kind (4) + u32 flags (4) + f32 value (4) + pad (4) = struct stride 48
const INSTANCE_STRIDE_BYTES = 48;
const CAMERA_SIZE = 208;
const CAMERA_STRIDE = 256;

const KIND_SLIDER = 0;
const KIND_BUTTON = 1;
const KIND_READOUT = 2;
const KIND_OTHER = 3;

function widgetKindCode(k: Widget['kind']): number {
  if (k === 'slider') return KIND_SLIDER;
  if (k === 'button') return KIND_BUTTON;
  if (k === 'readout') return KIND_READOUT;
  return KIND_OTHER;
}

export interface XrWidgetRenderer {
  draw(encoder: GPUCommandEncoder, sceneView: GPUTextureView, sceneFormat: GPUTextureFormat, viewIndex: number, commands: RenderCommand[]): void;
  destroy(): void;
}

export function createXrWidgetRenderer(
  device: GPUDevice,
  cameraBuffer: GPUBuffer,
  uploadCameraData: (viewIndex: number) => Float32Array,
): XrWidgetRenderer {
  const module = device.createShaderModule({ code: SHADER_XR_WIDGETS, label: 'xr-widgets' });

  const bgl = device.createBindGroupLayout({
    label: 'xr-widgets-bgl',
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX,                          buffer: { type: 'read-only-storage' } },
    ],
  });

  const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });

  const instanceBuffer = device.createBuffer({
    label: 'xr-widgets-instances',
    size: INSTANCE_STRIDE_BYTES * MAX_INSTANCES,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // CPU-side staging — one Float32 view + one Uint32 view over the same buffer.
  const stagingBacking = new ArrayBuffer(INSTANCE_STRIDE_BYTES * MAX_INSTANCES);
  const stagingF = new Float32Array(stagingBacking);
  const stagingU = new Uint32Array(stagingBacking);

  // One bind group per eye — different camera-buffer offset.
  const bindGroups: GPUBindGroup[] = [];
  for (let vi = 0; vi < 2; vi++) {
    bindGroups.push(device.createBindGroup({
      label: `xr-widgets-bg-eye${vi}`,
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
        { binding: 1, resource: { buffer: instanceBuffer } },
      ],
    }));
  }

  const pipelineByFormat = new Map<GPUTextureFormat, GPURenderPipeline>();
  function pipelineFor(format: GPUTextureFormat): GPURenderPipeline {
    let p = pipelineByFormat.get(format);
    if (p) return p;
    p = device.createRenderPipeline({
      label: `xr-widgets-pipeline-${format}`,
      layout,
      vertex:   { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{
        format,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }] },
      primitive: { topology: 'triangle-list' },
    });
    pipelineByFormat.set(format, p);
    return p;
  }

  function writeInstances(commands: RenderCommand[]): number {
    const n = Math.min(commands.length, MAX_INSTANCES);
    for (let i = 0; i < n; i++) {
      const c = commands[i];
      const o = (INSTANCE_STRIDE_BYTES / 4) * i; // float index
      stagingF[o + 0] = c.pose.position[0];
      stagingF[o + 1] = c.pose.position[1];
      stagingF[o + 2] = c.pose.position[2];
      stagingF[o + 3] = c.visualHalfExtent.x;
      stagingF[o + 4] = c.pose.orientation[0];
      stagingF[o + 5] = c.pose.orientation[1];
      stagingF[o + 6] = c.pose.orientation[2];
      stagingF[o + 7] = c.pose.orientation[3];
      stagingF[o + 8] = c.visualHalfExtent.y;
      stagingU[o + 9]  = widgetKindCode(c.kind);
      const flags = (c.state.hover ? 1 : 0) | (c.state.pressed ? 2 : 0) | (c.state.dragging ? 4 : 0);
      stagingU[o + 10] = flags >>> 0;
      // value ∈ [0, 1] for slider — derived from binding value & widget range outside this
      // module if needed. RenderCommand.state.value is the raw binding value; for the MVP
      // we just stuff it through and let the shader clamp. Ticket .19 normalizes properly.
      stagingF[o + 11] = c.state.value ?? 0;
    }
    return n;
  }

  return {
    draw(encoder, sceneView, sceneFormat, viewIndex, commands) {
      // [LAW:dataflow-not-control-flow] Always upload camera data + instance buffer
      // and run the pass; an empty commands array results in n=0 → no draw call.
      // This keeps the pass shape constant and avoids a CPU "should we render?" branch.
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, uploadCameraData(viewIndex) as Float32Array<ArrayBuffer>);
      const n = writeInstances(commands);
      if (n > 0) {
        device.queue.writeBuffer(instanceBuffer, 0, stagingBacking, 0, n * INSTANCE_STRIDE_BYTES);
      }
      const pass = encoder.beginRenderPass({
        label: `xr-widgets-pass-eye${viewIndex}`,
        colorAttachments: [{
          view: sceneView,
          loadOp: 'load',  // overlay onto whatever sim.render produced
          storeOp: 'store',
        }],
      });
      if (n > 0) {
        pass.setPipeline(pipelineFor(sceneFormat));
        pass.setBindGroup(0, bindGroups[viewIndex]);
        pass.draw(6, n);
      }
      pass.end();
    },
    destroy() {
      instanceBuffer.destroy();
    },
  };
}

// XR widget GPU renderer.
// Owns the pipeline, instance buffer, bind group, and label atlas for
// xr-widgets.wgsl. One draw call per eye per frame. CPU work is data-driven:
// build the instance buffer from RenderCommand[] and instanced-draw, regardless
// of kind. [LAW:dataflow-not-control-flow] no per-kind CPU branch.
//
// [LAW:one-source-of-truth] RenderCommand is the single source the renderer
// reads. Widget poses/values are NOT cached in the renderer; only the label
// atlas keeps a per-widget lastLabel string to avoid re-rasterizing text every
// frame when the value hasn't changed.
// [LAW:one-way-deps] Renderer imports RenderCommand from step.ts; step.ts
// never imports the renderer.

import type { RenderCommand } from './step';
import type { Widget } from './widgets';
import SHADER_XR_WIDGETS from '../shaders/xr-widgets.wgsl?raw';

const MAX_INSTANCES = 64;
// 64 bytes per instance — matches xr-widgets.wgsl Instance struct.
//   16: position vec3 + halfExtentX
//   16: orientation vec4
//   16: halfExtentY + kind + flags + value
//   16: labelStripIndex + hasLabel + 2 pad u32
const INSTANCE_STRIDE_BYTES = 64;
const CAMERA_SIZE = 208;
const CAMERA_STRIDE = 256;

// Label atlas. One row of pixels per widget; widgets ask for a strip the
// first time they need a label and the renderer re-rasterizes on text change.
// Bumped from 256x32 → 512x64 strips after first XR session reported text
// "completely unreadable" — the lower resolution was too soft when sampled
// across a typical 16cm-wide widget at 60cm distance.
const ATLAS_W = 512;
const STRIP_H = 64;
const MAX_STRIPS = MAX_INSTANCES;            // one strip per instance slot
const ATLAS_H = STRIP_H * MAX_STRIPS;        // 4096 px (8 MB RGBA8)

// Widget kind codes — must match xr-widgets.wgsl. Add a kind here AND a case
// in the fragment shader (and ideally bump this list to a shared constants file
// when we exceed 9 kinds; for now duplication is acceptable).
const KIND: Record<Widget['kind'], number> = {
  slider:         0,
  button:         1,
  readout:        2,
  dial:           3,
  toggle:         4,
  stepper:        5,
  'enum-chips':   6,
  'preset-tile':  7,
  'category-tile':8,
};

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
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ],
  });

  const layout = device.createPipelineLayout({ bindGroupLayouts: [bgl] });

  const instanceBuffer = device.createBuffer({
    label: 'xr-widgets-instances',
    size: INSTANCE_STRIDE_BYTES * MAX_INSTANCES,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const stagingBacking = new ArrayBuffer(INSTANCE_STRIDE_BYTES * MAX_INSTANCES);
  const stagingF = new Float32Array(stagingBacking);
  const stagingU = new Uint32Array(stagingBacking);

  // ── LABEL ATLAS ──────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctxNullable = canvas.getContext('2d');
  if (!ctxNullable) throw new Error('xr-widgets: 2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = ctxNullable;
  ctx.font = '600 40px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const atlasTex = device.createTexture({
    label: 'xr-widgets-label-atlas',
    size: [ATLAS_W, ATLAS_H, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const atlasView = atlasTex.createView();

  const atlasSampler = device.createSampler({
    label: 'xr-widgets-atlas-sampler',
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });

  // widget id → assigned strip + cached label text. lastLabel is '' on first
  // assignment (forces an initial render). We never recycle strips: a panel
  // swap will overwrite labels, and total widget count is bounded by
  // MAX_INSTANCES anyway.
  const stripsByWidget = new Map<string, { stripIndex: number; lastLabel: string }>();
  let nextStripIndex = 0;

  function ensureLabelStrip(widgetId: string, label: string): number {
    let entry = stripsByWidget.get(widgetId);
    if (!entry) {
      if (nextStripIndex >= MAX_STRIPS) return -1;
      entry = { stripIndex: nextStripIndex++, lastLabel: '' };
      stripsByWidget.set(widgetId, entry);
    }
    if (entry.lastLabel === label) return entry.stripIndex;
    entry.lastLabel = label;
    const y = entry.stripIndex * STRIP_H;
    // Clear, then draw the text. White on transparent so the shader can blend
    // with whatever fill color the widget kind chose.
    ctx.clearRect(0, y, ATLAS_W, STRIP_H);
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillText(label, ATLAS_W / 2, y + STRIP_H / 2);
    device.queue.copyExternalImageToTexture(
      { source: canvas, origin: { x: 0, y } },
      { texture: atlasTex, origin: { x: 0, y } },
      [ATLAS_W, STRIP_H, 1],
    );
    return entry.stripIndex;
  }

  // ── BIND GROUPS / PIPELINE ───────────────────────────────────────────────
  const bindGroups: GPUBindGroup[] = [];
  for (let vi = 0; vi < 2; vi++) {
    bindGroups.push(device.createBindGroup({
      label: `xr-widgets-bg-eye${vi}`,
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: cameraBuffer, offset: vi * CAMERA_STRIDE, size: CAMERA_SIZE } },
        { binding: 1, resource: { buffer: instanceBuffer } },
        { binding: 2, resource: atlasView },
        { binding: 3, resource: atlasSampler },
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
      const o = (INSTANCE_STRIDE_BYTES / 4) * i; // float index (also u32 index)
      stagingF[o + 0]  = c.pose.position[0];
      stagingF[o + 1]  = c.pose.position[1];
      stagingF[o + 2]  = c.pose.position[2];
      stagingF[o + 3]  = c.visualHalfExtent.x;
      stagingF[o + 4]  = c.pose.orientation[0];
      stagingF[o + 5]  = c.pose.orientation[1];
      stagingF[o + 6]  = c.pose.orientation[2];
      stagingF[o + 7]  = c.pose.orientation[3];
      stagingF[o + 8]  = c.visualHalfExtent.y;
      stagingU[o + 9]  = KIND[c.kind] ?? 0;
      const flags = (c.state.hover ? 1 : 0) | (c.state.pressed ? 2 : 0) | (c.state.dragging ? 4 : 0);
      stagingU[o + 10] = flags >>> 0;
      stagingF[o + 11] = c.state.value ?? 0;
      // Label slot. -1 sentinel from ensureLabelStrip → hasLabel=0 path in shader.
      const stripIndex = (c.label != null && c.label.length > 0)
        ? ensureLabelStrip(c.widgetId, c.label)
        : -1;
      stagingU[o + 12] = stripIndex >= 0 ? stripIndex >>> 0 : 0;
      stagingU[o + 13] = stripIndex >= 0 ? 1 : 0;
      stagingU[o + 14] = 0;
      stagingU[o + 15] = 0;
    }
    return n;
  }

  return {
    draw(encoder, sceneView, sceneFormat, viewIndex, commands) {
      // [LAW:dataflow-not-control-flow] Always upload camera + instance buffer
      // and run the pass; an empty commands array results in n=0 → no draw call.
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, uploadCameraData(viewIndex) as Float32Array<ArrayBuffer>);
      const n = writeInstances(commands);
      if (n > 0) {
        device.queue.writeBuffer(instanceBuffer, 0, stagingBacking, 0, n * INSTANCE_STRIDE_BYTES);
      }
      const pass = encoder.beginRenderPass({
        label: `xr-widgets-pass-eye${viewIndex}`,
        colorAttachments: [{
          view: sceneView,
          loadOp: 'load',
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
      atlasTex.destroy();
    },
  };
}

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

import type { RenderCommand, SubZoneRenderState } from './step';
import type { Widget } from './widgets';
// [LAW:one-way-deps] The widget shader is co-located inside the package so
// src/xr-ui/ is self-contained and depends on nothing outside itself — the
// directory can be lifted into a standalone package as-is. (?raw is the Vite
// loader contract the consuming build must provide.)
import SHADER_XR_WIDGETS from './xr-widgets.wgsl?raw';

const MAX_INSTANCES = 64;
// 64 bytes per instance — matches xr-widgets.wgsl Instance struct.
//   16: position vec3 + halfExtentX
//   16: orientation vec4
//   16: halfExtentY + kind + flags + value
//   16: labelStripIndex + hasLabel + alpha + subZoneState (u32)
const INSTANCE_STRIDE_BYTES = 64;

// The renderer owns its per-eye camera uniform — it does NOT borrow a host
// buffer in the host's layout. Layout matches xr-widgets.wgsl `Camera` and
// holds only what that shader reads:
//   floats  0..15  view  (mat4)
//   floats 16..31  proj  (mat4)
//   floats 32..34  primary  (35 pad)
//   floats 36..38  secondary (39 pad)
//   floats 40..42  accent   (43 pad)
// = 176 bytes. Per-eye slices are 256-aligned (minUniformBufferOffsetAlignment).
const CAMERA_FLOATS = 44;
const CAMERA_SIZE = CAMERA_FLOATS * 4;          // 176
const CAMERA_STRIDE = 256;
const EYE_COUNT = 2;                            // Apple Vision Pro stereo

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

// Per-eye geometry the host supplies each draw. Column-major mat4 (16 floats
// each), the same convention WebXR's XRView matrices use. Distinct per eye.
export interface XrWidgetCamera {
  view: Float32Array;
  proj: Float32Array;
}

// The menu's theme palette. Shared across both eyes; rgb triplets. A separate
// concern from camera geometry [LAW:decomposition] — the host owes both, but as
// two values, not one fused buffer.
export interface XrWidgetTheme {
  primary: ArrayLike<number>;
  secondary: ArrayLike<number>;
  accent: ArrayLike<number>;
}

export interface XrWidgetRenderer {
  draw(
    encoder: GPUCommandEncoder,
    sceneView: GPUTextureView,
    sceneFormat: GPUTextureFormat,
    viewIndex: number,
    camera: XrWidgetCamera,
    theme: XrWidgetTheme,
    commands: RenderCommand[],
  ): void;
  destroy(): void;
}

export function createXrWidgetRenderer(device: GPUDevice): XrWidgetRenderer {
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

  // [LAW:decomposition] The renderer owns its GPU camera resource; the host owes
  // data (matrices + palette), not a buffer. One 256-aligned slice per eye.
  const cameraBuffer = device.createBuffer({
    label: 'xr-widgets-camera',
    size: CAMERA_STRIDE * EYE_COUNT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  // Reused scratch for packing one eye's uniform. Pad floats (35/39/43) stay 0.
  const cameraScratch = new Float32Array(CAMERA_FLOATS);

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

  // [LAW:one-source-of-truth] Strip index == instance slot index. MAX_STRIPS == MAX_INSTANCES, so
  // every slot has exactly one strip and every strip has exactly one slot. The atlas cache is keyed
  // by slot, not by widget identity — layout churn / tab swaps can't leak new entries into an
  // unbounded map. Slot shuffles naturally re-render because the text in that slot changed.
  // '' on a slot forces an initial render; after that, steady-state reuse hits the cache.
  const lastLabelByStrip: string[] = new Array(MAX_STRIPS).fill('');

  function ensureLabelStrip(stripIndex: number, label: string): number {
    if (lastLabelByStrip[stripIndex] === label) return stripIndex;
    lastLabelByStrip[stripIndex] = label;
    const y = stripIndex * STRIP_H;
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
    return stripIndex;
  }

  // ── BIND GROUPS / PIPELINE ───────────────────────────────────────────────
  const bindGroups: GPUBindGroup[] = [];
  for (let vi = 0; vi < EYE_COUNT; vi++) {
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
      // Flag bits MUST match xr-widgets.wgsl. Adding a bit here without the
      // shader change yields silent visual no-ops.
      //   bit 0 hover, bit 1 pressed, bit 2 dragging, bit 3 fineMode
      const flags = (c.state.hover ? 1 : 0)
                  | (c.state.pressed ? 2 : 0)
                  | (c.state.dragging ? 4 : 0)
                  | (c.fineMode ? 8 : 0);
      stagingU[o + 10] = flags >>> 0;
      stagingF[o + 11] = c.state.value ?? 0;
      // Label slot == instance slot. -1 sentinel when the command has no label → hasLabel=0 path in shader.
      const stripIndex = (c.label != null && c.label.length > 0)
        ? ensureLabelStrip(i, c.label)
        : -1;
      stagingU[o + 12] = stripIndex >= 0 ? stripIndex >>> 0 : 0;
      stagingU[o + 13] = stripIndex >= 0 ? 1 : 0;
      // alpha (f32) shares slot 14 with the shader's `alpha` field. Widget
      // visibility is uniform per-panel (.18): the same value is written for
      // every instance owned by that panel; the renderer is dumb to that —
      // it just multiplies output alpha by inst.alpha. [LAW:dataflow-not-control-flow]
      stagingF[o + 14] = c.alpha;
      // slot 15 = packed subZoneState (.20). Encoding shared with xr-widgets.wgsl:
      //   bits  0-3   chipCount (enum-chips; 0 means "no sub-zones")
      //   bits  4-7   activeChipIdx (15 sentinel = none)
      //   bits  8-11  hoverChipIdx
      //   bits 12-15  pressChipIdx
      //   bits 16-17  stepperHoverSide (0 none, 1 left, 2 right)
      //   bits 18-19  stepperPressSide
      stagingU[o + 15] = packSubZoneState(c.subZones);
    }
    return n;
  }

  // Pack the SubZoneRenderState discriminated union into the 32-bit instance
  // slot the shader unpacks. The encoding is a hard contract — any change
  // here REQUIRES a matching shader edit. The 4-bit chip-index sentinel of
  // 15 means "none"; the cap is 15 chips per enum-chips widget (any more
  // would silently truncate, so the clamp protects against bugs upstream).
  // [LAW:single-enforcer] this function is the sole packing seam.
  function packSubZoneState(s: SubZoneRenderState | undefined): number {
    if (!s) return 0;
    const NONE = 15;
    const enc4 = (i: number): number => (i < 0 || i > 14 ? NONE : i);
    if (s.kind === 'chips') {
      const count = Math.min(15, Math.max(0, s.count));
      return (count & 0xf)
           | ((enc4(s.activeIdx) & 0xf) << 4)
           | ((enc4(s.hoverIdx)  & 0xf) << 8)
           | ((enc4(s.pressIdx)  & 0xf) << 12);
    }
    // stepper
    const sideCode = (side: 'left' | 'right' | null): number =>
      side === 'left' ? 1 : side === 'right' ? 2 : 0;
    return (sideCode(s.hoverSide) << 16) | (sideCode(s.pressSide) << 18);
  }

  // Pack one eye's view+proj+palette into the renderer's own layout. The host
  // hands structured data; this is the sole place that knows the byte layout.
  // [LAW:single-enforcer]
  function packCamera(camera: XrWidgetCamera, theme: XrWidgetTheme): Float32Array {
    cameraScratch.set(camera.view, 0);
    cameraScratch.set(camera.proj, 16);
    cameraScratch.set(theme.primary, 32);
    cameraScratch.set(theme.secondary, 36);
    cameraScratch.set(theme.accent, 40);
    return cameraScratch;
  }

  return {
    draw(encoder, sceneView, sceneFormat, viewIndex, camera, theme, commands) {
      // [LAW:dataflow-not-control-flow] Always upload camera + instance buffer
      // and run the pass; an empty commands array results in n=0 → no draw call.
      device.queue.writeBuffer(cameraBuffer, viewIndex * CAMERA_STRIDE, packCamera(camera, theme) as Float32Array<ArrayBuffer>);
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
      cameraBuffer.destroy();
      atlasTex.destroy();
    },
  };
}

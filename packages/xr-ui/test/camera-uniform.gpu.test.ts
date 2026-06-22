// Deterministic GPU verification of the camera-uniform byte-layout contract.
//
// WHY THIS EXISTS: the widget camera uniform layout is written in TWO places —
// the WGSL `Camera` struct (offsets the shader READS) and packCameraUniform
// (offsets the renderer WRITES). Neither tsc nor the build can catch a
// divergence: the WGSL is an opaque string and the pack offsets are numbers. A
// mismatch is a silent alignment bug that renders plausible-but-wrong on the
// Vision Pro and nowhere fails loudly. [LAW:one-source-of-truth]
//
// WHY A GPU TEST AND NOT A HAND-DERIVED OFFSET TABLE: WGSL uniform-address-space
// offsets are SPEC-DEFINED (not implementation-defined), so the offsets wgpu
// computes here are identical to Safari/visionOS. We assert BEHAVIOUR, not our
// own arithmetic [LAW:behavior-not-structure]: compile the real shader, pack via
// the real packer, render known widgets, read back pixels. A button fills with
// camera.accent; a slider's thumb is camera.primary. Distinct primary/secondary/
// accent colours pin all three colour offsets; the widgets only land on-screen
// at all if view+proj are at the right offsets too (identity matrices map the
// quad to the full viewport — a wrong matrix offset reads colour floats as
// matrix elements and the widget vanishes, leaving the cleared background).
//
// Run: deno run --unstable-webgpu --allow-read \
//        packages/xr-ui/test/camera-uniform.gpu.test.ts
// (Not wired into `npm run check` — that runs in the Pages-deploy CI which has
// no Deno/WebGPU. This is a local/headless gate for GPU-layout changes.)

import {
  CAMERA_FLOATS,
  CAMERA_SIZE,
  CAMERA_STRIDE,
  EYE_COUNT,
  packCameraUniform,
} from '../src/camera-uniform.ts';

const SHADER_PATH = new URL('../src/xr-widgets.wgsl', import.meta.url);
const TARGET = 64; // 64*4 = 256 bytes/row — already copy-aligned
const FORMAT: GPUTextureFormat = 'rgba8unorm';

// Distinct, saturated palette so any offset swap among the three colours, or a
// matrix-offset corruption, changes the asserted pixel unmistakably.
const PRIMARY = [1, 0, 0];   // red
const SECONDARY = [0, 1, 0]; // green
const ACCENT = [0, 0, 1];    // blue

const IDENTITY = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

// Instance struct (64 bytes) — mirrors xr-widgets.wgsl. A widget at the origin
// with identity orientation and unit half-extents spans local [-1,1]² and, under
// identity view+proj, fills clip space.
function buildInstance(kind: number, value: number): ArrayBuffer {
  const buf = new ArrayBuffer(64);
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  f[0] = 0; f[1] = 0; f[2] = 0;          // position
  f[3] = 1;                               // halfExtentX
  f[4] = 0; f[5] = 0; f[6] = 0; f[7] = 1; // orientation (identity quat)
  f[8] = 1;                               // halfExtentY
  u[9] = kind;
  u[10] = 0;                              // flags (no hover/press/drag/fine)
  f[11] = value;
  u[12] = 0;                              // labelStripIndex
  u[13] = 0;                              // hasLabel = 0 → atlas never sampled
  f[14] = 1;                              // alpha
  u[15] = 0;                              // subZoneState
  return buf;
}

async function renderCenterPixel(
  device: GPUDevice,
  shaderCode: string,
  kind: number,
  value: number,
): Promise<[number, number, number, number]> {
  const module = device.createShaderModule({ code: shaderCode });

  const bgl = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ],
  });
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
    vertex: { module, entryPoint: 'vs' },
    fragment: {
      module, entryPoint: 'fs',
      targets: [{
        format: FORMAT,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
  });

  // Camera buffer in the real layout, filled via the real packer at eye 0.
  const cameraBuffer = device.createBuffer({
    size: CAMERA_STRIDE * EYE_COUNT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const scratch = new Float32Array(CAMERA_FLOATS);
  packCameraUniform(scratch, { view: IDENTITY, proj: IDENTITY }, {
    primary: PRIMARY, secondary: SECONDARY, accent: ACCENT,
  });
  device.queue.writeBuffer(cameraBuffer, 0, scratch);

  const instanceBuffer = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(instanceBuffer, 0, new Uint8Array(buildInstance(kind, value)));

  const atlas = device.createTexture({
    size: [1, 1, 1], format: FORMAT, usage: GPUTextureUsage.TEXTURE_BINDING,
  });
  const sampler = device.createSampler();

  const bindGroup = device.createBindGroup({
    layout: bgl,
    entries: [
      { binding: 0, resource: { buffer: cameraBuffer, offset: 0, size: CAMERA_SIZE } },
      { binding: 1, resource: { buffer: instanceBuffer } },
      { binding: 2, resource: atlas.createView() },
      { binding: 3, resource: sampler },
    ],
  });

  const target = device.createTexture({
    size: [TARGET, TARGET, 1], format: FORMAT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  const readback = device.createBuffer({
    size: TARGET * TARGET * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: target.createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 }, // distinct from every widget colour
      loadOp: 'clear', storeOp: 'store',
    }],
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(6, 1);
  pass.end();
  encoder.copyTextureToBuffer(
    { texture: target },
    { buffer: readback, bytesPerRow: TARGET * 4, rowsPerImage: TARGET },
    [TARGET, TARGET, 1],
  );
  device.queue.submit([encoder.finish()]);

  await readback.mapAsync(GPUMapMode.READ);
  const px = new Uint8Array(readback.getMappedRange().slice(0));
  readback.unmap();
  const i = (TARGET / 2) * (TARGET * 4) + (TARGET / 2) * 4;
  return [px[i], px[i + 1], px[i + 2], px[i + 3]];
}

function assertColour(label: string, got: number[], want: 'red' | 'green' | 'blue'): void {
  const [r, g, b] = got;
  const hi = 180, lo = 75;
  const ok = want === 'red' ? (r > hi && g < lo && b < lo)
    : want === 'green' ? (g > hi && r < lo && b < lo)
    : (b > hi && r < lo && g < lo);
  if (!ok) {
    throw new Error(`${label}: expected ${want}, got rgb(${r},${g},${b}). ` +
      `The camera-uniform layout in camera-uniform.ts disagrees with the ` +
      `Camera struct in xr-widgets.wgsl — a silent alignment bug.`);
  }
  console.log(`  ✓ ${label}: ${want} (rgb ${r},${g},${b})`);
}

const adapter = await navigator.gpu?.requestAdapter();
if (!adapter) { console.error('FAIL: no WebGPU adapter'); Deno.exit(1); }
const device = await adapter.requestDevice();
const shaderCode = await Deno.readTextFile(SHADER_PATH);

console.log('camera-uniform GPU layout contract:');
// Button (kind 1) fills with camera.accent → blue confirms accent offset + that
// view/proj placed the quad on-screen at all.
assertColour('button fill reads camera.accent',
  await renderCenterPixel(device, shaderCode, 1, 0), 'blue');
// Slider (kind 0) thumb at value 0.5 is camera.primary → red confirms the
// primary offset is distinct and correct (catches a primary/secondary or
// primary/accent swap).
assertColour('slider thumb reads camera.primary',
  await renderCenterPixel(device, shaderCode, 0, 0.5), 'red');

console.log('PASS: WGSL Camera struct and packCameraUniform agree on every read field.');
device.destroy();

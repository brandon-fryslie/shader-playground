import SHADER_GAS_CHI from './shaders/gas.chi.wgsl?raw';
import SHADER_GAS_PRESSURE_INTERPOLATE from './shaders/gas.pressure_interpolate.wgsl?raw';
import SHADER_GAS_COMPUTE from './shaders/gas.compute.wgsl?raw';
import SHADER_GAS_RENDER from './shaders/gas.render.wgsl?raw';

export const GAS_SHADER_SOURCES = {
  'Gas χ': SHADER_GAS_CHI,
  'Gas Pressure': SHADER_GAS_PRESSURE_INTERPOLATE,
  'Gas Compute': SHADER_GAS_COMPUTE,
  'Gas Render': SHADER_GAS_RENDER,
};

type ShaderFactory = (label: string, code: string) => GPUShaderModule;

export interface GasReservoirArgs {
  device: GPUDevice;
  createShaderModuleChecked: ShaderFactory;
  renderTargetFormat: GPUTextureFormat;
  renderSampleCount: number;
  cameraBuffer: GPUBuffer;
  cameraStride: number;
  cameraSize: number;
  starCount: number;
  starBuffers: [GPUBuffer, GPUBuffer];
  totalStarMass: number;
  gasMassFraction: number;
  pmBufUsage: GPUBufferUsageFlags;
  fixedPointScale: number;
  pmDepositBGL: GPUBindGroupLayout;
  pmDepositPipeline: GPUComputePipeline;
  pmInterpolateBGL: GPUBindGroupLayout;
  pmInterpolatePipeline: GPUComputePipeline;
  innerDensityU32: GPUBuffer;
  innerPotential: GPUBuffer;
  innerParams: { gridRes: number; domainHalf: number; cellSize: number; cellCount: number; filterOutOfDomain: number };
  outerDensityU32: GPUBuffer;
  outerPotential: GPUBuffer;
  outerParams: { gridRes: number; domainHalf: number; cellSize: number; cellCount: number; filterOutOfDomain: number };
  pmBlendBuffer: GPUBuffer;
}

export interface GasReservoir {
  readonly count: number;
  readonly bodyBytes: number;
  readonly totalMass: number;
  prepareFrame(dt: number, soundSpeed: number): void;
  clear(encoder: GPUCommandEncoder): void;
  depositInnerPm(pass: GPUComputePassEncoder, pingPong: number): void;
  depositOuterPm(pass: GPUComputePassEncoder, pingPong: number): void;
  depositGasAndBuildPressure(pass: GPUComputePassEncoder, pingPong: number): void;
  interpolateForces(pass: GPUComputePassEncoder, pingPong: number): void;
  integrate(pass: GPUComputePassEncoder, pingPong: number): void;
  render(pass: GPURenderPassEncoder, viewIndex: number, visible: boolean): void;
  dumpDensity(): Promise<Float32Array | null>;
  energyBreakdown(pingPong: number, soundSpeed: number): Promise<{ starKinetic: number; gasKinetic: number; gasInternal: number; total: number } | null>;
  wakeProbe(pingPong: number, starIdx?: number): Promise<{ aheadDensity: number; behindDensity: number; asymmetry: number } | null>;
  snapshot(pingPong: number): Promise<Float32Array | null>;
  destroy(): void;
}

const GAS_GRID_RES = 128;
const GAS_DOMAIN_HALF = 64.0;
const GAS_DOMAIN_SIZE = GAS_DOMAIN_HALF * 2.0;
const GAS_CELL_SIZE = GAS_DOMAIN_SIZE / GAS_GRID_RES;
const GAS_CELL_COUNT = GAS_GRID_RES * GAS_GRID_RES * GAS_GRID_RES;

function makePmParams(
  device: GPUDevice,
  count: number,
  gridRes: number,
  domainHalf: number,
  cellSize: number,
  fixedPointScale: number,
  cellCount: number,
  filterOutOfDomain: number,
) {
  const buffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const data = new ArrayBuffer(32);
  const f32 = new Float32Array(data);
  const u32 = new Uint32Array(data);
  u32[1] = count;
  u32[2] = gridRes;
  f32[3] = domainHalf;
  f32[4] = cellSize;
  f32[5] = fixedPointScale;
  u32[6] = cellCount;
  u32[7] = filterOutOfDomain;
  return { buffer, data, f32, u32 };
}

export function createGasReservoir(args: GasReservoirArgs): GasReservoir {
  const { device } = args;
  const gasMassFraction = Math.max(0, Math.min(0.5, args.gasMassFraction));
  const gasCount = Math.max(1, Math.min(200000, Math.round(args.starCount * 2.5)));
  const bodyBytes = gasCount * 48;
  const totalMass = args.totalStarMass * gasMassFraction;
  const massPerParticle = totalMass / gasCount;

  const initData = new Float32Array(gasCount * 12);
  for (let i = 0; i < gasCount; i++) {
    const off = i * 12;
    initData[off] = (Math.random() - 0.5) * 60.0;
    initData[off + 1] = (Math.random() - 0.5) * 60.0;
    initData[off + 2] = (Math.random() - 0.5) * 60.0;
    initData[off + 3] = massPerParticle;
  }

  // [LAW:one-source-of-truth] Gas owns its buffers and pressure fields here;
  // main.ts only dispatches this subsystem at PM seams.
  const bufferA = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, mappedAtCreation: true });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();
  const bufferB = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC });
  const buffers: [GPUBuffer, GPUBuffer] = [bufferA, bufferB];
  const gravityForce = device.createBuffer({ size: gasCount * 16, usage: args.pmBufUsage });
  const pressureForce = device.createBuffer({ size: gasCount * 16, usage: args.pmBufUsage });
  const densityU32 = device.createBuffer({ size: GAS_CELL_COUNT * 4, usage: args.pmBufUsage });
  const densityF32 = device.createBuffer({ size: GAS_CELL_COUNT * 4, usage: args.pmBufUsage });
  const chi = device.createBuffer({ size: GAS_CELL_COUNT * 4, usage: args.pmBufUsage });

  const rhoRef = Math.max(totalMass / GAS_CELL_COUNT, 1e-12);
  const rhoFloor = Math.max(rhoRef * 1e-6, 1e-12);

  const innerPmParams = makePmParams(device, gasCount, args.innerParams.gridRes, args.innerParams.domainHalf, args.innerParams.cellSize, args.fixedPointScale, args.innerParams.cellCount, args.innerParams.filterOutOfDomain);
  const outerPmParams = makePmParams(device, gasCount, args.outerParams.gridRes, args.outerParams.domainHalf, args.outerParams.cellSize, args.fixedPointScale, args.outerParams.cellCount, args.outerParams.filterOutOfDomain);
  const gasDepositParams = makePmParams(device, gasCount, GAS_GRID_RES, GAS_DOMAIN_HALF, GAS_CELL_SIZE, args.fixedPointScale, GAS_CELL_COUNT, 0);

  const innerDepositBG = buffers.map(buf => device.createBindGroup({
    layout: args.pmDepositBGL,
    entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: args.innerDensityU32 } },
      { binding: 2, resource: { buffer: innerPmParams.buffer } },
    ],
  }));
  const outerDepositBG = buffers.map(buf => device.createBindGroup({
    layout: args.pmDepositBGL,
    entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: args.outerDensityU32 } },
      { binding: 2, resource: { buffer: outerPmParams.buffer } },
    ],
  }));
  const gasDepositBG = buffers.map(buf => device.createBindGroup({
    layout: args.pmDepositBGL,
    entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: densityU32 } },
      { binding: 2, resource: { buffer: gasDepositParams.buffer } },
    ],
  }));

  const fieldParamsBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const fieldParamsData = new ArrayBuffer(32);
  const fieldParamsF32 = new Float32Array(fieldParamsData);
  const fieldParamsU32 = new Uint32Array(fieldParamsData);
  fieldParamsU32[0] = GAS_GRID_RES;
  fieldParamsU32[1] = GAS_CELL_COUNT;
  fieldParamsF32[2] = args.fixedPointScale;
  fieldParamsF32[4] = rhoFloor;
  fieldParamsF32[5] = rhoRef;
  fieldParamsF32[6] = GAS_DOMAIN_HALF;
  fieldParamsF32[7] = GAS_CELL_SIZE;

  const chiModule = args.createShaderModuleChecked('gas.chi', SHADER_GAS_CHI);
  const chiBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const chiPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [chiBGL] }),
    compute: { module: chiModule, entryPoint: 'main' },
  });
  const chiBG = device.createBindGroup({
    layout: chiBGL,
    entries: [
      { binding: 0, resource: { buffer: densityU32 } },
      { binding: 1, resource: { buffer: densityF32 } },
      { binding: 2, resource: { buffer: chi } },
      { binding: 3, resource: { buffer: fieldParamsBuffer } },
    ],
  });

  const gasInterpolateBG = buffers.map(buf => device.createBindGroup({
    layout: args.pmInterpolateBGL,
    entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: args.innerPotential } },
      { binding: 2, resource: { buffer: args.outerPotential } },
      { binding: 3, resource: { buffer: gravityForce } },
      { binding: 4, resource: { buffer: innerPmParams.buffer } },
      { binding: 5, resource: { buffer: outerPmParams.buffer } },
      { binding: 6, resource: { buffer: args.pmBlendBuffer } },
    ],
  }));

  const pressureModule = args.createShaderModuleChecked('gas.pressure_interpolate', SHADER_GAS_PRESSURE_INTERPOLATE);
  const pressureBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const pressurePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [pressureBGL] }),
    compute: { module: pressureModule, entryPoint: 'main' },
  });
  const pressureBG = buffers.map(buf => device.createBindGroup({
    layout: pressureBGL,
    entries: [
      { binding: 0, resource: { buffer: buf } },
      { binding: 1, resource: { buffer: chi } },
      { binding: 2, resource: { buffer: pressureForce } },
      { binding: 3, resource: { buffer: gasDepositParams.buffer } },
    ],
  }));

  const stepParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const stepParamsData = new ArrayBuffer(16);
  const stepParamsF32 = new Float32Array(stepParamsData);
  const stepParamsU32 = new Uint32Array(stepParamsData);
  stepParamsU32[1] = gasCount;
  stepParamsF32[2] = GAS_DOMAIN_HALF;
  const computeModule = args.createShaderModuleChecked('gas.compute', SHADER_GAS_COMPUTE);
  const computeBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'main' },
  });
  const computeBG = [
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: bufferB } },
      { binding: 2, resource: { buffer: gravityForce } },
      { binding: 3, resource: { buffer: pressureForce } },
      { binding: 4, resource: { buffer: stepParamsBuffer } },
    ] }),
    device.createBindGroup({ layout: computeBGL, entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: bufferA } },
      { binding: 2, resource: { buffer: gravityForce } },
      { binding: 3, resource: { buffer: pressureForce } },
      { binding: 4, resource: { buffer: stepParamsBuffer } },
    ] }),
  ];

  const renderModule = args.createShaderModuleChecked('gas.render', SHADER_GAS_RENDER);
  const renderBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ],
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: {
      module: renderModule,
      entryPoint: 'fs_main',
      targets: [{
        format: args.renderTargetFormat,
        blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        },
      }],
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    multisample: { count: args.renderSampleCount },
  });
  const renderParamsBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const renderParamsData = new ArrayBuffer(32);
  const renderParamsF32 = new Float32Array(renderParamsData);
  const renderParamsU32 = new Uint32Array(renderParamsData);
  renderParamsU32[0] = GAS_GRID_RES;
  renderParamsU32[1] = 32;
  renderParamsF32[2] = GAS_DOMAIN_HALF;
  renderParamsF32[3] = GAS_CELL_SIZE;
  const renderBG = [0, 1].map(viewIndex => device.createBindGroup({
    layout: renderBGL,
    entries: [
      { binding: 0, resource: { buffer: args.cameraBuffer, offset: viewIndex * args.cameraStride, size: args.cameraSize } },
      { binding: 1, resource: { buffer: densityF32 } },
      { binding: 2, resource: { buffer: renderParamsBuffer } },
    ],
  }));

  const densityStaging = device.createBuffer({ size: GAS_CELL_COUNT * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const bodyStaging = device.createBuffer({ size: bodyBytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const starBodyStaging = device.createBuffer({ size: args.starCount * 48, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const starProbeStaging = device.createBuffer({ size: 48, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  let diagPending = false;

  const currentGasBuffer = (pingPong: number) => buffers[pingPong]!;

  return {
    count: gasCount,
    bodyBytes,
    totalMass,
    prepareFrame(dt, soundSpeed) {
      innerPmParams.f32[0] = dt;
      outerPmParams.f32[0] = dt;
      gasDepositParams.f32[0] = dt;
      fieldParamsF32[3] = soundSpeed;
      stepParamsF32[0] = dt;
      device.queue.writeBuffer(innerPmParams.buffer, 0, innerPmParams.data);
      device.queue.writeBuffer(outerPmParams.buffer, 0, outerPmParams.data);
      device.queue.writeBuffer(gasDepositParams.buffer, 0, gasDepositParams.data);
      device.queue.writeBuffer(fieldParamsBuffer, 0, fieldParamsData);
      device.queue.writeBuffer(stepParamsBuffer, 0, stepParamsData);
    },
    clear(encoder) {
      encoder.clearBuffer(densityU32);
    },
    depositInnerPm(pass, pingPong) {
      pass.setPipeline(args.pmDepositPipeline);
      pass.setBindGroup(0, innerDepositBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(gasCount / 256));
    },
    depositOuterPm(pass, pingPong) {
      pass.setPipeline(args.pmDepositPipeline);
      pass.setBindGroup(0, outerDepositBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(gasCount / 256));
    },
    depositGasAndBuildPressure(pass, pingPong) {
      // [LAW:single-enforcer] Gas pressure derives only from this gas-density
      // deposit followed by χ construction.
      pass.setPipeline(args.pmDepositPipeline);
      pass.setBindGroup(0, gasDepositBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(gasCount / 256));
      pass.setPipeline(chiPipeline);
      pass.setBindGroup(0, chiBG);
      pass.dispatchWorkgroups(Math.ceil(GAS_CELL_COUNT / 256));
    },
    interpolateForces(pass, pingPong) {
      pass.setPipeline(args.pmInterpolatePipeline);
      pass.setBindGroup(0, gasInterpolateBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(gasCount / 256));
      pass.setPipeline(pressurePipeline);
      pass.setBindGroup(0, pressureBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(gasCount / 256));
    },
    integrate(pass, pingPong) {
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(gasCount / 256));
    },
    render(pass, viewIndex, visible) {
      renderParamsF32[4] = totalMass > 0 ? 1.0 / Math.max(rhoRef * 24.0, 1e-12) : 0.0;
      renderParamsF32[5] = visible ? 1.0 : 0.0;
      device.queue.writeBuffer(renderParamsBuffer, 0, renderParamsData);
      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, renderBG[viewIndex]);
      pass.draw(3);
    },
    async dumpDensity() {
      if (diagPending) return null;
      diagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(densityF32, 0, densityStaging, 0, GAS_CELL_COUNT * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await densityStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(densityStaging.getMappedRange().slice(0));
      densityStaging.unmap();
      diagPending = false;
      return out;
    },
    async energyBreakdown(pingPong, soundSpeed) {
      if (diagPending) return null;
      diagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(args.starBuffers[pingPong], 0, starBodyStaging, 0, args.starCount * 48);
      enc.copyBufferToBuffer(currentGasBuffer(pingPong), 0, bodyStaging, 0, bodyBytes);
      enc.copyBufferToBuffer(densityF32, 0, densityStaging, 0, GAS_CELL_COUNT * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();

      await starBodyStaging.mapAsync(GPUMapMode.READ);
      const stars = new Float32Array(starBodyStaging.getMappedRange().slice(0));
      starBodyStaging.unmap();
      await bodyStaging.mapAsync(GPUMapMode.READ);
      const gas = new Float32Array(bodyStaging.getMappedRange().slice(0));
      bodyStaging.unmap();
      await densityStaging.mapAsync(GPUMapMode.READ);
      const rho = new Float32Array(densityStaging.getMappedRange().slice(0));
      densityStaging.unmap();
      diagPending = false;

      let starKinetic = 0;
      for (let i = 0; i < args.starCount; i++) {
        const o = i * 12;
        const m = stars[o + 3], vx = stars[o + 4], vy = stars[o + 5], vz = stars[o + 6];
        starKinetic += 0.5 * m * (vx * vx + vy * vy + vz * vz);
      }
      let gasKinetic = 0;
      for (let i = 0; i < gasCount; i++) {
        const o = i * 12;
        const m = gas[o + 3], vx = gas[o + 4], vy = gas[o + 5], vz = gas[o + 6];
        gasKinetic += 0.5 * m * (vx * vx + vy * vy + vz * vz);
      }
      const cs2 = soundSpeed * soundSpeed;
      let gasInternal = 0;
      for (let i = 0; i < rho.length; i++) {
        const r = Math.max(rho[i], rhoFloor);
        gasInternal += r * cs2 * Math.log(r / rhoRef);
      }
      return { starKinetic, gasKinetic, gasInternal, total: starKinetic + gasKinetic + gasInternal };
    },
    async wakeProbe(pingPong, starIdx = 0) {
      if (diagPending) return null;
      diagPending = true;
      const idx = Math.max(0, Math.min(args.starCount - 1, Math.floor(starIdx)));
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(args.starBuffers[pingPong], idx * 48, starProbeStaging, 0, 48);
      enc.copyBufferToBuffer(densityF32, 0, densityStaging, 0, GAS_CELL_COUNT * 4);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await starProbeStaging.mapAsync(GPUMapMode.READ);
      const s = new Float32Array(starProbeStaging.getMappedRange().slice(0));
      starProbeStaging.unmap();
      await densityStaging.mapAsync(GPUMapMode.READ);
      const rho = new Float32Array(densityStaging.getMappedRange().slice(0));
      densityStaging.unmap();
      diagPending = false;

      const speed = Math.hypot(s[4], s[5], s[6]);
      const invSpeed = speed > 1e-6 ? 1 / speed : 0;
      const dir = [s[4] * invSpeed, s[5] * invSpeed, s[6] * invSpeed];
      const sample = (x: number, y: number, z: number) => {
        const ix = Math.floor((x + GAS_DOMAIN_HALF) / GAS_CELL_SIZE);
        const iy = Math.floor((y + GAS_DOMAIN_HALF) / GAS_CELL_SIZE);
        const iz = Math.floor((z + GAS_DOMAIN_HALF) / GAS_CELL_SIZE);
        const wrap = (v: number) => ((v % GAS_GRID_RES) + GAS_GRID_RES) % GAS_GRID_RES;
        const wi = wrap(ix), wj = wrap(iy), wk = wrap(iz);
        return rho[wk * GAS_GRID_RES * GAS_GRID_RES + wj * GAS_GRID_RES + wi];
      };
      const d = 2.0;
      const aheadDensity = sample(s[0] + dir[0] * d, s[1] + dir[1] * d, s[2] + dir[2] * d);
      const behindDensity = sample(s[0] - dir[0] * d, s[1] - dir[1] * d, s[2] - dir[2] * d);
      const asymmetry = (behindDensity - aheadDensity) / (Math.abs(behindDensity) + Math.abs(aheadDensity) + 1e-12);
      return { aheadDensity, behindDensity, asymmetry };
    },
    async snapshot(pingPong) {
      if (diagPending) return null;
      diagPending = true;
      const enc = device.createCommandEncoder();
      enc.copyBufferToBuffer(currentGasBuffer(pingPong), 0, bodyStaging, 0, bodyBytes);
      device.queue.submit([enc.finish()]);
      await device.queue.onSubmittedWorkDone();
      await bodyStaging.mapAsync(GPUMapMode.READ);
      const out = new Float32Array(bodyStaging.getMappedRange().slice(0));
      bodyStaging.unmap();
      diagPending = false;
      return out;
    },
    destroy() {
      bufferA.destroy(); bufferB.destroy();
      gravityForce.destroy(); pressureForce.destroy();
      densityU32.destroy(); densityF32.destroy(); chi.destroy();
      innerPmParams.buffer.destroy(); outerPmParams.buffer.destroy(); gasDepositParams.buffer.destroy();
      fieldParamsBuffer.destroy(); stepParamsBuffer.destroy(); renderParamsBuffer.destroy();
      densityStaging.destroy(); bodyStaging.destroy(); starBodyStaging.destroy(); starProbeStaging.destroy();
    },
  };
}

import { createGasReservoir, type GasReservoir } from '../../gasReservoir';

import SHADER_PM_DEPOSIT from '../../shaders/pm.deposit.wgsl?raw';
import SHADER_PM_DENSITY_CONVERT from '../../shaders/pm.density_convert.wgsl?raw';
import SHADER_PM_SMOOTH from '../../shaders/pm.smooth.wgsl?raw';
import SHADER_PM_RESIDUAL from '../../shaders/pm.residual.wgsl?raw';
import SHADER_PM_RESTRICT from '../../shaders/pm.restrict.wgsl?raw';
import SHADER_PM_PROLONG from '../../shaders/pm.prolong.wgsl?raw';
import SHADER_PM_INTERPOLATE from '../../shaders/pm.interpolate.wgsl?raw';
import SHADER_PM_INTERPOLATE_NESTED from '../../shaders/pm.interpolate_nested.wgsl?raw';
import SHADER_PM_BOUNDARY_SAMPLE from '../../shaders/pm.boundary_sample.wgsl?raw';

type ShaderFactory = (label: string, source: string) => GPUShaderModule;

export interface PmGridResources {
  densityF32: GPUBuffer;
  densityStaging: GPUBuffer;
  densityU32: GPUBuffer;
  force?: GPUBuffer;
  getDiagPending(): boolean;
  level0Cells: number;
  levels: number;
  meanScratch: GPUBuffer;
  paramsBuffer: GPUBuffer;
  paramsF32: Float32Array;
  potential: GPUBuffer[];
  prolongBG: GPUBindGroup[];
  prolongUniform: GPUBuffer[];
  residual: GPUBuffer[];
  residualBG: GPUBindGroup[];
  residualUniform: GPUBuffer[];
  restrictBG: GPUBindGroup[];
  restrictUniform: GPUBuffer[];
  rho: GPUBuffer[];
  setDiagPending(value: boolean): void;
  smoothBG: GPUBindGroup[][];
  smoothUniform: GPUBuffer[][];
  wgCount: number[];
}

export interface PhysicsParticleMeshContext {
  boundarySampleBG: GPUBindGroup;
  boundarySamplePipeline: GPUComputePipeline;
  boundarySampleWg: number;
  gas: GasReservoir;
  inner: PmGridResources;
  outer: PmGridResources;
  prolongPipeline: GPUComputePipeline;
  residualPipeline: GPUComputePipeline;
  restrictPipeline: GPUComputePipeline;
  smoothPipeline: GPUComputePipeline;
  depositAndConvert(
    encoder: GPUCommandEncoder,
    pingPong: number,
    timestampWrites?: GPUComputePassTimestampWrites,
  ): void;
  destroy(): void;
  interpolateForces(
    encoder: GPUCommandEncoder,
    count: number,
    pingPong: number,
    starTimestampWrites?: GPUComputePassTimestampWrites,
    gasTimestampWrites?: GPUComputePassTimestampWrites,
  ): void;
  prepareFrame(dt: number, gasSoundSpeed: number): void;
}

interface GridConfig {
  cellSize: number;
  dirichletBoundary: number;
  domainHalf: number;
  filterOutOfDomain: number;
  gridRes: number;
  levels: number;
}

interface CommonPipelines {
  convertBGL: GPUBindGroupLayout;
  convertPipeline: GPUComputePipeline;
  depositBGL: GPUBindGroupLayout;
  depositPipeline: GPUComputePipeline;
  interpolateBGL: GPUBindGroupLayout;
  interpolatePipeline: GPUComputePipeline;
  prolongBGL: GPUBindGroupLayout;
  prolongPipeline: GPUComputePipeline;
  reducePipeline: GPUComputePipeline;
  residualBGL: GPUBindGroupLayout;
  residualPipeline: GPUComputePipeline;
  restrictBGL: GPUBindGroupLayout;
  restrictPipeline: GPUComputePipeline;
  smoothBGL: GPUBindGroupLayout;
  smoothPipeline: GPUComputePipeline;
}

interface PhysicsParticleMeshArgs {
  bodyBuffers: [GPUBuffer, GPUBuffer];
  cameraBuffer: GPUBuffer;
  cameraSize: number;
  cameraStride: number;
  count: number;
  createShaderModuleChecked: ShaderFactory;
  device: GPUDevice;
  gasMassFraction: number;
  gravityScale: number;
  innerGrid: {
    cellSize: number;
    domainHalf: number;
    filterOutOfDomain: number;
    fixedPointScale: number;
    gridRes: number;
    levels: number;
  };
  renderSampleCount: number;
  renderTargetFormat: GPUTextureFormat;
  totalStarMass: number;
}

function createCommonPipelines(
  device: GPUDevice,
  createShaderModuleChecked: ShaderFactory,
): CommonPipelines {
  const depositModule = createShaderModuleChecked('pm.deposit', SHADER_PM_DEPOSIT);
  const depositBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const depositPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [depositBGL] }),
    compute: { module: depositModule, entryPoint: 'main' },
  });

  const convertModule = createShaderModuleChecked('pm.density_convert', SHADER_PM_DENSITY_CONVERT);
  const convertBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const convertLayout = device.createPipelineLayout({ bindGroupLayouts: [convertBGL] });
  const reducePipeline = device.createComputePipeline({
    layout: convertLayout,
    compute: { module: convertModule, entryPoint: 'reduce' },
  });
  const convertPipeline = device.createComputePipeline({
    layout: convertLayout,
    compute: { module: convertModule, entryPoint: 'convert' },
  });

  const smoothModule = createShaderModuleChecked('pm.smooth', SHADER_PM_SMOOTH);
  const residualModule = createShaderModuleChecked('pm.residual', SHADER_PM_RESIDUAL);
  const restrictModule = createShaderModuleChecked('pm.restrict', SHADER_PM_RESTRICT);
  const prolongModule = createShaderModuleChecked('pm.prolong', SHADER_PM_PROLONG);

  const smoothBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const residualBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const restrictBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const prolongBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const smoothPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [smoothBGL] }),
    compute: { module: smoothModule, entryPoint: 'main' },
  });
  const residualPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [residualBGL] }),
    compute: { module: residualModule, entryPoint: 'main' },
  });
  const restrictPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [restrictBGL] }),
    compute: { module: restrictModule, entryPoint: 'main' },
  });
  const prolongPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [prolongBGL] }),
    compute: { module: prolongModule, entryPoint: 'main' },
  });

  void SHADER_PM_INTERPOLATE;
  const interpolateModule = createShaderModuleChecked('pm.interpolate_nested', SHADER_PM_INTERPOLATE_NESTED);
  const interpolateBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const interpolatePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [interpolateBGL] }),
    compute: { module: interpolateModule, entryPoint: 'main' },
  });

  return {
    convertBGL,
    convertPipeline,
    depositBGL,
    depositPipeline,
    interpolateBGL,
    interpolatePipeline,
    prolongBGL,
    prolongPipeline,
    reducePipeline,
    residualBGL,
    residualPipeline,
    restrictBGL,
    restrictPipeline,
    smoothBGL,
    smoothPipeline,
  };
}

function createGrid(
  common: CommonPipelines,
  bodyBuffers: [GPUBuffer, GPUBuffer],
  count: number,
  device: GPUDevice,
  fixedPointScale: number,
  fourPiG: number,
  pmBufUsage: GPUBufferUsageFlags,
  config: GridConfig,
): PmGridResources & { convertBG: GPUBindGroup; depositBG: [GPUBindGroup, GPUBindGroup] } {
  const level0Cells = config.gridRes * config.gridRes * config.gridRes;
  const densityU32 = device.createBuffer({ size: level0Cells * 4, usage: pmBufUsage });
  const densityF32 = device.createBuffer({ size: level0Cells * 4, usage: pmBufUsage });
  const potential: GPUBuffer[] = [];
  const residual: GPUBuffer[] = [];
  for (let level = 0; level < config.levels; level++) {
    const size = config.gridRes >> level;
    const bytes = size * size * size * 4;
    potential.push(device.createBuffer({ size: bytes, usage: pmBufUsage }));
    residual.push(device.createBuffer({ size: bytes, usage: pmBufUsage }));
  }

  const meanScratch = device.createBuffer({ size: 16, usage: pmBufUsage });
  const rho: GPUBuffer[] = [densityF32];
  for (let level = 1; level < config.levels; level++) {
    const size = config.gridRes >> level;
    rho.push(device.createBuffer({ size: size * size * size * 4, usage: pmBufUsage }));
  }

  const paramsBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const paramsData = new ArrayBuffer(32);
  const paramsF32 = new Float32Array(paramsData);
  const paramsU32 = new Uint32Array(paramsData);
  paramsU32[1] = count;
  paramsU32[2] = config.gridRes;
  paramsF32[3] = config.domainHalf;
  paramsF32[4] = config.cellSize;
  paramsF32[5] = fixedPointScale;
  paramsU32[6] = level0Cells;
  paramsU32[7] = config.filterOutOfDomain;

  const convertBG = device.createBindGroup({
    layout: common.convertBGL,
    entries: [
      { binding: 0, resource: { buffer: densityU32 } },
      { binding: 1, resource: { buffer: densityF32 } },
      { binding: 2, resource: { buffer: meanScratch } },
      { binding: 3, resource: { buffer: paramsBuffer } },
    ],
  });

  const depositBG = bodyBuffers.map((buffer) => device.createBindGroup({
    layout: common.depositBGL,
    entries: [
      { binding: 0, resource: { buffer } },
      { binding: 1, resource: { buffer: densityU32 } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ],
  })) as [GPUBindGroup, GPUBindGroup];

  const smoothUniform: GPUBuffer[][] = [];
  const residualUniform: GPUBuffer[] = [];
  const restrictUniform: GPUBuffer[] = [];
  const prolongUniform: GPUBuffer[] = [];
  for (let level = 0; level < config.levels; level++) {
    const size = config.gridRes >> level;
    const hSq = config.cellSize * config.cellSize * (1 << (2 * level));
    smoothUniform.push([0, 1].map((parity) => {
      const buffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const data = new ArrayBuffer(32);
      new Uint32Array(data, 0, 2).set([size, parity]);
      new Float32Array(data, 8, 2).set([hSq, fourPiG]);
      new Uint32Array(data, 16, 1).set([config.dirichletBoundary]);
      device.queue.writeBuffer(buffer, 0, data);
      return buffer;
    }));

    const residualBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const residualData = new ArrayBuffer(32);
    new Uint32Array(residualData, 0, 2).set([size, 0]);
    new Float32Array(residualData, 8, 2).set([hSq, fourPiG]);
    new Uint32Array(residualData, 16, 1).set([config.dirichletBoundary]);
    device.queue.writeBuffer(residualBuffer, 0, residualData);
    residualUniform.push(residualBuffer);

    if (level + 1 < config.levels) {
      const coarseSize = config.gridRes >> (level + 1);

      const restrictBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const restrictData = new ArrayBuffer(16);
      new Uint32Array(restrictData, 0, 1).set([coarseSize]);
      device.queue.writeBuffer(restrictBuffer, 0, restrictData);
      restrictUniform.push(restrictBuffer);

      const prolongBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const prolongData = new ArrayBuffer(16);
      new Uint32Array(prolongData, 0, 2).set([size, config.dirichletBoundary]);
      device.queue.writeBuffer(prolongBuffer, 0, prolongData);
      prolongUniform.push(prolongBuffer);
    }
  }

  const smoothBG: GPUBindGroup[][] = [];
  const residualBG: GPUBindGroup[] = [];
  const restrictBG: GPUBindGroup[] = [];
  const prolongBG: GPUBindGroup[] = [];
  for (let level = 0; level < config.levels; level++) {
    smoothBG.push([0, 1].map((parity) => device.createBindGroup({
      layout: common.smoothBGL,
      entries: [
        { binding: 0, resource: { buffer: potential[level] } },
        { binding: 1, resource: { buffer: rho[level] } },
        { binding: 2, resource: { buffer: smoothUniform[level][parity] } },
      ],
    })));
    residualBG.push(device.createBindGroup({
      layout: common.residualBGL,
      entries: [
        { binding: 0, resource: { buffer: potential[level] } },
        { binding: 1, resource: { buffer: rho[level] } },
        { binding: 2, resource: { buffer: residual[level] } },
        { binding: 3, resource: { buffer: residualUniform[level] } },
      ],
    }));
    if (level + 1 < config.levels) {
      restrictBG.push(device.createBindGroup({
        layout: common.restrictBGL,
        entries: [
          { binding: 0, resource: { buffer: residual[level] } },
          { binding: 1, resource: { buffer: rho[level + 1] } },
          { binding: 2, resource: { buffer: restrictUniform[level] } },
        ],
      }));
      prolongBG.push(device.createBindGroup({
        layout: common.prolongBGL,
        entries: [
          { binding: 0, resource: { buffer: potential[level + 1] } },
          { binding: 1, resource: { buffer: potential[level] } },
          { binding: 2, resource: { buffer: prolongUniform[level] } },
        ],
      }));
    }
  }

  const wgCount = Array.from({ length: config.levels }, (_, level) => Math.max(1, (config.gridRes >> level) / 4));
  const densityStaging = device.createBuffer({
    size: level0Cells * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  let diagPending = false;

  return {
    convertBG,
    densityF32,
    densityStaging,
    densityU32,
    getDiagPending: () => diagPending,
    level0Cells,
    levels: config.levels,
    meanScratch,
    paramsBuffer,
    paramsF32,
    potential,
    prolongBG,
    prolongUniform,
    residual,
    residualBG,
    residualUniform,
    restrictBG,
    restrictUniform,
    rho,
    setDiagPending: (value) => { diagPending = value; },
    smoothBG,
    smoothUniform,
    wgCount,
    depositBG,
  };
}

export function createPhysicsParticleMesh(args: PhysicsParticleMeshArgs): PhysicsParticleMeshContext {
  const {
    bodyBuffers,
    cameraBuffer,
    cameraSize,
    cameraStride,
    count,
    createShaderModuleChecked,
    device,
    gasMassFraction,
    gravityScale,
    innerGrid,
    renderSampleCount,
    renderTargetFormat,
    totalStarMass,
  } = args;

  const pmBufUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
  const fourPiG = 4 * Math.PI * gravityScale;
  const common = createCommonPipelines(device, createShaderModuleChecked);

  const inner = createGrid(common, bodyBuffers, count, device, innerGrid.fixedPointScale, fourPiG, pmBufUsage, {
    cellSize: innerGrid.cellSize,
    dirichletBoundary: 1,
    domainHalf: innerGrid.domainHalf,
    filterOutOfDomain: innerGrid.filterOutOfDomain,
    gridRes: innerGrid.gridRes,
    levels: innerGrid.levels,
  });
  inner.force = device.createBuffer({ size: count * 16, usage: pmBufUsage });

  const outerGridRes = 64;
  const outerDomainHalf = 64.0;
  const outerCellSize = 2.0;
  const outer = createGrid(common, bodyBuffers, count, device, innerGrid.fixedPointScale, fourPiG, pmBufUsage, {
    cellSize: outerCellSize,
    dirichletBoundary: 0,
    domainHalf: outerDomainHalf,
    filterOutOfDomain: 0,
    gridRes: outerGridRes,
    levels: 5,
  });

  const blendBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  {
    const data = new ArrayBuffer(16);
    new Float32Array(data, 0, 2).set([innerGrid.domainHalf - 2.0, innerGrid.domainHalf]);
    device.queue.writeBuffer(blendBuffer, 0, data);
  }

  const boundarySampleModule = createShaderModuleChecked('pm.boundary_sample', SHADER_PM_BOUNDARY_SAMPLE);
  const boundarySampleBGL = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });
  const boundarySamplePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [boundarySampleBGL] }),
    compute: { module: boundarySampleModule, entryPoint: 'main' },
  });
  const boundarySampleParams = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  {
    const data = new ArrayBuffer(32);
    const u32 = new Uint32Array(data);
    const f32 = new Float32Array(data);
    u32[0] = innerGrid.gridRes;
    f32[2] = innerGrid.domainHalf;
    f32[3] = innerGrid.cellSize;
    u32[4] = outerGridRes;
    f32[6] = outerDomainHalf;
    f32[7] = outerCellSize;
    device.queue.writeBuffer(boundarySampleParams, 0, data);
  }
  const boundarySampleBG = device.createBindGroup({
    layout: boundarySampleBGL,
    entries: [
      { binding: 0, resource: { buffer: outer.potential[0] } },
      { binding: 1, resource: { buffer: inner.potential[0] } },
      { binding: 2, resource: { buffer: boundarySampleParams } },
    ],
  });

  const interpolateBG = bodyBuffers.map((buffer) => device.createBindGroup({
    layout: common.interpolateBGL,
    entries: [
      { binding: 0, resource: { buffer } },
      { binding: 1, resource: { buffer: inner.potential[0] } },
      { binding: 2, resource: { buffer: outer.potential[0] } },
      { binding: 3, resource: { buffer: inner.force! } },
      { binding: 4, resource: { buffer: inner.paramsBuffer } },
      { binding: 5, resource: { buffer: outer.paramsBuffer } },
      { binding: 6, resource: { buffer: blendBuffer } },
    ],
  })) as [GPUBindGroup, GPUBindGroup];

  const gas = createGasReservoir({
    cameraBuffer,
    cameraSize,
    cameraStride,
    createShaderModuleChecked,
    device,
    fixedPointScale: innerGrid.fixedPointScale,
    gasMassFraction,
    innerDensityU32: inner.densityU32,
    innerParams: {
      cellCount: inner.level0Cells,
      cellSize: innerGrid.cellSize,
      domainHalf: innerGrid.domainHalf,
      filterOutOfDomain: innerGrid.filterOutOfDomain,
      gridRes: innerGrid.gridRes,
    },
    innerPotential: inner.potential[0],
    outerDensityU32: outer.densityU32,
    outerParams: {
      cellCount: outer.level0Cells,
      cellSize: outerCellSize,
      domainHalf: outerDomainHalf,
      filterOutOfDomain: 0,
      gridRes: outerGridRes,
    },
    outerPotential: outer.potential[0],
    pmBlendBuffer: blendBuffer,
    pmBufUsage,
    pmDepositBGL: common.depositBGL,
    pmDepositPipeline: common.depositPipeline,
    pmInterpolateBGL: common.interpolateBGL,
    pmInterpolatePipeline: common.interpolatePipeline,
    renderSampleCount,
    renderTargetFormat,
    starBuffers: bodyBuffers,
    starCount: count,
    totalStarMass,
  });

  return {
    boundarySampleBG,
    boundarySamplePipeline,
    boundarySampleWg: inner.wgCount[0],
    gas,
    inner,
    outer,
    prolongPipeline: common.prolongPipeline,
    residualPipeline: common.residualPipeline,
    restrictPipeline: common.restrictPipeline,
    smoothPipeline: common.smoothPipeline,
    depositAndConvert(encoder, pingPong, timestampWrites) {
      encoder.clearBuffer(inner.densityU32);
      encoder.clearBuffer(inner.meanScratch);
      encoder.clearBuffer(outer.densityU32);
      encoder.clearBuffer(outer.meanScratch);
      gas.clear(encoder);

      const pass = encoder.beginComputePass(timestampWrites ? { timestampWrites } : undefined);
      pass.setPipeline(common.depositPipeline);
      pass.setBindGroup(0, inner.depositBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 256));
      gas.depositInnerPm(pass, pingPong);
      pass.setPipeline(common.reducePipeline);
      pass.setBindGroup(0, inner.convertBG);
      pass.dispatchWorkgroups(Math.ceil(inner.level0Cells / 256));
      pass.setPipeline(common.convertPipeline);
      pass.dispatchWorkgroups(Math.ceil(inner.level0Cells / 256));

      pass.setPipeline(common.depositPipeline);
      pass.setBindGroup(0, outer.depositBG[pingPong]);
      pass.dispatchWorkgroups(Math.ceil(count / 256));
      gas.depositOuterPm(pass, pingPong);
      pass.setPipeline(common.reducePipeline);
      pass.setBindGroup(0, outer.convertBG);
      pass.dispatchWorkgroups(Math.ceil(outer.level0Cells / 256));
      pass.setPipeline(common.convertPipeline);
      pass.dispatchWorkgroups(Math.ceil(outer.level0Cells / 256));
      gas.depositGasAndBuildPressure(pass, pingPong);
      pass.end();
    },
    destroy() {
      // [LAW:single-enforcer] This module owns the full PM + gas allocation
      // lifecycle, so teardown happens in one place instead of drifting.
      gas.destroy();
      inner.force?.destroy();
      boundarySampleParams.destroy();
      blendBuffer.destroy();
      for (const grid of [inner, outer]) {
        grid.densityU32.destroy();
        grid.densityF32.destroy();
        grid.meanScratch.destroy();
        grid.paramsBuffer.destroy();
        grid.densityStaging.destroy();
        for (const buffer of grid.potential) buffer.destroy();
        for (const buffer of grid.residual) buffer.destroy();
        for (let i = 1; i < grid.rho.length; i++) grid.rho[i].destroy();
        for (const pair of grid.smoothUniform) for (const buffer of pair) buffer.destroy();
        for (const buffer of grid.residualUniform) buffer.destroy();
        for (const buffer of grid.restrictUniform) buffer.destroy();
        for (const buffer of grid.prolongUniform) buffer.destroy();
      }
    },
    interpolateForces(encoder, countValue, pingPong, starTimestampWrites, gasTimestampWrites) {
      const starPass = encoder.beginComputePass(starTimestampWrites ? { timestampWrites: starTimestampWrites } : undefined);
      starPass.setPipeline(common.interpolatePipeline);
      starPass.setBindGroup(0, interpolateBG[pingPong]);
      starPass.dispatchWorkgroups(Math.ceil(countValue / 256));
      starPass.end();

      const gasPass = encoder.beginComputePass(gasTimestampWrites ? { timestampWrites: gasTimestampWrites } : undefined);
      gas.interpolateForces(gasPass, pingPong);
      gasPass.end();
    },
    prepareFrame(dt, gasSoundSpeed) {
      inner.paramsF32[0] = dt;
      device.queue.writeBuffer(inner.paramsBuffer, 0, inner.paramsF32.buffer);
      outer.paramsF32[0] = dt;
      device.queue.writeBuffer(outer.paramsBuffer, 0, outer.paramsF32.buffer);
      gas.prepareFrame(dt, gasSoundSpeed);
    },
  };
}

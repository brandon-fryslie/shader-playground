import type { AppState, Attractor, DepthRef, Simulation } from '../../types';
import type { SimulationFactoryContext } from '../shared';

import { createPhysicsComputeService } from './compute';
import { createPhysicsDiagnostics } from './diagnostics';
import { createPhysicsInitialConditions } from './initial-conditions';
import { createPhysicsParticleMesh } from './particle-mesh';
import { createPhysicsStepController } from './params';
import { createPhysicsRenderService } from './render';
import { createPhysicsStatsService } from './stats';

type ShaderFactory = (label: string, source: string) => GPUShaderModule;

type PhysicsSimulationDependencies = SimulationFactoryContext & {
  createShaderModuleChecked: ShaderFactory;
  getAttractorStrength(attractor: Attractor, simStep: number, ceiling: number): number;
  getCameraUniformData(aspect: number): BufferSource;
  getColorAttachment(
    depthRef: DepthRef,
    textureView: GPUTextureView,
    viewport: number[] | null,
  ): GPURenderPassColorAttachment;
  getDepthAttachment(depthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment;
  postFxDepthView(): GPUTextureView;
  renderGrid(pass: GPURenderPassEncoder, aspect: number, viewIndex: number): void;
  state: AppState;
};

export function createPhysicsSimulation(
  deps: PhysicsSimulationDependencies,
): Simulation {
  const count = deps.state.physics.count;
  const bodyBytes = count * 48;
  const gasMassFraction = Math.max(0, Math.min(0.5, deps.state.physics.gasMassFraction ?? 0.15));
  const { initData, orbitalBasis, totalStarMass } = createPhysicsInitialConditions(count, deps.state.physics);
  const orbitalTangent = orbitalBasis.tangent;
  const orbitalBitangent = orbitalBasis.bitangent;
  const diskNormal: [number, number, number] = [0, 1, 0];

  // [LAW:one-source-of-truth] Physics PM constants are owned here so the
  // factory's resource sizing and service wiring agree exactly.
  const PM_GRID_RES = 128;
  const PM_DOMAIN_HALF = 16.0;
  const PM_DOMAIN_SIZE = PM_DOMAIN_HALF * 2;
  const PM_CELL_SIZE = PM_DOMAIN_SIZE / PM_GRID_RES;
  const PM_FIXED_POINT_SCALE = 65536;
  const PM_MULTIGRID_LEVELS = 6;

  const bufferA = deps.device.createBuffer({
    size: bodyBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  new Float32Array(bufferA.getMappedRange()).set(initData);
  bufferA.unmap();

  const bufferB = deps.device.createBuffer({
    size: bodyBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });

  const cameraBuffer = deps.device.createBuffer({
    size: deps.cameraStride * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const physicsStep = createPhysicsStepController({
    attractorMax: deps.attractorMax,
    baseDt: deps.baseDt,
    count,
    device: deps.device,
    diskNormal,
    getAttractorStrength: deps.getAttractorStrength,
    state: deps.state,
  });
  const { blurBuffer, paramsBuffer } = physicsStep;

  const particleMesh = createPhysicsParticleMesh({
    bodyBuffers: [bufferA, bufferB],
    cameraBuffer,
    cameraSize: deps.cameraSize,
    cameraStride: deps.cameraStride,
    count,
    createShaderModuleChecked: deps.createShaderModuleChecked,
    device: deps.device,
    gasMassFraction,
    gravityScale: (deps.state.physics.G ?? 0.3) * 0.001,
    innerGrid: {
      cellSize: PM_CELL_SIZE,
      domainHalf: PM_DOMAIN_HALF,
      filterOutOfDomain: 1,
      fixedPointScale: PM_FIXED_POINT_SCALE,
      gridRes: PM_GRID_RES,
      levels: PM_MULTIGRID_LEVELS,
    },
    renderSampleCount: deps.renderSampleCount,
    renderTargetFormat: deps.renderTargetFormat,
    totalStarMass,
  });

  const {
    gas,
    inner: {
      densityF32: pmDensityF32,
      densityStaging: pmDensityStaging,
      densityU32: pmDensityU32,
      getDiagPending: getPmDiagPending,
      level0Cells: pmLevel0Cells,
      meanScratch: pmMeanScratch,
      potential: pmPotential,
      residual: pmResidual,
      setDiagPending: setPmDiagPending,
    },
    outer: {
      densityF32: pmOuterDensityF32,
      densityStaging: pmOuterDensityStaging,
      getDiagPending: getPmOuterDiagPending,
      level0Cells: pmOuterLevel0Cells,
      potential: pmOuterPotential,
      residual: pmOuterResidual,
      setDiagPending: setPmOuterDiagPending,
    },
  } = particleMesh;
  const pmForce = particleMesh.inner.force!;

  const physicsStats = createPhysicsStatsService({
    buffers: [bufferA, bufferB],
    createShaderModuleChecked: deps.createShaderModuleChecked,
    device: deps.device,
  });

  const physicsCompute = createPhysicsComputeService({
    bodyBuffers: [bufferA, bufferB],
    count,
    createShaderModuleChecked: deps.createShaderModuleChecked,
    device: deps.device,
    paramsBuffer,
    particleMesh,
    physicsStats,
    softeningDefault: 0.15,
    stepController: physicsStep,
    tsWrites: deps.tsWrites,
  });

  const physicsRender = createPhysicsRenderService({
    attractorMax: deps.attractorMax,
    bodyBuffers: [bufferA, bufferB],
    cameraBuffer,
    cameraSize: deps.cameraSize,
    cameraStride: deps.cameraStride,
    clearColor: deps.clearColor,
    count,
    createShaderModuleChecked: deps.createShaderModuleChecked,
    device: deps.device,
    gas,
    getAttractorStrength: deps.getAttractorStrength,
    getCameraUniformData: deps.getCameraUniformData,
    getColorAttachment: deps.getColorAttachment,
    getCurrentSceneView: deps.getCurrentSceneView,
    getDefaultAspect: deps.getDefaultAspect,
    getDepthAttachment: deps.getDepthAttachment,
    getSimStep: () => physicsStep.getSimStep(),
    getXrDepthOverride: deps.getXrDepthOverride,
    markersPerAttractor: deps.markersPerAttractor,
    nullColorView: deps.nullColorView,
    nullDepthView: deps.nullDepthView,
    postFxDepthView: deps.postFxDepthView,
    renderGrid: deps.renderGrid,
    renderSampleCount: deps.renderSampleCount,
    renderTargetFormat: deps.renderTargetFormat,
    state: deps.state,
    trailBlurBuffer: blurBuffer,
  });

  const DIAG_SAMPLE = 2048;
  const diagSampleBytes = Math.min(count, DIAG_SAMPLE) * 48;
  const diagStaging = deps.device.createBuffer({
    size: diagSampleBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const depthRef: DepthRef = {};

  let computeStepForDiagnostics: ((encoder: GPUCommandEncoder) => void) | null = null;
  const physicsDiagnostics = createPhysicsDiagnostics({
    bufferA,
    bufferB,
    computeStep: (encoder) => {
      if (computeStepForDiagnostics) computeStepForDiagnostics(encoder);
    },
    count,
    device: deps.device,
    diagSample: DIAG_SAMPLE,
    diagStaging,
    diskNormal,
    gas,
    getLastStats: () => physicsStats.getLastStats(),
    getPingPong: () => physicsCompute.getPingPong(),
    getPmDiagPending,
    getPmOuterDiagPending,
    getTimeDirection: () => physicsStep.getTimeDirection(),
    orbitalBitangent,
    orbitalTangent,
    pmDensityF32,
    pmDensityStaging,
    pmLevel0Cells,
    pmOuterDensityF32,
    pmOuterDensityStaging,
    pmOuterLevel0Cells,
    pmOuterPotential: pmOuterPotential[0],
    pmOuterResidual: pmOuterResidual[0],
    pmPotential: pmPotential[0],
    pmResidual: pmResidual[0],
    setPmDiagPending,
    setPmOuterDiagPending,
    setPaused: (value) => {
      deps.state.paused = value;
    },
    setTimeDirection: (dir) => {
      physicsStep.setTimeDirection(dir);
    },
    state: deps.state,
  });

  // [LAW:single-enforcer] Physics simulation lifecycle is assembled in one
  // factory so render/compute/diagnostics ownership cannot drift.
  const simulation = {
    setTimeDirection(dir: number) {
      physicsStep.setTimeDirection(dir);
    },
    getSimStep() {
      return physicsStep.getSimStep();
    },
    getTimeDirection() {
      return physicsStep.getTimeDirection();
    },
    setBlurTime(blurTime: number) {
      physicsStep.setBlurTime(blurTime);
    },
    getJournalCapacity() {
      return physicsStep.getJournalCapacity();
    },
    getJournalHighWater() {
      return physicsStep.getJournalHighWater();
    },
    compute(encoder: GPUCommandEncoder) {
      physicsCompute.compute(encoder);
    },
    render(
      encoder: GPUCommandEncoder,
      textureView: GPUTextureView,
      viewport: number[] | null,
      viewIndex = 0,
    ) {
      physicsRender.render(encoder, textureView, viewport, viewIndex, physicsCompute.getPingPong(), depthRef, {
        gasRender: deps.tsWrites('gasRender'),
        starsRender: deps.tsWrites('starsRender'),
      });
    },
    getCount() {
      return count;
    },
    ...physicsDiagnostics,
    destroy() {
      bufferA.destroy();
      bufferB.destroy();
      physicsStep.destroy();
      cameraBuffer.destroy();
      physicsRender.destroy();
      physicsStats.destroy();
      diagStaging.destroy();
      particleMesh.destroy();
    },
    pmDensityU32,
    pmDensityF32,
    pmPotential,
    pmResidual,
    pmForce,
    pmMeanScratch,
  };

  computeStepForDiagnostics = simulation.compute.bind(simulation);
  return simulation;
}

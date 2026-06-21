import '../../styles/main.css';
import type { SimMode, Simulation, AppState, DepthRef } from '../types';
import { bindingRegistry } from '../xr-ui/bindings';
import { evaluateAnchor } from '../xr-ui/anchors';
import { layout as xrUiLayout, hitTestWidgets } from '../xr-ui/layout';
import {
  xrUiStep, applySideEffects as xrUiApplyEffects, makeIdlePrev as xrUiMakeIdlePrev,
} from '../xr-ui/step';
import { GAS_SHADER_SOURCES } from '../gasReservoir';
import { DEFAULTS as catalogDefaults, PRESETS as catalogPresets, PARAM_DEFS as catalogParamDefs, COLOR_THEMES as catalogColorThemes, DEFAULT_THEME as catalogDefaultTheme, THEME_FADE_MS as catalogThemeFadeMs, DEFAULT_CLEAR_COLOR as catalogDefaultClearColor, SHAPE_IDS as catalogShapeIds, SHAPE_PARAMS as catalogShapeParams, FX_PARAM_DEFS as catalogFxParamDefs, MODE_TAB_LABELS as catalogModeTabLabels } from './catalog';
import { createAppActions, type AppActions } from './actions';
import { createGpuContext, type GpuContext, type GpuContextDeps } from './gpu-context';
import { createInitialState } from './state';
import { registerAppBindings } from './bindings';
import { createUiOrchestrator, type UiOrchestrator } from './ui-orchestrator';
import { saveState as persistState, loadState as hydrateState, STORAGE_KEY as storageKey } from '../persistence/local-storage';
import { createSimulationFactories } from '../simulations/factories';
import { isPhysicsSimulation } from '../simulations/types';
import { createSimulationRegistry, type SimulationRegistry } from '../simulations/registry';
import type { SimulationFactoryContext } from '../simulations/shared';
import { getShaderSources as getCatalogShaderSources, applyShaderEdit as applyCatalogShaderEdit, resetShaderEdit as resetCatalogShaderEdit } from '../gpu/shaders';
import type { GpuTimingBucket } from '../gpu/timestamps';
import { installDevtools } from '../diagnostics/devtools';
import { createDiagnosticsLogger } from '../diagnostics/logging';
import { metrics } from '../metrics/bus';
import { createAttractorSystem, type AttractorSystem, ATTRACTOR_MAX, MARKERS_PER_ATTRACTOR, PHYSICS_BASE_DT } from '../input/attractors';
import { createPointerSystem, type PointerSystem } from '../input/pointer';
import { createMobileInput, type MobileInput } from '../input/mobile';
import { createGridRenderer, type GridRenderer } from '../render/grid';
import { createXrInputSystem, type XrInputSystem } from '../xr/input';
import { createXrRuntime, type XrRuntime } from '../xr/runtime';

let gpuContext!: GpuContext;
let currentGpuPhase = 'boot';
const diagnosticsLogger = createDiagnosticsLogger({
  getDevice: () => gpuContext.device,
  getPhase: () => currentGpuPhase,
});
diagnosticsLogger.installGlobalHandlers();
const {
  createShaderModuleChecked,
  createShaderModuleCheckedForDevice,
  logError,
  logInfo,
  showSimError,
} = diagnosticsLogger;


// [LAW:one-source-of-truth] AppState creation is centralized in app/state.ts so
// boot and tests share one canonical initialization shape.
const state: AppState = createInitialState(catalogDefaults);
let appActions!: AppActions;
let uiOrchestrator!: UiOrchestrator;

function modeParams(mode: SimMode): Record<string, number | string | boolean> {
  return state[mode] as unknown as Record<string, number | string | boolean>;
}

let attractorSystem!: AttractorSystem;

function currentSimStep(): number {
  return attractorSystem.currentSimStep();
}

function currentTimeDirection(): number {
  return attractorSystem.currentTimeDirection();
}

function attractorStrength(attractor: Parameters<AttractorSystem['attractorStrength']>[0], currentStep: number, ceiling: number): number {
  return attractorSystem.attractorStrength(attractor, currentStep, ceiling);
}

function pruneAttractors(currentStep: number): void {
  attractorSystem.prune(currentStep);
}

function createAttractor(pointerId: number, pos: number[]): void {
  attractorSystem.create(pointerId, pos);
}

function moveAttractor(pointerId: number, pos: number[]): void {
  attractorSystem.move(pointerId, pos);
}

function releaseAttractor(pointerId: number): void {
  attractorSystem.release(pointerId);
}

function tickMarkers(dt: number): void {
  attractorSystem.tickMarkers(dt);
}

const FLUID_GRID_RES = 96; // tessellation resolution for 3D fluid mesh
// [LAW:one-source-of-truth] Fluid world size is declared once so rendering and interaction use identical bounds.
const FLUID_WORLD_SIZE = 4; // full width/depth of the fluid volume in world units

// Camera uniform buffer layout for stereo XR rendering.
// Each view's 192-byte Camera struct is placed at a 256-byte aligned offset so
// both eyes can coexist in one buffer. writeBuffer calls go to different offsets,
// so neither overwrites the other before the command buffer executes.
const CAMERA_SIZE = 208;   // sizeof(Camera) in WGSL — includes interaction state
const CAMERA_STRIDE = 256; // >= CAMERA_SIZE, multiple of minUniformBufferOffsetAlignment

let xrRuntime: XrRuntime | null = null;
let xrInputSystem!: XrInputSystem;

function ensureHdrTargets(width: number, height: number): void {
  gpuContext.postFx.ensureHdrTargets(width, height);
}

function getCurrentSceneView(): GPUTextureView {
  return gpuContext.postFx.getCurrentSceneView();
}

function getColorAttachment(
  simDepthRef: DepthRef,
  resolveTarget: GPUTextureView,
  viewport: number[] | null,
): GPURenderPassColorAttachment {
  return gpuContext.postFx.getColorAttachment(simDepthRef, resolveTarget, viewport, state.fx.trailPersistence, catalogDefaultClearColor);
}

function getDepthAttachment(simDepthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment {
  return gpuContext.postFx.getDepthAttachment(simDepthRef, viewport, xrRuntime?.getDepthOverride() ?? null);
}

function getRenderViewport(viewport: number[] | null): number[] | null {
  return viewport;
}

function destroyDepthRef(_depthRef: DepthRef) {
  // Depth and color targets are now shared/global; nothing per-sim to destroy.
}

function getCameraUniformData(aspect: number) {
  return gpuContext.cameraSystem.getUniformData(aspect, uiOrchestrator.getThemeColors(), state.mouse);
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: WEBGPU INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function createGpuContextDeps(): GpuContextDeps {
  return {
    createShaderModuleChecked: createShaderModuleCheckedForDevice,
    currentSimStep,
    currentTimeDirection,
    dropSimulationIfCurrent,
    getCanvasContainer: () => document.getElementById('canvas-container')!,
    getCurrentSimulation: () => simulations[state.mode],
    getDefaultClearColor: () => catalogDefaultClearColor,
    getThemeColors: () => uiOrchestrator.getThemeColors(),
    logError,
    pruneAttractors,
    refreshThemeColors: (now) => uiOrchestrator.refreshThemeColors(now),
    restoreAfterDeviceLoss,
    runDebugCompute: (sim, encoder) => uiOrchestrator.runDebugCompute(sim, encoder),
    showSimError,
    state,
    tickMarkers,
    updateAdaptiveChunk: (deltaMs) => uiOrchestrator.updateAdaptiveChunk(deltaMs),
    updateDebugPanel: () => uiOrchestrator.updateDebugPanel(),
  };
}

async function restoreAfterDeviceLoss(): Promise<void> {
  const restoredContext = await createGpuContext(createGpuContextDeps());
  if (!restoredContext) return;
  gpuContext = restoredContext;
  initGrid();
  ensureSimulation();
  gpuContext.frameRuntime.requestFrame();
}

function getActivePhysicsSimulation() {
  const sim = simulations['physics'];
  return isPhysicsSimulation(sim) ? sim : null;
}

function initializeRuntimeServices(): void {
  attractorSystem = createAttractorSystem({
    getCurrentPhysicsStep: () => getActivePhysicsSimulation()?.getSimStep() ?? 0,
    getCurrentTimeDirection: () => getActivePhysicsSimulation()?.getTimeDirection() ?? 1,
    getThemeColors: () => uiOrchestrator.getThemeColors(),
    state,
  });
  pointerSystem = createPointerSystem({
    fluidWorldSize: FLUID_WORLD_SIZE,
    getCanvas: () => gpuContext.canvas,
    onCreateAttractor: createAttractor,
    onMoveAttractor: moveAttractor,
    onReleaseAttractor: releaseAttractor,
    state,
  });
  mobileInput = createMobileInput({
    actions: appActions,
    applySimulationInteraction: (pointerId, mx, my, isMove) => pointerSystem.applySimulationInteraction(pointerId, mx, my, isMove),
    getCanvas: () => gpuContext.canvas,
    modeTabLabels: catalogModeTabLabels,
    releasePointerInteraction: (pointerId) => pointerSystem.releasePointerInteraction(pointerId),
    setSimulationInteractionInactive,
    state,
    storageKey,
  });
  xrInputSystem = createXrInputSystem({
    bindings: bindingRegistry,
    closestPointOnRayToOrigin,
    createAttractor,
    intersectRayWithPlane,
    metrics,
    moveAttractor,
    releaseAttractor,
    setSimulationInteractionInactive,
    state,
    worldToFluidUV,
  });
}

function syncRenderConfig(_nextFormat: GPUTextureFormat, _nextSampleCount: number) {
  // [LAW:one-source-of-truth] All sims always render into HDR (rgba16float). Composite output format
  // is handled per-call by ensureCompositePipeline(); this function no longer needs to rebuild anything.
  gpuContext.postFx.markNeedsClear();
}


// ═══════════════════════════════════════════════════════════════════════════════
// ═══ SHARED GRID RENDERER ═══

let gridRenderer: GridRenderer | null = null;

function initGrid() {
  gridRenderer?.destroy();
  gridRenderer = createGridRenderer({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    device: gpuContext.device,
    getCameraUniformData,
    renderSampleCount: gpuContext.renderSampleCount,
    renderTargetFormat: gpuContext.renderTargetFormat,
  });
}

function renderGrid(pass: GPURenderPassEncoder, aspect: number, viewIndex = 0): void {
  gridRenderer?.render(pass, aspect, viewIndex);
}


// SECTION 5: SIMULATION MODULES
// ═══════════════════════════════════════════════════════════════════════════════

// [LAW:one-source-of-truth] The extracted simulation registry owns the live
// instances. This map is a compatibility cache for the remaining legacy seam.
const simulations: Partial<Record<SimMode, Simulation>> = {};
let simulationRegistry: SimulationRegistry | null = null;

function syncSimulationCache(mode: SimMode): void {
  const sim = simulationRegistry?.get(mode);
  if (sim) simulations[mode] = sim;
  else delete simulations[mode];
}

function dropSimulationIfCurrent(mode: SimMode, expected: Simulation): void {
  simulationRegistry?.dropIfCurrent(mode, expected);
  syncSimulationCache(mode);
}

function createSimulationFactoryContext(): SimulationFactoryContext {
  // [LAW:single-enforcer] Runtime-to-simulation translation happens once at
  // this boundary, producing the one canonical capability shape every factory consumes.
  return {
    attractorMax: ATTRACTOR_MAX,
    baseDt: PHYSICS_BASE_DT,
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    clearColor: catalogDefaultClearColor,
    createShaderModuleChecked,
    destroyDepthRef,
    device: gpuContext.device,
    fluidGridResolution: FLUID_GRID_RES,
    fluidWorldSize: FLUID_WORLD_SIZE,
    getAttractorStrength: attractorStrength,
    getCameraUniformData,
    getColorAttachment,
    getCurrentSceneView,
    getDefaultAspect: () => gpuContext.canvas.width / gpuContext.canvas.height,
    getDepthAttachment,
    getRenderViewport,
    getXrDepthOverride: () => xrRuntime?.getDepthOverride() ?? null,
    markersPerAttractor: MARKERS_PER_ATTRACTOR,
    nullColorView: gpuContext.postFx.getNullColorView(),
    nullDepthView: gpuContext.postFx.getNullDepthView(),
    postFxDepthView: () => gpuContext.postFx.getDepthView(),
    renderGrid,
    renderSampleCount: gpuContext.renderSampleCount,
    renderTargetFormat: gpuContext.renderTargetFormat,
    shapeIds: catalogShapeIds,
    state,
    tsWrites,
  };
}

function initializeSimulationRegistry(): void {
  simulationRegistry = createSimulationRegistry({
    device: gpuContext.device,
    factories: createSimulationFactories(createSimulationFactoryContext()),
    reportError: (mode, message) => {
      showSimError(mode, message);
      delete simulations[mode];
    },
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: INPUT POINTERS
// ═══════════════════════════════════════════════════════════════════════════════
// UI subsystems (controls, theme, prompt, shader panel, debug panel, XR record
// button, XR enter button, time-reverse keybindings) all live behind
// ui-orchestrator.ts; the runtime only routes per-frame hooks through it.

let pointerSystem!: PointerSystem;
let mobileInput!: MobileInput;

function worldToFluidUV(worldPoint: number[]): number[] | null {
  return pointerSystem.worldToFluidUV(worldPoint);
}

function intersectRayWithPlane(origin: number[], dir: number[], planeY: number): number[] | null {
  return pointerSystem.intersectRayWithPlane(origin, dir, planeY);
}

function closestPointOnRayToOrigin(origin: number[], dir: number[]): number[] {
  return pointerSystem.closestPointOnRayToOrigin(origin, dir);
}

function setSimulationInteractionInactive(): void {
  pointerSystem.setSimulationInteractionInactive();
}

const mobileQuery = matchMedia('(max-width: 768px)');
let isMobile = mobileQuery.matches;

function setupMouseControls() {
  pointerSystem.setupMouseControls();
}

function setupMobileTouchControls() {
  mobileInput.setupTouchControls();
}

function setupMobileFab() {
  mobileInput.setupFab();
}

function setupBottomSheet() {
  mobileInput.setupBottomSheet();
}

function applyMobileDefaults() {
  mobileInput.applyMobileDefaults();
}

// Maps simulation mode → named shader sources
function getShaderSources(mode: SimMode): Record<string, string> {
  if (mode === 'physics') {
    return { ...getCatalogShaderSources(mode), ...GAS_SHADER_SOURCES };
  }
  return getCatalogShaderSources(mode);
}

async function toggleXR() {
  await xrRuntime?.toggle();
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: RENDER LOOP & ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

function tsWrites(bucket: GpuTimingBucket) {
  return gpuContext.frameRuntime.tsWrites(bucket);
}

function ensureSimulation() {
  const mode = state.mode;
  if (!simulationRegistry) initializeSimulationRegistry();
  simulationRegistry?.ensure(mode);
  syncSimulationCache(mode);
}

function resetCurrentSim() {
  const mode = state.mode;
  if (!simulationRegistry) initializeSimulationRegistry();
  simulationRegistry?.reset(mode);
  syncSimulationCache(mode);
}

function updateStats() {
  gpuContext.frameRuntime.updateStats();
}

function resizeCanvas() {
  gpuContext.frameRuntime.resize();
}

function runBloomChain(encoder: GPUCommandEncoder, timingBucket?: GpuTimingBucket) {
  gpuContext.frameRuntime.runBloomChain(encoder, timingBucket);
}

function runComposite(
  encoder: GPUCommandEncoder,
  finalView: GPUTextureView,
  finalFormat: GPUTextureFormat,
  viewport: number[] | null = null,
  timingBucket?: GpuTimingBucket
) {
  gpuContext.frameRuntime.runComposite(encoder, finalView, finalFormat, viewport, timingBucket);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: STATE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

function saveState() {
  persistState(state, catalogDefaults, modeParams);
}

function loadState() {
  hydrateState(state, catalogDefaults, catalogColorThemes, modeParams,
    (themeName) => uiOrchestrator.syncThemeTransition(themeName));
}

// ═══════════════════════════════════════════════════════════════════════════════
// BINDING REGISTRATION (parallel data source for the new XR widget system)
// ═══════════════════════════════════════════════════════════════════════════════
// [LAW:one-source-of-truth] Each Binding read/writes the canonical state field directly.
// The DOM controls also write the same fields — both paths converge on the same state.
// No widget consumes these bindings yet (that lands in ticket .10+); for now this is a
// parallel descriptor tree the future widget layer will compose against.
// [LAW:one-way-deps] bindings.ts knows nothing about main.ts; we register from here
// using closures that capture state and mode-helper functions.
function initBindings(): void {
  registerAppBindings({
    actions: appActions,
    modeParams,
    modeTabLabels: catalogModeTabLabels,
    paramDefs: catalogParamDefs,
    presets: catalogPresets,
    registry: bindingRegistry,
    state,
    themes: catalogColorThemes,
  });
}

export async function startAppRuntimeImpl() {
  const bootedContext = await createGpuContext(createGpuContextDeps());
  if (!bootedContext) return;
  gpuContext = bootedContext;

  // [LAW:single-enforcer] One UI orchestrator owns every DOM-facing subsystem;
  // construct it after gpu boot so the debug panel can read the live canvas.
  uiOrchestrator = createUiOrchestrator({
    state,
    storageKey,
    modeParams,
    catalog: {
      defaults: catalogDefaults,
      defaultTheme: catalogDefaultTheme,
      themeFadeMs: catalogThemeFadeMs,
      themes: catalogColorThemes,
      fxParamDefs: catalogFxParamDefs,
      modeTabLabels: catalogModeTabLabels,
      paramDefs: catalogParamDefs,
      presets: catalogPresets,
      shapeParams: catalogShapeParams,
    },
    getActions: () => appActions,
    getCanvas: () => gpuContext.canvas,
    getPhysicsSimulation: getActivePhysicsSimulation,
    getActiveSimulation: () => simulations[state.mode],
    getXrSession: () => xrRuntime?.getSession() ?? null,
    toggleXr: toggleXR,
    setXrDebugLogging: (on) => xrInputSystem.setDebugLogging(on),
    createShaderModule: (code) => gpuContext.device.createShaderModule({ code }),
    applyShaderEdit: applyCatalogShaderEdit,
    resetShaderEdit: resetCatalogShaderEdit,
    getShaderSources,
    metrics,
  });

  // [LAW:single-enforcer] App-level mutations flow through one action surface
  // built around orchestrator hooks; theme/pause/prompt/shader/debug coordination
  // all originate from this object.
  appActions = createAppActions({
    cancelDebugMovement: () => uiOrchestrator.cancelDebugMovement(),
    ensureSimulation,
    modeParams,
    presets: catalogPresets,
    reflectPaused: () => uiOrchestrator.syncPauseButtons(),
    resetCurrentSimulationInternal: resetCurrentSim,
    saveStateInternal: saveState,
    selectTheme: (themeName) => uiOrchestrator.selectTheme(themeName),
    state,
    syncUi: () => uiOrchestrator.syncUiFromState(),
    updatePrompt: () => uiOrchestrator.updatePrompt(),
    updateShaderPanel: () => uiOrchestrator.updateShaderPanel(),
    updateStats,
  });

  initializeRuntimeServices();
  initializeSimulationRegistry();
  xrRuntime = createXrRuntime({
    cameraStride: CAMERA_STRIDE,
    cameraSystem: gpuContext.cameraSystem,
    canvasFormat: () => gpuContext.canvasFormat,
    currentSimStep,
    currentTimeDirection,
    device: gpuContext.device,
    ensureHdrTargets,
    getCameraUniformData,
    getCurrentPhase: () => currentGpuPhase,
    getCurrentSimulation: () => simulations[state.mode],
    getPostFxSceneFormat: (index) => gpuContext.postFx.getSceneFormat(index),
    getPostFxSceneIndex: () => gpuContext.postFx.getSceneIndex(),
    getPostFxSceneView: (index) => gpuContext.postFx.getSceneView(index),
    getRefSpace: () => xrInputSystem.getRefSpace(),
    getUiRenderList: () => xrInputSystem.getRenderList(),
    initializeReferenceSpace: (refSpace, gotFloor) => xrInputSystem.initializeReferenceSpace(refSpace, gotFloor),
    inputStep: (frame) => xrInputSystem.inputStep(frame),
    logError,
    logInfo,
    markPostFxNeedsClear: () => gpuContext.postFx.markNeedsClear(),
    onSelectEnd: (source) => xrInputSystem.onSelectEnd(source),
    postFxRunBloomChain: runBloomChain,
    postFxRunComposite: runComposite,
    pruneAttractors,
    queuePendingSource: (source) => { xrInputSystem.queuePendingSource(source); },
    refreshThemeColors: (now) => uiOrchestrator.refreshThemeColors(now),
    requestDesktopFrame: () => gpuContext.frameRuntime.requestFrame(),
    resetInputState: () => xrInputSystem.reset(),
    clearReferenceSpace: () => xrInputSystem.clearReferenceSpace(),
    setCurrentPhase: (phase) => { currentGpuPhase = phase; },
    setHandTrackingAvailable: () => {},
    state,
    syncRenderConfig,
    tickFrameStats: (time) => gpuContext.frameRuntime.tickFrameStats(time),
    tickMarkers,
    uiRegistry: xrInputSystem.getUiRegistry(),
    updateStats,
  });

  // Mobile detection — gates touch controls, bottom sheet, and performance defaults
  isMobile = mobileQuery.matches;
  document.body.classList.toggle('mobile', isMobile);
  mobileQuery.addEventListener('change', (e) => {
    const nextIsMobile = e.matches;
    if (nextIsMobile === isMobile) return;
    isMobile = nextIsMobile;
    document.body.classList.toggle('mobile', isMobile);

    // Input handlers and mobile-only UI are initialized during startup, so
    // crossing the breakpoint requires a full re-init to avoid mixing
    // desktop and mobile interaction semantics.
    window.location.reload();
  });

  initGrid();
  loadState();
  if (isMobile) applyMobileDefaults();
  uiOrchestrator.syncThemeTransition(state.colorTheme);
  initBindings();
  uiOrchestrator.init();
  if (isMobile) {
    setupMobileTouchControls();
    setupMobileFab();
    setupBottomSheet();
  } else {
    setupMouseControls();
  }
  uiOrchestrator.syncUiFromState();
  resizeCanvas();
  ensureSimulation();
  appActions.updateAll();
  gpuContext.frameRuntime.start();
  installDevtools({
    state,
    getCurrentSimulation: () => simulations[state.mode],
    getGpuStats: () => gpuContext.frameRuntime.getGpuStats(),
    bindings: bindingRegistry,
    anchors: { evaluateAnchor, handFrames: xrInputSystem.getHandFrames() },
    xrUi: {
      layout: xrUiLayout,
      hitTestWidgets,
      step: xrUiStep,
      applyEffects: xrUiApplyEffects,
      registry: xrInputSystem.getUiRegistry(),
      makeIdlePrev: xrUiMakeIdlePrev,
      getRenderList: () => xrInputSystem.getRenderList(),
      getPrev: () => xrInputSystem.getPrev(),
      getClaimed: () => xrInputSystem.getClaimed(),
    },
  });
}

import '../../styles/main.css';
import type { SimMode, Simulation, AppState } from '../types';
import { bindingRegistry } from '../xr-ui/bindings';
import { DEFAULTS as catalogDefaults, PRESETS as catalogPresets, PARAM_DEFS as catalogParamDefs, COLOR_THEMES as catalogColorThemes, DEFAULT_THEME as catalogDefaultTheme, THEME_FADE_MS as catalogThemeFadeMs, DEFAULT_CLEAR_COLOR as catalogDefaultClearColor, SHAPE_IDS as catalogShapeIds, SHAPE_PARAMS as catalogShapeParams, FX_PARAM_DEFS as catalogFxParamDefs, MODE_TAB_LABELS as catalogModeTabLabels } from './catalog';
import { createAppActions, type AppActions } from './actions';
import { createGpuContext, type GpuContext, type GpuContextDeps } from './gpu-context';
import { createInitialState } from './state';
import { createUiOrchestrator, type UiOrchestrator } from './ui-orchestrator';
import { saveState as persistState, STORAGE_KEY as storageKey } from '../persistence/local-storage';
import { runAppStartup } from './startup';
import { createSimulationFactories } from '../simulations/factories';
import { isPhysicsSimulation } from '../simulations/types';
import { createSimulationRegistry, type SimulationRegistry } from '../simulations/registry';
import type { SimulationFactoryContext } from '../simulations/shared';
import { getShaderSources, applyShaderEdit as applyCatalogShaderEdit, resetShaderEdit as resetCatalogShaderEdit } from '../gpu/shaders';
import { createDiagnosticsLogger } from '../diagnostics/logging';
import { metrics } from '../metrics/bus';
import { createAttractorSystem, type AttractorSystem, ATTRACTOR_MAX, MARKERS_PER_ATTRACTOR, PHYSICS_BASE_DT } from '../input/attractors';
import { createPointerSystem, type PointerSystem } from '../input/pointer';
import { createMobileInput } from '../input/mobile';
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
let pointerSystem!: PointerSystem;

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

function getCameraUniformData(aspect: number) {
  return gpuContext.cameraSystem.getUniformData(aspect, uiOrchestrator.getThemeColors(), state.mouse);
}

function createGpuContextDeps(): GpuContextDeps {
  return {
    createShaderModuleChecked: createShaderModuleCheckedForDevice,
    currentSimStep: attractorSystem.currentSimStep,
    currentTimeDirection: attractorSystem.currentTimeDirection,
    dropSimulationIfCurrent,
    getCanvasContainer: () => document.getElementById('canvas-container')!,
    getCurrentSimulation: () => simulations[state.mode],
    getDefaultClearColor: () => catalogDefaultClearColor,
    getThemeColors: () => uiOrchestrator.getThemeColors(),
    logError,
    pruneAttractors: attractorSystem.prune,
    refreshThemeColors: (now) => uiOrchestrator.refreshThemeColors(now),
    restoreAfterDeviceLoss,
    runDebugCompute: (sim, encoder) => uiOrchestrator.runDebugCompute(sim, encoder),
    showSimError,
    state,
    tickMarkers: attractorSystem.tickMarkers,
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
  const postFx = gpuContext.postFx;
  return {
    attractorMax: ATTRACTOR_MAX,
    baseDt: PHYSICS_BASE_DT,
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    clearColor: catalogDefaultClearColor,
    createShaderModuleChecked,
    device: gpuContext.device,
    fluidGridResolution: FLUID_GRID_RES,
    fluidWorldSize: FLUID_WORLD_SIZE,
    getAttractorStrength: attractorSystem.attractorStrength,
    getCameraUniformData,
    getColorAttachment: (depthRef, resolveTarget, viewport) =>
      postFx.getColorAttachment(depthRef, resolveTarget, viewport, state.fx.trailPersistence, catalogDefaultClearColor),
    getCurrentSceneView: () => postFx.getCurrentSceneView(),
    getDefaultAspect: () => gpuContext.canvas.width / gpuContext.canvas.height,
    getDepthAttachment: (depthRef, viewport) =>
      postFx.getDepthAttachment(depthRef, viewport, xrRuntime?.getDepthOverride() ?? null),
    getXrDepthOverride: () => xrRuntime?.getDepthOverride() ?? null,
    markersPerAttractor: MARKERS_PER_ATTRACTOR,
    nullColorView: postFx.getNullColorView(),
    nullDepthView: postFx.getNullDepthView(),
    postFxDepthView: () => postFx.getDepthView(),
    renderGrid,
    renderSampleCount: gpuContext.renderSampleCount,
    renderTargetFormat: gpuContext.renderTargetFormat,
    shapeIds: catalogShapeIds,
    state,
    tsWrites: (bucket) => gpuContext.frameRuntime.tsWrites(bucket),
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


const mobileQuery = matchMedia('(max-width: 768px)');
let isMobile = mobileQuery.matches;


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: RENDER LOOP & ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

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

export async function startAppRuntimeImpl() {
  // [LAW:no-ambient-temporal-coupling] Input subsystems are hoisted before GPU
  // boot so their method refs (used by gpu-context deps) bind to live functions,
  // not to module-level holes filled later.
  attractorSystem = createAttractorSystem({
    getCurrentPhysicsStep: () => getActivePhysicsSimulation()?.getSimStep() ?? 0,
    getCurrentTimeDirection: () => getActivePhysicsSimulation()?.getTimeDirection() ?? 1,
    getThemeColors: () => uiOrchestrator.getThemeColors(),
    state,
  });
  pointerSystem = createPointerSystem({
    fluidWorldSize: FLUID_WORLD_SIZE,
    getCanvas: () => gpuContext.canvas,
    onCreateAttractor: attractorSystem.create,
    onMoveAttractor: attractorSystem.move,
    onReleaseAttractor: attractorSystem.release,
    state,
  });

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
    toggleXr: async () => { await xrRuntime?.toggle(); },
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
    saveStateInternal: () => persistState(state, catalogDefaults, modeParams),
    selectTheme: (themeName) => uiOrchestrator.selectTheme(themeName),
    state,
    syncUi: () => uiOrchestrator.syncUiFromState(),
    updatePrompt: () => uiOrchestrator.updatePrompt(),
    updateShaderPanel: () => uiOrchestrator.updateShaderPanel(),
    updateStats: () => gpuContext.frameRuntime.updateStats(),
  });

  const mobileInput = createMobileInput({
    actions: appActions,
    applySimulationInteraction: (pointerId, mx, my, isMove) => pointerSystem.applySimulationInteraction(pointerId, mx, my, isMove),
    getCanvas: () => gpuContext.canvas,
    modeTabLabels: catalogModeTabLabels,
    releasePointerInteraction: (pointerId) => pointerSystem.releasePointerInteraction(pointerId),
    setSimulationInteractionInactive: pointerSystem.setSimulationInteractionInactive,
    state,
    storageKey,
  });
  xrInputSystem = createXrInputSystem({
    bindings: bindingRegistry,
    closestPointOnRayToOrigin: pointerSystem.closestPointOnRayToOrigin,
    createAttractor: attractorSystem.create,
    intersectRayWithPlane: pointerSystem.intersectRayWithPlane,
    metrics,
    moveAttractor: attractorSystem.move,
    releaseAttractor: attractorSystem.release,
    setSimulationInteractionInactive: pointerSystem.setSimulationInteractionInactive,
    state,
    worldToFluidUV: pointerSystem.worldToFluidUV,
  });

  initializeSimulationRegistry();
  xrRuntime = createXrRuntime({
    cameraStride: CAMERA_STRIDE,
    cameraSystem: gpuContext.cameraSystem,
    currentSimStep: attractorSystem.currentSimStep,
    currentTimeDirection: attractorSystem.currentTimeDirection,
    device: gpuContext.device,
    ensureHdrTargets: gpuContext.postFx.ensureHdrTargets,
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
    postFxRunBloomChain: (encoder) => gpuContext.frameRuntime.runBloomChain(encoder),
    postFxRunComposite: (encoder, finalView, finalFormat, viewport) =>
      gpuContext.frameRuntime.runComposite(encoder, finalView, finalFormat, viewport),
    pruneAttractors: attractorSystem.prune,
    queuePendingSource: (source) => { xrInputSystem.queuePendingSource(source); },
    refreshThemeColors: (now) => uiOrchestrator.refreshThemeColors(now),
    requestDesktopFrame: () => gpuContext.frameRuntime.requestFrame(),
    resetInputState: () => xrInputSystem.reset(),
    clearReferenceSpace: () => xrInputSystem.clearReferenceSpace(),
    setCurrentPhase: (phase) => { currentGpuPhase = phase; },
    setHandTrackingAvailable: () => {},
    state,
    tickFrameStats: (time) => gpuContext.frameRuntime.tickFrameStats(time),
    tickMarkers: attractorSystem.tickMarkers,
    uiRegistry: xrInputSystem.getUiRegistry(),
    updateStats: () => gpuContext.frameRuntime.updateStats(),
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

  runAppStartup({
    appActions,
    bindingRegistry,
    catalog: {
      defaults: catalogDefaults,
      fxParamDefs: catalogFxParamDefs,
      modeTabLabels: catalogModeTabLabels,
      paramDefs: catalogParamDefs,
      presets: catalogPresets,
      themes: catalogColorThemes,
    },
    ensureSimulation,
    getCurrentSimulation: () => simulations[state.mode],
    gpuContext,
    initGrid,
    isMobile,
    mobileInput,
    modeParams,
    pointerSystem,
    state,
    uiOrchestrator,
    xrInputSystem,
  });
}

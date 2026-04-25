import '../../styles/main.css';
import type { SimMode, Simulation, AppState, RGBThemeColors, DepthRef } from '../types';
import { bindingRegistry } from '../xr-ui/bindings';
import { evaluateAnchor } from '../xr-ui/anchors';
import { layout as xrUiLayout, hitTestWidgets } from '../xr-ui/layout';
import {
  xrUiStep, applySideEffects as xrUiApplyEffects, makeIdlePrev as xrUiMakeIdlePrev,
} from '../xr-ui/step';
import { GAS_SHADER_SOURCES } from '../gasReservoir';
import { DEFAULTS as catalogDefaults, PRESETS as catalogPresets, PARAM_DEFS as catalogParamDefs, COLOR_THEMES as catalogColorThemes, DEFAULT_THEME as catalogDefaultTheme, THEME_FADE_MS as catalogThemeFadeMs, DEFAULT_CLEAR_COLOR as catalogDefaultClearColor, SHAPE_IDS as catalogShapeIds, SHAPE_PARAMS as catalogShapeParams, FX_PARAM_DEFS as catalogFxParamDefs, MODE_TAB_LABELS as catalogModeTabLabels } from './catalog';
import { createAppActions, type AppActions } from './actions';
import { createInitialState } from './state';
import { registerAppBindings } from './bindings';
import { saveState as persistState, loadState as hydrateState, STORAGE_KEY as storageKey } from '../persistence/local-storage';
import { updatePrompt as renderPrompt } from '../ui/prompt';
import { createThemeSystem } from '../ui/theme';
import { createControls, type ControlsApi } from '../ui/controls';
import { createDebugPanel, type DebugPanel } from '../ui/debug-panel';
import { createShaderPanel, type ShaderPanel } from '../ui/shader-panel';
import { createBoidsSimulation as createBoidsSimulationModule } from '../simulations/boids';
import { createFluidSimulation as createFluidSimulationModule } from '../simulations/fluid';
import { createParametricSimulation as createParametricSimulationModule } from '../simulations/parametric';
import { createPhysicsSimulation as createPhysicsSimulationModule } from '../simulations/physics';
import { createPhysicsClassicSimulation as createPhysicsClassicSimulationModule } from '../simulations/physics-classic';
import { isPhysicsSimulation } from '../simulations/types';
import { createReactionSimulation as createReactionSimulationModule } from '../simulations/reaction';
import { createSimulationRegistry, type SimulationRegistry } from '../simulations/registry';
import { getShaderSources as getCatalogShaderSources, applyShaderEdit as applyCatalogShaderEdit, resetShaderEdit as resetCatalogShaderEdit } from '../gpu/shaders';
import { createGpuTimingService, type GpuTimingBucket } from '../gpu/timestamps';
import { installDevtools } from '../diagnostics/devtools';
import { createDiagnosticsLogger } from '../diagnostics/logging';
import { createAttractorSystem, type AttractorSystem, ATTRACTOR_MAX, MARKERS_PER_ATTRACTOR, PHYSICS_BASE_DT } from '../input/attractors';
import { createPointerSystem, type PointerSystem } from '../input/pointer';
import { createMobileInput, type MobileInput } from '../input/mobile';
import { createCameraSystem, type CameraSystem } from '../render/camera';
import { createRenderFrameRuntime, type RenderFrameRuntime } from '../render/frame';
import { createGridRenderer, type GridRenderer } from '../render/grid';
import { createPostFxService, type PostFxService } from '../render/post-fx';
import { createXrInputSystem, type XrGestureEvent, type XrInputSystem, type XrStateEvent } from '../xr/input';
import { createXrRuntime, type XrRuntime } from '../xr/runtime';

let currentGpuPhase = 'boot';
const diagnosticsLogger = createDiagnosticsLogger({
  getDevice: () => device,
  getPhase: () => currentGpuPhase,
});
diagnosticsLogger.installGlobalHandlers();
const { createShaderModuleChecked, logError, logInfo, showSimError } = diagnosticsLogger;


// [LAW:one-source-of-truth] AppState creation is centralized in app/state.ts so
// boot and tests share one canonical initialization shape.
const state: AppState = createInitialState(catalogDefaults);
let controlsApi: ControlsApi | null = null;
let appActions!: AppActions;

const themeSystem = createThemeSystem({
  // [LAW:one-source-of-truth] Theme metadata and transition ownership live in
  // app/catalog.ts and ui/theme.ts; the runtime consumes that service.
  defaultTheme: catalogDefaultTheme,
  fadeMs: catalogThemeFadeMs,
  onThemeSelected: () => appActions.updateAll(),
  state,
  themes: catalogColorThemes,
});

function getThemeColors(): RGBThemeColors {
  return themeSystem.getThemeColors();
}

function refreshThemeColors(now: number): void {
  themeSystem.refreshThemeColors(now);
}

function syncThemeTransition(themeName: string): void {
  themeSystem.syncThemeTransition(themeName);
}

function syncThemeButtons(themeName: string): void {
  themeSystem.syncThemeButtons(themeName);
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: WGSL SHADERS
// ═══════════════════════════════════════════════════════════════════════════════










const FLUID_GRID_RES = 96; // tessellation resolution for 3D fluid mesh
// [LAW:one-source-of-truth] Fluid world size is declared once so rendering and interaction use identical bounds.
const FLUID_WORLD_SIZE = 4; // full width/depth of the fluid volume in world units

// Camera uniform buffer layout for stereo XR rendering.
// Each view's 192-byte Camera struct is placed at a 256-byte aligned offset so
// both eyes can coexist in one buffer. writeBuffer calls go to different offsets,
// so neither overwrites the other before the command buffer executes.
const CAMERA_SIZE = 208;   // sizeof(Camera) in WGSL — includes interaction state
const CAMERA_STRIDE = 256; // >= CAMERA_SIZE, multiple of minUniformBufferOffsetAlignment
// [LAW:one-source-of-truth] Desktop projection range is owned here so every pass sees the same far-plane budget.

// All shape equations baked into one shader — shapeId uniform selects which runs.
// p1–p4 are per-shape parameters passed as uniforms (no recompilation on change).

let cameraSystem!: CameraSystem;
let postFx!: PostFxService;
let xrRuntime: XrRuntime | null = null;
let xrInputSystem!: XrInputSystem;
let renderFrameRuntime!: RenderFrameRuntime;

function initPostFx(): void {
  postFx = createPostFxService({
    createShaderModuleChecked,
    device,
    renderSampleCount,
  });
  postFx.init();
}

function ensureHdrTargets(width: number, height: number): void {
  postFx.ensureHdrTargets(width, height);
}

function getCurrentSceneView(): GPUTextureView {
  return postFx.getCurrentSceneView();
}

function getColorAttachment(
  simDepthRef: DepthRef,
  resolveTarget: GPUTextureView,
  viewport: number[] | null,
): GPURenderPassColorAttachment {
  return postFx.getColorAttachment(simDepthRef, resolveTarget, viewport, state.fx.trailPersistence, catalogDefaultClearColor);
}

function getDepthAttachment(simDepthRef: DepthRef, viewport: number[] | null): GPURenderPassDepthStencilAttachment {
  return postFx.getDepthAttachment(simDepthRef, viewport, xrRuntime?.getDepthOverride() ?? null);
}

function getRenderViewport(viewport: number[] | null): number[] | null {
  return viewport;
}

function destroyDepthRef(_depthRef: DepthRef) {
  // Depth and color targets are now shared/global; nothing per-sim to destroy.
}

function getCameraUniformData(aspect: number) {
  return cameraSystem.getUniformData(aspect, getThemeColors(), state.mouse);
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: WEBGPU INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

let device!: GPUDevice;
let canvas!: HTMLCanvasElement;
let context!: GPUCanvasContext;
let canvasFormat!: GPUTextureFormat;
let renderTargetFormat!: GPUTextureFormat;
let renderSampleCount = 1;
const gpuTiming = createGpuTimingService();

async function initWebGPU(): Promise<boolean> {
  const fallbackEl = document.getElementById('fallback')!;
  const showFallback = (msg: string): void => {
    fallbackEl.querySelector('p')!.textContent = msg;
    fallbackEl.classList.add('visible');
  };

  if (!navigator.gpu) {
    showFallback('navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.');
    return false;
  }

  let adapter;
  try {
    adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance', xrCompatible: true });
  } catch (e) {
    showFallback(`requestAdapter() failed: ${(e as Error).message}`);
    return false;
  }
  if (!adapter) {
    showFallback('requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.');
    return false;
  }

  try {
    const wantFeatures: GPUFeatureName[] = [];
    if (adapter.features.has('timestamp-query')) wantFeatures.push('timestamp-query');
    device = await adapter.requestDevice({ requiredFeatures: wantFeatures });
  } catch (e) {
    showFallback(`requestDevice() failed: ${(e as Error).message}`);
    return false;
  }

  gpuTiming.init(device);

  device.lost.then((info) => {
    logError('webgpu:device-lost', new Error(info.message), `reason=${info.reason}`);
    if (info.reason !== 'destroyed') {
      initWebGPU().then(ok => { if (ok) { initGrid(); ensureSimulation(); renderFrameRuntime.requestFrame(); } });
    }
  });

  // Capture validation errors from any async GPU operation. Phase attribution
  // (via currentGpuPhase) tells us which operation was in flight when this
  // fired — critical for diagnosing XR frame failures where the validation
  // error arrives long after the offending encode call returned.
  device.onuncapturederror = (ev: GPUUncapturedErrorEvent) => {
    logError('webgpu:uncaptured', ev.error);
  };

  canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;
  context = canvas.getContext('webgpu') as GPUCanvasContext;
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  // [LAW:one-source-of-truth] Sims always render into HDR offscreen; the swapchain is only the final composite target.
  renderTargetFormat = 'rgba16float';
  renderSampleCount = 1; // MSAA dropped — bloom + HDR replace it.
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });
  cameraSystem = createCameraSystem(state.camera);
  attractorSystem = createAttractorSystem({
    getCurrentPhysicsStep: () => {
      const sim = simulations['physics'];
      return isPhysicsSimulation(sim) ? sim.getSimStep() : 0;
    },
    getCurrentTimeDirection: () => {
      const sim = simulations['physics'];
      return isPhysicsSimulation(sim) ? sim.getTimeDirection() : 1;
    },
    getThemeColors,
    state,
  });
  pointerSystem = createPointerSystem({
    fluidWorldSize: FLUID_WORLD_SIZE,
    getCanvas: () => canvas,
    onCreateAttractor: createAttractor,
    onMoveAttractor: moveAttractor,
    onReleaseAttractor: releaseAttractor,
    state,
  });
  mobileInput = createMobileInput({
    actions: appActions,
    applySimulationInteraction: (pointerId, mx, my, isMove) => pointerSystem.applySimulationInteraction(pointerId, mx, my, isMove),
    getCanvas: () => canvas,
    modeTabLabels: catalogModeTabLabels,
    releasePointerInteraction: (pointerId) => pointerSystem.releasePointerInteraction(pointerId),
    setSimulationInteractionInactive,
    state,
    storageKey,
  });
  debugPanel = createDebugPanel({
    canvas,
    getPhysicsSimulation: () => {
      const sim = simulations['physics'];
      return isPhysicsSimulation(sim) ? sim : null;
    },
    state,
    syncPauseButtons,
  });
  shaderPanel = createShaderPanel({
    applyShaderEdit,
    createShaderModule: (code) => device.createShaderModule({ code }),
    getShaderSources,
    resetShaderEdit: resetCatalogShaderEdit,
    state,
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
  initPostFx();
  renderFrameRuntime = createRenderFrameRuntime({
    currentSimStep,
    currentTimeDirection,
    getCanvas: () => canvas,
    getCanvasContainer: () => document.getElementById('canvas-container')!,
    getCanvasFormat: () => canvasFormat,
    getContext: () => context,
    getCurrentSimulation: () => simulations[state.mode],
    getDefaultClearColor: () => catalogDefaultClearColor,
    getDevice: () => device,
    getPostFx: () => postFx,
    getThemeColors,
    gpuTiming,
    pruneAttractors,
    refreshThemeColors,
    runDebugCompute,
    showSimError,
    state,
    tickMarkers,
    updateAdaptiveChunk,
    updateDebugPanel,
    dropSimulationIfCurrent,
  });

  return true;
}

function syncRenderConfig(_nextFormat: GPUTextureFormat, _nextSampleCount: number) {
  // [LAW:one-source-of-truth] All sims always render into HDR (rgba16float). Composite output format
  // is handled per-call by ensureCompositePipeline(); this function no longer needs to rebuild anything.
  postFx.markNeedsClear();
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
    device,
    getCameraUniformData,
    renderSampleCount,
    renderTargetFormat,
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

function initializeSimulationRegistry(): void {
  simulationRegistry = createSimulationRegistry({
    device,
    factories: {
      boids: createBoidsSimulation,
      physics: createPhysicsSimulation,
      physics_classic: createPhysicsClassicSimulation,
      fluid: createFluidSimulation,
      parametric: createParametricSimulation,
      reaction: createReactionSimulation,
    },
    reportError: (mode, message) => {
      showSimError(mode, message);
      delete simulations[mode];
    },
  });
}

// --- 5a: BOIDS ---

function createBoidsSimulation() {
  // [LAW:locality-or-seam] Boids now owns its own pipelines and buffers in
  // simulations/boids.ts; runtime only supplies shared rendering capabilities.
  return createBoidsSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
}

// --- 5b: N-BODY PHYSICS ---

// [LAW:single-enforcer] Canonical multigrid V-cycle dispatcher used by every
// PM grid (inner, outer, future gas-coupled grid). Encapsulates the full
// descent → coarsest → ascent shape:
//   1. Clear coarse-level potentials (levels 1..maxLevel). Level 0 keeps
//      previous-frame warm-start so the solver converges in 1 cycle.
//   2. Descent (l = 0..maxLevel-1): pre-smooth, residual, restrict.
//   3. Coarsest level (l = maxLevel): over-smooth toward exact solve.
//   4. Ascent (l = maxLevel-1..0): prolong correction + post-smooth.
//
function createPhysicsSimulation() {
  // [LAW:locality-or-seam] Physics now owns its assembly in
  // simulations/physics/index.ts; runtime only supplies shared capabilities.
  return createPhysicsSimulationModule({
    attractorMax: ATTRACTOR_MAX,
    baseDt: PHYSICS_BASE_DT,
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    clearColor: catalogDefaultClearColor,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getAttractorStrength: attractorStrength,
    getCameraUniformData,
    getColorAttachment,
    getCurrentSceneView,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    getXrDepthOverride: () => xrRuntime?.getDepthOverride() ?? null,
    markersPerAttractor: MARKERS_PER_ATTRACTOR,
    nullColorView: postFx.getNullColorView(),
    nullDepthView: postFx.getNullDepthView(),
    postFxDepthView: () => postFx.getDepthView(),
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
    tsWrites,
  });
}

// --- 5b': N-BODY CLASSIC ---
// Faithful recreation of the original n-body shader for A/B comparison.
// 32-byte Body struct, 48-byte Params (no disk recovery, no reduction, no home anchors).
// Renders into the shared HDR scene like every other sim, so bloom/tonemap still apply.

function createPhysicsClassicSimulation(): Simulation {
  return createPhysicsClassicSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
}

// --- 5c: FLUID DYNAMICS ---

function createFluidSimulation() {
  return createFluidSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    fluidGridResolution: FLUID_GRID_RES,
    fluidWorldSize: FLUID_WORLD_SIZE,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
}

// --- 5d: PARAMETRIC SHAPES ---

function createParametricSimulation() {
  return createParametricSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    shapeIds: catalogShapeIds,
    state,
  });
}


// --- 5e: REACTION-DIFFUSION (Gray-Scott, 3D) ---

function createReactionSimulation() {
  return createReactionSimulationModule({
    cameraSize: CAMERA_SIZE,
    cameraStride: CAMERA_STRIDE,
    createShaderModuleChecked,
    destroyDepthRef,
    device,
    getCameraUniformData,
    getColorAttachment,
    getDefaultAspect: () => canvas.width / canvas.height,
    getDepthAttachment,
    getRenderViewport,
    renderGrid,
    renderSampleCount,
    renderTargetFormat,
    state,
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: UI & CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

function buildControls() {
  getControlsApi().buildControls();
}

function setupTabs() {
  getControlsApi().setupTabs();
}

// [LAW:single-enforcer] Pause-button text/active-state is reflected in exactly one place so the
// desktop button, mobile FAB, and any programmatic pause (breakpoint, skip completion) all agree.
function syncPauseButtons() {
  getControlsApi().syncPauseButtons();
}

function setupGlobalControls() {
  getControlsApi().setupGlobalControls();
}

// One-click XR record button: enter XR and begin an unbounded recording;
// the recording terminates when the XR session ends (user exits). Samples
// publish to console + window.__xrLastRecording on stop.
function setupRecordButton(): void {
  const btn = document.getElementById('btn-xr-record') as HTMLButtonElement | null;
  if (!btn) return;
  const idleLabel = 'Record XR Session';
  const tick = () => {
    const s = metrics.status();
    const session = xrRuntime?.getSession() ?? null;
    if (s.phase === 'idle') {
      btn.textContent = idleLabel;
      btn.disabled = !!session;  // also disabled while XR session alive
      return;
    }
    btn.textContent = 'Recording — exit XR to stop';
    btn.disabled = true;
    requestAnimationFrame(tick);
  };
  btn.addEventListener('click', async () => {
    if (metrics.status().phase !== 'idle' || xrRuntime?.getSession()) return;
    // Start the recording before the session so we capture session-setup
    // signals too. Producers are dormant until xrInputStep runs, so no
    // samples actually arrive until the first XR frame — this just ensures
    // subscribers are live when they do.
    metrics.record({}).then((samples) => {
      // Full sample array on window for programmatic inspection. Console only
      // shows edge events (gestures + state transitions) to avoid 90 Hz × 2-hand
      // snap spam. To walk snaps yourself: __xrLastRecording.filter(s => s.channel === 'xr.snap').
      (window as unknown as { __xrLastRecording?: MetricSample[] }).__xrLastRecording = samples;
      const counts: Record<string, number> = {};
      for (const s of samples) counts[s.channel] = (counts[s.channel] ?? 0) + 1;
      const summary = Object.entries(counts).map(([c, n]) => `${c}: ${n}`).join(', ');
      // eslint-disable-next-line no-console
      console.group(`[xr] recording — ${samples.length} samples (${summary})`);
      for (const s of samples) {
        if (s.channel === 'xr.snap') continue;  // bulk data; inspect via __xrLastRecording
        // pinch-hold fires every frame during a pinch — also bulk; skip from console.
        if (s.channel === 'xr.gesture'
          && (s.payload as XrGestureEvent).gesture.kind === 'pinch-hold') continue;
        // Inline kind/transition into the prefix so Safari doesn't collapse nested
        // objects to "Object" — the string prefix always prints fully.
        let label = s.channel;
        if (s.channel === 'xr.gesture') {
          const p = s.payload as XrGestureEvent;
          label = `xr.gesture:${p.gesture.kind}${p.hand ? `(${p.hand})` : ''}`;
        } else if (s.channel === 'xr.state') {
          const p = s.payload as XrStateEvent;
          label = `xr.state:${p.hand} ${p.from}→${p.to}`;
        }
        // eslint-disable-next-line no-console
        console.log(`[t=${s.t.toFixed(0).padStart(5)}ms] ${label}`, s.payload);
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    });
    requestAnimationFrame(tick);
    await toggleXR();
    const session = xrRuntime?.getSession() ?? null;
    if (!session) {
      // Session failed to start — end the recording with whatever we have.
      metrics.stop();
      return;
    }
    // [LAW:single-enforcer] Our listener only calls metrics.stop(); the
    // existing session-end handler in toggleXR owns the XR-side cleanup.
    session.addEventListener('end', () => metrics.stop(), { once: true });
  });
}

// [LAW:single-enforcer] Time-reverse input is owned here. Desktop: hold R. Mobile: hold rewind FAB.
// The physics sim's setTimeDirection() is the single channel for changing direction.
function setupTimeReverseControls() {
  const setReverse = (active: boolean) => {
    const sim = simulations[state.mode];
    if (!isPhysicsSimulation(sim)) return;
    sim.setTimeDirection(active ? -1 : 1);
    // Unblock pause if we were auto-paused at the journal boundary.
    if (!active && state.paused) state.paused = false;
  };

  // Desktop: hold R key to rewind.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      if (e.repeat) return;
      // Don't capture R when typing in an input or the shader editor.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setReverse(true);
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'r' || e.key === 'R') setReverse(false);
  });

  // Mobile: hold rewind FAB.
  const fabRewind = document.getElementById('fab-rewind');
  if (fabRewind) {
    fabRewind.addEventListener('pointerdown', () => setReverse(true));
    fabRewind.addEventListener('pointerup', () => setReverse(false));
    fabRewind.addEventListener('pointercancel', () => setReverse(false));
    fabRewind.addEventListener('pointerleave', () => setReverse(false));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBUG / TIME CONTROL
// ═══════════════════════════════════════════════════════════════════════════════
// [LAW:one-source-of-truth] Debug state drives three behaviors that would otherwise diverge:
// manual step (discrete advance), skip-to-step (bounded seek), and breakpoint (auto-pause at step).
// All three funnel through runDebugCompute() in the frame loop so the frame-level gating stays uniform.

let debugPanel!: DebugPanel;

function updateAdaptiveChunk(frameDeltaMs: number): void {
  debugPanel.updateAdaptiveChunk(frameDeltaMs);
}

function cancelDebugMovement(): void {
  debugPanel.cancelMovement();
}

function runDebugCompute(sim: Simulation, encoder: GPUCommandEncoder): void {
  debugPanel.runCompute(sim, encoder);
}

function setupDebugControls() {
  debugPanel.setupControls();
}

function updateDebugPanel(): void {
  debugPanel.updatePanel();
}

function buildThemeSelector() {
  themeSystem.buildThemeSelector();
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: PROMPT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function updatePrompt() {
  renderPrompt(state, catalogDefaults, modeParams);
}

let shaderPanel!: ShaderPanel;

function getControlsApi(): ControlsApi {
  if (!controlsApi) {
    controlsApi = createControls({
      actions: appActions,
      config: {
        fxParamDefs: catalogFxParamDefs,
        modeTabLabels: catalogModeTabLabels,
        paramDefs: catalogParamDefs,
        presets: catalogPresets,
        shapeParams: catalogShapeParams,
      },
      modeParams,
      setXrDebugLogging,
      setupRecordButton,
      setupXRButton,
      state,
      storageKey,
      syncThemeButtons,
    });
  }
  return controlsApi;
}
// Maps simulation mode → named shader sources
function getShaderSources(mode: SimMode): Record<string, string> {
  if (mode === 'physics') {
    return { ...getCatalogShaderSources(mode), ...GAS_SHADER_SOURCES };
  }
  return getCatalogShaderSources(mode);
}

function setupShaderPanel() {
  shaderPanel.setup();
}

function updateShaderPanel() {
  shaderPanel.update();
}

// Apply edited shader code to the appropriate global variable
function applyShaderEdit(mode: SimMode, tabName: string, code: string) {
  applyCatalogShaderEdit(mode, tabName, code);
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS BUS
// ═══════════════════════════════════════════════════════════════════════════════
// Typed pub/sub channels with first-class burst-capture recording. Producers
// guard emit with `chan.subscribers.size > 0` for zero-cost-when-idle — no
// payload is constructed when nobody is listening. All consumers (console
// loggers, HUDs, the burst recorder) subscribe the same way; adding a new
// consumer is free at producer sites. [LAW:one-source-of-truth] One registry
// of channels and one recorder state.

interface MetricChannel<T> {
  readonly name: string;
  readonly subscribers: Set<(payload: T) => void>;
}
interface MetricSample {
  t: number;             // ms since recording-window start (pre-delay is invisible)
  channel: string;
  payload: unknown;
}
type RecordPhase = 'idle' | 'pre-delay' | 'recording';
interface RecordOptions {
  preDelayMs?: number;   // default 0: skip pre-delay, go straight to recording
  durationMs?: number;   // omit = unbounded; caller must call metrics.stop()
  channels?: MetricChannel<unknown>[];  // omit = all registered channels
}
interface RecordStatus {
  phase: RecordPhase;
  remainingMs: number;   // 0 when unbounded or idle
  bounded: boolean;      // false for open-ended sessions (no durationMs)
}

const metricsChannels = new Map<string, MetricChannel<unknown>>();
const metricsRecord = {
  phase: 'idle' as RecordPhase,
  phaseDeadline: 0,       // 0 when unbounded or idle
  bounded: false,
  samples: [] as MetricSample[],
  startedAt: 0,
  unsubs: [] as Array<() => void>,
  preDelayTimer: null as ReturnType<typeof setTimeout> | null,
  stopTimer: null as ReturnType<typeof setTimeout> | null,
  resolve: null as ((samples: MetricSample[]) => void) | null,
};

const metrics = {
  channel<T>(name: string): MetricChannel<T> {
    const existing = metricsChannels.get(name);
    if (existing) return existing as MetricChannel<T>;
    const chan: MetricChannel<T> = { name, subscribers: new Set() };
    metricsChannels.set(name, chan as unknown as MetricChannel<unknown>);
    return chan;
  },
  subscribe<T>(chan: MetricChannel<T>, fn: (p: T) => void): () => void {
    chan.subscribers.add(fn);
    return () => { chan.subscribers.delete(fn); };
  },
  emit<T>(chan: MetricChannel<T>, payload: T): void {
    for (const fn of chan.subscribers) fn(payload);
  },
  // Begin a recording. Returns a Promise that resolves with the collected
  // samples when the recording ends — either via the duration timer (bounded)
  // or via metrics.stop() (unbounded).
  record(opts: RecordOptions): Promise<MetricSample[]> {
    if (metricsRecord.phase !== 'idle') {
      return Promise.reject(new Error('metrics.record: recording already in progress'));
    }
    const preDelayMs = opts.preDelayMs ?? 0;
    metricsRecord.samples = [];
    metricsRecord.bounded = opts.durationMs !== undefined;
    return new Promise<MetricSample[]>((resolve) => {
      metricsRecord.resolve = resolve;
      const begin = () => {
        const targets = opts.channels ?? Array.from(metricsChannels.values());
        metricsRecord.startedAt = performance.now();
        metricsRecord.phase = 'recording';
        metricsRecord.phaseDeadline = opts.durationMs !== undefined
          ? metricsRecord.startedAt + opts.durationMs
          : 0;
        metricsRecord.preDelayTimer = null;
        for (const chan of targets) {
          const chanName = chan.name;
          metricsRecord.unsubs.push(metrics.subscribe(chan, (payload) => {
            metricsRecord.samples.push({
              t: performance.now() - metricsRecord.startedAt,
              channel: chanName,
              payload,
            });
          }));
        }
        if (opts.durationMs !== undefined) {
          metricsRecord.stopTimer = setTimeout(() => metrics.stop(), opts.durationMs);
        }
      };
      if (preDelayMs > 0) {
        metricsRecord.phase = 'pre-delay';
        metricsRecord.phaseDeadline = performance.now() + preDelayMs;
        metricsRecord.preDelayTimer = setTimeout(begin, preDelayMs);
      } else {
        begin();
      }
    });
  },
  // End the current recording (bounded or unbounded). Cancels any pending
  // timers, unsubscribes, resolves the promise with the collected samples.
  // No-op when idle. [LAW:single-enforcer] Sole cleanup path for recordings.
  stop(): void {
    if (metricsRecord.phase === 'idle') return;
    if (metricsRecord.preDelayTimer) {
      clearTimeout(metricsRecord.preDelayTimer);
      metricsRecord.preDelayTimer = null;
    }
    if (metricsRecord.stopTimer) {
      clearTimeout(metricsRecord.stopTimer);
      metricsRecord.stopTimer = null;
    }
    for (const u of metricsRecord.unsubs) u();
    metricsRecord.unsubs = [];
    const samples = metricsRecord.samples;
    metricsRecord.samples = [];
    metricsRecord.phase = 'idle';
    metricsRecord.phaseDeadline = 0;
    metricsRecord.bounded = false;
    const res = metricsRecord.resolve;
    metricsRecord.resolve = null;
    if (res) res(samples);
  },
  status(): RecordStatus {
    if (metricsRecord.phase === 'idle') return { phase: 'idle', remainingMs: 0, bounded: false };
    return {
      phase: metricsRecord.phase,
      remainingMs: metricsRecord.phaseDeadline === 0
        ? 0
        : Math.max(0, metricsRecord.phaseDeadline - performance.now()),
      bounded: metricsRecord.bounded,
    };
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: WEBXR INPUT PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

function setXrDebugLogging(on: boolean): void {
  xrInputSystem.setDebugLogging(on);
}
function setupXRButton() {
  const btn = document.getElementById('btn-xr') as HTMLButtonElement;

  if (!navigator.xr) {
    btn.textContent = 'VR Not Available';
    return;
  }

  navigator.xr.isSessionSupported('immersive-vr').then((supported: boolean) => {
    if (supported) {
      btn.disabled = false;
      btn.addEventListener('click', toggleXR);
    } else {
      btn.textContent = 'VR Not Supported';
    }
  }).catch(() => { btn.textContent = 'VR Check Failed'; });
}

async function toggleXR() {
  await xrRuntime?.toggle();
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: RENDER LOOP & ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

function tsWrites(bucket: GpuTimingBucket) {
  return renderFrameRuntime.tsWrites(bucket);
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
  renderFrameRuntime.updateStats();
}

function resizeCanvas() {
  renderFrameRuntime.resize();
}

function runBloomChain(encoder: GPUCommandEncoder, timingBucket?: GpuTimingBucket) {
  renderFrameRuntime.runBloomChain(encoder, timingBucket);
}

function runComposite(
  encoder: GPUCommandEncoder,
  finalView: GPUTextureView,
  finalFormat: GPUTextureFormat,
  viewport: number[] | null = null,
  timingBucket?: GpuTimingBucket
) {
  renderFrameRuntime.runComposite(encoder, finalView, finalFormat, viewport, timingBucket);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: STATE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

function saveState() {
  persistState(state, catalogDefaults, modeParams);
}

function loadState() {
  hydrateState(state, catalogDefaults, catalogColorThemes, modeParams, syncThemeTransition);
}

function syncUIFromState() {
  getControlsApi().syncUiFromState();
}

appActions = createAppActions({
  cancelDebugMovement,
  ensureSimulation,
  modeParams,
  presets: catalogPresets,
  reflectPaused: syncPauseButtons,
  resetCurrentSimulationInternal: resetCurrentSim,
  saveStateInternal: saveState,
  // [LAW:single-enforcer] Theme selection enters the runtime through one
  // action path so persistence, prompt updates, and theme transitions stay coupled.
  selectTheme: (themeName) => themeSystem.selectTheme(themeName),
  state,
  syncUi: syncUIFromState,
  updatePrompt,
  updateShaderPanel,
  updateStats,
});

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
  const ok = await initWebGPU();
  if (!ok) return;
  initializeSimulationRegistry();
  xrRuntime = createXrRuntime({
    cameraStride: CAMERA_STRIDE,
    cameraSystem,
    canvasFormat: () => canvasFormat,
    currentSimStep,
    currentTimeDirection,
    device,
    ensureHdrTargets,
    getCameraUniformData,
    getCurrentPhase: () => currentGpuPhase,
    getCurrentSimulation: () => simulations[state.mode],
    getPostFxSceneFormat: (index) => postFx.getSceneFormat(index),
    getPostFxSceneIndex: () => postFx.getSceneIndex(),
    getPostFxSceneView: (index) => postFx.getSceneView(index),
    getRefSpace: () => xrInputSystem.getRefSpace(),
    getUiRenderList: () => xrInputSystem.getRenderList(),
    initializeReferenceSpace: (refSpace, gotFloor) => xrInputSystem.initializeReferenceSpace(refSpace, gotFloor),
    inputStep: (frame) => xrInputSystem.inputStep(frame),
    logError,
    logInfo,
    markPostFxNeedsClear: () => postFx.markNeedsClear(),
    onSelectEnd: (source) => xrInputSystem.onSelectEnd(source),
    postFxRunBloomChain: runBloomChain,
    postFxRunComposite: runComposite,
    pruneAttractors,
    queuePendingSource: (source) => { xrInputSystem.queuePendingSource(source); },
    refreshThemeColors,
    requestDesktopFrame: () => renderFrameRuntime.requestFrame(),
    resetInputState: () => xrInputSystem.reset(),
    clearReferenceSpace: () => xrInputSystem.clearReferenceSpace(),
    setCurrentPhase: (phase) => { currentGpuPhase = phase; },
    setHandTrackingAvailable: () => {},
    state,
    syncRenderConfig,
    tickFrameStats: (time) => renderFrameRuntime.tickFrameStats(time),
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
  syncThemeTransition(state.colorTheme);
  initBindings();
  buildControls();
  buildThemeSelector();
  setupTabs();
  setupGlobalControls();
  if (isMobile) {
    setupMobileTouchControls();
    setupMobileFab();
    setupBottomSheet();
  } else {
    setupMouseControls();
  }
  setupShaderPanel();
  setupTimeReverseControls();
  setupDebugControls();
  syncUIFromState();
  resizeCanvas();
  ensureSimulation();
  appActions.updateAll();
  renderFrameRuntime.start();
  installDevtools({
    state,
    getCurrentSimulation: () => simulations[state.mode],
    getGpuStats: () => renderFrameRuntime.getGpuStats(),
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

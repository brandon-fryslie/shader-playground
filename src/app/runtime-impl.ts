import '../../styles/main.css';
import type { SimMode, Simulation, AppState, RGBThemeColors, DepthRef } from '../types';
import { bindingRegistry } from '../xr-ui/bindings';
import { evaluateAnchor } from '../xr-ui/anchors';
import { layout as xrUiLayout, hitTestWidgets } from '../xr-ui/layout';
import {
  xrUiStep, applySideEffects as xrUiApplyEffects, makeIdlePrev as xrUiMakeIdlePrev,
  uiHandClaimed, type XrUiPrev, type XrUiRegistry, type RenderCommand as XrRenderCommand,
} from '../xr-ui/step';
import { GAS_SHADER_SOURCES } from '../gasReservoir';
import { DEFAULTS as catalogDefaults, PRESETS as catalogPresets, PARAM_DEFS as catalogParamDefs, COLOR_THEMES as catalogColorThemes, DEFAULT_THEME as catalogDefaultTheme, THEME_FADE_MS as catalogThemeFadeMs, DEFAULT_CLEAR_COLOR as catalogDefaultClearColor, SHAPE_IDS as catalogShapeIds, SHAPE_PARAMS as catalogShapeParams, FX_PARAM_DEFS as catalogFxParamDefs, MODE_TAB_LABELS as catalogModeTabLabels } from './catalog';
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
import { createGpuTimingService, type GpuTimingBucket, type TimestampWrites } from '../gpu/timestamps';
import { installDevtools } from '../diagnostics/devtools';
import { createDiagnosticsLogger } from '../diagnostics/logging';
import { cross3, dot3, normalize3, sub3 } from '../math/vec3';
import { createAttractorSystem, type AttractorSystem, ATTRACTOR_MAX, MARKERS_PER_ATTRACTOR, PHYSICS_BASE_DT } from '../input/attractors';
import { createPointerSystem, type PointerSystem } from '../input/pointer';
import { createMobileInput, type MobileInput } from '../input/mobile';
import { createCameraSystem, type CameraSystem } from '../render/camera';
import { createFrameStatsService } from '../render/frame-stats';
import { createGridRenderer, type GridRenderer } from '../render/grid';
import { createPostFxService, type PostFxService } from '../render/post-fx';
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

const themeSystem = createThemeSystem({
  // [LAW:one-source-of-truth] Theme metadata and transition ownership live in
  // app/catalog.ts and ui/theme.ts; the runtime consumes that service.
  defaultTheme: catalogDefaultTheme,
  fadeMs: catalogThemeFadeMs,
  onThemeSelected: () => updateAll(),
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
      initWebGPU().then(ok => { if (ok) { initGrid(); ensureSimulation(); requestAnimationFrame(frame); } });
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
    applySimulationInteraction: (pointerId, mx, my, isMove) => pointerSystem.applySimulationInteraction(pointerId, mx, my, isMove),
    cancelDebugMovement,
    getCanvas: () => canvas,
    modeTabLabels: catalogModeTabLabels,
    releasePointerInteraction: (pointerId) => pointerSystem.releasePointerInteraction(pointerId),
    resetCurrentSimulation: resetCurrentSim,
    selectMode,
    setSimulationInteractionInactive,
    state,
    storageKey,
    syncPauseButtons,
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
  initPostFx();

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

function applyPreset(mode: SimMode, presetName: string) {
  getControlsApi().applyPreset(mode, presetName);
}

function selectMode(mode: SimMode): void {
  getControlsApi().selectMode(mode);
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

function updateAll() {
  updatePrompt();
  updateStats();
  updateShaderPanel();
  saveState();
}

let controlsApi: ControlsApi | null = null;

function getControlsApi(): ControlsApi {
  if (!controlsApi) {
    controlsApi = createControls({
      cancelDebugMovement,
      config: {
        fxParamDefs: catalogFxParamDefs,
        modeTabLabels: catalogModeTabLabels,
        paramDefs: catalogParamDefs,
        presets: catalogPresets,
        shapeParams: catalogShapeParams,
      },
      ensureSimulation,
      modeParams,
      resetCurrentSimulation: resetCurrentSim,
      saveState,
      setXrDebugLogging,
      setupRecordButton,
      setupXRButton,
      state,
      storageKey,
      syncThemeButtons,
      updateAll,
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

let xrRefSpace: XRReferenceSpace | null = null;
let xrBaseRefSpace: XRReferenceSpace | null = null; // pre-gesture reference space

// ═══════════════════════════════════════════════════════════════════════════════
// XR INPUT PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════
// Architecture from design-docs/XR-UX-PROPOSALS.md:
//   raw XR inputs → HandFrame[] → Gesture[] → InteractionState transitions → side effects
//
// [LAW:one-source-of-truth] All XR input flows through this pipeline.
// selectstart/selectend produce raw pinch events.
// Each frame: update HandFrames → detect Gestures → transition InteractionStates → apply effects.

// ─── TYPES ───────────────────────────────────────────────────────────────────

type XrHand = 'left' | 'right';
interface XrRay { origin: number[]; dir: number[] }

// Per-hand, per-frame snapshot. Core of the input pipeline.
// Joints/palmNormal/grip are stubs — populated when hand-tracking feature lands.
interface XrHandFrame {
  hand: XrHand;
  tracked: boolean;
  source: XRInputSource | null;  // the XR input source for this hand (null when idle)
  pinch: {
    active: boolean;
    startTime: number;          // performance.now() at pinch-start
    origin: number[];           // hand position at pinch-start
    current: number[];          // current hand position
  };
  // Gaze-seeded ray: frozen at pinch-start, authoritative for SELECTION.
  gazeRay: XrRay | null;
  // Hand-steered ray: updated each frame during pinch. Drives drag/scrub.
  currentRay: XrRay | null;
  // Advisory hover laser ray. Synthesized from joints every frame when
  // tracked. NEVER used for selection — that is gazeRay at pinch-start.
  ray: XrRay | null;
  // Hand-tracking data: populated each frame when the XR runtime grants
  // hand-tracking and this handedness has an input source with `.hand`.
  // joints is null ONLY when no hand data is available at all; when non-null
  // it has all 25 keys but individual entries may be null (joint occluded,
  // off-sensor, not yet converged). palmNormal and grip are derived from
  // joints and synchronized atomically by xrUpdateHandFrames.
  palmNormal: number[] | null;
  joints: XrJoints | null;
  grip: XrGripState | null;
}

// 25 hand joints per WebXR spec. Ordered canonically for readability.
const XR_JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
] as const satisfies readonly XRHandJoint[];
type XrJointName = typeof XR_JOINT_NAMES[number];

interface XrJointPose {
  position: number[];      // 3 floats, in xrRefSpace
  orientation: number[];   // 4 floats (xyzw quaternion)
  radius: number;          // meters
}

// [LAW:dataflow-not-control-flow] When non-null, the record always has all 25
// keys; individual entries are null when a joint is momentarily un-tracked.
// Consumers branch on null per-joint via data, not by skipping updates.
type XrJoints = Record<XrJointName, XrJointPose | null>;

// Thumb-tip-to-fingertip geometric contact flags. NOT authoritative for
// selection — pinch.active (from XR selectstart/selectend) is the authoritative
// pinch signal. grip.* exists to represent compound / geometric gestures that
// can't be expressed by the system-recognized pinch alone. Per-flag nullability
// so a single occluded finger-tip doesn't null unrelated flags.
interface XrGripState {
  thumbIndex:  boolean | null;
  thumbMiddle: boolean | null;
  thumbRing:   boolean | null;
  thumbPinky:  boolean | null;
}

function makeIdleHandFrame(hand: XrHand): XrHandFrame {
  return {
    hand, tracked: false, source: null,
    pinch: { active: false, startTime: 0, origin: [0, 0, 0], current: [0, 0, 0] },
    gazeRay: null, currentRay: null, ray: null,
    palmNormal: null, joints: null, grip: null,
  };
}

// Gesture events — pure data produced by the detector, consumed by the state machine.
type XrGesture =
  | { kind: 'pinch-start'; hand: XrHand; gazeRay: XrRay }
  | { kind: 'pinch-hold';  hand: XrHand; dur: number }
  | { kind: 'pinch-end';   hand: XrHand; dur: number }
  // Cooperative gestures (involve both hands):
  | { kind: 'two-hand-pinch-start' }
  | { kind: 'two-hand-pinch-end' }
  // Stubs — detected when hand-tracking joints are available:
  | { kind: 'fine-modifier-on';  hand: XrHand }
  | { kind: 'fine-modifier-off'; hand: XrHand }
  | { kind: 'palm-up';   hand: XrHand }
  | { kind: 'palm-down'; hand: XrHand }
  | { kind: 'wrist-flick'; hand: XrHand; axis: 'roll' | 'pitch' | 'yaw'; sign: 1 | -1 };

// Per-hand interaction state machine.
// [LAW:one-source-of-truth] At most one interaction per hand.
// [LAW:one-type-per-behavior] Single-hand dragging always means sim interaction.
// Widget/UI interactions will add their own variants when the new panel lands.
type XrInteraction =
  | { kind: 'idle' }
  // Pinch-start arrived but we haven't committed yet. If the other hand
  // pinch-starts before deadline, both convert to two-hand-scale (simultaneous
  // = zoom). If deadline passes alone, commit to single-hand dragging (sequential
  // = independent attractor). [LAW:dataflow-not-control-flow] The variant encodes
  // the "waiting to decide" state explicitly instead of branching on timestamps.
  | { kind: 'pending'; deadline: number }
  | { kind: 'dragging';
      handOrigin: number[];      // hand position at drag start
      hasSample: boolean;
    }
  | { kind: 'two-hand-scale' };

// ─── STATE ───────────────────────────────────────────────────────────────────

// Hand frames — updated every XR frame.
const xrHandFrames: Record<XrHand, XrHandFrame> = {
  left: makeIdleHandFrame('left'),
  right: makeIdleHandFrame('right'),
};

// Per-hand interaction state.
const xrInteractions: Record<XrHand, XrInteraction> = {
  left: { kind: 'idle' },
  right: { kind: 'idle' },
};

// Pending pinch-starts: sources added at selectstart, resolved to a hand
// on the first frame with a pose available.
const xrPendingSources: XRInputSource[] = [];

// Gesture tuning — global modifier state.
const xrTuning = {
  gainMultiplier: 1.0,  // 0.1 when fine-modifier active (future)
};

// XR-UI module state. Single source of truth for the new widget pipeline:
// - xrUiRegistry holds bindings + named layouts. Empty layouts map until ticket .13
//   registers the first panel. xrUiStep returns idle/empty in that state.
// - xrUiPrev is threaded into xrUiStep each frame and rebuilt from its result.
// - xrUiClaimed mirrors uiHandClaimed(prev.states[hand]) so xrTransitionInteractions
//   can short-circuit the pending→dragging sim promotion when UI owns the pinch.
//   [LAW:single-enforcer] xrUiStep is the only writer of this flag.
const xrUiRegistry: XrUiRegistry = {
  bindings: bindingRegistry,
  layouts: new Map(),
  activeLayoutId: null,
};
let xrUiPrev: XrUiPrev = xrUiMakeIdlePrev();
let xrUiRenderList: XrRenderCommand[] = [];
const xrUiClaimed: Record<XrHand, boolean> = { left: false, right: false };

// View offset (modified by two-hand scale).
// [LAW:one-source-of-truth] xrViewOffset is the single source for the user's
// virtual viewpoint position relative to the simulation.
const xrViewOffset = { x: 0, y: 0, z: -5 };
let xrViewOffsetY = 0;

// Two-hand scale shared state.
const twoHandState = {
  startDistance: 0,
  startOffset: { x: 0, y: 0, z: 0 },
};

// Previous frame's pinch state for edge detection (gesture events).
const xrPrevPinch: Record<XrHand, boolean> = { left: false, right: false };

// Previous-frame snapshot for joint-derived gesture detection. Parallel to
// xrPrevPinch. [LAW:one-source-of-truth] Sole previous-state store for the
// fine-modifier / palm-up / wrist-flick detectors.
interface XrGestureSnapshot {
  fineModifier: boolean;        // thumb-ring contact state last frame
  palmUp: boolean;              // palm-up state last frame (post-hysteresis)
  wristOrient: number[] | null; // wrist quaternion last frame (null when untracked)
  wristTime: number;            // performance.now() when wristOrient was captured
  flickArmed: boolean;          // last frame's angular speed above threshold
  lastFlickAt: number;          // performance.now() of last emitted flick (refractory)
}
function makeGestureSnapshot(): XrGestureSnapshot {
  return { fineModifier: false, palmUp: false, wristOrient: null, wristTime: 0, flickArmed: false, lastFlickAt: 0 };
}
const xrPrevGestureSnap: Record<XrHand, XrGestureSnapshot> = {
  left: makeGestureSnapshot(),
  right: makeGestureSnapshot(),
};

// Palm-up hysteresis on palmNormal·worldUp. Enter >0.7 (~45° of vertical),
// exit <0.4 (~65°). The dead zone absorbs frame-to-frame noise when the palm
// is held vertical.
const XR_PALM_UP_ENTER = 0.7;
const XR_PALM_UP_EXIT = 0.4;

// Wrist-flick thresholds. 4 rad/s ≈ 230°/s — a deliberate snap, not casual
// motion. 2-frame consensus (flickArmed) plus 300ms refractory suppresses
// ringing and oscillation on the flick peak.
const XR_FLICK_SPEED_RAD_S = 4.0;
const XR_FLICK_REFRACTORY_MS = 300;

// ── METRIC CHANNELS ────────────────────────────────────────────────────────────
// Declared once; producers below guard emit with `chan.subscribers.size > 0`.
// Payload shapes are typed here and flow through subscribers unchanged.
interface XrGestureEvent { hand: XrHand | null; gesture: XrGesture }
interface XrStateEvent { hand: XrHand; from: XrInteraction['kind']; to: XrInteraction['kind'] }
interface XrSnapEvent {
  hand: XrHand;
  handTracked: boolean;      // hand-tracking is producing joints this frame
  pinching: boolean;         // a pinch source is currently active (system gesture)
  palmDot: number | null;    // palmNormal · worldUp
  palmUp: boolean;
  fineModifier: boolean;
  flickSpeed: number;        // rad/s, 0 when no prior orientation
  grip: XrGripState | null;
}
const chanXrGesture = metrics.channel<XrGestureEvent>('xr.gesture');
const chanXrState   = metrics.channel<XrStateEvent>('xr.state');
const chanXrSnap    = metrics.channel<XrSnapEvent>('xr.snap');

// Live console logger — a consumer of the three XR channels. Toggled on/off
// from the UI + persisted via state.debug.xrLog. [LAW:single-enforcer] This is
// the sole wiring for console output; the XR recording feature (one-shot dump at
// session end) keeps its own independent subscription lifecycle. Snap events
// are rate-limited here so the 180 Hz raw stream doesn't flood the console —
// the producer still emits every frame, each consumer samples at its cadence.
const xrLogState = {
  unsubs: [] as Array<() => void>,
  lastSnapMs: { left: 0, right: 0 } as Record<XrHand, number>,
};
const XR_LOG_SNAP_INTERVAL_MS = 200;  // 5 Hz console cadence for snap stream

function setXrDebugLogging(on: boolean): void {
  for (const u of xrLogState.unsubs) u();
  xrLogState.unsubs.length = 0;
  xrLogState.lastSnapMs.left = 0;
  xrLogState.lastSnapMs.right = 0;
  if (!on) return;
  xrLogState.unsubs.push(metrics.subscribe(chanXrGesture, (p) => {
    if (p.gesture.kind === 'pinch-hold') return;  // per-frame noise
    const h = p.hand ? `(${p.hand})` : '';
    // eslint-disable-next-line no-console
    console.log(`[xr] gesture:${p.gesture.kind}${h}`, p.gesture);
  }));
  xrLogState.unsubs.push(metrics.subscribe(chanXrState, (p) => {
    // eslint-disable-next-line no-console
    console.log(`[xr] state:${p.hand} ${p.from}→${p.to}`);
  }));
  xrLogState.unsubs.push(metrics.subscribe(chanXrSnap, (p) => {
    const now = performance.now();
    if (now - xrLogState.lastSnapMs[p.hand] < XR_LOG_SNAP_INTERVAL_MS) return;
    xrLogState.lastSnapMs[p.hand] = now;
    const palm = p.palmDot !== null ? p.palmDot.toFixed(2) : '—';
    // eslint-disable-next-line no-console
    console.log(`[xr] snap:${p.hand} tracked=${p.handTracked} pinch=${p.pinching} palm=${palm} palmUp=${p.palmUp} fine=${p.fineModifier} flick=${p.flickSpeed.toFixed(2)}`);
  }));
}

// State-transition helper: routes every xrInteractions[hand] assignment so the
// change emits on xr.state exactly once per kind-change. Kind-identical writes
// (e.g. re-entering pending with a fresh deadline) do not emit.
function xrSetInteraction(hand: XrHand, next: XrInteraction): void {
  const prev = xrInteractions[hand];
  xrInteractions[hand] = next;
  if (chanXrState.subscribers.size > 0 && prev.kind !== next.kind) {
    metrics.emit(chanXrState, { hand, from: prev.kind, to: next.kind });
  }
}

// Synthetic pointer ids for XR attractors — one per hand so left and right
// create independent concurrent attractors. [LAW:one-source-of-truth] Each hand
// owns exactly one slot in the attractor system's pointer-id map.
const XR_ATTRACTOR_POINTER_ID: Record<XrHand, number> = { left: -1, right: -2 };

// Pinch-start simultaneity window. Two pinch-starts within this window are
// treated as "both at once" → two-hand zoom. Outside the window, sequential
// pinches each commit to their own attractor. First attractor carries this
// latency — the tradeoff for disambiguating zoom from sequential-attractor.
const XR_SIMUL_WINDOW_MS = 150;

// ─── LOW-LEVEL HELPERS ───────────────────────────────────────────────────────

function getXRTargetRayDirection(transform: XRRigidTransform) {
  const m = transform.matrix;
  return normalize3([-m[8], -m[9], -m[10]]);
}

function getXrInputRay(frame: XRFrame, source: XRInputSource): XrRay | null {
  if (!xrRefSpace) return null;
  const pose = frame.getPose(source.targetRaySpace, xrRefSpace);
  if (!pose) return null;
  const p = pose.transform.position;
  return { origin: [p.x, p.y, p.z], dir: getXRTargetRayDirection(pose.transform) };
}

function getXrHandPosition(frame: XRFrame, source: XRInputSource): number[] | null {
  if (!xrRefSpace) return null;
  const pose = frame.getPose(source.gripSpace || source.targetRaySpace, xrRefSpace);
  if (!pose) return null;
  const p = pose.transform.position;
  return [p.x, p.y, p.z];
}

// [LAW:one-source-of-truth] Source→hand assignment is decided once at resolution
// time (assignHandToSource) and then queried by identity (findHandForSource).
// Deriving it from handedness on every call collapses multiple `'none'` sources
// onto the same channel and can misroute selectend to the wrong hand.
function assignHandToSource(source: XRInputSource): XrHand | null {
  const leftFree = !xrHandFrames.left.source;
  const rightFree = !xrHandFrames.right.source;
  if (source.handedness === 'left' && leftFree) return 'left';
  if (source.handedness === 'right' && rightFree) return 'right';
  if (leftFree) return 'left';
  if (rightFree) return 'right';
  return null;
}

function findHandForSource(source: XRInputSource): XrHand | null {
  if (xrHandFrames.left.source === source) return 'left';
  if (xrHandFrames.right.source === source) return 'right';
  return null;
}

// ── HAND-TRACKING HELPERS ──────────────────────────────────────────────────────
// Thumb-tip-to-fingertip squared-distance threshold for grip.* flags. 3cm is
// the common visionOS pinch-contact heuristic; squared so we skip the sqrt.
const XR_GRIP_THRESHOLD_M = 0.03;
const XR_GRIP_THRESHOLD_SQ = XR_GRIP_THRESHOLD_M * XR_GRIP_THRESHOLD_M;

// Quaternion helpers (xyzw convention, matching XRJointPose.orientation).
function quatConj(q: number[]): number[] { return [-q[0], -q[1], -q[2], q[3]]; }
function quatMul(a: number[], b: number[]): number[] {
  return [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
  ];
}

// Always returns a fully-populated record (all 25 keys). Entries are null when
// `XRHand.get(name)` is missing or `frame.getJointPose` returns null for that
// joint. [LAW:no-defensive-null-guards] The nulls here represent data state
// ("joint not tracked right now"), not defensive guards around bugs.
function queryHandJoints(frame: XRFrame, xrHand: XRHand, refSpace: XRReferenceSpace): XrJoints {
  const joints = {} as XrJoints;
  for (const name of XR_JOINT_NAMES) {
    const space = xrHand.get(name);
    const pose = space ? frame.getJointPose(space, refSpace) : null;
    if (!pose) { joints[name] = null; continue; }
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    joints[name] = {
      position: [p.x, p.y, p.z],
      orientation: [o.x, o.y, o.z, o.w],
      radius: pose.radius,
    };
  }
  return joints;
}

// Palm normal points OUT of the palm (away from the back of the hand).
// Derived from wrist, index-finger-metacarpal, pinky-finger-metacarpal.
// Sign convention differs by handedness: the same cross-product ordering
// gives opposite normals for left vs right because the hands are mirrored.
// Null ⟺ any of the three source joints is currently untracked OR the
// metacarpals are collinear with the wrist (degenerate cross product).
function computePalmNormal(joints: XrJoints, hand: XrHand): number[] | null {
  const wrist = joints['wrist'];
  const indexMeta = joints['index-finger-metacarpal'];
  const pinkyMeta = joints['pinky-finger-metacarpal'];
  if (!wrist || !indexMeta || !pinkyMeta) return null;
  const toIndex = sub3(indexMeta.position, wrist.position);
  const toPinky = sub3(pinkyMeta.position, wrist.position);
  // Right hand: cross(toPinky, toIndex) points out of palm.
  // Left  hand: cross(toIndex, toPinky) points out of palm (mirror).
  const raw = hand === 'right' ? cross3(toPinky, toIndex) : cross3(toIndex, toPinky);
  // Reject near-collinear metacarpals: a healthy cross product has |raw|² on
  // the order of (5cm × 5cm)² ≈ 6e-6 m⁴; floor at 1e-12 catches both exact
  // zeros and the noisy unit vectors normalize3 would produce from tiny inputs.
  const lenSq = raw[0]*raw[0] + raw[1]*raw[1] + raw[2]*raw[2];
  if (lenSq < 1e-12) return null;
  return normalize3(raw);
}

// Thumb-tip-to-fingertip geometric grip flags. Outer null ⟺ thumb-tip is
// untracked (no anchor for any distance). Per-flag null ⟺ that specific
// finger-tip is untracked. A tracked finger-tip → boolean contact flag.
function computeGripState(joints: XrJoints): XrGripState | null {
  const thumb = joints['thumb-tip'];
  if (!thumb) return null;
  const flag = (tip: XrJointPose | null): boolean | null => {
    if (!tip) return null;
    const d = sub3(thumb.position, tip.position);
    return dot3(d, d) < XR_GRIP_THRESHOLD_SQ;
  };
  return {
    thumbIndex:  flag(joints['index-finger-tip']),
    thumbMiddle: flag(joints['middle-finger-tip']),
    thumbRing:   flag(joints['ring-finger-tip']),
    thumbPinky:  flag(joints['pinky-finger-tip']),
  };
}

// ── REFERENCE SPACE MANAGEMENT ─────────────────────────────────────────────────
function applyXrViewOffset(): void {
  if (!xrBaseRefSpace) return;
  type XRRigidTransformCtor = new (position: DOMPointInit, orientation?: DOMPointInit) => XRRigidTransform;
  const RigidTransform = (globalThis as unknown as { XRRigidTransform: XRRigidTransformCtor }).XRRigidTransform;
  xrRefSpace = xrBaseRefSpace.getOffsetReferenceSpace(
    new RigidTransform({ x: xrViewOffset.x, y: xrViewOffset.y + xrViewOffsetY, z: xrViewOffset.z })
  );
}

function initializeXrReferenceSpace(refSpace: XRReferenceSpace, gotFloor: boolean): void {
  // [LAW:one-source-of-truth] xrRefSpace/xrBaseRefSpace/xrViewOffset stay owned by
  // the input pipeline so gesture updates and XR session startup mutate one shared state.
  xrRefSpace = refSpace;
  xrBaseRefSpace = refSpace;
  xrViewOffsetY = gotFloor ? 1.6 : 0;
  xrViewOffset.x = 0;
  xrViewOffset.y = 0;
  xrViewOffset.z = -5;
  applyXrViewOffset();
}

function clearXrReferenceSpace(): void {
  xrRefSpace = null;
  xrBaseRefSpace = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 1: UPDATE HAND FRAMES
// ═══════════════════════════════════════════════════════════════════════════════
// Resolve pending sources, update rays and positions for active pinches.

function xrUpdateHandFrames(frame: XRFrame): void {
  // Resolve pending sources: get their first ray and assign to a hand.
  for (let i = xrPendingSources.length - 1; i >= 0; i--) {
    const source = xrPendingSources[i];
    const ray = getXrInputRay(frame, source);
    if (!ray) continue; // no pose yet — keep pending
    xrPendingSources.splice(i, 1);

    // [LAW:one-source-of-truth] Identity-based channel assignment. Drops source
    // if both channels occupied — WebXR spec permits more than two input sources
    // but we only track left/right.
    const hand = assignHandToSource(source);
    if (!hand) continue;
    const pos = getXrHandPosition(frame, source) ?? ray.origin;
    const hf = xrHandFrames[hand];
    hf.tracked = true;
    hf.source = source;
    hf.pinch.active = true;
    hf.pinch.startTime = performance.now();
    hf.pinch.origin = pos;
    hf.pinch.current = pos;
    // [LAW:one-source-of-truth] gazeRay frozen at pinch-start — authoritative for selection.
    hf.gazeRay = { origin: [...ray.origin], dir: [...ray.dir] };
    hf.currentRay = ray;
  }

  // Update current ray and position for all active hands.
  for (const hand of ['left', 'right'] as XrHand[]) {
    const hf = xrHandFrames[hand];
    if (!hf.pinch.active || !hf.source) continue;
    const ray = getXrInputRay(frame, hf.source);
    if (ray) hf.currentRay = ray;
    const pos = getXrHandPosition(frame, hf.source);
    if (pos) hf.pinch.current = pos;
  }

  // Hand-tracking update. Independent of pinch state — a visible, non-pinching
  // hand still produces joint poses. Clear-then-populate: the clear guarantees
  // that when a hand disappears from inputSources, its joint fields become null
  // on the next frame, so stale data can't linger. [LAW:one-source-of-truth]
  // xrHandFrames[hand].joints is the sole store of per-frame joint data;
  // palmNormal and grip are derived here and written atomically with joints.
  for (const hand of ['left', 'right'] as XrHand[]) {
    const hf = xrHandFrames[hand];
    hf.joints = null;
    hf.palmNormal = null;
    hf.grip = null;
    hf.ray = null;
  }
  if (xrRefSpace) {
    for (const source of frame.session.inputSources) {
      // 'none' handedness (e.g. transient gaze input) has no left/right slot.
      // !source.hand means the runtime didn't expose hand tracking for this
      // source — the per-source data itself tells us to skip, no need to
      // consult the session-level xrHandTrackingAvailable flag.
      if (source.handedness === 'none' || !source.hand) continue;
      const hand: XrHand = source.handedness;
      const hf = xrHandFrames[hand];
      const joints = queryHandJoints(frame, source.hand, xrRefSpace);
      hf.joints = joints;
      hf.palmNormal = computePalmNormal(joints, hand);
      hf.grip = computeGripState(joints);
      // [LAW:one-source-of-truth] Advisory hover ray — synthesized always when
      // the two source joints are present. NEVER drives selection (that's
      // gazeRay) and NEVER drives drag (that's currentRay).
      hf.ray = computeAdvisoryRay(joints);
    }
  }
}

// Advisory hand ray from joints. Origin at the index knuckle (feels natural
// in VR — ray emanates from the pointing hand, not the wrist). Direction
// along knuckle−wrist, so the ray points forward past the knuckle and
// rotates with the hand independently of index-finger curl.
function computeAdvisoryRay(joints: XrJoints): XrRay | null {
  const wrist = joints['wrist'];
  const knuckle = joints['index-finger-metacarpal'];
  if (!wrist || !knuckle) return null;
  const dir = normalize3(sub3(knuckle.position, wrist.position));
  if (dir[0] === 0 && dir[1] === 0 && dir[2] === 0) return null;
  return { origin: [...knuckle.position], dir };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 2: DETECT GESTURES
// ═══════════════════════════════════════════════════════════════════════════════
// [LAW:dataflow-not-control-flow] Pure function of current + previous hand state.
// Produces gesture events; no side effects.

function xrDetectGestures(): XrGesture[] {
  const gestures: XrGesture[] = [];
  const leftActive = xrHandFrames.left.pinch.active;
  const rightActive = xrHandFrames.right.pinch.active;
  const bothActive = leftActive && rightActive;
  const prevBoth = xrPrevPinch.left && xrPrevPinch.right;

  const now = performance.now();
  for (const hand of ['left', 'right'] as XrHand[]) {
    const hf = xrHandFrames[hand];
    const wasActive = xrPrevPinch[hand];
    const isActive = hf.pinch.active;

    if (isActive && !wasActive && hf.gazeRay) {
      gestures.push({ kind: 'pinch-start', hand, gazeRay: hf.gazeRay });
    } else if (isActive && wasActive) {
      gestures.push({ kind: 'pinch-hold', hand, dur: now - hf.pinch.startTime });
    } else if (!isActive && wasActive) {
      gestures.push({ kind: 'pinch-end', hand, dur: now - hf.pinch.startTime });
    }

    const prev = xrPrevGestureSnap[hand];

    // Fine-modifier: thumb-to-ring-finger contact edge. grip is null when the
    // thumb-tip or all finger-tips are untracked — skip detection but keep prev
    // so we don't spuriously re-fire 'off' when tracking returns.
    if (hf.grip) {
      const active = hf.grip.thumbRing === true;
      if (active && !prev.fineModifier) gestures.push({ kind: 'fine-modifier-on', hand });
      else if (!active && prev.fineModifier) gestures.push({ kind: 'fine-modifier-off', hand });
      prev.fineModifier = active;
    }

    // Palm orientation: palmNormal · worldUp. Hysteresis band ENTER>0.7, EXIT<0.4
    // prevents flicker when the palm is held near vertical.
    if (hf.palmNormal) {
      const upDot = hf.palmNormal[1];
      const isUp = prev.palmUp ? (upDot > XR_PALM_UP_EXIT) : (upDot > XR_PALM_UP_ENTER);
      if (isUp && !prev.palmUp) gestures.push({ kind: 'palm-up', hand });
      else if (!isUp && prev.palmUp) gestures.push({ kind: 'palm-down', hand });
      prev.palmUp = isUp;
    }

    // Wrist-flick: angular speed of wrist-quaternion delta. Dominant world axis
    // → roll/pitch/yaw bucket (approximation; refine to forearm basis if needed).
    // 2-frame consensus (flickArmed) + 300ms refractory suppresses ringing at
    // the flick peak and prevents a single quick motion firing twice.
    // Gated on !pinch.active — during a drag, rotational motion is a side
    // effect of positioning the attractor, not an intentional flick gesture.
    const wristQuat = hf.joints?.['wrist']?.orientation ?? null;
    let flickSpeed = 0;
    if (wristQuat && prev.wristOrient && !hf.pinch.active) {
      const dtSec = Math.max(0.001, (now - prev.wristTime) / 1000);
      const delta = quatMul(wristQuat, quatConj(prev.wristOrient));
      const w = Math.min(1, Math.abs(delta[3]));
      const angle = 2 * Math.acos(w);
      const sinHalf = Math.sqrt(Math.max(0, 1 - w * w));
      const s = delta[3] < 0 ? -1 : 1;
      const ax = sinHalf > 1e-6 ? (delta[0] * s) / sinHalf : 0;
      const ay = sinHalf > 1e-6 ? (delta[1] * s) / sinHalf : 0;
      const az = sinHalf > 1e-6 ? (delta[2] * s) / sinHalf : 0;
      flickSpeed = angle / dtSec;
      const armed = flickSpeed > XR_FLICK_SPEED_RAD_S;
      if (armed && prev.flickArmed && (now - prev.lastFlickAt) > XR_FLICK_REFRACTORY_MS) {
        const absX = Math.abs(ax), absY = Math.abs(ay), absZ = Math.abs(az);
        const axis: 'roll' | 'pitch' | 'yaw' =
          absX >= absY && absX >= absZ ? 'pitch' :
          absY >= absZ                 ? 'yaw'   :
                                         'roll';
        const comp = axis === 'pitch' ? ax : axis === 'yaw' ? ay : az;
        const sign: 1 | -1 = comp >= 0 ? 1 : -1;
        gestures.push({ kind: 'wrist-flick', hand, axis, sign });
        prev.lastFlickAt = now;
      }
      prev.flickArmed = armed;
    } else {
      prev.flickArmed = false;
    }
    prev.wristOrient = wristQuat ? [...wristQuat] : null;
    prev.wristTime = now;

    // Per-hand per-frame snapshot. Zero-cost when no subscriber — the recorder
    // (or any future HUD / chart) subscribes only while active.
    if (chanXrSnap.subscribers.size > 0) {
      metrics.emit(chanXrSnap, {
        hand,
        handTracked: hf.joints !== null,
        pinching: hf.pinch.active,
        palmDot: hf.palmNormal ? hf.palmNormal[1] : null,
        palmUp: prev.palmUp,
        fineModifier: prev.fineModifier,
        flickSpeed,
        grip: hf.grip,
      });
    }
  }

  // Two-hand cooperative gestures.
  if (bothActive && !prevBoth) {
    gestures.push({ kind: 'two-hand-pinch-start' });
  } else if (!bothActive && prevBoth) {
    gestures.push({ kind: 'two-hand-pinch-end' });
  }

  // Snapshot for next frame's edge detection.
  xrPrevPinch.left = leftActive;
  xrPrevPinch.right = rightActive;

  // Emit each gesture on the metrics bus. Guarded so no payloads or per-event
  // property reads happen when nobody is subscribed. Two-hand gestures have no
  // hand field — encode as null.
  if (chanXrGesture.subscribers.size > 0) {
    for (const g of gestures) {
      metrics.emit(chanXrGesture, { hand: 'hand' in g ? g.hand : null, gesture: g });
    }
  }

  return gestures;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 3: TRANSITION INTERACTION STATES
// ═══════════════════════════════════════════════════════════════════════════════
// Consumes gesture events and transitions per-hand InteractionState.

function xrTransitionInteractions(gestures: XrGesture[], _frame: XRFrame): void {
  for (const g of gestures) {
    switch (g.kind) {
      case 'pinch-start': {
        // Enter pending window. Commit happens via two-hand-pinch-start
        // (simultaneous → zoom) OR via the deadline pass below (sequential →
        // single-hand attractor). No immediate dragging start.
        xrSetInteraction(g.hand, {
          kind: 'pending',
          deadline: performance.now() + XR_SIMUL_WINDOW_MS,
        });
        break;
      }
      case 'two-hand-pinch-start': {
        // Simultaneous pinch-start detected (both pinches within window →
        // both hands are still 'pending'). Convert both to two-hand-scale.
        // If either hand has already committed to 'dragging', the pinches
        // were sequential — leave the committed hand alone and let the newly
        // pending hand deadline-commit to its own attractor.
        if (xrInteractions.left.kind === 'pending' && xrInteractions.right.kind === 'pending') {
          const d = sub3(xrHandFrames.left.pinch.current, xrHandFrames.right.pinch.current);
          twoHandState.startDistance = Math.max(0.01, Math.sqrt(dot3(d, d)));
          twoHandState.startOffset = { ...xrViewOffset };
          xrSetInteraction('left', { kind: 'two-hand-scale' });
          xrSetInteraction('right', { kind: 'two-hand-scale' });
        }
        break;
      }
      case 'two-hand-pinch-end': {
        // End scale on both hands. No auto-promote of the remaining pinching
        // hand — user must release and re-pinch to create an attractor.
        if (xrInteractions.left.kind === 'two-hand-scale') xrSetInteraction('left', { kind: 'idle' });
        if (xrInteractions.right.kind === 'two-hand-scale') xrSetInteraction('right', { kind: 'idle' });
        break;
      }
      case 'pinch-end': {
        xrEndInteraction(g.hand);
        break;
      }
      case 'pinch-hold':
        break;
      // Stubs — consumed when hand-tracking features land:
      case 'fine-modifier-on':  xrTuning.gainMultiplier = 0.1; break;
      case 'fine-modifier-off': xrTuning.gainMultiplier = 1.0; break;
      case 'palm-up':
      case 'palm-down':
      case 'wrist-flick':
        break;
    }
  }

  // Deadline pass: any hand still 'pending' whose window has elapsed commits
  // to single-hand dragging. Runs every frame — same code path whether the
  // hand is fresh-pending (stays pending) or past-deadline (promotes).
  // [LAW:dataflow-not-control-flow] Same work every frame; the state decides.
  const now = performance.now();
  for (const hand of ['left', 'right'] as XrHand[]) {
    const ix = xrInteractions[hand];
    if (ix.kind === 'pending' && now >= ix.deadline) {
      // [LAW:single-enforcer] UI selection wins over sim attractor on the same
      // pinch. xrUiStep set xrUiClaimed[hand] at the pinch-start frame; if true,
      // drop the pending pinch instead of starting a sim drag. The pinch will
      // continue feeding xrUiStep until pinch-end.
      if (xrUiClaimed[hand]) {
        xrSetInteraction(hand, { kind: 'idle' });
      } else {
        xrSetInteraction(hand, {
          kind: 'dragging',
          handOrigin: [...xrHandFrames[hand].pinch.origin],
          hasSample: false,
        });
      }
    }
  }
}

// Clean up when a hand releases its pinch.
function xrEndInteraction(hand: XrHand): void {
  const ix = xrInteractions[hand];
  switch (ix.kind) {
    case 'dragging':
      setSimulationInteractionInactive();
      releaseAttractor(XR_ATTRACTOR_POINTER_ID[hand]);
      break;
    case 'pending':
    case 'two-hand-scale':
    case 'idle':
      break;
  }
  xrSetInteraction(hand, { kind: 'idle' });
  // [LAW:one-source-of-truth] Release ray has now been consumed (if needed by
  // the 'pressing' case above). Final hand-frame cleanup here — guarded on
  // !pinch.active so two-hand-pinch-start (which calls xrEndInteraction with
  // pinches still active) doesn't stomp live channels.
  const hf = xrHandFrames[hand];
  if (!hf.pinch.active) {
    hf.source = null;
    hf.gazeRay = null;
    hf.currentRay = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE 4: APPLY SIDE EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════
// Reads current InteractionState + HandFrame, produces outputs (state mutations,
// reference space changes, UI state for rendering).

function xrApplyInteractions(_frame: XRFrame): void {
  // Two-hand scale: both hands cooperating.
  if (xrInteractions.left.kind === 'two-hand-scale' && xrInteractions.right.kind === 'two-hand-scale') {
    const d = sub3(xrHandFrames.left.pinch.current, xrHandFrames.right.pinch.current);
    const dist = Math.sqrt(dot3(d, d));
    if (twoHandState.startDistance >= 0.01) {
      const ratio = dist / twoHandState.startDistance;
      xrViewOffset.z = Math.max(-200, Math.min(-1, twoHandState.startOffset.z / ratio));
      applyXrViewOffset();
    }
    return;
  }

  // Per-hand sim interaction — attractor (physics) / force injection (fluid).
  let anySimDrag = false;
  for (const hand of ['left', 'right'] as XrHand[]) {
    const ix = xrInteractions[hand];
    const hf = xrHandFrames[hand];
    if (ix.kind !== 'dragging' || !hf.source) continue;
    const ray = hf.currentRay;
    if (!ray) continue;

    anySimDrag = true;
    const worldPoint = state.mode === 'fluid'
      ? intersectRayWithPlane(ray.origin, ray.dir, 0)
      : closestPointOnRayToOrigin(ray.origin, ray.dir);
    if (!worldPoint) {
      setSimulationInteractionInactive();
      ix.hasSample = false;
      continue;
    }
    state.mouse.down = true;
    state.mouse.worldX = worldPoint[0];
    state.mouse.worldY = worldPoint[1];
    state.mouse.worldZ = worldPoint[2];
    if (state.mode === 'fluid') {
      const uv = worldToFluidUV(worldPoint);
      if (!uv) { setSimulationInteractionInactive(); ix.hasSample = false; continue; }
      state.mouse.dx = ix.hasSample ? (uv[0] - state.mouse.x) * 10 : 0;
      state.mouse.dy = ix.hasSample ? (uv[1] - state.mouse.y) * 10 : 0;
      state.mouse.x = uv[0];
      state.mouse.y = uv[1];
    } else {
      state.mouse.dx = 0; state.mouse.dy = 0;
      state.mouse.x = worldPoint[0]; state.mouse.y = worldPoint[1];
    }
    if (state.mode === 'physics') {
      const pid = XR_ATTRACTOR_POINTER_ID[hand];
      if (state.pointerToAttractor.has(pid)) {
        moveAttractor(pid, worldPoint);
      } else {
        createAttractor(pid, worldPoint);
      }
    }
    ix.hasSample = true;
  }

  // [LAW:single-enforcer] If no sim drag is active, ensure sim interaction state is clean.
  if (!anySimDrag) {
    // Only deactivate if we were previously active (avoid clobbering desktop mouse).
    if (state.xrEnabled && state.mouse.down) setSimulationInteractionInactive();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
// Called once per XR frame. Runs all four stages in order.

// Extract head pose in current xrRefSpace as the AnchorContext shape.
// Returns null while the viewer pose is unavailable (e.g. tracking dropouts).
function extractXrHeadPose(frame: XRFrame): { position: [number, number, number]; orientation: [number, number, number, number] } | null {
  if (!xrRefSpace) return null;
  const pose = frame.getViewerPose(xrRefSpace);
  if (!pose) return null;
  const t = pose.transform;
  return {
    position: [t.position.x, t.position.y, t.position.z],
    orientation: [t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w],
  };
}

function xrInputStep(frame: XRFrame): void {
  xrUpdateHandFrames(frame);
  // [LAW:single-enforcer] xrUiStep runs BEFORE gesture/transition stages so
  // its claim flag is current by the time xrTransitionInteractions's deadline
  // pass decides whether to promote a pending pinch to a sim attractor drag.
  // [LAW:dataflow-not-control-flow] Always called; with no active layout it
  // returns idle/empty. No "if UI active" branch around it.
  const headPose = extractXrHeadPose(frame);
  const uiResult = xrUiStep(xrUiRegistry, xrHandFrames, xrUiPrev, { hands: xrHandFrames, headPose }, xrTuning, 16);
  xrUiApplyEffects(uiResult.sideEffects, xrUiRegistry);
  xrUiPrev = uiResult.next;
  xrUiRenderList = uiResult.renderList;
  xrUiClaimed.left  = uiHandClaimed(uiResult.next.states.left);
  xrUiClaimed.right = uiHandClaimed(uiResult.next.states.right);

  const gestures = xrDetectGestures();
  xrTransitionInteractions(gestures, frame);
  xrApplyInteractions(frame);
}

// Called by selectend to release a hand's pinch state.
// [LAW:one-source-of-truth] Leaves source/gazeRay/currentRay intact so the
// next xrFrame's gesture pipeline (pinch-end → xrEndInteraction) can use the
// release ray for the button-press commit hit test. Final hand-frame cleanup
// happens in xrEndInteraction once the release ray has been consumed.
function xrOnSelectEnd(source: XRInputSource): void {
  const hand = findHandForSource(source);
  if (hand) {
    const hf = xrHandFrames[hand];
    hf.pinch.active = false;
    hf.tracked = false;
  }
  // Also remove from pending if it never resolved.
  const pendingIdx = xrPendingSources.indexOf(source);
  if (pendingIdx >= 0) xrPendingSources.splice(pendingIdx, 1);
}

// Reset all gesture state (called on session end).
function xrResetInputState(): void {
  xrPendingSources.length = 0;
  xrHandFrames.left = makeIdleHandFrame('left');
  xrHandFrames.right = makeIdleHandFrame('right');
  xrSetInteraction('left', { kind: 'idle' });
  xrSetInteraction('right', { kind: 'idle' });
  xrPrevPinch.left = false;
  xrPrevPinch.right = false;
  xrPrevGestureSnap.left = makeGestureSnapshot();
  xrPrevGestureSnap.right = makeGestureSnapshot();
  xrTuning.gainMultiplier = 1.0;
  xrUiPrev = xrUiMakeIdlePrev();
  xrUiRenderList = [];
  xrUiClaimed.left = false;
  xrUiClaimed.right = false;
  setSimulationInteractionInactive();
  releaseAttractor(XR_ATTRACTOR_POINTER_ID.left);
  releaseAttractor(XR_ATTRACTOR_POINTER_ID.right);
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

const frameStats = createFrameStatsService();

function tsWrites(bucket: GpuTimingBucket): TimestampWrites | undefined {
  return gpuTiming.tsWrites(bucket);
}

function tsBegin(bucket: GpuTimingBucket): TimestampWrites | undefined {
  return gpuTiming.tsBegin(bucket);
}

function tsEnd(bucket: GpuTimingBucket): TimestampWrites | undefined {
  return gpuTiming.tsEnd(bucket);
}

function resolveTimestamps(encoder: GPUCommandEncoder, now: number) {
  gpuTiming.endFrame(encoder, now);
}

function measureGpuFrame(now: number) {
  gpuTiming.measure(now);
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
  const { gpuFrameMs, gpuTimingDetail } = gpuTiming.getStats();
  const sim = simulations[state.mode];
  frameStats.updateHud({
    count: sim ? sim.getCount() : '--',
    currentFps: frameStats.getCurrentFps(),
    gpuFrameMs,
    gpuTimingDetail,
    isGridMode: state.mode === 'fluid' || state.mode === 'reaction',
    physicsDirection: state.mode === 'physics' && isPhysicsSimulation(sim) ? sim.getTimeDirection() : undefined,
    physicsStep: state.mode === 'physics' && isPhysicsSimulation(sim) ? sim.getSimStep() : undefined,
  });
}

function resizeCanvas() {
  const container = document.getElementById('canvas-container')!;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(container.clientWidth * dpr);
  const h = Math.floor(container.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ensureHdrTargets(canvas.width, canvas.height);
}

// [LAW:dataflow-not-control-flow] Post-process always runs the same passes; uniform values dictate strength.
// Before: caller has rendered the sim into the current HDR scene texture (postFx.scene[postFx.sceneIdx]).
// After: composite is written into `finalView` (canvas swapchain or XR compositor texture).
// `prevSceneIdx` (passed in) is the texture the fade pass should READ FROM (the previous frame's scene).
function runFadePass(encoder: GPUCommandEncoder, prevSceneIdx: number, currSceneIdx: number) {
  postFx.runFadePass(encoder, prevSceneIdx, currSceneIdx, state.fx.trailPersistence, catalogDefaultClearColor);
}

function runBloomChain(encoder: GPUCommandEncoder, timingBucket?: GpuTimingBucket) {
  postFx.runBloomChain(encoder, state.fx, timingBucket ? tsBegin(timingBucket) : undefined);
}

function runComposite(
  encoder: GPUCommandEncoder,
  finalView: GPUTextureView,
  finalFormat: GPUTextureFormat,
  viewport: number[] | null = null,
  timingBucket?: GpuTimingBucket
) {
  postFx.runComposite(
    encoder,
    finalView,
    finalFormat,
    viewport,
    state.fx,
    getThemeColors(),
    timingBucket ? tsEnd(timingBucket) : undefined,
  );
}

function frame(now: DOMHighResTimeStamp) {
  if (state.xrEnabled) return; // XR has its own loop

  requestAnimationFrame(frame);

  // Adaptive-chunk feedback: use the gap since the previous rAF as a proxy for "is the GPU keeping up?"
  // When a heavy frame pushes delta over ~20ms, the adaptive chunk shrinks next frame; when we have
  // headroom (delta < 14ms), it grows. This is the only place we measure frame pacing, so the feedback
  // decision stays in one place (single-enforcer).
  const { frameDeltaMs, fpsUpdated, hadPreviousTimestamp } = frameStats.tick(now);
  if (hadPreviousTimestamp) {
    updateAdaptiveChunk(frameDeltaMs);
  }

  refreshThemeColors(now);
  resizeCanvas();
  // [LAW:single-enforcer] Attractor lifecycle is updated here, before any sim/compute/composite runs,
  // so mode switches can't leak dead attractors into the array or render loop.
  pruneAttractors(currentSimStep());

  // [LAW:single-enforcer] Markers tick once per visual frame, with dt bounded to kill lag-spike
  // teleports. timeScale + timeDirection make the swarm track the simulation's sense of time.
  tickMarkers(Math.min(0.05, frameDeltaMs * 0.001) * state.fx.timeScale * currentTimeDirection());

  if (fpsUpdated) updateStats();

  const sim = simulations[state.mode];
  if (!sim) return;

  // [LAW:single-enforcer] GPU validation errors are caught by device.onuncapturederror
  // (set up in initWebGPU) which surfaces them in the error overlay without per-frame
  // scope overhead. Targeted scopes in ensureSimulation() handle creation-time errors.
  const mode = state.mode;

  try {
    gpuTiming.beginFrame();
    const encoder = device.createCommandEncoder();

    // Debug stepping/skipping and normal play both funnel through runDebugCompute so the
    // "when do we dispatch compute" decision is owned in one place.
    runDebugCompute(sim, encoder);
    updateDebugPanel();

    const prevIdx = postFx.getSceneIndex();
    const currIdx = 1 - prevIdx;
    postFx.setSceneIndex(currIdx);

    runFadePass(encoder, prevIdx, currIdx);

    sim.render(encoder, postFx.getSceneView(currIdx), null);

    runBloomChain(encoder, 'bloomComposite');
    const swapchainView = context.getCurrentTexture().createView();
    runComposite(encoder, swapchainView, canvasFormat, null, 'bloomComposite');

    resolveTimestamps(encoder, now);
    device.queue.submit([encoder.finish()]);
    measureGpuFrame(now);

  } catch (e) {
    showSimError(mode, `frame threw: ${(e as Error).message}`);
    // Only drop the sim instance we were just rendering — not whatever lives
    // in the registry now, which could be a fresh one the user already reset.
    if (simulations[mode] === sim) {
      dropSimulationIfCurrent(mode, sim);
    }
  }
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
    applyPreset,
    modeParams,
    modeTabLabels: catalogModeTabLabels,
    paramDefs: catalogParamDefs,
    presets: catalogPresets,
    registry: bindingRegistry,
    selectMode,
    selectTheme: (themeName) => themeSystem.selectTheme(themeName),
    setPaused: (paused) => {
      state.paused = paused;
      if (paused) cancelDebugMovement();
      syncPauseButtons();
    },
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
    getRefSpace: () => xrRefSpace,
    getUiRenderList: () => xrUiRenderList,
    initializeReferenceSpace: initializeXrReferenceSpace,
    inputStep: xrInputStep,
    logError,
    logInfo,
    markPostFxNeedsClear: () => postFx.markNeedsClear(),
    onSelectEnd: xrOnSelectEnd,
    postFxRunBloomChain: runBloomChain,
    postFxRunComposite: runComposite,
    pruneAttractors,
    queuePendingSource: (source) => { xrPendingSources.push(source); },
    refreshThemeColors,
    requestDesktopFrame: () => requestAnimationFrame(frame),
    resetInputState: xrResetInputState,
    clearReferenceSpace: clearXrReferenceSpace,
    setCurrentPhase: (phase) => { currentGpuPhase = phase; },
    setHandTrackingAvailable: () => {},
    state,
    syncRenderConfig,
    tickFrameStats: (time) => frameStats.tick(time),
    tickMarkers,
    uiRegistry: xrUiRegistry,
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
  updateAll();

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(document.getElementById('canvas-container')!);

  requestAnimationFrame(frame);
  installDevtools({
    state,
    getCurrentSimulation: () => simulations[state.mode],
    getGpuStats: () => ({
      currentFps: frameStats.getCurrentFps(),
      ...gpuTiming.getStats(),
    }),
    bindings: bindingRegistry,
    anchors: { evaluateAnchor, handFrames: xrHandFrames },
    xrUi: {
      layout: xrUiLayout,
      hitTestWidgets,
      step: xrUiStep,
      applyEffects: xrUiApplyEffects,
      registry: xrUiRegistry,
      makeIdlePrev: xrUiMakeIdlePrev,
      getRenderList: () => xrUiRenderList,
      getPrev: () => xrUiPrev,
      getClaimed: () => ({ ...xrUiClaimed }),
    },
  });
}

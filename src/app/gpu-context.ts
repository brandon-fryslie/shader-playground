import { createGpuTimingService, type GpuTimingService } from '../gpu/timestamps';
import { createCameraSystem, type CameraSystem } from '../render/camera';
import { createRenderFrameRuntime, type RenderFrameRuntime } from '../render/frame';
import { createPostFxService, type PostFxService } from '../render/post-fx';
import type { AppState, RGBThemeColors, Simulation } from '../types';

// [LAW:one-source-of-truth] Sims render into HDR offscreen; the swapchain is only the final composite target.
const RENDER_TARGET_FORMAT: GPUTextureFormat = 'rgba16float';
const RENDER_SAMPLE_COUNT = 1;

export interface GpuContext {
  readonly cameraSystem: CameraSystem;
  readonly canvas: HTMLCanvasElement;
  readonly canvasFormat: GPUTextureFormat;
  readonly context: GPUCanvasContext;
  readonly device: GPUDevice;
  readonly frameRuntime: RenderFrameRuntime;
  readonly postFx: PostFxService;
  readonly renderSampleCount: number;
  readonly renderTargetFormat: GPUTextureFormat;
  readonly timing: GpuTimingService;
}

export interface GpuContextDeps {
  createShaderModuleChecked(label: string, code: string): GPUShaderModule;
  currentSimStep(): number;
  currentTimeDirection(): number;
  dropSimulationIfCurrent(mode: AppState['mode'], expected: Simulation): void;
  getCanvasContainer(): HTMLElement;
  getCurrentSimulation(): Simulation | undefined;
  getDefaultClearColor(): GPUColor;
  getThemeColors(): RGBThemeColors;
  logError(kind: string, err: unknown, extra?: string): void;
  pruneAttractors(step: number): void;
  refreshThemeColors(now: DOMHighResTimeStamp): void;
  restoreAfterDeviceLoss(): Promise<void>;
  runDebugCompute(sim: Simulation, encoder: GPUCommandEncoder): void;
  showSimError(mode: AppState['mode'], message: string): void;
  state: AppState;
  tickMarkers(dtSeconds: number): void;
  updateAdaptiveChunk(frameDeltaMs: number): void;
  updateDebugPanel(): void;
}

function showFallback(message: string): void {
  const fallbackEl = document.getElementById('fallback')!;
  fallbackEl.querySelector('p')!.textContent = message;
  fallbackEl.classList.add('visible');
}

// [LAW:single-enforcer] WebGPU boot produces the sole typed runtime capability
// bundle; downstream code consumes this value instead of re-describing globals.
export async function createGpuContext(deps: GpuContextDeps): Promise<GpuContext | null> {
  if (!navigator.gpu) {
    showFallback('navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.');
    return null;
  }

  let adapter: GPUAdapter | null;
  try {
    adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance', xrCompatible: true });
  } catch (error) {
    showFallback(`requestAdapter() failed: ${(error as Error).message}`);
    return null;
  }
  if (!adapter) {
    showFallback('requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.');
    return null;
  }

  let device: GPUDevice;
  try {
    const requiredFeatures: GPUFeatureName[] = adapter.features.has('timestamp-query') ? ['timestamp-query'] : [];
    device = await adapter.requestDevice({ requiredFeatures });
  } catch (error) {
    showFallback(`requestDevice() failed: ${(error as Error).message}`);
    return null;
  }

  const timing = createGpuTimingService();
  timing.init(device);

  device.lost.then((info) => {
    deps.logError('webgpu:device-lost', new Error(info.message), `reason=${info.reason}`);
    if (info.reason !== 'destroyed') {
      void deps.restoreAfterDeviceLoss().catch((error) => deps.logError('webgpu:device-restore', error));
    }
  });

  device.onuncapturederror = (ev: GPUUncapturedErrorEvent) => {
    deps.logError('webgpu:uncaptured', ev.error);
  };

  const canvas = document.getElementById('gpu-canvas') as HTMLCanvasElement;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format: canvasFormat, alphaMode: 'opaque' });

  const cameraSystem = createCameraSystem(deps.state.camera);
  const postFx = createPostFxService({
    createShaderModuleChecked: deps.createShaderModuleChecked,
    device,
    renderSampleCount: RENDER_SAMPLE_COUNT,
  });
  postFx.init();

  const bootContext = {
    cameraSystem,
    canvas,
    canvasFormat,
    context,
    device,
    postFx,
    renderSampleCount: RENDER_SAMPLE_COUNT,
    renderTargetFormat: RENDER_TARGET_FORMAT,
    timing,
  };

  const frameRuntime = createRenderFrameRuntime({
    currentSimStep: deps.currentSimStep,
    currentTimeDirection: deps.currentTimeDirection,
    dropSimulationIfCurrent: deps.dropSimulationIfCurrent,
    getCanvas: () => bootContext.canvas,
    getCanvasContainer: deps.getCanvasContainer,
    getCanvasFormat: () => bootContext.canvasFormat,
    getContext: () => bootContext.context,
    getCurrentSimulation: deps.getCurrentSimulation,
    getDefaultClearColor: deps.getDefaultClearColor,
    getDevice: () => bootContext.device,
    getPostFx: () => bootContext.postFx,
    getThemeColors: deps.getThemeColors,
    gpuTiming: bootContext.timing,
    pruneAttractors: deps.pruneAttractors,
    refreshThemeColors: deps.refreshThemeColors,
    runDebugCompute: deps.runDebugCompute,
    showSimError: deps.showSimError,
    state: deps.state,
    tickMarkers: deps.tickMarkers,
    updateAdaptiveChunk: deps.updateAdaptiveChunk,
    updateDebugPanel: deps.updateDebugPanel,
  });

  return { ...bootContext, frameRuntime };
}

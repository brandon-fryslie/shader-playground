import type { GpuTimingBucket, GpuTimingService, TimestampWrites } from '../gpu/timestamps';
import { isPhysicsSimulation } from '../simulations/types';
import type { AppState, RGBThemeColors, Simulation } from '../types';

import { createFrameStatsService } from './frame-stats';
import type { PostFxService } from './post-fx';

export interface RenderFrameRuntime {
  getCurrentFps(): number;
  getGpuStats(): { currentFps: number; gpuFrameMs: number; gpuTimingDetail: ReturnType<GpuTimingService['getStats']>['gpuTimingDetail'] };
  requestFrame(): void;
  resize(): void;
  runBloomChain(encoder: GPUCommandEncoder, timingBucket?: GpuTimingBucket): void;
  runComposite(
    encoder: GPUCommandEncoder,
    finalView: GPUTextureView,
    finalFormat: GPUTextureFormat,
    viewport?: number[] | null,
    timingBucket?: GpuTimingBucket,
  ): void;
  start(): void;
  tickFrameStats(now: DOMHighResTimeStamp): ReturnType<ReturnType<typeof createFrameStatsService>['tick']>;
  tsWrites(bucket: GpuTimingBucket): TimestampWrites | undefined;
  updateStats(): void;
}

interface RenderFrameRuntimeDeps {
  currentSimStep(): number;
  currentTimeDirection(): number;
  getCanvas(): HTMLCanvasElement;
  getCanvasContainer(): HTMLElement;
  getCanvasFormat(): GPUTextureFormat;
  getContext(): GPUCanvasContext;
  getCurrentSimulation(): Simulation | undefined;
  getDefaultClearColor(): GPUColor;
  getDevice(): GPUDevice;
  getPostFx(): PostFxService;
  getThemeColors(): RGBThemeColors;
  gpuTiming: GpuTimingService;
  pruneAttractors(step: number): void;
  refreshThemeColors(now: DOMHighResTimeStamp): void;
  runDebugCompute(sim: Simulation, encoder: GPUCommandEncoder): void;
  showSimError(mode: AppState['mode'], message: string): void;
  state: AppState;
  tickMarkers(dtSeconds: number): void;
  updateAdaptiveChunk(frameDeltaMs: number): void;
  updateDebugPanel(): void;
  dropSimulationIfCurrent(mode: AppState['mode'], expected: Simulation): void;
}

export function createRenderFrameRuntime(deps: RenderFrameRuntimeDeps): RenderFrameRuntime {
  const frameStats = createFrameStatsService();
  let resizeObserver: ResizeObserver | null = null;

  function runFadePass(encoder: GPUCommandEncoder, prevSceneIdx: number, currSceneIdx: number): void {
    deps.getPostFx().runFadePass(
      encoder,
      prevSceneIdx,
      currSceneIdx,
      deps.state.fx.trailPersistence,
      deps.getDefaultClearColor(),
    );
  }

  const frame = (now: DOMHighResTimeStamp) => {
    if (deps.state.xrEnabled) return;

    requestAnimationFrame(frame);

    // [LAW:single-enforcer] Desktop frame pacing, HUD timing, and GPU timing all
    // flow through this one owner so render scheduling cannot drift by caller.
    const { frameDeltaMs, fpsUpdated, hadPreviousTimestamp } = frameStats.tick(now);
    if (hadPreviousTimestamp) deps.updateAdaptiveChunk(frameDeltaMs);

    deps.refreshThemeColors(now);
    runtime.resize();

    // [LAW:dataflow-not-control-flow] Every desktop frame runs the same
    // lifecycle stages; active sim and timing values decide the work shape.
    deps.pruneAttractors(deps.currentSimStep());
    deps.tickMarkers(Math.min(0.05, frameDeltaMs * 0.001) * deps.state.fx.timeScale * deps.currentTimeDirection());

    if (fpsUpdated) runtime.updateStats();

    const sim = deps.getCurrentSimulation();
    if (!sim) return;

    const mode = deps.state.mode;
    try {
      deps.gpuTiming.beginFrame();
      const encoder = deps.getDevice().createCommandEncoder();

      deps.runDebugCompute(sim, encoder);
      deps.updateDebugPanel();

      const postFx = deps.getPostFx();
      const prevIdx = postFx.getSceneIndex();
      const currIdx = 1 - prevIdx;
      postFx.setSceneIndex(currIdx);

      runFadePass(encoder, prevIdx, currIdx);
      sim.render(encoder, postFx.getSceneView(currIdx), null);

      runtime.runBloomChain(encoder, 'bloomComposite');
      const swapchainView = deps.getContext().getCurrentTexture().createView();
      runtime.runComposite(encoder, swapchainView, deps.getCanvasFormat(), null, 'bloomComposite');

      deps.gpuTiming.endFrame(encoder, now);
      deps.getDevice().queue.submit([encoder.finish()]);
      deps.gpuTiming.measure(now);
    } catch (error) {
      deps.showSimError(mode, `frame threw: ${(error as Error).message}`);
      deps.dropSimulationIfCurrent(mode, sim);
    }
  };

  const runtime: RenderFrameRuntime = {
    getCurrentFps() {
      return frameStats.getCurrentFps();
    },
    getGpuStats() {
      return {
        currentFps: frameStats.getCurrentFps(),
        ...deps.gpuTiming.getStats(),
      };
    },
    requestFrame() {
      requestAnimationFrame(frame);
    },
    resize() {
      const canvas = deps.getCanvas();
      const container = deps.getCanvasContainer();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(container.clientWidth * dpr);
      const h = Math.floor(container.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      deps.getPostFx().ensureHdrTargets(canvas.width, canvas.height);
    },
    runBloomChain(encoder, timingBucket) {
      deps.getPostFx().runBloomChain(
        encoder,
        deps.state.fx,
        timingBucket ? deps.gpuTiming.tsBegin(timingBucket) : undefined,
      );
    },
    runComposite(encoder, finalView, finalFormat, viewport = null, timingBucket) {
      deps.getPostFx().runComposite(
        encoder,
        finalView,
        finalFormat,
        viewport,
        deps.state.fx,
        deps.getThemeColors(),
        timingBucket ? deps.gpuTiming.tsEnd(timingBucket) : undefined,
      );
    },
    start() {
      runtime.resize();
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => runtime.resize());
      resizeObserver.observe(deps.getCanvasContainer());
      runtime.requestFrame();
    },
    tickFrameStats(now) {
      return frameStats.tick(now);
    },
    tsWrites(bucket) {
      return deps.gpuTiming.tsWrites(bucket);
    },
    updateStats() {
      const sim = deps.getCurrentSimulation();
      const { gpuFrameMs, gpuTimingDetail } = deps.gpuTiming.getStats();
      frameStats.updateHud({
        count: sim ? sim.getCount() : '--',
        currentFps: frameStats.getCurrentFps(),
        gpuFrameMs,
        gpuTimingDetail,
        isGridMode: deps.state.mode === 'fluid' || deps.state.mode === 'reaction',
        physicsDirection: deps.state.mode === 'physics' && isPhysicsSimulation(sim) ? sim.getTimeDirection() : undefined,
        physicsStep: deps.state.mode === 'physics' && isPhysicsSimulation(sim) ? sim.getSimStep() : undefined,
      });
    },
  };

  return runtime;
}

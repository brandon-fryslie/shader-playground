import type { AppState, Simulation } from '../types';
import type { CameraSystem } from '../render/camera';
import { HIG_DEFAULTS } from '../xr-ui/widgets';
import { createXrWidgetRenderer, type XrWidgetRenderer } from '../xr-ui/renderer';
import type { XrUiRegistry, RenderCommand as XrRenderCommand } from '../xr-ui/step';
import type { Anchor } from '../xr-ui/anchors';

export interface XrRuntime {
  getDepthOverride(): GPUTextureView | null;
  getSession(): XRSession | null;
  toggle(): Promise<void>;
}

interface XrRuntimeDeps {
  cameraStride: number;
  cameraSystem: CameraSystem;
  currentSimStep(): number;
  currentTimeDirection(): number;
  device: GPUDevice;
  ensureHdrTargets(width: number, height: number): void;
  getCameraUniformData(aspect: number): Float32Array<ArrayBuffer>;
  getCurrentPhase(): string;
  getRefSpace(): XRReferenceSpace | null;
  getCurrentSimulation(): Simulation | undefined;
  getPostFxSceneFormat(index: number): GPUTextureFormat;
  getPostFxSceneIndex(): number;
  getPostFxSceneView(index: number): GPUTextureView;
  getUiRenderList(): XrRenderCommand[];
  initializeReferenceSpace(refSpace: XRReferenceSpace, gotFloor: boolean): void;
  inputStep(frame: XRFrame): void;
  logError(scope: string, error: unknown, detail?: unknown): void;
  logInfo(scope: string, message: string, detail?: unknown): void;
  markPostFxNeedsClear(): void;
  onSelectEnd(source: XRInputSource): void;
  postFxRunBloomChain(encoder: GPUCommandEncoder): void;
  postFxRunComposite(
    encoder: GPUCommandEncoder,
    finalView: GPUTextureView,
    finalFormat: GPUTextureFormat,
    viewport: number[] | null,
  ): void;
  pruneAttractors(step: number): void;
  queuePendingSource(source: XRInputSource): void;
  refreshThemeColors(now: DOMHighResTimeStamp): void;
  requestDesktopFrame(): void;
  resetInputState(): void;
  clearReferenceSpace(): void;
  setCurrentPhase(phase: string): void;
  setHandTrackingAvailable(active: boolean): void;
  state: AppState;
  tickFrameStats(time: DOMHighResTimeStamp): { fpsUpdated: boolean; frameDeltaMs: number };
  tickMarkers(dtSeconds: number): void;
  uiRegistry: XrUiRegistry;
  updateStats(): void;
}

export function createXrRuntime(deps: XrRuntimeDeps): XrRuntime {
  let xrSession: XRSession | null = null;
  let xrBinding: XRGPUBinding | null = null;
  let xrLayer: XRProjectionLayer | null = null;
  let xrWidgetRenderer: XrWidgetRenderer | null = null;
  let xrWidgetCameraBuffer: GPUBuffer | null = null;
  let xrDepthOverride: GPUTextureView | null = null;
  let xrFrameCount = 0;

  const XR_FIRST_FRAMES_TO_LOG = 3;
  const XR_PANEL_HAND = 'left';

  const xrFrame = (time: DOMHighResTimeStamp, xrFrameData: XRFrame) => {
    if (!xrSession) return;
    xrSession.requestAnimationFrame(xrFrame);
    deps.refreshThemeColors(time);
    const isEarlyFrame = xrFrameCount < XR_FIRST_FRAMES_TO_LOG;
    if (isEarlyFrame) deps.logInfo('xr:frame', `xrFrame #${xrFrameCount} entered`, { mode: deps.state.mode });
    deps.pruneAttractors(deps.currentSimStep());
    const { frameDeltaMs: xrFrameDeltaMs, fpsUpdated: xrFpsUpdated } = deps.tickFrameStats(time);
    deps.tickMarkers(Math.min(0.05, xrFrameDeltaMs * 0.001) * deps.state.fx.timeScale * deps.currentTimeDirection());
    if (xrFpsUpdated) deps.updateStats();

    deps.setCurrentPhase(`xr:frame:${xrFrameCount}:pre-encode`);
    deps.device.pushErrorScope('validation');

    try {
      const refSpace = deps.getRefSpace();
      if (!refSpace) {
        deps.logError('xr:frame', new Error('XR reference space unavailable during frame'));
        return;
      }
      const pose = xrFrameData.getViewerPose(refSpace);
      if (!pose) {
        if (isEarlyFrame) deps.logInfo('xr:frame', 'no viewer pose yet');
        return;
      }

      const sim = deps.getCurrentSimulation();
      if (!sim) {
        deps.logError('xr:frame', new Error(`simulation for mode=${deps.state.mode} is not initialized`));
        return;
      }

      deps.inputStep(xrFrameData);

      deps.setCurrentPhase(`xr:frame:${xrFrameCount}:createCommandEncoder`);
      const encoder = deps.device.createCommandEncoder({ label: `xr-frame-${xrFrameCount}` });

      if (!deps.state.paused) {
        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:sim.compute(${deps.state.mode})`);
        sim.compute(encoder);
      }

      if (isEarlyFrame) deps.logInfo('xr:frame', `pose has ${pose.views.length} views`);
      for (let viewIndex = 0; viewIndex < pose.views.length; viewIndex++) {
        const view = pose.views[viewIndex];
        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:getViewSubImage(eye=${viewIndex})`);
        const binding = xrBinding!;
        const subImage = binding.getViewSubImage
          ? binding.getViewSubImage(xrLayer!, view)
          : binding.getSubImage!(xrLayer!, view);
        if (!subImage) {
          deps.logError('xr:frame', new Error(`subImage null for eye ${viewIndex}`));
          continue;
        }
        if (isEarlyFrame && viewIndex === 0) {
          deps.logInfo('xr:frame', 'subImage', {
            viewport: subImage.viewport,
            colorFormat: subImage.colorTexture.format,
            hasDepth: !!subImage.depthStencilTexture,
          });
        }

        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:createView(color,eye=${viewIndex})`);
        const viewDesc = subImage.getViewDescriptor ? subImage.getViewDescriptor() : {};
        const textureView = subImage.colorTexture.createView(viewDesc);

        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:createView(depth,eye=${viewIndex})`);
        const isTextureArray = ((xrLayer as unknown as { textureArrayLength?: number }).textureArrayLength ?? 1) > 1;
        const depthTex = subImage.depthStencilTexture;
        xrDepthOverride = (depthTex && isTextureArray) ? depthTex.createView(viewDesc) : null;

        const pos = view.transform.position;
        deps.cameraSystem.setXrOverride({
          viewMatrix: new Float32Array(view.transform.inverse.matrix),
          projMatrix: new Float32Array(view.projectionMatrix),
          eye: [pos.x, pos.y, pos.z],
        });

        const { x, y, width, height } = subImage.viewport;
        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:ensureHdrTargets(${width}x${height})`);
        deps.ensureHdrTargets(width, height);
        deps.markPostFxNeedsClear();
        const sceneIdx = deps.getPostFxSceneIndex();
        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:sim.render(${deps.state.mode},eye=${viewIndex})`);
        const sceneView = deps.getPostFxSceneView(sceneIdx);
        sim.render(encoder, sceneView, null, viewIndex);

        if (!xrWidgetRenderer) {
          xrWidgetCameraBuffer = deps.device.createBuffer({
            label: 'xr-widgets-camera',
            size: deps.cameraStride * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          });
          xrWidgetRenderer = createXrWidgetRenderer(deps.device, xrWidgetCameraBuffer, () => {
            const aspect = width / height;
            return deps.getCameraUniformData(aspect);
          });
        }
        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:xr-widgets(eye=${viewIndex})`);
        xrWidgetRenderer.draw(encoder, sceneView, deps.getPostFxSceneFormat(sceneIdx), viewIndex, deps.getUiRenderList());

        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:bloom(eye=${viewIndex})`);
        deps.postFxRunBloomChain(encoder);
        deps.setCurrentPhase(`xr:frame:${xrFrameCount}:composite(eye=${viewIndex})`);
        const ctFormat = subImage.colorTexture.format;
        deps.postFxRunComposite(encoder, textureView, ctFormat, [x, y, width, height]);
      }

      deps.setCurrentPhase(`xr:frame:${xrFrameCount}:submit`);
      deps.device.queue.submit([encoder.finish()]);
      if (isEarlyFrame) deps.logInfo('xr:frame', `frame #${xrFrameCount} submitted OK`);
    } catch (e) {
      deps.logError('xr:frame', e, `frame #${xrFrameCount} threw synchronously`);
    } finally {
      deps.cameraSystem.clearXrOverride();
      xrDepthOverride = null;
      deps.device.popErrorScope().then((err) => {
        if (err) deps.logError('xr:frame:validation', err, `frame #${xrFrameCount}`);
      }).catch((popErr) => deps.logError('xr:frame:popScope', popErr));
      xrFrameCount++;
    }
  };

  return {
    getDepthOverride() {
      return xrDepthOverride;
    },
    getSession() {
      return xrSession;
    },
    async toggle() {
      if (xrSession) {
        deps.logInfo('xr', 'ending session on toggle');
        xrSession.end();
        return;
      }
      if (!navigator.xr) {
        deps.logError('xr', new Error('WebXR not supported (navigator.xr missing)'));
        return;
      }

      const btn = document.getElementById('btn-xr')!;
      deps.setCurrentPhase('xr:requestSession');
      try {
        xrSession = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['webgpu'],
          optionalFeatures: ['layers', 'local-floor', 'hand-tracking'],
        });
        const enabledFeatures = xrSession.enabledFeatures;
        const xrHandTrackingAvailable = enabledFeatures?.includes('hand-tracking') ?? false;
        deps.setHandTrackingAvailable(xrHandTrackingAvailable);
        deps.logInfo('xr', 'session acquired', {
          enabledFeatures: enabledFeatures ? Array.from(enabledFeatures) : [],
          environmentBlendMode: (xrSession as unknown as { environmentBlendMode?: string }).environmentBlendMode,
          interactionMode: (xrSession as unknown as { interactionMode?: string }).interactionMode,
          visibilityState: (xrSession as unknown as { visibilityState?: string }).visibilityState,
          handTracking: xrHandTrackingAvailable,
        });

        deps.setCurrentPhase('xr:requestReferenceSpace(local-floor)');
        let refSpace: XRReferenceSpace;
        let gotFloor = false;
        try {
          refSpace = await xrSession.requestReferenceSpace('local-floor');
          gotFloor = true;
          deps.logInfo('xr', 'using local-floor reference space');
        } catch (e) {
          deps.logInfo('xr', 'local-floor unavailable, falling back to local', (e as Error).message);
          deps.setCurrentPhase('xr:requestReferenceSpace(local)');
          refSpace = await xrSession.requestReferenceSpace('local');
        }

        // [LAW:one-source-of-truth] runtime-impl owns the mutable ref-space state
        // consumed by the input pipeline; XR session setup only initializes it here.
        deps.initializeReferenceSpace(refSpace, gotFloor);
        deps.setCurrentPhase('xr:createBinding');
        xrBinding = new XRGPUBinding(xrSession, deps.device);
        const preferredFormat = xrBinding.getPreferredColorFormat();
        const scaleFactor = xrBinding.nativeProjectionScaleFactor;
        deps.logInfo('xr', 'projection preferences', { preferredFormat, nativeProjectionScaleFactor: scaleFactor });
        deps.markPostFxNeedsClear();

        const layerConfigs: XRGPUProjectionLayerInit[] = [
          { colorFormat: preferredFormat, depthStencilFormat: 'depth24plus', scaleFactor, textureType: 'texture-array' },
          { colorFormat: preferredFormat, depthStencilFormat: 'depth24plus', textureType: 'texture-array' },
          { colorFormat: preferredFormat, scaleFactor, textureType: 'texture-array' },
          { colorFormat: preferredFormat, textureType: 'texture-array' },
          { colorFormat: preferredFormat, scaleFactor },
          { colorFormat: preferredFormat },
        ];
        deps.setCurrentPhase('xr:createProjectionLayer');
        let chosenConfig: XRGPUProjectionLayerInit | null = null;
        const attemptLog: Array<{ config: XRGPUProjectionLayerInit; error: string }> = [];
        for (const config of layerConfigs) {
          try {
            xrLayer = xrBinding.createProjectionLayer(config);
            chosenConfig = config;
            break;
          } catch (e) {
            const msg = (e as Error).message;
            attemptLog.push({ config, error: msg });
            deps.logInfo('xr', 'projection layer config rejected', { config, error: msg });
            xrLayer = null;
          }
        }
        if (!xrLayer) {
          throw new Error(`All projection layer configurations failed. Attempts: ${JSON.stringify(attemptLog)}`);
        }
        deps.logInfo('xr', 'projection layer created', {
          config: chosenConfig,
          textureWidth: xrLayer.textureWidth,
          textureHeight: xrLayer.textureHeight,
          textureArrayLength: (xrLayer as unknown as { textureArrayLength?: number }).textureArrayLength,
          ignoreDepthValues: (xrLayer as unknown as { ignoreDepthValues?: boolean }).ignoreDepthValues,
        });

        try {
          (xrLayer as unknown as { fixedFoveation: number }).fixedFoveation = 0;
          deps.logInfo('xr', 'fixedFoveation set to 0');
        } catch (foveErr) {
          deps.logInfo('xr', 'fixedFoveation unsupported on this platform', (foveErr as Error).message);
        }

        deps.setCurrentPhase('xr:updateRenderState');
        xrSession.updateRenderState({ layers: [xrLayer] });
        deps.logInfo('xr', 'render state updated with projection layer');

        xrSession.addEventListener('selectstart', (event) => {
          deps.queuePendingSource((event as XRInputSourceEvent).inputSource);
        });
        xrSession.addEventListener('selectend', (event) => {
          deps.onSelectEnd((event as XRInputSourceEvent).inputSource);
        });

        btn.textContent = 'Exit VR';
        deps.state.xrEnabled = true;
        deps.setCurrentPhase('xr:awaiting first frame');

        const idQuat: [number, number, number, number] = [0, 0, 0, 1];
        const widgetSize = { x: 0.16, y: 0.06 };
        const widgetPad = { x: 0.02, y: 0.02 };
        deps.uiRegistry.layouts.set('debug', {
          id: 'debug-panel', kind: 'panel',
          anchor: { kind: 'head-hud', distance: 0.7, offset: { position: [0, -0.15, 0], orientation: idQuat } },
          size: { x: 1.1, y: 0.5 },
          children: [
            {
              id: 'debug-row-1', kind: 'group', layout: 'row',
              children: [
                { id: 'debug-s1', kind: 'slider', binding: 'physics.G', orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' }, visualSize: widgetSize, hitPadding: widgetPad },
                { id: 'debug-b1', kind: 'button', binding: 'preset.physics.Default', style: 'primary', visualSize: widgetSize, hitPadding: widgetPad },
                { id: 'debug-r1', kind: 'readout', binding: 'physics.G', visualSize: widgetSize, hitPadding: widgetPad },
                { id: 'debug-d1', kind: 'dial', binding: 'physics.softening', interaction: { kind: 'direct-drag', axis: 'x' }, visualSize: widgetSize, hitPadding: widgetPad },
              ],
            },
            {
              id: 'debug-row-2', kind: 'group', layout: 'row',
              children: [
                { id: 'debug-tg1', kind: 'toggle', binding: 'app.paused', style: 'switch', visualSize: widgetSize, hitPadding: widgetPad },
                { id: 'debug-st1', kind: 'stepper', binding: 'physics.count', step: 1000, visualSize: widgetSize, hitPadding: widgetPad },
                { id: 'debug-en1', kind: 'enum-chips', binding: 'physics.distribution', visualSize: widgetSize, hitPadding: widgetPad },
                { id: 'debug-pt1', kind: 'preset-tile', binding: 'preset.physics.Spiral Galaxy', visualSize: widgetSize, hitPadding: widgetPad },
                { id: 'debug-ct1', kind: 'category-tile', targetTabId: 'physics', summary: {}, visualSize: widgetSize, hitPadding: widgetPad },
              ],
            },
          ],
        });

        const tiltX = Math.sin(Math.PI * 0.33);
        const tiltW = Math.cos(Math.PI * 0.33);
        const clipboardOffset = {
          position: [0.00, 0.15, -0.10] as [number, number, number],
          orientation: [tiltX, 0, 0, tiltW] as [number, number, number, number],
        };
        const clipboardAnchor: Anchor = { kind: 'held', hand: XR_PANEL_HAND, offset: clipboardOffset };
        const sliderSize = { x: 0.17, y: 0.030 };
        const readoutSize = { x: 0.18, y: 0.025 };
        deps.uiRegistry.layouts.set('clipboard', {
          id: 'clipboard-panel', kind: 'panel',
          anchor: clipboardAnchor,
          size: { x: 0.20, y: 0.28 },
          children: [{
            id: 'clipboard-col', kind: 'group', layout: 'column', gap: 0.015,
            children: [
              { id: 'clipboard-title', kind: 'readout', binding: 'physics.G', visualSize: readoutSize, hitPadding: { x: 0, y: 0 } },
              { id: 'clipboard-G', kind: 'slider', binding: 'physics.G', orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' }, visualSize: sliderSize, hitPadding: HIG_DEFAULTS.defaultHitPadding },
              { id: 'clipboard-soft', kind: 'slider', binding: 'physics.softening', orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' }, visualSize: sliderSize, hitPadding: HIG_DEFAULTS.defaultHitPadding },
              { id: 'clipboard-int', kind: 'slider', binding: 'physics.interactionStrength', orientation: 'horizontal', interaction: { kind: 'direct-drag', axis: 'x' }, visualSize: sliderSize, hitPadding: HIG_DEFAULTS.defaultHitPadding },
            ],
          }],
        });
        deps.uiRegistry.activeLayoutId = 'clipboard';

        xrSession.addEventListener('visibilitychange', () => {
          deps.logInfo('xr', 'visibilitychange', {
            visibilityState: (xrSession as unknown as { visibilityState?: string } | null)?.visibilityState,
          });
        });

        xrSession.requestAnimationFrame(xrFrame);
        deps.logInfo('xr', 'first frame requested; waiting for xrFrame callback');

        xrSession.addEventListener('end', () => {
          deps.logInfo('xr', 'session ended', { finalPhase: deps.getCurrentPhase(), framesRendered: xrFrameCount });
          xrSession = null;
          xrBinding = null;
          xrLayer = null;
          deps.clearReferenceSpace();
          deps.setHandTrackingAvailable(false);
          deps.state.xrEnabled = false;
          xrFrameCount = 0;
          deps.setCurrentPhase('desktop');
          deps.markPostFxNeedsClear();
          deps.resetInputState();
          btn.textContent = 'Enter VR';
          deps.requestDesktopFrame();
        });
      } catch (e) {
        deps.logError('xr:toggle', e, `session failed to start (phase=${deps.getCurrentPhase()})`);
        btn.textContent = `XR Error: ${(e as Error).message}`;
        if (xrSession) {
          try { xrSession.end(); } catch (endErr) { deps.logError('xr:cleanup-end', endErr); }
        }
        xrSession = null;
        deps.clearReferenceSpace();
        deps.setHandTrackingAvailable(false);
        deps.setCurrentPhase('desktop');
        setTimeout(() => { btn.textContent = 'Enter VR'; }, 4000);
      }
    },
  };
}

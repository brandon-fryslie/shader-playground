import type { AppState, ModeParamsMap, RGBThemeColors, ShapeName, ShapeParamDef, ParamSection, SimMode, Simulation, ThemeColors } from '../types';
import { isPhysicsSimulation, type PhysicsSimulation } from '../simulations/types';
import { createControls, type ControlsApi, type ControlsConfig, type FxParamDef } from '../ui/controls';
import { createDebugPanel, type DebugPanel } from '../ui/debug-panel';
import { createShaderPanel, type ShaderPanel } from '../ui/shader-panel';
import { createThemeSystem, type ThemeSystem } from '../ui/theme';
import { updatePrompt as renderPrompt } from '../ui/prompt';
import type { Metrics, MetricSample } from '../metrics/bus';
import type { XrGestureEvent, XrStateEvent } from '../xr/input';
import type { AppActions } from './actions';

type ModeParamsAccess = (mode: SimMode) => Record<string, number | string | boolean>;

export interface UiCatalog {
  defaults: ModeParamsMap;
  defaultTheme: string;
  themeFadeMs: number;
  themes: Record<string, ThemeColors>;
  fxParamDefs: FxParamDef[];
  modeTabLabels: Record<SimMode, string>;
  paramDefs: Record<SimMode, ParamSection[]>;
  presets: Record<SimMode, Record<string, Record<string, number | string | boolean>>>;
  shapeParams: Partial<Record<ShapeName, Record<string, ShapeParamDef>>>;
}

export interface UiOrchestratorDeps {
  state: AppState;
  storageKey: string;
  modeParams: ModeParamsAccess;
  catalog: UiCatalog;

  // Actions enter through one channel; orchestrator constructs controls lazily,
  // so the actions object built around orchestrator methods can be injected at
  // construction time without circular evaluation.
  getActions(): AppActions;

  // Hooks the orchestrator can't compute itself.
  getCanvas(): HTMLCanvasElement;
  getPhysicsSimulation(): PhysicsSimulation | null;
  getActiveSimulation(): Simulation | undefined;
  getXrSession(): XRSession | null;
  toggleXr(): Promise<void>;
  setXrDebugLogging(on: boolean): void;
  createShaderModule(code: string): GPUShaderModule;

  // Shader catalog.
  applyShaderEdit(mode: SimMode, tabName: string, code: string): boolean;
  resetShaderEdit(mode: SimMode, tabName: string): string | null;
  getShaderSources(mode: SimMode): Record<string, string>;

  metrics: Metrics;
}

export interface UiOrchestrator {
  init(): void;

  // Per-frame theme access used by the render path.
  getThemeColors(): RGBThemeColors;
  refreshThemeColors(now: number): void;

  // Coordination called from actions / persistence / mode switches.
  syncThemeTransition(themeName: string): void;
  selectTheme(themeName: string): void;
  syncPauseButtons(): void;
  syncUiFromState(): void;

  // Routed from appActions.updateAll().
  updatePrompt(): void;
  updateShaderPanel(): void;

  // Debug-panel surface consumed by the frame runtime.
  cancelDebugMovement(): void;
  runDebugCompute(sim: Simulation, encoder: GPUCommandEncoder): void;
  updateAdaptiveChunk(deltaMs: number): void;
  updateDebugPanel(): void;
}

// [LAW:decomposition] Theme, controls, prompt, shader panel, debug panel,
// XR-record button, XR-enter button, and time-reverse keybindings are one
// face of the program — the UI surface that DOM events flow through. Cutting
// them behind one orchestrator removes the scattered forwarders that the
// runtime used to maintain to keep them coupled.
export function createUiOrchestrator(deps: UiOrchestratorDeps): UiOrchestrator {
  const { state, catalog, modeParams } = deps;

  let controlsApi: ControlsApi | null = null;
  let api: UiOrchestrator;

  const themeSystem: ThemeSystem = createThemeSystem({
    defaultTheme: catalog.defaultTheme,
    fadeMs: catalog.themeFadeMs,
    onThemeSelected: () => deps.getActions().updateAll(),
    state,
    themes: catalog.themes,
  });

  const debugPanel: DebugPanel = createDebugPanel({
    canvas: deps.getCanvas(),
    getPhysicsSimulation: deps.getPhysicsSimulation,
    state,
    syncPauseButtons: () => api.syncPauseButtons(),
  });

  const shaderPanel: ShaderPanel = createShaderPanel({
    applyShaderEdit: deps.applyShaderEdit,
    createShaderModule: deps.createShaderModule,
    getShaderSources: deps.getShaderSources,
    resetShaderEdit: deps.resetShaderEdit,
    state,
  });

  function getControlsApi(): ControlsApi {
    if (controlsApi) return controlsApi;
    controlsApi = createControls({
      actions: deps.getActions(),
      config: {
        fxParamDefs: catalog.fxParamDefs,
        modeTabLabels: catalog.modeTabLabels,
        paramDefs: catalog.paramDefs,
        presets: catalog.presets,
        shapeParams: catalog.shapeParams,
      } satisfies ControlsConfig,
      modeParams,
      setXrDebugLogging: deps.setXrDebugLogging,
      setupRecordButton,
      setupXRButton,
      state,
      storageKey: deps.storageKey,
      syncThemeButtons: (name) => themeSystem.syncThemeButtons(name),
    });
    return controlsApi;
  }

  function setupXRButton(): void {
    const btn = document.getElementById('btn-xr') as HTMLButtonElement;
    if (!navigator.xr) {
      btn.textContent = 'VR Not Available';
      return;
    }
    navigator.xr.isSessionSupported('immersive-vr').then((supported: boolean) => {
      if (supported) {
        btn.disabled = false;
        btn.addEventListener('click', () => { void deps.toggleXr(); });
      } else {
        btn.textContent = 'VR Not Supported';
      }
    }).catch(() => { btn.textContent = 'VR Check Failed'; });
  }

  // One-click XR record button: enter XR and begin an unbounded recording;
  // the recording terminates when the XR session ends (user exits). Samples
  // publish to console + window.__xrLastRecording on stop.
  function setupRecordButton(): void {
    const btn = document.getElementById('btn-xr-record') as HTMLButtonElement | null;
    if (!btn) return;
    const idleLabel = 'Record XR Session';
    const tick = () => {
      const s = deps.metrics.status();
      const session = deps.getXrSession();
      if (s.phase === 'idle') {
        btn.textContent = idleLabel;
        btn.disabled = !!session;
        return;
      }
      btn.textContent = 'Recording — exit XR to stop';
      btn.disabled = true;
      requestAnimationFrame(tick);
    };
    btn.addEventListener('click', async () => {
      if (deps.metrics.status().phase !== 'idle' || deps.getXrSession()) return;
      deps.metrics.record({}).then((samples) => {
        (window as unknown as { __xrLastRecording?: MetricSample[] }).__xrLastRecording = samples;
        const counts: Record<string, number> = {};
        for (const s of samples) counts[s.channel] = (counts[s.channel] ?? 0) + 1;
        const summary = Object.entries(counts).map(([c, n]) => `${c}: ${n}`).join(', ');
        // eslint-disable-next-line no-console
        console.group(`[xr] recording — ${samples.length} samples (${summary})`);
        for (const s of samples) {
          if (s.channel === 'xr.snap') continue;
          if (s.channel === 'xr.gesture'
            && (s.payload as XrGestureEvent).gesture.kind === 'pinch-hold') continue;
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
      await deps.toggleXr();
      const session = deps.getXrSession();
      if (!session) {
        deps.metrics.stop();
        return;
      }
      session.addEventListener('end', () => deps.metrics.stop(), { once: true });
    });
  }

  // [LAW:single-enforcer] Time-reverse input is owned here. Desktop: hold R.
  // Mobile: hold rewind FAB. The physics sim's setTimeDirection() is the
  // single channel for changing direction.
  function setupTimeReverseControls(): void {
    const setReverse = (active: boolean): void => {
      const sim = deps.getActiveSimulation();
      if (!isPhysicsSimulation(sim)) return;
      sim.setTimeDirection(active ? -1 : 1);
      if (!active && state.paused) state.paused = false;
    };

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setReverse(true);
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'r' || e.key === 'R') setReverse(false);
    });

    const fabRewind = document.getElementById('fab-rewind');
    if (fabRewind) {
      fabRewind.addEventListener('pointerdown', () => setReverse(true));
      fabRewind.addEventListener('pointerup', () => setReverse(false));
      fabRewind.addEventListener('pointercancel', () => setReverse(false));
      fabRewind.addEventListener('pointerleave', () => setReverse(false));
    }
  }

  api = {
    init() {
      const controls = getControlsApi();
      controls.buildControls();
      themeSystem.buildThemeSelector();
      controls.setupTabs();
      controls.setupGlobalControls();
      shaderPanel.setup();
      setupTimeReverseControls();
      debugPanel.setupControls();
    },
    getThemeColors: () => themeSystem.getThemeColors(),
    refreshThemeColors: (now) => themeSystem.refreshThemeColors(now),
    syncThemeTransition: (themeName) => themeSystem.syncThemeTransition(themeName),
    selectTheme: (themeName) => themeSystem.selectTheme(themeName),
    syncPauseButtons: () => getControlsApi().syncPauseButtons(),
    syncUiFromState: () => getControlsApi().syncUiFromState(),
    updatePrompt: () => renderPrompt(state, catalog.defaults, modeParams, catalog.defaultTheme),
    updateShaderPanel: () => shaderPanel.update(),
    cancelDebugMovement: () => debugPanel.cancelMovement(),
    runDebugCompute: (sim, encoder) => debugPanel.runCompute(sim, encoder),
    updateAdaptiveChunk: (deltaMs) => debugPanel.updateAdaptiveChunk(deltaMs),
    updateDebugPanel: () => debugPanel.updatePanel(),
  };
  return api;
}

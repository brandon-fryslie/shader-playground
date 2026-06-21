import type { AppState, ModeParamsMap, ParamSection, SimMode, Simulation, ThemeColors } from '../types';
import type { BindingRegistry } from '../xr-ui/bindings';
import type { GpuContext } from './gpu-context';
import type { AppActions } from './actions';
import type { UiOrchestrator } from './ui-orchestrator';
import type { PointerSystem } from '../input/pointer';
import type { MobileInput } from '../input/mobile';
import type { XrInputSystem } from '../xr/input';
import { loadState as hydrateState } from '../persistence/local-storage';
import { registerAppBindings, type FxBindingDef, type MetricsAccess } from './bindings';
import { installDevtools } from '../diagnostics/devtools';
import { evaluateAnchor } from '../xr-ui/anchors';
import { hitTestWidgets, layout as xrUiLayout } from '../xr-ui/layout';
import { applySideEffects as xrUiApplyEffects, makeIdlePrev as xrUiMakeIdlePrev, xrUiStep } from '../xr-ui/step';

type ModeParamsReader = (mode: SimMode) => Record<string, number | string | boolean>;

export interface AppStartupCatalog {
  defaults: ModeParamsMap;
  fxParamDefs: FxBindingDef[];
  modeTabLabels: Record<SimMode, string>;
  paramDefs: Record<SimMode, ParamSection[]>;
  presets: Record<SimMode, Record<string, Record<string, number | string | boolean>>>;
  themes: Record<string, ThemeColors>;
}

export interface AppStartupDeps {
  appActions: AppActions;
  bindingRegistry: BindingRegistry;
  catalog: AppStartupCatalog;
  ensureSimulation(): void;
  getCurrentSimulation(): Simulation | undefined;
  gpuContext: GpuContext;
  initGrid(): void;
  isMobile: boolean;
  metrics: MetricsAccess;
  mobileInput: MobileInput;
  modeParams: ModeParamsReader;
  pointerSystem: PointerSystem;
  state: AppState;
  uiOrchestrator: UiOrchestrator;
  xrInputSystem: XrInputSystem;
}

// [LAW:decomposition] One typed boundary owns the post-service-construction startup
// sequence: persistence hydration, mobile defaults, binding registration, UI init,
// control wiring, simulation ensure, initial render kick-off, and devtools.
// The runtime composition root builds services and hands them in; the order of
// the steps below is the only place that order lives.
export function runAppStartup(deps: AppStartupDeps): void {
  deps.initGrid();
  hydrateState(
    deps.state,
    deps.catalog.defaults,
    deps.catalog.themes,
    deps.modeParams,
    (themeName) => deps.uiOrchestrator.syncThemeTransition(themeName),
  );
  if (deps.isMobile) deps.mobileInput.applyMobileDefaults();
  deps.uiOrchestrator.syncThemeTransition(deps.state.colorTheme);

  registerAppBindings({
    actions: deps.appActions,
    fxParamDefs: deps.catalog.fxParamDefs,
    metrics: deps.metrics,
    modeParams: deps.modeParams,
    modeTabLabels: deps.catalog.modeTabLabels,
    paramDefs: deps.catalog.paramDefs,
    presets: deps.catalog.presets,
    registry: deps.bindingRegistry,
    state: deps.state,
    themes: deps.catalog.themes,
  });

  deps.uiOrchestrator.init();

  if (deps.isMobile) {
    deps.mobileInput.setupTouchControls();
    deps.mobileInput.setupFab();
    deps.mobileInput.setupBottomSheet();
  } else {
    deps.pointerSystem.setupMouseControls();
  }

  deps.uiOrchestrator.syncUiFromState();
  deps.gpuContext.frameRuntime.resize();
  deps.ensureSimulation();
  deps.appActions.updateAll();
  deps.gpuContext.frameRuntime.start();

  installDevtools({
    state: deps.state,
    getCurrentSimulation: deps.getCurrentSimulation,
    getGpuStats: () => deps.gpuContext.frameRuntime.getGpuStats(),
    bindings: deps.bindingRegistry,
    anchors: { evaluateAnchor, handFrames: deps.xrInputSystem.getHandFrames() },
    xrUi: {
      layout: xrUiLayout,
      hitTestWidgets,
      step: xrUiStep,
      applyEffects: xrUiApplyEffects,
      registry: deps.xrInputSystem.getUiRegistry(),
      makeIdlePrev: xrUiMakeIdlePrev,
      getRenderList: () => deps.xrInputSystem.getRenderList(),
      getPrev: () => deps.xrInputSystem.getPrev(),
      getClaimed: () => deps.xrInputSystem.getClaimed(),
    },
  });
}

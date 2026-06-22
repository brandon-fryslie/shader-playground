import type { AppState, ModeParamsMap, SimMode, Simulation, ThemeColors } from '../types';
import type { XrUiSession } from '@shader-playground/xr-ui';
import type { GpuContext } from './gpu-context';
import type { AppActions } from './actions';
import type { UiOrchestrator } from './ui-orchestrator';
import type { PointerSystem } from '../input/pointer';
import type { MobileInput } from '../input/mobile';
import type { XrInputSystem } from '../xr/input';
import { loadState as hydrateState } from '../persistence/local-storage';
import { installDevtools } from '../diagnostics/devtools';
import {
  evaluateAnchor,
  hitTestWidgets,
  layout as xrUiLayout,
  applySideEffects as xrUiApplyEffects,
  makeIdlePrev as xrUiMakeIdlePrev,
  xrUiStep,
} from '@shader-playground/xr-ui';

type ModeParamsReader = (mode: SimMode) => Record<string, number | string | boolean>;

export interface AppStartupCatalog {
  defaults: ModeParamsMap;
  themes: Record<string, ThemeColors>;
}

export interface AppStartupDeps {
  appActions: AppActions;
  // The XR menu session: the app's bindings are registered into it at
  // construction (composition root); startup reads its diagnostic surface for
  // the devtools probe. [LAW:composability]
  xrUiSession: XrUiSession;
  catalog: AppStartupCatalog;
  ensureSimulation(): void;
  getCurrentSimulation(): Simulation | undefined;
  gpuContext: GpuContext;
  initGrid(): void;
  isMobile: boolean;
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
    bindings: deps.xrUiSession.bindings,
    anchors: { evaluateAnchor, handFrames: deps.xrInputSystem.getHandFrames() },
    // The granular interaction surface is read from the session's escape hatch.
    // [LAW:no-mode-explosion] devtools is the advanced consumer the escape hatch
    // exists for; the happy path drives everything through the session.
    xrUi: {
      layout: xrUiLayout,
      hitTestWidgets,
      step: xrUiStep,
      applyEffects: xrUiApplyEffects,
      registry: deps.xrUiSession.registry,
      makeIdlePrev: xrUiMakeIdlePrev,
      getRenderList: () => deps.xrUiSession.getRenderList(),
      getPrev: () => deps.xrUiSession.getPrev(),
      getClaimed: () => deps.xrUiSession.getClaimed(),
    },
  });
}

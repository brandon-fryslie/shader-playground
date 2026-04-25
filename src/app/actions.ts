import type { AppState, SimMode } from '../types';

type ModeParamsAccess = (mode: SimMode) => Record<string, number | string | boolean>;

export interface AppActions {
  applyPreset(mode: SimMode, presetName: string): void;
  resetCurrentSimulation(): void;
  saveState(): void;
  selectMode(mode: SimMode): void;
  setPaused(paused: boolean): void;
  setTheme(themeName: string): void;
  updateAll(): void;
}

interface AppActionsDeps {
  cancelDebugMovement(): void;
  ensureSimulation(): void;
  modeParams: ModeParamsAccess;
  presets: Record<SimMode, Record<string, Record<string, number | string | boolean>>>;
  reflectPaused(): void;
  resetCurrentSimulationInternal(): void;
  saveStateInternal(): void;
  selectTheme(themeName: string): void;
  state: AppState;
  syncUi(): void;
  updatePrompt(): void;
  updateShaderPanel(): void;
  updateStats(): void;
}

export function createAppActions(deps: AppActionsDeps): AppActions {
  // [LAW:single-enforcer] App-level mutations flow through one action surface
  // so mode, pause, preset, theme, and persistence side effects cannot drift.
  const actions: AppActions = {
    applyPreset(mode, presetName) {
      Object.assign(deps.modeParams(mode), deps.presets[mode][presetName]);
      deps.resetCurrentSimulationInternal();
      deps.syncUi();
      actions.updateAll();
    },
    resetCurrentSimulation() {
      deps.resetCurrentSimulationInternal();
    },
    saveState() {
      deps.saveStateInternal();
    },
    selectMode(mode) {
      deps.state.mode = mode;
      deps.ensureSimulation();
      deps.syncUi();
      actions.updateAll();
    },
    setPaused(paused) {
      deps.state.paused = paused;
      if (paused) deps.cancelDebugMovement();
      deps.reflectPaused();
    },
    setTheme(themeName) {
      deps.selectTheme(themeName);
    },
    updateAll() {
      // [LAW:single-enforcer] App-wide UI-facing state recomputation runs
      // through one action so prompt, stats, shader UI, and persistence cannot drift.
      deps.updatePrompt();
      deps.updateStats();
      deps.updateShaderPanel();
      deps.saveStateInternal();
    },
  };
  return actions;
}

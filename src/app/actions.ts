import type { AppState, SimMode } from '../types';

type ModeParamsAccess = (mode: SimMode) => Record<string, number | string | boolean>;

export interface AppActions {
  applyPreset(mode: SimMode, presetName: string): void;
  flushSaveState(): void;
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
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function saveSoon(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      deps.saveStateInternal();
    }, 150);
  }

  // [LAW:single-enforcer] App-level mutations flow through one action surface
  // so mode, pause, preset, theme, and persistence side effects cannot drift.
  const actions: AppActions = {
    applyPreset(mode, presetName) {
      Object.assign(deps.modeParams(mode), deps.presets[mode][presetName]);
      deps.resetCurrentSimulationInternal();
      deps.syncUi();
      actions.updateAll();
    },
    flushSaveState() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      deps.saveStateInternal();
    },
    resetCurrentSimulation() {
      deps.resetCurrentSimulationInternal();
    },
    saveState() {
      saveSoon();
    },
    selectMode(mode) {
      deps.state.mode = mode;
      deps.ensureSimulation();
      deps.syncUi();
      actions.updateAll();
    },
    setPaused(paused) {
      // [LAW:dataflow-not-control-flow] A user pause toggle is authoritative
      // over any in-flight skip / manual-step queue. Unconditional cancel is a
      // no-op when nothing is pending.
      deps.state.paused = paused;
      deps.cancelDebugMovement();
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
      saveSoon();
    },
  };
  return actions;
}

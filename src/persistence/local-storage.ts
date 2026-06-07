import type { AppState, ModeParamsMap, SimMode, ThemeColors } from '../types';

export const STORAGE_KEY = 'shader-playground-state';

type ModeParamsReader = (mode: SimMode) => Record<string, number | string | boolean>;

// [LAW:single-enforcer] localStorage serialization is centralized here; callers provide canonical state and readers.
export function saveState(state: AppState, defaults: ModeParamsMap, modeParams: ModeParamsReader): void {
  try {
    const modeSnapshot: Record<string, unknown> = {};
    for (const mode of Object.keys(defaults) as SimMode[]) {
      modeSnapshot[mode] = modeParams(mode);
    }
    const toSave = {
      mode: state.mode,
      colorTheme: state.colorTheme,
      camera: state.camera,
      fx: state.fx,
      debug: state.debug,
      ...modeSnapshot,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Quota errors should not break simulation/rendering.
  }
}

// [LAW:one-source-of-truth] Hydration loops over DEFAULTS so supported modes are derived from the canonical registry.
export function loadState(
  state: AppState,
  defaults: ModeParamsMap,
  colorThemes: Record<string, ThemeColors>,
  modeParams: ModeParamsReader,
  syncThemeTransition: (themeName: string) => void,
): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    if (typeof parsed.mode === 'string' && parsed.mode in defaults) state.mode = parsed.mode as SimMode;
    if (typeof parsed.colorTheme === 'string' && colorThemes[parsed.colorTheme]) state.colorTheme = parsed.colorTheme;
    for (const mode of Object.keys(defaults) as SimMode[]) {
      if (parsed[mode] && typeof parsed[mode] === 'object') {
        Object.assign(modeParams(mode), parsed[mode]);
      }
    }
    if (parsed.camera && typeof parsed.camera === 'object') Object.assign(state.camera, parsed.camera);
    if (parsed.fx && typeof parsed.fx === 'object') Object.assign(state.fx, parsed.fx);
    if (parsed.debug && typeof parsed.debug === 'object') Object.assign(state.debug, parsed.debug);
    syncThemeTransition(state.colorTheme);
  } catch {
    // Invalid persisted state falls back to fresh defaults.
  }
}

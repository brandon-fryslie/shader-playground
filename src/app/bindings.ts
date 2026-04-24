import type { AppState, ParamSection, SimMode, ThemeColors } from '../types';
import type { BindingRegistry } from '../xr-ui/bindings';

type ModeParamsAccess = (mode: SimMode) => Record<string, number | string | boolean>;

export interface AppBindingsDependencies {
  applyPreset(mode: SimMode, presetName: string): void;
  modeParams: ModeParamsAccess;
  modeTabLabels: Record<SimMode, string>;
  paramDefs: Record<SimMode, ParamSection[]>;
  presets: Record<SimMode, Record<string, Record<string, number | string | boolean>>>;
  registry: BindingRegistry;
  selectMode(mode: SimMode): void;
  selectTheme(themeName: string): void;
  setPaused(paused: boolean): void;
  state: AppState;
  themes: Record<string, ThemeColors>;
}

// [LAW:one-source-of-truth] Binding registration owns the translation from
// app/catalog state into XR/widget Binding descriptors. Runtime code passes
// canonical state/actions; this module owns descriptor construction.
export function registerAppBindings(deps: AppBindingsDependencies): void {
  for (const mode of Object.keys(deps.paramDefs) as SimMode[]) {
    for (const section of deps.paramDefs[mode]) {
      if (section.dynamic) continue;
      for (const param of section.params) {
        if (param.type === 'dropdown') {
          deps.registry.register({
            kind: 'enum',
            id: `${mode}.${param.key}`,
            label: param.label,
            group: mode,
            get: () => String(deps.modeParams(mode)[param.key]),
            set: (v) => {
              const target = deps.modeParams(mode);
              const current = target[param.key];
              target[param.key] = typeof current === 'number' ? Number(v) : v;
            },
            options: (param.options ?? []).map((o) => ({ value: String(o), label: String(o) })),
          });
        } else if (param.type === 'toggle') {
          deps.registry.register({
            kind: 'toggle',
            id: `${mode}.${param.key}`,
            label: param.label,
            group: mode,
            get: () => Boolean(deps.modeParams(mode)[param.key]),
            set: (v) => { deps.modeParams(mode)[param.key] = v; },
          });
        } else if (param.min !== undefined && param.max !== undefined) {
          deps.registry.register({
            kind: 'continuous',
            id: `${mode}.${param.key}`,
            label: param.label,
            group: mode,
            get: () => Number(deps.modeParams(mode)[param.key]),
            set: (v) => { deps.modeParams(mode)[param.key] = v; },
            range: { min: param.min, max: param.max },
            step: param.step,
            scale: param.logScale ? 'log' : 'linear',
          });
        }
      }
    }
  }

  for (const mode of Object.keys(deps.presets) as SimMode[]) {
    for (const presetName of Object.keys(deps.presets[mode])) {
      deps.registry.register({
        kind: 'action',
        id: `preset.${mode}.${presetName}`,
        label: presetName,
        group: 'presets',
        invoke: () => deps.applyPreset(mode, presetName),
      });
    }
  }

  deps.registry.register({
    kind: 'enum',
    id: 'app.mode',
    label: 'Mode',
    group: 'app',
    get: () => deps.state.mode,
    set: (v) => deps.selectMode(v as SimMode),
    options: (Object.keys(deps.modeTabLabels) as SimMode[])
      .map((m) => ({ value: m, label: deps.modeTabLabels[m] })),
  });

  deps.registry.register({
    kind: 'enum',
    id: 'app.theme',
    label: 'Theme',
    group: 'app',
    get: () => deps.state.colorTheme,
    set: (v) => deps.selectTheme(v),
    options: Object.keys(deps.themes).map((name) => ({ value: name, label: name })),
  });

  deps.registry.register({
    kind: 'toggle',
    id: 'app.paused',
    label: 'Pause',
    group: 'app',
    get: () => deps.state.paused,
    set: (v) => deps.setPaused(v),
  });
}

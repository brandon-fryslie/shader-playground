import type { AppState, FxParams, ParamSection, SimMode, ThemeColors } from '../types';
import type { BindingRegistry } from '../xr-ui/bindings';
import type { AppActions } from './actions';

type ModeParamsAccess = (mode: SimMode) => Record<string, number | string | boolean>;

export interface FxBindingDef {
  key: keyof FxParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface AppBindingsDependencies {
  actions: AppActions;
  fxParamDefs: FxBindingDef[];
  modeParams: ModeParamsAccess;
  modeTabLabels: Record<SimMode, string>;
  paramDefs: Record<SimMode, ParamSection[]>;
  presets: Record<SimMode, Record<string, Record<string, number | string | boolean>>>;
  registry: BindingRegistry;
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
        invoke: () => deps.actions.applyPreset(mode, presetName),
      });
    }
  }

  deps.registry.register({
    kind: 'enum',
    id: 'app.mode',
    label: 'Mode',
    group: 'app',
    get: () => deps.state.mode,
    set: (v) => deps.actions.selectMode(v as SimMode),
    options: (Object.keys(deps.modeTabLabels) as SimMode[])
      .map((m) => ({ value: m, label: deps.modeTabLabels[m] })),
  });

  deps.registry.register({
    kind: 'enum',
    id: 'app.theme',
    label: 'Theme',
    group: 'app',
    get: () => deps.state.colorTheme,
    set: (v) => deps.actions.setTheme(v),
    options: Object.keys(deps.themes).map((name) => ({ value: name, label: name })),
  });

  deps.registry.register({
    kind: 'toggle',
    id: 'app.paused',
    label: 'Pause',
    group: 'app',
    get: () => deps.state.paused,
    set: (v) => deps.actions.setPaused(v),
  });

  // FX (post-processing) sliders. Group 'visuals' so the XR panel's Visuals
  // tab can pick them up via filterByGroup. The XR layout cherry-picks which
  // ones to surface — registering all keeps the same descriptor available to
  // DOM controls and to any future panel without duplicating the closures.
  for (const def of deps.fxParamDefs) {
    deps.registry.register({
      kind: 'continuous',
      id: `fx.${def.key}`,
      label: def.label,
      group: 'visuals',
      get: () => deps.state.fx[def.key],
      set: (v) => { deps.state.fx[def.key] = v; },
      range: { min: def.min, max: def.max },
      step: def.step,
    });
  }
}

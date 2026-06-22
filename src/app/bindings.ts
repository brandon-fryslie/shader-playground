import type { AppState, FxParams, ParamSection, SimMode, ThemeColors } from '../types';
import type { BindingRegistry } from '@shader-playground/xr-ui';
import type { AppActions } from './actions';

type ModeParamsAccess = (mode: SimMode) => Record<string, number | string | boolean>;

export interface FxBindingDef {
  key: keyof FxParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

// Read-only snapshot of runtime diagnostic counters. [LAW:one-source-of-truth]
// The owners (frame stats, GPU timing, error log) stay the canonical source;
// this is the get-only window the metrics bindings expose to readout widgets.
export interface MetricsAccess {
  fps(): number;
  gpuMs(): number;
  errorCount(): number;
}

export interface AppBindingsDependencies {
  actions: AppActions;
  fxParamDefs: FxBindingDef[];
  metrics: MetricsAccess;
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

  // Runtime metrics surfaced to the in-XR debug HUD (ticket .22). Read-only
  // continuous bindings: `set` is a no-op because nothing should write FPS or
  // GPU frame time back at the runtime. [LAW:no-silent-failure] readout widgets
  // never invoke `set`, so a no-op here can't be mistaken for "value applied" —
  // it's silenced at the type level by the widget that consumes it. The format
  // closures keep the HUD label legible at headset distance (one decimal for
  // sub-millisecond GPU times, integer count for FPS / errors).
  deps.registry.register({
    kind: 'continuous',
    id: 'metrics.fps',
    label: 'FPS',
    group: 'metrics',
    get: () => deps.metrics.fps(),
    set: () => {},
    range: { min: 0, max: 120 },
    format: (v) => `${Math.round(v)} fps`,
  });
  deps.registry.register({
    kind: 'continuous',
    id: 'metrics.gpuMs',
    label: 'GPU',
    group: 'metrics',
    get: () => deps.metrics.gpuMs(),
    set: () => {},
    range: { min: 0, max: 50 },
    format: (v) => `${v.toFixed(1)} ms`,
  });
  deps.registry.register({
    kind: 'continuous',
    id: 'metrics.errorCount',
    label: 'Errors',
    group: 'metrics',
    get: () => deps.metrics.errorCount(),
    set: () => {},
    range: { min: 0, max: 100 },
    format: (v) => `${Math.round(v)} err`,
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

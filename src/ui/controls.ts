import type { AppState, ParamDef, ParamSection, ShapeName, ShapeParamDef, SimMode } from '../types';

type ModeParamsAccess = (mode: SimMode) => Record<string, number | string | boolean>;

export interface FxParamDef {
  key: keyof AppState['fx'];
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface ControlsConfig {
  fxParamDefs: FxParamDef[];
  modeTabLabels: Record<SimMode, string>;
  paramDefs: Record<SimMode, ParamSection[]>;
  presets: Record<SimMode, Record<string, Record<string, number | string | boolean>>>;
  shapeParams: Partial<Record<ShapeName, Record<string, ShapeParamDef>>>;
}

export interface ControlsDependencies {
  cancelDebugMovement(): void;
  config: ControlsConfig;
  ensureSimulation(): void;
  modeParams: ModeParamsAccess;
  resetCurrentSimulation(): void;
  saveState(): void;
  setXrDebugLogging(enabled: boolean): void;
  setupRecordButton(): void;
  setupXRButton(): void;
  state: AppState;
  storageKey: string;
  syncThemeButtons(themeName: string): void;
  updateAll(): void;
}

export interface ControlsApi {
  applyPreset(mode: SimMode, presetName: string): void;
  buildControls(): void;
  selectMode(mode: SimMode): void;
  setupGlobalControls(): void;
  setupTabs(): void;
  syncPauseButtons(): void;
  syncUiFromState(): void;
}

const LOG_SLIDER_TICKS = 1000;

export function createControls(deps: ControlsDependencies): ControlsApi {
  const { config, state } = deps;

  function applyShapeDefaults(shape: string) {
    const sp = config.shapeParams[shape as ShapeName] ?? {};
    const p = state.parametric;
    if (sp.p1) { p.p1Min = sp.p1.animMin; p.p1Max = sp.p1.animMax; p.p1Rate = sp.p1.animRate; }
    else { p.p1Min = 0; p.p1Max = 0; p.p1Rate = 0; }
    if (sp.p2) { p.p2Min = sp.p2.animMin; p.p2Max = sp.p2.animMax; p.p2Rate = sp.p2.animRate; }
    else { p.p2Min = 0; p.p2Max = 0; p.p2Rate = 0; }
  }

  function findParamDef(mode: SimMode, key: string): ParamDef | null {
    for (const section of config.paramDefs[mode]) {
      for (const param of section.params) {
        if (param.key === key) return param;
      }
    }
    return null;
  }

  function formatValue(val: number, step: number) {
    if (step >= 1) return String(Math.round(val));
    const decimals = Math.max(0, -Math.floor(Math.log10(step)));
    return val.toFixed(decimals);
  }

  // [LAW:single-enforcer] Slider readouts are formatted in one place so max-label
  // behavior does not drift between live edits, preset application, and load sync.
  function formatValueWithMax(val: number, def: ParamDef | null): string {
    const step = def?.step ?? 0.01;
    if (def?.maxLabel !== undefined && def.max !== undefined && val >= def.max - step / 2) {
      return def.maxLabel;
    }
    return formatValue(val, step);
  }

  // [LAW:dataflow-not-control-flow] Log sliders always use the same DOM shape.
  // The input stays linear in tick-space; only the value mapping changes.
  function realToLogTick(real: number, min: number, max: number): number {
    const t = (Math.log(real) - Math.log(min)) / (Math.log(max) - Math.log(min));
    return Math.round(LOG_SLIDER_TICKS * Math.max(0, Math.min(1, t)));
  }

  function logTickToReal(tick: number, min: number, max: number): number {
    const t = tick / LOG_SLIDER_TICKS;
    return Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)));
  }

  function buildFxSection(container: HTMLElement) {
    const secDiv = document.createElement('div');
    secDiv.className = 'param-section';
    const title = document.createElement('div');
    title.className = 'param-section-title';
    title.textContent = 'Visual FX';
    secDiv.appendChild(title);

    for (const def of config.fxParamDefs) {
      const row = document.createElement('div');
      row.className = 'control-row';
      const label = document.createElement('span');
      label.className = 'control-label';
      label.textContent = def.label;
      row.appendChild(label);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(def.min);
      input.max = String(def.max);
      input.step = String(def.step);
      input.value = String(state.fx[def.key]);
      const valueSpan = document.createElement('span');
      valueSpan.className = 'control-value';
      valueSpan.textContent = formatValue(state.fx[def.key], def.step);
      input.addEventListener('input', () => {
        const val = Number(input.value);
        state.fx[def.key] = val;
        valueSpan.textContent = formatValue(val, def.step);
        deps.saveState();
      });
      row.appendChild(input);
      row.appendChild(valueSpan);
      secDiv.appendChild(row);
    }
    container.appendChild(secDiv);
  }

  function buildParamRow(container: HTMLElement, mode: SimMode, param: ParamDef) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const label = document.createElement('span');
    label.className = 'control-label';
    label.textContent = param.label;
    row.appendChild(label);

    if (param.type === 'dropdown') {
      const select = document.createElement('select');
      select.dataset.mode = mode;
      select.dataset.key = param.key;
      for (const opt of param.options ?? []) {
        const option = document.createElement('option');
        option.value = String(opt);
        option.textContent = String(opt);
        select.appendChild(option);
      }
      select.value = String(deps.modeParams(mode)[param.key]);
      select.addEventListener('change', () => {
        const val = Number.isNaN(Number(select.value)) ? select.value : Number(select.value);
        deps.modeParams(mode)[param.key] = val;
        if (param.requiresReset) deps.resetCurrentSimulation();
        if (param.key === 'shape') {
          applyShapeDefaults(String(val));
          rebuildShapeParams();
        }
        deps.updateAll();
      });
      row.appendChild(select);
    } else if (param.type === 'toggle') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(deps.modeParams(mode)[param.key]);
      input.dataset.mode = mode;
      input.dataset.key = param.key;
      input.addEventListener('change', () => {
        deps.modeParams(mode)[param.key] = input.checked;
        if (param.requiresReset) deps.resetCurrentSimulation();
        deps.updateAll();
      });
      row.appendChild(input);
    } else {
      const input = document.createElement('input');
      input.type = 'range';
      if (param.logScale && param.min !== undefined && param.max !== undefined) {
        input.min = '0';
        input.max = String(LOG_SLIDER_TICKS);
        input.step = '1';
        input.value = String(realToLogTick(Number(deps.modeParams(mode)[param.key]), param.min, param.max));
        input.dataset.logScale = '1';
      } else {
        input.min = String(param.min);
        input.max = String(param.max);
        input.step = String(param.step);
        input.value = String(deps.modeParams(mode)[param.key]);
      }
      input.dataset.mode = mode;
      input.dataset.key = param.key;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'control-value';
      valueSpan.textContent = formatValueWithMax(Number(deps.modeParams(mode)[param.key]), param);

      input.addEventListener('input', () => {
        const val = (param.logScale && param.min !== undefined && param.max !== undefined)
          ? logTickToReal(Number(input.value), param.min, param.max)
          : Number(input.value);
        deps.modeParams(mode)[param.key] = val;
        valueSpan.textContent = formatValueWithMax(val, param);
        if (param.requiresReset) {
          input.dataset.needsReset = '1';
        }
        deps.updateAll();
      });
      input.addEventListener('change', () => {
        if (input.dataset.needsReset === '1') {
          input.dataset.needsReset = '0';
          deps.resetCurrentSimulation();
        }
      });

      row.appendChild(input);
      row.appendChild(valueSpan);
    }

    container.appendChild(row);
  }

  function rebuildShapeParams() {
    const container = document.getElementById('shape-params-section');
    if (!container) return;

    while (container.children.length > 1) container.removeChild(container.lastChild!);

    const shape = state.parametric.shape;
    const sp = config.shapeParams[shape] ?? {};

    for (const [pKey, def] of Object.entries(sp)) {
      const subLabel = document.createElement('div');
      subLabel.className = 'anim-param-label';
      subLabel.textContent = def.label;
      container.appendChild(subLabel);
      buildParamRow(container, 'parametric', { key: `${pKey}Min`, label: 'Min', min: def.min, max: def.max, step: def.step });
      buildParamRow(container, 'parametric', { key: `${pKey}Max`, label: 'Max', min: def.min, max: def.max, step: def.step });
      buildParamRow(container, 'parametric', { key: `${pKey}Rate`, label: 'Rate', min: 0.0, max: 3.0, step: 0.05 });
    }
  }

  function syncActiveModeUi(mode: SimMode) {
    document.querySelectorAll<HTMLElement>('.mode-tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.mode === mode));
    document.querySelectorAll<HTMLElement>('.param-group').forEach((g) =>
      g.classList.toggle('active', g.dataset.mode === mode));
    document.querySelectorAll<HTMLElement>('.debug-panel').forEach((g) =>
      g.classList.toggle('active', g.dataset.mode === mode));
    const stepperLabel = document.getElementById('mode-stepper-label');
    if (stepperLabel) stepperLabel.textContent = config.modeTabLabels[mode];
  }

  function syncPauseButtons() {
    const btn = document.getElementById('btn-pause');
    if (btn) {
      btn.textContent = state.paused ? 'Resume' : 'Pause';
      btn.classList.toggle('active', state.paused);
    }
    const fab = document.getElementById('fab-pause');
    if (fab) {
      fab.textContent = state.paused ? '\u25B6' : '\u23F8';
      fab.classList.toggle('active', state.paused);
    }
  }

  function setPaused(paused: boolean) {
    state.paused = paused;
    if (paused) deps.cancelDebugMovement();
    syncPauseButtons();
  }

  function applyPreset(mode: SimMode, presetName: string) {
    const preset = config.presets[mode][presetName];
    Object.assign(deps.modeParams(mode), preset);

    const container = document.getElementById(`params-${mode}`)!;
    container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
      const key = input.dataset.key!;
      if (key in preset) {
        const paramDef = findParamDef(mode, key);
        const realVal = Number(preset[key]);
        input.value = (paramDef?.logScale && paramDef.min !== undefined && paramDef.max !== undefined)
          ? String(realToLogTick(realVal, paramDef.min, paramDef.max))
          : String(preset[key]);
        const valueSpan = input.parentElement?.querySelector('.control-value');
        if (valueSpan) valueSpan.textContent = formatValueWithMax(realVal, paramDef);
      }
    });
    container.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
      const key = sel.dataset.key!;
      if (key in preset) sel.value = String(preset[key]);
    });

    container.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === presetName);
    });

    if (mode === 'parametric') {
      rebuildShapeParams();
    }

    deps.resetCurrentSimulation();
    deps.updateAll();
  }

  function buildControls() {
    for (const [modeStr, sections] of Object.entries(config.paramDefs)) {
      const mode = modeStr as SimMode;
      const container = document.getElementById(`params-${mode}`)!;
      const presetsDiv = document.createElement('div');
      presetsDiv.className = 'presets';

      for (const presetName of Object.keys(config.presets[mode])) {
        const btn = document.createElement('button');
        btn.className = 'preset-btn' + (presetName === 'Default' ? ' active' : '');
        btn.textContent = presetName;
        btn.dataset.preset = presetName;
        btn.dataset.mode = mode;
        btn.addEventListener('click', () => applyPreset(mode, presetName));
        presetsDiv.appendChild(btn);
      }
      container.appendChild(presetsDiv);

      for (const section of sections) {
        const secDiv = document.createElement('div');
        secDiv.className = 'param-section';
        const title = document.createElement('div');
        title.className = 'param-section-title';
        title.textContent = section.section;
        secDiv.appendChild(title);

        if (section.dynamic) {
          secDiv.id = section.id ?? '';
          container.appendChild(secDiv);
          continue;
        }

        for (const param of section.params) {
          buildParamRow(secDiv, mode, param);
        }

        container.appendChild(secDiv);
      }

      buildFxSection(container);
    }
  }

  // [LAW:one-source-of-truth] Mode changes flow through one helper so DOM state,
  // simulation lifecycle, and persisted app state cannot drift.
  function selectMode(mode: SimMode): void {
    state.mode = mode;
    syncActiveModeUi(mode);
    deps.ensureSimulation();
    deps.updateAll();
  }

  function setupTabs() {
    document.querySelectorAll<HTMLElement>('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode as SimMode;
        selectMode(mode);
      });
    });
  }

  function setupGlobalControls() {
    document.getElementById('btn-pause')!.addEventListener('click', () => {
      setPaused(!state.paused);
    });

    document.getElementById('btn-reset')!.addEventListener('click', () => {
      deps.resetCurrentSimulation();
    });

    document.getElementById('copy-btn')!.addEventListener('click', () => {
      const text = document.getElementById('prompt-text')!.textContent ?? '';
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn')!;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    });

    document.getElementById('btn-reset-all')!.addEventListener('click', () => {
      localStorage.removeItem(deps.storageKey);
      location.reload();
    });

    deps.setupRecordButton();

    const xrLogToggle = document.getElementById('toggle-xr-log') as HTMLInputElement;
    xrLogToggle.addEventListener('change', () => {
      state.debug.xrLog = xrLogToggle.checked;
      deps.setXrDebugLogging(state.debug.xrLog);
      deps.saveState();
    });

    deps.setupXRButton();
  }

  function syncUiFromState() {
    syncActiveModeUi(state.mode);

    for (const modeStr of Object.keys(config.paramDefs)) {
      const mode = modeStr as SimMode;
      const container = document.getElementById(`params-${mode}`)!;
      const params = deps.modeParams(mode);
      container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
        const key = input.dataset.key!;
        if (key && key in params) {
          const paramDef = findParamDef(mode, key);
          const realVal = Number(params[key]);
          input.value = (paramDef?.logScale && paramDef.min !== undefined && paramDef.max !== undefined)
            ? String(realToLogTick(realVal, paramDef.min, paramDef.max))
            : String(params[key]);
          const valueSpan = input.parentElement?.querySelector('.control-value');
          if (valueSpan) valueSpan.textContent = formatValueWithMax(realVal, paramDef);
        }
      });
      container.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
        const key = sel.dataset.key!;
        if (key && key in params) sel.value = String(params[key]);
      });
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
        const key = input.dataset.key!;
        if (key && key in params) input.checked = Boolean(params[key]);
      });
    }

    deps.syncThemeButtons(state.colorTheme);

    const xrLogToggle = document.getElementById('toggle-xr-log') as HTMLInputElement | null;
    if (xrLogToggle) xrLogToggle.checked = state.debug.xrLog;
    deps.setXrDebugLogging(state.debug.xrLog);

    rebuildShapeParams();
    syncPauseButtons();
  }

  return {
    applyPreset,
    buildControls,
    selectMode,
    setupGlobalControls,
    setupTabs,
    syncPauseButtons,
    syncUiFromState,
  };
}

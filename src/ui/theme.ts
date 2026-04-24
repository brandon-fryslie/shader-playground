import type { AppState, RGBThemeColors, ThemeColors } from '../types';

export interface ThemeSystemDependencies {
  defaultTheme: string;
  fadeMs: number;
  onThemeSelected(): void;
  state: AppState;
  themes: Record<string, ThemeColors>;
}

export interface ThemeSystem {
  buildThemeSelector(): void;
  getThemeColors(): RGBThemeColors;
  refreshThemeColors(now: number): void;
  selectTheme(themeName: string, now?: number): void;
  startThemeTransition(themeName: string, now?: number): void;
  syncThemeButtons(themeName: string): void;
  syncThemeTransition(themeName: string): void;
}

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function mixRgb(a: number[], b: number[], t: number): number[] {
  return a.map((value, index) => value + (b[index] - value) * t);
}

export function createThemeSystem(deps: ThemeSystemDependencies): ThemeSystem {
  function getThemeColorsForName(themeName: string): RGBThemeColors {
    const t = deps.themes[themeName] || deps.themes[deps.defaultTheme];
    return {
      primary: hexToRgb(t.primary),
      secondary: hexToRgb(t.secondary),
      accent: hexToRgb(t.accent),
      bg: hexToRgb(t.bg),
      fg: hexToRgb(t.fg),
      clearColor: { r: hexToRgb(t.bg)[0], g: hexToRgb(t.bg)[1], b: hexToRgb(t.bg)[2], a: 1 },
    };
  }

  function mixThemeColors(from: RGBThemeColors, to: RGBThemeColors, t: number): RGBThemeColors {
    const bg = mixRgb(from.bg, to.bg, t);
    return {
      primary: mixRgb(from.primary, to.primary, t),
      secondary: mixRgb(from.secondary, to.secondary, t),
      accent: mixRgb(from.accent, to.accent, t),
      bg,
      fg: mixRgb(from.fg, to.fg, t),
      clearColor: { r: bg[0], g: bg[1], b: bg[2], a: 1 },
    };
  }

  // [LAW:one-source-of-truth] Selected theme name is canonical; animated render
  // colors are derived from one transition state owned by this module.
  const themeTransition = {
    from: getThemeColorsForName(deps.defaultTheme),
    to: getThemeColorsForName(deps.defaultTheme),
    startedAtMs: 0,
  };

  let currentThemeColors = getThemeColorsForName(deps.defaultTheme);

  function computeThemeColors(now: number): RGBThemeColors {
    const progress = Math.max(0, Math.min(1, (now - themeTransition.startedAtMs) / deps.fadeMs));
    return mixThemeColors(themeTransition.from, themeTransition.to, progress);
  }

  function getThemeColors(): RGBThemeColors {
    return currentThemeColors;
  }

  function refreshThemeColors(now: number): void {
    currentThemeColors = computeThemeColors(now);
  }

  function syncThemeButtons(themeName: string): void {
    document.querySelectorAll<HTMLButtonElement>('#theme-presets .preset-btn').forEach((btn) =>
      btn.classList.toggle('active', btn.dataset.theme === themeName));
  }

  function syncThemeTransition(themeName: string): void {
    const colors = getThemeColorsForName(themeName);
    themeTransition.from = colors;
    themeTransition.to = colors;
    themeTransition.startedAtMs = 0;
    currentThemeColors = colors;
    syncThemeButtons(themeName);
  }

  function startThemeTransition(themeName: string, now = performance.now()): void {
    const nextColors = getThemeColorsForName(themeName);
    const currentColors = computeThemeColors(now);
    themeTransition.from = currentColors;
    themeTransition.to = nextColors;
    themeTransition.startedAtMs = now;
    currentThemeColors = currentColors;
    syncThemeButtons(themeName);
  }

  function selectTheme(themeName: string, now = performance.now()): void {
    if (deps.state.colorTheme === themeName) return;
    deps.state.colorTheme = themeName;
    startThemeTransition(themeName, now);
    deps.onThemeSelected();
  }

  function buildThemeSelector() {
    const container = document.getElementById('theme-presets')!;
    for (const name of Object.keys(deps.themes)) {
      const theme = deps.themes[name];
      const btn = document.createElement('button');
      btn.className = 'preset-btn' + (name === deps.state.colorTheme ? ' active' : '');
      btn.textContent = name;
      btn.dataset.theme = name;
      btn.style.borderLeftWidth = '3px';
      btn.style.borderLeftColor = theme.primary;
      btn.addEventListener('click', () => {
        selectTheme(name);
      });
      container.appendChild(btn);
    }
  }

  return {
    buildThemeSelector,
    getThemeColors,
    refreshThemeColors,
    selectTheme,
    startThemeTransition,
    syncThemeButtons,
    syncThemeTransition,
  };
}

import type { SimMode } from '../types';

export interface ShaderPanel {
  setup(): void;
  update(): void;
}

interface ShaderPanelDeps {
  applyShaderEdit(mode: SimMode, tabName: string, code: string): boolean;
  createShaderModule(code: string): GPUShaderModule;
  getShaderSources(mode: SimMode): Record<string, string>;
  resetShaderEdit(mode: SimMode, tabName: string): string | null;
  state: { mode: SimMode };
}

export function createShaderPanel(deps: ShaderPanelDeps): ShaderPanel {
  let panelOpen = false;
  let activeTab: string | null = null;
  let currentMode: SimMode | null = null;
  let currentSources: Record<string, string> = {};
  let originalSources: Record<string, string> = {};

  function saveEditorContent(): void {
    if (!activeTab) return;
    currentSources[activeTab] = (document.getElementById('shader-editor') as HTMLTextAreaElement).value;
  }

  function loadEditorContent(): void {
    const editor = document.getElementById('shader-editor') as HTMLTextAreaElement;
    const status = document.getElementById('shader-status')!;
    editor.value = activeTab ? (currentSources[activeTab] || '') : '';
    status.textContent = '';
    status.className = 'shader-success';
  }

  function refreshTabs(): void {
    const sources = deps.getShaderSources(deps.state.mode);
    originalSources = { ...sources };
    if (currentMode !== deps.state.mode) {
      currentMode = deps.state.mode;
      currentSources = { ...sources };
    }

    const tabs = document.getElementById('shader-tabs')!;
    tabs.innerHTML = '';
    const names = Object.keys(sources);
    activeTab = activeTab && names.includes(activeTab) ? activeTab : names[0] ?? null;

    for (const name of names) {
      const tab = document.createElement('button');
      tab.className = `shader-tab${name === activeTab ? ' active' : ''}`;
      tab.textContent = name;
      tab.addEventListener('click', () => {
        saveEditorContent();
        activeTab = name;
        tabs.querySelectorAll('.shader-tab').forEach((button) => {
          button.classList.toggle('active', button.textContent === name);
        });
        loadEditorContent();
      });
      tabs.appendChild(tab);
    }

    loadEditorContent();
  }

  function compileEditedShader(): void {
    saveEditorContent();
    if (!activeTab) return;
    const tabName = activeTab;
    const code = currentSources[tabName];
    const status = document.getElementById('shader-status')!;

    try {
      const module = deps.createShaderModule(code);
      module.getCompilationInfo().then((info) => {
        const errors = info.messages.filter((message) => message.type === 'error');
        if (errors.length > 0) {
          status.className = 'shader-error';
          status.textContent = errors.map((error) => `Line ${error.lineNum}: ${error.message}`).join('; ');
          status.title = errors.map((error) => `Line ${error.lineNum}: ${error.message}`).join('\n');
          return;
        }
        const applied = deps.applyShaderEdit(deps.state.mode, tabName, code);
        if (!applied) {
          status.className = 'shader-error';
          status.textContent = `Shader tab "${tabName}" is not editable from this panel`;
          status.title = status.textContent;
          return;
        }
        status.className = 'shader-success';
        status.textContent = 'Compiled OK - reset simulation to apply';
        status.title = '';
      });
    } catch (error) {
      status.className = 'shader-error';
      status.textContent = (error as Error).message;
      status.title = (error as Error).message;
    }
  }

  function resetEditedShader(): void {
    if (!activeTab || !originalSources[activeTab]) return;
    const resetSource = deps.resetShaderEdit(deps.state.mode, activeTab);
    if (resetSource === null) {
      const status = document.getElementById('shader-status')!;
      status.className = 'shader-error';
      status.textContent = `Shader tab "${activeTab}" is not editable from this panel`;
      status.title = status.textContent;
      return;
    }
    currentSources[activeTab] = resetSource;
    loadEditorContent();
    const status = document.getElementById('shader-status')!;
    status.className = 'shader-success';
    status.textContent = 'Shader reset to original';
  }

  return {
    setup() {
      const toggle = document.getElementById('shader-toggle')!;
      const panel = document.getElementById('shader-panel')!;

      toggle.addEventListener('click', () => {
        panelOpen = !panelOpen;
        panel.classList.toggle('open', panelOpen);
        toggle.classList.toggle('active', panelOpen);
        if (panelOpen) refreshTabs();
      });

      document.getElementById('shader-compile')!.addEventListener('click', compileEditedShader);
      document.getElementById('shader-reset')!.addEventListener('click', resetEditedShader);
      document.getElementById('shader-editor')!.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        const editor = event.target as HTMLTextAreaElement;
        const start = editor.selectionStart;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(editor.selectionEnd);
        editor.selectionStart = start + 2;
        editor.selectionEnd = start + 2;
      });
    },
    update() {
      if (!panelOpen) return;
      if (currentMode !== deps.state.mode) refreshTabs();
    },
  };
}

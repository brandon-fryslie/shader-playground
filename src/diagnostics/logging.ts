import type { SimMode } from '../types';

interface ErrorLogEntry {
  t: number;
  kind: string;
  phase: string;
  msg: string;
  stack?: string;
}

export interface DiagnosticsLogger {
  createShaderModuleChecked(label: string, code: string): GPUShaderModule;
  createShaderModuleCheckedForDevice(device: GPUDevice, label: string, code: string): GPUShaderModule;
  installGlobalHandlers(): void;
  logError(kind: string, err: unknown, extra?: string): void;
  logInfo(kind: string, msg: string, ...extra: unknown[]): void;
  showSimError(mode: SimMode, msg: string): void;
}

export interface DiagnosticsLoggerOptions {
  getDevice: () => GPUDevice;
  getPhase: () => string;
}

const ERROR_LOG_MAX = 200;

function showErrorOverlay(line: string): void {
  let overlay = document.getElementById('gpu-error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gpu-error-overlay';
    overlay.style.cssText = 'position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;';
    document.body.appendChild(overlay);
  }
  const stamp = new Date().toLocaleTimeString();
  overlay.textContent = `[${stamp}] ${line}\n\n` + overlay.textContent;
}

export function createDiagnosticsLogger(options: DiagnosticsLoggerOptions): DiagnosticsLogger {
  const errorLog: ErrorLogEntry[] = [];
  let handlersInstalled = false;

  const logError = (kind: string, err: unknown, extra?: string): void => {
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
    const phase = options.getPhase();
    const msg = extra ? `${extra}: ${e.message}` : e.message;
    const entry: ErrorLogEntry = {
      t: performance.now(),
      kind,
      phase,
      msg,
      stack: e.stack,
    };
    errorLog.push(entry);
    if (errorLog.length > ERROR_LOG_MAX) errorLog.splice(0, errorLog.length - ERROR_LOG_MAX);
    console.error(`[${kind}] (phase=${phase})`, msg, e.stack || '');
    showErrorOverlay(`[${kind}] (phase=${phase}) ${msg}`);
  };

  const logInfo = (kind: string, msg: string, ...extra: unknown[]): void => {
    console.info(`[${kind}] (phase=${options.getPhase()})`, msg, ...extra);
  };

  const installGlobalHandlers = (): void => {
    if (handlersInstalled) return;
    handlersInstalled = true;
    // [LAW:single-enforcer] Global async/browser error capture is installed in one
    // place so all runtime surfaces share the same overlay + phase attribution.
    (globalThis as unknown as { __errorLog: () => ErrorLogEntry[] }).__errorLog = () => errorLog.slice();
    (globalThis as unknown as { __gpuPhase: () => string }).__gpuPhase = options.getPhase;
    window.addEventListener('error', (ev) => {
      logError('window.error', ev.error ?? ev.message, `at ${ev.filename}:${ev.lineno}:${ev.colno}`);
    });
    window.addEventListener('unhandledrejection', (ev) => {
      logError('unhandledrejection', ev.reason);
    });
  };

  // [LAW:single-enforcer] Shader compilation diagnostics stay in one service;
  // boot passes the fresh device explicitly before the runtime context exists.
  const createShaderModuleCheckedForDevice = (device: GPUDevice, label: string, code: string): GPUShaderModule => {
    const module = device.createShaderModule({ label, code });
    module.getCompilationInfo().then((info) => {
      if (info.messages.length === 0) return;
      const lines = code.split('\n');
      let hasError = false;
      for (const m of info.messages) {
        const srcLine = (lines[m.lineNum - 1] || '').trimEnd();
        const marker = ' '.repeat(Math.max(0, m.linePos - 1)) + '^';
        const body = `[shader:${label}] ${m.type.toUpperCase()} line ${m.lineNum}:${m.linePos} ${m.message}\n  ${srcLine}\n  ${marker}`;
        if (m.type === 'error') {
          hasError = true;
          logError(`shader:${label}`, new Error(body));
        } else if (m.type === 'warning') {
          console.warn(body);
        } else {
          console.info(body);
        }
      }
      if (!hasError) logInfo(`shader:${label}`, `compiled with ${info.messages.length} non-error messages`);
    }).catch((e) => logError(`shader:${label}:compilationInfo`, e));
    return module;
  };

  const createShaderModuleChecked = (label: string, code: string): GPUShaderModule => (
    createShaderModuleCheckedForDevice(options.getDevice(), label, code)
  );

  const showSimError = (mode: SimMode, msg: string): void => {
    console.error(`[sim:${mode}]`, msg);
    showErrorOverlay(`[sim:${mode}] ${msg}`);
  };

  return {
    createShaderModuleChecked,
    createShaderModuleCheckedForDevice,
    installGlobalHandlers,
    logError,
    logInfo,
    showSimError,
  };
}

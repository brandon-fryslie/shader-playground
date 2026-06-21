import type { AppState, Simulation } from '../types';
import type { PhysicsSimulation } from '../simulations/types';

export interface DebugPanel {
  cancelMovement(): void;
  clearAll(): void;
  runCompute(sim: Simulation, encoder: GPUCommandEncoder): void;
  setupControls(): void;
  updateAdaptiveChunk(frameDeltaMs: number): void;
  updatePanel(): void;
}

interface DebugPanelDeps {
  canvas: HTMLCanvasElement;
  getPhysicsSimulation(): PhysicsSimulation | null;
  state: AppState;
  syncPauseButtons(): void;
}

interface DebugState {
  skipTarget: number | null;
  targetStepsPerSec: number;
  adaptiveChunk: number;
  breakAtStep: number | null;
  lastFiredAtStep: number | null;
  manualStepsRemaining: number;
  manualDirection: number;
  lastSkipDispatches: number;
  idleBaselineMs: number;
}

// [LAW:one-source-of-truth] idleBaselineMs is the measured rAF cadence; every
// "what counts as a slow/fast frame" and every "steps per frame" derives from
// it, so the loop tracks 60/90/120/240 Hz displays without a second constant.
const DEBUG_FRAME_OVER_FACTOR = 1.3;
const DEBUG_FRAME_UNDER_FACTOR = 0.85;
const DEBUG_BASELINE_EMA_ALPHA = 0.1;
const DEBUG_BASELINE_INITIAL_MS = 16.7;
const DEBUG_ADAPTIVE_GROW = 1.3;
const DEBUG_ADAPTIVE_SHRINK = 0.7;
const DEBUG_ADAPTIVE_MIN = 1;
const DEBUG_ADAPTIVE_MAX = 5000;

export function createDebugPanel(deps: DebugPanelDeps): DebugPanel {
  const debugState: DebugState = {
    skipTarget: null,
    targetStepsPerSec: 6000,
    adaptiveChunk: 8,
    breakAtStep: null,
    lastFiredAtStep: null,
    manualStepsRemaining: 0,
    manualDirection: 1,
    lastSkipDispatches: 0,
    idleBaselineMs: DEBUG_BASELINE_INITIAL_MS,
  };

  function computeTargetPerFrame(): number {
    // refresh Hz = 1000 / baseline; steps/frame = steps/sec ÷ refreshHz
    return Math.max(1, Math.ceil(debugState.targetStepsPerSec * debugState.idleBaselineMs / 1000));
  }

  function refreshBreakpointUI(): void {
    const status = document.getElementById('debug-break-status');
    const val = document.getElementById('debug-break-val');
    if (!status || !val) return;
    if (debugState.breakAtStep !== null) {
      val.textContent = String(debugState.breakAtStep);
      status.style.display = '';
    } else {
      status.style.display = 'none';
    }
  }

  // [LAW:single-enforcer] Every operation-end path routes through here:
  // stepBy, initiateSkip, breakpoint hit, clearAll, and the two skip-complete
  // branches in runCompute. Resetting adaptiveChunk in this one place means a
  // GPU-heavy skip that collapses the chunk to 1 can't bleed into the next,
  // lighter operation — each op starts from a neutral, display-rate-aware
  // baseline derived from computeTargetPerFrame() (the .7 seam, never the
  // deleted /60 constant). idleBaselineMs is intentionally NOT reset; it's a
  // stable property of the device, not per-operation state.
  function cancelMovement(): void {
    debugState.skipTarget = null;
    debugState.manualStepsRemaining = 0;
    debugState.lastSkipDispatches = 0;
    debugState.adaptiveChunk = Math.max(DEBUG_ADAPTIVE_MIN, Math.floor(computeTargetPerFrame() / 4));
  }

  // [LAW:one-source-of-truth] debugState targets (skipTarget, breakAtStep,
  // manualStepsRemaining) are coordinates in the sim's simStep space. When the
  // sim is destroyed and rebuilt at step 0, every stored target is stale —
  // wipe them all so the new sim starts in a clean debug state.
  function clearAll(): void {
    cancelMovement();
    debugState.breakAtStep = null;
    debugState.lastFiredAtStep = null;
    refreshBreakpointUI();
  }

  return {
    cancelMovement,
    clearAll,
    updateAdaptiveChunk(frameDeltaMs) {
      // [LAW:types-are-the-program] Idle frames carry the natural rAF cadence;
      // sample them via EMA so over/under thresholds and the per-frame cap
      // track the display refresh rate (16.7ms@60Hz, 8.3ms@120Hz, …) instead
      // of assuming a 60 Hz cadence.
      if (debugState.lastSkipDispatches <= 0) {
        debugState.idleBaselineMs =
          debugState.idleBaselineMs * (1 - DEBUG_BASELINE_EMA_ALPHA) +
          frameDeltaMs * DEBUG_BASELINE_EMA_ALPHA;
        return;
      }
      const overMs = debugState.idleBaselineMs * DEBUG_FRAME_OVER_FACTOR;
      const underMs = debugState.idleBaselineMs * DEBUG_FRAME_UNDER_FACTOR;
      const targetPerFrame = computeTargetPerFrame();
      if (frameDeltaMs > overMs) {
        debugState.adaptiveChunk = Math.max(DEBUG_ADAPTIVE_MIN, Math.floor(debugState.adaptiveChunk * DEBUG_ADAPTIVE_SHRINK));
      } else if (frameDeltaMs < underMs && debugState.adaptiveChunk < targetPerFrame) {
        debugState.adaptiveChunk = Math.min(DEBUG_ADAPTIVE_MAX, Math.ceil(debugState.adaptiveChunk * DEBUG_ADAPTIVE_GROW));
      }
    },
    runCompute(sim, encoder) {
      const physicsSim = deps.state.mode === 'physics' ? deps.getPhysicsSimulation() : null;
      if (!physicsSim || sim !== physicsSim) {
        debugState.lastSkipDispatches = 0;
        if (!deps.state.paused) sim.compute(encoder);
        return;
      }

      let stepCount = 0;
      let overrideDir: number | null = null;
      let skipActiveThisFrame = false;

      if (debugState.skipTarget !== null) {
        const delta = debugState.skipTarget - physicsSim.getSimStep();
        if (delta === 0) {
          cancelMovement();
          physicsSim.setBlurTime(0);
          deps.state.paused = true;
          deps.syncPauseButtons();
          return;
        }
        overrideDir = delta > 0 ? 1 : -1;
        stepCount = Math.min(computeTargetPerFrame(), debugState.adaptiveChunk, Math.abs(delta));
        skipActiveThisFrame = true;
      } else if (debugState.manualStepsRemaining > 0) {
        overrideDir = debugState.manualDirection;
        stepCount = Math.min(debugState.adaptiveChunk, debugState.manualStepsRemaining);
        debugState.manualStepsRemaining -= stepCount;
      } else if (!deps.state.paused) {
        stepCount = 1;
      }

      if (stepCount === 0) {
        physicsSim.setBlurTime(0);
        debugState.lastSkipDispatches = 0;
        return;
      }

      const savedDir = physicsSim.getTimeDirection();
      const needRestore = overrideDir !== null && overrideDir !== savedDir;
      if (needRestore) physicsSim.setTimeDirection(overrideDir!);

      const dirForBlur = overrideDir !== null ? overrideDir : savedDir;
      const baseDt = 0.016 * deps.state.fx.timeScale;
      physicsSim.setBlurTime(skipActiveThisFrame ? (stepCount * baseDt * dirForBlur) : 0);
      debugState.lastSkipDispatches = skipActiveThisFrame ? stepCount : 0;

      for (let i = 0; i < stepCount; i++) {
        physicsSim.compute(encoder);
        const curStep = physicsSim.getSimStep();
        // [LAW:dataflow-not-control-flow] lastFiredAtStep is a value driven by
        // curStep, not a flag toggled by every operation-init handler. Once the
        // sim moves to any other step, the guard self-clears — so a re-entry
        // into breakAtStep (reverse over it, step away then back, skip past
        // and reverse) re-fires with no per-handler re-arm.
        if (debugState.lastFiredAtStep !== null && curStep !== debugState.lastFiredAtStep) {
          debugState.lastFiredAtStep = null;
        }
        if (
          debugState.breakAtStep !== null &&
          curStep === debugState.breakAtStep &&
          debugState.lastFiredAtStep !== curStep
        ) {
          debugState.lastFiredAtStep = curStep;
          cancelMovement();
          deps.state.paused = true;
          deps.syncPauseButtons();
          physicsSim.setBlurTime(0);
          break;
        }
        if (debugState.skipTarget !== null && curStep === debugState.skipTarget) {
          cancelMovement();
          deps.state.paused = true;
          deps.syncPauseButtons();
          physicsSim.setBlurTime(0);
          break;
        }
      }

      if (needRestore) physicsSim.setTimeDirection(savedDir);
    },
    setupControls() {
      const byId = <T extends HTMLElement>(id: string): T | null =>
        document.getElementById(id) as T | null;

      const stepBy = (n: number, dir: number) => {
        cancelMovement();
        deps.state.paused = true;
        deps.syncPauseButtons();
        debugState.manualStepsRemaining = n;
        debugState.manualDirection = dir;
      };

      byId('debug-rev60')?.addEventListener('click', () => stepBy(60, -1));
      byId('debug-rev10')?.addEventListener('click', () => stepBy(10, -1));
      byId('debug-rev1')?.addEventListener('click', () => stepBy(1, -1));
      byId('debug-fwd1')?.addEventListener('click', () => stepBy(1, 1));
      byId('debug-fwd10')?.addEventListener('click', () => stepBy(10, 1));
      byId('debug-fwd60')?.addEventListener('click', () => stepBy(60, 1));

      const chunkSelect = byId<HTMLSelectElement>('debug-skip-chunk');
      if (chunkSelect) {
        const initial = parseInt(chunkSelect.value, 10);
        if (Number.isFinite(initial) && initial > 0) debugState.targetStepsPerSec = initial;
        chunkSelect.addEventListener('change', () => {
          const value = parseInt(chunkSelect.value, 10);
          if (Number.isFinite(value) && value > 0) debugState.targetStepsPerSec = value;
        });
      }

      const initiateSkip = (target: number) => {
        if (target < 0) return;
        cancelMovement();
        deps.state.paused = true;
        deps.syncPauseButtons();
        debugState.skipTarget = target;
      };

      const skipInput = byId<HTMLInputElement>('debug-skip-target');
      byId('debug-skip-btn')?.addEventListener('click', () => {
        const value = parseInt(skipInput?.value ?? '', 10);
        if (Number.isFinite(value)) initiateSkip(value);
      });
      skipInput?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        const value = parseInt(skipInput.value, 10);
        if (Number.isFinite(value)) initiateSkip(value);
      });

      const breakInput = byId<HTMLInputElement>('debug-break-step');
      // [LAW:single-enforcer] One seam for "user changed the breakpoint" —
      // both arm and clear route through here so lastFiredAtStep can't drift
      // out of sync with breakAtStep across the three input sites.
      const setBreakAtStep = (value: number | null) => {
        debugState.breakAtStep = value;
        debugState.lastFiredAtStep = null;
        refreshBreakpointUI();
      };
      byId('debug-break-btn')?.addEventListener('click', () => {
        const value = parseInt(breakInput?.value ?? '', 10);
        if (Number.isFinite(value) && value >= 0) setBreakAtStep(value);
      });
      breakInput?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        const value = parseInt(breakInput.value, 10);
        if (Number.isFinite(value) && value >= 0) setBreakAtStep(value);
      });
      byId('debug-break-clear')?.addEventListener('click', () => setBreakAtStep(null));

      const scrub = byId<HTMLInputElement>('debug-scrub');
      scrub?.addEventListener('change', () => {
        const value = parseInt(scrub.value, 10);
        if (Number.isFinite(value)) initiateSkip(value);
      });

      byId('debug-screenshot')?.addEventListener('click', () => {
        const sim = deps.getPhysicsSimulation();
        const step = sim ? sim.getSimStep() : 0;
        deps.canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `shader-playground-step-${step}.png`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }, 'image/png');
      });
    },
    updatePanel() {
      const sim = deps.getPhysicsSimulation();
      if (deps.state.mode !== 'physics' || !sim) return;
      const step = sim.getSimStep();
      const dir = sim.getTimeDirection();
      const highWater = sim.getJournalHighWater();

      const numEl = document.getElementById('debug-step-num');
      if (numEl) numEl.textContent = String(step);
      const dirEl = document.getElementById('debug-step-dir');
      if (dirEl) dirEl.textContent = dir < 0 ? '\u25C0' : '\u25B6';

      const scrub = document.getElementById('debug-scrub') as HTMLInputElement | null;
      const scrubHigh = document.getElementById('debug-scrub-high');
      if (scrub && scrubHigh) {
        const max = Math.max(highWater, step);
        if (scrub.max !== String(max)) scrub.max = String(max);
        if (document.activeElement !== scrub) scrub.value = String(step);
        scrubHigh.textContent = String(max);
      }
    },
  };
}

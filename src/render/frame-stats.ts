import type { GpuTimingBucket } from '../gpu/timestamps';

export interface FrameStatsSnapshot {
  count: string | number;
  currentFps: number;
  gpuFrameMs: number;
  gpuTimingDetail: Record<GpuTimingBucket, number>;
  isGridMode: boolean;
  physicsDirection?: number;
  physicsStep?: number;
}

export interface FrameStatsService {
  getCurrentFps(): number;
  tick(now: number): { fpsUpdated: boolean; frameDeltaMs: number; hadPreviousTimestamp: boolean };
  updateHud(snapshot: FrameStatsSnapshot): void;
}

export function createFrameStatsService(): FrameStatsService {
  let frameCount = 0;
  let fpsTime = 0;
  let currentFps = 0;
  let lastFrameTimestamp = -1;

  return {
    getCurrentFps() {
      return currentFps;
    },
    tick(now) {
      const hadPreviousTimestamp = lastFrameTimestamp >= 0;
      const frameDeltaMs = hadPreviousTimestamp ? now - lastFrameTimestamp : 16.7;
      lastFrameTimestamp = now;
      frameCount++;
      const fpsUpdated = now - fpsTime >= 1000;
      if (fpsUpdated) {
        currentFps = frameCount;
        frameCount = 0;
        fpsTime = now;
      }
      return { frameDeltaMs, fpsUpdated, hadPreviousTimestamp };
    },
    updateHud(snapshot) {
      const msPerFrame = snapshot.currentFps > 0 ? (1000 / snapshot.currentFps).toFixed(1) : '--';
      const d = snapshot.gpuTimingDetail;
      const hasDetailedTiming = Object.values(d).some((value) => value > 0);
      const gpuDetail = hasDetailedTiming
        ? ` (PM:${d.pmDepositConvert.toFixed(1)} V:${(d.outerVCycle + d.innerVCycle).toFixed(1)} R:${(d.starsRender + d.gasRender).toFixed(1)} P:${d.bloomComposite.toFixed(1)})`
        : snapshot.gpuFrameMs > 0 ? ` gpu:${snapshot.gpuFrameMs.toFixed(1)}ms` : '';
      document.getElementById('stat-fps')!.textContent = `${snapshot.currentFps} fps ${msPerFrame}ms${gpuDetail}`;
      document.getElementById('stat-count')!.textContent =
        snapshot.isGridMode ? `Grid: ${snapshot.count}` : `Particles: ${snapshot.count}`;

      const stepEl = document.getElementById('stat-step');
      if (!stepEl) return;
      if (snapshot.physicsStep !== undefined && snapshot.physicsDirection !== undefined) {
        stepEl.style.display = '';
        stepEl.textContent = `Step: ${snapshot.physicsStep} ${snapshot.physicsDirection < 0 ? '\u25C0' : '\u25B6'}`;
      } else {
        stepEl.style.display = 'none';
      }
    },
  };
}

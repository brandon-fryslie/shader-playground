import type { AppState, SimMode } from '../types';

export interface MobileInput {
  applyMobileDefaults(): void;
  setupBottomSheet(): void;
  setupFab(): void;
  setupTouchControls(): void;
}

interface MobileInputDeps {
  applySimulationInteraction(pointerId: number, mx: number, my: number, isMove: boolean): void;
  cancelDebugMovement(): void;
  getCanvas(): HTMLCanvasElement;
  modeTabLabels: Record<SimMode, string>;
  releasePointerInteraction(pointerId: number): void;
  resetCurrentSimulation(): void;
  selectMode(mode: SimMode): void;
  setSimulationInteractionInactive(): void;
  state: AppState;
  storageKey: string;
  syncPauseButtons(): void;
}

const MODE_ORDER: SimMode[] = ['physics', 'boids', 'physics_classic', 'fluid', 'parametric', 'reaction'];

export function createMobileInput(deps: MobileInputDeps): MobileInput {
  return {
    applyMobileDefaults() {
      // [LAW:one-source-of-truth] Persisted state is authoritative; mobile defaults
      // only seed fresh installs that have no saved local state yet.
      if (localStorage.getItem(deps.storageKey)) return;
      deps.state.boids.count = 500;
      deps.state.physics.count = 2000;
      deps.state.physics_classic.count = 200;
      deps.state.reaction.resolution = 64;
    },
    setupTouchControls() {
      const canvas = deps.getCanvas();
      const pointers = new Map<number, { x: number; y: number }>();
      let prevPinchDist = 0;
      let prevMidX = 0;
      let prevMidY = 0;

      canvas.addEventListener('pointerdown', (event) => {
        if (deps.state.xrEnabled) return;
        event.preventDefault();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (pointers.size === 1) {
          const rect = canvas.getBoundingClientRect();
          const mx = (event.clientX - rect.left) / rect.width;
          const my = 1.0 - (event.clientY - rect.top) / rect.height;
          deps.state.mouse.dx = 0;
          deps.state.mouse.dy = 0;
          deps.applySimulationInteraction(event.pointerId, mx, my, false);
        }
        if (pointers.size === 2) {
          deps.setSimulationInteractionInactive();
          pointers.forEach((_, pointerId) => deps.releasePointerInteraction(pointerId));
          const points = [...pointers.values()];
          prevMidX = (points[0].x + points[1].x) / 2;
          prevMidY = (points[0].y + points[1].y) / 2;
          prevPinchDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        }
      }, { passive: false });

      canvas.addEventListener('pointermove', (event) => {
        if (deps.state.xrEnabled || !pointers.has(event.pointerId)) return;
        event.preventDefault();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (pointers.size === 1) {
          const rect = canvas.getBoundingClientRect();
          const mx = (event.clientX - rect.left) / rect.width;
          const my = 1.0 - (event.clientY - rect.top) / rect.height;
          deps.applySimulationInteraction(event.pointerId, mx, my, true);
          return;
        }
        if (pointers.size !== 2) return;

        const points = [...pointers.values()];
        const midX = (points[0].x + points[1].x) / 2;
        const midY = (points[0].y + points[1].y) / 2;
        const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

        deps.state.camera.rotY += (midX - prevMidX) * 0.005;
        deps.state.camera.rotX += (midY - prevMidY) * 0.005;
        deps.state.camera.rotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, deps.state.camera.rotX));

        if (prevPinchDist > 0) {
          deps.state.camera.distance *= prevPinchDist / dist;
          deps.state.camera.distance = Math.max(0.5, Math.min(200, deps.state.camera.distance));
        }

        prevMidX = midX;
        prevMidY = midY;
        prevPinchDist = dist;
        deps.state.mouse.down = false;
      }, { passive: false });

      const onPointerEnd = (event: PointerEvent) => {
        pointers.delete(event.pointerId);
        deps.releasePointerInteraction(event.pointerId);
        if (pointers.size === 0) {
          deps.state.mouse.down = false;
          deps.state.mouse.dx = 0;
          deps.state.mouse.dy = 0;
          prevPinchDist = 0;
        }
        if (pointers.size === 1) {
          const [remainingId, remaining] = [...pointers.entries()][0];
          const rect = canvas.getBoundingClientRect();
          const mx = (remaining.x - rect.left) / rect.width;
          const my = 1.0 - (remaining.y - rect.top) / rect.height;
          deps.state.mouse.dx = 0;
          deps.state.mouse.dy = 0;
          deps.applySimulationInteraction(remainingId, mx, my, false);
        }
      };
      canvas.addEventListener('pointerup', onPointerEnd);
      canvas.addEventListener('pointercancel', onPointerEnd);
      canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    },
    setupFab() {
      document.getElementById('fab-pause')!.addEventListener('click', () => {
        deps.state.paused = !deps.state.paused;
        if (deps.state.paused) deps.cancelDebugMovement();
        deps.syncPauseButtons();
      });

      document.getElementById('fab-reset')!.addEventListener('click', () => {
        deps.resetCurrentSimulation();
      });

      const stepMode = (delta: number) => {
        const idx = MODE_ORDER.indexOf(deps.state.mode);
        const next = MODE_ORDER[(idx + delta + MODE_ORDER.length) % MODE_ORDER.length];
        deps.selectMode(next);
      };
      document.getElementById('mode-prev')!.addEventListener('click', () => stepMode(-1));
      document.getElementById('mode-next')!.addEventListener('click', () => stepMode(1));
      document.getElementById('mode-stepper-label')!.textContent = deps.modeTabLabels[deps.state.mode];
    },
    setupBottomSheet() {
      const canvas = deps.getCanvas();
      const controls = document.getElementById('controls')!;
      let startY = 0;
      let startScrollTop = 0;
      let tracking = false;
      const swipeThreshold = 30;

      controls.addEventListener('touchstart', (event) => {
        startY = event.touches[0].clientY;
        startScrollTop = controls.scrollTop;
        const expanded = controls.classList.contains('mobile-expanded');
        tracking = !expanded || startScrollTop <= 0;
      }, { passive: true });

      controls.addEventListener('touchmove', (event) => {
        if (!tracking) return;
        const dy = event.touches[0].clientY - startY;
        const expanded = controls.classList.contains('mobile-expanded');
        if (!expanded && dy < 0) event.preventDefault();
        if (expanded && startScrollTop <= 0 && dy > 0) event.preventDefault();
      }, { passive: false });

      controls.addEventListener('touchend', (event) => {
        if (!tracking) return;
        tracking = false;
        const dy = event.changedTouches[0].clientY - startY;
        const expanded = controls.classList.contains('mobile-expanded');

        if (!expanded && dy < -swipeThreshold) {
          controls.classList.add('mobile-expanded');
        } else if (expanded && startScrollTop <= 0 && dy > swipeThreshold) {
          controls.classList.remove('mobile-expanded');
        } else if (Math.abs(dy) < 10) {
          const handleRect = controls.querySelector('.mobile-drag-handle')!.getBoundingClientRect();
          if (event.changedTouches[0].clientY >= handleRect.top && event.changedTouches[0].clientY <= handleRect.bottom) {
            controls.classList.toggle('mobile-expanded');
          }
        }
      });

      canvas.addEventListener('pointerdown', () => {
        controls.classList.remove('mobile-expanded');
      }, { capture: true });
    },
  };
}

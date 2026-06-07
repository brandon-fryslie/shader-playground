import type { AppState } from '../types';
import { cross3, dot3, normalize3, sub3 } from '../math/vec3';

export interface PointerSystem {
  applySimulationInteraction(pointerId: number, mx: number, my: number, isMove: boolean): void;
  closestPointOnRayToOrigin(origin: number[], dir: number[]): number[];
  intersectRayWithPlane(origin: number[], dir: number[], planeY: number): number[] | null;
  releasePointerInteraction(pointerId: number): void;
  screenToFluidUV(mx: number, my: number): number[] | null;
  screenToSimPlane(mx: number, my: number): number[];
  screenToWorld(mx: number, my: number): number[];
  setSimulationInteractionInactive(): void;
  setupMouseControls(): void;
  worldToFluidUV(worldPoint: number[]): number[] | null;
}

interface PointerSystemDeps {
  fluidWorldSize: number;
  getCanvas(): HTMLCanvasElement;
  onCreateAttractor(pointerId: number, pos: number[]): void;
  onMoveAttractor(pointerId: number, pos: number[]): void;
  onReleaseAttractor(pointerId: number): void;
  state: AppState;
}

export function createPointerSystem(deps: PointerSystemDeps): PointerSystem {
  function getCameraBasis() {
    const cam = deps.state.camera;
    const cosRx = Math.cos(cam.rotX);
    const sinRx = Math.sin(cam.rotX);
    const cosRy = Math.cos(cam.rotY);
    const sinRy = Math.sin(cam.rotY);
    const eye = [cam.distance * cosRx * sinRy, cam.distance * sinRx, cam.distance * cosRx * cosRy];
    const forward = normalize3(sub3([0, 0, 0], eye));
    const worldUp = [0, 1, 0];
    const right = normalize3(cross3(forward, worldUp));
    const up = cross3(right, forward);
    return { eye, forward, right, up };
  }

  function screenRay(mx: number, my: number) {
    const canvas = deps.getCanvas();
    const cam = deps.state.camera;
    const fovRad = cam.fov * Math.PI / 180;
    const aspect = canvas.width / canvas.height;
    const { eye, forward, right, up } = getCameraBasis();
    const halfFov = Math.tan(fovRad * 0.5);
    const ndcX = (mx * 2 - 1) * halfFov * aspect;
    const ndcY = (my * 2 - 1) * halfFov;
    const dir = normalize3([
      forward[0] + right[0] * ndcX + up[0] * ndcY,
      forward[1] + right[1] * ndcX + up[1] * ndcY,
      forward[2] + right[2] * ndcX + up[2] * ndcY,
    ]);
    return { eye, dir };
  }

  function setSimulationInteractionInactive() {
    deps.state.mouse.down = false;
    deps.state.mouse.dx = 0;
    deps.state.mouse.dy = 0;
  }

  function closestPointOnRayToOrigin(origin: number[], dir: number[]): number[] {
    const denom = dot3(dir, dir) || 1;
    const t = Math.max(0, -dot3(origin, dir) / denom);
    return [
      origin[0] + dir[0] * t,
      origin[1] + dir[1] * t,
      origin[2] + dir[2] * t,
    ];
  }

  function intersectRayWithPlane(origin: number[], dir: number[], planeY: number): number[] | null {
    if (Math.abs(dir[1]) < 0.0001) return null;
    const t = (planeY - origin[1]) / dir[1];
    if (t < 0) return null;
    return [
      origin[0] + dir[0] * t,
      origin[1] + dir[1] * t,
      origin[2] + dir[2] * t,
    ];
  }

  function screenToWorld(mx: number, my: number): number[] {
    const { dir } = screenRay(mx, my);
    const spread = deps.state.camera.distance * 0.5;
    return [dir[0] * spread, dir[1] * spread, dir[2] * spread];
  }

  function screenToSimPlane(mx: number, my: number): number[] {
    const { eye, dir } = screenRay(mx, my);
    const n = normalize3(eye);
    const denom = dot3(dir, n);
    if (Math.abs(denom) < 0.0001) return closestPointOnRayToOrigin(eye, dir);
    const t = -dot3(eye, n) / denom;
    return [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
  }

  function screenToFluidUV(mx: number, my: number): number[] | null {
    const { eye, dir } = screenRay(mx, my);
    if (Math.abs(dir[1]) < 0.0001) return null;
    const t = -eye[1] / dir[1];
    if (t < 0) return null;
    const hitX = eye[0] + dir[0] * t;
    const hitZ = eye[2] + dir[2] * t;
    const halfSize = deps.fluidWorldSize * 0.5;
    if (Math.abs(hitX) > halfSize || Math.abs(hitZ) > halfSize) return null;
    return [
      (hitX + halfSize) / deps.fluidWorldSize,
      (hitZ + halfSize) / deps.fluidWorldSize,
    ];
  }

  function worldToFluidUV(worldPoint: number[]): number[] | null {
    const halfSize = deps.fluidWorldSize * 0.5;
    if (Math.abs(worldPoint[0]) > halfSize || Math.abs(worldPoint[2]) > halfSize) return null;
    return [
      (worldPoint[0] + halfSize) / deps.fluidWorldSize,
      (worldPoint[2] + halfSize) / deps.fluidWorldSize,
    ];
  }

  function applySimulationInteraction(pointerId: number, mx: number, my: number, isMove: boolean): void {
    if (deps.state.mode === 'fluid') {
      const uv = screenToFluidUV(mx, my);
      // [LAW:dataflow-not-control-flow] Out-of-bounds fluid hits flow through the
      // same inactive-input path instead of branching into clamped edge behavior.
      if (!uv) {
        setSimulationInteractionInactive();
      } else {
        deps.state.mouse.down = true;
        const worldPoint = screenToWorld(mx, my);
        deps.state.mouse.worldX = worldPoint[0];
        deps.state.mouse.worldY = worldPoint[1];
        deps.state.mouse.worldZ = worldPoint[2];
        deps.state.mouse.dx = isMove ? (uv[0] - deps.state.mouse.x) * 10 : 0;
        deps.state.mouse.dy = isMove ? (uv[1] - deps.state.mouse.y) * 10 : 0;
        deps.state.mouse.x = uv[0];
        deps.state.mouse.y = uv[1];
      }
      return;
    }

    const hit = screenToSimPlane(mx, my);
    deps.state.mouse.down = true;
    deps.state.mouse.worldX = hit[0];
    deps.state.mouse.worldY = hit[1];
    deps.state.mouse.worldZ = hit[2];
    deps.state.mouse.dx = isMove ? (mx - deps.state.mouse.x) * 10 : 0;
    deps.state.mouse.dy = isMove ? (my - deps.state.mouse.y) * 10 : 0;
    deps.state.mouse.x = mx;
    deps.state.mouse.y = my;
    if (deps.state.mode === 'physics') {
      if (isMove) deps.onMoveAttractor(pointerId, hit);
      else deps.onCreateAttractor(pointerId, hit);
    }
  }

  function releasePointerInteraction(pointerId: number): void {
    deps.state.mouse.down = false;
    deps.state.mouse.dx = 0;
    deps.state.mouse.dy = 0;
    deps.onReleaseAttractor(pointerId);
  }

  return {
    applySimulationInteraction,
    closestPointOnRayToOrigin,
    intersectRayWithPlane,
    releasePointerInteraction,
    screenToFluidUV,
    screenToSimPlane,
    screenToWorld,
    setSimulationInteractionInactive,
    setupMouseControls() {
      const canvas = deps.getCanvas();
      let dragging = false;
      let interacting = false;

      canvas.addEventListener('pointerdown', (event) => {
        if (deps.state.xrEnabled) return;
        dragging = true;
        interacting = !(event.ctrlKey || event.metaKey);
        const rect = canvas.getBoundingClientRect();
        const mx = (event.clientX - rect.left) / rect.width;
        const my = 1.0 - (event.clientY - rect.top) / rect.height;
        deps.state.mouse.dx = 0;
        deps.state.mouse.dy = 0;

        if (interacting) {
          applySimulationInteraction(event.pointerId, mx, my, false);
        } else {
          deps.state.mouse.x = mx;
          deps.state.mouse.y = my;
        }
        event.preventDefault();
      });

      canvas.addEventListener('pointermove', (event) => {
        if (deps.state.xrEnabled || !dragging) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (event.clientX - rect.left) / rect.width;
        const my = 1.0 - (event.clientY - rect.top) / rect.height;

        if (interacting) {
          applySimulationInteraction(event.pointerId, mx, my, true);
        } else {
          deps.state.camera.rotY += event.movementX * 0.005;
          deps.state.camera.rotX += event.movementY * 0.005;
          deps.state.camera.rotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, deps.state.camera.rotX));
          deps.state.mouse.down = false;
        }
      });

      const onPointerRelease = (event: PointerEvent) => {
        if (deps.state.xrEnabled) return;
        dragging = false;
        interacting = false;
        releasePointerInteraction(event.pointerId);
      };
      canvas.addEventListener('pointerup', onPointerRelease);
      canvas.addEventListener('pointercancel', onPointerRelease);
      canvas.addEventListener('pointerleave', onPointerRelease);
      canvas.addEventListener('contextmenu', (event) => event.preventDefault());
      canvas.addEventListener('wheel', (event) => {
        if (deps.state.xrEnabled) return;
        deps.state.camera.distance *= (1 + event.deltaY * 0.001);
        deps.state.camera.distance = Math.max(0.5, Math.min(200, deps.state.camera.distance));
        event.preventDefault();
      }, { passive: false });
    },
    worldToFluidUV,
  };
}

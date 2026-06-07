import type { AppState, Attractor, Marker, RGBThemeColors } from '../types';

export const PHYSICS_BASE_DT = 0.016;
const STEPS_PER_SECOND = 1 / PHYSICS_BASE_DT;
const ATTRACTOR_CHARGE_STEPS = 90;
export const ATTRACTOR_MAX = 32;
const ATTRACTOR_MIN_DECAY_STEPS = 3;
const ATTRACTOR_PERMANENT_THRESHOLD = 30.0;
export const MARKERS_PER_ATTRACTOR = 36;
const MARKER_SPAWN_RADIUS = 0.22;
const MARKER_ORBIT_SPEED = 1.1;

export interface AttractorSystem {
  attractorStrength(attractor: Attractor, currentStep: number, ceiling: number): number;
  create(pointerId: number, pos: number[]): void;
  currentSimStep(): number;
  currentTimeDirection(): number;
  move(pointerId: number, pos: number[]): void;
  prune(currentStep: number): void;
  release(pointerId: number): void;
  tickMarkers(dt: number): void;
}

interface AttractorSystemDeps {
  getCurrentPhysicsStep(): number;
  getCurrentTimeDirection(): number;
  getThemeColors(): RGBThemeColors;
  state: AppState;
}

export function createAttractorSystem(deps: AttractorSystemDeps): AttractorSystem {
  function currentSimStep(): number {
    return deps.getCurrentPhysicsStep();
  }

  function currentTimeDirection(): number {
    return deps.getCurrentTimeDirection();
  }

  function attractorDecaySteps(_attractor: Attractor): number {
    const decayTime = deps.state.physics.attractorDecayTime ?? 2.0;
    if (decayTime >= ATTRACTOR_PERMANENT_THRESHOLD) return Number.POSITIVE_INFINITY;
    return Math.max(ATTRACTOR_MIN_DECAY_STEPS, decayTime * STEPS_PER_SECOND);
  }

  function attractorDead(attractor: Attractor, currentStep: number): boolean {
    if (attractor.releaseStep < 0) return false;
    return (currentStep - attractor.releaseStep) >= attractorDecaySteps(attractor);
  }

  function reindexMarkers(oldToNew: Map<number, number>): void {
    const kept: Marker[] = [];
    for (const marker of deps.state.markers) {
      const newIdx = oldToNew.get(marker.attractorIdx);
      if (newIdx !== undefined) {
        marker.attractorIdx = newIdx;
        kept.push(marker);
      }
    }
    deps.state.markers = kept;
  }

  function spawnMarkersFor(attractorIdx: number, x: number, y: number, z: number): void {
    const theme = deps.getThemeColors();
    for (let i = 0; i < MARKERS_PER_ATTRACTOR; i++) {
      const u = Math.random() * 2 - 1;
      const phi = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const dx = s * Math.cos(phi);
      const dy = u;
      const dz = s * Math.sin(phi);
      const radius = MARKER_SPAWN_RADIUS * (0.6 + Math.random() * 0.8);
      let tx = -dz;
      let ty = 0;
      let tz = dx;
      const tangentLen = Math.hypot(tx, ty, tz) || 1;
      tx /= tangentLen;
      ty /= tangentLen;
      tz /= tangentLen;
      const orbitSign = Math.random() < 0.5 ? -1 : 1;
      const orbitSpeed = MARKER_ORBIT_SPEED * (0.7 + Math.random() * 0.6) * orbitSign;
      deps.state.markers.push({
        x: x + dx * radius,
        y: y + dy * radius,
        z: z + dz * radius,
        vx: tx * orbitSpeed,
        vy: ty * orbitSpeed,
        vz: tz * orbitSpeed,
        tintR: theme.accent[0],
        tintG: theme.accent[1],
        tintB: theme.accent[2],
        seed: Math.random(),
        attractorIdx,
      });
    }
  }

  return {
    currentSimStep,
    currentTimeDirection,
    attractorStrength(attractor, currentStep, ceiling) {
      if (attractor.releaseStep < 0 || currentStep < attractor.releaseStep) {
        const stepsHeld = Math.max(0, currentStep - attractor.chargeStep);
        const t = Math.min(1, stepsHeld / ATTRACTOR_CHARGE_STEPS);
        return t * t * ceiling;
      }
      const peakT = Math.min(1, attractor.holdSteps / ATTRACTOR_CHARGE_STEPS);
      const peak = peakT * peakT * ceiling;
      const elapsedSteps = currentStep - attractor.releaseStep;
      const decaySteps = attractorDecaySteps(attractor);
      if (elapsedSteps >= decaySteps) return 0;
      const remaining = 1 - elapsedSteps / decaySteps;
      return peak * remaining * remaining;
    },
    prune(currentStep) {
      if (currentTimeDirection() < 0) return;
      const kept: Attractor[] = [];
      const oldToNew = new Map<number, number>();
      for (let i = 0; i < deps.state.attractors.length; i++) {
        const attractor = deps.state.attractors[i];
        if (!attractorDead(attractor, currentStep)) {
          oldToNew.set(i, kept.length);
          kept.push(attractor);
        }
      }
      deps.state.attractors = kept;
      const newMap = new Map<number, number>();
      deps.state.pointerToAttractor.forEach((oldIdx, pointerId) => {
        const newIdx = oldToNew.get(oldIdx);
        if (newIdx !== undefined) newMap.set(pointerId, newIdx);
      });
      deps.state.pointerToAttractor = newMap;
      reindexMarkers(oldToNew);
    },
    create(pointerId, pos) {
      // [LAW:single-enforcer] Reverse playback is journal-owned; live attractor
      // creation is only permitted on forward time so the force history stays canonical.
      if (currentTimeDirection() < 0) return;
      if (deps.state.attractors.length >= ATTRACTOR_MAX) {
        deps.state.attractors.shift();
        const rebuilt = new Map<number, number>();
        deps.state.pointerToAttractor.forEach((idx, pid) => {
          if (idx > 0) rebuilt.set(pid, idx - 1);
        });
        deps.state.pointerToAttractor = rebuilt;
        const survivors: Marker[] = [];
        for (const marker of deps.state.markers) {
          if (marker.attractorIdx > 0) {
            marker.attractorIdx -= 1;
            survivors.push(marker);
          }
        }
        deps.state.markers = survivors;
      }
      const step = currentSimStep();
      deps.state.attractors.push({
        x: pos[0],
        y: pos[1],
        z: pos[2],
        chargeStep: step,
        releaseStep: -1,
        holdSteps: -1,
      });
      const idx = deps.state.attractors.length - 1;
      deps.state.pointerToAttractor.set(pointerId, idx);
      spawnMarkersFor(idx, pos[0], pos[1], pos[2]);
    },
    move(pointerId, pos) {
      const idx = deps.state.pointerToAttractor.get(pointerId);
      if (idx === undefined) return;
      const attractor = deps.state.attractors[idx];
      if (!attractor || attractor.releaseStep >= 0) return;
      attractor.x = pos[0];
      attractor.y = pos[1];
      attractor.z = pos[2];
    },
    release(pointerId) {
      const idx = deps.state.pointerToAttractor.get(pointerId);
      if (idx === undefined) return;
      deps.state.pointerToAttractor.delete(pointerId);
      const attractor = deps.state.attractors[idx];
      if (!attractor || attractor.releaseStep >= 0) return;
      const step = currentSimStep();
      attractor.releaseStep = step;
      attractor.holdSteps = Math.max(1, step - attractor.chargeStep);
    },
    tickMarkers(dt) {
      if (deps.state.markers.length === 0) return;
      const attractors = deps.state.attractors;
      const softSq = 0.04;
      const drag = Math.exp(-0.6 * Math.abs(dt));
      for (const marker of deps.state.markers) {
        const attractor = attractors[marker.attractorIdx];
        if (!attractor) continue;
        const rx = attractor.x - marker.x;
        const ry = attractor.y - marker.y;
        const rz = attractor.z - marker.z;
        const r2 = rx * rx + ry * ry + rz * rz + softSq;
        const inv = 1 / Math.sqrt(r2);
        const pull = 3.0 * inv * inv;
        marker.vx += rx * inv * pull * dt;
        marker.vy += ry * inv * pull * dt;
        marker.vz += rz * inv * pull * dt;
        marker.vx *= drag;
        marker.vy *= drag;
        marker.vz *= drag;
        marker.x += marker.vx * dt;
        marker.y += marker.vy * dt;
        marker.z += marker.vz * dt;
      }
    },
  };
}

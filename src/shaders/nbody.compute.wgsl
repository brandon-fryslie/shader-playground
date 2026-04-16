struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

// [LAW:one-source-of-truth] Attractor is the canonical per-interaction force-generator.
// Each frame the CPU packs up to MAX_ATTRACTORS entries with current strength.
// strength=0 makes all per-attractor terms zero without any branching (dataflow-not-control-flow).
struct Attractor {
  pos: vec3f,
  strength: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  sourceCount: u32,
  coreOrbit: f32,
  time: f32,
  attractorCount: u32,
  _pad_a: u32,
  _pad_b: u32,
  _pad_c: u32,
  diskNormal: vec3f,
  _pad4: f32,
  diskVertDamp: f32,
  diskRadDamp: f32,
  diskTangGain: f32,
  diskVertSpring: f32,
  diskAlignGain: f32,
  _pad_d: f32,
  diskTangSpeed: f32,
  tidalStrength: f32,
  // Attractor array lives at offset 96 (16-aligned). CPU packing must match.
  attractors: array<Attractor, 32>,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] Long-run N-body stability thresholds are owned here so containment stays coherent.
const N_BODY_OUTER_RADIUS = 8.0;
const N_BODY_BOUNDARY_PULL = 0.006;

// Per-attractor interaction constants. Strengths are multiplied by each attractor's own `strength` float
// (0..ceiling), plus sqrt(count/1000) count scaling so the feel is stable across particle counts.
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;
const INTERACTION_DRAG_GAIN = 0.6;
// Close-range friction: bleeds kinetic energy from particles trapped near an attractor.
// Radius 0.8 is the capture zone; gain 3.0 is moderate — strong enough to feel, not enough to freeze particles solid.
const INTERACTION_FRICTION_RADIUS = 0.8;
const INTERACTION_FRICTION_GAIN = 3.0;

// Home reentry — decoupled from attractor state per capability goal. Always on, but only bites far from origin.
// This is a containment invariant for escaped particles, not a counterforce to user interaction.
const HOME_REENTRY_STIFFNESS = 0.04;
const HOME_REENTRY_DAMPING = 0.05;
const HOME_REENTRY_FADE_INNER = 5.0;
const HOME_REENTRY_FADE_OUTER = 7.0;

// Core friction — galactic core speed limiter (unchanged behavior).
const CORE_FRICTION_RADIUS = 0.8;
const CORE_FRICTION_INNER_RADIUS = 0.1;
const CORE_FRICTION_SPEED_START = 1.5;
const CORE_FRICTION_GAIN = 1.2;

// Shared memory tile for source bodies — only pos + mass needed for force computation.
// [LAW:one-source-of-truth] TILE_SIZE matches @workgroup_size so every thread loads exactly one body per tile.
const TILE_SIZE = 256u;
var<workgroup> tile: array<vec4f, TILE_SIZE>;

@compute @workgroup_size(TILE_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let idx = gid.x;
  // All threads participate in tile-load barriers (WGSL uniform control flow requirement).
  // Dead threads (idx >= count) load tiles but skip the inner loop and post-tile work via 'alive'.
  let alive = idx < params.count;

  let me = bodiesIn[min(idx, params.count - 1u)];
  var acc = vec3f(0.0);

  let softeningSq = params.softening * params.softening;
  let G = params.G;
  let numTiles = (params.sourceCount + TILE_SIZE - 1u) / TILE_SIZE;
  let myPos = me.pos;

  for (var t = 0u; t < numTiles; t++) {
    let loadIdx = t * TILE_SIZE + lid.x;
    let src = bodiesIn[min(loadIdx, params.sourceCount - 1u)];
    tile[lid.x] = select(vec4f(0.0), vec4f(src.pos, src.mass), loadIdx < params.sourceCount);
    workgroupBarrier();

    // All threads run the inner loop — dead threads waste <0.2% compute, but avoiding
    // the branch lets Dawn/Metal optimize the hot path without register pressure from divergence.
    let tileEnd = min(TILE_SIZE, params.sourceCount - t * TILE_SIZE);
    for (var j = 0u; j < tileEnd; j++) {
      let other = tile[j];
      let diff = other.xyz - myPos;
      let dist2 = dot(diff, diff) + softeningSq;
      let inv = inverseSqrt(dist2);
      acc += diff * (G * other.w * inv * inv * inv);
    }
    workgroupBarrier();
  }

  // Early exit for dead threads — all barriers are above, so this is uniform-safe.
  if (!alive) { return; }

  let countScale = sqrt(f32(params.count) / 1000.0);
  let coreDist = length(me.pos);

  // [LAW:dataflow-not-control-flow] Sum forces from every attractor. Strength=0 makes every term inert,
  // so we iterate the full count without any "is this one active?" branch.
  for (var i = 0u; i < params.attractorCount; i++) {
    let a = params.attractors[i];
    let s = a.strength;
    let toA = a.pos - me.pos;
    let d2 = dot(toA, toA);
    let d = sqrt(d2 + 0.0001);
    let dir = toA / d;

    // 1/r² attractive well with softening.
    acc += dir * (s * INTERACTION_WELL_STRENGTH * countScale / (d2 + INTERACTION_WELL_SOFTENING));

    // Repulsive core prevents singular collapse at the attractor.
    let corePush = max(0.0, INTERACTION_CORE_RADIUS - d);
    acc -= dir * (corePush * s * INTERACTION_CORE_PRESSURE * countScale);

    // Constant drag toward attractor (direction-only scoop).
    acc += dir * (s * INTERACTION_DRAG_GAIN * countScale);

    // Close-range friction bleeds velocity inside the capture zone. This is what lets users
    // "trap" particles without them flinging back out at release.
    let fricFade = 1.0 - smoothstep(0.0, INTERACTION_FRICTION_RADIUS, d);
    acc -= me.vel * (s * INTERACTION_FRICTION_GAIN * fricFade);
  }

  // [LAW:one-source-of-truth] Home reentry — always on, faded by distance from origin.
  // Decoupled from attractors so users retain full capability over particle trajectories inside the disk.
  let toHome = me.home - me.pos;
  let reentryFade = smoothstep(HOME_REENTRY_FADE_INNER, HOME_REENTRY_FADE_OUTER, coreDist);
  acc += toHome * (HOME_REENTRY_STIFFNESS * reentryFade);
  acc -= me.vel * (HOME_REENTRY_DAMPING * reentryFade);

  // Core friction — galactic core speed limiter.
  let coreFrictionFade = 1.0 - smoothstep(CORE_FRICTION_INNER_RADIUS, CORE_FRICTION_RADIUS, coreDist);
  let speed = length(me.vel);
  let coreSpeedExcess = max(0.0, speed - CORE_FRICTION_SPEED_START);
  let coreFrictionStrength = params.coreOrbit * coreFrictionFade * coreSpeedExcess * CORE_FRICTION_GAIN;
  acc -= me.vel * coreFrictionStrength;

  // [LAW:dataflow-not-control-flow] Disk recovery always runs; gains of zero make individual terms inert without branching the solver.
  let n = params.diskNormal;
  let z = dot(me.pos, n);
  let vz = dot(me.vel, n);
  let rPlane = me.pos - z * n;
  let R2 = dot(rPlane, rPlane);
  let valid = R2 > 1e-8;
  let safeR = sqrt(max(R2, 1e-8));
  let eR = select(vec3f(0.0), rPlane / safeR, valid);
  let crossNE = cross(n, eR);
  let crossLen2 = dot(crossNE, crossNE);
  let ePhi = select(vec3f(0.0), crossNE / sqrt(max(crossLen2, 1e-8)), crossLen2 > 1e-8);
  let vR = dot(me.vel, eR);
  let vPhi = dot(me.vel, ePhi);
  // Disk recovery fades to zero beyond the disk region — scattered particles are free.
  let diskFade = 1.0 - smoothstep(5.0, 7.5, coreDist);
  // Vertical velocity damping — dissipates vertical kinetic energy to maintain disk coherence.
  acc -= n * (vz * params.diskVertDamp * diskFade);
  acc -= eR * (vR * params.diskRadDamp * diskFade);
  acc -= n * (z * params.diskVertSpring * diskFade);
  // Bidirectional tangential nudge: accelerates slow particles, brakes fast ones toward the target.
  // This acts as an energy regulator — without braking, the system injects energy without limit.
  let vc = params.diskTangSpeed / sqrt(safeR + 0.1);
  acc += ePhi * ((vc - vPhi) * params.diskTangGain * diskFade);
  let vNonTan = me.vel - n * vz - eR * vR;
  acc -= vNonTan * (params.diskAlignGain * diskFade);

  // Soft outer boundary.
  let boundaryExcess = max(0.0, coreDist - N_BODY_OUTER_RADIUS);
  acc -= normalize(me.pos + vec3f(0.0001)) * (boundaryExcess * N_BODY_BOUNDARY_PULL);

  // Slowly rotating tidal quadrupole — seeds spiral arms via differential rotation.
  let tidalAngle = params.time * 0.15;
  let tidalCos = cos(tidalAngle);
  let tidalSin = sin(tidalAngle);
  let axisA = vec3f(tidalCos, 0.0, tidalSin);
  let axisB = vec3f(-tidalSin, 0.0, tidalCos);
  acc += params.tidalStrength * (axisA * dot(me.pos, axisA) - axisB * dot(me.pos, axisB));

  let effectiveDamping = 1.0 - (1.0 - params.damping) * params.dt;
  var vel = (me.vel + acc * params.dt) * effectiveDamping;
  let pos = me.pos + vel * params.dt;

  bodiesOut[idx] = Body(pos, me.mass, vel, 0.0, me.home, 0.0);
}

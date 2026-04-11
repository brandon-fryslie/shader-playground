struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  sourceCount: u32,
  coreOrbit: f32,
  _pad3: f32,
  targetX: f32,
  targetY: f32,
  targetZ: f32,
  interactionActive: f32,
  // [LAW:one-source-of-truth] Disk-recovery state lives in the same Params block so the CPU sends one coherent snapshot per frame.
  diskNormal: vec3f,
  _pad4: f32,
  diskVertDamp: f32,
  diskRadDamp: f32,
  diskTangGain: f32,
  diskVertSpring: f32,
  diskAlignGain: f32,
  interactionStrength: f32,
  diskTangSpeed: f32,
  _pad7: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] Long-run N-body stability thresholds are owned here so containment and anti-collapse stay coherent.
const N_BODY_OUTER_RADIUS = 3.6;
const N_BODY_BOUNDARY_PULL = 0.012;
const INTERACTION_WELL_STRENGTH = 42.0;
const INTERACTION_WELL_SOFTENING = 0.18;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 54.0;
const HOME_WELL_STRENGTH = 0.0;
const HOME_WELL_SOFTENING = 1.8;
const HOME_CORE_RADIUS = 0.0;
const HOME_CORE_PRESSURE = 0.0;
// [LAW:dataflow-not-control-flow] Interaction and recovery share one force pipeline; only the strengths change.
const HOME_RESTORE_STIFFNESS_ACTIVE = 0.14;
const HOME_RESTORE_DAMPING_ACTIVE = 0.18;
const INTERACTION_DRAG_GAIN = 1.9;
// [LAW:dataflow-not-control-flow] Recovery always runs; the central-well fade changes the home-anchor strength instead of branching the solver.
const HOME_ANCHOR_WELL_RADIUS = 2.2;
const HOME_ANCHOR_FADE_RADIUS = 3.0;
const HOME_REENTRY_KICK = 0.48;
const HOME_REENTRY_DAMPING = 0.12;
// [LAW:one-source-of-truth] Anti-collapse pressure is centralized here so the simulation keeps one coherent stability model.
const PARTICLE_PRESSURE_RADIUS = 0.2;
const PARTICLE_PRESSURE_SOFTENING = 0.03;
const PARTICLE_PRESSURE_STRENGTH = 0.012;
const PARTICLE_PRESSURE_MASS_CAP = 3.0;
// [LAW:dataflow-not-control-flow] Core-speed damping is always evaluated; distance and speed decide whether it contributes.
const CORE_FRICTION_RADIUS = 0.95;
const CORE_FRICTION_INNER_RADIUS = 0.14;
const CORE_FRICTION_SPEED_START = 0.9;
const CORE_FRICTION_GAIN = 3.4;

// Shared memory tile for source bodies — only pos + mass needed for force computation.
// [LAW:one-source-of-truth] TILE_SIZE matches @workgroup_size so every thread loads exactly one body per tile.
const TILE_SIZE = 128u;
var<workgroup> tile: array<vec4f, TILE_SIZE>;

@compute @workgroup_size(TILE_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  var acc = vec3f(0.0);

  // Hoist loop-invariant values.
  let softeningSq = params.softening * params.softening;
  let G = params.G;
  let numTiles = (params.sourceCount + TILE_SIZE - 1u) / TILE_SIZE;

  for (var t = 0u; t < numTiles; t++) {
    // Cooperative tile load: each thread loads one source body into shared memory.
    let loadIdx = t * TILE_SIZE + lid.x;
    tile[lid.x] = select(
      vec4f(0.0),
      vec4f(bodiesIn[loadIdx].pos, bodiesIn[loadIdx].mass),
      loadIdx < params.sourceCount
    );
    workgroupBarrier();

    // Accumulate forces from all bodies in this tile.
    let tileEnd = min(TILE_SIZE, params.sourceCount - t * TILE_SIZE);
    for (var j = 0u; j < tileEnd; j++) {
      let globalJ = t * TILE_SIZE + j;
      if (globalJ == idx) { continue; }

      let otherPosM = tile[j];
      let diff = otherPosM.xyz - me.pos;
      let dist2 = dot(diff, diff) + softeningSq;
      let inv = inverseSqrt(dist2);
      let inv3 = inv * inv * inv;

      // Gravity — scales by mass, so zero-mass tracers contribute nothing naturally.
      acc += diff * (G * otherPosM.w * inv3);

      // Pressure — multiply mass into scale early so zero-mass tracers skip the expensive path at negligible cost.
      let pressureMass = min(otherPosM.w, PARTICLE_PRESSURE_MASS_CAP);
      let rawDist2 = dot(diff, diff);
      let pressureDist = sqrt(rawDist2 + 0.0001);
      let pressureFade = 1.0 - smoothstep(0.0, PARTICLE_PRESSURE_RADIUS, pressureDist);
      let pressureScale = pressureFade * pressureFade * (PARTICLE_PRESSURE_STRENGTH * pressureMass / (rawDist2 + PARTICLE_PRESSURE_SOFTENING));
      acc -= (diff / pressureDist) * pressureScale;
    }
    workgroupBarrier();
  }

  let targetPos = vec3f(params.targetX, params.targetY, params.targetZ);
  let interactionOn = params.interactionActive > 0.5;
  let wellStrength = select(HOME_WELL_STRENGTH, INTERACTION_WELL_STRENGTH * params.interactionStrength, interactionOn);
  let wellSoftening = select(HOME_WELL_SOFTENING, INTERACTION_WELL_SOFTENING, interactionOn);
  let coreRadius = select(HOME_CORE_RADIUS, INTERACTION_CORE_RADIUS, interactionOn);
  let corePressure = select(HOME_CORE_PRESSURE, INTERACTION_CORE_PRESSURE * params.interactionStrength, interactionOn);
  let homeRestoreStiffness = select(0.0, HOME_RESTORE_STIFFNESS_ACTIVE, interactionOn);
  let homeRestoreDamping = select(0.0, HOME_RESTORE_DAMPING_ACTIVE, interactionOn);
  let interactionDrag = select(0.0, INTERACTION_DRAG_GAIN, interactionOn);
  let homeReentryKick = select(HOME_REENTRY_KICK, 0.0, interactionOn);
  let homeReentryDamping = select(HOME_REENTRY_DAMPING, 0.0, interactionOn);
  let coreDist = length(me.pos);
  let coreFrictionFade = 1.0 - smoothstep(CORE_FRICTION_INNER_RADIUS, CORE_FRICTION_RADIUS, coreDist);

  let toTarget = targetPos - me.pos;
  let targetDist2 = dot(toTarget, toTarget);
  let targetDist = sqrt(targetDist2 + 0.0001);
  let targetDir = toTarget / targetDist;
  let toHome = me.home - me.pos;
  let homeAnchorFade = select(
    smoothstep(HOME_ANCHOR_WELL_RADIUS, HOME_ANCHOR_FADE_RADIUS, targetDist),
    1.0,
    interactionOn
  );
  let recoveryForceScale = select(homeAnchorFade, 1.0, interactionOn);
  acc += targetDir * (wellStrength / (targetDist2 + wellSoftening)) * recoveryForceScale;
  if (targetDist < coreRadius) {
    acc -= targetDir * ((coreRadius - targetDist) * corePressure * recoveryForceScale);
  }
  acc += toHome * (homeRestoreStiffness * homeAnchorFade);
  acc -= me.vel * (homeRestoreDamping * homeAnchorFade);
  acc += targetDir * (homeReentryKick * homeAnchorFade);
  acc -= me.vel * (homeReentryDamping * homeAnchorFade);
  acc += targetDir * interactionDrag;
  let speed = length(me.vel);
  let coreSpeedExcess = max(0.0, speed - CORE_FRICTION_SPEED_START);
  let coreFrictionStrength = params.coreOrbit * coreFrictionFade * coreSpeedExcess * CORE_FRICTION_GAIN;
  acc -= me.vel * coreFrictionStrength;

  // [LAW:dataflow-not-control-flow] Disk recovery always runs; gains of zero make individual terms inert without branching the solver.
  // All five corrections are applied as accelerations only — never as direct velocity edits — so the integrator preserves frame-rate independence.
  // [LAW:dataflow-not-control-flow] When R is degenerate, basis vectors become zero (not NaN); zero-weighted terms then contribute zero acceleration.
  let n = params.diskNormal;
  let r = me.pos;
  let z = dot(r, n);
  let vz = dot(me.vel, n);
  let rPlane = r - z * n;
  let R2 = dot(rPlane, rPlane);
  let valid = R2 > 1e-8;
  let safeR = sqrt(max(R2, 1e-8));
  let eR = select(vec3f(0.0), rPlane / safeR, valid);
  let crossNE = cross(n, eR);
  let crossLen2 = dot(crossNE, crossNE);
  let ePhi = select(vec3f(0.0), crossNE / sqrt(max(crossLen2, 1e-8)), crossLen2 > 1e-8);
  let vR = dot(me.vel, eR);
  let vPhi = dot(me.vel, ePhi);
  // Term 1: vertical velocity damping (primary flattener).
  acc -= n * (vz * params.diskVertDamp);
  // Term 2: radial velocity damping (orbit circularization).
  acc -= eR * (vR * params.diskRadDamp);
  // Term 3: vertical position spring (z^2 potential — opt-in via slider).
  acc -= n * (z * params.diskVertSpring);
  // Term 4: tangential target-speed nudge toward a Keplerian-ish circular speed.
  // diskTangSpeed sets the orbital speed at R=1; falloff matches the seeded disk init (1/sqrt(R+0.1)).
  let vc = params.diskTangSpeed / sqrt(safeR + 0.1);
  acc += ePhi * ((vc - vPhi) * params.diskTangGain);
  // Term 5: bias non-tangential velocity components toward the disk's coherent flow.
  let vNonTan = me.vel - n * vz - eR * vR;
  acc -= vNonTan * params.diskAlignGain;

  // A soft outer boundary keeps the toy system readable without letting the system escape to infinity.
  let centerDist = length(me.pos);
  if (centerDist > N_BODY_OUTER_RADIUS) {
    let toCenter = -normalize(me.pos);
    acc += toCenter * ((centerDist - N_BODY_OUTER_RADIUS) * N_BODY_BOUNDARY_PULL);
  }

  let effectiveDamping = 1.0 - (1.0 - params.damping) * params.dt;
  var vel = (me.vel + acc * params.dt) * effectiveDamping;
  let pos = me.pos + vel * params.dt;

  bodiesOut[idx] = Body(pos, me.mass, vel, 0.0, me.home, 0.0);
}

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
  time: f32,
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
  tidalStrength: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] Long-run N-body stability thresholds are owned here so containment and anti-collapse stay coherent.
const N_BODY_OUTER_RADIUS = 8.0;
const N_BODY_BOUNDARY_PULL = 0.006;
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;
const HOME_WELL_STRENGTH = 0.0;
const HOME_WELL_SOFTENING = 1.8;
const HOME_CORE_RADIUS = 0.0;
const HOME_CORE_PRESSURE = 0.0;
const HOME_RESTORE_STIFFNESS_ACTIVE = 0.14;
const HOME_RESTORE_DAMPING_ACTIVE = 0.18;
const INTERACTION_DRAG_GAIN = 0.6;
const HOME_ANCHOR_WELL_RADIUS = 5.0;
const HOME_ANCHOR_FADE_RADIUS = 7.0;
const HOME_REENTRY_KICK = 0.04;
const HOME_REENTRY_DAMPING = 0.02;
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
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  var acc = vec3f(0.0);

  // Hoist loop-invariant values.
  let softeningSq = params.softening * params.softening;
  let G = params.G;
  let numTiles = (params.sourceCount + TILE_SIZE - 1u) / TILE_SIZE;
  let myPos = me.pos;

  for (var t = 0u; t < numTiles; t++) {
    // Cooperative tile load: each thread loads one source body into shared memory.
    let loadIdx = t * TILE_SIZE + lid.x;
    tile[lid.x] = select(
      vec4f(0.0),
      vec4f(bodiesIn[loadIdx].pos, bodiesIn[loadIdx].mass),
      loadIdx < params.sourceCount
    );
    workgroupBarrier();

    // Accumulate gravity from all bodies in this tile.
    // [LAW:dataflow-not-control-flow] Tight inner loop: gravity only, no branching besides self-skip.
    let tileEnd = min(TILE_SIZE, params.sourceCount - t * TILE_SIZE);
    for (var j = 0u; j < tileEnd; j++) {
      let globalJ = t * TILE_SIZE + j;
      if (globalJ == idx) { continue; }

      let other = tile[j];
      let diff = other.xyz - myPos;
      let dist2 = dot(diff, diff) + softeningSq;
      let inv = inverseSqrt(dist2);
      acc += diff * (G * other.w * inv * inv * inv);
    }
    workgroupBarrier();
  }

  let targetPos = vec3f(params.targetX, params.targetY, params.targetZ);
  let interactionOn = params.interactionActive > 0.5;
  let countScale = sqrt(f32(params.count) / 1000.0);
  let wellStrength = select(HOME_WELL_STRENGTH, INTERACTION_WELL_STRENGTH * params.interactionStrength * countScale, interactionOn);
  let wellSoftening = select(HOME_WELL_SOFTENING, INTERACTION_WELL_SOFTENING, interactionOn);
  let coreRadius = select(HOME_CORE_RADIUS, INTERACTION_CORE_RADIUS, interactionOn);
  let corePressure = select(HOME_CORE_PRESSURE, INTERACTION_CORE_PRESSURE * params.interactionStrength * countScale, interactionOn);
  let homeRestoreStiffness = select(0.0, HOME_RESTORE_STIFFNESS_ACTIVE, interactionOn);
  let homeRestoreDamping = select(0.0, HOME_RESTORE_DAMPING_ACTIVE, interactionOn);
  let interactionDrag = select(0.0, INTERACTION_DRAG_GAIN * countScale, interactionOn);
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
  let diskFade = 1.0 - smoothstep(3.0, 5.0, coreDist);
  acc -= n * (vz * params.diskVertDamp * diskFade);
  acc -= eR * (vR * params.diskRadDamp * diskFade);
  acc -= n * (z * params.diskVertSpring * diskFade);
  let vc = params.diskTangSpeed / sqrt(safeR + 0.1);
  acc += ePhi * (max(0.0, vc - vPhi) * params.diskTangGain * diskFade);
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

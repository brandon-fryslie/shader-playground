// [LAW:one-source-of-truth] DKD leapfrog integrator with ALL conservative forces.
// Time-reversible: negating params.dt produces the exact inverse trajectory.
//
// The integration scheme per step:
//   1. Half-drift: posHalf = pos + vel * dt/2
//   2. Forces: acc = F(posHalf)                       (PM gravity + dark matter + attractors + tidal + boundary)
//   3. Kick: velNew = vel + acc * dt                  (full velocity update)
//   4. Half-drift: posNew = posHalf + velNew * dt/2   (complete the position step)
//
// Gravity is computed via Particle-Mesh: pmForce[idx] is populated by
// pm.interpolate.wgsl earlier in the frame from the Poisson-solved potential.
// The old source/tracer tile-pair loop is gone — every particle contributes
// mass to the density grid and reads force from it uniformly.
//
// Reversibility proof: forces at the half-step position are identical in forward and reverse
// because posHalf is reached by the same half-drift from either direction. Under dt → -dt,
// step 1 traces back instead of forward, hitting the same midpoint → same forces → exact inverse.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,  // available for future use (was `home`); body stays 48 bytes for layout compatibility
  _pad2: f32,
}

// [LAW:one-source-of-truth] Attractor is the canonical per-interaction force-generator.
// strength=0 makes all per-attractor terms zero without any branching (dataflow-not-control-flow).
struct Attractor {
  pos: vec3f,
  strength: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,     // unused by PM gravity; reserved for future per-particle softening
  haloMass: f32,      // Plummer halo gravitational mass
  count: u32,
  _pad_sourceCount_removed: u32,  // was sourceCount (tile-pair gravity removed in .6)
  haloScale: f32,     // Plummer halo softening radius
  time: f32,
  attractorCount: u32,
  _pad_a: u32,
  _pad_b: u32,
  _pad_c: u32,
  diskNormal: vec3f,
  _pad4: f32,
  diskMass: f32,      // Miyamoto-Nagai disk mass
  diskScaleA: f32,    // MN radial scale length
  diskScaleB: f32,    // MN vertical scale height
  _pad_pmBlend_removed: f32,      // was pmBlend (tile-pair gravity removed in .6)
  _pad_f: f32,
  _pad_d: f32,
  _pad_g: f32,
  tidalStrength: f32,
  // Attractor array at offset 96 (16-aligned). CPU packing must match.
  attractors: array<Attractor, 32>,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;
// Per-particle PM force (CIC-interpolated gradient of the Poisson potential).
// Populated each frame by pm.interpolate.wgsl before this shader runs.
// [LAW:single-enforcer] Sole source of gravity in this shader — no tile-pair
// fallback, no blend knob.
@group(0) @binding(3) var<storage, read> pmForce: array<vec4f>;

// [LAW:one-source-of-truth] All forces are conservative (position-only, derivable from a potential).
// No velocity-dependent terms exist in this shader. Time-reversibility follows directly.

// Soft outer boundary — conservative containment (quadratic potential for r > R_outer).
const N_BODY_OUTER_RADIUS = 15.0;   // raised from 8; dark matter handles normal confinement
const N_BODY_BOUNDARY_PULL = 0.01;

// Periodic domain (3-torus). Particles leaving any face reappear on the
// opposite face with the same velocity. Authoritative extent for downstream
// PM-grid work. [LAW:one-source-of-truth] Single constant shared by the
// integrator's wrap and (in later tickets) the PM grid allocation.
const DOMAIN_SIZE = 32.0;     // cube edge length
const DOMAIN_HALF = 16.0;     // = DOMAIN_SIZE / 2

// Per-attractor conservative force constants.
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;

// Maps each component into [-DOMAIN_HALF, +DOMAIN_HALF) via a reversible mod.
// The + DOMAIN_HALF shift handles negative values cleanly (WGSL's % can return
// negative results for negative operands, so we use floor() instead).
// [LAW:dataflow-not-control-flow] Pure function of position — no history, no
// velocity, no branching. Commutes with dt-reversal so DKD stays exactly
// reversible across wraps.
fn wrapPeriodic(p: vec3f) -> vec3f {
  let shifted = p + vec3f(DOMAIN_HALF);
  return shifted - floor(shifted / DOMAIN_SIZE) * DOMAIN_SIZE - vec3f(DOMAIN_HALF);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  let halfDt = params.dt * 0.5;

  // ── DKD STEP 1: Half-drift ──────────────────────────────────────────────────
  let posHalf = me.pos + me.vel * halfDt;

  // ── FORCE ACCUMULATION at posHalf ───────────────────────────────────────────
  // PM is the sole pair-gravity source. [LAW:one-source-of-truth] pmForce was
  // computed by pm.interpolate.wgsl earlier this frame from the Poisson-solved
  // potential — it IS the gravitational acceleration at posHalf. Analytic
  // forces (attractors, halo, disk, boundary, tidal) add to it below.
  var acc = pmForce[idx].xyz;

  let countScale = sqrt(f32(params.count) / 1000.0);

  // ── ATTRACTOR WELLS (conservative only) ─────────────────────────────────────
  // [LAW:dataflow-not-control-flow] strength=0 zeroes every term — no "active?" branch.
  for (var i = 0u; i < params.attractorCount; i++) {
    let a = params.attractors[i];
    let s = a.strength;
    let toA = a.pos - posHalf;
    let d2 = dot(toA, toA);
    let d = sqrt(d2 + 0.0001);
    let dir = toA / d;

    // 1/r² attractive well with softening (conservative: derived from -GM/r potential).
    acc += dir * (s * INTERACTION_WELL_STRENGTH * countScale / (d2 + INTERACTION_WELL_SOFTENING));

    // Repulsive core (conservative: derived from linear penalty potential inside core radius).
    let corePush = max(0.0, INTERACTION_CORE_RADIUS - d);
    acc -= dir * (corePush * s * INTERACTION_CORE_PRESSURE * countScale);
  }

  // ── DARK MATTER: Plummer halo (conservative) ───────────────────────────────
  // Spherical potential: φ = -M_halo / sqrt(r² + a²)
  // Force: F = -M_halo * r / (r² + a²)^(3/2)
  // haloMass is a GM-equivalent parameter (gravitational constant rolled in),
  // decoupled from params.G — the two were tuned independently historically
  // and that calibration is preserved.
  let haloR2 = dot(posHalf, posHalf);
  let haloD2 = haloR2 + params.haloScale * params.haloScale;
  let haloInv3 = 1.0 / (haloD2 * sqrt(haloD2));
  acc -= posHalf * (params.haloMass * haloInv3);

  // ── DARK MATTER: Miyamoto-Nagai disk (conservative) ────────────────────────
  // Flattened axisymmetric potential: φ = -M_disk / sqrt(R² + (a + sqrt(z² + b²))²)
  // where R = cylindrical radius, z = height above disk plane.
  // Force in Cartesian: F = -M / D³ * (R_vec + n * z * a / B)
  // diskMass is GM-equivalent (same reasoning as haloMass above).
  let n = params.diskNormal;
  let zDisk = dot(posHalf, n);
  let B = sqrt(zDisk * zDisk + params.diskScaleB * params.diskScaleB);
  let A = params.diskScaleA + B;
  let R2 = haloR2 - zDisk * zDisk;  // reuse |posHalf|² from halo calc
  let D2 = R2 + A * A;
  let diskInv3 = 1.0 / (D2 * sqrt(D2));
  let Rvec = posHalf - zDisk * n;
  acc -= (Rvec + n * (zDisk * params.diskScaleA / B)) * (params.diskMass * diskInv3);

  // ── SOFT OUTER BOUNDARY (conservative) ──────────────────────────────────────
  let dist = sqrt(haloR2 + 0.0001);
  let boundaryExcess = max(0.0, dist - N_BODY_OUTER_RADIUS);
  acc -= (posHalf / dist) * (boundaryExcess * N_BODY_BOUNDARY_PULL);

  // ── TIDAL QUADRUPOLE (conservative) ─────────────────────────────────────────
  // Slowly rotating quadrupole seeds spiral arms via differential rotation.
  let tidalAngle = params.time * 0.15;
  let tidalCos = cos(tidalAngle);
  let tidalSin = sin(tidalAngle);
  let axisA = vec3f(tidalCos, 0.0, tidalSin);
  let axisB = vec3f(-tidalSin, 0.0, tidalCos);
  acc += params.tidalStrength * (axisA * dot(posHalf, axisA) - axisB * dot(posHalf, axisB));

  // ── DKD STEP 2: Kick (full step) ───────────────────────────────────────────
  let velNew = me.vel + acc * params.dt;

  // ── DKD STEP 3: Second half-drift + periodic wrap ──────────────────────────
  // Wrap only the FINAL position. Wrapping posHalf mid-integrator would break
  // DKD symmetry because the force evaluation assumes posHalf is the midpoint
  // between in/out positions; a wrap jump there would desynchronize pairs.
  let posNewRaw = posHalf + velNew * halfDt;
  let posNew = wrapPeriodic(posNewRaw);

  bodiesOut[idx] = Body(posNew, me.mass, velNew, 0.0, vec3f(0.0), 0.0);
}

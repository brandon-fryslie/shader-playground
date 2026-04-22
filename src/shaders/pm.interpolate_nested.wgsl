// Nested PM force interpolation (CIC-weighted). For each particle, sample
// force from the INNER grid if it's inside the inner domain and from the
// OUTER grid if it's outside, with a C¹ smoothstep blend in the transition
// shell [innerBlendStart, innerBlendEnd]. Writes one vec4 force per particle
// into forceOut; the downstream nbody.compute reads it as its sole source of
// pair gravity.
//
// Both grids use the same CIC kernel as pm.deposit.wgsl. This guarantees
// Newton's 3rd law: the force particle i feels from mass in cell c equals the
// force c receives from particle i's deposit. [LAW:single-enforcer] This is
// the only force-interpolation shader used by the physics sim once the
// nested PM scheme lands.
//
// Design: inner spans ±innerHalf, outer spans ±outerHalf. Particle at posHalf
// computes d = max(|x|,|y|,|z|) (infinity norm — matches the cubical grid).
//   d <= innerBlendStart         → pure inner force
//   innerBlendStart < d < innerBlendEnd  → smoothstep blend
//   d >= innerBlendEnd           → pure outer force
// Outside the inner domain, the inner sampler is skipped (would otherwise
// wrap-pollute the inner-grid reads).

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

// Same 32-byte struct as pm.deposit.wgsl / pm.interpolate.wgsl.
struct GridParams {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,
  _pad: u32,
}

// Blend-shell params (constant across frames, packed into a tiny uniform).
struct BlendParams {
  innerBlendStart: f32,   // radius where inner→outer blend begins
  innerBlendEnd: f32,     // radius where blend completes (≥ innerBlendStart)
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read> innerPhi: array<f32>;
@group(0) @binding(2) var<storage, read> outerPhi: array<f32>;
@group(0) @binding(3) var<storage, read_write> forceOut: array<vec4f>;
@group(0) @binding(4) var<uniform> innerParams: GridParams;
@group(0) @binding(5) var<uniform> outerParams: GridParams;
@group(0) @binding(6) var<uniform> blend: BlendParams;

fn wrapIdx(i: i32, n: i32) -> u32 {
  return u32(((i % n) + n) % n);
}

fn cellIdx(ix: i32, iy: i32, iz: i32, n: i32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  let nu = u32(n);
  return u32(z) * nu * nu + u32(y) * nu + u32(x);
}

fn innerForceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(innerPhi[cellIdx(ix + 1, iy,     iz,     n)] - innerPhi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(innerPhi[cellIdx(ix,     iy + 1, iz,     n)] - innerPhi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(innerPhi[cellIdx(ix,     iy,     iz + 1, n)] - innerPhi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

fn outerForceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(outerPhi[cellIdx(ix + 1, iy,     iz,     n)] - outerPhi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(outerPhi[cellIdx(ix,     iy + 1, iz,     n)] - outerPhi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(outerPhi[cellIdx(ix,     iy,     iz + 1, n)] - outerPhi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

fn sampleInner(posHalf: vec3f) -> vec3f {
  let fgrid = (posHalf + vec3f(innerParams.domainHalf)) / innerParams.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(innerParams.gridRes);
  let h = innerParams.cellSize;
  var acc = vec3f(0.0);
  acc = acc + innerForceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc = acc + innerForceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc = acc + innerForceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc = acc + innerForceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc = acc + innerForceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;
  return acc;
}

fn sampleOuter(posHalf: vec3f) -> vec3f {
  let fgrid = (posHalf + vec3f(outerParams.domainHalf)) / outerParams.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(outerParams.gridRes);
  let h = outerParams.cellSize;
  var acc = vec3f(0.0);
  acc = acc + outerForceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc = acc + outerForceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc = acc + outerForceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc = acc + outerForceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc = acc + outerForceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;
  return acc;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= innerParams.count) { return; }

  let me = bodies[idx];
  let halfDt = innerParams.dt * 0.5;
  // [LAW:one-source-of-truth] Sample at posHalf to match the DKD midpoint
  // used for force evaluation throughout the N-body step.
  let posHalf = me.pos + me.vel * halfDt;

  // Infinity-norm distance from origin. Matches the cubical inner grid's
  // face geometry: the transition shell is a cube shell, not a ball.
  // Using max-of-absolutes means every point inside the inner grid gets
  // "full inner" weight, and transitions happen uniformly on each face.
  let absPos = abs(posHalf);
  let d = max(max(absPos.x, absPos.y), absPos.z);

  // Blend weight t ∈ [0,1]: 0 = pure inner, 1 = pure outer.
  // smoothstep gives C¹ continuity at both endpoints so force varies
  // smoothly across the transition shell — no visible seam for particles
  // drifting through it.
  let t = smoothstep(blend.innerBlendStart, blend.innerBlendEnd, d);

  // [LAW:dataflow-not-control-flow] Always sample both grids — t decides
  // which contribution survives. Outside the inner domain, sampleInner
  // reads wrap-polluted cells, but those values are multiplied by (1 - t)
  // which is zero for any particle with d >= innerBlendEnd. The garbage
  // inner read drops out of the result. No branch, no seam, no race.
  let innerAcc = sampleInner(posHalf);
  let outerAcc = sampleOuter(posHalf);

  let acc = mix(innerAcc, outerAcc, t);
  forceOut[idx] = vec4f(acc, 0.0);
}

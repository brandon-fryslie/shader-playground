// PM force interpolation (CIC-weighted). For each particle, read the
// potential's central-difference gradient at the 8 surrounding cell centers,
// then CIC-weight those cell-center forces to get the particle's PM
// acceleration. One vec4 result per particle (xyz = force, w = 0 pad).
//
// Using the SAME CIC kernel here as in deposition is required for momentum
// conservation: the interpolation kernel is the transpose of the deposition
// kernel, so the force that particle i feels from particle j under PM equals
// the force j feels from i — Newton's 3rd law preserved.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

// Shared layout with pm.deposit.wgsl / pm.density_convert.wgsl. Only dt,
// count, gridRes, domainHalf, cellSize are read here.
struct Params {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,
  _pad: u32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read> phi: array<f32>;
@group(0) @binding(2) var<storage, read_write> forceOut: array<vec4f>;
@group(0) @binding(3) var<uniform> params: Params;

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

// Force at a cell center = -∇φ via central differences. Periodic wrap on
// indices so domain-face cells produce correct cross-boundary gradients.
fn forceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(phi[cellIdx(ix + 1, iy,     iz,     n)] - phi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(phi[cellIdx(ix,     iy + 1, iz,     n)] - phi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(phi[cellIdx(ix,     iy,     iz + 1, n)] - phi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodies[idx];
  let halfDt = params.dt * 0.5;
  // [LAW:one-source-of-truth] Sample at posHalf to match the DKD midpoint
  // used for force evaluation throughout the N-body step.
  let posHalf = me.pos + me.vel * halfDt;

  // World → fractional grid coords. Matches the deposition kernel exactly.
  let fgrid = (posHalf + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.gridRes);
  let h = params.cellSize;

  // CIC-weighted sum of 8 cell-center forces.
  var acc = vec3f(0.0);
  acc = acc + forceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc = acc + forceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc = acc + forceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc = acc + forceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc = acc + forceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;

  forceOut[idx] = vec4f(acc, 0.0);
}

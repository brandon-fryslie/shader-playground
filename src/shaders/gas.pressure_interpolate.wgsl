// Gas pressure force interpolation.
//
// Samples -∇χ from the gas pressure potential with the same CIC transpose
// pattern used by PM force interpolation.
// [LAW:one-source-of-truth] χ is the sole pressure representation; particles
// never compute neighbor/kernel pressure locally.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

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
@group(0) @binding(1) var<storage, read> chi: array<f32>;
@group(0) @binding(2) var<storage, read_write> pressureOut: array<vec4f>;
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

fn forceAtCell(ix: i32, iy: i32, iz: i32, n: i32, h: f32) -> vec3f {
  let fx = -(chi[cellIdx(ix + 1, iy,     iz,     n)] - chi[cellIdx(ix - 1, iy,     iz,     n)]) / (2.0 * h);
  let fy = -(chi[cellIdx(ix,     iy + 1, iz,     n)] - chi[cellIdx(ix,     iy - 1, iz,     n)]) / (2.0 * h);
  let fz = -(chi[cellIdx(ix,     iy,     iz + 1, n)] - chi[cellIdx(ix,     iy,     iz - 1, n)]) / (2.0 * h);
  return vec3f(fx, fy, fz);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodies[idx];
  let posHalf = me.pos + me.vel * (params.dt * 0.5);

  let fgrid = (posHalf + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.gridRes);
  let h = params.cellSize;

  var acc = vec3f(0.0);
  acc += forceAtCell(i0.x,     i0.y,     i0.z,     n, h) * g.x * g.y * g.z;
  acc += forceAtCell(i0.x + 1, i0.y,     i0.z,     n, h) * f.x * g.y * g.z;
  acc += forceAtCell(i0.x,     i0.y + 1, i0.z,     n, h) * g.x * f.y * g.z;
  acc += forceAtCell(i0.x + 1, i0.y + 1, i0.z,     n, h) * f.x * f.y * g.z;
  acc += forceAtCell(i0.x,     i0.y,     i0.z + 1, n, h) * g.x * g.y * f.z;
  acc += forceAtCell(i0.x + 1, i0.y,     i0.z + 1, n, h) * f.x * g.y * f.z;
  acc += forceAtCell(i0.x,     i0.y + 1, i0.z + 1, n, h) * g.x * f.y * f.z;
  acc += forceAtCell(i0.x + 1, i0.y + 1, i0.z + 1, n, h) * f.x * f.y * f.z;

  pressureOut[idx] = vec4f(acc, 0.0);
}

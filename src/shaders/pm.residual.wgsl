// Compute residual r = 4πGρ - ∇²φ with the same 7-point stencil + periodic
// wrap used by the smoother. Run once per level between pre-smoothing and
// restriction: the residual is what gets coarsened and solved more cheaply
// on the smaller grid, then interpolated back as a correction.

struct Params {
  gridRes: u32,
  _pad: u32,
  hSquared: f32,
  fourPiG: f32,
}

@group(0) @binding(0) var<storage, read> phi: array<f32>;
@group(0) @binding(1) var<storage, read> rho: array<f32>;
@group(0) @binding(2) var<storage, read_write> residual: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn wrapIdx(i: i32, n: u32) -> u32 {
  let ni = i32(n);
  return u32(((i % ni) + ni) % ni);
}

fn idx(ix: i32, iy: i32, iz: i32, n: u32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  return z * n * n + y * n + x;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let n = params.gridRes;
  if (gid.x >= n || gid.y >= n || gid.z >= n) { return; }

  let ix = i32(gid.x);
  let iy = i32(gid.y);
  let iz = i32(gid.z);
  let me = idx(ix, iy, iz, n);

  let laplacian = (
      phi[idx(ix + 1, iy,     iz,     n)]
    + phi[idx(ix - 1, iy,     iz,     n)]
    + phi[idx(ix,     iy + 1, iz,     n)]
    + phi[idx(ix,     iy - 1, iz,     n)]
    + phi[idx(ix,     iy,     iz + 1, n)]
    + phi[idx(ix,     iy,     iz - 1, n)]
    - 6.0 * phi[me]
  ) / params.hSquared;

  residual[me] = params.fourPiG * rho[me] - laplacian;
}

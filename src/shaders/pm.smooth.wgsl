// Red-black Gauss-Seidel smoother for the multigrid V-cycle.
// Dispatched twice per sweep: once with colorParity=0 (red), once with 1 (black).
// Within one dispatch, every thread of the matching parity updates its cell
// in-place using neighbor values — neighbors are the opposite color so no
// intra-dispatch read/write race.
//
// Update rule derived from the 7-point Laplacian:
//   (neighbor_sum - 6φ) / h² = 4πG ρ
//   → φ = (neighbor_sum - h² · 4πG ρ) / 6
//
// Boundary modes (selected per-dispatch via uniform):
//   dirichletBoundary = 0 → periodic wrap, all cells update (outer grid / 3-torus).
//   dirichletBoundary = 1 → wrap stays (for neighbor reads that never reach a
//     face cell from an interior update anyway) but face cells themselves are
//     frozen — they hold the BC that pm.boundary_sample wrote at the start of
//     the cycle. Interior cells' neighbor reads landing on a face cell see the
//     BC value, which is the finite-difference encoding of Dirichlet BC.

struct Params {
  gridRes: u32,
  colorParity: u32,   // 0 = red, 1 = black
  hSquared: f32,
  fourPiG: f32,
  dirichletBoundary: u32,  // 0 = periodic, 1 = freeze face cells
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<storage, read_write> phi: array<f32>;
@group(0) @binding(1) var<storage, read> rho: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

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

  // Skip cells not matching this dispatch's color parity. One thread per cell;
  // the half of lanes in each workgroup whose parity mismatches return early.
  let parity = (gid.x + gid.y + gid.z) & 1u;
  if (parity != params.colorParity) { return; }

  let ix = i32(gid.x);
  let iy = i32(gid.y);
  let iz = i32(gid.z);

  let neighborSum =
      phi[idx(ix + 1, iy,     iz,     n)]
    + phi[idx(ix - 1, iy,     iz,     n)]
    + phi[idx(ix,     iy + 1, iz,     n)]
    + phi[idx(ix,     iy - 1, iz,     n)]
    + phi[idx(ix,     iy,     iz + 1, n)]
    + phi[idx(ix,     iy,     iz - 1, n)];

  let me = idx(ix, iy, iz, n);
  let newPhi = (neighborSum - params.hSquared * params.fourPiG * rho[me]) / 6.0;

  // [LAW:dataflow-not-control-flow] Always compute newPhi; the frozen-vs-update
  // decision lives in the value stored, not in whether the code runs.
  let nm1 = n - 1u;
  let atBoundary = gid.x == 0u || gid.x == nm1
                || gid.y == 0u || gid.y == nm1
                || gid.z == 0u || gid.z == nm1;
  let freeze = atBoundary && params.dirichletBoundary != 0u;
  phi[me] = select(newPhi, phi[me], freeze);
}

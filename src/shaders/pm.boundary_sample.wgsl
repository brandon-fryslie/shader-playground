// Dirichlet BC seed for the inner PM grid. Runs once per frame AFTER the outer
// V-cycle completes and BEFORE the inner V-cycle begins. For each face cell of
// the inner grid (the 6 faces of the 128³ cube), trilinearly samples the outer
// potential at that face cell's world-space center and writes the value into
// innerPhi[0]. The inner V-cycle smoother then treats those face cells as
// frozen (Dirichlet) for the rest of the cycle.
//
// [LAW:one-source-of-truth] Only this shader writes the outer→inner BC values.
// The smoother/residual/prolong kernels never read the outer grid directly.
// [LAW:single-enforcer] This is the single bridge between the two nested grids
// during the inner solve. Changing how the BC is computed happens here or
// nowhere.
// [LAW:dataflow-not-control-flow] Dispatched over the full 128³ inner grid.
// Every thread samples outer, then `select` picks sampled-at-boundary vs.
// warm-start-at-interior. No early return, no branch on boundary status.

struct Params {
  innerGridRes: u32,
  _pad0: u32,
  innerDomainHalf: f32,
  innerCellSize: f32,
  outerGridRes: u32,
  _pad1: u32,
  outerDomainHalf: f32,
  outerCellSize: f32,
}

@group(0) @binding(0) var<storage, read> outerPhi: array<f32>;
@group(0) @binding(1) var<storage, read_write> innerPhi: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn wrapIdx(i: i32, n: i32) -> u32 {
  return u32(((i % n) + n) % n);
}

fn outerCell(ix: i32, iy: i32, iz: i32, n: i32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  let nu = u32(n);
  return u32(z) * nu * nu + u32(y) * nu + u32(x);
}

// Trilinear sample of outerPhi at a world-space position. Matches the CIC
// kernel used by pm.deposit / pm.interpolate_nested — same cell-center
// convention (center at (i + 0.5) * cellSize - domainHalf).
fn sampleOuterAt(world: vec3f) -> f32 {
  let fgrid = (world + vec3f(params.outerDomainHalf)) / params.outerCellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.outerGridRes);
  return
      outerPhi[outerCell(i0.x,     i0.y,     i0.z,     n)] * g.x * g.y * g.z
    + outerPhi[outerCell(i0.x + 1, i0.y,     i0.z,     n)] * f.x * g.y * g.z
    + outerPhi[outerCell(i0.x,     i0.y + 1, i0.z,     n)] * g.x * f.y * g.z
    + outerPhi[outerCell(i0.x + 1, i0.y + 1, i0.z,     n)] * f.x * f.y * g.z
    + outerPhi[outerCell(i0.x,     i0.y,     i0.z + 1, n)] * g.x * g.y * f.z
    + outerPhi[outerCell(i0.x + 1, i0.y,     i0.z + 1, n)] * f.x * g.y * f.z
    + outerPhi[outerCell(i0.x,     i0.y + 1, i0.z + 1, n)] * g.x * f.y * f.z
    + outerPhi[outerCell(i0.x + 1, i0.y + 1, i0.z + 1, n)] * f.x * f.y * f.z;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let n = params.innerGridRes;
  if (gid.x >= n || gid.y >= n || gid.z >= n) { return; }

  // World position of this inner cell's center. Matches the deposit kernel's
  // world→cell mapping so the BC lands on the same lattice the smoother sees.
  let cellIdx = vec3f(f32(gid.x), f32(gid.y), f32(gid.z));
  let world = (cellIdx + vec3f(0.5)) * params.innerCellSize - vec3f(params.innerDomainHalf);

  let sampled = sampleOuterAt(world);
  let me = gid.z * n * n + gid.y * n + gid.x;

  // select(f, t, cond): returns t when cond is true. Write the outer sample
  // into face cells only; interior cells keep their warm-start value.
  let atBoundary = gid.x == 0u || gid.x == (n - 1u)
                || gid.y == 0u || gid.y == (n - 1u)
                || gid.z == 0u || gid.z == (n - 1u);
  innerPhi[me] = select(innerPhi[me], sampled, atBoundary);
}

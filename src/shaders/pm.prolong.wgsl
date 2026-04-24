// Prolongation (coarse → fine) for the multigrid V-cycle. Each fine cell is
// trilinearly interpolated from the 8 surrounding coarse cells, and the
// interpolated value is ADDED to the fine buffer (it's a correction to the
// existing potential, not a replacement).
//
// Periodic wrap on coarse indices handles cells near the domain faces.

struct Params {
  fineGridRes: u32,   // coarseGridRes = fineGridRes / 2
  dirichletBoundary: u32,  // 0 = periodic (add correction everywhere), 1 = skip fine face cells
  _pad1: u32,
  _pad2: u32,
}

@group(0) @binding(0) var<storage, read> coarse: array<f32>;
@group(0) @binding(1) var<storage, read_write> fine: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn wrapIdx(i: i32, n: u32) -> u32 {
  let ni = i32(n);
  return u32(((i % ni) + ni) % ni);
}

fn cidx(ix: i32, iy: i32, iz: i32, n: u32) -> u32 {
  let x = wrapIdx(ix, n);
  let y = wrapIdx(iy, n);
  let z = wrapIdx(iz, n);
  return z * n * n + y * n + x;
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let nF = params.fineGridRes;
  if (gid.x >= nF || gid.y >= nF || gid.z >= nF) { return; }

  let nC = nF / 2u;

  // Coarse-coordinate position of this fine cell's center. The cell-center
  // offset of 0.25 aligns coarse cells to lie midway between fine cells.
  let fx = f32(gid.x) * 0.5 - 0.25;
  let fy = f32(gid.y) * 0.5 - 0.25;
  let fz = f32(gid.z) * 0.5 - 0.25;
  let i0 = vec3i(floor(vec3f(fx, fy, fz)));
  let frac = vec3f(fx, fy, fz) - vec3f(i0);
  let g = vec3f(1.0) - frac;

  let sum =
      coarse[cidx(i0.x,     i0.y,     i0.z,     nC)] * g.x * g.y * g.z
    + coarse[cidx(i0.x + 1, i0.y,     i0.z,     nC)] * frac.x * g.y * g.z
    + coarse[cidx(i0.x,     i0.y + 1, i0.z,     nC)] * g.x * frac.y * g.z
    + coarse[cidx(i0.x + 1, i0.y + 1, i0.z,     nC)] * frac.x * frac.y * g.z
    + coarse[cidx(i0.x,     i0.y,     i0.z + 1, nC)] * g.x * g.y * frac.z
    + coarse[cidx(i0.x + 1, i0.y,     i0.z + 1, nC)] * frac.x * g.y * frac.z
    + coarse[cidx(i0.x,     i0.y + 1, i0.z + 1, nC)] * g.x * frac.y * frac.z
    + coarse[cidx(i0.x + 1, i0.y + 1, i0.z + 1, nC)] * frac.x * frac.y * frac.z;

  // [LAW:dataflow-not-control-flow] For Dirichlet BC, fine face cells must
  // stay at their held value (BC at level 0, zero at coarser correction
  // levels). Compute the new value then select old-vs-new by face mask.
  let me = gid.z * nF * nF + gid.y * nF + gid.x;
  let nm1 = nF - 1u;
  let atBoundary = gid.x == 0u || gid.x == nm1
                || gid.y == 0u || gid.y == nm1
                || gid.z == 0u || gid.z == nm1;
  let freeze = atBoundary && params.dirichletBoundary != 0u;
  let oldFine = fine[me];
  fine[me] = select(oldFine + sum, oldFine, freeze);
}

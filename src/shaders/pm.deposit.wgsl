// PM CIC (cloud-in-cell) deposition. Each particle scatters its mass into
// the 8 surrounding grid cells with trilinear weights. Mass is pre-multiplied
// by PM_FIXED_POINT_SCALE so atomicAdd<u32> can accumulate fractional values
// without losing precision. [LAW:single-enforcer] This shader is the sole
// writer of pmDensityU32Buffer.
//
// Reversibility: the particle is half-drifted to posHalf so deposition matches
// the force-evaluation position used by the main compute shader. Wrapping to
// a different position would desynchronize PM gravity from the tile-pair sum.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

// Shared layout with pm.density_convert.wgsl / pm.interpolate_nested.wgsl.
// Only this shader reads `filterOutOfDomain`; the other shaders ignore it.
//
// filterOutOfDomain semantics (data-driven per-grid behavior):
//   0 → full periodic deposit. wrapIdx below scatters mass across the grid's
//       periodic boundary correctly. Right for the outer 3-torus grid, where
//       the periodic domain IS the physical domain.
//   1 → subdomain filter. Particles outside ±domainHalf return early without
//       depositing. Right for the inner subdomain grid (±16) — without this
//       filter, a particle at world x=20 would wrap-pollute cells near x=-12
//       via the periodic index wrap, creating phantom density.
//
// Why not a single threshold? The outer grid's `domainHalf` equals the
// periodic-wrap radius (64), but `posHalf = pos + vel*halfDt` is computed
// BEFORE `nbody.compute.wgsl`'s end-of-step periodic wrap. A fast particle
// near +64 can have posHalf > 64 for one step. Filtering on `domainHalf`
// for the outer grid would silently drop that particle's mass — breaking
// density conservation. The flag makes the filter strictly about subdomain
// containment, not about periodic wrap.
struct Params {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,
  filterOutOfDomain: u32,  // 0 = periodic grid (no filter), 1 = subdomain grid (filter)
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> density: array<atomic<u32>>;
@group(0) @binding(2) var<uniform> params: Params;

// Floor-mod in signed int. WGSL's % has sign-of-dividend semantics, so naive
// negative indices wrap wrong; ((i%n)+n)%n is the canonical fix.
fn wrapIdx(i: i32, n: i32) -> u32 {
  let m = ((i % n) + n) % n;
  return u32(m);
}

fn cellIndex(ix: i32, iy: i32, iz: i32, gridRes: i32) -> u32 {
  let x = wrapIdx(ix, gridRes);
  let y = wrapIdx(iy, gridRes);
  let z = wrapIdx(iz, gridRes);
  let n = u32(gridRes);
  return z * n * n + y * n + x;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodies[idx];
  let halfDt = params.dt * 0.5;
  // [LAW:one-source-of-truth] Deposition happens at the DKD half-step position,
  // matching the force evaluation in nbody.compute.wgsl.
  let posHalf = me.pos + me.vel * halfDt;

  // Subdomain filter (gated by the per-grid filterOutOfDomain flag).
  // See the Params struct header for the full rationale — the short version:
  // outer grid = 3-torus, wants periodic wrap (filter OFF); inner grid =
  // ±16 subdomain, wants strict containment (filter ON).
  let outOfDomain = abs(posHalf.x) > params.domainHalf
                 || abs(posHalf.y) > params.domainHalf
                 || abs(posHalf.z) > params.domainHalf;
  if (outOfDomain && params.filterOutOfDomain != 0u) { return; }

  // World → fractional grid coords. Grid spans [-domainHalf, +domainHalf);
  // cell centers are at (cell_i + 0.5) * cellSize - domainHalf.
  let fgrid = (posHalf + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f  = fgrid - vec3f(i0);  // fractional, in [0, 1)
  let g  = vec3f(1.0) - f;

  let m = me.mass * params.fixedPointScale;
  let gr = i32(params.gridRes);

  // 8-corner CIC kernel. Weights sum to exactly 1.0.
  atomicAdd(&density[cellIndex(i0.x,     i0.y,     i0.z,     gr)], u32(m * g.x * g.y * g.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y,     i0.z,     gr)], u32(m * f.x * g.y * g.z));
  atomicAdd(&density[cellIndex(i0.x,     i0.y + 1, i0.z,     gr)], u32(m * g.x * f.y * g.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y + 1, i0.z,     gr)], u32(m * f.x * f.y * g.z));
  atomicAdd(&density[cellIndex(i0.x,     i0.y,     i0.z + 1, gr)], u32(m * g.x * g.y * f.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y,     i0.z + 1, gr)], u32(m * f.x * g.y * f.z));
  atomicAdd(&density[cellIndex(i0.x,     i0.y + 1, i0.z + 1, gr)], u32(m * g.x * f.y * f.z));
  atomicAdd(&density[cellIndex(i0.x + 1, i0.y + 1, i0.z + 1, gr)], u32(m * f.x * f.y * f.z));
}

// PM density post-processing. Two entry points share one bind group layout:
//   reduce  — sum densityU32 (fixed-point) into meanScratch[0]
//   convert — for each cell: load u32, convert to f32, subtract mean, write f32
//
// The periodic Poisson solver in ticket .4 requires a mean-zero density. This
// shader's sole job is to produce that. densityU32 is NOT zeroed here — the
// host (main.ts) zeroes it with encoder.clearBuffer at the top of each frame
// so both this shader's final value and the next frame's fresh deposit start
// from a known-zero buffer.

// Shares layout with pm.deposit.wgsl Params so one host-side uniform buffer
// serves both pipelines. Only fixedPointScale and cellCount are read here.
struct Params {
  dt: f32,
  count: u32,
  gridRes: u32,
  domainHalf: f32,
  cellSize: f32,
  fixedPointScale: f32,
  cellCount: u32,         // = gridRes³
  _pad: u32,
}

@group(0) @binding(0) var<storage, read_write> densityU32: array<atomic<u32>>;
@group(0) @binding(1) var<storage, read_write> densityF32: array<f32>;
@group(0) @binding(2) var<storage, read_write> meanScratch: array<atomic<u32>>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(256)
fn reduce(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.cellCount) { return; }
  // [LAW:dataflow-not-control-flow] Every in-range thread contributes its one
  // cell to the global sum. Workgroup-local reduction would cut atomic traffic
  // ~256×; keeping it simple here and letting the hardware arbitrate.
  let v = atomicLoad(&densityU32[idx]);
  atomicAdd(&meanScratch[0], v);
}

@compute @workgroup_size(256)
fn convert(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.cellCount) { return; }
  // meanScratch[0] holds the total fixed-point density (sum over all cells).
  // Dividing by cellCount and by scale gives the per-cell mean density in f32.
  let sumRaw = atomicLoad(&meanScratch[0]);
  let mean = f32(sumRaw) / (f32(params.cellCount) * params.fixedPointScale);
  let cellRaw = atomicLoad(&densityU32[idx]);
  let cellDensity = f32(cellRaw) / params.fixedPointScale;
  densityF32[idx] = cellDensity - mean;
}

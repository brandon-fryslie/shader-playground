// Gas pressure potential construction.
//
// Isothermal pressure acceleration is -c_s^2 ∇ln(ρ), so pressure is represented
// as a scalar potential χ = c_s² ln(max(ρ, ρ_floor)). The particle pass then
// samples -∇χ exactly like PM gravity samples -∇φ.
// [LAW:dataflow-not-control-flow] Empty cells are regularized by data
// (rhoFloor), not by skipping pressure work.

struct Params {
  gridRes: u32,
  cellCount: u32,
  fixedPointScale: f32,
  soundSpeed: f32,
  rhoFloor: f32,
  rhoRef: f32,
  domainHalf: f32,
  cellSize: f32,
}

@group(0) @binding(0) var<storage, read_write> densityU32: array<atomic<u32>>;
@group(0) @binding(1) var<storage, read_write> densityF32: array<f32>;
@group(0) @binding(2) var<storage, read_write> chi: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.cellCount) { return; }

  let rho = f32(atomicLoad(&densityU32[idx])) / params.fixedPointScale;
  let rhoSafe = max(rho, params.rhoFloor);
  densityF32[idx] = rho;
  chi[idx] = params.soundSpeed * params.soundSpeed * log(rhoSafe / params.rhoRef);
}

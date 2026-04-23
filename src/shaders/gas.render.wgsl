struct Camera {
  view: mat4x4f,
  proj: mat4x4f,
  eye: vec3f,
  _pad: f32,
  primary: vec3f,
  _pad2: f32,
  secondary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
  interactPos: vec3f,
  interactActive: f32,
}

struct RenderParams {
  gridRes: u32,
  stepCount: u32,
  domainHalf: f32,
  cellSize: f32,
  densityScale: f32,
  visible: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> density: array<f32>;
@group(0) @binding(2) var<uniform> params: RenderParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var out: VSOut;
  out.pos = vec4f(p[vid], 0.0, 1.0);
  out.uv = p[vid] * 0.5 + vec2f(0.5);
  return out;
}

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

fn sampleDensity(p: vec3f) -> f32 {
  let fgrid = (p + vec3f(params.domainHalf)) / params.cellSize - vec3f(0.5);
  let i0 = vec3i(floor(fgrid));
  let f = fgrid - vec3f(i0);
  let g = vec3f(1.0) - f;
  let n = i32(params.gridRes);
  var rho = 0.0;
  rho += density[cellIdx(i0.x,     i0.y,     i0.z,     n)] * g.x * g.y * g.z;
  rho += density[cellIdx(i0.x + 1, i0.y,     i0.z,     n)] * f.x * g.y * g.z;
  rho += density[cellIdx(i0.x,     i0.y + 1, i0.z,     n)] * g.x * f.y * g.z;
  rho += density[cellIdx(i0.x + 1, i0.y + 1, i0.z,     n)] * f.x * f.y * g.z;
  rho += density[cellIdx(i0.x,     i0.y,     i0.z + 1, n)] * g.x * g.y * f.z;
  rho += density[cellIdx(i0.x + 1, i0.y,     i0.z + 1, n)] * f.x * g.y * f.z;
  rho += density[cellIdx(i0.x,     i0.y + 1, i0.z + 1, n)] * g.x * f.y * f.z;
  rho += density[cellIdx(i0.x + 1, i0.y + 1, i0.z + 1, n)] * f.x * f.y * f.z;
  return rho;
}

fn intersectBox(ro: vec3f, rd: vec3f, b: f32) -> vec2f {
  let inv = 1.0 / rd;
  let t0 = (vec3f(-b) - ro) * inv;
  let t1 = (vec3f( b) - ro) * inv;
  let lo = min(t0, t1);
  let hi = max(t0, t1);
  let enter = max(max(lo.x, lo.y), lo.z);
  let exit = min(min(hi.x, hi.y), hi.z);
  return vec2f(enter, exit);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  let ndc = in.uv * 2.0 - vec2f(1.0);
  let xAxis = vec3f(camera.view[0][0], camera.view[1][0], camera.view[2][0]);
  let yAxis = vec3f(camera.view[0][1], camera.view[1][1], camera.view[2][1]);
  let zAxis = vec3f(camera.view[0][2], camera.view[1][2], camera.view[2][2]);
  let ro = camera.eye;
  let viewRay = vec3f(ndc.x / camera.proj[0][0], ndc.y / camera.proj[1][1], -1.0);
  let rd = normalize(xAxis * viewRay.x + yAxis * viewRay.y + zAxis * viewRay.z);

  let hit = intersectBox(ro, rd, params.domainHalf);
  let t0 = max(hit.x, 0.0);
  let t1 = hit.y;
  if (t1 <= t0 || params.visible < 0.5) {
    discard;
  }

  let steps = max(params.stepCount, 1u);
  let dt = (t1 - t0) / f32(steps);
  var transmittance = 1.0;
  var glow = vec3f(0.0);

  for (var i = 0u; i < steps; i++) {
    let t = t0 + (f32(i) + 0.5) * dt;
    let p = ro + rd * t;
    let rho = sampleDensity(p) * params.densityScale;
    let alpha = clamp(1.0 - exp(-rho * dt), 0.0, 0.18);
    let tint = mix(camera.secondary * 0.7, camera.accent * 1.4, clamp(rho * 0.8, 0.0, 1.0));
    glow += transmittance * alpha * tint;
    transmittance *= 1.0 - alpha;
  }

  let a = clamp(1.0 - transmittance, 0.0, 0.75);
  return vec4f(glow, a);
}

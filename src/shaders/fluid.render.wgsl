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
}

struct FluidRenderParams {
  simRes: f32,
  gridRes: f32,
  heightScale: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> dye: array<vec4f>;
@group(0) @binding(1) var<uniform> params: FluidRenderParams;
@group(0) @binding(2) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPos: vec3f,
}

fn sampleHeight(u: f32, v: f32) -> f32 {
  let res = i32(params.simRes);
  let x = clamp(i32(u * f32(res)), 0, res - 1);
  let y = clamp(i32(v * f32(res)), 0, res - 1);
  // Height comes from dye density (alpha), not color magnitude — the alpha
  // channel is the mode-invariant splat amount stored in fluid.forces.wgsl,
  // so single/rainbow/temperature dye modes all produce the same surface
  // height for the same amount of injected dye.
  let d = dye[y * res + x];
  return d.a * params.heightScale;
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  // Each instance is one cell of the grid. vid selects triangle vertex (0-5).
  let gr = u32(params.gridRes);
  let cx = iid % gr;
  let cy = iid / gr;

  // 6 vertices per quad (2 triangles)
  let quadVerts = array<vec2u, 6>(
    vec2u(0,0), vec2u(1,0), vec2u(0,1),
    vec2u(0,1), vec2u(1,0), vec2u(1,1)
  );
  let corner = quadVerts[vid];
  let gx = cx + corner.x;
  let gy = cy + corner.y;

  let u = f32(gx) / f32(gr);
  let v = f32(gy) / f32(gr);
  let h = sampleHeight(u, v);

  // World position: x/z from -2 to 2, y = height
  let worldX = (u - 0.5) * 4.0;
  let worldZ = (v - 0.5) * 4.0;
  let worldY = h;

  // Compute normal from height differences
  let eps = 1.0 / f32(gr);
  let hL = sampleHeight(u - eps, v);
  let hR = sampleHeight(u + eps, v);
  let hD = sampleHeight(u, v - eps);
  let hU = sampleHeight(u, v + eps);
  let nx = (hL - hR) * 2.0;
  let nz = (hD - hU) * 2.0;
  let n = normalize(vec3f(nx, 1.0, nz));

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldX, worldY, worldZ, 1.0);
  out.uv = vec2f(u, v);
  out.normal = n;
  out.worldPos = vec3f(worldX, worldY, worldZ);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) normal: vec3f, @location(2) worldPos: vec3f) -> @location(0) vec4f {
  let res = i32(params.simRes);
  let x = clamp(i32(uv.x * f32(res)), 0, res - 1);
  let y = clamp(i32(uv.y * f32(res)), 0, res - 1);
  let d = dye[y * res + x];

  // Phong shading on the fluid surface
  let lightDir = normalize(vec3f(1.0, 3.0, 1.5));
  let n = normalize(normal);
  let ambient = 0.15;
  let diffuse = max(dot(n, lightDir), 0.0);
  let viewDir = normalize(camera.eye - worldPos);
  let halfDir = normalize(lightDir + viewDir);
  let spec = pow(max(dot(n, halfDir), 0.0), 64.0);

  // Base color from dye, tinted with theme
  let dyeColor = d.rgb + camera.primary * 0.1;
  let lit = dyeColor * (ambient + diffuse * 0.8) + vec3f(1.0) * spec * 0.3;

  return vec4f(lit, 1.0);
}

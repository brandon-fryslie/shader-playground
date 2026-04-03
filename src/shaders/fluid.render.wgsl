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
  worldSize: f32,
}

@group(0) @binding(0) var<storage, read> dye: array<vec4f>;
@group(0) @binding(1) var<uniform> params: FluidRenderParams;
@group(0) @binding(2) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPos: vec3f,
  @location(3) density: f32,
}

fn sampleDye(u: f32, v: f32) -> vec4f {
  let res = i32(params.simRes);
  let x = clamp(i32(u * f32(res)), 0, res - 1);
  let y = clamp(i32(v * f32(res)), 0, res - 1);
  return dye[y * res + x];
}

fn sampleDensity(u: f32, v: f32) -> f32 {
  let d = sampleDye(u, v);
  let raw = clamp(length(d.rgb) * 0.055 + d.a * 0.09, 0.0, 2.5);
  return 1.0 - exp(-raw * 1.35);
}

fn spectralThemeColor(uv: vec2f, worldPos: vec3f, dyeColor: vec3f, density: f32, camera: Camera) -> vec3f {
  let ribbon = 0.5 + 0.5 * sin(worldPos.x * 3.4 + worldPos.z * 2.8 + density * 4.0);
  let cross = 0.5 + 0.5 * sin((uv.x - uv.y) * 12.0 + worldPos.y * 6.0);
  let dyeEnergy = clamp(dot(dyeColor, vec3f(0.3333)), 0.0, 1.0);
  let warm = mix(camera.secondary, camera.accent, cross);
  let cool = mix(camera.primary, camera.secondary, ribbon);
  let spectral = mix(cool, warm, 0.45 + 0.35 * ribbon);
  let dyeTint = mix(dyeColor, vec3f(dyeColor.b, dyeColor.r, dyeColor.g), cross * 0.55);
  return mix(spectral, dyeTint, 0.35 + dyeEnergy * 0.4);
}

fn cubeCorner(vid: u32) -> vec3f {
  let corners = array<vec3f, 36>(
    vec3f(-1.0, -1.0,  1.0), vec3f( 1.0, -1.0,  1.0), vec3f(-1.0,  1.0,  1.0),
    vec3f(-1.0,  1.0,  1.0), vec3f( 1.0, -1.0,  1.0), vec3f( 1.0,  1.0,  1.0),
    vec3f( 1.0, -1.0, -1.0), vec3f(-1.0, -1.0, -1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f( 1.0,  1.0, -1.0), vec3f(-1.0, -1.0, -1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0, -1.0, -1.0), vec3f(-1.0, -1.0,  1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0, -1.0), vec3f(-1.0, -1.0,  1.0), vec3f(-1.0,  1.0,  1.0),
    vec3f( 1.0, -1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0,  1.0,  1.0),
    vec3f( 1.0,  1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0,  1.0), vec3f( 1.0,  1.0,  1.0), vec3f(-1.0,  1.0, -1.0),
    vec3f(-1.0,  1.0, -1.0), vec3f( 1.0,  1.0,  1.0), vec3f( 1.0,  1.0, -1.0),
    vec3f(-1.0, -1.0, -1.0), vec3f( 1.0, -1.0, -1.0), vec3f(-1.0, -1.0,  1.0),
    vec3f(-1.0, -1.0,  1.0), vec3f( 1.0, -1.0, -1.0), vec3f( 1.0, -1.0,  1.0)
  );
  return corners[vid];
}

fn cubeNormal(vid: u32) -> vec3f {
  let normals = array<vec3f, 36>(
    vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0),
    vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0), vec3f( 0.0,  0.0,  1.0),
    vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0),
    vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0), vec3f( 0.0,  0.0, -1.0),
    vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0),
    vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0), vec3f(-1.0,  0.0,  0.0),
    vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0),
    vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0), vec3f( 1.0,  0.0,  0.0),
    vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0),
    vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0), vec3f( 0.0,  1.0,  0.0),
    vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0),
    vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0), vec3f( 0.0, -1.0,  0.0)
  );
  return normals[vid];
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let gr = u32(params.gridRes);
  let cx = iid % gr;
  let cy = iid / gr;

  let u = (f32(cx) + 0.5) / f32(gr);
  let v = (f32(cy) + 0.5) / f32(gr);
  let density = sampleDensity(u, v);

  let cellSize = params.worldSize / f32(gr);
  let halfWidth = cellSize * mix(0.92, 1.34, density);
  // [LAW:one-source-of-truth] Render height is derived from the same density scalar for both the permanent floor and dynamic variation.
  let liftedDensity = pow(density, 0.58);
  let totalHeight = 0.14 + liftedDensity * params.heightScale * 2.6;
  let halfHeight = totalHeight * 0.5;
  let centerY = halfHeight;

  let local = cubeCorner(vid);
  let worldPos = vec3f(
    (u - 0.5) * params.worldSize + local.x * halfWidth,
    centerY + local.y * halfHeight,
    (v - 0.5) * params.worldSize + local.z * halfWidth
  );

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  out.uv = vec2f(u, v);
  out.normal = cubeNormal(vid);
  out.worldPos = worldPos;
  out.density = density;
  return out;
}

@fragment
fn fs_main(
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPos: vec3f,
  @location(3) density: f32
) -> @location(0) vec4f {
  let d = sampleDye(uv.x, uv.y);
  let n = normalize(normal);
  let lightDir = normalize(vec3f(1.0, 2.5, 1.3));
  let diffuse = max(dot(n, lightDir), 0.0);
  let viewDir = normalize(camera.eye - worldPos);
  let rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
  let spec = pow(max(dot(n, normalize(lightDir + viewDir)), 0.0), 24.0);

  // [LAW:one-source-of-truth] The richer palette is derived from the existing dye field plus theme colors; no parallel color state is introduced.
  let dyeColor = min(d.rgb, vec3f(1.0));
  let baseColor = spectralThemeColor(uv, worldPos, dyeColor, density, camera);
  let lit = baseColor * (0.16 + diffuse * 0.78) + camera.accent * rim * 0.16 + vec3f(1.0) * spec * 0.2;
  return vec4f(lit, 1.0);
}

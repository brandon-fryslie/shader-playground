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

struct Vertex {
  pos: vec3f,
  normal: vec3f,
}

@group(0) @binding(0) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> modelMatrix: mat4x4f;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  // vid indexes into the index buffer, but we use @builtin(vertex_index) with drawIndexed
  let v = vertices[vid];
  let world = modelMatrix * vec4f(v.pos, 1.0);

  var out: VSOut;
  out.pos = camera.proj * camera.view * world;
  out.normal = normalize((modelMatrix * vec4f(v.normal, 0.0)).xyz);
  out.worldPos = world.xyz;
  return out;
}

@fragment
fn fs_main(@location(0) normal: vec3f, @location(1) worldPos: vec3f) -> @location(0) vec4f {
  let lightDir = normalize(vec3f(1.0, 2.0, 1.5));
  let n = normalize(normal);

  // Phong shading
  let ambient = vec3f(0.08, 0.06, 0.12);
  let diffuse = max(dot(n, lightDir), 0.0);
  let viewDir = normalize(vec3f(0.0, 0.0, 5.0) - worldPos);
  let halfDir = normalize(lightDir + viewDir);
  let spec = pow(max(dot(n, halfDir), 0.0), 32.0);

  let baseColor = camera.primary;
  let color = ambient + baseColor * diffuse + vec3f(1.0) * spec * 0.5;

  // Two-sided lighting
  let backDiffuse = max(dot(-n, lightDir), 0.0);
  let backColor = ambient + camera.secondary * backDiffuse;

  let finalColor = select(backColor, color, dot(n, viewDir) > 0.0);
  return vec4f(finalColor, 1.0);
}

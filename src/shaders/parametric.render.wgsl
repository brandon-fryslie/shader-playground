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
  glow: f32,    // wave displacement magnitude
  normal: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> modelMatrix: mat4x4f;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
  @location(2) glow: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let v = vertices[vid];
  let world = modelMatrix * vec4f(v.pos, 1.0);

  var out: VSOut;
  out.pos = camera.proj * camera.view * world;
  out.normal = normalize((modelMatrix * vec4f(v.normal, 0.0)).xyz);
  out.worldPos = world.xyz;
  out.glow = v.glow;
  return out;
}

// Compact hue-to-rgb: maps [0,1] hue to full-saturation RGB
fn hue2rgb(h: f32) -> vec3f {
  let r = abs(h * 6.0 - 3.0) - 1.0;
  let g = 2.0 - abs(h * 6.0 - 2.0);
  let b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3f(r, g, b), vec3f(0.0), vec3f(1.0));
}

fn hsv2rgb(h: f32, s: f32, v: f32) -> vec3f {
  return ((hue2rgb(fract(h)) - 1.0) * s + 1.0) * v;
}

@fragment
fn fs_main(
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
  @location(2) glow: f32
) -> @location(0) vec4f {
  let n = normalize(normal);
  let viewDir = normalize(camera.eye - worldPos);
  let lightDir  = normalize(vec3f(1.0, 2.0, 1.5));
  let lightDir2 = normalize(vec3f(-0.8, -0.5, 0.3));  // cool fill light

  let nDotV    = dot(n, viewDir);
  let absNDotV = abs(nDotV);

  // Fresnel: peaks at grazing (edge) angles — drives iridescence intensity
  let fresnel = pow(1.0 - absNDotV, 2.5);

  // Iridescent hue: NdotV angle + world position create a shifting rainbow that
  // animates naturally as the shape rotates and waves deform the surface
  let hue = fract(absNDotV * 1.2 + worldPos.x * 0.12 + worldPos.y * 0.08 + worldPos.z * 0.10);
  let iridColor = hsv2rgb(hue, 0.88, 1.0);

  // Phong: key light + cool fill light for depth
  let diffuse  = max(dot( n, lightDir),  0.0);
  let diffuse2 = max(dot( n, lightDir2), 0.0);
  let backDiff = max(dot(-n, lightDir),  0.0);
  let halfDir  = normalize(lightDir + viewDir);
  let spec     = pow(max(dot(n, halfDir), 0.0), 96.0);

  // Mix theme color with iridescence — blend is strongest at grazing angles
  let baseColor = mix(camera.primary, iridColor, fresnel * 0.55 + 0.15);
  let fillColor = camera.secondary * diffuse2 * 0.3;
  let backColor = mix(camera.secondary * 0.5, iridColor * 0.3, fresnel * 0.4);

  let ambient    = vec3f(0.04, 0.03, 0.07);
  let frontColor = ambient + baseColor * (diffuse * 0.85 + 0.1) + fillColor + spec * 0.9;
  let rearColor  = ambient + backColor * (backDiff * 0.4 + 0.05);

  let shadedColor = select(rearColor, frontColor, nDotV > 0.0);

  // Fresnel rim glow in accent color
  let rimGlow = fresnel * camera.accent * 1.0;

  // Wave displacement emission: peaks glow in accent color
  let emission = min(glow, 1.0) * camera.accent * 0.7;

  return vec4f(shadedColor + rimGlow + emission, 1.0);
}

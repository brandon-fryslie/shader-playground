// Marker particles: small bright tracers orbiting each active attractor. Shares the same HDR scene
// target as the main N-body render so they feed the bloom pass naturally — no overlay, no reticle.

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

// Per-marker payload written by CPU each frame. strengthNorm drives brightness/size; it's the parent
// attractor's log-normalized strength so a maxed-ceiling attractor makes its swarm pop.
struct Marker {
  pos: vec3f,
  strengthNorm: f32,
  tint: vec3f,
  seed: f32,
}

@group(0) @binding(0) var<storage, read> markers: array<Marker>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) brightness: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let m = markers[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let view = camera.view * vec4f(m.pos, 1.0);
  let depth = min(max(abs(view.z), 0.05), 30.0);
  // Size grows gently with strength so dormant wands show a faint dusting and charged ones burn bright.
  let sizeScale = 0.0040 * depth * (0.7 + 0.9 * m.strengthNorm);
  let q = quadPos[vid];
  let billboarded = vec4f(view.xy + q * sizeScale, view.z, view.w);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = q;
  out.color = mix(camera.accent, m.tint, 0.35);
  out.brightness = 0.6 + 1.6 * m.strengthNorm;
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f, @location(2) brightness: f32) -> @location(0) vec4f {
  let d = length(uv);
  if (d > 1.0) { discard; }
  // Soft gaussian falloff — reads as a floating dust mote / spark, feeds bloom without hard edges.
  let core = exp(-d * 4.5) * 1.3;
  let halo = exp(-d * 1.8) * 0.35;
  let intensity = (core + halo) * brightness;
  return vec4f(color * intensity, 1.0);
}

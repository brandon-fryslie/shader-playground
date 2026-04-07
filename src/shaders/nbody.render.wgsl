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

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let body = bodies[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  let viewPos = camera.view * vec4f(body.pos, 1.0);
  // [LAW:single-enforcer] Mass-to-appearance compression is owned here so physics mass stays authoritative while visuals remain legible.
  let massVisual = clamp(sqrt(max(body.mass, 0.02)) / 3.4, 0.14, 1.0);
  // [LAW:dataflow-not-control-flow] Constant-pixel-size billboard: scale world offset by view-space depth so the
  // perspective divide produces a fixed NDC offset. Stars stay sharp pinpoints regardless of camera distance.
  let depth = max(abs(viewPos.z), 0.05);
  let pixelScale = 0.0065 * depth * mix(1.0, 3.4, massVisual);
  let offset = quadPos[vid] * pixelScale;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];

  // Color: primary → secondary by mass; heaviest bodies pick up accent.
  let massTint = clamp(pow(massVisual, 0.8), 0.0, 1.0);
  let baseCol = mix(camera.primary, camera.secondary, massTint);
  let heavyTint = smoothstep(0.7, 1.0, massVisual);
  out.color = mix(baseCol, mix(baseCol, camera.accent, 0.55), heavyTint);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f) -> @location(0) vec4f {
  let dist = length(uv);
  if (dist > 0.85) { discard; }
  // [LAW:dataflow-not-control-flow] Toned-down additive: per-particle peak is low enough that dense clusters
  // don't blow out, but a single particle still reads as a bright pinpoint. Bloom carries the wide glow externally.
  let core = exp(-dist * 22.0) * 1.8;
  let halo = exp(-dist * 5.0) * 0.45;
  let intensity = core + halo;
  let whiteShift = clamp(core * 0.06, 0.0, 0.3);
  let tinted = mix(color, vec3f(1.0), whiteShift);
  return vec4f(tinted * intensity, 1.0);
}

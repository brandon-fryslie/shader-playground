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

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> time: f32;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) worldPos: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let positions = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  let p = positions[vid];
  let worldPos = vec3f(p.x * 30.0, -4.0, p.y * 30.0);

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  out.worldPos = worldPos;
  return out;
}

@fragment
fn fs_main(@location(0) worldPos: vec3f) -> @location(0) vec4f {
  let spacing = 2.0;
  let gx = abs(fract(worldPos.x / spacing + 0.5) - 0.5) * spacing;
  let gz = abs(fract(worldPos.z / spacing + 0.5) - 0.5) * spacing;

  let lineWidth = 0.02;
  let dx = fwidth(worldPos.x);
  let dz = fwidth(worldPos.z);
  let lx = 1.0 - smoothstep(0.0, lineWidth + dx, gx);
  let lz = 1.0 - smoothstep(0.0, lineWidth + dz, gz);
  let line = max(lx, lz);

  let dist = length(worldPos.xz);

  // Travelling light pulses — slow waves rippling outward from origin
  let wave1 = sin(dist * 0.8 - time * 0.7) * 0.5 + 0.5;
  let wave2 = sin(dist * 0.5 - time * 0.4 + 2.0) * 0.5 + 0.5;
  let pulse1 = pow(wave1, 12.0);
  let pulse2 = pow(wave2, 16.0);
  let pulse = max(pulse1, pulse2);

  // Lines always visible — no distance fade on base, only on pulse
  let baseAlpha = line * 0.04;
  let pulseFade = 1.0 - smoothstep(10.0, 28.0, dist);
  let pulseAlpha = line * pulseFade * pulse * 0.12;
  let totalAlpha = baseAlpha + pulseAlpha;

  if (totalAlpha < 0.001) { discard; }

  let baseColor = vec3f(0.35, 0.35, 0.45);
  let pulseColor = camera.accent;
  let color = mix(baseColor, pulseColor, pulse);

  return vec4f(color, totalAlpha);
}

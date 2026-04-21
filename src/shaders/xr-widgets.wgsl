// XR widget renderer.
// One instanced draw call covers every widget in the active layout's render list.
// Vertex shader generates a quad from instance pose + half-extent; fragment
// renders an SDF rounded rectangle and branches on kind for kind-specific
// fills (slider track + thumb, button color, readout plate).
//
// Ticket .19 expands kind coverage (dial, toggle, stepper, enum-chips,
// preset-tile, category-tile) and adds a label/text atlas.

struct Camera {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  eye: vec3<f32>,    _p0: f32,
  primary: vec3<f32>,   _p1: f32,
  secondary: vec3<f32>, _p2: f32,
  accent: vec3<f32>,    _p3: f32,
};

struct Instance {
  position: vec3<f32>,        // world-space center
  halfExtentX: f32,
  orientation: vec4<f32>,     // xyzw quat
  halfExtentY: f32,
  kind: u32,                  // KIND_SLIDER=0, KIND_BUTTON=1, KIND_READOUT=2, KIND_OTHER=3
  flags: u32,                 // bit0 hover, bit1 pressed, bit2 dragging
  value: f32,                 // 0..1 normalized for slider
};

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;

struct VsOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,    // -1..1 in widget local plane
  @location(1) @interpolate(flat) kind: u32,
  @location(2) @interpolate(flat) flags: u32,
  @location(3) @interpolate(flat) value: f32,
};

fn qrot(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> {
  let u = q.xyz;
  let c1 = cross(u, v) + q.w * v;
  return v + 2.0 * cross(u, c1);
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VsOut {
  // Two-tri quad in widget-local XY plane; -1..1 each axis.
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0),
  );
  let uv = pos[vi];
  let inst = instances[ii];
  let local = vec3<f32>(uv.x * inst.halfExtentX, uv.y * inst.halfExtentY, 0.0);
  let world = inst.position + qrot(inst.orientation, local);
  var out: VsOut;
  out.clip = camera.proj * camera.view * vec4<f32>(world, 1.0);
  out.uv = uv;
  out.kind = inst.kind;
  out.flags = inst.flags;
  out.value = inst.value;
  return out;
}

// 2D rounded-box SDF. uv in [-1, 1]; r is corner radius in same units.
fn sdRoundedBox(p: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - vec2<f32>(1.0 - r, 1.0 - r);
  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let hover    = (in.flags & 1u) != 0u;
  let pressed  = (in.flags & 2u) != 0u;
  let dragging = (in.flags & 4u) != 0u;

  // Background plate — rounded rect with anti-aliased edge via fwidth.
  let d = sdRoundedBox(in.uv, 0.25);
  let aa = fwidth(d) * 1.5;
  let plate = 1.0 - smoothstep(-aa, aa, d);
  if (plate < 0.01) { discard; }

  // Theme-driven base colors. Pressed dims, hover brightens.
  let baseAccent = camera.accent;
  let basePri    = camera.primary;
  let baseSec    = camera.secondary;
  var bg  = mix(vec3<f32>(0.08, 0.08, 0.10), baseSec * 0.4, 0.6);
  if (hover)   { bg = mix(bg, basePri,   0.25); }
  if (pressed) { bg = bg * 0.7; }

  var fill = vec3<f32>(0.0);
  // KIND: 0=slider, 1=button, 2=readout, 3=other(rounded-rect placeholder)
  if (in.kind == 0u) {
    // Horizontal slider: track + filled portion + thumb at value position.
    // value is 0..1 in widget x-space; map to uv.x ∈ [-1, 1].
    let cx = -1.0 + 2.0 * clamp(in.value, 0.0, 1.0);
    let thumbR = 0.18;
    let thumbDist = length(vec2<f32>(in.uv.x - cx, in.uv.y));
    let thumb = 1.0 - smoothstep(thumbR - aa, thumbR + aa, thumbDist);
    let isFilled = step(in.uv.x, cx);
    fill = mix(bg, baseAccent, isFilled * 0.7);
    fill = mix(fill, basePri, thumb);
    if (dragging) { fill = mix(fill, basePri * 1.2, 0.3); }
  } else if (in.kind == 1u) {
    // Button: solid accent fill, hover brightens, pressed darkens.
    fill = baseAccent;
    if (hover)   { fill = fill * 1.2; }
    if (pressed) { fill = fill * 0.6; }
  } else if (in.kind == 2u) {
    // Readout: just the bg plate; label atlas (ticket .19) draws text on top.
    fill = bg;
  } else {
    // Placeholder: bg plate only.
    fill = bg;
  }

  return vec4<f32>(fill, plate);
}

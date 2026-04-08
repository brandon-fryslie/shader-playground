// Minimal in-world UI panel for WebXR. One quad in world space, all visuals
// drawn procedurally in the fragment shader via SDFs so we don't need textures
// or glyph atlases.

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

struct UIParams {
  center: vec3f,
  _pad1: f32,
  sizeX: f32,
  sizeY: f32,
  sliderValue: f32,
  hover: f32, // 0 none, 1 prev, 2 next, 3 slider
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> ui: UIParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let quad = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
  );
  let uv = quad[vid];
  let local = vec3f((uv.x - 0.5) * ui.sizeX, (uv.y - 0.5) * ui.sizeY, 0.0);
  let worldPos = ui.center + local;

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  out.uv = uv;
  return out;
}

// --- SDF primitives ---

fn sdBox(p: vec2f, halfSize: vec2f, r: f32) -> f32 {
  let q = abs(p) - halfSize + vec2f(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - r;
}

fn sdSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

fn sdChevron(p: vec2f, dir: f32) -> f32 {
  // dir = -1 for left-pointing, +1 for right-pointing
  let tip = vec2f(-0.05 * dir, 0.0);
  let top = vec2f( 0.05 * dir,  0.055);
  let bot = vec2f( 0.05 * dir, -0.055);
  let s1 = sdSegment(p, top, tip);
  let s2 = sdSegment(p, bot, tip);
  return min(s1, s2) - 0.012;
}

// --- Soft fills ---

fn fill(dist: f32, aa: f32) -> f32 {
  return 1.0 - smoothstep(-aa, aa, dist);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Panel-local coords with aspect correction so circles stay round.
  let aspect = ui.sizeX / ui.sizeY;
  let p = vec2f((uv.x - 0.5) * aspect, uv.y - 0.5);
  let aa = fwidth(p.x) * 1.5;

  // Background
  let bgHalf = vec2f(aspect * 0.5 - 0.02, 0.5 - 0.02);
  let bgDist = sdBox(p, bgHalf, 0.06);
  let bgMask = fill(bgDist, aa);
  if (bgMask < 0.01) { discard; }

  var col = mix(vec3f(0.0), vec3f(0.07, 0.09, 0.15), bgMask);
  var alpha = bgMask * 0.88;

  // Subtle accent border
  let borderDist = abs(bgDist + 0.012) - 0.002;
  let borderMask = fill(borderDist, aa) * bgMask;
  col = mix(col, camera.accent, borderMask * 0.55);

  // --- Button helper values ---
  let btnHalf = vec2f(0.12, 0.11);
  let btnR = 0.04;
  let prevC = vec2f(-aspect * 0.30, 0.16);
  let nextC = vec2f( aspect * 0.30, 0.16);

  // Prev button
  let prevDist = sdBox(p - prevC, btnHalf, btnR);
  let prevMask = fill(prevDist, aa);
  let prevHover = step(0.5, ui.hover) * (1.0 - step(1.5, ui.hover));
  let prevColor = mix(vec3f(0.13, 0.15, 0.22), camera.primary * 0.8, prevHover);
  col = mix(col, prevColor, prevMask * 0.95);

  // Prev chevron (pointing left)
  let prevChevDist = sdChevron(p - prevC, -1.0);
  let prevChevMask = fill(prevChevDist, aa);
  col = mix(col, vec3f(0.95), prevChevMask);

  // Next button
  let nextDist = sdBox(p - nextC, btnHalf, btnR);
  let nextMask = fill(nextDist, aa);
  let nextHover = step(1.5, ui.hover) * (1.0 - step(2.5, ui.hover));
  let nextColor = mix(vec3f(0.13, 0.15, 0.22), camera.primary * 0.8, nextHover);
  col = mix(col, nextColor, nextMask * 0.95);

  let nextChevDist = sdChevron(p - nextC, 1.0);
  let nextChevMask = fill(nextChevDist, aa);
  col = mix(col, vec3f(0.95), nextChevMask);

  // Slider track
  let sliderY = -0.20;
  let trackHalfW = aspect * 0.42;
  let trackDist = sdBox(p - vec2f(0.0, sliderY), vec2f(trackHalfW, 0.014), 0.014);
  let trackMask = fill(trackDist, aa);
  col = mix(col, vec3f(0.14, 0.16, 0.24), trackMask);

  // Slider fill (left edge of track to knob)
  let knobX = -trackHalfW + 2.0 * trackHalfW * ui.sliderValue;
  let fillHalfW = (knobX + trackHalfW) * 0.5;
  let fillCenterX = -trackHalfW + fillHalfW;
  let fillDist = sdBox(p - vec2f(fillCenterX, sliderY), vec2f(max(fillHalfW, 0.0001), 0.014), 0.014);
  let fillMask = fill(fillDist, aa) * trackMask;
  col = mix(col, camera.primary, fillMask);

  // Knob
  let knobDist = length(p - vec2f(knobX, sliderY)) - 0.032;
  let knobMask = fill(knobDist, aa);
  let sliderHover = step(2.5, ui.hover);
  let knobColor = mix(vec3f(0.92, 0.94, 1.0), camera.accent, sliderHover * 0.7);
  col = mix(col, knobColor, knobMask);

  // HDR boost so the panel reads through tonemap / bloom
  col = col * 1.3;
  alpha = max(alpha, max(prevMask, max(nextMask, max(trackMask, knobMask))));
  return vec4f(col, alpha);
}

// In-world UI panel for WebXR. One quad in world space. Buttons/slider drawn
// procedurally via SDFs; text labels come from a small canvas-rendered texture
// sampled in the label regions.

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

// Label atlas layout (matches updateXrUiLabels in main.ts):
// [0.00 .. 0.25] → "PREV"   (sub-rect aspect 2:1 → matches button label rect)
// [0.25 .. 0.50] → "NEXT"   (same 2:1)
// [0.50 .. 0.82] → slider label (aspect ~2.6:1 → matches slider label rect)
// [0.82 .. 1.00] → FPS readout (aspect ~1.4:1 → small stats text)
const LABEL_PREV_U0: f32 = 0.0;
const LABEL_PREV_U1: f32 = 0.25;
const LABEL_NEXT_U0: f32 = 0.25;
const LABEL_NEXT_U1: f32 = 0.50;
const LABEL_SLIDER_U0: f32 = 0.50;
const LABEL_SLIDER_U1: f32 = 0.82;
const LABEL_FPS_U0: f32 = 0.82;
const LABEL_FPS_U1: f32 = 1.00;

struct UIParams {
  center: vec3f,
  _pad1: f32,
  sizeX: f32,
  sizeY: f32,
  sliderValue: f32,
  hover: f32,       // 0 none, 1 prev, 2 next, 3 slider
  hitX: f32,        // reticle panel-local x (aspect-corrected)
  hitY: f32,        // reticle panel-local y
  hitActive: f32,   // 0 hidden, 1 visible
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> ui: UIParams;
@group(0) @binding(2) var labelTex: texture_2d<f32>;
@group(0) @binding(3) var labelSamp: sampler;

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

// dir = -1 → points left (tip on -x). dir = +1 → points right (tip on +x).
fn sdChevron(p: vec2f, dir: f32) -> f32 {
  let tip = vec2f( 0.05 * dir, 0.0);
  let top = vec2f(-0.05 * dir,  0.055);
  let bot = vec2f(-0.05 * dir, -0.055);
  let s1 = sdSegment(p, top, tip);
  let s2 = sdSegment(p, bot, tip);
  return min(s1, s2) - 0.012;
}

fn fill(dist: f32, aa: f32) -> f32 {
  return 1.0 - smoothstep(-aa, aa, dist);
}

// Sample a label sub-region given panel-local coords within the element rect.
// localP is element-local (center = 0), halfSize is the element half extent.
// u0/u1 are the sub-strip bounds inside labelTex.
fn sampleLabel(localP: vec2f, halfSize: vec2f, u0: f32, u1: f32) -> vec4f {
  let lu = (localP.x / halfSize.x) * 0.5 + 0.5;
  let lv = 1.0 - ((localP.y / halfSize.y) * 0.5 + 0.5);
  if (lu < 0.0 || lu > 1.0 || lv < 0.0 || lv > 1.0) { return vec4f(0.0); }
  let u = mix(u0, u1, lu);
  return textureSample(labelTex, labelSamp, vec2f(u, lv));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
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

  let borderDist = abs(bgDist + 0.012) - 0.002;
  let borderMask = fill(borderDist, aa) * bgMask;
  col = mix(col, camera.accent, borderMask * 0.55);

  // --- Buttons ---
  // Button half-size is 0.18 wide so a 0.10-wide chevron and a 0.16-wide label
  // rect both fit inside with a small gap. Mirrored across the panel centerline.
  let btnHalf = vec2f(0.18, 0.11);
  let btnR = 0.04;
  let prevC = vec2f(-aspect * 0.30, 0.16);
  let nextC = vec2f( aspect * 0.30, 0.16);

  // Prev
  let prevDist = sdBox(p - prevC, btnHalf, btnR);
  let prevMask = fill(prevDist, aa);
  let prevHover = step(0.5, ui.hover) * (1.0 - step(1.5, ui.hover));
  let prevColor = mix(vec3f(0.13, 0.15, 0.22), camera.primary * 0.8, prevHover);
  col = mix(col, prevColor, prevMask * 0.95);

  let prevChevCenter = vec2f(prevC.x - 0.10, prevC.y);
  let prevChevDist = sdChevron(p - prevChevCenter, -1.0);
  let prevChevMask = fill(prevChevDist, aa);
  col = mix(col, vec3f(0.95), prevChevMask);

  let prevLabelC = vec2f(prevC.x + 0.06, prevC.y);
  let prevLabelHalf = vec2f(0.08, 0.04);
  let prevLabelPx = p - prevLabelC;
  if (abs(prevLabelPx.x) < prevLabelHalf.x && abs(prevLabelPx.y) < prevLabelHalf.y) {
    let labelCol = sampleLabel(prevLabelPx, prevLabelHalf, LABEL_PREV_U0, LABEL_PREV_U1);
    col = mix(col, vec3f(0.97), labelCol.a * prevMask);
  }

  // Next
  let nextDist = sdBox(p - nextC, btnHalf, btnR);
  let nextMask = fill(nextDist, aa);
  let nextHover = step(1.5, ui.hover) * (1.0 - step(2.5, ui.hover));
  let nextColor = mix(vec3f(0.13, 0.15, 0.22), camera.primary * 0.8, nextHover);
  col = mix(col, nextColor, nextMask * 0.95);

  let nextChevCenter = vec2f(nextC.x + 0.10, nextC.y);
  let nextChevDist = sdChevron(p - nextChevCenter, 1.0);
  let nextChevMask = fill(nextChevDist, aa);
  col = mix(col, vec3f(0.95), nextChevMask);

  let nextLabelC = vec2f(nextC.x - 0.06, nextC.y);
  let nextLabelHalf = vec2f(0.08, 0.04);
  let nextLabelPx = p - nextLabelC;
  if (abs(nextLabelPx.x) < nextLabelHalf.x && abs(nextLabelPx.y) < nextLabelHalf.y) {
    let labelCol = sampleLabel(nextLabelPx, nextLabelHalf, LABEL_NEXT_U0, LABEL_NEXT_U1);
    col = mix(col, vec3f(0.97), labelCol.a * nextMask);
  }

  // --- Slider label (above the track) ---
  let sliderLabelC = vec2f(0.0, -0.04);
  let sliderLabelHalf = vec2f(0.24, 0.06);
  let sliderLabelPx = p - sliderLabelC;
  if (abs(sliderLabelPx.x) < sliderLabelHalf.x && abs(sliderLabelPx.y) < sliderLabelHalf.y) {
    let labelCol = sampleLabel(sliderLabelPx, sliderLabelHalf, LABEL_SLIDER_U0, LABEL_SLIDER_U1);
    col = mix(col, camera.accent, labelCol.a * 0.95);
    alpha = max(alpha, labelCol.a);
  }

  // --- Slider ---
  let sliderY = -0.20;
  let trackHalfW = aspect * 0.42;
  let trackDist = sdBox(p - vec2f(0.0, sliderY), vec2f(trackHalfW, 0.014), 0.014);
  let trackMask = fill(trackDist, aa);
  col = mix(col, vec3f(0.14, 0.16, 0.24), trackMask);

  let knobX = -trackHalfW + 2.0 * trackHalfW * ui.sliderValue;
  let fillHalfW = (knobX + trackHalfW) * 0.5;
  let fillCenterX = -trackHalfW + fillHalfW;
  let fillDist = sdBox(p - vec2f(fillCenterX, sliderY), vec2f(max(fillHalfW, 0.0001), 0.014), 0.014);
  let fillMask = fill(fillDist, aa) * trackMask;
  col = mix(col, camera.primary, fillMask);

  let knobDist = length(p - vec2f(knobX, sliderY)) - 0.032;
  let knobMask = fill(knobDist, aa);
  let sliderHover = step(2.5, ui.hover);
  let knobColor = mix(vec3f(0.92, 0.94, 1.0), camera.accent, sliderHover * 0.7);
  col = mix(col, knobColor, knobMask);

  // --- Grab handle (thin pill at the bottom for panel repositioning) ---
  let grabY = -0.40;
  let grabDist = sdBox(p - vec2f(0.0, grabY), vec2f(0.10, 0.02), 0.02);
  let grabMask = fill(grabDist, aa);
  let grabHover = step(3.5, ui.hover) * (1.0 - step(4.5, ui.hover));
  let grabColor = mix(vec3f(0.22, 0.24, 0.32), camera.accent * 0.9, grabHover);
  col = mix(col, grabColor, grabMask);
  alpha = max(alpha, grabMask * 0.95);

  // --- FPS readout (top-right corner of panel) ---
  let fpsC = vec2f(aspect * 0.32, 0.38);
  let fpsHalf = vec2f(0.12, 0.04);
  let fpsPx = p - fpsC;
  if (abs(fpsPx.x) < fpsHalf.x && abs(fpsPx.y) < fpsHalf.y) {
    let labelCol = sampleLabel(fpsPx, fpsHalf, LABEL_FPS_U0, LABEL_FPS_U1);
    col = mix(col, vec3f(0.6, 0.65, 0.7), labelCol.a * 0.8);
  }

  // --- Reticle where the XR ray currently intersects the panel ---
  if (ui.hitActive > 0.5) {
    let hitP = p - vec2f(ui.hitX, ui.hitY);
    let dist = length(hitP);
    let ringOuter = 1.0 - smoothstep(0.018, 0.022, dist);
    let ringInner = smoothstep(0.012, 0.016, dist);
    let ring = ringOuter * ringInner;
    let core = 1.0 - smoothstep(0.002, 0.006, dist);
    let reticleAlpha = max(ring, core);
    col = mix(col, camera.accent * 1.8, reticleAlpha);
    alpha = max(alpha, reticleAlpha);
  }

  col = col * 1.3;
  alpha = max(alpha, max(prevMask, max(nextMask, max(trackMask, knobMask))));
  return vec4f(col, alpha);
}

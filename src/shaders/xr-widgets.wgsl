// XR widget renderer.
// One instanced draw call covers every widget in the active layout's render
// list. Vertex shader generates a quad from instance pose + half-extent;
// fragment renders an SDF rounded rectangle and branches on `kind` for
// kind-specific fills (slider track, dial arc, toggle knob, etc.).
//
// Label atlas: instance.labelStripIndex selects a 32-pixel-tall strip in the
// 256x2048 atlas texture; instance.hasLabel gates the lookup. CPU side
// (renderer.ts) re-rasterizes a strip when the binding's text changes.
//
// Kind codes — keep in sync with renderer.ts KIND map and step.ts widget union:
//   0 slider         5 stepper
//   1 button         6 enum-chips
//   2 readout        7 preset-tile
//   3 dial           8 category-tile
//   4 toggle

struct Camera {
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
  eye: vec3<f32>,    _p0: f32,
  primary: vec3<f32>,   _p1: f32,
  secondary: vec3<f32>, _p2: f32,
  accent: vec3<f32>,    _p3: f32,
};

struct Instance {
  position: vec3<f32>,
  halfExtentX: f32,
  orientation: vec4<f32>,
  halfExtentY: f32,
  kind: u32,
  flags: u32,
  value: f32,
  labelStripIndex: u32,
  hasLabel: u32,
  _pad0: u32,
  _pad1: u32,
};

const ATLAS_W: f32 = 512.0;
const ATLAS_H: f32 = 4096.0;
const STRIP_H: f32 = 64.0;
const STRIP_V_FRAC: f32 = STRIP_H / ATLAS_H; // 1/64

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;
@group(0) @binding(2) var atlas: texture_2d<f32>;
@group(0) @binding(3) var atlasSampler: sampler;

struct VsOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) kind: u32,
  @location(2) @interpolate(flat) flags: u32,
  @location(3) @interpolate(flat) value: f32,
  @location(4) @interpolate(flat) stripIndex: u32,
  @location(5) @interpolate(flat) hasLabel: u32,
  @location(6) @interpolate(flat) halfX: f32,
  @location(7) @interpolate(flat) halfY: f32,
};

fn qrot(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> {
  let u = q.xyz;
  let c1 = cross(u, v) + q.w * v;
  return v + 2.0 * cross(u, c1);
}

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VsOut {
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
  out.stripIndex = inst.labelStripIndex;
  out.hasLabel = inst.hasLabel;
  out.halfX = inst.halfExtentX;
  out.halfY = inst.halfExtentY;
  return out;
}

// Rounded-box SDF in [-1,1]² with radius r in same units. Negative inside.
fn sdRoundedBox(p: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - vec2<f32>(1.0 - r, 1.0 - r);
  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// Filled circle SDF at center, radius r. Negative inside.
fn sdCircle(p: vec2<f32>, c: vec2<f32>, r: f32) -> f32 {
  return length(p - c) - r;
}

// Equilateral triangle pointing in direction (sign of x). Used for chevrons.
fn sdTriangleX(p: vec2<f32>, c: vec2<f32>, h: f32, dir: f32) -> f32 {
  let q = vec2<f32>((p.x - c.x) * dir, p.y - c.y);
  let d = max(q.x - h, abs(q.y) - (h - q.x));
  return d;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4<f32> {
  let hover    = (in.flags & 1u) != 0u;
  let pressed  = (in.flags & 2u) != 0u;
  let dragging = (in.flags & 4u) != 0u;

  let d = sdRoundedBox(in.uv, 0.25);
  let aa = fwidth(d) * 1.5;
  let plate = 1.0 - smoothstep(-aa, aa, d);
  if (plate < 0.01) { discard; }

  let baseAccent = camera.accent;
  let basePri    = camera.primary;
  let baseSec    = camera.secondary;
  var bg = mix(vec3<f32>(0.08, 0.08, 0.10), baseSec * 0.4, 0.6);
  if (hover)   { bg = mix(bg, basePri, 0.25); }
  if (pressed) { bg = bg * 0.7; }

  var fill = bg;
  // Some kinds want their label centered, others top-aligned (preset/category
  // tiles draw text in the lower band so the preview can occupy the upper
  // band). Default = centered.
  var labelCenterY: f32 = 0.0;

  if (in.kind == 0u) {
    // SLIDER. Track + filled portion + circular thumb at value position.
    let cx = -1.0 + 2.0 * clamp(in.value, 0.0, 1.0);
    let thumbR = 0.18;
    let thumb = 1.0 - smoothstep(thumbR - aa, thumbR + aa,
      length(vec2<f32>(in.uv.x - cx, in.uv.y)));
    let isFilled = step(in.uv.x, cx);
    fill = mix(bg, baseAccent, isFilled * 0.7);
    fill = mix(fill, basePri, thumb);
    if (dragging) { fill = mix(fill, basePri * 1.2, 0.3); }
    labelCenterY = -0.55;
  } else if (in.kind == 1u) {
    // BUTTON. Solid accent fill; hover brightens; pressed darkens.
    fill = baseAccent;
    if (hover)   { fill = fill * 1.2; }
    if (pressed) { fill = fill * 0.6; }
  } else if (in.kind == 2u) {
    // READOUT. Plate only — label drawn below.
    fill = bg;
  } else if (in.kind == 3u) {
    // DIAL. Outer ring + filled arc up to angle = value*2π.
    // Circle in unit square — assume widget is ~square; ring radius 0.85.
    let r = length(in.uv);
    let ringMask = 1.0 - smoothstep(0.06 - aa, 0.06 + aa, abs(r - 0.7));
    fill = mix(bg, baseSec * 0.5, ringMask);
    // Filled arc: angle 0 at top (uv.y=1), sweeping clockwise.
    let theta = atan2(in.uv.x, in.uv.y);                 // 0 at top, +x right
    let thetaPos = select(theta + 6.2831853, theta, theta >= 0.0);
    let arcEnd = clamp(in.value, 0.0, 1.0) * 6.2831853;
    let inArc = step(thetaPos, arcEnd) * step(0.55, r) * step(r, 0.85);
    fill = mix(fill, baseAccent, inArc);
    // Center dot.
    let dot = 1.0 - smoothstep(0.08 - aa, 0.08 + aa, r);
    fill = mix(fill, basePri, dot);
    labelCenterY = 0.0;
  } else if (in.kind == 4u) {
    // TOGGLE (switch). Track in upper band, knob slid by value (0 or 1).
    // Treat in.value > 0.5 as on. Knob centered on track at left/right.
    let on = step(0.5, in.value);
    let knobCx = -0.4 + 0.8 * on;
    let track = 1.0 - smoothstep(0.40 - aa, 0.40 + aa,
      max(abs(in.uv.x) - 0.55, abs(in.uv.y - 0.0) - 0.25));
    fill = mix(bg, mix(baseSec * 0.5, baseAccent, on), track * 0.8);
    let knob = 1.0 - smoothstep(0.22 - aa, 0.22 + aa,
      length(vec2<f32>(in.uv.x - knobCx, in.uv.y)));
    fill = mix(fill, basePri, knob);
    labelCenterY = -0.6;
  } else if (in.kind == 5u) {
    // STEPPER. Plate + ◀ ▶ chevrons on edges. Chevrons brighten on hover.
    let chevColor = mix(basePri, baseAccent, select(0.0, 1.0, hover));
    let leftDist  = sdTriangleX(in.uv, vec2<f32>(-0.75, 0.0), 0.18, -1.0);
    let rightDist = sdTriangleX(in.uv, vec2<f32>( 0.75, 0.0), 0.18,  1.0);
    let leftMask  = 1.0 - smoothstep(0.0 - aa, 0.0 + aa, leftDist);
    let rightMask = 1.0 - smoothstep(0.0 - aa, 0.0 + aa, rightDist);
    fill = mix(bg, chevColor, max(leftMask, rightMask));
    labelCenterY = 0.0;
  } else if (in.kind == 6u) {
    // ENUM-CHIPS. Bg plate with the active value's label centered. Real
    // multi-chip rendering is a future polish; this MVP shows current value.
    fill = mix(bg, baseSec * 0.4, 0.5);
    if (hover) { fill = mix(fill, basePri, 0.2); }
  } else if (in.kind == 7u) {
    // PRESET-TILE. Larger preview blob in the upper band, label below.
    fill = bg;
    let blobC = vec2<f32>(0.0, 0.35);
    let blob = 1.0 - smoothstep(0.45 - aa, 0.45 + aa, length(in.uv - blobC));
    fill = mix(fill, mix(baseAccent, basePri, 0.5), blob * 0.9);
    if (hover) { fill = mix(fill, basePri, 0.2); }
    if (pressed) { fill = fill * 0.7; }
    labelCenterY = -0.55;
  } else {
    // CATEGORY-TILE (8) and any future-added kind. Bigger plate + chevron right.
    fill = mix(bg, basePri * 0.4, 0.5);
    let chev = sdTriangleX(in.uv, vec2<f32>(0.78, 0.0), 0.14, 1.0);
    let chevMask = 1.0 - smoothstep(0.0 - aa, 0.0 + aa, chev);
    fill = mix(fill, baseAccent, chevMask);
    if (hover) { fill = mix(fill, basePri, 0.2); }
  }

  // ── LABEL OVERLAY ───────────────────────────────────────────────────────
  // Aspect-correct atlas sampling. Atlas strip is 8:1 wide; widget text region
  // is (2*halfX) : (V_BAND * 2*halfY). Map widget uv.x to a sub-range of atlas
  // u so glyphs render at their natural aspect — full atlas width across a
  // wide widget would stretch text 2x+ horizontally; sub-range keeps glyphs
  // shaped like the canvas drew them.
  if (in.hasLabel != 0u) {
    let CANVAS_ASPECT = ATLAS_W / STRIP_H;        // 8.0
    let V_BAND = 0.45;                             // strip occupies ±V_BAND in widget uv
    let widgetTextAspect = in.halfX / max(V_BAND * in.halfY, 0.001);
    // Floor uHalf at 0.4 so very narrow widgets still show readable text
    // (cropping a few glyphs is preferable to invisible text).
    let uHalf = clamp(widgetTextAspect / CANVAS_ASPECT * 0.5, 0.1, 0.5);
    let labelU = 0.5 + in.uv.x * uHalf;
    let labelLocalV = (in.uv.y - labelCenterY) / V_BAND; // -1..1 inside the strip
    let stripV0 = f32(in.stripIndex) * STRIP_V_FRAC;
    let labelV = stripV0 + (labelLocalV * 0.5 + 0.5) * STRIP_V_FRAC;
    if (labelU >= 0.0 && labelU <= 1.0 && labelLocalV >= -1.0 && labelLocalV <= 1.0) {
      let glyph = textureSample(atlas, atlasSampler, vec2<f32>(labelU, labelV));
      fill = mix(fill, vec3<f32>(0.97, 0.97, 0.97), glyph.a);
    }
  }

  return vec4<f32>(fill, plate);
}

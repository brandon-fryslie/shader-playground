(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`// [LAW:one-source-of-truth] Net angular momentum is computed in one place so the disk-recovery layer always reads from a single canonical source.
// Single-workgroup reduction: 64 threads cooperatively sum cross(pos, vel)*mass over all bodies.
// Output is one vec4f (xyz = L, w = unused) which the CPU reads back asynchronously to derive the disk normal.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct ReduceParams {
  count: u32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> outL: array<vec4f, 1>;
@group(0) @binding(2) var<uniform> rp: ReduceParams;

var<workgroup> partial: array<vec3f, 64>;

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_id) lid: vec3u) {
  var sum = vec3f(0.0);
  let n = rp.count;
  var i = lid.x;
  // [LAW:dataflow-not-control-flow] Stride loop runs the same shape for every thread; only the iteration count varies with body count.
  loop {
    if (i >= n) { break; }
    let b = bodies[i];
    let m = max(b.mass, 0.001);
    sum += cross(b.pos, b.vel) * m;
    i += 64u;
  }
  partial[lid.x] = sum;
  workgroupBarrier();
  if (lid.x == 0u) {
    var total = vec3f(0.0);
    for (var k = 0u; k < 64u; k++) {
      total += partial[k];
    }
    outL[0] = vec4f(total, 1.0);
  }
}
`,t=`// [LAW:one-source-of-truth] System-wide statistics computed in one reduction pass.
// Single-workgroup reduction: 64 threads cooperatively sum over all bodies.
// Output struct provides KE, PE estimate, rmsRadius, rmsHeight, angular momentum for
// CPU-side dynamic equilibrium control (virial ratio targeting).

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct StatsParams {
  count: u32,
  sourceCount: u32,
  softeningSq: f32,
  G: f32,
}

// Output: 8 floats = 32 bytes
// [0] totalKE           — sum of 0.5 * m * |v|²
// [1] totalPE           — estimated from sum of -G * m * M_enclosed(r) / r
// [2] sumR2             — sum of |pos|² (for rmsRadius = sqrt(sumR2 / count))
// [3] sumH2             — sum of (pos · diskNormal)² (for rmsHeight)
// [4-6] angularMomentum — sum of cross(pos, vel) * mass
// [7] totalMass         — sum of mass
struct StatsOutput {
  data: array<f32, 8>,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> out: StatsOutput;
@group(0) @binding(2) var<uniform> params: StatsParams;

// Per-thread partial sums: 8 floats each
var<workgroup> partials: array<array<f32, 8>, 64>;

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_id) lid: vec3u) {
  var ke: f32 = 0.0;
  var pe: f32 = 0.0;
  var r2sum: f32 = 0.0;
  var h2sum: f32 = 0.0;
  var lx: f32 = 0.0;
  var ly: f32 = 0.0;
  var lz: f32 = 0.0;
  var msum: f32 = 0.0;

  let n = params.count;
  let sc = params.sourceCount;
  let softSq = params.softeningSq;
  let G = params.G;

  // Precompute cumulative mass profile for PE estimation.
  // Approximate: enclosed mass at radius r ≈ (sourceCount * avgMass) * (r/rMax)^2 for uniform-ish halo.
  // This avoids O(N²) pairwise computation. The PE per particle is then -G * M_enc(r) * m / r.

  var i = lid.x;
  loop {
    if (i >= n) { break; }
    let b = bodies[i];
    let m = b.mass;
    let v2 = dot(b.vel, b.vel);
    let r2 = dot(b.pos, b.pos);
    let r = sqrt(r2 + 0.0001);

    // Kinetic energy — use actual mass, not clamped, so zero-mass tracers don't inflate KE
    ke += 0.5 * m * v2;

    // Potential energy: PE_i = -G_raw * M_enclosed(r) * m_i / sqrt(r² + ε²)
    // M_enclosed uses the exponential profile integral: (-1/λ)*exp(-λ*r/scale) + 1/λ
    // normalized by the integral at the full scale.
    let lambda = 5.0;
    let scale = 3.5;
    let intR = (-1.0/lambda) * exp(-lambda * r / scale) + (1.0/lambda);
    let intMax = (-1.0/lambda) * exp(-lambda) + (1.0/lambda);
    let encFrac = clamp(intR / intMax, 0.0, 1.0);
    // Average source body mass ≈ 0.9 (midpoint of big 0.8-1.8 and medium 0.3-0.9 ranges)
    let totalSourceMass = f32(sc) * 0.9;
    pe -= G * encFrac * totalSourceMass * m * inverseSqrt(r2 + softSq);

    // Radius squared
    r2sum += r2;

    // Height above y=0 plane (approximate disk normal as y-axis for reduction)
    // The CPU-side normal rotation handles the actual disk plane.
    h2sum += b.pos.y * b.pos.y;

    // Angular momentum: L = r × (m*v)
    let mv = max(m, 0.001);
    lx += (b.pos.y * b.vel.z - b.pos.z * b.vel.y) * mv;
    ly += (b.pos.z * b.vel.x - b.pos.x * b.vel.z) * mv;
    lz += (b.pos.x * b.vel.y - b.pos.y * b.vel.x) * mv;

    msum += m;

    i += 64u;
  }

  partials[lid.x] = array<f32, 8>(ke, pe, r2sum, h2sum, lx, ly, lz, msum);
  workgroupBarrier();

  // Thread 0 reduces all partials
  if (lid.x == 0u) {
    var totals = array<f32, 8>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    for (var k = 0u; k < 64u; k++) {
      for (var j = 0u; j < 8u; j++) {
        totals[j] += partials[k][j];
      }
    }
    out.data = totals;
  }
}
`,n=`struct Camera {
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
  @location(1) surfaceCoord: vec2f,
}

// [LAW:one-source-of-truth] Room dimensions live in one block so floor and wall placement stay aligned.
const ROOM_HALF_WIDTH = 72.0;
const ROOM_HALF_HEIGHT = 34.0;
const ROOM_FLOOR_Y = -48.0;
const ROOM_SURFACE_COUNT = 5u;
// [LAW:one-source-of-truth] Grid spacing and width stay centralized so the distant shell reads consistently.
const GRID_SPACING = 12.0;
const GRID_LINE_WIDTH = 0.18;

fn roomSurfacePosition(faceIndex: u32, surfaceCoord: vec2f) -> vec3f {
  switch faceIndex {
    case 0u: { return vec3f(surfaceCoord.x, ROOM_FLOOR_Y, surfaceCoord.y); }
    case 1u: { return vec3f(surfaceCoord.x, surfaceCoord.y, -ROOM_HALF_WIDTH); }
    case 2u: { return vec3f(surfaceCoord.x, surfaceCoord.y, ROOM_HALF_WIDTH); }
    case 3u: { return vec3f(-ROOM_HALF_WIDTH, surfaceCoord.y, surfaceCoord.x); }
    default: { return vec3f(ROOM_HALF_WIDTH, surfaceCoord.y, surfaceCoord.x); }
  }
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let positions = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  let faceIndex = min(vid / 6u, ROOM_SURFACE_COUNT - 1u);
  let p = positions[vid % 6u];
  let surfaceCoord = vec2f(p.x * ROOM_HALF_WIDTH, select(p.y * ROOM_HALF_WIDTH, p.y * ROOM_HALF_HEIGHT, faceIndex != 0u));
  let worldPos = roomSurfacePosition(faceIndex, surfaceCoord);

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  out.worldPos = worldPos;
  out.surfaceCoord = surfaceCoord;
  return out;
}

@fragment
fn fs_main(@location(0) worldPos: vec3f, @location(1) surfaceCoord: vec2f) -> @location(0) vec4f {
  let gx = abs(fract(surfaceCoord.x / GRID_SPACING + 0.5) - 0.5) * GRID_SPACING;
  let gy = abs(fract(surfaceCoord.y / GRID_SPACING + 0.5) - 0.5) * GRID_SPACING;

  let dx = fwidth(surfaceCoord.x);
  let dy = fwidth(surfaceCoord.y);
  let lx = 1.0 - smoothstep(0.0, GRID_LINE_WIDTH + dx, gx);
  let ly = 1.0 - smoothstep(0.0, GRID_LINE_WIDTH + dy, gy);
  let line = max(lx, ly);

  let dist = length(worldPos);
  let centerFade = smoothstep(34.0, 66.0, dist);
  let eyeFade = smoothstep(52.0, 92.0, distance(worldPos, camera.eye));
  let environmentFade = centerFade * eyeFade;

  // Travelling light pulses — slow waves rippling outward from origin
  let wave1 = sin(dist * 0.8 - time * 0.7) * 0.5 + 0.5;
  let wave2 = sin(dist * 0.5 - time * 0.4 + 2.0) * 0.5 + 0.5;
  let pulse1 = pow(wave1, 12.0);
  let pulse2 = pow(wave2, 16.0);
  let pulse = max(pulse1, pulse2);

  let baseAlpha = line * environmentFade * 0.04;
  let pulseFade = environmentFade * (1.0 - smoothstep(72.0, 128.0, dist));
  let pulseAlpha = line * pulseFade * pulse * 0.12;
  let totalAlpha = baseAlpha + pulseAlpha;

  if (totalAlpha < 0.001) { discard; }

  let baseColor = vec3f(0.35, 0.35, 0.45);
  let pulseColor = camera.accent;
  let color = mix(baseColor, pulseColor, pulse);

  return vec4f(color * 1.6, totalAlpha);
}
`,r=`// In-world UI panel for WebXR. One quad in world space. Buttons/slider drawn
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
  // [LAW:dataflow-not-control-flow] Always sample, mask with bounds check — avoids non-uniform control flow.
  let inBounds = select(0.0, 1.0, lu >= 0.0 && lu <= 1.0 && lv >= 0.0 && lv <= 1.0);
  let u = mix(u0, u1, clamp(lu, 0.0, 1.0));
  return textureSample(labelTex, labelSamp, vec2f(u, clamp(lv, 0.0, 1.0))) * inBounds;
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
  // [LAW:dataflow-not-control-flow] No discard here — texture samples must run in uniform control flow.
  // Discard moves to the very end after all texture samples are done.

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
  let prevLabelCol = sampleLabel(prevLabelPx, prevLabelHalf, LABEL_PREV_U0, LABEL_PREV_U1);
  col = mix(col, vec3f(0.97), prevLabelCol.a * prevMask);

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
  let nextLabelCol = sampleLabel(nextLabelPx, nextLabelHalf, LABEL_NEXT_U0, LABEL_NEXT_U1);
  col = mix(col, vec3f(0.97), nextLabelCol.a * nextMask);

  // --- Slider label (above the track) ---
  let sliderLabelC = vec2f(0.0, -0.04);
  let sliderLabelHalf = vec2f(0.24, 0.06);
  let sliderLabelPx = p - sliderLabelC;
  let sliderLabelCol = sampleLabel(sliderLabelPx, sliderLabelHalf, LABEL_SLIDER_U0, LABEL_SLIDER_U1);
  col = mix(col, camera.accent, sliderLabelCol.a * 0.95);
  alpha = max(alpha, sliderLabelCol.a);

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
  let fpsLabelCol = sampleLabel(fpsPx, fpsHalf, LABEL_FPS_U0, LABEL_FPS_U1);
  col = mix(col, vec3f(0.6, 0.65, 0.7), fpsLabelCol.a * 0.8);

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
  // [LAW:dataflow-not-control-flow] Discard after all texture samples to maintain uniform control flow.
  if (bgMask < 0.01) { discard; }
  return vec4f(col, alpha);
}
`,i=`// [LAW:dataflow-not-control-flow] Trail decay always runs in the same shape — only the persistence value varies.
// Reads the previous HDR scene texture and writes faded copy into the current scene texture.

struct FadeParams {
  persistence: f32,
  _pad: vec3f,
}

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> params: FadeParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let prev = textureSample(srcTex, srcSampler, uv);
  return vec4f(prev.rgb * params.persistence, prev.a * params.persistence);
}
`,a=`// [LAW:one-source-of-truth] CoD-Advanced-Warfare 13-tap downsample. The first level applies a soft bright-pass.
// Sampling at half-pixel offsets relative to the SOURCE texel size to get a smooth low-pass.

struct DownParams {
  srcTexel: vec2f,    // 1.0 / sourceSize
  threshold: f32,     // bloom bright-pass; 0 disables
  isFirstLevel: f32,  // > 0.5 → apply bright-pass
}

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> params: DownParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

fn brightPass(c: vec3f, threshold: f32) -> vec3f {
  let luma = dot(c, vec3f(0.2126, 0.7152, 0.0722));
  let soft = max(luma - threshold, 0.0);
  let factor = soft / max(luma, 0.0001);
  return c * factor;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.srcTexel;

  // 13 tap pattern (CoD AW)
  let a = textureSample(srcTex, srcSampler, uv + t * vec2f(-2.0, -2.0)).rgb;
  let b = textureSample(srcTex, srcSampler, uv + t * vec2f( 0.0, -2.0)).rgb;
  let c = textureSample(srcTex, srcSampler, uv + t * vec2f( 2.0, -2.0)).rgb;
  let d = textureSample(srcTex, srcSampler, uv + t * vec2f(-2.0,  0.0)).rgb;
  let e = textureSample(srcTex, srcSampler, uv + t * vec2f( 0.0,  0.0)).rgb;
  let f = textureSample(srcTex, srcSampler, uv + t * vec2f( 2.0,  0.0)).rgb;
  let g = textureSample(srcTex, srcSampler, uv + t * vec2f(-2.0,  2.0)).rgb;
  let h = textureSample(srcTex, srcSampler, uv + t * vec2f( 0.0,  2.0)).rgb;
  let i = textureSample(srcTex, srcSampler, uv + t * vec2f( 2.0,  2.0)).rgb;
  let j = textureSample(srcTex, srcSampler, uv + t * vec2f(-1.0, -1.0)).rgb;
  let k = textureSample(srcTex, srcSampler, uv + t * vec2f( 1.0, -1.0)).rgb;
  let l = textureSample(srcTex, srcSampler, uv + t * vec2f(-1.0,  1.0)).rgb;
  let m = textureSample(srcTex, srcSampler, uv + t * vec2f( 1.0,  1.0)).rgb;

  // Weighted sum of 5 sub-blocks
  var sum = e * 0.125;
  sum += (a + c + g + i) * 0.03125;
  sum += (b + d + f + h) * 0.0625;
  sum += (j + k + l + m) * 0.125;

  // [LAW:dataflow-not-control-flow] Bright-pass strength is data; isFirstLevel scales mix instead of branching.
  let lit = brightPass(sum, params.threshold);
  let firstLevelMix = clamp(params.isFirstLevel, 0.0, 1.0);
  let outColor = mix(sum, lit, firstLevelMix);

  return vec4f(outColor, 1.0);
}
`,o=`// 9-tap tent filter upsample. Reads from a smaller mip; output is additively blended into a larger one.

struct UpParams {
  srcTexel: vec2f,
  radius: f32,
  _pad: f32,
}

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> params: UpParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.srcTexel * params.radius;

  let a = textureSample(srcTex, srcSampler, uv + vec2f(-t.x, -t.y)).rgb;
  let b = textureSample(srcTex, srcSampler, uv + vec2f( 0.0, -t.y)).rgb;
  let c = textureSample(srcTex, srcSampler, uv + vec2f( t.x, -t.y)).rgb;
  let d = textureSample(srcTex, srcSampler, uv + vec2f(-t.x,  0.0)).rgb;
  let e = textureSample(srcTex, srcSampler, uv + vec2f( 0.0,  0.0)).rgb;
  let f = textureSample(srcTex, srcSampler, uv + vec2f( t.x,  0.0)).rgb;
  let g = textureSample(srcTex, srcSampler, uv + vec2f(-t.x,  t.y)).rgb;
  let h = textureSample(srcTex, srcSampler, uv + vec2f( 0.0,  t.y)).rgb;
  let i = textureSample(srcTex, srcSampler, uv + vec2f( t.x,  t.y)).rgb;

  // Tent filter weights: corners 1, edges 2, center 4 → /16
  let sum = (e * 4.0 + (b + d + f + h) * 2.0 + (a + c + g + i)) * (1.0 / 16.0);
  return vec4f(sum, 1.0);
}
`,s=`// Final HDR composite: combine scene + bloom, ACES tone-map, color grade, vignette, chromatic aberration,
// and interaction shockwave distortion.

struct CompositeParams {
  bloomIntensity: f32,
  exposure: f32,
  vignette: f32,
  chromaticAberration: f32,
  grading: f32,
  // Interaction shockwave — screen-space position of the interaction point + activation + time.
  interactScreenX: f32,
  interactScreenY: f32,
  interactActive: f32,
  primary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
  interactTime: f32,
  _pad5: f32,
  _pad6: f32,
  _pad7: f32,
}

@group(0) @binding(0) var sceneTex: texture_2d<f32>;
@group(0) @binding(1) var bloomTex: texture_2d<f32>;
@group(0) @binding(2) var linSampler: sampler;
@group(0) @binding(3) var<uniform> params: CompositeParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

// ACES filmic tone mapper (Narkowicz approximation).
fn aces(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

fn luminance(c: vec3f) -> f32 {
  return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // [LAW:dataflow-not-control-flow] Gravitational lensing: smoothly warp UVs toward the interaction point.
  // Strength falls off with distance squared — near the cursor the scene bends inward, far away it's untouched.
  let interactScreenPos = vec2f(params.interactScreenX, params.interactScreenY);
  let toI = interactScreenPos - uv;
  let iDist2 = dot(toI, toI) + 0.001;
  let lensStrength = params.interactActive * 0.0004 / (iDist2 + 0.03);
  let sampleUV = uv + toI * lensStrength;

  // Chromatic aberration: applied to dim background (grid/walls) but not bright simulation content.
  // Sample the scene at center UV first to measure brightness, then blend between CA'd and clean
  // based on luminance — bright particles stay sharp, dark surroundings get the prismatic split.
  let center = vec2f(0.5, 0.5);
  let dir = sampleUV - center;
  let dist2 = dot(dir, dir);
  let caStrength = params.chromaticAberration * 0.012;
  let caR = sampleUV + dir * dist2 * caStrength * 2.0;
  let caB = sampleUV - dir * dist2 * caStrength * 2.0;

  let sceneClean = textureSample(sceneTex, linSampler, sampleUV).rgb;
  let sceneCa = vec3f(
    textureSample(sceneTex, linSampler, caR).r,
    sceneClean.g,
    textureSample(sceneTex, linSampler, caB).b
  );

  // Bright pixels (simulation) → use clean sample. Dim pixels (grid/room) → use CA'd sample.
  let sceneLum = dot(sceneClean, vec3f(0.2126, 0.7152, 0.0722));
  let caFade = 1.0 - smoothstep(0.03, 0.25, sceneLum);
  var hdr = mix(sceneClean, sceneCa, caFade);

  // Bloom add (always clean — CA on bloom looks messy).
  let bloom = textureSample(bloomTex, linSampler, sampleUV).rgb;
  hdr = hdr + bloom * params.bloomIntensity;

  // Exposure
  hdr = hdr * params.exposure;

  // Theme color grading: lift midtones toward primary, push highlights toward accent. Pre-tonemap.
  let l = luminance(hdr);
  let midMask = smoothstep(0.05, 0.7, l) * (1.0 - smoothstep(0.7, 1.6, l));
  let highMask = smoothstep(0.6, 1.8, l);
  hdr = mix(hdr, hdr * params.primary * 1.6, midMask * params.grading * 0.4);
  hdr = mix(hdr, hdr * params.accent * 1.4, highMask * params.grading * 0.5);

  // Tone map (ACES) compresses HDR to LDR with luminous highlights instead of hard clipping.
  var ldr = aces(hdr);

  // Vignette: darken corners.
  let vDist = length(dir) * 1.4142;
  let vig = 1.0 - params.vignette * smoothstep(0.4, 1.05, vDist);
  ldr = ldr * vig;

  return vec4f(ldr, 1.0);
}
`,c={boids:{count:1e3,separationRadius:25,alignmentRadius:50,cohesionRadius:50,maxSpeed:2,maxForce:.05,visualRange:100},physics:{count:8e4,G:1,softening:1.5,damping:1,coreOrbit:.28,distribution:`disk`,interactionStrength:1,tidalStrength:.008,diskVertDamp:3,diskRadDamp:.8,diskTangGain:.8,diskTangSpeed:.6,diskVertSpring:1.5,diskAlignGain:.4},physics_classic:{count:500,G:1,softening:.5,damping:.999,distribution:`random`},fluid:{resolution:256,viscosity:.1,diffusionRate:.001,forceStrength:100,volumeScale:1.5,dyeMode:`rainbow`,jacobiIterations:40},parametric:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},reaction:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`}},l={boids:{Default:{...c.boids},"Tight Flock":{count:3e3,separationRadius:10,alignmentRadius:30,cohesionRadius:80,maxSpeed:3,maxForce:.08,visualRange:60},Dispersed:{count:2e3,separationRadius:60,alignmentRadius:100,cohesionRadius:20,maxSpeed:1.5,maxForce:.03,visualRange:200},Massive:{count:2e4,separationRadius:15,alignmentRadius:40,cohesionRadius:40,maxSpeed:2.5,maxForce:.04,visualRange:80},"Slow Dance":{count:500,separationRadius:40,alignmentRadius:80,cohesionRadius:100,maxSpeed:.5,maxForce:.01,visualRange:150}},physics:{Default:{...c.physics},"Spiral Galaxy":{count:1e5,G:1.5,softening:.15,damping:1,coreOrbit:0,distribution:`spiral`,interactionStrength:1,tidalStrength:.005,diskVertDamp:1,diskRadDamp:0,diskTangGain:0,diskTangSpeed:.5,diskVertSpring:.3,diskAlignGain:0},"Cosmic Web":{count:8e4,G:.8,softening:2,damping:1,coreOrbit:0,distribution:`web`,interactionStrength:1,tidalStrength:.025,diskVertDamp:0,diskRadDamp:0,diskTangGain:0,diskTangSpeed:.5,diskVertSpring:0,diskAlignGain:0},"Star Cluster":{count:6e4,G:.3,softening:1.2,damping:1,coreOrbit:.15,distribution:`cluster`,interactionStrength:1,tidalStrength:.001,diskVertDamp:0,diskRadDamp:0,diskTangGain:0,diskTangSpeed:.5,diskVertSpring:0,diskAlignGain:0},Maelstrom:{count:12e4,G:.25,softening:2.5,damping:1,coreOrbit:.4,distribution:`maelstrom`,interactionStrength:1.5,tidalStrength:.005,diskVertDamp:7,diskRadDamp:1.5,diskTangGain:2,diskTangSpeed:3.5,diskVertSpring:3,diskAlignGain:.8},"Dust Cloud":{count:15e4,G:.08,softening:3.5,damping:1,coreOrbit:0,distribution:`dust`,interactionStrength:.5,tidalStrength:.003,diskVertDamp:0,diskRadDamp:0,diskTangGain:0,diskTangSpeed:.5,diskVertSpring:0,diskAlignGain:0},Binary:{count:8e4,G:.6,softening:1,damping:1,coreOrbit:.2,distribution:`binary`,interactionStrength:1,tidalStrength:.04,diskVertDamp:2,diskRadDamp:.3,diskTangGain:.5,diskTangSpeed:1.2,diskVertSpring:.8,diskAlignGain:.15}},physics_classic:{Default:{...c.physics_classic},Galaxy:{count:3e3,G:.5,softening:1,damping:.998,distribution:`disk`},Collapse:{count:2e3,G:10,softening:.1,damping:.995,distribution:`shell`},Gentle:{count:1e3,G:.1,softening:2,damping:.9999,distribution:`random`}},fluid:{Default:{...c.fluid},Thick:{resolution:256,viscosity:.8,diffusionRate:.005,forceStrength:200,volumeScale:1.8,dyeMode:`rainbow`,jacobiIterations:40},Turbulent:{resolution:512,viscosity:.01,diffusionRate:1e-4,forceStrength:300,volumeScale:1.3,dyeMode:`rainbow`,jacobiIterations:60},"Ink Drop":{resolution:256,viscosity:.3,diffusionRate:0,forceStrength:50,volumeScale:2.1,dyeMode:`single`,jacobiIterations:40}},parametric:{Default:{shape:`torus`,scale:1,p1Min:.7,p1Max:1.3,p1Rate:.3,p2Min:.2,p2Max:.55,p2Rate:.5,p3Min:.15,p3Max:.45,p3Rate:.7,p4Min:.5,p4Max:2,p4Rate:.4,twistMin:0,twistMax:.4,twistRate:.15},"Rippling Ring":{shape:`torus`,scale:1,p1Min:.5,p1Max:1.5,p1Rate:.5,p2Min:.15,p2Max:.7,p2Rate:.7,p3Min:.3,p3Max:.8,p3Rate:1,p4Min:1,p4Max:3,p4Rate:.6,twistMin:0,twistMax:1,twistRate:.2},"Wild Möbius":{shape:`mobius`,scale:1.5,p1Min:.8,p1Max:2,p1Rate:.3,p2Min:1,p2Max:3,p2Rate:.15,p3Min:.2,p3Max:.6,p3Rate:.8,p4Min:.5,p4Max:2.5,p4Rate:.5,twistMin:1,twistMax:4,twistRate:.1},"Trefoil Pulse":{shape:`trefoil`,scale:1.2,p1Min:.08,p1Max:.35,p1Rate:.9,p2Min:.25,p2Max:.55,p2Rate:.4,p3Min:.3,p3Max:.9,p3Rate:1.2,p4Min:1,p4Max:4,p4Rate:.7,twistMin:0,twistMax:.5,twistRate:.2},"Klein Chaos":{shape:`klein`,scale:1.2,p1Min:.5,p1Max:1.5,p1Rate:.4,p2Min:0,p2Max:0,p2Rate:0,p3Min:.2,p3Max:.6,p3Rate:.9,p4Min:.8,p4Max:3.5,p4Rate:.5,twistMin:0,twistMax:.8,twistRate:.15}},reaction:{Spots:{resolution:128,feed:.055,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Spots`},Mazes:{resolution:128,feed:.029,kill:.057,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mazes`},Worms:{resolution:128,feed:.058,kill:.065,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Worms`},Mitosis:{resolution:128,feed:.0367,kill:.0649,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Mitosis`},Coral:{resolution:128,feed:.062,kill:.062,Du:.2097,Dv:.105,stepsPerFrame:4,isoThreshold:.25,preset:`Coral`}}},u={boids:[{section:`Flock`,params:[{key:`count`,label:`Count`,min:100,max:3e4,step:100,requiresReset:!0},{key:`visualRange`,label:`Visual Range`,min:10,max:500,step:5}]},{section:`Forces`,params:[{key:`separationRadius`,label:`Separation`,min:1,max:100,step:1},{key:`alignmentRadius`,label:`Alignment`,min:1,max:200,step:1},{key:`cohesionRadius`,label:`Cohesion`,min:1,max:200,step:1},{key:`maxSpeed`,label:`Max Speed`,min:.1,max:10,step:.1},{key:`maxForce`,label:`Max Force`,min:.001,max:.5,step:.001}]}],physics:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:15e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.05,max:5,step:.01},{key:`softening`,label:`Softening`,min:.2,max:4,step:.05},{key:`damping`,label:`Damping`,min:.98,max:1,step:5e-4},{key:`coreOrbit`,label:`Core Friction`,min:0,max:.8,step:.01},{key:`interactionStrength`,label:`Interaction Pull`,min:.1,max:3,step:.05},{key:`tidalStrength`,label:`Tidal Field`,min:0,max:.05,step:5e-4}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`]}]},{section:`Disk Recovery`,params:[{key:`diskVertDamp`,label:`Vertical Damp`,min:0,max:8,step:.05},{key:`diskRadDamp`,label:`Radial Damp`,min:0,max:3,step:.01},{key:`diskTangGain`,label:`Tangential Nudge`,min:0,max:3,step:.01},{key:`diskTangSpeed`,label:`Orbit Speed`,min:.1,max:4,step:.01},{key:`diskVertSpring`,label:`Plane Spring`,min:0,max:5,step:.05},{key:`diskAlignGain`,label:`Flow Align`,min:0,max:1.5,step:.01}]}],physics_classic:[{section:`Simulation`,params:[{key:`count`,label:`Bodies`,min:10,max:1e4,step:10,requiresReset:!0},{key:`G`,label:`Gravity (G)`,min:.01,max:100,step:.01},{key:`softening`,label:`Softening`,min:.01,max:10,step:.01},{key:`damping`,label:`Damping`,min:.9,max:1,step:.001}]},{section:`Initial State`,params:[{key:`distribution`,label:`Distribution`,type:`dropdown`,options:[`random`,`disk`,`shell`],requiresReset:!0}]}],fluid:[{section:`Grid`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128,256,512],requiresReset:!0}]},{section:`Physics`,params:[{key:`viscosity`,label:`Viscosity`,min:0,max:1,step:.01},{key:`diffusionRate`,label:`Diffusion`,min:0,max:.01,step:1e-4},{key:`forceStrength`,label:`Force`,min:1,max:500,step:1},{key:`jacobiIterations`,label:`Iterations`,min:10,max:80,step:5}]},{section:`Appearance`,params:[{key:`volumeScale`,label:`Volume`,min:.4,max:3,step:.05},{key:`dyeMode`,label:`Dye Mode`,type:`dropdown`,options:[`rainbow`,`single`,`temperature`]}]}],parametric:[{section:`Shape`,params:[{key:`shape`,label:`Equation`,type:`dropdown`,options:[`torus`,`klein`,`mobius`,`sphere`,`trefoil`]}]},{section:`Shape Parameters`,id:`shape-params-section`,params:[],dynamic:!0},{section:`Transform`,params:[{key:`scale`,label:`Scale`,min:.1,max:5,step:.1}]},{section:`Twist`,params:[{key:`twistMin`,label:`Min`,min:0,max:12.56,step:.05},{key:`twistMax`,label:`Max`,min:0,max:12.56,step:.05},{key:`twistRate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Amplitude`,params:[{key:`p3Min`,label:`Min`,min:0,max:2,step:.05},{key:`p3Max`,label:`Max`,min:0,max:2,step:.05},{key:`p3Rate`,label:`Rate`,min:0,max:3,step:.05}]},{section:`Wave Frequency`,params:[{key:`p4Min`,label:`Min`,min:0,max:5,step:.1},{key:`p4Max`,label:`Max`,min:0,max:5,step:.1},{key:`p4Rate`,label:`Rate`,min:0,max:3,step:.05}]}],reaction:[{section:`Volume`,params:[{key:`resolution`,label:`Resolution`,type:`dropdown`,options:[64,128],requiresReset:!0},{key:`stepsPerFrame`,label:`Steps/Frame`,min:1,max:12,step:1}]},{section:`Reaction`,params:[{key:`feed`,label:`Feed`,min:.01,max:.1,step:5e-4},{key:`kill`,label:`Kill`,min:.03,max:.08,step:5e-4},{key:`Du`,label:`Du`,min:.05,max:.35,step:.001},{key:`Dv`,label:`Dv`,min:.02,max:.2,step:.001}]},{section:`Render`,params:[{key:`isoThreshold`,label:`Iso Threshold`,min:.05,max:.6,step:.01}]}]},d={Dracula:{primary:`#BD93F9`,secondary:`#FF79C6`,accent:`#50FA7B`,bg:`#282A36`,fg:`#F8F8F2`},Nord:{primary:`#88C0D0`,secondary:`#81A1C1`,accent:`#A3BE8C`,bg:`#2E3440`,fg:`#D8DEE9`},Monokai:{primary:`#AE81FF`,secondary:`#F82672`,accent:`#A5E22E`,bg:`#272822`,fg:`#D6D6D6`},"Rose Pine":{primary:`#C4A7E7`,secondary:`#EBBCBA`,accent:`#9CCFD8`,bg:`#191724`,fg:`#E0DEF4`},Gruvbox:{primary:`#85A598`,secondary:`#F9BD2F`,accent:`#B7BB26`,bg:`#282828`,fg:`#FBF1C7`},Solarized:{primary:`#268BD2`,secondary:`#2AA198`,accent:`#849900`,bg:`#002B36`,fg:`#839496`},"Tokyo Night":{primary:`#BB9AF7`,secondary:`#7AA2F7`,accent:`#9ECE6A`,bg:`#1A1B26`,fg:`#A9B1D6`},Catppuccin:{primary:`#F5C2E7`,secondary:`#CBA6F7`,accent:`#ABE9B3`,bg:`#181825`,fg:`#CDD6F4`},"Atom One":{primary:`#61AFEF`,secondary:`#C678DD`,accent:`#62F062`,bg:`#282C34`,fg:`#ABB2BF`},Flexoki:{primary:`#205EA6`,secondary:`#24837B`,accent:`#65800B`,bg:`#100F0F`,fg:`#FFFCF0`}},f=`Dracula`,p=12e3,m={r:.02,g:.02,b:.025,a:1};function h(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function g(e){let t=d[e]||d[f];return{primary:h(t.primary),secondary:h(t.secondary),accent:h(t.accent),bg:h(t.bg),fg:h(t.fg),clearColor:{r:h(t.bg)[0],g:h(t.bg)[1],b:h(t.bg)[2],a:1}}}function _(e,t,n){return e.map((e,r)=>e+(t[r]-e)*n)}function v(e,t,n){let r=_(e.bg,t.bg,n);return{primary:_(e.primary,t.primary,n),secondary:_(e.secondary,t.secondary,n),accent:_(e.accent,t.accent,n),bg:r,fg:_(e.fg,t.fg,n),clearColor:{r:r[0],g:r[1],b:r[2],a:1}}}var y={from:g(f),to:g(f),startedAtMs:0},b=g(f);function x(e){let t=Math.max(0,Math.min(1,(e-y.startedAtMs)/p));return v(y.from,y.to,t)}function S(){return b}function C(e){b=x(e)}function w(e){let t=g(e);y.from=t,y.to=t,y.startedAtMs=0,b=t}function T(e,t=performance.now()){let n=g(e),r=x(t);y.from=r,y.to=n,y.startedAtMs=t,b=r}function E(e){return D[e]}var D={mode:`physics`,colorTheme:`Dracula`,xrEnabled:!1,paused:!1,boids:{...c.boids},physics:{...c.physics},physics_classic:{...c.physics_classic},fluid:{...c.fluid},parametric:{...c.parametric},reaction:{...c.reaction},camera:{distance:5,fov:60,rotX:.3,rotY:0,panX:0,panY:0},mouse:{down:!1,x:0,y:0,dx:0,dy:0,worldX:0,worldY:0,worldZ:0},fx:{bloomIntensity:.7,bloomThreshold:4,bloomRadius:1,trailPersistence:0,exposure:1,vignette:.35,chromaticAberration:.25,grading:.5,timeScale:1}},O=96,k=4,A=208,j=256,ee=160,te={torus:0,klein:1,mobius:2,sphere:3,trefoil:4},ne={torus:{p1:{label:`Major Radius`,animMin:.7,animMax:1.3,animRate:.3,min:.2,max:2.5,step:.05},p2:{label:`Minor Radius`,animMin:.2,animMax:.6,animRate:.5,min:.05,max:1.2,step:.05}},klein:{p1:{label:`Bulge`,animMin:.7,animMax:1.5,animRate:.4,min:.2,max:3,step:.05}},mobius:{p1:{label:`Width`,animMin:.5,animMax:1.8,animRate:.35,min:.1,max:3,step:.05},p2:{label:`Half-Twists`,animMin:1,animMax:3,animRate:.15,min:.5,max:5,step:.5}},sphere:{p1:{label:`XY Stretch`,animMin:.6,animMax:1.5,animRate:.4,min:.1,max:3,step:.05},p2:{label:`Z Stretch`,animMin:.5,animMax:1.8,animRate:.6,min:.1,max:3,step:.05}},trefoil:{p1:{label:`Tube Radius`,animMin:.08,animMax:.35,animRate:.6,min:.05,max:1,step:.05},p2:{label:`Knot Scale`,animMin:.25,animMax:.5,animRate:.35,min:.1,max:1,step:.05}}},M={identity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},perspective(e,t,n,r){let i=1/Math.tan(e*.5),a=1/(n-r),o=new Float32Array(16);return o[0]=i/t,o[5]=i,o[10]=r*a,o[11]=-1,o[14]=n*r*a,o},lookAt(e,t,n){let r=N(re(e,t)),i=N(P(n,r)),a=P(r,i);return new Float32Array([i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-ie(i,e),-ie(a,e),-ie(r,e),1])},multiply(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[i*4+r]=e[r]*t[i*4]+e[4+r]*t[i*4+1]+e[8+r]*t[i*4+2]+e[12+r]*t[i*4+3];return n},rotateX(e,t){let n=Math.cos(t),r=Math.sin(t),i=M.identity();return i[5]=n,i[6]=r,i[9]=-r,i[10]=n,M.multiply(e,i)},rotateY(e,t){let n=Math.cos(t),r=Math.sin(t),i=M.identity();return i[0]=n,i[2]=-r,i[8]=r,i[10]=n,M.multiply(e,i)},rotateZ(e,t){let n=Math.cos(t),r=Math.sin(t),i=M.identity();return i[0]=n,i[1]=r,i[4]=-r,i[5]=n,M.multiply(e,i)},translate(e,t,n,r){let i=M.identity();return i[12]=t,i[13]=n,i[14]=r,M.multiply(e,i)}};function N(e){let t=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);return t>0?[e[0]/t,e[1]/t,e[2]/t]:[0,0,0]}function P(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function re(e,t){return[e[0]-t[0],e[1]-t[1],e[2]-t[2]]}function ie(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function ae(){let e=D.camera,t=[e.distance*Math.cos(e.rotX)*Math.sin(e.rotY),e.distance*Math.sin(e.rotX),e.distance*Math.cos(e.rotX)*Math.cos(e.rotY)];return{eye:t,view:M.lookAt(t,[e.panX,e.panY,0],[0,1,0]),proj:null}}var F=null,I={scene:[],sceneIdx:0,depth:null,bloomMips:[],width:0,height:0,needsClear:!0,linSampler:null,fadePipeline:null,downsamplePipeline:null,upsamplePipelineAdditive:null,upsamplePipelineReplace:null,compositePipelines:new Map,fadeBGL:null,downsampleBGL:null,upsampleBGL:null,compositeBGL:null,fadeUBO:null,downsampleUBO:[],upsampleUBO:[],compositeUBO:null},L=`rgba16float`,R=3;function oe(){I.linSampler=B.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`}),I.fadeBGL=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),I.downsampleBGL=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),I.upsampleBGL=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),I.compositeBGL=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});let e=B.createShaderModule({code:i}),t=B.createShaderModule({code:a}),n=B.createShaderModule({code:o});I.fadePipeline=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[I.fadeBGL]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:L}]},primitive:{topology:`triangle-list`}}),I.downsamplePipeline=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[I.downsampleBGL]}),vertex:{module:t,entryPoint:`vs_main`},fragment:{module:t,entryPoint:`fs_main`,targets:[{format:L}]},primitive:{topology:`triangle-list`}}),I.upsamplePipelineAdditive=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[I.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:L,blend:{color:{srcFactor:`one`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`}}),I.upsamplePipelineReplace=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[I.upsampleBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:L}]},primitive:{topology:`triangle-list`}}),I.fadeUBO=B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),I.downsampleUBO=[],I.upsampleUBO=[];for(let e=0;e<R;e++)I.downsampleUBO.push(B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),I.upsampleUBO.push(B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));I.compositeUBO=B.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}function se(e){let t=I.compositePipelines.get(e);if(t)return t;let n=B.createShaderModule({code:s});return t=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[I.compositeBGL]}),vertex:{module:n,entryPoint:`vs_main`},fragment:{module:n,entryPoint:`fs_main`,targets:[{format:e}]},primitive:{topology:`triangle-list`}}),I.compositePipelines.set(e,t),t}function z(e,t){if(I.width===e&&I.height===t&&I.scene.length===2)return;for(let e of I.scene)e.destroy();for(let e of I.bloomMips)e.destroy();I.depth?.destroy(),I.scene=[],I.bloomMips=[],I.width=e,I.height=t;for(let n=0;n<2;n++)I.scene.push(B.createTexture({size:[e,t],format:L,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));I.depth=B.createTexture({size:[e,t],format:`depth24plus`,usage:GPUTextureUsage.RENDER_ATTACHMENT});let n=Math.max(1,Math.floor(e/2)),r=Math.max(1,Math.floor(t/2));for(let e=0;e<R;e++)I.bloomMips.push(B.createTexture({size:[n,r],format:L,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})),n=Math.max(1,Math.floor(n/2)),r=Math.max(1,Math.floor(r/2));I.needsClear=!0}function ce(){return I.scene[I.sceneIdx].createView()}function le(e,t,n){let r=D.fx.trailPersistence>.001&&!I.needsClear;return{view:ce(),clearValue:m,loadOp:r?`load`:`clear`,storeOp:`store`}}function ue(e,t){return{view:I.depth.createView(),depthClearValue:1,depthLoadOp:`clear`,depthStoreOp:`store`}}function de(e){return e}function fe(e){let t=S(),n=new Float32Array(52);if(F)n.set(F.viewMatrix,0),n.set(F.projMatrix,16),n.set(F.eye,32);else{let t=ae(),r=D.camera.fov*Math.PI/180,i=M.perspective(r,e,.01,ee);n.set(t.view,0),n.set(i,16),n.set(t.eye,32)}n.set(t.primary,36),n.set(t.secondary,40),n.set(t.accent,44);let r=D.mouse;return n[48]=r.worldX,n[49]=r.worldY,n[50]=r.worldZ,n[51]=r.down?1:0,n}var B,V,pe,me,H,U=1;async function he(){let e=document.getElementById(`fallback`),t=t=>{e.querySelector(`p`).textContent=t,e.classList.add(`visible`)};if(!navigator.gpu)return t(`navigator.gpu not found. This browser may not support WebGPU, or it may need to be enabled in settings.`),!1;let n;try{n=await navigator.gpu.requestAdapter({powerPreference:`high-performance`,xrCompatible:!0})}catch(e){return t(`requestAdapter() failed: ${e.message}`),!1}if(!n)return t(`requestAdapter() returned null. WebGPU may be available but no suitable GPU adapter was found.`),!1;try{B=await n.requestDevice()}catch(e){return t(`requestDevice() failed: ${e.message}`),!1}return B.lost.then(e=>{console.error(`WebGPU device lost:`,e.message),e.reason!==`destroyed`&&he().then(e=>{e&&(G(),Ge(),Pn(),requestAnimationFrame(Vn))})}),B.onuncapturederror=e=>{console.error(`[WebGPU]`,e.error.message);let t=document.getElementById(`gpu-error-overlay`);t||(t=document.createElement(`div`),t.id=`gpu-error-overlay`,t.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(t));let n=new Date().toLocaleTimeString();t.textContent=`[${n}] ${e.error.message}\n\n`+t.textContent},V=document.getElementById(`gpu-canvas`),pe=V.getContext(`webgpu`),me=navigator.gpu.getPreferredCanvasFormat(),H=`rgba16float`,U=1,pe.configure({device:B,format:me,alphaMode:`opaque`}),oe(),!0}function ge(e,t){I.needsClear=!0}var _e,ve,ye,W,be=0;function G(){ye?.destroy(),W?.destroy(),ye=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),W=B.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let e=B.createShaderModule({code:n}),t=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]});_e=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:H,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:U}}),ve=[0,1].map(e=>B.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:ye,offset:e*j,size:A}},{binding:1,resource:{buffer:W}}]}))}function xe(e,t,n=0){be+=.016,B.queue.writeBuffer(ye,n*j,fe(t)),B.queue.writeBuffer(W,0,new Float32Array([be])),e.setPipeline(_e),e.setBindGroup(0,ve[n]),e.draw(30)}var K=[0,-.4,-3.5],Se=[1.2,.55],Ce=.16,we=.18,Te=.11,Ee=-.3,De=.3,Oe=-.2,ke=.05,Ae=.42,q=-.4,je=.1,Me=.035,Ne=1024,Pe=128,Fe=`-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif`,Ie,Le,Re,ze,Be,Ve,He,Ue,We=null;function Ge(){Re?.destroy(),ze?.destroy(),He?.destroy(),Re=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),ze=B.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),Be||(Be=document.createElement(`canvas`),Be.width=Ne,Be.height=Pe,Ve=Be.getContext(`2d`)),He=B.createTexture({size:[Ne,Pe],format:`rgba8unorm`,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),Ue=B.createSampler({magFilter:`linear`,minFilter:`linear`}),We=null;let e=B.createShaderModule({code:r}),t=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}}]});Ie=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:e,entryPoint:`vs_main`},fragment:{module:e,entryPoint:`fs_main`,targets:[{format:H,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:U}}),Le=[0,1].map(e=>B.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:Re,offset:e*j,size:A}},{binding:1,resource:{buffer:ze}},{binding:2,resource:He.createView()},{binding:3,resource:Ue}]}))}function Ke(e,t,n,r,i,a){let o=i*.82,s=a*.75,c=Math.floor(s);for(e.font=`bold ${c}px ${Fe}`;c>12&&e.measureText(t).width>o;)c-=2,e.font=`bold ${c}px ${Fe}`;e.fillText(t,n+i/2,r+a/2)}var qe=-1;function Je(e){if(We===e&&Mn===qe)return;We=e,qe=Mn;let t=Ve,n=Ne,r=Pe;t.clearRect(0,0,n,r),t.fillStyle=`white`,t.textAlign=`center`,t.textBaseline=`middle`;let i=n/4,a=Math.floor(n*.82),o=a-i*2,s=a,c=n-a;Ke(t,`PREV`,0,0,i,r),Ke(t,`NEXT`,i,0,i,r),Ke(t,mn[e].label.toUpperCase(),i*2,0,o,r),Ke(t,`${Mn} FPS`,s,0,c,r),B.queue.copyExternalImageToTexture({source:Be},{texture:He},[n,r])}function Ye(){switch($.hover){case`prev`:return 1;case`next`:return 2;case`slider`:return 3;case`grab`:return 4;default:return 0}}function Xe(e,t,n=0){if(Je(D.mode),B.queue.writeBuffer(Re,n*j,fe(t)),n===0){let e=new Float32Array(12);e[0]=K[0],e[1]=K[1],e[2]=K[2],e[3]=0,e[4]=Se[0],e[5]=Se[1],e[6]=gn(),e[7]=Ye(),e[8]=$.lastHitPx,e[9]=$.lastHitPy,e[10]=$.lastHitActive?1:0,e[11]=0,B.queue.writeBuffer(ze,0,e)}e.setPipeline(Ie),e.setBindGroup(0,Le[n]),e.draw(6)}var J={};function Ze(){let e=D.boids.count,t=e*32,n=new Float32Array(e*8);for(let t=0;t<e;t++){let e=t*8;n[e]=(Math.random()-.5)*2*2,n[e+1]=(Math.random()-.5)*2*2,n[e+2]=(Math.random()-.5)*2*2,n[e+4]=(Math.random()-.5)*.5,n[e+5]=(Math.random()-.5)*.5,n[e+6]=(Math.random()-.5)*.5}let r=B.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(r.getMappedRange()).set(n),r.unmap();let i=B.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),a=B.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=B.createShaderModule({code:qt||`struct Particle {
  pos: vec3f,
  vel: vec3f,
}

struct SimParams {
  dt: f32,
  separationRadius: f32,
  alignmentRadius: f32,
  cohesionRadius: f32,
  maxSpeed: f32,
  maxForce: f32,
  visualRange: f32,
  count: u32,
  boundSize: f32,
  attractorX: f32,
  attractorY: f32,
  attractorZ: f32,
  attractorActive: f32,
}

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> params: SimParams;

fn limit(v: vec3f, maxLen: f32) -> vec3f {
  let len2 = dot(v, v);
  if (len2 > maxLen * maxLen) {
    return normalize(v) * maxLen;
  }
  return v;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = particlesIn[idx];
  var separation = vec3f(0.0);
  var alignment = vec3f(0.0);
  var cohesion = vec3f(0.0);
  var sepCount = 0u;
  var aliCount = 0u;
  var cohCount = 0u;

  for (var i = 0u; i < params.count; i++) {
    if (i == idx) { continue; }
    let other = particlesIn[i];
    let diff = me.pos - other.pos;
    let dist = length(diff);

    if (dist < params.separationRadius && dist > 0.0) {
      separation += diff / dist;
      sepCount++;
    }
    if (dist < params.alignmentRadius) {
      alignment += other.vel;
      aliCount++;
    }
    if (dist < params.cohesionRadius) {
      cohesion += other.pos;
      cohCount++;
    }
  }

  var force = vec3f(0.0);

  if (sepCount > 0u) {
    separation = separation / f32(sepCount);
    if (length(separation) > 0.0) {
      separation = normalize(separation) * params.maxSpeed - me.vel;
      force += limit(separation, params.maxForce) * 1.5;
    }
  }
  if (aliCount > 0u) {
    alignment = alignment / f32(aliCount);
    if (length(alignment) > 0.0) {
      alignment = normalize(alignment) * params.maxSpeed - me.vel;
      force += limit(alignment, params.maxForce);
    }
  }
  if (cohCount > 0u) {
    cohesion = cohesion / f32(cohCount) - me.pos;
    if (length(cohesion) > 0.0) {
      cohesion = normalize(cohesion) * params.maxSpeed - me.vel;
      force += limit(cohesion, params.maxForce);
    }
  }

  // [LAW:dataflow-not-control-flow] Vortex well attractor — always computed, attractorActive scales to zero when inactive.
  // Three forces create orbital behavior: radial pull, core repulsion, tangential swirl.
  let attractorPos = vec3f(params.attractorX, params.attractorY, params.attractorZ);
  let toAttractor = attractorPos - me.pos;
  let aDist = length(toAttractor) + 0.0001; // epsilon avoids division by zero
  let aDir = toAttractor / aDist;

  // Tuning constants — relative to maxForce so behavior scales across presets
  let mf = params.maxForce;
  const ATTRACT_SCALE = 3.0;       // gravity well depth (multiples of maxForce at softening distance)
  const ATTRACT_SOFTENING = 0.3;   // prevents singularity in gravity calc
  const CORE_RADIUS = 0.25;        // repulsion shell radius
  const CORE_PRESSURE_SCALE = 8.0; // core push strength (multiples of maxForce)
  const SWIRL_SCALE = 2.4;         // tangential orbit strength (multiples of maxForce)
  const SWIRL_PEAK_RADIUS = 0.4;   // where swirl is strongest
  const SWIRL_FALLOFF = 0.8;       // gaussian width of swirl envelope
  const INFLUENCE_RADIUS = 2.5;    // beyond this, attractor fades to zero

  // 1. Radial pull: inverse-distance with softening
  let radialPull = mf * ATTRACT_SCALE / (aDist + ATTRACT_SOFTENING);

  // 2. Core repulsion: linear ramp inside core radius prevents singularity
  let coreRepulsion = max(0.0, CORE_RADIUS - aDist) / CORE_RADIUS * mf * CORE_PRESSURE_SCALE;

  // 3. Net radial force = pull inward minus push outward
  let radialForce = aDir * (radialPull - coreRepulsion);

  // 4. Tangential swirl: cross with world-up for orbit direction
  let worldUp = vec3f(0.0, 1.0, 0.0);
  let worldX = vec3f(1.0, 0.0, 0.0);
  let swirlAxis = select(worldUp, worldX, abs(dot(aDir, worldUp)) > 0.95);
  let tangent = normalize(cross(aDir, swirlAxis));
  // Gaussian peak near orbit shell, fading with distance
  let swirlEnvelope = exp(-((aDist - SWIRL_PEAK_RADIUS) * (aDist - SWIRL_PEAK_RADIUS)) / (SWIRL_FALLOFF * SWIRL_FALLOFF));
  let swirlForce = tangent * mf * SWIRL_SCALE * swirlEnvelope;

  // 5. Influence envelope: smooth fadeout so distant boids keep flocking naturally
  let influenceFade = 1.0 - smoothstep(INFLUENCE_RADIUS * 0.5, INFLUENCE_RADIUS, aDist);

  // 6. Combine — attractorActive is 0.0 (inactive) or 1.0 (active)
  force += (radialForce + swirlForce) * influenceFade * params.attractorActive;

  // Boundary force - soft repulsion from edges
  let bs = params.boundSize;
  let margin = bs * 0.1;
  var boundary = vec3f(0.0);
  if (me.pos.x < -bs + margin) { boundary.x = params.maxForce; }
  if (me.pos.x >  bs - margin) { boundary.x = -params.maxForce; }
  if (me.pos.y < -bs + margin) { boundary.y = params.maxForce; }
  if (me.pos.y >  bs - margin) { boundary.y = -params.maxForce; }
  if (me.pos.z < -bs + margin) { boundary.z = params.maxForce; }
  if (me.pos.z >  bs - margin) { boundary.z = -params.maxForce; }
  force += boundary * 2.0;

  var vel = me.vel + force;
  vel = limit(vel, params.maxSpeed);
  let pos = me.pos + vel * params.dt;

  particlesOut[idx] = Particle(pos, vel);
}
`}),c=B.createShaderModule({code:Jt||`struct Camera {
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

struct Particle {
  pos: vec3f,
  vel: vec3f,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let p = particles[iid];
  let speed = length(p.vel);
  let dir = select(vec3f(0.0, 1.0, 0.0), normalize(p.vel), speed > 0.001);

  // Build a basis from velocity direction
  let up = select(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), abs(dir.z) < 0.99);
  let right = normalize(cross(dir, up));
  let realUp = cross(right, dir);

  // [LAW:dataflow-not-control-flow] Constant-pixel-size triangle: scale local offsets by view-space depth so the
  // perspective divide produces a fixed NDC offset. Boids stay tight darts regardless of camera distance.
  let viewPos = camera.view * vec4f(p.pos, 1.0);
  let depth = max(abs(viewPos.z), 0.05);
  let size = 0.0035 * depth;
  var localPos: vec3f;
  switch (vid) {
    case 0u: { localPos = dir * size * 2.0; }            // tip
    case 1u: { localPos = -dir * size + right * size; }  // left
    case 2u: { localPos = -dir * size - right * size; }  // right
    default: { localPos = vec3f(0.0); }
  }

  let worldPos = p.pos + localPos;
  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);

  // Color by speed: primary (slow) → accent (fast); fast boids shift toward white-hot.
  let t = clamp(speed / 4.0, 0.0, 1.0);
  let base = mix(camera.primary, camera.accent, t);
  out.color = mix(base, vec3f(1.0), t * 0.45);
  return out;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
  // HDR boost: triangles are tiny, so a flat ~5x multiplier reads through bloom as luminous flecks.
  return vec4f(color * 5.0, 1.0);
}
`}),l=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:s,entryPoint:`main`}}),d=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),f=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:c,entryPoint:`vs_main`},fragment:{module:c,entryPoint:`fs_main`,targets:[{format:H}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:U}}),p=[B.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:a}}]}),B.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:r}},{binding:2,resource:{buffer:a}}]})],m=[0,1].map(e=>[r,i].map(t=>B.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:o,offset:e*j,size:A}}]}))),h=0,g={};return{compute(t){let n=D.boids,r=D.mouse,i=new Float32Array(16);i[0]=.016*D.fx.timeScale,i[1]=n.separationRadius/50,i[2]=n.alignmentRadius/50,i[3]=n.cohesionRadius/50,i[4]=n.maxSpeed,i[5]=n.maxForce,i[6]=n.visualRange/50,i[8]=2,i[9]=r.worldX,i[10]=r.worldY,i[11]=r.worldZ,i[12]=r.down?1:0,new Uint32Array(i.buffer)[7]=e,B.queue.writeBuffer(a,0,i);let o=t.beginComputePass();o.setPipeline(u),o.setBindGroup(0,p[h]),o.dispatchWorkgroups(Math.ceil(e/64)),o.end(),h=1-h},render(t,n,r,i=0){let a=r?r[2]/r[3]:V.width/V.height;B.queue.writeBuffer(o,i*j,fe(a));let s=t.beginRenderPass({colorAttachments:[le(g,n,r)],depthStencilAttachment:ue(g,r)}),c=de(r);c&&s.setViewport(c[0],c[1],c[2],c[3],0,1),xe(s,a,i),s.setPipeline(f),s.setBindGroup(0,m[i][h]),s.draw(3,e),s.end()},getCount(){return e},destroy(){r.destroy(),i.destroy(),a.destroy(),o.destroy()}}}function Qe(){let n=D.physics.count,r=n*48,i=.2,a=.18,o=Math.min(n,Math.max(1,Math.round(n*.03))),s=Math.min(n-o,Math.max(1,Math.round(n*.1))),c=Math.min(o+s,8192),l=.8,u=1.8,d=.3,f=.9,p=D.physics.diskTangSpeed??.6,m=p,h=p,g=new Float32Array(n*12),_=D.physics.distribution,v=N([.18,1,-.12]),y=N(P([0,1,0],v)),b=P(v,y);for(let e=0;e<n;e++){let t=e*12,r,x,S,C=0,w=0,T=0,E=0,O=e===0,k=e<o,A=e>=o&&e<c;if(O)r=0,x=0,S=0,C=0,w=0,T=0,E=2;else if(k||A)if(_===`spiral`){let e=3.5,t=Math.exp(-5*Math.random())*e,n=Math.random()*Math.PI*2,i=(Math.random()-.5)*.2;r=y[0]*Math.cos(n)*t+b[0]*Math.sin(n)*t+v[0]*i,x=y[1]*Math.cos(n)*t+b[1]*Math.sin(n)*t+v[1]*i,S=y[2]*Math.cos(n)*t+b[2]*Math.sin(n)*t+v[2]*i;let a=-1/5*Math.exp(-5*t/e)+1/5,o=-1/5*Math.exp(-5)+1/5,s=1e3*((l+u+d+f)/4),p=(D.physics.G??1.5)*.001/Math.sqrt(Math.max(1,c)/1e3),m=Math.sqrt(Math.max(.001,a/o*p*s/Math.max(t,.05)));C=(-Math.sin(n)*y[0]+Math.cos(n)*b[0])*m,w=(-Math.sin(n)*y[1]+Math.cos(n)*b[1])*m,T=(-Math.sin(n)*y[2]+Math.cos(n)*b[2])*m,E=k?l+Math.random()**.4*(u-l):d+Math.random()**.7*(f-d)}else{let t=k?e-1:e-o,n=k?Math.max(1,o-1):s,i=n>1?t/(n-1):.5,a=k?.2:.5,c=k?2.5:4,p=k?.05:.1,g=a+(c-a)*i+(Math.random()-.5)*p,_=k?.12:.2,D=(Math.random()-.5)*_,O=k?Math.PI*.18:Math.PI/Math.max(3,s),A=t/Math.max(1,n)*Math.PI*2+O;r=y[0]*Math.cos(A)*g+b[0]*Math.sin(A)*g+v[0]*D,x=y[1]*Math.cos(A)*g+b[1]*Math.sin(A)*g+v[1]*D,S=y[2]*Math.cos(A)*g+b[2]*Math.sin(A)*g+v[2]*D;let j=(k?m:h)/Math.sqrt(g+.05);C=(-Math.sin(A)*y[0]+Math.cos(A)*b[0])*j,w=(-Math.sin(A)*y[1]+Math.cos(A)*b[1])*j,T=(-Math.sin(A)*y[2]+Math.cos(A)*b[2])*j,E=k?l+Math.random()**.4*(u-l):d+Math.random()**.7*(f-d)}else if(_===`spiral`){let t=3.5;if((e-c)/Math.max(1,n-c)<.04){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.3+Math.random()**.5*4;r=n*Math.sin(t)*Math.cos(e),x=n*Math.sin(t)*Math.sin(e),S=n*Math.cos(t);let i=.12+Math.random()*.1,a=N(P(N([r,x,S]),[.3,1,-.2]));C=a[0]*i,w=a[1]*i,T=a[2]*i,E=.01+Math.random()*.05}else{let e=Math.exp(-5*Math.random())*t,n=Math.random()*Math.PI*2,i=(-1/5*Math.exp(-5*e/t)+1/5)/(-1/5*Math.exp(-5)+1/5)*(1e3*(((l+u)/2+(d+f)/2)/2)),a=(D.physics.G??1.5)*.001/Math.sqrt(Math.max(1,c)/1e3),o=Math.sqrt(Math.max(.001,a*i/Math.max(e,.05))),s=(Math.random()-.5)*(.25+e*.05);r=y[0]*Math.cos(n)*e+b[0]*Math.sin(n)*e+v[0]*s,x=y[1]*Math.cos(n)*e+b[1]*Math.sin(n)*e+v[1]*s,S=y[2]*Math.cos(n)*e+b[2]*Math.sin(n)*e+v[2]*s,C=(-Math.sin(n)*y[0]+Math.cos(n)*b[0])*o,w=(-Math.sin(n)*y[1]+Math.cos(n)*b[1])*o,T=(-Math.sin(n)*y[2]+Math.cos(n)*b[2])*o,E=Math.random()**2*.8}}else if(_===`disk`){let t=Math.random()*Math.PI*2,o=Math.sqrt(Math.random())*4.5;E=Math.random()**3*.8;let s=(e-c)/Math.max(1,n-c);if(s<.03){let e=(Math.random()-.5)*i*.5;r=y[0]*Math.cos(t)*o+b[0]*Math.sin(t)*o+v[0]*e,x=y[1]*Math.cos(t)*o+b[1]*Math.sin(t)*o+v[1]*e,S=y[2]*Math.cos(t)*o+b[2]*Math.sin(t)*o+v[2]*e;let n=.6/Math.sqrt(o+.15);C=(Math.sin(t)*y[0]-Math.cos(t)*b[0])*n,w=(Math.sin(t)*y[1]-Math.cos(t)*b[1])*n,T=(Math.sin(t)*y[2]-Math.cos(t)*b[2])*n,E=.1+Math.random()*.3}else if(s<.12){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=.5+Math.sqrt(Math.random())*3.5;r=n*Math.sin(t)*Math.cos(e),x=n*Math.sin(t)*Math.sin(e),S=n*Math.cos(t);let i=.15+Math.random()*.15,a=N(P(N([r,x,S]),[.3,1,-.2]));C=a[0]*i,w=a[1]*i,T=a[2]*i,E=.02+Math.random()*.1}else{let e=(Math.random()-.5)*i*(.35+o*.4);r=y[0]*Math.cos(t)*o+b[0]*Math.sin(t)*o+v[0]*e,x=y[1]*Math.cos(t)*o+b[1]*Math.sin(t)*o+v[1]*e,S=y[2]*Math.cos(t)*o+b[2]*Math.sin(t)*o+v[2]*e;let n=p/Math.sqrt(o+.1);C=(-Math.sin(t)*y[0]+Math.cos(t)*b[0])*n+v[0]*e*a,w=(-Math.sin(t)*y[1]+Math.cos(t)*b[1])*n+v[1]*e*a,T=(-Math.sin(t)*y[2]+Math.cos(t)*b[2])*n+v[2]*e*a}}else if(_===`web`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=3+(Math.random()-.5)*1.5;r=n*Math.sin(t)*Math.cos(e),x=n*Math.sin(t)*Math.sin(e),S=n*Math.cos(t);let i=2.5,a=Math.round(r/i)*i,o=Math.round(x/i)*i,s=Math.round(S/i)*i,c=.15+Math.random()*.1;r+=(a-r)*c,x+=(o-x)*c,S+=(s-S)*c;let l=N([r,x,S]),u=.02+Math.random()*.03;C=-l[0]*u,w=-l[1]*u,T=-l[2]*u,E=Math.random()**2*.6}else if(_===`cluster`){let t=e%5,n=t/5*Math.PI*2+.7,i=1.2+t*.3,a=Math.cos(n)*i,o=(t-2)*.4,s=Math.sin(n)*i,c=Math.random(),l=.6*c**.33/(1-c*c+.01)**.25,u=Math.random()*Math.PI*2,d=Math.acos(2*Math.random()-1);r=a+l*Math.sin(d)*Math.cos(u),x=o+l*Math.sin(d)*Math.sin(u),S=s+l*Math.cos(d);let f=.1+Math.random()*.12,p=N(P(N([r-a,x-o,S-s]),[.2,1,-.3]));C=p[0]*f,w=p[1]*f,T=p[2]*f,E=Math.random()**2.5*1}else if(_===`maelstrom`){let t=e%4,n=1+t*1.2+(Math.random()-.5)*.4,i=(t-1.5)*.35,a=N([Math.sin(i*1.3),Math.cos(i),Math.sin(i*.7)]),o=N(P([0,1,0],a)),s=P(a,o),c=Math.random()*Math.PI*2,l=(Math.random()-.5)*.15;r=o[0]*Math.cos(c)*n+s[0]*Math.sin(c)*n+a[0]*l,x=o[1]*Math.cos(c)*n+s[1]*Math.sin(c)*n+a[1]*l,S=o[2]*Math.cos(c)*n+s[2]*Math.sin(c)*n+a[2]*l;let u=(t%2==0?1:-1)*(1.2+t*.3)/Math.sqrt(n+.1);C=(-Math.sin(c)*o[0]+Math.cos(c)*s[0])*u,w=(-Math.sin(c)*o[1]+Math.cos(c)*s[1])*u,T=(-Math.sin(c)*o[2]+Math.cos(c)*s[2])*u,E=Math.random()**3*.5}else if(_===`dust`){r=(Math.random()-.5)*6,x=(Math.random()-.5)*6,S=(Math.random()-.5)*6;let e=.8,t=.08;C=Math.sin(x*e+1.3)*Math.cos(S*e+.7)*t,w=Math.sin(S*e+2.1)*Math.cos(r*e+1.1)*t,T=Math.sin(r*e+.5)*Math.cos(x*e+2.5)*t,E=Math.random()**4*.4}else if(_===`binary`){let e=Math.random()<.45,t=Math.sqrt(Math.random())*2.2,n=Math.random()*Math.PI*2,i=e?.25:-.15,a=N([i,1,i*.5]),o=N(P([0,1,0],a)),s=P(a,o),c=(Math.random()-.5)*.15;r=o[0]*Math.cos(n)*t+s[0]*Math.sin(n)*t+a[0]*c+(e?1.8:-1.8),x=o[1]*Math.cos(n)*t+s[1]*Math.sin(n)*t+a[1]*c+(e?.3:-.3),S=o[2]*Math.cos(n)*t+s[2]*Math.sin(n)*t+a[2]*c;let l=.7/Math.sqrt(t+.15),u=e?.12:-.12;if(C=(-Math.sin(n)*o[0]+Math.cos(n)*s[0])*l+u*.3,w=(-Math.sin(n)*o[1]+Math.cos(n)*s[1])*l,T=(-Math.sin(n)*o[2]+Math.cos(n)*s[2])*l+u,Math.random()<.1){let e=Math.random();r=-1.8+e*3.6+(Math.random()-.5)*.8,x=-.3+e*.6+(Math.random()-.5)*.5,S=(Math.random()-.5)*.6,C=(Math.random()-.5)*.1,w=(Math.random()-.5)*.05,T=(Math.random()-.5)*.1}E=Math.random()**2.5*.7}else if(_===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;r=n*Math.sin(t)*Math.cos(e),x=n*Math.sin(t)*Math.sin(e),S=n*Math.cos(t);let i=N([r,x,S]),a=N(P(i,[.3,1,-.2])),o=P(i,a),s=.18+Math.random()*.08;C=(a[0]+o[0]*.35)*s,w=(a[1]+o[1]*.35)*s,T=(a[2]+o[2]*.35)*s,E=Math.random()**3*.8}else r=(Math.random()-.5)*4,x=(Math.random()-.5)*4,S=(Math.random()-.5)*4,C=(Math.random()-.5)*.12,w=(Math.random()-.5)*.12,T=(Math.random()-.5)*.12,E=Math.random()**3*.8;g[t]=r,g[t+1]=x,g[t+2]=S,g[t+3]=E,g[t+4]=C,g[t+5]=w,g[t+6]=T,g[t+8]=r,g[t+9]=x,g[t+10]=S}let x=B.createBuffer({size:r,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,mappedAtCreation:!0});new Float32Array(x.getMappedRange()).set(g),x.unmap();let S=B.createBuffer({size:r,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),C=B.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),w=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),T=B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),E=B.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),O=B.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),k=B.createShaderModule({code:Yt||`struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  sourceCount: u32,
  coreOrbit: f32,
  time: f32,
  targetX: f32,
  targetY: f32,
  targetZ: f32,
  interactionActive: f32,
  // [LAW:one-source-of-truth] Disk-recovery state lives in the same Params block so the CPU sends one coherent snapshot per frame.
  diskNormal: vec3f,
  _pad4: f32,
  diskVertDamp: f32,
  diskRadDamp: f32,
  diskTangGain: f32,
  diskVertSpring: f32,
  diskAlignGain: f32,
  interactionStrength: f32,
  diskTangSpeed: f32,
  tidalStrength: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] Long-run N-body stability thresholds are owned here so containment and anti-collapse stay coherent.
const N_BODY_OUTER_RADIUS = 8.0;
const N_BODY_BOUNDARY_PULL = 0.006;
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;
const HOME_WELL_STRENGTH = 0.0;
const HOME_WELL_SOFTENING = 1.8;
const HOME_CORE_RADIUS = 0.0;
const HOME_CORE_PRESSURE = 0.0;
const HOME_RESTORE_STIFFNESS_ACTIVE = 0.14;
const HOME_RESTORE_DAMPING_ACTIVE = 0.18;
const INTERACTION_DRAG_GAIN = 0.6;
const HOME_ANCHOR_WELL_RADIUS = 5.0;
const HOME_ANCHOR_FADE_RADIUS = 7.0;
const HOME_REENTRY_KICK = 0.04;
const HOME_REENTRY_DAMPING = 0.02;
const CORE_FRICTION_RADIUS = 0.8;
const CORE_FRICTION_INNER_RADIUS = 0.1;
const CORE_FRICTION_SPEED_START = 1.5;
const CORE_FRICTION_GAIN = 1.2;

// Shared memory tile for source bodies — only pos + mass needed for force computation.
// [LAW:one-source-of-truth] TILE_SIZE matches @workgroup_size so every thread loads exactly one body per tile.
const TILE_SIZE = 256u;
var<workgroup> tile: array<vec4f, TILE_SIZE>;

@compute @workgroup_size(TILE_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let idx = gid.x;
  // [LAW:dataflow-not-control-flow] All threads participate in barriers; the alive flag gates writes only.
  let alive = idx < params.count;

  let me = bodiesIn[min(idx, params.count - 1u)];
  var acc = vec3f(0.0);

  let softeningSq = params.softening * params.softening;
  let G = params.G;
  let numTiles = (params.sourceCount + TILE_SIZE - 1u) / TILE_SIZE;
  let myPos = me.pos;

  for (var t = 0u; t < numTiles; t++) {
    let loadIdx = t * TILE_SIZE + lid.x;
    tile[lid.x] = select(
      vec4f(0.0),
      vec4f(bodiesIn[min(loadIdx, params.sourceCount - 1u)].pos, bodiesIn[min(loadIdx, params.sourceCount - 1u)].mass),
      loadIdx < params.sourceCount
    );
    workgroupBarrier();

    // Tight inner loop: gravity only. Self-interaction produces zero force via softening (no branch needed).
    let tileEnd = min(TILE_SIZE, params.sourceCount - t * TILE_SIZE);
    for (var j = 0u; j < tileEnd; j++) {
      let other = tile[j];
      let diff = other.xyz - myPos;
      let dist2 = dot(diff, diff) + softeningSq;
      let inv = inverseSqrt(dist2);
      acc += diff * (G * other.w * inv * inv * inv);
    }
    workgroupBarrier();
  }

  let targetPos = vec3f(params.targetX, params.targetY, params.targetZ);
  let interactionOn = params.interactionActive > 0.5;
  let countScale = sqrt(f32(params.count) / 1000.0);
  let wellStrength = select(HOME_WELL_STRENGTH, INTERACTION_WELL_STRENGTH * params.interactionStrength * countScale, interactionOn);
  let wellSoftening = select(HOME_WELL_SOFTENING, INTERACTION_WELL_SOFTENING, interactionOn);
  let coreRadius = select(HOME_CORE_RADIUS, INTERACTION_CORE_RADIUS, interactionOn);
  let corePressure = select(HOME_CORE_PRESSURE, INTERACTION_CORE_PRESSURE * params.interactionStrength * countScale, interactionOn);
  let homeRestoreStiffness = select(0.0, HOME_RESTORE_STIFFNESS_ACTIVE, interactionOn);
  let homeRestoreDamping = select(0.0, HOME_RESTORE_DAMPING_ACTIVE, interactionOn);
  let interactionDrag = select(0.0, INTERACTION_DRAG_GAIN * countScale, interactionOn);
  let homeReentryKick = select(HOME_REENTRY_KICK, 0.0, interactionOn);
  let homeReentryDamping = select(HOME_REENTRY_DAMPING, 0.0, interactionOn);
  let coreDist = length(me.pos);
  let coreFrictionFade = 1.0 - smoothstep(CORE_FRICTION_INNER_RADIUS, CORE_FRICTION_RADIUS, coreDist);

  let toTarget = targetPos - me.pos;
  let targetDist2 = dot(toTarget, toTarget);
  let targetDist = sqrt(targetDist2 + 0.0001);
  let targetDir = toTarget / targetDist;
  let toHome = me.home - me.pos;
  let homeAnchorFade = select(
    smoothstep(HOME_ANCHOR_WELL_RADIUS, HOME_ANCHOR_FADE_RADIUS, targetDist),
    1.0,
    interactionOn
  );
  let recoveryForceScale = select(homeAnchorFade, 1.0, interactionOn);
  acc += targetDir * (wellStrength / (targetDist2 + wellSoftening)) * recoveryForceScale;
  if (targetDist < coreRadius) {
    acc -= targetDir * ((coreRadius - targetDist) * corePressure * recoveryForceScale);
  }
  acc += toHome * (homeRestoreStiffness * homeAnchorFade);
  acc -= me.vel * (homeRestoreDamping * homeAnchorFade);
  acc += targetDir * (homeReentryKick * homeAnchorFade);
  acc -= me.vel * (homeReentryDamping * homeAnchorFade);
  acc += targetDir * interactionDrag;
  let speed = length(me.vel);
  let coreSpeedExcess = max(0.0, speed - CORE_FRICTION_SPEED_START);
  let coreFrictionStrength = params.coreOrbit * coreFrictionFade * coreSpeedExcess * CORE_FRICTION_GAIN;
  acc -= me.vel * coreFrictionStrength;

  // [LAW:dataflow-not-control-flow] Disk recovery always runs; gains of zero make individual terms inert without branching the solver.
  let n = params.diskNormal;
  let z = dot(me.pos, n);
  let vz = dot(me.vel, n);
  let rPlane = me.pos - z * n;
  let R2 = dot(rPlane, rPlane);
  let valid = R2 > 1e-8;
  let safeR = sqrt(max(R2, 1e-8));
  let eR = select(vec3f(0.0), rPlane / safeR, valid);
  let crossNE = cross(n, eR);
  let crossLen2 = dot(crossNE, crossNE);
  let ePhi = select(vec3f(0.0), crossNE / sqrt(max(crossLen2, 1e-8)), crossLen2 > 1e-8);
  let vR = dot(me.vel, eR);
  let vPhi = dot(me.vel, ePhi);
  // Disk recovery fades to zero beyond the disk region — scattered particles are free.
  let diskFade = 1.0 - smoothstep(5.0, 7.5, coreDist);
  // Vertical velocity damping — dissipates vertical kinetic energy to maintain disk coherence.
  acc -= n * (vz * params.diskVertDamp * diskFade);
  acc -= eR * (vR * params.diskRadDamp * diskFade);
  acc -= n * (z * params.diskVertSpring * diskFade);
  // Bidirectional tangential nudge: accelerates slow particles, brakes fast ones toward the target.
  // This acts as an energy regulator — without braking, the system injects energy without limit.
  let vc = params.diskTangSpeed / sqrt(safeR + 0.1);
  acc += ePhi * ((vc - vPhi) * params.diskTangGain * diskFade);
  let vNonTan = me.vel - n * vz - eR * vR;
  acc -= vNonTan * (params.diskAlignGain * diskFade);

  // Soft outer boundary.
  let boundaryExcess = max(0.0, coreDist - N_BODY_OUTER_RADIUS);
  acc -= normalize(me.pos + vec3f(0.0001)) * (boundaryExcess * N_BODY_BOUNDARY_PULL);

  // Slowly rotating tidal quadrupole — seeds spiral arms via differential rotation.
  let tidalAngle = params.time * 0.15;
  let tidalCos = cos(tidalAngle);
  let tidalSin = sin(tidalAngle);
  let axisA = vec3f(tidalCos, 0.0, tidalSin);
  let axisB = vec3f(-tidalSin, 0.0, tidalCos);
  acc += params.tidalStrength * (axisA * dot(me.pos, axisA) - axisB * dot(me.pos, axisB));

  let effectiveDamping = 1.0 - (1.0 - params.damping) * params.dt;
  var vel = (me.vel + acc * params.dt) * effectiveDamping;
  let pos = me.pos + vel * params.dt;

  if (alive) {
    bodiesOut[idx] = Body(pos, me.mass, vel, 0.0, me.home, 0.0);
  }
}
`}),ee=B.createShaderModule({code:e}),te=B.createShaderModule({code:Xt||`struct Camera {
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
  @location(2) speed: f32,
  @location(3) interactProximity: f32,
}

// [LAW:dataflow-not-control-flow] Per-particle hash gives deterministic visual jitter without storing extra data.
fn pcgHash(input: u32) -> f32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return f32((word >> 22u) ^ word) / 4294967295.0;
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
  let massVisual = clamp(sqrt(max(body.mass, 0.02)) / 1.8, 0.08, 1.0);
  let speed = length(body.vel);

  // Size: mass drives base size. Billboard scales with depth for constant pixel size, capped to avoid giant quads.
  let depth = min(max(abs(viewPos.z), 0.05), 30.0);
  let pixelScale = 0.0055 * depth * mix(0.6, 3.0, massVisual);
  let offset = quadPos[vid] * pixelScale;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];

  // Per-particle hashes for visual variety — deterministic, no extra storage.
  let hash0 = pcgHash(iid);
  let hash1 = pcgHash(iid + 7919u);  // second hash for independent variation

  // Rich stellar palette — 10 hues, no greens, continuously interpolated for smooth variety.
  let palette = array<vec3f, 10>(
    vec3f(1.0, 0.85, 0.5),    // warm gold
    vec3f(1.0, 0.6, 0.35),    // deep amber
    vec3f(1.0, 0.4, 0.4),     // soft red
    vec3f(1.0, 0.45, 0.6),    // warm rose
    vec3f(0.95, 0.4, 0.75),   // magenta-pink
    vec3f(0.75, 0.4, 0.95),   // orchid
    vec3f(0.55, 0.4, 1.0),    // violet
    vec3f(0.4, 0.5, 1.0),     // periwinkle
    vec3f(0.4, 0.65, 0.95),   // steel blue
    vec3f(0.85, 0.7, 1.0),    // lavender
  );

  // Continuous palette interpolation — hash picks a position along the 10-color ramp and lerps between neighbors.
  let palettePos = hash1 * 9.0;
  let paletteIdx = u32(palettePos);
  let paletteFrac = fract(palettePos);
  let stellarCol = mix(palette[paletteIdx], palette[min(paletteIdx + 1u, 9u)], paletteFrac);

  // ~50% of particles use pure stellar palette, rest blend with theme for cohesion.
  let massTint = clamp(pow(massVisual, 0.7), 0.0, 1.0);
  let jitteredTint = clamp(massTint + (hash0 - 0.5) * 0.3, 0.0, 1.0);
  let themeBase = mix(camera.primary, camera.secondary, jitteredTint);
  let useTheme = hash0 > 0.5;
  var col = select(stellarCol, mix(themeBase, stellarCol, 0.5), useTheme);

  // Heavy bodies pick up accent with hash-varied threshold.
  let heavyThreshold = 0.5 + hash0 * 0.3;
  let heavyTint = smoothstep(heavyThreshold, heavyThreshold + 0.2, massVisual);
  col = mix(col, mix(col, camera.accent, 0.55), heavyTint);

  // Velocity color shift: fast particles warm toward rose/amber, giving visual energy.
  let speedTint = smoothstep(0.5, 2.5, speed) * 0.2;
  col = mix(col, col * vec3f(1.0, 0.75, 0.4), speedTint);

  // Interaction glow: particles near the interaction point pick up accent tint and brighten.
  let toInteract = body.pos - camera.interactPos;
  let interactDist = length(toInteract);
  let proximity = camera.interactActive * (1.0 - smoothstep(0.0, 2.0, interactDist));
  col = mix(col, camera.accent * 1.4, proximity * 0.3);

  out.color = col;
  out.speed = speed;
  out.interactProximity = proximity;
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f, @location(2) speed: f32, @location(3) interactProximity: f32) -> @location(0) vec4f {
  let dist = length(uv);
  if (dist > 1.0) { discard; }
  let core = exp(-dist * 22.0) * 1.8;
  let halo = exp(-dist * 5.0) * 0.45;
  let intensity = core + halo;
  let whiteShift = clamp(core * 0.06, 0.0, 0.3);
  let tinted = mix(color, vec3f(1.0), whiteShift);

  // Velocity-dependent interaction flare: fast particles near the interaction well glow bright in accent,
  // creating visible energy tendrils of infalling material.
  let speedGlow = smoothstep(0.5, 2.5, speed) * interactProximity * 0.35;

  return vec4f(tinted * (intensity + speedGlow), 1.0);
}
`}),ne=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),M=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[ne]}),compute:{module:k,entryPoint:`main`}}),re=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ie=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[re]}),compute:{module:ee,entryPoint:`main`}}),ae=[B.createBindGroup({layout:re,entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:{buffer:E}},{binding:2,resource:{buffer:T}}]}),B.createBindGroup({layout:re,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:E}},{binding:2,resource:{buffer:T}}]})];B.queue.writeBuffer(T,0,new Uint32Array([n]));let F=B.createShaderModule({code:t}),I=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),L=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[I]}),compute:{module:F,entryPoint:`main`}}),R=B.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),oe=B.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),se=B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),z=[B.createBindGroup({layout:I,entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:{buffer:R}},{binding:2,resource:{buffer:se}}]}),B.createBindGroup({layout:I,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:R}},{binding:2,resource:{buffer:se}}]})],ce=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),pe=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[ce]}),vertex:{module:te,entryPoint:`vs_main`},fragment:{module:te,entryPoint:`fs_main`,targets:[{format:H,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:U}}),me=[B.createBindGroup({layout:ne,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:S}},{binding:2,resource:{buffer:C}}]}),B.createBindGroup({layout:ne,entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:{buffer:x}},{binding:2,resource:{buffer:C}}]})],he=[0,1].map(e=>[x,S].map(t=>B.createBindGroup({layout:ce,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:w,offset:e*j,size:A}}]}))),ge=2048,_e=Math.min(n,ge)*48,ve=B.createBuffer({size:_e,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),ye=!1,W=0,be={},G=[0,1,0],K=!1,Se=.02,Ce=!1,we=0,Te=1,Ee=D.physics.tidalStrength??.005,De=.003,Oe=.001,ke={ke:0,pe:0,virial:0,rmsR:0,rmsH:0,damping:1,tidal:.005},Ae=new ArrayBuffer(96),q=new Float32Array(Ae),je=new Uint32Array(Ae),Me=new Uint8Array(Ae);return{compute(e){let t=D.physics,r=D.mouse;q[0]=.016*D.fx.timeScale,q[1]=t.G*.001/Math.sqrt(Math.max(1,c)/1e3),q[2]=t.softening,q[3]=Te,je[4]=n,je[5]=c,q[6]=t.coreOrbit,q[7]=performance.now()*.001,q[8]=r.down?r.worldX:0,q[9]=r.down?r.worldY:0,q[10]=r.down?r.worldZ:0,q[11]=r.down?1:0,q[12]=G[0],q[13]=G[1],q[14]=G[2],q[16]=t.diskVertDamp??0,q[17]=t.diskRadDamp??0,q[18]=t.diskTangGain??0,q[19]=t.diskVertSpring??0,q[20]=t.diskAlignGain??0,q[21]=t.interactionStrength??1,q[22]=t.diskTangSpeed??.5,q[23]=Ee,B.queue.writeBuffer(C,0,Me);let i=e.beginComputePass();i.setPipeline(M),i.setBindGroup(0,me[W]),i.dispatchWorkgroups(Math.ceil(n/256)),i.end();let a=1-W,o=e.beginComputePass();o.setPipeline(ie),o.setBindGroup(0,ae[a]),o.dispatchWorkgroups(1),o.end(),K||(e.copyBufferToBuffer(E,0,O,0,16),K=!0,B.queue.onSubmittedWorkDone().then(()=>{O.mapAsync(GPUMapMode.READ).then(()=>{let e=new Float32Array(O.getMappedRange().slice(0));O.unmap();let t=e[0],n=e[1],r=e[2],i=Math.sqrt(t*t+n*n+r*r);if(i>1e-4){let e=t/i,a=n/i,o=r/i,s=G[0]+(e-G[0])*Se,c=G[1]+(a-G[1])*Se,l=G[2]+(o-G[2])*Se,u=Math.sqrt(s*s+c*c+l*l)||1;G[0]=s/u,G[1]=c/u,G[2]=l/u}K=!1}).catch(()=>{K=!1})}));let s=performance.now();if(!Ce&&s-we>1e3){we=s;let r=(t.G??1.5)*.001/Math.sqrt(Math.max(1,c)/1e3),i=new Float32Array(4),o=new Uint32Array(i.buffer);o[0]=n,o[1]=c,i[2]=(t.softening??.15)*(t.softening??.15),i[3]=r,B.queue.writeBuffer(se,0,i);let l=e.beginComputePass();l.setPipeline(L),l.setBindGroup(0,z[a]),l.dispatchWorkgroups(1),l.end(),e.copyBufferToBuffer(R,0,oe,0,32),Ce=!0,B.queue.onSubmittedWorkDone().then(()=>{oe.mapAsync(GPUMapMode.READ).then(()=>{let e=new Float32Array(oe.getMappedRange().slice(0));oe.unmap(),Ce=!1;let t=e[0],r=e[1],i=e[2],a=e[3],o=Math.abs(r)>.001?2*t/Math.abs(r):1;ke={ke:t,pe:r,virial:o,rmsR:Math.sqrt(i/Math.max(n,1)),rmsH:Math.sqrt(a/Math.max(n,1)),damping:Te,tidal:Ee};let s=o-1;s>0?(Te-=s*De,Ee-=s*Oe):(Ee-=s*Oe,Te-=s*De),Te=Math.max(.9,Math.min(1,Te)),Ee=Math.max(.001,Math.min(.05,Ee))}).catch(()=>{Ce=!1})})}W=1-W},render(e,t,r,i=0){let a=r?r[2]/r[3]:V.width/V.height;B.queue.writeBuffer(w,i*j,fe(a));let o=e.beginRenderPass({colorAttachments:[le(be,t,r)],depthStencilAttachment:ue(be,r)}),s=de(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),xe(o,a,i),o.setPipeline(pe),o.setBindGroup(0,he[i][W]),o.draw(6,n),o.end()},getCount(){return n},getStats(){return ke},async diagnose(){if(ye)return{error:1};ye=!0;let e=n-c,t=Math.min(e,ge),r=Math.floor(t/8),i=Math.floor(e/8),a=W===0?x:S,o=B.createCommandEncoder();for(let e=0;e<8;e++){let t=c+e*i;o.copyBufferToBuffer(a,t*48,ve,e*r*48,r*48)}B.queue.submit([o.finish()]),await B.queue.onSubmittedWorkDone(),await ve.mapAsync(GPUMapMode.READ);let s=new Float32Array(ve.getMappedRange().slice(0));ve.unmap(),ye=!1;let l=G,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,C=0,w=new Float64Array(10),T=new Float64Array(12);for(let e=0;e<t;e++){let t=e*12,n=s[t],r=s[t+1],i=s[t+2],a=s[t+3],o=s[t+4],c=s[t+5],x=s[t+6];u+=n,d+=r,f+=i,g+=a;let S=Math.sqrt(n*n+r*r+i*i);S>_&&(_=S),m+=S*S;let E=n*l[0]+r*l[1]+i*l[2];p+=E*E;let D=Math.sqrt(o*o+c*c+x*x);if(h+=D*D,S>.1){let e=n-E*l[0],t=r-E*l[1],a=i-E*l[2],s=Math.sqrt(e*e+t*t+a*a);if(s>.05){let n=e/s,r=t/s,i=a/s,u=l[1]*i-l[2]*r,d=l[2]*n-l[0]*i,f=l[0]*r-l[1]*n,p=Math.sqrt(u*u+d*d+f*f)||1,m=u/p,h=d/p,g=f/p,_=o*m+c*h+x*g;v+=Math.abs(_)/(D+.001),C++}}let O=Math.min(9,Math.floor(S*2));w[O]++;let k=n-E*l[0],A=r-E*l[1],j=i-E*l[2],ee=Math.atan2(k*b[0]+A*b[1]+j*b[2],k*y[0]+A*y[1]+j*y[2]),te=Math.floor((ee+Math.PI)/(2*Math.PI)*12)%12;T[te]++}let E=1/t,D=Array.from(T),O=D.reduce((e,t)=>e+t,0)/12,k=D.reduce((e,t)=>e+(t-O)**2,0)/12,A=O>0?Math.sqrt(k)/O:0;return{count:n,sampleCount:t,comX:u*E,comY:d*E,comZ:f*E,rmsHeight:Math.sqrt(p*E),rmsRadius:Math.sqrt(m*E),rmsSpeed:Math.sqrt(h*E),maxRadius:_,totalMass:n/t*g,tangentialFraction:C>0?v/C:0,armContrast:A,radialProfile:Array.from(w),angularProfile:D,diskNormalX:l[0],diskNormalY:l[1],diskNormalZ:l[2]}},destroy(){x.destroy(),S.destroy(),C.destroy(),w.destroy(),T.destroy(),E.destroy(),O.destroy(),R.destroy(),oe.destroy(),se.destroy(),ve.destroy()}}}function $e(){let e=D.physics_classic.count,t=e*32,n=new Float32Array(e*8),r=D.physics_classic.distribution;for(let t=0;t<e;t++){let e=t*8,i,a,o,s=0,c=0;if(r===`disk`){let e=Math.random()*Math.PI*2,t=Math.random()*2;i=Math.cos(e)*t,a=(Math.random()-.5)*.1,o=Math.sin(e)*t;let n=.5/Math.sqrt(t+.1);s=-Math.sin(e)*n,c=Math.cos(e)*n}else if(r===`shell`){let e=Math.random()*Math.PI*2,t=Math.acos(2*Math.random()-1),n=1.5+Math.random()*.1;i=n*Math.sin(t)*Math.cos(e),a=n*Math.sin(t)*Math.sin(e),o=n*Math.cos(t)}else i=(Math.random()-.5)*4,a=(Math.random()-.5)*4,o=(Math.random()-.5)*4;n[e]=i,n[e+1]=a,n[e+2]=o,n[e+3]=.5+Math.random()*2,n[e+4]=s,n[e+5]=0,n[e+6]=c}let i=B.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(i.getMappedRange()).set(n),i.unmap();let a=B.createBuffer({size:t,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),o=B.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),s=B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),l=B.createShaderModule({code:Zt||`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
// Body is 32 bytes (no \`home\` field). Attractor lives inside Params (no separate uniform here).

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
  attractorX: f32,
  attractorY: f32,
  attractorZ: f32,
  attractorActive: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  var acc = vec3f(0.0);

  for (var i = 0u; i < params.count; i++) {
    if (i == idx) { continue; }
    let other = bodiesIn[i];
    let diff = other.pos - me.pos;
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * other.mass * inv3);
  }

  // Attractor from ctrl+click — behaves like a massive body
  if (params.attractorActive > 0.5) {
    let aPos = vec3f(params.attractorX, params.attractorY, params.attractorZ);
    let diff = aPos - me.pos;
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * 200.0 * inv3);
  }

  // Gentle drift toward center when no attractor active — prevents bodies from escaping
  let toCenter = -me.pos;
  let centerDist = length(toCenter);
  if (centerDist > 1.0) {
    acc += toCenter * (0.001 * (centerDist - 1.0));
  }

  var vel = (me.vel + acc * params.dt) * params.damping;
  let pos = me.pos + vel * params.dt;

  bodiesOut[idx] = Body(pos, me.mass, vel, 0.0);
}
`}),u=B.createShaderModule({code:Qt||`// Classic n-body render — preserved verbatim for A/B comparison. World-space billboards, soft fuzzy falloff.
// The output is multiplied by a small HDR factor at the end so the bloom/composite stage can lift it; the
// underlying shape and gradient are otherwise identical to the original.

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
}

struct Attractor {
  // 'enabled' instead of 'active' because WGSL reserves \`active\` as a keyword
  // and would reject \`active: f32\` with "Expected Identifier, got ReservedWord".
  x: f32, y: f32, z: f32, enabled: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> attractor: Attractor;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) glow: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let body = bodies[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  // Attractor influence: bodies closer to attractor get bigger and shift color
  var attractInfluence = 0.0;
  if (attractor.enabled > 0.5) {
    let aPos = vec3f(attractor.x, attractor.y, attractor.z);
    let toDist = length(aPos - body.pos);
    attractInfluence = clamp(1.0 / (toDist * toDist + 0.1), 0.0, 1.0);
  }

  let viewPos = camera.view * vec4f(body.pos, 1.0);
  let baseSize = 0.04 * (0.5 + body.mass * 0.5);
  let size = baseSize * (1.0 + attractInfluence * 1.5); // swell near attractor
  let offset = quadPos[vid] * size;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];
  out.glow = attractInfluence;

  // Color: primary → secondary by mass, shifts to accent near attractor
  let massTint = clamp(body.mass / 3.0, 0.0, 1.0);
  let baseColor = mix(camera.primary, camera.secondary, massTint);
  let attractColor = camera.accent;
  out.color = mix(baseColor, attractColor, attractInfluence);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f, @location(2) glow: f32) -> @location(0) vec4f {
  let dist = length(uv);
  // smoothstep requires edge0 <= edge1 in WGSL (undefined behavior otherwise),
  // so we compute the standard form and invert. Result: alpha = 1 at center,
  // 0 at the outer edge, smoothly fading between dist=0.3 and dist=1.0.
  let alpha = 1.0 - smoothstep(0.3, 1.0, dist);
  if (alpha < 0.01) { discard; }
  let g = exp(-dist * 2.0);
  // Extra glow ring when under attractor influence
  let extraGlow = glow * exp(-dist * 1.0) * 0.5;
  // Modest HDR multiplier so the classic look reads through tone mapping without overhauling its character.
  return vec4f(color * (0.5 + g * 0.5 + extraGlow) * 2.5, alpha);
}
`}),d=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),f=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[d]}),compute:{module:l,entryPoint:`main`}}),p=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:u,entryPoint:`vs_main`},fragment:{module:u,entryPoint:`fs_main`,targets:[{format:H,blend:{color:{srcFactor:`src-alpha`,dstFactor:`one`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`always`},multisample:{count:U}}),h=[B.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:i}},{binding:1,resource:{buffer:a}},{binding:2,resource:{buffer:o}}]}),B.createBindGroup({layout:d,entries:[{binding:0,resource:{buffer:a}},{binding:1,resource:{buffer:i}},{binding:2,resource:{buffer:o}}]})],g=[0,1].map(e=>[i,a].map(t=>B.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:c,offset:e*j,size:A}},{binding:2,resource:{buffer:s}}]}))),_=0,v={};return{compute(t){let n=D.physics_classic,r=D.mouse,i=new ArrayBuffer(48),a=new Float32Array(i),c=new Uint32Array(i);a[0]=.016*D.fx.timeScale,a[1]=n.G*.001,a[2]=n.softening,a[3]=n.damping,c[4]=e,a[8]=r.down?r.worldX:0,a[9]=r.down?r.worldY:0,a[10]=r.down?r.worldZ:0,a[11]=r.down?1:0,B.queue.writeBuffer(o,0,new Uint8Array(i)),B.queue.writeBuffer(s,0,new Float32Array([r.down?r.worldX:0,r.down?r.worldY:0,r.down?r.worldZ:0,r.down?1:0]));let l=t.beginComputePass();l.setPipeline(f),l.setBindGroup(0,h[_]),l.dispatchWorkgroups(Math.ceil(e/64)),l.end(),_=1-_},render(t,n,r,i=0){let a=r?r[2]/r[3]:V.width/V.height;B.queue.writeBuffer(c,i*j,fe(a));let o=t.beginRenderPass({colorAttachments:[le(v,n,r)],depthStencilAttachment:ue(v,r)}),s=de(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),xe(o,a,i),o.setPipeline(m),o.setBindGroup(0,g[i][_]),o.draw(6,e),o.end()},getCount(){return e},destroy(){i.destroy(),a.destroy(),o.destroy(),s.destroy(),c.destroy()}}}function et(){let e=D.fluid.resolution,t=e*e,n=t*8,r=t*4,i=t*16,a=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,o=B.createBuffer({size:n,usage:a}),s=B.createBuffer({size:n,usage:a}),c=B.createBuffer({size:r,usage:a}),l=B.createBuffer({size:r,usage:a}),u=B.createBuffer({size:r,usage:a}),d=B.createBuffer({size:i,usage:a}),f=B.createBuffer({size:i,usage:a}),p=B.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),h=new Float32Array(t*4),g=new Float32Array(t*2);for(let t=0;t<e;t++)for(let n=0;n<e;n++){let r=t*e+n,i=n/e,a=t/e,o=i-.5,s=a-.5;g[r*2]=-s*3,g[r*2+1]=o*3}B.queue.writeBuffer(d,0,h),B.queue.writeBuffer(o,0,g);let _=B.createShaderModule({code:$t||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  time: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> dyeIn: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> dyeOut: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  let cx = clamp(x, 0, res - 1);
  let cy = clamp(y, 0, res - 1);
  return u32(cy * res + cx);
}

fn sampleVel(px: f32, py: f32) -> vec2f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(velIn[idx(x0, y0)], velIn[idx(x0+1, y0)], fx),
    mix(velIn[idx(x0, y0+1)], velIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn sampleDye(px: f32, py: f32) -> vec4f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(dyeIn[idx(x0, y0)], dyeIn[idx(x0+1, y0)], fx),
    mix(dyeIn[idx(x0, y0+1)], dyeIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn gaussian(delta: vec2f, radius: f32) -> f32 {
  return exp(-dot(delta, delta) / (2.0 * radius * radius));
}

fn orbitCenter(time: f32, phase: f32, radius: f32, wobble: f32) -> vec2f {
  return vec2f(
    0.5 + cos(time * 0.17 + phase) * radius + cos(time * 0.31 + phase * 1.7) * wobble,
    0.5 + sin(time * 0.14 + phase * 1.3) * radius + sin(time * 0.27 + phase * 0.8) * wobble
  );
}

fn driftImpulse(delta: vec2f, falloff: f32, spin: f32, strength: f32, timePhase: f32) -> vec2f {
  let dist = max(length(delta), 1e-4);
  let tangent = vec2f(-delta.y, delta.x) / dist * spin * (0.18 + 0.08 * sin(timePhase));
  let inward = -delta * 0.95;
  let grain = vec2f(sin(delta.y * 18.0 + timePhase), cos(delta.x * 16.0 - timePhase)) * 0.035;
  return (tangent + inward + grain) * falloff * strength;
}

fn ambientDyeColor(phase: f32, pulse: f32) -> vec3f {
  if (params.dyeMode < 0.5) {
    return hsvToRgb(fract(params.time * 0.08 + phase), 0.85, 1.0);
  }
  if (params.dyeMode < 1.5) {
    return vec3f(0.1, 0.5, 1.0) * (0.75 + pulse * 0.25);
  }
  return mix(vec3f(0.18, 0.3, 1.0), vec3f(1.0, 0.28, 0.1), 0.5 + pulse * 0.5);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let i = idx(x, y);
  let uv = vec2f((f32(x) + 0.5) / params.resolution, (f32(y) + 0.5) / params.resolution);
  var velocityImpulse = vec2f(0.0);
  var dyeInjection = vec4f(0.0);

  // [LAW:dataflow-not-control-flow] Both ambient drive and pointer input are evaluated every invocation; the mask values decide whether they contribute.
  let mouseMask = select(0.0, 1.0, params.mouseActive > 0.5);
  let mouseDelta = uv - vec2f(params.mouseX, params.mouseY);
  let mouseRadius = 0.02;
  let mouseSplat = gaussian(mouseDelta, mouseRadius) * params.forceStrength * mouseMask;
  velocityImpulse += vec2f(params.mouseDX, params.mouseDY) * mouseSplat;

  let mouseDyeSplat = gaussian(mouseDelta, mouseRadius * 2.0) * mouseMask;
  var mouseDyeColor: vec3f;
  if (params.dyeMode < 0.5) {
    let angle = atan2(params.mouseDY, params.mouseDX);
    let h = angle / 6.283 + 0.5;
    mouseDyeColor = hsvToRgb(h, 0.9, 1.0);
  } else if (params.dyeMode < 1.5) {
    mouseDyeColor = vec3f(0.1, 0.5, 1.0);
  } else {
    let speed = length(vec2f(params.mouseDX, params.mouseDY));
    mouseDyeColor = mix(vec3f(0.2, 0.3, 1.0), vec3f(1.0, 0.2, 0.1), clamp(speed * 5.0, 0.0, 1.0));
  }
  dyeInjection += vec4f(mouseDyeColor * mouseDyeSplat, mouseDyeSplat);

  let driveBase = params.forceStrength * 0.0032;
  let ambientDyeRamp = smoothstep(1.5, 7.0, params.time);

  let pulse0 = 0.75 + 0.25 * sin(params.time * 0.42);
  let center0 = orbitCenter(params.time, 0.0, 0.19, 0.035);
  let delta0 = uv - center0;
  let falloff0 = gaussian(delta0, 0.32);
  velocityImpulse += driftImpulse(delta0, falloff0, 1.0, driveBase * pulse0, params.time * 0.7);
  dyeInjection += vec4f(ambientDyeColor(0.03, pulse0) * falloff0 * 0.0006, falloff0 * 0.0003) * ambientDyeRamp;

  let pulse1 = 0.75 + 0.25 * sin(params.time * 0.37 + 2.1);
  let center1 = orbitCenter(params.time, 2.1, 0.16, 0.04);
  let delta1 = uv - center1;
  let falloff1 = gaussian(delta1, 0.30);
  velocityImpulse += driftImpulse(delta1, falloff1, -1.0, driveBase * pulse1 * 0.9, params.time * 0.63 + 1.7);
  dyeInjection += vec4f(ambientDyeColor(0.37, pulse1) * falloff1 * 0.0005, falloff1 * 0.00025) * ambientDyeRamp;

  let pulse2 = 0.75 + 0.25 * sin(params.time * 0.33 + 4.2);
  let center2 = orbitCenter(params.time, 4.2, 0.21, 0.03);
  let delta2 = uv - center2;
  let falloff2 = gaussian(delta2, 0.34);
  velocityImpulse += driftImpulse(delta2, falloff2, 1.0, driveBase * pulse2 * 0.8, params.time * 0.57 + 3.4);
  dyeInjection += vec4f(ambientDyeColor(0.69, pulse2) * falloff2 * 0.0004, falloff2 * 0.0002) * ambientDyeRamp;

  let drivenVel = velIn[i] + velocityImpulse;
  let px = f32(x) - drivenVel.x * params.dt;
  let py = f32(y) - drivenVel.y * params.dt;
  let advectedVel = sampleVel(px, py);
  let advectedDye = sampleDye(px, py) * 0.992;

  velOut[i] = (advectedVel + velocityImpulse) * 0.94;
  dyeOut[i] = min(advectedDye + dyeInjection, vec4f(2.2, 2.2, 2.2, 1.6));
}

fn hsvToRgb(h: f32, s: f32, v: f32) -> vec3f {
  let hh = fract(h) * 6.0;
  let i = u32(floor(hh));
  let f = hh - f32(i);
  let p = v * (1.0 - s);
  let q = v * (1.0 - s * f);
  let t = v * (1.0 - s * (1.0 - f));
  switch (i) {
    case 0u: { return vec3f(v, t, p); }
    case 1u: { return vec3f(q, v, p); }
    case 2u: { return vec3f(p, v, t); }
    case 3u: { return vec3f(p, q, v); }
    case 4u: { return vec3f(t, p, v); }
    default: { return vec3f(v, p, q); }
  }
}
`}),v=B.createShaderModule({code:en||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let alpha = 1.0 / (params.viscosity * params.dt);
  let beta = 4.0 + alpha;

  let center = velIn[idx(x, y)];
  let left = velIn[idx(x-1, y)];
  let right = velIn[idx(x+1, y)];
  let down = velIn[idx(x, y-1)];
  let up = velIn[idx(x, y+1)];

  velOut[idx(x, y)] = (left + right + down + up + center * alpha) / beta;
}
`}),y=B.createShaderModule({code:nn||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> pressIn: array<f32>;
@group(0) @binding(1) var<storage, read_write> pressOut: array<f32>;
@group(0) @binding(2) var<storage, read> divergence: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let left = pressIn[idx(x-1, y)];
  let right = pressIn[idx(x+1, y)];
  let down = pressIn[idx(x, y-1)];
  let up = pressIn[idx(x, y+1)];
  let div = divergence[idx(x, y)];

  pressOut[idx(x, y)] = (left + right + down + up - div) * 0.25;
}
`}),b=B.createShaderModule({code:tn||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> divergenceOut: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let vr = velIn[idx(x+1, y)].x;
  let vl = velIn[idx(x-1, y)].x;
  let vu = velIn[idx(x, y+1)].y;
  let vd = velIn[idx(x, y-1)].y;
  divergenceOut[idx(x, y)] = (vr - vl + vu - vd) * 0.5;
}
`}),x=B.createShaderModule({code:rn||`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> pressure: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let pl = pressure[idx(x-1, y)];
  let pr = pressure[idx(x+1, y)];
  let pd = pressure[idx(x, y-1)];
  let pu = pressure[idx(x, y+1)];
  let vel = velIn[idx(x, y)];
  velOut[idx(x, y)] = vel - vec2f(pr - pl, pu - pd) * 0.5;
}
`}),S=B.createShaderModule({code:an||`struct Camera {
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

fn fetchDye(x: i32, y: i32, res: i32) -> vec4f {
  let cx = clamp(x, 0, res - 1);
  let cy = clamp(y, 0, res - 1);
  return dye[cy * res + cx];
}

// Catmull-Rom cubic weights — C1 continuous interpolation, no overshoot tuning
// needed and the 1D weights sum to 1. Used in 2D as a separable 4×4 sample.
fn catmullRom(t: f32) -> vec4f {
  let t2 = t * t;
  let t3 = t2 * t;
  return vec4f(
    -0.5 * t3 +       t2 - 0.5 * t,
     1.5 * t3 - 2.5 * t2 + 1.0,
    -1.5 * t3 + 2.0 * t2 + 0.5 * t,
     0.5 * t3 - 0.5 * t2
  );
}

// Bicubic sample of the dye field. The sim grid (simRes²) is denser than the
// render grid (gridRes²) but the render samples between sim cells. Bilinear is
// only C0 continuous, so the kinks at sim-cell boundaries become visible as
// faint contour bands once the density goes through pow() and Phong lighting.
// Catmull-Rom is C1 continuous → bands disappear.
fn sampleDye(u: f32, v: f32) -> vec4f {
  let res = i32(params.simRes);
  let fx = u * f32(res) - 0.5;
  let fy = v * f32(res) - 0.5;
  let x1 = i32(floor(fx));
  let y1 = i32(floor(fy));
  let tx = fx - f32(x1);
  let ty = fy - f32(y1);
  let wx = catmullRom(tx);
  let wy = catmullRom(ty);

  var rows: array<vec4f, 4>;
  for (var j = 0; j < 4; j = j + 1) {
    let row = fetchDye(x1 - 1, y1 - 1 + j, res) * wx.x
            + fetchDye(x1,     y1 - 1 + j, res) * wx.y
            + fetchDye(x1 + 1, y1 - 1 + j, res) * wx.z
            + fetchDye(x1 + 2, y1 - 1 + j, res) * wx.w;
    rows[j] = row;
  }
  let result = rows[0] * wy.x + rows[1] * wy.y + rows[2] * wy.z + rows[3] * wy.w;
  // Catmull-Rom can ring slightly negative on sharp edges; clamp non-negative
  // since dye density and color are physically non-negative.
  return max(result, vec4f(0.0));
}

fn sampleDensity(u: f32, v: f32) -> f32 {
  // [LAW:one-source-of-truth] Density comes solely from dye.a (the mode-invariant
  // splat amount written by fluid.forces.wgsl). Mixing length(d.rgb) here makes
  // surface height depend on dye color, so single/rainbow/temperature presets
  // would render at different thicknesses for the same injected density.
  let d = sampleDye(u, v);
  let raw = clamp(d.a * 0.14, 0.0, 2.5);
  return 1.0 - exp(-raw * 1.35);
}

// [LAW:one-source-of-truth] Single function maps a density scalar to surface
// height. Used for both top corners and side-wall top edges so adjacent cells
// share heights exactly along their shared edges.
fn heightFromDensity(density: f32) -> f32 {
  let liftedDensity = pow(density, 0.58);
  return 0.14 + liftedDensity * params.heightScale * 2.6;
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

// Each cell instance draws a 36-vert prism: 6 top + 6 bottom + 4 side quads of
// 6 verts each. prismVert encodes per-vertex (corner_x, corner_z, isTop) where
// corner_{x,z} ∈ {0,1} pick which of the 4 cell corners and isTop ∈ {0,1}
// picks top vs bottom edge of that corner column.
fn prismVert(vid: u32) -> vec3f {
  let table = array<vec3f, 36>(
    // Top quad (y = surface, two triangles, CCW from +y)
    vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0),
    vec3f(0.0, 1.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(1.0, 1.0, 1.0),
    // Bottom quad (y = 0, CCW from -y)
    vec3f(0.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0),
    vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
    // -X side (cornerX=0)
    vec3f(0.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0),
    vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0),
    // +X side (cornerX=1)
    vec3f(1.0, 0.0, 0.0), vec3f(1.0, 1.0, 0.0), vec3f(1.0, 0.0, 1.0),
    vec3f(1.0, 0.0, 1.0), vec3f(1.0, 1.0, 0.0), vec3f(1.0, 1.0, 1.0),
    // -Z side (cornerZ=0)
    vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0),
    vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 0.0), vec3f(1.0, 0.0, 1.0),
    // +Z side (cornerZ=1)
    vec3f(0.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 0.0),
    vec3f(1.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0)
  );
  return table[vid];
}

// Static face normals for non-top verts (top normals come from density derivatives)
fn faceNormal(vid: u32) -> vec3f {
  if (vid < 6u) { return vec3f(0.0, 1.0, 0.0); }
  if (vid < 12u) { return vec3f(0.0, -1.0, 0.0); }
  if (vid < 18u) { return vec3f(-1.0, 0.0, 0.0); }
  if (vid < 24u) { return vec3f(1.0, 0.0, 0.0); }
  if (vid < 30u) { return vec3f(0.0, 0.0, -1.0); }
  return vec3f(0.0, 0.0, 1.0);
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let gr = u32(params.gridRes);
  let cx = iid % gr;
  let cy = iid / gr;

  let local = prismVert(vid);
  let cornerX = local.x;
  let cornerZ = local.y;
  let isTop = local.z;

  // Corner (u,v) — corners are at integer cell boundaries so adjacent cells
  // sample the same point and produce shared heights along shared edges.
  let u = (f32(cx) + cornerX) / f32(gr);
  let v = (f32(cy) + cornerZ) / f32(gr);

  let density = sampleDensity(u, v);
  let topY = heightFromDensity(density);
  let worldY = isTop * topY;

  let worldX = (u - 0.5) * params.worldSize;
  let worldZ = (v - 0.5) * params.worldSize;
  var worldPos = vec3f(worldX, worldY, worldZ);

  // Collapse interior side walls to a degenerate point. Adjacent cells produce
  // exact-coincident opposite-facing wall quads which z-fight (both draw at the
  // same depth), so only world-boundary cells should emit their outward sides.
  // [LAW:dataflow-not-control-flow] Every vertex still runs the same path; the
  // boundary check just supplies a degenerate position for non-boundary side verts.
  let lastCell = gr - 1u;
  let isMinX = vid >= 12u && vid < 18u && cx != 0u;
  let isMaxX = vid >= 18u && vid < 24u && cx != lastCell;
  let isMinZ = vid >= 24u && vid < 30u && cy != 0u;
  let isMaxZ = vid >= 30u && vid < 36u && cy != lastCell;
  if (isMinX || isMaxX || isMinZ || isMaxZ) {
    worldPos = vec3f(0.0);
  }

  // Top normals from finite differences of the density field — produces smooth
  // Phong shading instead of cube facets. Side/bottom verts use static face normals.
  var normal = faceNormal(vid);
  if (vid < 6u) {
    let eps = 1.0 / f32(gr);
    let hL = heightFromDensity(sampleDensity(u - eps, v));
    let hR = heightFromDensity(sampleDensity(u + eps, v));
    let hD = heightFromDensity(sampleDensity(u, v - eps));
    let hU = heightFromDensity(sampleDensity(u, v + eps));
    let dx = (hR - hL) / (2.0 * eps * params.worldSize);
    let dz = (hU - hD) / (2.0 * eps * params.worldSize);
    normal = normalize(vec3f(-dx, 1.0, -dz));
  }

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  // Pass per-vertex corner uv (not cell-center) so the fragment uv interpolates
  // smoothly across the entire surface. Cell-center uv was constant per-cell,
  // which made spectralThemeColor produce a different color per cell — visible
  // as concentric contour bands.
  out.uv = vec2f(u, v);
  out.normal = normal;
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
`}),C=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),w=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[C]}),compute:{module:_,entryPoint:`main`}}),T=B.createBindGroup({layout:C,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:d}},{binding:3,resource:{buffer:f}},{binding:4,resource:{buffer:p}}]}),E=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),ee=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[E]}),compute:{module:v,entryPoint:`main`}}),te=[B.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:p}}]}),B.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:o}},{binding:2,resource:{buffer:p}}]})],ne=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),M=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[ne]}),compute:{module:b,entryPoint:`main`}}),N=B.createBindGroup({layout:ne,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:p}}]}),P=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),re=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[P]}),compute:{module:y,entryPoint:`main`}}),ie=[B.createBindGroup({layout:P,entries:[{binding:0,resource:{buffer:c}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]}),B.createBindGroup({layout:P,entries:[{binding:0,resource:{buffer:l}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:u}},{binding:3,resource:{buffer:p}}]})],ae=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`read-only-storage`}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),F=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[ae]}),compute:{module:x,entryPoint:`main`}}),I=B.createBindGroup({layout:ae,entries:[{binding:0,resource:{buffer:o}},{binding:1,resource:{buffer:s}},{binding:2,resource:{buffer:c}},{binding:3,resource:{buffer:p}}]}),L=B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});B.queue.writeBuffer(L,0,new Float32Array([e,O,D.fluid.volumeScale,k]));let R=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),oe=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[R]}),vertex:{module:S,entryPoint:`vs_main`},fragment:{module:S,entryPoint:`fs_main`,targets:[{format:H}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:U}}),se=[0,1].map(e=>B.createBindGroup({layout:R,entries:[{binding:0,resource:{buffer:d}},{binding:1,resource:{buffer:L}},{binding:2,resource:{buffer:m,offset:e*j,size:A}}]})),z=Math.ceil(e/8),ce={},pe=0;return{compute(t){let a=D.fluid,u=a.dyeMode===`rainbow`?0:a.dyeMode===`single`?1:2;pe+=.016*D.fx.timeScale;let m=new Float32Array([.22*D.fx.timeScale,a.viscosity,a.diffusionRate,a.forceStrength,e,D.mouse.x,D.mouse.y,D.mouse.dx,D.mouse.dy,D.mouse.down?1:0,u,pe]);B.queue.writeBuffer(p,0,m);{let e=t.beginComputePass();e.setPipeline(w),e.setBindGroup(0,T),e.dispatchWorkgroups(z,z),e.end()}t.copyBufferToBuffer(s,0,o,0,n),t.copyBufferToBuffer(f,0,d,0,i);let h=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(ee),e.setBindGroup(0,te[h]),e.dispatchWorkgroups(z,z),e.end(),h=1-h}h===1&&t.copyBufferToBuffer(s,0,o,0,n);{let e=t.beginComputePass();e.setPipeline(M),e.setBindGroup(0,N),e.dispatchWorkgroups(z,z),e.end()}let g=0;for(let e=0;e<a.jacobiIterations;e++){let e=t.beginComputePass();e.setPipeline(re),e.setBindGroup(0,ie[g]),e.dispatchWorkgroups(z,z),e.end(),g=1-g}g===1&&t.copyBufferToBuffer(l,0,c,0,r);{let e=t.beginComputePass();e.setPipeline(F),e.setBindGroup(0,I),e.dispatchWorkgroups(z,z),e.end()}t.copyBufferToBuffer(s,0,o,0,n)},render(t,n,r,i=0){let a=r?r[2]/r[3]:V.width/V.height;B.queue.writeBuffer(m,i*j,fe(a)),B.queue.writeBuffer(L,0,new Float32Array([e,O,D.fluid.volumeScale,k]));let o=t.beginRenderPass({colorAttachments:[le(ce,n,r)],depthStencilAttachment:ue(ce,r)}),s=de(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),xe(o,a,i),o.setPipeline(oe),o.setBindGroup(0,se[i]),o.draw(36,O*O),o.end()},getCount(){return e+`x`+e},destroy(){o.destroy(),s.destroy(),c.destroy(),l.destroy(),u.destroy(),d.destroy(),f.destroy(),p.destroy(),L.destroy(),m.destroy()}}}function tt(){let e=65025*6,t=B.createBuffer({size:2097152,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.VERTEX}),n=B.createBuffer({size:e*4,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});{let t=new Uint32Array(e),r=0;for(let e=0;e<255;e++)for(let n=0;n<255;n++){let i=e*256+n,a=i+1,o=(e+1)*256+n,s=o+1;t[r++]=i,t[r++]=o,t[r++]=a,t[r++]=a,t[r++]=o,t[r++]=s}B.queue.writeBuffer(n,0,t)}let r=B.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),i=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),a=B.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),o=0,s=0,c=B.createShaderModule({code:on||`struct Params {
  uRes: u32,
  vRes: u32,
  scale: f32,
  twist: f32,
  time: f32,
  shapeId: u32,
  p1: f32,
  p2: f32,
  p3: f32,  // wave amplitude
  p4: f32,  // wave frequency multiplier
  pokeX: f32,
  pokeY: f32,
  pokeZ: f32,
  pokeActive: f32,
}

struct Vertex {
  pos: vec3f,
  glow: f32,    // wave displacement magnitude — sits in the vec3f padding slot
  normal: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> params: Params;

// Shape 0: Torus — p1=majorRadius, p2=minorRadius
fn torusShape(u: f32, v: f32) -> vec3f {
  let R = params.p1; let r = params.p2;
  return vec3f(
    (R + r * cos(v)) * cos(u),
    (R + r * cos(v)) * sin(u),
    r * sin(v)
  );
}

// Shape 1: Klein bottle — p1=scale
fn kleinShape(u: f32, v: f32) -> vec3f {
  let cosU = cos(u); let sinU = sin(u);
  let cosV = cos(v); let sinV = sin(v);
  let a = params.p1;
  var x: f32; var z: f32;
  if (u < 3.14159) {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cosU*cosV;
    z = -8.0*sinU - (2.0*a)*(1.0-cosU*0.5)*sinU*cosV;
  } else {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cos(v+3.14159);
    z = -8.0*sinU;
  }
  let y = -(2.0*a)*(1.0-cosU*0.5)*sinV;
  return vec3f(x, y, z) * 0.1;
}

// Shape 2: Möbius strip — p1=width, p2=halfTwists
fn mobiusShape(u: f32, v: f32) -> vec3f {
  let w = params.p1;
  let tw = params.p2;
  let vv = (v / 6.283185 - 0.5) * w;
  let halfU = u * tw * 0.5;
  return vec3f(
    (1.0 + vv * cos(halfU)) * cos(u),
    (1.0 + vv * cos(halfU)) * sin(u),
    vv * sin(halfU)
  );
}

// Shape 3: Sphere — p1=xStretch, p2=zStretch
fn sphereShape(u: f32, v: f32) -> vec3f {
  return vec3f(
    sin(v) * cos(u) * params.p1,
    sin(v) * sin(u) * params.p1,
    cos(v) * params.p2
  );
}

// Shape 4: Trefoil knot — p1=tubeRadius, p2=knotScale
fn trefoilShape(u: f32, v: f32) -> vec3f {
  let t = u;
  let ks = params.p2;
  let cx = sin(t) + 2.0 * sin(2.0 * t);
  let cy = cos(t) - 2.0 * cos(2.0 * t);
  let cz = -sin(3.0 * t);
  let dx = cos(t) + 4.0 * cos(2.0 * t);
  let dy = -sin(t) + 4.0 * sin(2.0 * t);
  let dz = -3.0 * cos(3.0 * t);
  let tangent = normalize(vec3f(dx, dy, dz));
  var up = vec3f(0.0, 0.0, 1.0);
  if (abs(dot(tangent, up)) > 0.99) { up = vec3f(0.0, 1.0, 0.0); }
  let normal = normalize(cross(tangent, up));
  let binormal = cross(tangent, normal);
  let r = params.p1;
  return vec3f(cx, cy, cz) * ks + (normal * cos(v) + binormal * sin(v)) * r * ks;
}

fn evalShape(u: f32, v: f32) -> vec3f {
  switch (params.shapeId) {
    case 0u: { return torusShape(u, v); }
    case 1u: { return kleinShape(u, v); }
    case 2u: { return mobiusShape(u, v); }
    case 3u: { return sphereShape(u, v); }
    case 4u: { return trefoilShape(u, v); }
    default: { return torusShape(u, v); }
  }
}

// Three interfering traveling waves — amplitude=p3, frequency=p4
fn waveDelta(u: f32, v: f32) -> f32 {
  let t = params.time;
  let a = params.p3;
  let f = max(params.p4, 0.3);
  let w1 = sin(u * 3.0 * f + v * 2.0 * f + t * 1.8) * 0.12;
  let w2 = cos(u * 5.0 * f - v * 4.0 * f + t * 2.3) * 0.07;
  let w3 = sin(u * 2.0 * f + v * 7.0 * f - t * 1.5) * 0.05;
  return (w1 + w2 + w3) * a;
}

// Scaled + wave-displaced position for a UV coordinate.
// Normal of the base shape is computed via finite differences and used as
// the displacement direction so waves are always surface-normal aligned.
fn evalFull(u: f32, v: f32) -> vec3f {
  let eps = 0.001;
  let p  = evalShape(u, v);
  let pu = evalShape(u + eps, v);
  let pv = evalShape(u, v + eps);
  let bn = normalize(cross(pu - p, pv - p));
  return (p + bn * waveDelta(u, v)) * params.scale;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let ui = gid.x;
  let vi = gid.y;
  if (ui >= params.uRes || vi >= params.vRes) { return; }

  let u = f32(ui) / f32(params.uRes) * 6.283185;
  let v = f32(vi) / f32(params.vRes) * 6.283185;
  let idx = vi * params.uRes + ui;

  let twistAngle = params.twist * f32(vi) / f32(params.vRes);
  let tu = u + twistAngle;

  // Displaced position
  var pos = evalFull(tu, v);

  // Normal of the displaced surface via finite differences of evalFull
  let feps = 0.005;
  let dpu = evalFull(tu + feps, v) - pos;
  let dpv = evalFull(tu, v + feps) - pos;
  let nc = cross(dpu, dpv);
  let nlen = length(nc);
  var normal = select(vec3f(0.0, 1.0, 0.0), nc / nlen, nlen > 0.0001);

  // Glow: wave displacement magnitude, scaled so default amp gives visible emission
  let disp = waveDelta(tu, v);
  let glow = abs(disp) * 5.0;

  // Poke deformation: push vertices outward near the interaction point
  if (params.pokeActive > 0.5) {
    let pokePos = vec3f(params.pokeX, params.pokeY, params.pokeZ);
    let diff = pos - pokePos;
    let dist = length(diff);
    let radius = 0.8;
    let strength = exp(-dist * dist / (2.0 * radius * radius)) * 0.5;
    pos += normal * strength;
  }

  vertices[idx] = Vertex(pos, glow, normal, 0.0);
}
`}),l=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:`storage`}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),u=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[l]}),compute:{module:c,entryPoint:`main`}}),d=B.createBindGroup({layout:l,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:r}}]}),f=B.createShaderModule({code:sn||`struct Camera {
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

  // HDR boost: rim and emission carry more punch since bloom captures their spillover.
  let composed = shadedColor + rimGlow * 2.5 + emission * 3.0;
  return vec4f(composed * 3.2, 1.0);
}
`}),p=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:`read-only-storage`}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:2,visibility:GPUShaderStage.VERTEX,buffer:{type:`uniform`}}]}),m=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:f,entryPoint:`vs_main`},fragment:{module:f,entryPoint:`fs_main`,targets:[{format:H}]},primitive:{topology:`triangle-list`,cullMode:`none`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!0,depthCompare:`less`},multisample:{count:U}}),h=[0,1].map(e=>B.createBindGroup({layout:p,entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:i,offset:e*j,size:A}},{binding:2,resource:{buffer:a}}]})),g={};return{compute(e){let t=D.parametric;o+=.016*D.fx.timeScale;let n=Math.max(t.p1Rate,t.p2Rate,t.p3Rate,t.p4Rate,t.twistRate);s+=.016*D.fx.timeScale*(n>0?1:0);let i=(e,t,n,r)=>e+(t-e)*(.5+.5*Math.sin(o*n+r)),a=i(t.p1Min,t.p1Max,t.p1Rate,0),c=i(t.p2Min,t.p2Max,t.p2Rate,Math.PI*.7),l=i(t.p3Min,t.p3Max,t.p3Rate,Math.PI*1.3),f=i(t.p4Min,t.p4Max,t.p4Rate,Math.PI*.4),p=i(t.twistMin,t.twistMax,t.twistRate,Math.PI*.9),m=D.mouse,h=new ArrayBuffer(64),g=new Uint32Array(h),_=new Float32Array(h);g[0]=256,g[1]=256,_[2]=t.scale,_[3]=p,_[4]=s,g[5]=te[t.shape]||0,_[6]=a,_[7]=c,_[8]=l,_[9]=f,_[10]=m.worldX,_[11]=m.worldY,_[12]=m.worldZ,_[13]=m.down?1:0,B.queue.writeBuffer(r,0,new Uint8Array(h));let v=e.beginComputePass();v.setPipeline(u),v.setBindGroup(0,d),v.dispatchWorkgroups(32,32),v.end()},render(t,r,o,c=0){let l=o?o[2]/o[3]:V.width/V.height;B.queue.writeBuffer(i,c*j,fe(l));let u=M.rotateX(M.rotateY(M.identity(),s*.1),s*.03);B.queue.writeBuffer(a,0,u);let d=t.beginRenderPass({colorAttachments:[le(g,r,o)],depthStencilAttachment:ue(g,o)}),f=de(o);f&&d.setViewport(f[0],f[1],f[2],f[3],0,1),xe(d,l,c),d.setPipeline(m),d.setBindGroup(0,h[c]),d.setIndexBuffer(n,`uint32`),d.drawIndexed(e),d.end()},getCount(){return`256×256 (${D.parametric.shape})`},destroy(){t.destroy(),n.destroy(),r.destroy(),i.destroy(),a.destroy()}}}function nt(){let e=D.reaction.resolution,t={size:[e,e,e],dimension:`3d`,format:`rgba16float`,usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST},n=B.createTexture(t),r=B.createTexture(t),i=new Uint16Array(e*e*e*4),a=e=>{let t=new Float32Array(1),n=new Int32Array(t.buffer);t[0]=e;let r=n[0],i=r>>16&32768,a=(r>>23&255)-112,o=r&8388607;return a<=0?i:a>=31?i|31744:i|a<<10|o>>13},o=a(1),s=a(0),c=a(.5);for(let t=0;t<e;t++)for(let n=0;n<e;n++)for(let r=0;r<e;r++){let a=(t*e*e+n*e+r)*4;i[a]=o,i[a+1]=s,i[a+2]=s,i[a+3]=s}let l=.3,u=.7;for(let t=0;t<80;t++){let t=Math.floor(e*(l+Math.random()*(u-l))),n=Math.floor(e*(l+Math.random()*(u-l))),r=Math.floor(e*(l+Math.random()*(u-l))),a=Math.random()<.5?1:2;for(let o=-a;o<=a;o++)for(let s=-a;s<=a;s++)for(let l=-a;l<=a;l++){if(l*l+s*s+o*o>a*a)continue;let u=t+l,d=n+s,f=r+o;if(u<0||d<0||f<0||u>=e||d>=e||f>=e)continue;let p=(f*e*e+d*e+u)*4;i[p]=c,i[p+1]=c}}B.queue.writeTexture({texture:n},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]),B.queue.writeTexture({texture:r},i.buffer,{bytesPerRow:e*8,rowsPerImage:e},[e,e,e]);let d=B.createShaderModule({code:cn||`// Gray-Scott reaction-diffusion on a 3D volume.
// State texture is rgba16float: r = u concentration, g = v concentration.
// 7-point Laplacian stencil, unconditional loads with clamped coords.
// [LAW:dataflow-not-control-flow] Same operations run every cell; boundaries
// are handled by clamping coords, not by branching.

struct Params {
  feed: f32,
  kill: f32,
  Du: f32,
  Dv: f32,
  dt: f32,
  N: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var uvIn: texture_3d<f32>;
@group(0) @binding(1) var uvOut: texture_storage_3d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: Params;

fn fetch(p: vec3<i32>, maxIdx: i32) -> vec2f {
  let c = clamp(p, vec3<i32>(0), vec3<i32>(maxIdx));
  return textureLoad(uvIn, c, 0).rg;
}

@compute @workgroup_size(8, 8, 4)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let N = i32(params.N);
  let maxIdx = N - 1;
  let ix = i32(gid.x);
  let iy = i32(gid.y);
  let iz = i32(gid.z);
  if (ix >= N || iy >= N || iz >= N) {
    return;
  }
  let p = vec3<i32>(ix, iy, iz);

  let c = fetch(p, maxIdx);
  let xm = fetch(p + vec3<i32>(-1,  0,  0), maxIdx);
  let xp = fetch(p + vec3<i32>( 1,  0,  0), maxIdx);
  let ym = fetch(p + vec3<i32>( 0, -1,  0), maxIdx);
  let yp = fetch(p + vec3<i32>( 0,  1,  0), maxIdx);
  let zm = fetch(p + vec3<i32>( 0,  0, -1), maxIdx);
  let zp = fetch(p + vec3<i32>( 0,  0,  1), maxIdx);

  // Unit-weight 7-point Laplacian: sum of neighbors minus 6× center, NO division.
  // The canonical Gray-Scott atlas values (Du≈0.2097, Dv≈0.105, feed/kill ≈ 0.05)
  // assume this form. Dividing by 6 effectively runs diffusion at 1/6 strength
  // and most presets visibly freeze because the reaction term can't compete.
  let lap = xm + xp + ym + yp + zm + zp - 6.0 * c;

  let u = c.r;
  let v = c.g;
  let uvv = u * v * v;
  let du = params.Du * lap.r - uvv + params.feed * (1.0 - u);
  let dv = params.Dv * lap.g + uvv - (params.feed + params.kill) * v;

  // dt of 1.0 is on the stability edge for Du=0.21 (limit ~1/6Du ≈ 0.79). A dt
  // of ~0.7 gives comfortable headroom; timeScale can push it higher if desired.
  var next = c + vec2f(du, dv) * params.dt;
  next = clamp(next, vec2f(0.0), vec2f(1.0));

  // [LAW:dataflow-not-control-flow] Dirichlet boundary condition on a smooth
  // band near the volume edge. Every cell blends toward (u=1, v=0) by an amount
  // that's zero in the interior and 1 at the outermost face. Patterns can never
  // escape the interior or reflect off the clamped-coord boundary, which was
  // what made them pile up against the "invisible cube".
  let fN = params.N;
  let fp = vec3f(f32(p.x), f32(p.y), f32(p.z));
  // Distance from the volume center, normalized so edge = 1.
  let r = max(abs(fp.x - (fN - 1.0) * 0.5),
          max(abs(fp.y - (fN - 1.0) * 0.5),
              abs(fp.z - (fN - 1.0) * 0.5))) / ((fN - 1.0) * 0.5);
  // Smoothstep from 0.80 (fully free interior) to 1.0 (fully clamped).
  let boundary = smoothstep(0.80, 1.0, r);
  let reservoir = vec2f(1.0, 0.0);
  next = mix(next, reservoir, boundary);

  textureStore(uvOut, p, vec4f(next, 0.0, 0.0));
}
`}),f=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:`write-only`,format:`rgba16float`,viewDimension:`3d`}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:`uniform`}}]}),p=B.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=B.createComputePipeline({layout:B.createPipelineLayout({bindGroupLayouts:[f]}),compute:{module:d,entryPoint:`main`}}),h=[B.createBindGroup({layout:f,entries:[{binding:0,resource:n.createView({dimension:`3d`})},{binding:1,resource:r.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]}),B.createBindGroup({layout:f,entries:[{binding:0,resource:r.createView({dimension:`3d`})},{binding:1,resource:n.createView({dimension:`3d`})},{binding:2,resource:{buffer:p}}]})],g=B.createShaderModule({code:ln||`// Raymarched volume render of the Gray-Scott v-field.
// Fullscreen triangle → per-pixel ray → march through a unit cube → isosurface on v.
// [LAW:dataflow-not-control-flow] Fixed step count. The march always runs the same
// number of iterations; hit detection is a value inside a vec4 accumulator.

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

struct RenderParams {
  N: f32,
  isoThreshold: f32,
  worldSize: f32,
  stepCount: f32,
}

@group(0) @binding(0) var volTex: texture_3d<f32>;
@group(0) @binding(1) var volSampler: sampler;
@group(0) @binding(2) var<uniform> camera: Camera;
@group(0) @binding(3) var<uniform> rparams: RenderParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) ndc: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  // Oversized triangle covering the viewport.
  var p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  var out: VSOut;
  out.pos = vec4f(p[vid], 0.0, 1.0);
  out.ndc = p[vid];
  return out;
}

// Slab intersection with the axis-aligned cube [-hs, hs]³.
fn intersectBox(ro: vec3f, rd: vec3f, hs: f32) -> vec2f {
  let invD = 1.0 / rd;
  let t0 = (vec3f(-hs) - ro) * invD;
  let t1 = (vec3f( hs) - ro) * invD;
  let tmin = min(t0, t1);
  let tmax = max(t0, t1);
  let tNear = max(max(tmin.x, tmin.y), tmin.z);
  let tFar  = min(min(tmax.x, tmax.y), tmax.z);
  return vec2f(tNear, tFar);
}

fn sampleV(worldPos: vec3f) -> f32 {
  let hs = rparams.worldSize * 0.5;
  let uvw = (worldPos + vec3f(hs)) / rparams.worldSize;
  return textureSampleLevel(volTex, volSampler, uvw, 0.0).g;
}

fn sampleU(worldPos: vec3f) -> f32 {
  let hs = rparams.worldSize * 0.5;
  let uvw = (worldPos + vec3f(hs)) / rparams.worldSize;
  return textureSampleLevel(volTex, volSampler, uvw, 0.0).r;
}

fn gradientV(p: vec3f) -> vec3f {
  let eps = rparams.worldSize / rparams.N;
  let dx = sampleV(p + vec3f(eps, 0.0, 0.0)) - sampleV(p - vec3f(eps, 0.0, 0.0));
  let dy = sampleV(p + vec3f(0.0, eps, 0.0)) - sampleV(p - vec3f(0.0, eps, 0.0));
  let dz = sampleV(p + vec3f(0.0, 0.0, eps)) - sampleV(p - vec3f(0.0, 0.0, eps));
  return vec3f(dx, dy, dz);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  // Build world-space ray from NDC via inverse(view)*inverse(proj).
  // Simpler: invert view * proj combined — but WGSL has no inverse().
  // Use eye + approximate direction from view matrix rows.
  // View matrix stores world→view; its first 3 rows give view-space basis in world coords.
  let invViewX = vec3f(camera.view[0][0], camera.view[1][0], camera.view[2][0]);
  let invViewY = vec3f(camera.view[0][1], camera.view[1][1], camera.view[2][1]);
  let invViewZ = vec3f(camera.view[0][2], camera.view[1][2], camera.view[2][2]);

  // Reconstruct a view-space direction from NDC using the projection matrix diagonals.
  // proj[0][0] = f/aspect, proj[1][1] = f. So viewDir.xy = ndc.xy * (1/proj[ii][ii]).
  let vx = in.ndc.x / camera.proj[0][0];
  let vy = in.ndc.y / camera.proj[1][1];
  let viewDir = normalize(vec3f(vx, vy, -1.0));
  // Rotate view dir into world space using inverse view rotation (transpose of upper 3x3).
  let rd = normalize(viewDir.x * invViewX + viewDir.y * invViewY + viewDir.z * invViewZ);
  let ro = camera.eye;

  let hs = rparams.worldSize * 0.5;
  let hit = intersectBox(ro, rd, hs);
  let tNear = max(hit.x, 0.0);
  let tFar  = hit.y;

  // Background = transparent (grid drawn underneath).
  if (tFar <= tNear) {
    return vec4f(0.0);
  }

  let steps = i32(rparams.stepCount);
  let tSpan = tFar - tNear;
  let dt = tSpan / f32(steps);
  let iso = rparams.isoThreshold;

  // [LAW:dataflow-not-control-flow] Per-pixel hash jitter on the start offset.
  // Without this, the fixed-stride march aligns to the voxel grid and produces
  // visible "ribs" that shift as the camera orbits. With jitter, the aliasing
  // becomes smooth noise that bloom/trails easily absorb.
  let jitter = fract(sin(dot(in.pos.xy, vec2f(12.9898, 78.233))) * 43758.5453);

  // Accumulator: rgb = premultiplied color, a = alpha.
  var accum = vec4f(0.0);
  var t = tNear + dt * jitter;

  for (var i = 0; i < 512; i = i + 1) {
    if (i >= steps) { break; }
    let p = ro + rd * t;
    let v = sampleV(p);
    let u = sampleU(p);

    // [LAW:dataflow-not-control-flow] Spherical alpha falloff so no visible cube.
    // Every sample multiplies by a radial mask that is 1 in the interior and 0
    // outside — there's no "cube edge", only a soft sphere of visibility.
    // Center of the cube is the origin; half-size = worldSize/2.
    let rel = length(p) / (rparams.worldSize * 0.5);
    let cubeFade = 1.0 - smoothstep(0.78, 0.95, rel);

    // Soft density: wider band than before so sub-texel surfaces don't pop.
    let soft = smoothstep(iso - 0.08, iso + 0.08, v) * cubeFade;
    // Thickness along this step → alpha. Scaled so doubling step count
    // yields roughly the same total opacity through a region.
    let alpha = 1.0 - exp(-soft * 10.0 * dt);

    // Shading: gradient-based normal, Phong with theme colors.
    let grad = gradientV(p);
    let gl = length(grad);
    let n = select(vec3f(0.0, 1.0, 0.0), -grad / max(gl, 1e-5), gl > 1e-5);
    let lightDir = normalize(vec3f(0.6, 0.8, 0.4));
    let diffuse = max(dot(n, lightDir), 0.0);
    let viewDirW = normalize(camera.eye - p);
    let rim = pow(1.0 - max(dot(n, viewDirW), 0.0), 2.5);
    let spec = pow(max(dot(n, normalize(lightDir + viewDirW)), 0.0), 24.0);

    // Color: mix primary↔secondary by u (the substrate), add accent on rim.
    let baseMix = clamp(u, 0.0, 1.0);
    let base = mix(camera.primary, camera.secondary, baseMix);
    let lit = base * (0.18 + diffuse * 0.82) + camera.accent * rim * 0.35 + vec3f(1.0) * spec * 0.25;

    // Front-to-back compositing.
    let src = vec4f(lit * alpha, alpha);
    accum = accum + (1.0 - accum.a) * src;

    if (accum.a > 0.98) { break; }
    t = t + dt;
  }

  return accum;
}
`}),_=B.createSampler({magFilter:`linear`,minFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`,addressModeW:`clamp-to-edge`}),v=B.createBuffer({size:j*2,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),y=B.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),b=B.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:`float`,viewDimension:`3d`}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:`filtering`}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:`uniform`}}]}),x=B.createRenderPipeline({layout:B.createPipelineLayout({bindGroupLayouts:[b]}),vertex:{module:g,entryPoint:`vs_main`},fragment:{module:g,entryPoint:`fs_main`,targets:[{format:H,blend:{color:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`},alpha:{srcFactor:`one`,dstFactor:`one-minus-src-alpha`,operation:`add`}}}]},primitive:{topology:`triangle-list`},depthStencil:{format:`depth24plus`,depthWriteEnabled:!1,depthCompare:`less`},multisample:{count:U}}),S=[0,1].map(e=>[0,1].map(t=>B.createBindGroup({layout:b,entries:[{binding:0,resource:(t===0?n:r).createView({dimension:`3d`})},{binding:1,resource:_},{binding:2,resource:{buffer:v,offset:e*j,size:A}},{binding:3,resource:{buffer:y}}]}))),C=Math.ceil(e/8),w=Math.ceil(e/8),T=Math.ceil(e/4),E={},O=0;return{compute(t){let n=D.reaction,r=Math.max(1,Math.floor(n.stepsPerFrame)),i=Math.max(0,D.fx.timeScale),a=Math.max(0,Math.round(r*i));B.queue.writeBuffer(p,0,new Float32Array([n.feed,n.kill,n.Du,n.Dv,.65,e,0,0]));for(let e=0;e<a;e++){let e=t.beginComputePass();e.setPipeline(m),e.setBindGroup(0,h[O]),e.dispatchWorkgroups(C,w,T),e.end(),O=1-O}},render(t,n,r,i=0){let a=r?r[2]/r[3]:V.width/V.height;B.queue.writeBuffer(v,i*j,fe(a)),B.queue.writeBuffer(y,0,new Float32Array([e,D.reaction.isoThreshold,3,256]));let o=t.beginRenderPass({colorAttachments:[le(E,n,r)],depthStencilAttachment:ue(E,r)}),s=de(r);s&&o.setViewport(s[0],s[1],s[2],s[3],0,1),xe(o,a,i),o.setPipeline(x),o.setBindGroup(0,S[i][1-O]),o.draw(3),o.end()},getCount(){return`${e}³`},destroy(){n.destroy(),r.destroy(),p.destroy(),v.destroy(),y.destroy()}}}var rt=[{key:`timeScale`,label:`Time`,min:-2,max:2,step:.05},{key:`bloomIntensity`,label:`Bloom`,min:0,max:4,step:.01},{key:`bloomThreshold`,label:`Threshold`,min:0,max:8,step:.01},{key:`bloomRadius`,label:`Bloom Radius`,min:.5,max:2,step:.01},{key:`trailPersistence`,label:`Trails`,min:0,max:.995,step:.001},{key:`exposure`,label:`Exposure`,min:.2,max:4,step:.01},{key:`vignette`,label:`Vignette`,min:0,max:1.5,step:.01},{key:`chromaticAberration`,label:`Chromatic`,min:0,max:2,step:.01},{key:`grading`,label:`Color Grade`,min:0,max:1.5,step:.01}];function it(e){let t=document.createElement(`div`);t.className=`param-section`;let n=document.createElement(`div`);n.className=`param-section-title`,n.textContent=`Visual FX`,t.appendChild(n);for(let e of rt){let n=document.createElement(`div`);n.className=`control-row`;let r=document.createElement(`span`);r.className=`control-label`,r.textContent=e.label,n.appendChild(r);let i=document.createElement(`input`);i.type=`range`,i.min=String(e.min),i.max=String(e.max),i.step=String(e.step),i.value=String(D.fx[e.key]);let a=document.createElement(`span`);a.className=`control-value`,a.textContent=lt(D.fx[e.key],e.step),i.addEventListener(`input`,()=>{let t=Number(i.value);D.fx[e.key]=t,a.textContent=lt(t,e.step),Un()}),n.appendChild(i),n.appendChild(a),t.appendChild(n)}e.appendChild(t)}function at(){for(let[e,t]of Object.entries(u)){let n=e,r=document.getElementById(`params-${n}`),i=document.createElement(`div`);i.className=`presets`;for(let e of Object.keys(l[n])){let t=document.createElement(`button`);t.className=`preset-btn`+(e===`Default`?` active`:``),t.textContent=e,t.dataset.preset=e,t.dataset.mode=n,t.addEventListener(`click`,()=>ut(n,e)),i.appendChild(t)}r.appendChild(i);for(let e of t){let t=document.createElement(`div`);t.className=`param-section`;let i=document.createElement(`div`);if(i.className=`param-section-title`,i.textContent=e.section,t.appendChild(i),e.dynamic){t.id=e.id??``,r.appendChild(t);continue}for(let r of e.params)ot(t,n,r);r.appendChild(t)}it(r)}}function ot(e,t,n){let r=document.createElement(`div`);r.className=`control-row`;let i=document.createElement(`span`);if(i.className=`control-label`,i.textContent=n.label,r.appendChild(i),n.type===`dropdown`){let e=document.createElement(`select`);e.dataset.mode=t,e.dataset.key=n.key;for(let t of n.options??[]){let n=document.createElement(`option`);n.value=String(t),n.textContent=String(t),e.appendChild(n)}e.value=String(E(t)[n.key]),e.addEventListener(`change`,()=>{let r=Number.isNaN(Number(e.value))?e.value:Number(e.value);E(t)[n.key]=r,n.requiresReset&&Fn(),n.key===`shape`&&(st(String(r)),ct()),Pt()}),r.appendChild(e)}else{let e=document.createElement(`input`);e.type=`range`,e.min=String(n.min),e.max=String(n.max),e.step=String(n.step),e.value=String(E(t)[n.key]),e.dataset.mode=t,e.dataset.key=n.key;let i=document.createElement(`span`);i.className=`control-value`,i.textContent=lt(Number(E(t)[n.key]),n.step??1),e.addEventListener(`input`,()=>{let r=Number(e.value);E(t)[n.key]=r,i.textContent=lt(r,n.step??1),n.requiresReset&&(e.dataset.needsReset=`1`),Pt()}),e.addEventListener(`change`,()=>{e.dataset.needsReset===`1`&&(e.dataset.needsReset=`0`,Fn())}),r.appendChild(e),r.appendChild(i)}return e.appendChild(r),r}function st(e){let t=ne[e]??{},n=D.parametric;t.p1?(n.p1Min=t.p1.animMin,n.p1Max=t.p1.animMax,n.p1Rate=t.p1.animRate):(n.p1Min=0,n.p1Max=0,n.p1Rate=0),t.p2?(n.p2Min=t.p2.animMin,n.p2Max=t.p2.animMax,n.p2Rate=t.p2.animRate):(n.p2Min=0,n.p2Max=0,n.p2Rate=0)}function ct(){let e=document.getElementById(`shape-params-section`);if(!e)return;for(;e.children.length>1;)e.removeChild(e.lastChild);let t=ne[D.parametric.shape]??{};for(let[n,r]of Object.entries(t)){let t=document.createElement(`div`);t.className=`anim-param-label`,t.textContent=r.label,e.appendChild(t),ot(e,`parametric`,{key:`${n}Min`,label:`Min`,min:r.min,max:r.max,step:r.step}),ot(e,`parametric`,{key:`${n}Max`,label:`Max`,min:r.min,max:r.max,step:r.step}),ot(e,`parametric`,{key:`${n}Rate`,label:`Rate`,min:0,max:3,step:.05})}}function lt(e,t){if(t>=1)return String(Math.round(e));let n=Math.max(0,-Math.floor(Math.log10(t)));return e.toFixed(n)}function ut(e,t){let n=l[e][t];Object.assign(E(e),n);let r=document.getElementById(`params-${e}`);r.querySelectorAll(`input[type="range"]`).forEach(t=>{let r=t.dataset.key;if(r in n){t.value=String(n[r]);let i=t.parentElement?.querySelector(`.control-value`);if(i){let t=dt(e,r);i.textContent=lt(Number(n[r]),t?t.step??1:1)}}}),r.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t in n&&(e.value=String(n[t]))}),r.querySelectorAll(`.preset-btn`).forEach(e=>{e.classList.toggle(`active`,e.dataset.preset===t)}),e===`parametric`&&ct(),Fn(),Pt()}function dt(e,t){for(let n of u[e])for(let e of n.params)if(e.key===t)return e;return null}var ft={boids:`Boids`,physics:`N-Body`,physics_classic:`N-Body Classic`,fluid:`Fluid`,parametric:`Shapes`,reaction:`Reaction`};function pt(e){D.mode=e,document.querySelectorAll(`.mode-tab`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e)),document.querySelectorAll(`.param-group`).forEach(t=>t.classList.toggle(`active`,t.dataset.mode===e));let t=document.getElementById(`mode-stepper-label`);t&&(t.textContent=ft[e]),Pn(),Pt()}function mt(){document.querySelectorAll(`.mode-tab`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.mode;pt(t)})})}function ht(){document.getElementById(`btn-pause`).addEventListener(`click`,()=>{D.paused=!D.paused,document.getElementById(`btn-pause`).textContent=D.paused?`Resume`:`Pause`,document.getElementById(`btn-pause`).classList.toggle(`active`,D.paused)}),document.getElementById(`btn-reset`).addEventListener(`click`,()=>{Fn()}),document.getElementById(`copy-btn`).addEventListener(`click`,()=>{let e=document.getElementById(`prompt-text`).textContent??``;navigator.clipboard.writeText(e).then(()=>{let e=document.getElementById(`copy-btn`);e.textContent=`Copied!`,setTimeout(()=>{e.textContent=`Copy`},1500)})}),document.getElementById(`btn-reset-all`).addEventListener(`click`,()=>{localStorage.removeItem(Hn),location.reload()}),Dn()}function gt(){let e=document.getElementById(`theme-presets`);for(let t of Object.keys(d)){let n=d[t],r=document.createElement(`button`);r.className=`preset-btn`+(t===D.colorTheme?` active`:``),r.textContent=t,r.dataset.theme=t,r.style.borderLeftWidth=`3px`,r.style.borderLeftColor=n.primary,r.addEventListener(`click`,()=>{D.colorTheme!==t&&(D.colorTheme=t,T(t),e.querySelectorAll(`.preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===t)),Pt())}),e.appendChild(r)}}function _t(){let e=D.camera,t=Math.cos(e.rotX),n=Math.sin(e.rotX),r=Math.cos(e.rotY),i=Math.sin(e.rotY),a=[e.distance*t*i,e.distance*n,e.distance*t*r],o=N(re([0,0,0],a)),s=N(P(o,[0,1,0]));return{eye:a,forward:o,right:s,up:P(s,o)}}function vt(e,t){let n=D.camera.fov*Math.PI/180,r=V.width/V.height,{eye:i,forward:a,right:o,up:s}=_t(),c=Math.tan(n*.5),l=(e*2-1)*c*r,u=(t*2-1)*c;return{eye:i,dir:N([a[0]+o[0]*l+s[0]*u,a[1]+o[1]*l+s[1]*u,a[2]+o[2]*l+s[2]*u])}}function yt(e,t){let{dir:n}=vt(e,t),r=D.camera.distance*.5;return[n[0]*r,n[1]*r,n[2]*r]}function bt(e,t){let{eye:n,dir:r}=vt(e,t);if(Math.abs(r[1])<1e-4)return null;let i=-n[1]/r[1];if(i<0)return null;let a=n[0]+r[0]*i,o=n[2]+r[2]*i,s=k*.5;return Math.abs(a)>s||Math.abs(o)>s?null:[(a+s)/k,(o+s)/k]}function xt(e){let t=k*.5;return Math.abs(e[0])>t||Math.abs(e[2])>t?null:[(e[0]+t)/k,(e[2]+t)/k]}function St(e,t,n){if(Math.abs(t[1])<1e-4)return null;let r=(n-e[1])/t[1];return r<0?null:[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function Ct(e,t){let n=ie(t,t)||1,r=Math.max(0,-ie(e,t)/n);return[e[0]+t[0]*r,e[1]+t[1]*r,e[2]+t[2]*r]}function Y(){D.mouse.down=!1,D.mouse.dx=0,D.mouse.dy=0}function wt(){let e=V,t=!1,n=!1;e.addEventListener(`pointerdown`,r=>{if(D.xrEnabled)return;t=!0,n=!(r.ctrlKey||r.metaKey);let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(D.mouse.dx=0,D.mouse.dy=0,n)if(D.mode===`fluid`){let e=bt(a,o);if(!e)Y();else{D.mouse.down=!0;let t=yt(a,o);D.mouse.worldX=t[0],D.mouse.worldY=t[1],D.mouse.worldZ=t[2],D.mouse.x=e[0],D.mouse.y=e[1]}}else{D.mouse.down=!0;let e=yt(a,o);D.mouse.worldX=e[0],D.mouse.worldY=e[1],D.mouse.worldZ=e[2],D.mouse.x=a,D.mouse.y=o}else D.mouse.x=a,D.mouse.y=o;r.preventDefault()}),e.addEventListener(`pointermove`,r=>{if(D.xrEnabled||!t)return;let i=e.getBoundingClientRect(),a=(r.clientX-i.left)/i.width,o=1-(r.clientY-i.top)/i.height;if(n)if(D.mode===`fluid`){let e=bt(a,o);if(!e)Y();else{D.mouse.down=!0;let t=yt(a,o);D.mouse.worldX=t[0],D.mouse.worldY=t[1],D.mouse.worldZ=t[2],D.mouse.dx=(e[0]-D.mouse.x)*10,D.mouse.dy=(e[1]-D.mouse.y)*10,D.mouse.x=e[0],D.mouse.y=e[1]}}else{D.mouse.down=!0;let e=yt(a,o);D.mouse.worldX=e[0],D.mouse.worldY=e[1],D.mouse.worldZ=e[2],D.mouse.dx=(a-D.mouse.x)*10,D.mouse.dy=(o-D.mouse.y)*10,D.mouse.x=a,D.mouse.y=o}else D.camera.rotY+=r.movementX*.005,D.camera.rotX+=r.movementY*.005,D.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,D.camera.rotX)),D.mouse.down=!1}),e.addEventListener(`pointerup`,()=>{D.xrEnabled||(t=!1,n=!1,D.mouse.down=!1,D.mouse.dx=0,D.mouse.dy=0)}),e.addEventListener(`contextmenu`,e=>e.preventDefault()),e.addEventListener(`wheel`,e=>{D.xrEnabled||(D.camera.distance*=1+e.deltaY*.001,D.camera.distance=Math.max(.5,Math.min(50,D.camera.distance)),e.preventDefault())},{passive:!1})}var Tt=matchMedia(`(max-width: 768px)`),Et=Tt.matches;function Dt(){let e=V,t=new Map,n=0,r=0,i=0;function a(e,t,n){if(D.mode===`fluid`){let r=bt(e,t);if(!r)Y();else{D.mouse.down=!0;let i=yt(e,t);D.mouse.worldX=i[0],D.mouse.worldY=i[1],D.mouse.worldZ=i[2],D.mouse.dx=n?(r[0]-D.mouse.x)*10:0,D.mouse.dy=n?(r[1]-D.mouse.y)*10:0,D.mouse.x=r[0],D.mouse.y=r[1]}}else{D.mouse.down=!0;let r=yt(e,t);D.mouse.worldX=r[0],D.mouse.worldY=r[1],D.mouse.worldZ=r[2],D.mouse.dx=n?(e-D.mouse.x)*10:0,D.mouse.dy=n?(t-D.mouse.y)*10:0,D.mouse.x=e,D.mouse.y=t}}e.addEventListener(`pointerdown`,o=>{if(!D.xrEnabled){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect(),n=(o.clientX-t.left)/t.width,r=1-(o.clientY-t.top)/t.height;D.mouse.dx=0,D.mouse.dy=0,a(n,r,!1)}if(t.size===2){Y();let e=[...t.values()];r=(e[0].x+e[1].x)/2,i=(e[0].y+e[1].y)/2,n=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y)}}},{passive:!1}),e.addEventListener(`pointermove`,o=>{if(!D.xrEnabled&&t.has(o.pointerId)){if(o.preventDefault(),t.set(o.pointerId,{x:o.clientX,y:o.clientY}),t.size===1){let t=e.getBoundingClientRect();a((o.clientX-t.left)/t.width,1-(o.clientY-t.top)/t.height,!0)}else if(t.size===2){let e=[...t.values()],a=(e[0].x+e[1].x)/2,o=(e[0].y+e[1].y)/2,s=Math.hypot(e[0].x-e[1].x,e[0].y-e[1].y);D.camera.rotY+=(a-r)*.005,D.camera.rotX+=(o-i)*.005,D.camera.rotX=Math.max(-Math.PI*.45,Math.min(Math.PI*.45,D.camera.rotX)),n>0&&(D.camera.distance*=n/s,D.camera.distance=Math.max(.5,Math.min(50,D.camera.distance))),r=a,i=o,n=s,D.mouse.down=!1}}},{passive:!1});let o=r=>{if(t.delete(r.pointerId),t.size===0&&(D.mouse.down=!1,D.mouse.dx=0,D.mouse.dy=0,n=0),t.size===1){let[n]=t.values(),r=e.getBoundingClientRect(),i=(n.x-r.left)/r.width,o=1-(n.y-r.top)/r.height;D.mouse.dx=0,D.mouse.dy=0,a(i,o,!1)}};e.addEventListener(`pointerup`,o),e.addEventListener(`pointercancel`,o),e.addEventListener(`contextmenu`,e=>e.preventDefault())}function Ot(){document.getElementById(`fab-pause`).addEventListener(`click`,()=>{D.paused=!D.paused,document.getElementById(`fab-pause`).textContent=D.paused?`▶`:`⏸`,document.getElementById(`fab-pause`).classList.toggle(`active`,D.paused),document.getElementById(`btn-pause`).textContent=D.paused?`Resume`:`Pause`,document.getElementById(`btn-pause`).classList.toggle(`active`,D.paused)}),document.getElementById(`fab-reset`).addEventListener(`click`,()=>{Fn()});let e=e=>{let t=hn[(hn.indexOf(D.mode)+e+hn.length)%hn.length];pt(t)};document.getElementById(`mode-prev`).addEventListener(`click`,()=>e(-1)),document.getElementById(`mode-next`).addEventListener(`click`,()=>e(1)),document.getElementById(`mode-stepper-label`).textContent=ft[D.mode]}function kt(){let e=document.getElementById(`controls`),t=0,n=0,r=!1;e.addEventListener(`touchstart`,i=>{t=i.touches[0].clientY,n=e.scrollTop,r=!e.classList.contains(`mobile-expanded`)||n<=0},{passive:!0}),e.addEventListener(`touchmove`,i=>{if(!r)return;let a=i.touches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);!o&&a<0&&i.preventDefault(),o&&n<=0&&a>0&&i.preventDefault()},{passive:!1}),e.addEventListener(`touchend`,i=>{if(!r)return;r=!1;let a=i.changedTouches[0].clientY-t,o=e.classList.contains(`mobile-expanded`);if(!o&&a<-30)e.classList.add(`mobile-expanded`);else if(o&&n<=0&&a>30)e.classList.remove(`mobile-expanded`);else if(Math.abs(a)<10){let t=e.querySelector(`.mobile-drag-handle`).getBoundingClientRect();i.changedTouches[0].clientY>=t.top&&i.changedTouches[0].clientY<=t.bottom&&e.classList.toggle(`mobile-expanded`)}}),V.addEventListener(`pointerdown`,()=>{e.classList.remove(`mobile-expanded`)},{capture:!0})}function At(){localStorage.getItem(Hn)||(D.boids.count=500,D.physics.count=2e3,D.physics_classic.count=200,D.reaction.resolution=64)}var jt={boids:`boids/flocking`,physics:`N-body gravitational`,physics_classic:`classic N-body (vintage shader)`,fluid:`fluid dynamics`,parametric:`parametric shape`,reaction:`Gray-Scott reaction-diffusion (3D)`};function Mt(){let e=D.mode,t=E(e),n=c[e],r=[];for(let[i,a]of Object.entries(t))a!==n[i]&&r.push(Nt(e,i,a));let i=`WebGPU ${jt[e]} simulation`;D.colorTheme!==`Dracula`&&(i+=` (${D.colorTheme} theme)`),r.length>0&&(i+=` with ${r.filter(Boolean).join(`, `)}`),i+=`.`,document.getElementById(`prompt-text`).textContent=i}function Nt(e,t,n){let r=Number(n),i={count:()=>`${n} particles`,separationRadius:()=>r<15?`tight separation (${n})`:r>50?`wide separation (${n})`:`separation radius ${n}`,alignmentRadius:()=>`alignment range ${n}`,cohesionRadius:()=>r>80?`strong cohesion (${n})`:`cohesion range ${n}`,maxSpeed:()=>r>4?`high speed (${n})`:r<1?`slow movement (${n})`:`speed ${n}`,maxForce:()=>r>.1?`strong steering (${n})`:`steering force ${n}`,visualRange:()=>`visual range ${n}`,G:()=>r>5?`strong gravity (G=${n})`:r<.5?`weak gravity (G=${n})`:`G=${n}`,softening:()=>`softening ${n}`,damping:()=>r<.995?`high damping (${n})`:`damping ${n}`,coreOrbit:()=>r<.1?`minimal core friction (${n})`:r>.8?`strong core friction (${n})`:`core friction ${n}`,distribution:()=>`${n} distribution`,resolution:()=>`${n}x${n} grid`,viscosity:()=>r>.5?`thick fluid (viscosity ${n})`:r<.05?`thin fluid (viscosity ${n})`:`viscosity ${n}`,diffusionRate:()=>`diffusion ${n}`,forceStrength:()=>r>200?`strong forces (${n})`:`force strength ${n}`,volumeScale:()=>r>2?`large volume (${n})`:r<1?`compact volume (${n})`:`volume scale ${n}`,dyeMode:()=>`${n} dye`,jacobiIterations:()=>`${n} solver iterations`,shape:()=>`${n} shape`,scale:()=>r===1?null:`scale ${n}`,p1Min:()=>null,p1Max:()=>null,p1Rate:()=>null,p2Min:()=>null,p2Max:()=>null,p2Rate:()=>null,p3Min:()=>null,p3Max:()=>null,p3Rate:()=>null,p4Min:()=>null,p4Max:()=>null,p4Rate:()=>null,twistMin:()=>null,twistMax:()=>null,twistRate:()=>null}[t];return i?i():`${t}: ${n}`}function Pt(){Mt(),In(),Ut(),Un()}function Ft(e){return{boids:{"Compute (Flocking)":`struct Particle {
  pos: vec3f,
  vel: vec3f,
}

struct SimParams {
  dt: f32,
  separationRadius: f32,
  alignmentRadius: f32,
  cohesionRadius: f32,
  maxSpeed: f32,
  maxForce: f32,
  visualRange: f32,
  count: u32,
  boundSize: f32,
  attractorX: f32,
  attractorY: f32,
  attractorZ: f32,
  attractorActive: f32,
}

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> params: SimParams;

fn limit(v: vec3f, maxLen: f32) -> vec3f {
  let len2 = dot(v, v);
  if (len2 > maxLen * maxLen) {
    return normalize(v) * maxLen;
  }
  return v;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = particlesIn[idx];
  var separation = vec3f(0.0);
  var alignment = vec3f(0.0);
  var cohesion = vec3f(0.0);
  var sepCount = 0u;
  var aliCount = 0u;
  var cohCount = 0u;

  for (var i = 0u; i < params.count; i++) {
    if (i == idx) { continue; }
    let other = particlesIn[i];
    let diff = me.pos - other.pos;
    let dist = length(diff);

    if (dist < params.separationRadius && dist > 0.0) {
      separation += diff / dist;
      sepCount++;
    }
    if (dist < params.alignmentRadius) {
      alignment += other.vel;
      aliCount++;
    }
    if (dist < params.cohesionRadius) {
      cohesion += other.pos;
      cohCount++;
    }
  }

  var force = vec3f(0.0);

  if (sepCount > 0u) {
    separation = separation / f32(sepCount);
    if (length(separation) > 0.0) {
      separation = normalize(separation) * params.maxSpeed - me.vel;
      force += limit(separation, params.maxForce) * 1.5;
    }
  }
  if (aliCount > 0u) {
    alignment = alignment / f32(aliCount);
    if (length(alignment) > 0.0) {
      alignment = normalize(alignment) * params.maxSpeed - me.vel;
      force += limit(alignment, params.maxForce);
    }
  }
  if (cohCount > 0u) {
    cohesion = cohesion / f32(cohCount) - me.pos;
    if (length(cohesion) > 0.0) {
      cohesion = normalize(cohesion) * params.maxSpeed - me.vel;
      force += limit(cohesion, params.maxForce);
    }
  }

  // [LAW:dataflow-not-control-flow] Vortex well attractor — always computed, attractorActive scales to zero when inactive.
  // Three forces create orbital behavior: radial pull, core repulsion, tangential swirl.
  let attractorPos = vec3f(params.attractorX, params.attractorY, params.attractorZ);
  let toAttractor = attractorPos - me.pos;
  let aDist = length(toAttractor) + 0.0001; // epsilon avoids division by zero
  let aDir = toAttractor / aDist;

  // Tuning constants — relative to maxForce so behavior scales across presets
  let mf = params.maxForce;
  const ATTRACT_SCALE = 3.0;       // gravity well depth (multiples of maxForce at softening distance)
  const ATTRACT_SOFTENING = 0.3;   // prevents singularity in gravity calc
  const CORE_RADIUS = 0.25;        // repulsion shell radius
  const CORE_PRESSURE_SCALE = 8.0; // core push strength (multiples of maxForce)
  const SWIRL_SCALE = 2.4;         // tangential orbit strength (multiples of maxForce)
  const SWIRL_PEAK_RADIUS = 0.4;   // where swirl is strongest
  const SWIRL_FALLOFF = 0.8;       // gaussian width of swirl envelope
  const INFLUENCE_RADIUS = 2.5;    // beyond this, attractor fades to zero

  // 1. Radial pull: inverse-distance with softening
  let radialPull = mf * ATTRACT_SCALE / (aDist + ATTRACT_SOFTENING);

  // 2. Core repulsion: linear ramp inside core radius prevents singularity
  let coreRepulsion = max(0.0, CORE_RADIUS - aDist) / CORE_RADIUS * mf * CORE_PRESSURE_SCALE;

  // 3. Net radial force = pull inward minus push outward
  let radialForce = aDir * (radialPull - coreRepulsion);

  // 4. Tangential swirl: cross with world-up for orbit direction
  let worldUp = vec3f(0.0, 1.0, 0.0);
  let worldX = vec3f(1.0, 0.0, 0.0);
  let swirlAxis = select(worldUp, worldX, abs(dot(aDir, worldUp)) > 0.95);
  let tangent = normalize(cross(aDir, swirlAxis));
  // Gaussian peak near orbit shell, fading with distance
  let swirlEnvelope = exp(-((aDist - SWIRL_PEAK_RADIUS) * (aDist - SWIRL_PEAK_RADIUS)) / (SWIRL_FALLOFF * SWIRL_FALLOFF));
  let swirlForce = tangent * mf * SWIRL_SCALE * swirlEnvelope;

  // 5. Influence envelope: smooth fadeout so distant boids keep flocking naturally
  let influenceFade = 1.0 - smoothstep(INFLUENCE_RADIUS * 0.5, INFLUENCE_RADIUS, aDist);

  // 6. Combine — attractorActive is 0.0 (inactive) or 1.0 (active)
  force += (radialForce + swirlForce) * influenceFade * params.attractorActive;

  // Boundary force - soft repulsion from edges
  let bs = params.boundSize;
  let margin = bs * 0.1;
  var boundary = vec3f(0.0);
  if (me.pos.x < -bs + margin) { boundary.x = params.maxForce; }
  if (me.pos.x >  bs - margin) { boundary.x = -params.maxForce; }
  if (me.pos.y < -bs + margin) { boundary.y = params.maxForce; }
  if (me.pos.y >  bs - margin) { boundary.y = -params.maxForce; }
  if (me.pos.z < -bs + margin) { boundary.z = params.maxForce; }
  if (me.pos.z >  bs - margin) { boundary.z = -params.maxForce; }
  force += boundary * 2.0;

  var vel = me.vel + force;
  vel = limit(vel, params.maxSpeed);
  let pos = me.pos + vel * params.dt;

  particlesOut[idx] = Particle(pos, vel);
}
`,"Render (Vert+Frag)":`struct Camera {
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

struct Particle {
  pos: vec3f,
  vel: vec3f,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> camera: Camera;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let p = particles[iid];
  let speed = length(p.vel);
  let dir = select(vec3f(0.0, 1.0, 0.0), normalize(p.vel), speed > 0.001);

  // Build a basis from velocity direction
  let up = select(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), abs(dir.z) < 0.99);
  let right = normalize(cross(dir, up));
  let realUp = cross(right, dir);

  // [LAW:dataflow-not-control-flow] Constant-pixel-size triangle: scale local offsets by view-space depth so the
  // perspective divide produces a fixed NDC offset. Boids stay tight darts regardless of camera distance.
  let viewPos = camera.view * vec4f(p.pos, 1.0);
  let depth = max(abs(viewPos.z), 0.05);
  let size = 0.0035 * depth;
  var localPos: vec3f;
  switch (vid) {
    case 0u: { localPos = dir * size * 2.0; }            // tip
    case 1u: { localPos = -dir * size + right * size; }  // left
    case 2u: { localPos = -dir * size - right * size; }  // right
    default: { localPos = vec3f(0.0); }
  }

  let worldPos = p.pos + localPos;
  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);

  // Color by speed: primary (slow) → accent (fast); fast boids shift toward white-hot.
  let t = clamp(speed / 4.0, 0.0, 1.0);
  let base = mix(camera.primary, camera.accent, t);
  out.color = mix(base, vec3f(1.0), t * 0.45);
  return out;
}

@fragment
fn fs_main(@location(0) color: vec3f) -> @location(0) vec4f {
  // HDR boost: triangles are tiny, so a flat ~5x multiplier reads through bloom as luminous flecks.
  return vec4f(color * 5.0, 1.0);
}
`},physics:{"Compute (Gravity)":`struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  sourceCount: u32,
  coreOrbit: f32,
  time: f32,
  targetX: f32,
  targetY: f32,
  targetZ: f32,
  interactionActive: f32,
  // [LAW:one-source-of-truth] Disk-recovery state lives in the same Params block so the CPU sends one coherent snapshot per frame.
  diskNormal: vec3f,
  _pad4: f32,
  diskVertDamp: f32,
  diskRadDamp: f32,
  diskTangGain: f32,
  diskVertSpring: f32,
  diskAlignGain: f32,
  interactionStrength: f32,
  diskTangSpeed: f32,
  tidalStrength: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

// [LAW:one-source-of-truth] Long-run N-body stability thresholds are owned here so containment and anti-collapse stay coherent.
const N_BODY_OUTER_RADIUS = 8.0;
const N_BODY_BOUNDARY_PULL = 0.006;
const INTERACTION_WELL_STRENGTH = 12.0;
const INTERACTION_WELL_SOFTENING = 0.25;
const INTERACTION_CORE_RADIUS = 0.3;
const INTERACTION_CORE_PRESSURE = 16.0;
const HOME_WELL_STRENGTH = 0.0;
const HOME_WELL_SOFTENING = 1.8;
const HOME_CORE_RADIUS = 0.0;
const HOME_CORE_PRESSURE = 0.0;
const HOME_RESTORE_STIFFNESS_ACTIVE = 0.14;
const HOME_RESTORE_DAMPING_ACTIVE = 0.18;
const INTERACTION_DRAG_GAIN = 0.6;
const HOME_ANCHOR_WELL_RADIUS = 5.0;
const HOME_ANCHOR_FADE_RADIUS = 7.0;
const HOME_REENTRY_KICK = 0.04;
const HOME_REENTRY_DAMPING = 0.02;
const CORE_FRICTION_RADIUS = 0.8;
const CORE_FRICTION_INNER_RADIUS = 0.1;
const CORE_FRICTION_SPEED_START = 1.5;
const CORE_FRICTION_GAIN = 1.2;

// Shared memory tile for source bodies — only pos + mass needed for force computation.
// [LAW:one-source-of-truth] TILE_SIZE matches @workgroup_size so every thread loads exactly one body per tile.
const TILE_SIZE = 256u;
var<workgroup> tile: array<vec4f, TILE_SIZE>;

@compute @workgroup_size(TILE_SIZE)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let idx = gid.x;
  // [LAW:dataflow-not-control-flow] All threads participate in barriers; the alive flag gates writes only.
  let alive = idx < params.count;

  let me = bodiesIn[min(idx, params.count - 1u)];
  var acc = vec3f(0.0);

  let softeningSq = params.softening * params.softening;
  let G = params.G;
  let numTiles = (params.sourceCount + TILE_SIZE - 1u) / TILE_SIZE;
  let myPos = me.pos;

  for (var t = 0u; t < numTiles; t++) {
    let loadIdx = t * TILE_SIZE + lid.x;
    tile[lid.x] = select(
      vec4f(0.0),
      vec4f(bodiesIn[min(loadIdx, params.sourceCount - 1u)].pos, bodiesIn[min(loadIdx, params.sourceCount - 1u)].mass),
      loadIdx < params.sourceCount
    );
    workgroupBarrier();

    // Tight inner loop: gravity only. Self-interaction produces zero force via softening (no branch needed).
    let tileEnd = min(TILE_SIZE, params.sourceCount - t * TILE_SIZE);
    for (var j = 0u; j < tileEnd; j++) {
      let other = tile[j];
      let diff = other.xyz - myPos;
      let dist2 = dot(diff, diff) + softeningSq;
      let inv = inverseSqrt(dist2);
      acc += diff * (G * other.w * inv * inv * inv);
    }
    workgroupBarrier();
  }

  let targetPos = vec3f(params.targetX, params.targetY, params.targetZ);
  let interactionOn = params.interactionActive > 0.5;
  let countScale = sqrt(f32(params.count) / 1000.0);
  let wellStrength = select(HOME_WELL_STRENGTH, INTERACTION_WELL_STRENGTH * params.interactionStrength * countScale, interactionOn);
  let wellSoftening = select(HOME_WELL_SOFTENING, INTERACTION_WELL_SOFTENING, interactionOn);
  let coreRadius = select(HOME_CORE_RADIUS, INTERACTION_CORE_RADIUS, interactionOn);
  let corePressure = select(HOME_CORE_PRESSURE, INTERACTION_CORE_PRESSURE * params.interactionStrength * countScale, interactionOn);
  let homeRestoreStiffness = select(0.0, HOME_RESTORE_STIFFNESS_ACTIVE, interactionOn);
  let homeRestoreDamping = select(0.0, HOME_RESTORE_DAMPING_ACTIVE, interactionOn);
  let interactionDrag = select(0.0, INTERACTION_DRAG_GAIN * countScale, interactionOn);
  let homeReentryKick = select(HOME_REENTRY_KICK, 0.0, interactionOn);
  let homeReentryDamping = select(HOME_REENTRY_DAMPING, 0.0, interactionOn);
  let coreDist = length(me.pos);
  let coreFrictionFade = 1.0 - smoothstep(CORE_FRICTION_INNER_RADIUS, CORE_FRICTION_RADIUS, coreDist);

  let toTarget = targetPos - me.pos;
  let targetDist2 = dot(toTarget, toTarget);
  let targetDist = sqrt(targetDist2 + 0.0001);
  let targetDir = toTarget / targetDist;
  let toHome = me.home - me.pos;
  let homeAnchorFade = select(
    smoothstep(HOME_ANCHOR_WELL_RADIUS, HOME_ANCHOR_FADE_RADIUS, targetDist),
    1.0,
    interactionOn
  );
  let recoveryForceScale = select(homeAnchorFade, 1.0, interactionOn);
  acc += targetDir * (wellStrength / (targetDist2 + wellSoftening)) * recoveryForceScale;
  if (targetDist < coreRadius) {
    acc -= targetDir * ((coreRadius - targetDist) * corePressure * recoveryForceScale);
  }
  acc += toHome * (homeRestoreStiffness * homeAnchorFade);
  acc -= me.vel * (homeRestoreDamping * homeAnchorFade);
  acc += targetDir * (homeReentryKick * homeAnchorFade);
  acc -= me.vel * (homeReentryDamping * homeAnchorFade);
  acc += targetDir * interactionDrag;
  let speed = length(me.vel);
  let coreSpeedExcess = max(0.0, speed - CORE_FRICTION_SPEED_START);
  let coreFrictionStrength = params.coreOrbit * coreFrictionFade * coreSpeedExcess * CORE_FRICTION_GAIN;
  acc -= me.vel * coreFrictionStrength;

  // [LAW:dataflow-not-control-flow] Disk recovery always runs; gains of zero make individual terms inert without branching the solver.
  let n = params.diskNormal;
  let z = dot(me.pos, n);
  let vz = dot(me.vel, n);
  let rPlane = me.pos - z * n;
  let R2 = dot(rPlane, rPlane);
  let valid = R2 > 1e-8;
  let safeR = sqrt(max(R2, 1e-8));
  let eR = select(vec3f(0.0), rPlane / safeR, valid);
  let crossNE = cross(n, eR);
  let crossLen2 = dot(crossNE, crossNE);
  let ePhi = select(vec3f(0.0), crossNE / sqrt(max(crossLen2, 1e-8)), crossLen2 > 1e-8);
  let vR = dot(me.vel, eR);
  let vPhi = dot(me.vel, ePhi);
  // Disk recovery fades to zero beyond the disk region — scattered particles are free.
  let diskFade = 1.0 - smoothstep(5.0, 7.5, coreDist);
  // Vertical velocity damping — dissipates vertical kinetic energy to maintain disk coherence.
  acc -= n * (vz * params.diskVertDamp * diskFade);
  acc -= eR * (vR * params.diskRadDamp * diskFade);
  acc -= n * (z * params.diskVertSpring * diskFade);
  // Bidirectional tangential nudge: accelerates slow particles, brakes fast ones toward the target.
  // This acts as an energy regulator — without braking, the system injects energy without limit.
  let vc = params.diskTangSpeed / sqrt(safeR + 0.1);
  acc += ePhi * ((vc - vPhi) * params.diskTangGain * diskFade);
  let vNonTan = me.vel - n * vz - eR * vR;
  acc -= vNonTan * (params.diskAlignGain * diskFade);

  // Soft outer boundary.
  let boundaryExcess = max(0.0, coreDist - N_BODY_OUTER_RADIUS);
  acc -= normalize(me.pos + vec3f(0.0001)) * (boundaryExcess * N_BODY_BOUNDARY_PULL);

  // Slowly rotating tidal quadrupole — seeds spiral arms via differential rotation.
  let tidalAngle = params.time * 0.15;
  let tidalCos = cos(tidalAngle);
  let tidalSin = sin(tidalAngle);
  let axisA = vec3f(tidalCos, 0.0, tidalSin);
  let axisB = vec3f(-tidalSin, 0.0, tidalCos);
  acc += params.tidalStrength * (axisA * dot(me.pos, axisA) - axisB * dot(me.pos, axisB));

  let effectiveDamping = 1.0 - (1.0 - params.damping) * params.dt;
  var vel = (me.vel + acc * params.dt) * effectiveDamping;
  let pos = me.pos + vel * params.dt;

  if (alive) {
    bodiesOut[idx] = Body(pos, me.mass, vel, 0.0, me.home, 0.0);
  }
}
`,"Render (Vert+Frag)":`struct Camera {
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
  @location(2) speed: f32,
  @location(3) interactProximity: f32,
}

// [LAW:dataflow-not-control-flow] Per-particle hash gives deterministic visual jitter without storing extra data.
fn pcgHash(input: u32) -> f32 {
  var state = input * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return f32((word >> 22u) ^ word) / 4294967295.0;
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
  let massVisual = clamp(sqrt(max(body.mass, 0.02)) / 1.8, 0.08, 1.0);
  let speed = length(body.vel);

  // Size: mass drives base size. Billboard scales with depth for constant pixel size, capped to avoid giant quads.
  let depth = min(max(abs(viewPos.z), 0.05), 30.0);
  let pixelScale = 0.0055 * depth * mix(0.6, 3.0, massVisual);
  let offset = quadPos[vid] * pixelScale;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];

  // Per-particle hashes for visual variety — deterministic, no extra storage.
  let hash0 = pcgHash(iid);
  let hash1 = pcgHash(iid + 7919u);  // second hash for independent variation

  // Rich stellar palette — 10 hues, no greens, continuously interpolated for smooth variety.
  let palette = array<vec3f, 10>(
    vec3f(1.0, 0.85, 0.5),    // warm gold
    vec3f(1.0, 0.6, 0.35),    // deep amber
    vec3f(1.0, 0.4, 0.4),     // soft red
    vec3f(1.0, 0.45, 0.6),    // warm rose
    vec3f(0.95, 0.4, 0.75),   // magenta-pink
    vec3f(0.75, 0.4, 0.95),   // orchid
    vec3f(0.55, 0.4, 1.0),    // violet
    vec3f(0.4, 0.5, 1.0),     // periwinkle
    vec3f(0.4, 0.65, 0.95),   // steel blue
    vec3f(0.85, 0.7, 1.0),    // lavender
  );

  // Continuous palette interpolation — hash picks a position along the 10-color ramp and lerps between neighbors.
  let palettePos = hash1 * 9.0;
  let paletteIdx = u32(palettePos);
  let paletteFrac = fract(palettePos);
  let stellarCol = mix(palette[paletteIdx], palette[min(paletteIdx + 1u, 9u)], paletteFrac);

  // ~50% of particles use pure stellar palette, rest blend with theme for cohesion.
  let massTint = clamp(pow(massVisual, 0.7), 0.0, 1.0);
  let jitteredTint = clamp(massTint + (hash0 - 0.5) * 0.3, 0.0, 1.0);
  let themeBase = mix(camera.primary, camera.secondary, jitteredTint);
  let useTheme = hash0 > 0.5;
  var col = select(stellarCol, mix(themeBase, stellarCol, 0.5), useTheme);

  // Heavy bodies pick up accent with hash-varied threshold.
  let heavyThreshold = 0.5 + hash0 * 0.3;
  let heavyTint = smoothstep(heavyThreshold, heavyThreshold + 0.2, massVisual);
  col = mix(col, mix(col, camera.accent, 0.55), heavyTint);

  // Velocity color shift: fast particles warm toward rose/amber, giving visual energy.
  let speedTint = smoothstep(0.5, 2.5, speed) * 0.2;
  col = mix(col, col * vec3f(1.0, 0.75, 0.4), speedTint);

  // Interaction glow: particles near the interaction point pick up accent tint and brighten.
  let toInteract = body.pos - camera.interactPos;
  let interactDist = length(toInteract);
  let proximity = camera.interactActive * (1.0 - smoothstep(0.0, 2.0, interactDist));
  col = mix(col, camera.accent * 1.4, proximity * 0.3);

  out.color = col;
  out.speed = speed;
  out.interactProximity = proximity;
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f, @location(2) speed: f32, @location(3) interactProximity: f32) -> @location(0) vec4f {
  let dist = length(uv);
  if (dist > 1.0) { discard; }
  let core = exp(-dist * 22.0) * 1.8;
  let halo = exp(-dist * 5.0) * 0.45;
  let intensity = core + halo;
  let whiteShift = clamp(core * 0.06, 0.0, 0.3);
  let tinted = mix(color, vec3f(1.0), whiteShift);

  // Velocity-dependent interaction flare: fast particles near the interaction well glow bright in accent,
  // creating visible energy tendrils of infalling material.
  let speedGlow = smoothstep(0.5, 2.5, speed) * interactProximity * 0.35;

  return vec4f(tinted * (intensity + speedGlow), 1.0);
}
`},physics_classic:{"Compute (Classic)":`// Classic n-body compute — preserved verbatim from the original shader-playground for A/B comparison.
// Body is 32 bytes (no \`home\` field). Attractor lives inside Params (no separate uniform here).

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
}

struct Params {
  dt: f32,
  G: f32,
  softening: f32,
  damping: f32,
  count: u32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
  attractorX: f32,
  attractorY: f32,
  attractorZ: f32,
  attractorActive: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  var acc = vec3f(0.0);

  for (var i = 0u; i < params.count; i++) {
    if (i == idx) { continue; }
    let other = bodiesIn[i];
    let diff = other.pos - me.pos;
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * other.mass * inv3);
  }

  // Attractor from ctrl+click — behaves like a massive body
  if (params.attractorActive > 0.5) {
    let aPos = vec3f(params.attractorX, params.attractorY, params.attractorZ);
    let diff = aPos - me.pos;
    let dist2 = dot(diff, diff) + params.softening * params.softening;
    let inv = 1.0 / sqrt(dist2);
    let inv3 = inv * inv * inv;
    acc += diff * (params.G * 200.0 * inv3);
  }

  // Gentle drift toward center when no attractor active — prevents bodies from escaping
  let toCenter = -me.pos;
  let centerDist = length(toCenter);
  if (centerDist > 1.0) {
    acc += toCenter * (0.001 * (centerDist - 1.0));
  }

  var vel = (me.vel + acc * params.dt) * params.damping;
  let pos = me.pos + vel * params.dt;

  bodiesOut[idx] = Body(pos, me.mass, vel, 0.0);
}
`,"Render (Classic)":`// Classic n-body render — preserved verbatim for A/B comparison. World-space billboards, soft fuzzy falloff.
// The output is multiplied by a small HDR factor at the end so the bloom/composite stage can lift it; the
// underlying shape and gradient are otherwise identical to the original.

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
}

struct Attractor {
  // 'enabled' instead of 'active' because WGSL reserves \`active\` as a keyword
  // and would reject \`active: f32\` with "Expected Identifier, got ReservedWord".
  x: f32, y: f32, z: f32, enabled: f32,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> attractor: Attractor;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) glow: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let body = bodies[iid];

  let quadPos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );

  // Attractor influence: bodies closer to attractor get bigger and shift color
  var attractInfluence = 0.0;
  if (attractor.enabled > 0.5) {
    let aPos = vec3f(attractor.x, attractor.y, attractor.z);
    let toDist = length(aPos - body.pos);
    attractInfluence = clamp(1.0 / (toDist * toDist + 0.1), 0.0, 1.0);
  }

  let viewPos = camera.view * vec4f(body.pos, 1.0);
  let baseSize = 0.04 * (0.5 + body.mass * 0.5);
  let size = baseSize * (1.0 + attractInfluence * 1.5); // swell near attractor
  let offset = quadPos[vid] * size;
  let billboarded = viewPos + vec4f(offset, 0.0, 0.0);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = quadPos[vid];
  out.glow = attractInfluence;

  // Color: primary → secondary by mass, shifts to accent near attractor
  let massTint = clamp(body.mass / 3.0, 0.0, 1.0);
  let baseColor = mix(camera.primary, camera.secondary, massTint);
  let attractColor = camera.accent;
  out.color = mix(baseColor, attractColor, attractInfluence);
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2f, @location(1) color: vec3f, @location(2) glow: f32) -> @location(0) vec4f {
  let dist = length(uv);
  // smoothstep requires edge0 <= edge1 in WGSL (undefined behavior otherwise),
  // so we compute the standard form and invert. Result: alpha = 1 at center,
  // 0 at the outer edge, smoothly fading between dist=0.3 and dist=1.0.
  let alpha = 1.0 - smoothstep(0.3, 1.0, dist);
  if (alpha < 0.01) { discard; }
  let g = exp(-dist * 2.0);
  // Extra glow ring when under attractor influence
  let extraGlow = glow * exp(-dist * 1.0) * 0.5;
  // Modest HDR multiplier so the classic look reads through tone mapping without overhauling its character.
  return vec4f(color * (0.5 + g * 0.5 + extraGlow) * 2.5, alpha);
}
`},fluid:{"Forces + Advect":`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  time: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> dyeIn: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> dyeOut: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  let cx = clamp(x, 0, res - 1);
  let cy = clamp(y, 0, res - 1);
  return u32(cy * res + cx);
}

fn sampleVel(px: f32, py: f32) -> vec2f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(velIn[idx(x0, y0)], velIn[idx(x0+1, y0)], fx),
    mix(velIn[idx(x0, y0+1)], velIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn sampleDye(px: f32, py: f32) -> vec4f {
  let res = params.resolution;
  let x0 = i32(floor(px)); let y0 = i32(floor(py));
  let fx = px - f32(x0); let fy = py - f32(y0);
  return mix(
    mix(dyeIn[idx(x0, y0)], dyeIn[idx(x0+1, y0)], fx),
    mix(dyeIn[idx(x0, y0+1)], dyeIn[idx(x0+1, y0+1)], fx),
    fy
  );
}

fn gaussian(delta: vec2f, radius: f32) -> f32 {
  return exp(-dot(delta, delta) / (2.0 * radius * radius));
}

fn orbitCenter(time: f32, phase: f32, radius: f32, wobble: f32) -> vec2f {
  return vec2f(
    0.5 + cos(time * 0.17 + phase) * radius + cos(time * 0.31 + phase * 1.7) * wobble,
    0.5 + sin(time * 0.14 + phase * 1.3) * radius + sin(time * 0.27 + phase * 0.8) * wobble
  );
}

fn driftImpulse(delta: vec2f, falloff: f32, spin: f32, strength: f32, timePhase: f32) -> vec2f {
  let dist = max(length(delta), 1e-4);
  let tangent = vec2f(-delta.y, delta.x) / dist * spin * (0.18 + 0.08 * sin(timePhase));
  let inward = -delta * 0.95;
  let grain = vec2f(sin(delta.y * 18.0 + timePhase), cos(delta.x * 16.0 - timePhase)) * 0.035;
  return (tangent + inward + grain) * falloff * strength;
}

fn ambientDyeColor(phase: f32, pulse: f32) -> vec3f {
  if (params.dyeMode < 0.5) {
    return hsvToRgb(fract(params.time * 0.08 + phase), 0.85, 1.0);
  }
  if (params.dyeMode < 1.5) {
    return vec3f(0.1, 0.5, 1.0) * (0.75 + pulse * 0.25);
  }
  return mix(vec3f(0.18, 0.3, 1.0), vec3f(1.0, 0.28, 0.1), 0.5 + pulse * 0.5);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let i = idx(x, y);
  let uv = vec2f((f32(x) + 0.5) / params.resolution, (f32(y) + 0.5) / params.resolution);
  var velocityImpulse = vec2f(0.0);
  var dyeInjection = vec4f(0.0);

  // [LAW:dataflow-not-control-flow] Both ambient drive and pointer input are evaluated every invocation; the mask values decide whether they contribute.
  let mouseMask = select(0.0, 1.0, params.mouseActive > 0.5);
  let mouseDelta = uv - vec2f(params.mouseX, params.mouseY);
  let mouseRadius = 0.02;
  let mouseSplat = gaussian(mouseDelta, mouseRadius) * params.forceStrength * mouseMask;
  velocityImpulse += vec2f(params.mouseDX, params.mouseDY) * mouseSplat;

  let mouseDyeSplat = gaussian(mouseDelta, mouseRadius * 2.0) * mouseMask;
  var mouseDyeColor: vec3f;
  if (params.dyeMode < 0.5) {
    let angle = atan2(params.mouseDY, params.mouseDX);
    let h = angle / 6.283 + 0.5;
    mouseDyeColor = hsvToRgb(h, 0.9, 1.0);
  } else if (params.dyeMode < 1.5) {
    mouseDyeColor = vec3f(0.1, 0.5, 1.0);
  } else {
    let speed = length(vec2f(params.mouseDX, params.mouseDY));
    mouseDyeColor = mix(vec3f(0.2, 0.3, 1.0), vec3f(1.0, 0.2, 0.1), clamp(speed * 5.0, 0.0, 1.0));
  }
  dyeInjection += vec4f(mouseDyeColor * mouseDyeSplat, mouseDyeSplat);

  let driveBase = params.forceStrength * 0.0032;
  let ambientDyeRamp = smoothstep(1.5, 7.0, params.time);

  let pulse0 = 0.75 + 0.25 * sin(params.time * 0.42);
  let center0 = orbitCenter(params.time, 0.0, 0.19, 0.035);
  let delta0 = uv - center0;
  let falloff0 = gaussian(delta0, 0.32);
  velocityImpulse += driftImpulse(delta0, falloff0, 1.0, driveBase * pulse0, params.time * 0.7);
  dyeInjection += vec4f(ambientDyeColor(0.03, pulse0) * falloff0 * 0.0006, falloff0 * 0.0003) * ambientDyeRamp;

  let pulse1 = 0.75 + 0.25 * sin(params.time * 0.37 + 2.1);
  let center1 = orbitCenter(params.time, 2.1, 0.16, 0.04);
  let delta1 = uv - center1;
  let falloff1 = gaussian(delta1, 0.30);
  velocityImpulse += driftImpulse(delta1, falloff1, -1.0, driveBase * pulse1 * 0.9, params.time * 0.63 + 1.7);
  dyeInjection += vec4f(ambientDyeColor(0.37, pulse1) * falloff1 * 0.0005, falloff1 * 0.00025) * ambientDyeRamp;

  let pulse2 = 0.75 + 0.25 * sin(params.time * 0.33 + 4.2);
  let center2 = orbitCenter(params.time, 4.2, 0.21, 0.03);
  let delta2 = uv - center2;
  let falloff2 = gaussian(delta2, 0.34);
  velocityImpulse += driftImpulse(delta2, falloff2, 1.0, driveBase * pulse2 * 0.8, params.time * 0.57 + 3.4);
  dyeInjection += vec4f(ambientDyeColor(0.69, pulse2) * falloff2 * 0.0004, falloff2 * 0.0002) * ambientDyeRamp;

  let drivenVel = velIn[i] + velocityImpulse;
  let px = f32(x) - drivenVel.x * params.dt;
  let py = f32(y) - drivenVel.y * params.dt;
  let advectedVel = sampleVel(px, py);
  let advectedDye = sampleDye(px, py) * 0.992;

  velOut[i] = (advectedVel + velocityImpulse) * 0.94;
  dyeOut[i] = min(advectedDye + dyeInjection, vec4f(2.2, 2.2, 2.2, 1.6));
}

fn hsvToRgb(h: f32, s: f32, v: f32) -> vec3f {
  let hh = fract(h) * 6.0;
  let i = u32(floor(hh));
  let f = hh - f32(i);
  let p = v * (1.0 - s);
  let q = v * (1.0 - s * f);
  let t = v * (1.0 - s * (1.0 - f));
  switch (i) {
    case 0u: { return vec3f(v, t, p); }
    case 1u: { return vec3f(q, v, p); }
    case 2u: { return vec3f(p, v, t); }
    case 3u: { return vec3f(p, q, v); }
    case 4u: { return vec3f(t, p, v); }
    default: { return vec3f(v, p, q); }
  }
}
`,Diffuse:`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let alpha = 1.0 / (params.viscosity * params.dt);
  let beta = 4.0 + alpha;

  let center = velIn[idx(x, y)];
  let left = velIn[idx(x-1, y)];
  let right = velIn[idx(x+1, y)];
  let down = velIn[idx(x, y-1)];
  let up = velIn[idx(x, y+1)];

  velOut[idx(x, y)] = (left + right + down + up + center * alpha) / beta;
}
`,Divergence:`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> divergenceOut: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let vr = velIn[idx(x+1, y)].x;
  let vl = velIn[idx(x-1, y)].x;
  let vu = velIn[idx(x, y+1)].y;
  let vd = velIn[idx(x, y-1)].y;
  divergenceOut[idx(x, y)] = (vr - vl + vu - vd) * 0.5;
}
`,"Pressure Solve":`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> pressIn: array<f32>;
@group(0) @binding(1) var<storage, read_write> pressOut: array<f32>;
@group(0) @binding(2) var<storage, read> divergence: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let left = pressIn[idx(x-1, y)];
  let right = pressIn[idx(x+1, y)];
  let down = pressIn[idx(x, y-1)];
  let up = pressIn[idx(x, y+1)];
  let div = divergence[idx(x, y)];

  pressOut[idx(x, y)] = (left + right + down + up - div) * 0.25;
}
`,"Gradient Sub":`struct Params {
  dt: f32,
  viscosity: f32,
  diffusionRate: f32,
  forceStrength: f32,
  resolution: f32,
  mouseX: f32,
  mouseY: f32,
  mouseDX: f32,
  mouseDY: f32,
  mouseActive: f32,
  dyeMode: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> velIn: array<vec2f>;
@group(0) @binding(1) var<storage, read_write> velOut: array<vec2f>;
@group(0) @binding(2) var<storage, read> pressure: array<f32>;
@group(0) @binding(3) var<uniform> params: Params;

fn idx(x: i32, y: i32) -> u32 {
  let res = i32(params.resolution);
  return u32(clamp(y, 0, res-1) * res + clamp(x, 0, res-1));
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let pl = pressure[idx(x-1, y)];
  let pr = pressure[idx(x+1, y)];
  let pd = pressure[idx(x, y-1)];
  let pu = pressure[idx(x, y+1)];
  let vel = velIn[idx(x, y)];
  velOut[idx(x, y)] = vel - vec2f(pr - pl, pu - pd) * 0.5;
}
`,Render:`struct Camera {
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

fn fetchDye(x: i32, y: i32, res: i32) -> vec4f {
  let cx = clamp(x, 0, res - 1);
  let cy = clamp(y, 0, res - 1);
  return dye[cy * res + cx];
}

// Catmull-Rom cubic weights — C1 continuous interpolation, no overshoot tuning
// needed and the 1D weights sum to 1. Used in 2D as a separable 4×4 sample.
fn catmullRom(t: f32) -> vec4f {
  let t2 = t * t;
  let t3 = t2 * t;
  return vec4f(
    -0.5 * t3 +       t2 - 0.5 * t,
     1.5 * t3 - 2.5 * t2 + 1.0,
    -1.5 * t3 + 2.0 * t2 + 0.5 * t,
     0.5 * t3 - 0.5 * t2
  );
}

// Bicubic sample of the dye field. The sim grid (simRes²) is denser than the
// render grid (gridRes²) but the render samples between sim cells. Bilinear is
// only C0 continuous, so the kinks at sim-cell boundaries become visible as
// faint contour bands once the density goes through pow() and Phong lighting.
// Catmull-Rom is C1 continuous → bands disappear.
fn sampleDye(u: f32, v: f32) -> vec4f {
  let res = i32(params.simRes);
  let fx = u * f32(res) - 0.5;
  let fy = v * f32(res) - 0.5;
  let x1 = i32(floor(fx));
  let y1 = i32(floor(fy));
  let tx = fx - f32(x1);
  let ty = fy - f32(y1);
  let wx = catmullRom(tx);
  let wy = catmullRom(ty);

  var rows: array<vec4f, 4>;
  for (var j = 0; j < 4; j = j + 1) {
    let row = fetchDye(x1 - 1, y1 - 1 + j, res) * wx.x
            + fetchDye(x1,     y1 - 1 + j, res) * wx.y
            + fetchDye(x1 + 1, y1 - 1 + j, res) * wx.z
            + fetchDye(x1 + 2, y1 - 1 + j, res) * wx.w;
    rows[j] = row;
  }
  let result = rows[0] * wy.x + rows[1] * wy.y + rows[2] * wy.z + rows[3] * wy.w;
  // Catmull-Rom can ring slightly negative on sharp edges; clamp non-negative
  // since dye density and color are physically non-negative.
  return max(result, vec4f(0.0));
}

fn sampleDensity(u: f32, v: f32) -> f32 {
  // [LAW:one-source-of-truth] Density comes solely from dye.a (the mode-invariant
  // splat amount written by fluid.forces.wgsl). Mixing length(d.rgb) here makes
  // surface height depend on dye color, so single/rainbow/temperature presets
  // would render at different thicknesses for the same injected density.
  let d = sampleDye(u, v);
  let raw = clamp(d.a * 0.14, 0.0, 2.5);
  return 1.0 - exp(-raw * 1.35);
}

// [LAW:one-source-of-truth] Single function maps a density scalar to surface
// height. Used for both top corners and side-wall top edges so adjacent cells
// share heights exactly along their shared edges.
fn heightFromDensity(density: f32) -> f32 {
  let liftedDensity = pow(density, 0.58);
  return 0.14 + liftedDensity * params.heightScale * 2.6;
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

// Each cell instance draws a 36-vert prism: 6 top + 6 bottom + 4 side quads of
// 6 verts each. prismVert encodes per-vertex (corner_x, corner_z, isTop) where
// corner_{x,z} ∈ {0,1} pick which of the 4 cell corners and isTop ∈ {0,1}
// picks top vs bottom edge of that corner column.
fn prismVert(vid: u32) -> vec3f {
  let table = array<vec3f, 36>(
    // Top quad (y = surface, two triangles, CCW from +y)
    vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0),
    vec3f(0.0, 1.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(1.0, 1.0, 1.0),
    // Bottom quad (y = 0, CCW from -y)
    vec3f(0.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0),
    vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
    // -X side (cornerX=0)
    vec3f(0.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0),
    vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0),
    // +X side (cornerX=1)
    vec3f(1.0, 0.0, 0.0), vec3f(1.0, 1.0, 0.0), vec3f(1.0, 0.0, 1.0),
    vec3f(1.0, 0.0, 1.0), vec3f(1.0, 1.0, 0.0), vec3f(1.0, 1.0, 1.0),
    // -Z side (cornerZ=0)
    vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0),
    vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 0.0), vec3f(1.0, 0.0, 1.0),
    // +Z side (cornerZ=1)
    vec3f(0.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 0.0),
    vec3f(1.0, 1.0, 0.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0)
  );
  return table[vid];
}

// Static face normals for non-top verts (top normals come from density derivatives)
fn faceNormal(vid: u32) -> vec3f {
  if (vid < 6u) { return vec3f(0.0, 1.0, 0.0); }
  if (vid < 12u) { return vec3f(0.0, -1.0, 0.0); }
  if (vid < 18u) { return vec3f(-1.0, 0.0, 0.0); }
  if (vid < 24u) { return vec3f(1.0, 0.0, 0.0); }
  if (vid < 30u) { return vec3f(0.0, 0.0, -1.0); }
  return vec3f(0.0, 0.0, 1.0);
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VSOut {
  let gr = u32(params.gridRes);
  let cx = iid % gr;
  let cy = iid / gr;

  let local = prismVert(vid);
  let cornerX = local.x;
  let cornerZ = local.y;
  let isTop = local.z;

  // Corner (u,v) — corners are at integer cell boundaries so adjacent cells
  // sample the same point and produce shared heights along shared edges.
  let u = (f32(cx) + cornerX) / f32(gr);
  let v = (f32(cy) + cornerZ) / f32(gr);

  let density = sampleDensity(u, v);
  let topY = heightFromDensity(density);
  let worldY = isTop * topY;

  let worldX = (u - 0.5) * params.worldSize;
  let worldZ = (v - 0.5) * params.worldSize;
  var worldPos = vec3f(worldX, worldY, worldZ);

  // Collapse interior side walls to a degenerate point. Adjacent cells produce
  // exact-coincident opposite-facing wall quads which z-fight (both draw at the
  // same depth), so only world-boundary cells should emit their outward sides.
  // [LAW:dataflow-not-control-flow] Every vertex still runs the same path; the
  // boundary check just supplies a degenerate position for non-boundary side verts.
  let lastCell = gr - 1u;
  let isMinX = vid >= 12u && vid < 18u && cx != 0u;
  let isMaxX = vid >= 18u && vid < 24u && cx != lastCell;
  let isMinZ = vid >= 24u && vid < 30u && cy != 0u;
  let isMaxZ = vid >= 30u && vid < 36u && cy != lastCell;
  if (isMinX || isMaxX || isMinZ || isMaxZ) {
    worldPos = vec3f(0.0);
  }

  // Top normals from finite differences of the density field — produces smooth
  // Phong shading instead of cube facets. Side/bottom verts use static face normals.
  var normal = faceNormal(vid);
  if (vid < 6u) {
    let eps = 1.0 / f32(gr);
    let hL = heightFromDensity(sampleDensity(u - eps, v));
    let hR = heightFromDensity(sampleDensity(u + eps, v));
    let hD = heightFromDensity(sampleDensity(u, v - eps));
    let hU = heightFromDensity(sampleDensity(u, v + eps));
    let dx = (hR - hL) / (2.0 * eps * params.worldSize);
    let dz = (hU - hD) / (2.0 * eps * params.worldSize);
    normal = normalize(vec3f(-dx, 1.0, -dz));
  }

  var out: VSOut;
  out.pos = camera.proj * camera.view * vec4f(worldPos, 1.0);
  // Pass per-vertex corner uv (not cell-center) so the fragment uv interpolates
  // smoothly across the entire surface. Cell-center uv was constant per-cell,
  // which made spectralThemeColor produce a different color per cell — visible
  // as concentric contour bands.
  out.uv = vec2f(u, v);
  out.normal = normal;
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
`},parametric:{"Compute (All Shapes)":`struct Params {
  uRes: u32,
  vRes: u32,
  scale: f32,
  twist: f32,
  time: f32,
  shapeId: u32,
  p1: f32,
  p2: f32,
  p3: f32,  // wave amplitude
  p4: f32,  // wave frequency multiplier
  pokeX: f32,
  pokeY: f32,
  pokeZ: f32,
  pokeActive: f32,
}

struct Vertex {
  pos: vec3f,
  glow: f32,    // wave displacement magnitude — sits in the vec3f padding slot
  normal: vec3f,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(1) var<uniform> params: Params;

// Shape 0: Torus — p1=majorRadius, p2=minorRadius
fn torusShape(u: f32, v: f32) -> vec3f {
  let R = params.p1; let r = params.p2;
  return vec3f(
    (R + r * cos(v)) * cos(u),
    (R + r * cos(v)) * sin(u),
    r * sin(v)
  );
}

// Shape 1: Klein bottle — p1=scale
fn kleinShape(u: f32, v: f32) -> vec3f {
  let cosU = cos(u); let sinU = sin(u);
  let cosV = cos(v); let sinV = sin(v);
  let a = params.p1;
  var x: f32; var z: f32;
  if (u < 3.14159) {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cosU*cosV;
    z = -8.0*sinU - (2.0*a)*(1.0-cosU*0.5)*sinU*cosV;
  } else {
    x = 3.0*cosU*(1.0+sinU) + (2.0*a)*(1.0-cosU*0.5)*cos(v+3.14159);
    z = -8.0*sinU;
  }
  let y = -(2.0*a)*(1.0-cosU*0.5)*sinV;
  return vec3f(x, y, z) * 0.1;
}

// Shape 2: Möbius strip — p1=width, p2=halfTwists
fn mobiusShape(u: f32, v: f32) -> vec3f {
  let w = params.p1;
  let tw = params.p2;
  let vv = (v / 6.283185 - 0.5) * w;
  let halfU = u * tw * 0.5;
  return vec3f(
    (1.0 + vv * cos(halfU)) * cos(u),
    (1.0 + vv * cos(halfU)) * sin(u),
    vv * sin(halfU)
  );
}

// Shape 3: Sphere — p1=xStretch, p2=zStretch
fn sphereShape(u: f32, v: f32) -> vec3f {
  return vec3f(
    sin(v) * cos(u) * params.p1,
    sin(v) * sin(u) * params.p1,
    cos(v) * params.p2
  );
}

// Shape 4: Trefoil knot — p1=tubeRadius, p2=knotScale
fn trefoilShape(u: f32, v: f32) -> vec3f {
  let t = u;
  let ks = params.p2;
  let cx = sin(t) + 2.0 * sin(2.0 * t);
  let cy = cos(t) - 2.0 * cos(2.0 * t);
  let cz = -sin(3.0 * t);
  let dx = cos(t) + 4.0 * cos(2.0 * t);
  let dy = -sin(t) + 4.0 * sin(2.0 * t);
  let dz = -3.0 * cos(3.0 * t);
  let tangent = normalize(vec3f(dx, dy, dz));
  var up = vec3f(0.0, 0.0, 1.0);
  if (abs(dot(tangent, up)) > 0.99) { up = vec3f(0.0, 1.0, 0.0); }
  let normal = normalize(cross(tangent, up));
  let binormal = cross(tangent, normal);
  let r = params.p1;
  return vec3f(cx, cy, cz) * ks + (normal * cos(v) + binormal * sin(v)) * r * ks;
}

fn evalShape(u: f32, v: f32) -> vec3f {
  switch (params.shapeId) {
    case 0u: { return torusShape(u, v); }
    case 1u: { return kleinShape(u, v); }
    case 2u: { return mobiusShape(u, v); }
    case 3u: { return sphereShape(u, v); }
    case 4u: { return trefoilShape(u, v); }
    default: { return torusShape(u, v); }
  }
}

// Three interfering traveling waves — amplitude=p3, frequency=p4
fn waveDelta(u: f32, v: f32) -> f32 {
  let t = params.time;
  let a = params.p3;
  let f = max(params.p4, 0.3);
  let w1 = sin(u * 3.0 * f + v * 2.0 * f + t * 1.8) * 0.12;
  let w2 = cos(u * 5.0 * f - v * 4.0 * f + t * 2.3) * 0.07;
  let w3 = sin(u * 2.0 * f + v * 7.0 * f - t * 1.5) * 0.05;
  return (w1 + w2 + w3) * a;
}

// Scaled + wave-displaced position for a UV coordinate.
// Normal of the base shape is computed via finite differences and used as
// the displacement direction so waves are always surface-normal aligned.
fn evalFull(u: f32, v: f32) -> vec3f {
  let eps = 0.001;
  let p  = evalShape(u, v);
  let pu = evalShape(u + eps, v);
  let pv = evalShape(u, v + eps);
  let bn = normalize(cross(pu - p, pv - p));
  return (p + bn * waveDelta(u, v)) * params.scale;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let ui = gid.x;
  let vi = gid.y;
  if (ui >= params.uRes || vi >= params.vRes) { return; }

  let u = f32(ui) / f32(params.uRes) * 6.283185;
  let v = f32(vi) / f32(params.vRes) * 6.283185;
  let idx = vi * params.uRes + ui;

  let twistAngle = params.twist * f32(vi) / f32(params.vRes);
  let tu = u + twistAngle;

  // Displaced position
  var pos = evalFull(tu, v);

  // Normal of the displaced surface via finite differences of evalFull
  let feps = 0.005;
  let dpu = evalFull(tu + feps, v) - pos;
  let dpv = evalFull(tu, v + feps) - pos;
  let nc = cross(dpu, dpv);
  let nlen = length(nc);
  var normal = select(vec3f(0.0, 1.0, 0.0), nc / nlen, nlen > 0.0001);

  // Glow: wave displacement magnitude, scaled so default amp gives visible emission
  let disp = waveDelta(tu, v);
  let glow = abs(disp) * 5.0;

  // Poke deformation: push vertices outward near the interaction point
  if (params.pokeActive > 0.5) {
    let pokePos = vec3f(params.pokeX, params.pokeY, params.pokeZ);
    let diff = pos - pokePos;
    let dist = length(diff);
    let radius = 0.8;
    let strength = exp(-dist * dist / (2.0 * radius * radius)) * 0.5;
    pos += normal * strength;
  }

  vertices[idx] = Vertex(pos, glow, normal, 0.0);
}
`,"Render (Phong)":`struct Camera {
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

  // HDR boost: rim and emission carry more punch since bloom captures their spillover.
  let composed = shadedColor + rimGlow * 2.5 + emission * 3.0;
  return vec4f(composed * 3.2, 1.0);
}
`},reaction:{"Compute (Gray-Scott)":`// Gray-Scott reaction-diffusion on a 3D volume.
// State texture is rgba16float: r = u concentration, g = v concentration.
// 7-point Laplacian stencil, unconditional loads with clamped coords.
// [LAW:dataflow-not-control-flow] Same operations run every cell; boundaries
// are handled by clamping coords, not by branching.

struct Params {
  feed: f32,
  kill: f32,
  Du: f32,
  Dv: f32,
  dt: f32,
  N: f32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var uvIn: texture_3d<f32>;
@group(0) @binding(1) var uvOut: texture_storage_3d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: Params;

fn fetch(p: vec3<i32>, maxIdx: i32) -> vec2f {
  let c = clamp(p, vec3<i32>(0), vec3<i32>(maxIdx));
  return textureLoad(uvIn, c, 0).rg;
}

@compute @workgroup_size(8, 8, 4)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let N = i32(params.N);
  let maxIdx = N - 1;
  let ix = i32(gid.x);
  let iy = i32(gid.y);
  let iz = i32(gid.z);
  if (ix >= N || iy >= N || iz >= N) {
    return;
  }
  let p = vec3<i32>(ix, iy, iz);

  let c = fetch(p, maxIdx);
  let xm = fetch(p + vec3<i32>(-1,  0,  0), maxIdx);
  let xp = fetch(p + vec3<i32>( 1,  0,  0), maxIdx);
  let ym = fetch(p + vec3<i32>( 0, -1,  0), maxIdx);
  let yp = fetch(p + vec3<i32>( 0,  1,  0), maxIdx);
  let zm = fetch(p + vec3<i32>( 0,  0, -1), maxIdx);
  let zp = fetch(p + vec3<i32>( 0,  0,  1), maxIdx);

  // Unit-weight 7-point Laplacian: sum of neighbors minus 6× center, NO division.
  // The canonical Gray-Scott atlas values (Du≈0.2097, Dv≈0.105, feed/kill ≈ 0.05)
  // assume this form. Dividing by 6 effectively runs diffusion at 1/6 strength
  // and most presets visibly freeze because the reaction term can't compete.
  let lap = xm + xp + ym + yp + zm + zp - 6.0 * c;

  let u = c.r;
  let v = c.g;
  let uvv = u * v * v;
  let du = params.Du * lap.r - uvv + params.feed * (1.0 - u);
  let dv = params.Dv * lap.g + uvv - (params.feed + params.kill) * v;

  // dt of 1.0 is on the stability edge for Du=0.21 (limit ~1/6Du ≈ 0.79). A dt
  // of ~0.7 gives comfortable headroom; timeScale can push it higher if desired.
  var next = c + vec2f(du, dv) * params.dt;
  next = clamp(next, vec2f(0.0), vec2f(1.0));

  // [LAW:dataflow-not-control-flow] Dirichlet boundary condition on a smooth
  // band near the volume edge. Every cell blends toward (u=1, v=0) by an amount
  // that's zero in the interior and 1 at the outermost face. Patterns can never
  // escape the interior or reflect off the clamped-coord boundary, which was
  // what made them pile up against the "invisible cube".
  let fN = params.N;
  let fp = vec3f(f32(p.x), f32(p.y), f32(p.z));
  // Distance from the volume center, normalized so edge = 1.
  let r = max(abs(fp.x - (fN - 1.0) * 0.5),
          max(abs(fp.y - (fN - 1.0) * 0.5),
              abs(fp.z - (fN - 1.0) * 0.5))) / ((fN - 1.0) * 0.5);
  // Smoothstep from 0.80 (fully free interior) to 1.0 (fully clamped).
  let boundary = smoothstep(0.80, 1.0, r);
  let reservoir = vec2f(1.0, 0.0);
  next = mix(next, reservoir, boundary);

  textureStore(uvOut, p, vec4f(next, 0.0, 0.0));
}
`,"Render (Raymarch)":`// Raymarched volume render of the Gray-Scott v-field.
// Fullscreen triangle → per-pixel ray → march through a unit cube → isosurface on v.
// [LAW:dataflow-not-control-flow] Fixed step count. The march always runs the same
// number of iterations; hit detection is a value inside a vec4 accumulator.

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

struct RenderParams {
  N: f32,
  isoThreshold: f32,
  worldSize: f32,
  stepCount: f32,
}

@group(0) @binding(0) var volTex: texture_3d<f32>;
@group(0) @binding(1) var volSampler: sampler;
@group(0) @binding(2) var<uniform> camera: Camera;
@group(0) @binding(3) var<uniform> rparams: RenderParams;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) ndc: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  // Oversized triangle covering the viewport.
  var p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  var out: VSOut;
  out.pos = vec4f(p[vid], 0.0, 1.0);
  out.ndc = p[vid];
  return out;
}

// Slab intersection with the axis-aligned cube [-hs, hs]³.
fn intersectBox(ro: vec3f, rd: vec3f, hs: f32) -> vec2f {
  let invD = 1.0 / rd;
  let t0 = (vec3f(-hs) - ro) * invD;
  let t1 = (vec3f( hs) - ro) * invD;
  let tmin = min(t0, t1);
  let tmax = max(t0, t1);
  let tNear = max(max(tmin.x, tmin.y), tmin.z);
  let tFar  = min(min(tmax.x, tmax.y), tmax.z);
  return vec2f(tNear, tFar);
}

fn sampleV(worldPos: vec3f) -> f32 {
  let hs = rparams.worldSize * 0.5;
  let uvw = (worldPos + vec3f(hs)) / rparams.worldSize;
  return textureSampleLevel(volTex, volSampler, uvw, 0.0).g;
}

fn sampleU(worldPos: vec3f) -> f32 {
  let hs = rparams.worldSize * 0.5;
  let uvw = (worldPos + vec3f(hs)) / rparams.worldSize;
  return textureSampleLevel(volTex, volSampler, uvw, 0.0).r;
}

fn gradientV(p: vec3f) -> vec3f {
  let eps = rparams.worldSize / rparams.N;
  let dx = sampleV(p + vec3f(eps, 0.0, 0.0)) - sampleV(p - vec3f(eps, 0.0, 0.0));
  let dy = sampleV(p + vec3f(0.0, eps, 0.0)) - sampleV(p - vec3f(0.0, eps, 0.0));
  let dz = sampleV(p + vec3f(0.0, 0.0, eps)) - sampleV(p - vec3f(0.0, 0.0, eps));
  return vec3f(dx, dy, dz);
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  // Build world-space ray from NDC via inverse(view)*inverse(proj).
  // Simpler: invert view * proj combined — but WGSL has no inverse().
  // Use eye + approximate direction from view matrix rows.
  // View matrix stores world→view; its first 3 rows give view-space basis in world coords.
  let invViewX = vec3f(camera.view[0][0], camera.view[1][0], camera.view[2][0]);
  let invViewY = vec3f(camera.view[0][1], camera.view[1][1], camera.view[2][1]);
  let invViewZ = vec3f(camera.view[0][2], camera.view[1][2], camera.view[2][2]);

  // Reconstruct a view-space direction from NDC using the projection matrix diagonals.
  // proj[0][0] = f/aspect, proj[1][1] = f. So viewDir.xy = ndc.xy * (1/proj[ii][ii]).
  let vx = in.ndc.x / camera.proj[0][0];
  let vy = in.ndc.y / camera.proj[1][1];
  let viewDir = normalize(vec3f(vx, vy, -1.0));
  // Rotate view dir into world space using inverse view rotation (transpose of upper 3x3).
  let rd = normalize(viewDir.x * invViewX + viewDir.y * invViewY + viewDir.z * invViewZ);
  let ro = camera.eye;

  let hs = rparams.worldSize * 0.5;
  let hit = intersectBox(ro, rd, hs);
  let tNear = max(hit.x, 0.0);
  let tFar  = hit.y;

  // Background = transparent (grid drawn underneath).
  if (tFar <= tNear) {
    return vec4f(0.0);
  }

  let steps = i32(rparams.stepCount);
  let tSpan = tFar - tNear;
  let dt = tSpan / f32(steps);
  let iso = rparams.isoThreshold;

  // [LAW:dataflow-not-control-flow] Per-pixel hash jitter on the start offset.
  // Without this, the fixed-stride march aligns to the voxel grid and produces
  // visible "ribs" that shift as the camera orbits. With jitter, the aliasing
  // becomes smooth noise that bloom/trails easily absorb.
  let jitter = fract(sin(dot(in.pos.xy, vec2f(12.9898, 78.233))) * 43758.5453);

  // Accumulator: rgb = premultiplied color, a = alpha.
  var accum = vec4f(0.0);
  var t = tNear + dt * jitter;

  for (var i = 0; i < 512; i = i + 1) {
    if (i >= steps) { break; }
    let p = ro + rd * t;
    let v = sampleV(p);
    let u = sampleU(p);

    // [LAW:dataflow-not-control-flow] Spherical alpha falloff so no visible cube.
    // Every sample multiplies by a radial mask that is 1 in the interior and 0
    // outside — there's no "cube edge", only a soft sphere of visibility.
    // Center of the cube is the origin; half-size = worldSize/2.
    let rel = length(p) / (rparams.worldSize * 0.5);
    let cubeFade = 1.0 - smoothstep(0.78, 0.95, rel);

    // Soft density: wider band than before so sub-texel surfaces don't pop.
    let soft = smoothstep(iso - 0.08, iso + 0.08, v) * cubeFade;
    // Thickness along this step → alpha. Scaled so doubling step count
    // yields roughly the same total opacity through a region.
    let alpha = 1.0 - exp(-soft * 10.0 * dt);

    // Shading: gradient-based normal, Phong with theme colors.
    let grad = gradientV(p);
    let gl = length(grad);
    let n = select(vec3f(0.0, 1.0, 0.0), -grad / max(gl, 1e-5), gl > 1e-5);
    let lightDir = normalize(vec3f(0.6, 0.8, 0.4));
    let diffuse = max(dot(n, lightDir), 0.0);
    let viewDirW = normalize(camera.eye - p);
    let rim = pow(1.0 - max(dot(n, viewDirW), 0.0), 2.5);
    let spec = pow(max(dot(n, normalize(lightDir + viewDirW)), 0.0), 24.0);

    // Color: mix primary↔secondary by u (the substrate), add accent on rim.
    let baseMix = clamp(u, 0.0, 1.0);
    let base = mix(camera.primary, camera.secondary, baseMix);
    let lit = base * (0.18 + diffuse * 0.82) + camera.accent * rim * 0.35 + vec3f(1.0) * spec * 0.25;

    // Front-to-back compositing.
    let src = vec4f(lit * alpha, alpha);
    accum = accum + (1.0 - accum.a) * src;

    if (accum.a > 0.98) { break; }
    t = t + dt;
  }

  return accum;
}
`}}[e]||{}}var It=!1,X=null,Lt={},Rt={};function zt(){let e=document.getElementById(`shader-toggle`),t=document.getElementById(`shader-panel`);e.addEventListener(`click`,()=>{It=!It,t.classList.toggle(`open`,It),e.classList.toggle(`active`,It),It&&Bt()}),document.getElementById(`shader-compile`).addEventListener(`click`,Wt),document.getElementById(`shader-reset`).addEventListener(`click`,Gt),document.getElementById(`shader-editor`).addEventListener(`keydown`,e=>{if(e.key===`Tab`){e.preventDefault();let t=e.target,n=t.selectionStart;t.value=t.value.substring(0,n)+`  `+t.value.substring(t.selectionEnd),t.selectionStart=t.selectionEnd=n+2}})}function Bt(){let e=Ft(D.mode);Rt={...e},(!Lt._mode||Lt._mode!==D.mode)&&(Lt={...e,_mode:D.mode});let t=document.getElementById(`shader-tabs`);t.innerHTML=``;let n=Object.keys(e);X=X&&n.includes(X)?X:n[0];for(let e of n){let n=document.createElement(`button`);n.className=`shader-tab`+(e===X?` active`:``),n.textContent=e,n.addEventListener(`click`,()=>{Vt(),X=e,t.querySelectorAll(`.shader-tab`).forEach(t=>t.classList.toggle(`active`,t.textContent===e)),Ht()}),t.appendChild(n)}Ht()}function Vt(){X&&(Lt[X]=document.getElementById(`shader-editor`).value)}function Ht(){let e=document.getElementById(`shader-editor`);e.value=Lt[X]||``,document.getElementById(`shader-status`).textContent=``,document.getElementById(`shader-status`).className=`shader-success`}function Ut(){It&&Lt._mode!==D.mode&&Bt()}function Wt(){Vt();let e=Lt[X],t=document.getElementById(`shader-status`);try{B.createShaderModule({code:e}).getCompilationInfo().then(n=>{let r=n.messages.filter(e=>e.type===`error`);r.length>0?(t.className=`shader-error`,t.textContent=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`; `),t.title=r.map(e=>`Line ${e.lineNum}: ${e.message}`).join(`
`)):(t.className=`shader-success`,t.textContent=`Compiled OK — reset simulation to apply`,t.title=``,Kt(D.mode,X,e))})}catch(e){t.className=`shader-error`,t.textContent=e.message,t.title=e.message}}function Gt(){X&&Rt[X]&&(Lt[X]=Rt[X],Ht(),Kt(D.mode,X,Rt[X]),document.getElementById(`shader-status`).className=`shader-success`,document.getElementById(`shader-status`).textContent=`Shader reset to original`)}function Kt(e,t,n){let r={boids:{"Compute (Flocking)":()=>{qt=n},"Render (Vert+Frag)":()=>{Jt=n}},physics:{"Compute (Gravity)":()=>{Yt=n},"Render (Vert+Frag)":()=>{Xt=n}},physics_classic:{"Compute (Classic)":()=>{Zt=n},"Render (Classic)":()=>{Qt=n}},fluid:{"Forces + Advect":()=>{$t=n},Diffuse:()=>{en=n},Divergence:()=>{tn=n},"Pressure Solve":()=>{nn=n},"Gradient Sub":()=>{rn=n},Render:()=>{an=n}},parametric:{"Compute (Mesh Gen)":()=>{on=n},"Render (Phong)":()=>{sn=n}},reaction:{"Compute (Gray-Scott)":()=>{cn=n},"Render (Raymarch)":()=>{ln=n}}}[e]?.[t];r&&r()}var qt=null,Jt=null,Yt=null,Xt=null,Zt=null,Qt=null,$t=null,en=null,tn=null,nn=null,rn=null,an=null,on=null,sn=null,cn=null,ln=null,Z=null,Q=null,un=null,dn=null,fn=null,pn=!1,mn={boids:{key:`maxSpeed`,label:`Speed`,min:.1,max:10},physics:{key:`G`,label:`Gravity`,min:.05,max:5},physics_classic:{key:`G`,label:`Gravity`,min:.01,max:100},fluid:{key:`forceStrength`,label:`Force`,min:1,max:500},parametric:{key:`scale`,label:`Scale`,min:.1,max:5},reaction:{key:`feed`,label:`Feed`,min:0,max:.1}},hn=[`physics`,`boids`,`physics_classic`,`fluid`,`parametric`,`reaction`],$={hover:`none`,pressed:`none`,pressingSource:null,pendingPressSource:null,grabbed:!1,lastHitPx:0,lastHitPy:0,lastHitActive:!1,grabDragOriginWorld:null,grabDragOriginCenter:null};function gn(){let e=mn[D.mode],t=D[D.mode][e.key];return typeof t==`number`?Math.max(0,Math.min(1,(t-e.min)/(e.max-e.min))):0}function _n(e,t){let[n,r,i]=K,[a,o]=Se;if(Math.abs(t[2])<1e-6)return null;let s=(i-e[2])/t[2];if(s<0)return null;let c=e[0]+t[0]*s,l=e[1]+t[1]*s,u=(c-n)/a+.5,d=(l-r)/o+.5;if(u<0||u>1||d<0||d>1)return null;let f=a/o,p=(u-.5)*f,m=d-.5,h=`none`;if(Math.abs(p-Ee*f)<we&&Math.abs(m-Ce)<Te)h=`prev`;else if(Math.abs(p-De*f)<we&&Math.abs(m-Ce)<Te)h=`next`;else if(Math.abs(m-q)<Me&&Math.abs(p)<je)h=`grab`;else{let e=f*Ae;Math.abs(m-Oe)<ke&&Math.abs(p)<e+.04&&(h=`slider`)}return{px:p,py:m,element:h}}function vn(e,t,n){if(Math.abs(t[2])<1e-6)return null;let r=(n-e[2])/t[2];return r<0?null:[e[0]+t[0]*r,e[1]+t[1]*r,n]}function yn(e){let t=Se[0]/Se[1]*Ae,n=Math.max(0,Math.min(1,(e+t)/(2*t))),r=mn[D.mode],i=D[D.mode];i[r.key]=r.min+(r.max-r.min)*n}function bn(e){let t=hn[(hn.indexOf(D.mode)+e+hn.length)%hn.length];pt(t)}function xn(e,t){if(!Q)return null;let n=e.getPose(t.targetRaySpace,Q);if(!n)return null;let r=n.transform.position;return{origin:[r.x,r.y,r.z],dir:Tn(n.transform)}}function Sn(e){e?($.lastHitPx=e.px,$.lastHitPy=e.py,$.lastHitActive=!0):$.lastHitActive=!1}function Cn(e){if($.pendingPressSource){let t=$.pendingPressSource,n=xn(e,t);if(n){let e=_n(n.origin,n.dir);if($.pendingPressSource=null,Sn(e),e&&e.element!==`none`){if($.pressed=e.element,$.pressingSource=t,$.hover=e.element,e.element===`slider`)$.grabbed=!0,yn(e.px);else if(e.element===`grab`){let e=vn(n.origin,n.dir,K[2]);e&&($.grabDragOriginWorld=e,$.grabDragOriginCenter=[K[0],K[1],K[2]])}return}wn(t)}return}if($.pressingSource){let t=xn(e,$.pressingSource);if(t){if($.pressed===`grab`&&$.grabDragOriginWorld&&$.grabDragOriginCenter){let e=vn(t.origin,t.dir,$.grabDragOriginCenter[2]);e&&(K[0]=$.grabDragOriginCenter[0]+(e[0]-$.grabDragOriginWorld[0]),K[1]=$.grabDragOriginCenter[1]+(e[1]-$.grabDragOriginWorld[1])),$.lastHitPx=0,$.lastHitPy=q,$.lastHitActive=!0,$.hover=`grab`;return}let e=_n(t.origin,t.dir);Sn(e),$.hover=e?e.element:`none`,$.grabbed&&e&&yn(e.px)}else $.lastHitActive=!1;return}if(fn){let t=xn(e,fn);t?Sn(_n(t.origin,t.dir)):$.lastHitActive=!1}else $.lastHitActive=!1;$.hover=`none`}function wn(e){fn=e,pn=!1,Y()}function Tn(e){let t=e.matrix;return N([-t[8],-t[9],-t[10]])}function En(e){if($.pressed!==`none`){Y();return}let t=fn;if(!t||!Q){Y();return}let n=e.getPose(t.targetRaySpace,Q);if(!n){Y(),pn=!1;return}let r=[n.transform.position.x,n.transform.position.y,n.transform.position.z],i=Tn(n.transform),a=D.mode===`fluid`?St(r,i,0):Ct(r,i);if(!a){Y(),pn=!1;return}if(D.mouse.down=!0,D.mouse.worldX=a[0],D.mouse.worldY=a[1],D.mouse.worldZ=a[2],D.mode===`fluid`){let e=xt(a);if(!e){Y(),pn=!1;return}D.mouse.dx=pn?(e[0]-D.mouse.x)*10:0,D.mouse.dy=pn?(e[1]-D.mouse.y)*10:0,D.mouse.x=e[0],D.mouse.y=e[1]}else D.mouse.dx=0,D.mouse.dy=0,D.mouse.x=a[0],D.mouse.y=a[1];pn=!0}function Dn(){let e=document.getElementById(`btn-xr`);if(!navigator.xr){e.textContent=`VR Not Available`;return}navigator.xr.isSessionSupported(`immersive-vr`).then(t=>{t?(e.disabled=!1,e.addEventListener(`click`,On)):e.textContent=`VR Not Supported`}).catch(()=>{e.textContent=`VR Check Failed`})}async function On(){if(Z){Z.end();return}let e=document.getElementById(`btn-xr`);e.textContent=`Starting...`;try{Z=await navigator.xr.requestSession(`immersive-vr`,{requiredFeatures:[`webgpu`],optionalFeatures:[`layers`,`local-floor`]});let t=!1;try{Q=await Z.requestReferenceSpace(`local-floor`),t=!0}catch{Q=await Z.requestReferenceSpace(`local`)}let n=t?1.6:0,r=globalThis.XRRigidTransform;Q=Q.getOffsetReferenceSpace(new r({x:0,y:n,z:-5})),un=new XRGPUBinding(Z,B);let i=un.getPreferredColorFormat();ge(i,1);let a=un.nativeProjectionScaleFactor,o=[{colorFormat:i,scaleFactor:a,textureType:`texture-array`},{colorFormat:i,textureType:`texture-array`},{colorFormat:i,scaleFactor:a},{colorFormat:i}];for(let e of o)try{dn=un.createProjectionLayer(e);break}catch(e){console.warn(`[XR] Projection layer config failed, trying next:`,e.message),dn=null}if(!dn)throw Error(`All projection layer configurations failed`);Z.updateRenderState({layers:[dn]}),Z.addEventListener(`selectstart`,e=>{$.pendingPressSource=e.inputSource}),Z.addEventListener(`selectend`,e=>{let t=e.inputSource;if($.pressingSource===t){let e=$.pressed,t=$.grabbed;e===`prev`&&$.hover===`prev`?bn(-1):e===`next`&&$.hover===`next`&&bn(1),$.pressed=`none`,$.pressingSource=null,$.grabbed=!1,$.grabDragOriginWorld=null,$.grabDragOriginCenter=null,$.hover=`none`,$.lastHitActive=!1,t&&(Gn(),Un());return}if($.pendingPressSource===t){$.pendingPressSource=null;return}wn(fn===t?null:fn)}),e.textContent=`Exit VR`,D.xrEnabled=!0,Z.requestAnimationFrame(kn),Z.addEventListener(`end`,()=>{Z=null,Q=null,un=null,dn=null,D.xrEnabled=!1,ge(me,1),wn(null),e.textContent=`Enter VR`,requestAnimationFrame(Vn)})}catch(t){if(console.error(`[XR] Failed to start session:`,t),e.textContent=`XR Error: ${t.message}`,Z)try{Z.end()}catch{}Z=null,setTimeout(()=>{e.textContent=`Enter VR`},4e3)}}function kn(e,t){if(Z){Z.requestAnimationFrame(kn),C(e),An++,e-jn>=1e3&&(Mn=An,An=0,jn=e);try{let e=t.getViewerPose(Q);if(!e)return;let n=J[D.mode];if(!n)return;Cn(t),En(t);let r=B.createCommandEncoder();D.paused||n.compute(r);for(let t=0;t<e.views.length;t++){let i=e.views[t],a=un,o=a.getViewSubImage?a.getViewSubImage(dn,i):a.getSubImage(dn,i);if(!o)continue;let s=o.getViewDescriptor?o.getViewDescriptor():{},c=o.colorTexture.createView(s),l=i.transform.position;F={viewMatrix:new Float32Array(i.transform.inverse.matrix),projMatrix:new Float32Array(i.projectionMatrix),eye:[l.x,l.y,l.z]};let{x:u,y:d,width:f,height:p}=o.viewport;z(f,p),I.needsClear=!0;let m=I.sceneIdx;n.render(r,I.scene[m].createView(),null,t);let h=r.beginRenderPass({colorAttachments:[{view:I.scene[m].createView(),loadOp:`load`,storeOp:`store`}],depthStencilAttachment:{view:I.depth.createView(),depthLoadOp:`load`,depthStoreOp:`store`}});Xe(h,f/p,t),h.end(),zn(r,I.scene[m]);let g=o.colorTexture.format;Bn(r,I.scene[m],c,g,[u,d,f,p])}F=null,B.queue.submit([r.finish()])}catch(e){console.error(`[XR] Frame error:`,e)}}}var An=0,jn=0,Mn=0;function Nn(e,t){console.error(`[sim:${e}]`,t);let n=document.getElementById(`gpu-error-overlay`);n||(n=document.createElement(`div`),n.id=`gpu-error-overlay`,n.style.cssText=`position:fixed;top:60px;left:10px;right:10px;max-height:60vh;overflow:auto;background:rgba(20,0,0,0.92);color:#ff8080;font:11px monospace;padding:10px;border:1px solid #ff4040;border-radius:4px;z-index:9999;white-space:pre-wrap;`,document.body.appendChild(n));let r=new Date().toLocaleTimeString();n.textContent=`[${r}] [sim:${e}] ${t}\n\n`+n.textContent}function Pn(){let e=D.mode;if(J[e])return;let t={boids:Ze,physics:Qe,physics_classic:$e,fluid:et,parametric:tt,reaction:nt};B.pushErrorScope(`validation`),B.pushErrorScope(`internal`),B.pushErrorScope(`out-of-memory`);let n=null;try{n=t[e]()}catch(t){Nn(e,`factory threw: ${t.message}`)}let r=n,i=e,a=e=>{if(Nn(i,e),r&&J[i]===r){try{r.destroy()}catch{}delete J[i]}};B.popErrorScope().then(e=>{e&&a(`OOM: ${e.message}`)}),B.popErrorScope().then(e=>{e&&a(`internal: ${e.message}`)}),B.popErrorScope().then(e=>{e&&a(`validation: ${e.message}`)}),n&&(J[e]=n)}function Fn(){let e=D.mode;J[e]&&(J[e].destroy(),delete J[e]),Pn()}function In(){document.getElementById(`stat-fps`).textContent=`FPS: ${Mn}`;let e=J[D.mode],t=e?e.getCount():`--`;document.getElementById(`stat-count`).textContent=D.mode===`fluid`||D.mode===`reaction`?`Grid: ${t}`:`Particles: ${t}`}function Ln(){let e=document.getElementById(`canvas-container`),t=window.devicePixelRatio||1,n=Math.floor(e.clientWidth*t),r=Math.floor(e.clientHeight*t);(V.width!==n||V.height!==r)&&(V.width=n,V.height=r),z(V.width,V.height)}function Rn(e,t,n){if(I.needsClear)return;let r=D.fx.trailPersistence;if(r<.001)return;B.queue.writeBuffer(I.fadeUBO,0,new Float32Array([r,0,0,0]));let i=B.createBindGroup({layout:I.fadeBGL,entries:[{binding:0,resource:I.scene[t].createView()},{binding:1,resource:I.linSampler},{binding:2,resource:{buffer:I.fadeUBO}}]}),a=e.beginRenderPass({colorAttachments:[{view:I.scene[n].createView(),clearValue:m,loadOp:`clear`,storeOp:`store`}]});a.setPipeline(I.fadePipeline),a.setBindGroup(0,i),a.draw(3),a.end()}function zn(e,t){let n=D.fx;for(let r=0;r<R;r++){let i=r===0?t:I.bloomMips[r-1],a=I.bloomMips[r],o=i.width,s=i.height;B.queue.writeBuffer(I.downsampleUBO[r],0,new Float32Array([1/o,1/s,n.bloomThreshold,r===0?1:0]));let c=B.createBindGroup({layout:I.downsampleBGL,entries:[{binding:0,resource:i.createView()},{binding:1,resource:I.linSampler},{binding:2,resource:{buffer:I.downsampleUBO[r]}}]}),l=e.beginRenderPass({colorAttachments:[{view:a.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}]});l.setPipeline(I.downsamplePipeline),l.setBindGroup(0,c),l.draw(3),l.end()}for(let t=R-1;t>0;t--){let r=I.bloomMips[t],i=I.bloomMips[t-1];B.queue.writeBuffer(I.upsampleUBO[t],0,new Float32Array([1/r.width,1/r.height,n.bloomRadius,0]));let a=B.createBindGroup({layout:I.upsampleBGL,entries:[{binding:0,resource:r.createView()},{binding:1,resource:I.linSampler},{binding:2,resource:{buffer:I.upsampleUBO[t]}}]}),o=e.beginRenderPass({colorAttachments:[{view:i.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:`load`,storeOp:`store`}]});o.setPipeline(I.upsamplePipelineAdditive),o.setBindGroup(0,a),o.draw(3),o.end()}}function Bn(e,t,n,r,i=null){let a=D.fx,o=S(),s=D.mouse,c=new Float32Array(20);c[0]=a.bloomIntensity,c[1]=a.exposure,c[2]=a.vignette,c[3]=a.chromaticAberration,c[4]=a.grading;let l=i?i[2]/i[3]:V.width/V.height,u=D.camera.fov*Math.PI/180,d=ae(),f=F?F.viewMatrix:d.view,p=F?F.projMatrix:M.perspective(u,l,.01,ee),m=s.worldX,h=s.worldY,g=s.worldZ,_=f[0]*m+f[4]*h+f[8]*g+f[12],v=f[1]*m+f[5]*h+f[9]*g+f[13],y=f[2]*m+f[6]*h+f[10]*g+f[14],b=f[3]*m+f[7]*h+f[11]*g+f[15],x=p[0]*_+p[4]*v+p[8]*y+p[12]*b,C=p[1]*_+p[5]*v+p[9]*y+p[13]*b,w=p[3]*_+p[7]*v+p[11]*y+p[15]*b,T=w===0?0:x/w,E=w===0?0:C/w;c[5]=T*.5+.5,c[6]=1-(E*.5+.5),c[7]=s.down?1:0,c[8]=o.primary[0],c[9]=o.primary[1],c[10]=o.primary[2],c[12]=o.accent[0],c[13]=o.accent[1],c[14]=o.accent[2],c[16]=performance.now()*.001,B.queue.writeBuffer(I.compositeUBO,0,c);let O=se(r),k=B.createBindGroup({layout:I.compositeBGL,entries:[{binding:0,resource:t.createView()},{binding:1,resource:I.bloomMips[0].createView()},{binding:2,resource:I.linSampler},{binding:3,resource:{buffer:I.compositeUBO}}]}),A=e.beginRenderPass({colorAttachments:[{view:n,clearValue:{r:0,g:0,b:0,a:1},loadOp:`clear`,storeOp:`store`}]});A.setPipeline(O),A.setBindGroup(0,k),i&&A.setViewport(i[0],i[1],i[2],i[3],0,1),A.draw(3),A.end()}function Vn(e){if(D.xrEnabled)return;requestAnimationFrame(Vn),C(e),Ln(),An++,e-jn>=1e3&&(Mn=An,An=0,jn=e,In());let t=J[D.mode];if(!t)return;let n=D.mode,r=B.createCommandEncoder();try{D.paused||t.compute(r);let e=I.sceneIdx,n=1-e;I.sceneIdx=n,Rn(r,e,n);let i=I.scene[n].createView();t.render(r,i,null),zn(r,I.scene[n]);let a=pe.getCurrentTexture().createView();Bn(r,I.scene[n],a,me),B.queue.submit([r.finish()]),I.needsClear=!1}catch(e){if(Nn(n,`frame threw: ${e.message}`),J[n]===t){try{t.destroy()}catch{}delete J[n]}}}var Hn=`shader-playground-state`;function Un(){try{let e={};for(let t of Object.keys(c))e[t]=E(t);let t={mode:D.mode,colorTheme:D.colorTheme,camera:D.camera,fx:D.fx,...e};localStorage.setItem(Hn,JSON.stringify(t))}catch{}}function Wn(){try{let e=localStorage.getItem(Hn);if(!e)return;let t=JSON.parse(e);t.mode&&t.mode in c&&(D.mode=t.mode),t.colorTheme&&d[t.colorTheme]&&(D.colorTheme=t.colorTheme);for(let e of Object.keys(c))t[e]&&Object.assign(E(e),t[e]);t.camera&&Object.assign(D.camera,t.camera),t.fx&&Object.assign(D.fx,t.fx),w(D.colorTheme)}catch{}}function Gn(){document.querySelectorAll(`.mode-tab`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===D.mode)),document.querySelectorAll(`.param-group`).forEach(e=>e.classList.toggle(`active`,e.dataset.mode===D.mode));for(let e of Object.keys(u)){let t=e,n=document.getElementById(`params-${t}`),r=E(t);n.querySelectorAll(`input[type="range"]`).forEach(e=>{let n=e.dataset.key;if(n&&n in r){e.value=String(r[n]);let i=e.parentElement?.querySelector(`.control-value`);if(i){let e=dt(t,n);i.textContent=lt(Number(r[n]),e?e.step??.01:.01)}}}),n.querySelectorAll(`select`).forEach(e=>{let t=e.dataset.key;t&&t in r&&(e.value=String(r[t]))})}document.querySelectorAll(`#theme-presets .preset-btn`).forEach(e=>e.classList.toggle(`active`,e.dataset.theme===D.colorTheme)),ct()}async function Kn(){await he()&&(Et=Tt.matches,document.body.classList.toggle(`mobile`,Et),Tt.addEventListener(`change`,e=>{let t=e.matches;t!==Et&&(Et=t,document.body.classList.toggle(`mobile`,Et),window.location.reload())}),G(),Ge(),Wn(),Et&&At(),w(D.colorTheme),at(),gt(),mt(),ht(),Et?(Dt(),Ot(),kt()):wt(),zt(),Gn(),Ln(),Pn(),Pt(),new ResizeObserver(()=>Ln()).observe(document.getElementById(`canvas-container`)),requestAnimationFrame(Vn),window.__simDiagnose=()=>{let e=J[D.mode];return e?.diagnose?e.diagnose():Promise.resolve({error:1,msg:`no diagnose on this sim`})},window.__simPreset=e=>{let t=document.querySelectorAll(`button`);for(let n of t)if(n.textContent?.trim()===e)return n.click(),`ok`;return`preset not found`},window.__simState=()=>({mode:D.mode,...D[D.mode],fps:Mn}),window.__simStats=()=>{let e=J[D.mode];return e?.getStats?e.getStats():{error:`no stats on this sim`}})}Kn();
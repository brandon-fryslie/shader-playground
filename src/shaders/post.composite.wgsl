// Final HDR composite: combine scene + bloom, ACES tone-map, color grade, vignette, chromatic aberration,
// and per-attractor interaction reticles.

// [LAW:one-source-of-truth] Screen-space attractor record used only by the composite pass.
// CPU projects each world-space attractor once per frame and packs it here.
struct ReticleAttractor {
  screenPos: vec2f,
  strength: f32,
  _pad: f32,
}

struct CompositeParams {
  bloomIntensity: f32,
  exposure: f32,
  vignette: f32,
  chromaticAberration: f32,
  grading: f32,
  attractorCount: u32,
  _pad0: f32,
  _pad1: f32,
  primary: vec3f,
  _pad3: f32,
  accent: vec3f,
  _pad4: f32,
  interactTime: f32,
  _pad5: f32,
  _pad6: f32,
  _pad7: f32,
  // Attractor array at byte offset 80 (16-aligned).
  attractors: array<ReticleAttractor, 32>,
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
  let dims = vec2f(textureDimensions(sceneTex));
  let aspect = dims.x / dims.y;

  // [LAW:dataflow-not-control-flow] Gravitational lensing accumulates across all active attractors.
  // Each attractor's contribution scales with its strength, so zero-strength slots add nothing.
  var lensOffset = vec2f(0.0);
  for (var i = 0u; i < params.attractorCount; i++) {
    let a = params.attractors[i];
    let toI = a.screenPos - uv;
    let iDist2 = dot(toI, toI) + 0.001;
    let lensStrength = a.strength * 0.0004 / (iDist2 + 0.03);
    lensOffset = lensOffset + toI * lensStrength;
  }
  let sampleUV = uv + lensOffset;

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

  // [LAW:dataflow-not-control-flow] Per-attractor reticle — ring + dot, aspect-corrected for round appearance.
  // `s` is the per-attractor strength in the range [0, interactionStrength ceiling] (up to ~3.0 at max slider),
  // NOT [0, 1]. mix() with s > 1 extrapolates beyond the anchor values, which is intentional: a high-ceiling
  // attractor is genuinely more powerful, so its reticle reads bigger and brighter.
  let pulse = 0.75 + 0.25 * sin(params.interactTime * 5.0);
  var reticleSum = vec3f(0.0);
  for (var i = 0u; i < params.attractorCount; i++) {
    let a = params.attractors[i];
    let s = a.strength;
    // Anchors: s=0 → tiny dim pinpoint (0.012 radius, 0.0018 width, 0.002 dot).
    // s=1 → fully-charged ring at default ceiling (0.035, 0.004, 0.0055). s > 1 extrapolates linearly.
    let ringRadius = mix(0.012, 0.035, s);
    let ringHalfWidth = mix(0.0018, 0.004, s);
    let ringEdge = 0.0015;
    let dotRadius = mix(0.002, 0.0055, s);
    let toRing = (uv - a.screenPos) * vec2f(aspect, 1.0);
    let ringDist = length(toRing);
    let distFromRing = abs(ringDist - ringRadius);
    let ringMask = 1.0 - smoothstep(ringHalfWidth - ringEdge, ringHalfWidth + ringEdge, distFromRing);
    let dotMask = 1.0 - smoothstep(dotRadius * 0.5, dotRadius, ringDist);
    // Brightness anchors: 0.3 at s=0, 1.8 at s=1. Extrapolates for s > 1.
    let brightness = mix(0.3, 1.8, s) * pulse * s;
    reticleSum = reticleSum + params.accent * brightness * (ringMask + dotMask * 2.0);
  }
  ldr = ldr + reticleSum;

  return vec4f(ldr, 1.0);
}

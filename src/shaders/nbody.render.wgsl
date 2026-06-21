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

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  home: vec3f,
  _pad2: f32,
}

// [LAW:one-source-of-truth] blurTime is sim-step-width × baseDt — the world-space time span a single
// display frame represents. 0 for live play or manual stepping (particle renders as a circle).
// Non-zero during skip: particle renders as a velocity-aligned capsule spanning (pos - vel*blurTime, pos).
struct BlurParams {
  blurTime: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
}

// [LAW:one-source-of-truth] World-space attractor field for render-time HDR boost and color tint.
// Packed CPU-side each frame; count u32 in the header, 32 attractor slots, strength already log-normalized
// to [0,1] so the shader just does a linear gaussian sum.
struct FieldAttractor {
  pos: vec3f,
  strengthNorm: f32,
}
struct AttractorField {
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  attractors: array<FieldAttractor, 32>,
}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> blurParams: BlurParams;
@group(0) @binding(3) var<uniform> field: AttractorField;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) speed: f32,
  @location(3) interactProximity: f32,
  // headU: fraction along the along-axis (uv.x space [-1,1]) where the particle's current position
  // sits. At blurTime=0 this is 0 (center) and the quad shades as the original symmetric billboard.
  // During skip this is >0 so intensity peaks at the head and fades toward the tail.
  @location(4) headU: f32,
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

  let headView = camera.view * vec4f(body.pos, 1.0);
  let tailView = camera.view * vec4f(body.pos - body.vel * blurParams.blurTime, 1.0);

  // [LAW:single-enforcer] Mass-to-appearance compression is owned here so physics mass stays authoritative while visuals remain legible.
  let massVisual = clamp(sqrt(max(body.mass, 0.02)) / 1.8, 0.08, 1.0);
  let speed = length(body.vel);

  // Particle radius in view space — scales with depth so on-screen pixel size stays consistent.
  let depth = min(max(abs(headView.z), 0.05), 30.0);
  let pixelScale = 0.0055 * depth * mix(0.6, 3.0, massVisual);

  // Capsule geometry: quad aligned from tail to head in view space, padded by pixelScale on each end
  // (so the rounded caps show up). When tail == head (blurTime=0 or stationary), this collapses to
  // a symmetric 2*pixelScale square — the original billboard.
  let streakView = headView.xy - tailView.xy;
  let streakLen = length(streakView);
  // Small-ε guard so the normalize is stable at zero velocity; the resulting `along` only drives
  // elongation, which is already ~0 in that case.
  let along = select(vec2f(1.0, 0.0), streakView / max(streakLen, 0.0001), streakLen > 0.0001);
  let across = vec2f(-along.y, along.x);

  let centerView = (headView.xy + tailView.xy) * 0.5;
  let halfLength = streakLen * 0.5 + pixelScale;
  let halfWidth = pixelScale;

  let q = quadPos[vid];
  let offsetXY = along * (q.x * halfLength) + across * (q.y * halfWidth);
  // Use head's z/w so depth-sorting of the capsule is consistent with a point at head position.
  let billboarded = vec4f(centerView + offsetXY, headView.z, headView.w);

  var out: VSOut;
  out.pos = camera.proj * billboarded;
  out.uv = q;
  // Head's along-axis position within the quad's [-1,1] uv space. halfLength includes pixelScale padding,
  // so at blurTime=0 the head is at 0 (center). At high blurTime, head approaches +1 (far end).
  out.headU = (streakLen * 0.5) / halfLength;

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

  // [LAW:dataflow-not-control-flow] Attractor-field glow: sum a gaussian contribution from every active
  // attractor. Replaces the legacy single-point interactPos path. Zero-strength attractors naturally
  // contribute zero — no branching. Gaussian radius r0 is in world units.
  let r0 = 1.8;
  let invR2 = 1.0 / (r0 * r0);
  var fieldBoost = 0.0;
  for (var i = 0u; i < field.count; i++) {
    let a = field.attractors[i];
    let d = body.pos - a.pos;
    let g = a.strengthNorm * exp(-dot(d, d) * invR2);
    fieldBoost = fieldBoost + g;
  }
  let proximity = clamp(fieldBoost, 0.0, 1.5);
  col = mix(col, camera.accent * 1.6, clamp(proximity * 0.55, 0.0, 0.8));

  out.color = col;
  out.speed = speed;
  out.interactProximity = proximity;
  return out;
}

@fragment
fn fs_main(
  @location(0) uv: vec2f,
  @location(1) color: vec3f,
  @location(2) speed: f32,
  @location(3) interactProximity: f32,
  @location(4) headU: f32,
) -> @location(0) vec4f {
  // Capsule shading. The vertex stage builds a quad that's a 2x2 square at headU=0 (no blur) and
  // stretches into a long rectangle + two rounded end caps as headU → 1 (high blur). uv space:
  // body occupies |uv.x| <= headU, caps occupy |uv.x| > headU with cap width 1 - headU.

  // Aspect-correct ellipsoid clip on the caps; body always passes. At headU=0 (cap width = 1) this
  // is exactly the original radial discard (uv.x² + uv.y² > 1). [LAW:dataflow-not-control-flow]:
  // one predicate continuous in headU — no select on body-vs-cap.
  let capR = max(0.0001, 1.0 - headU);
  let capDx = max(0.0, abs(uv.x) - headU);
  if ((capDx * capDx) / (capR * capR) + uv.y * uv.y > 1.0) { discard; }

  // Head bead: original radial falloff anchored at the head (uv.x = headU, uv.y = 0). At headU = 0
  // headDist collapses to sqrt(uv.x² + uv.y²) so the unblurred particle renders identically to the
  // pre-anisotropic original.
  let headDx = uv.x - headU;
  let headDist = sqrt(headDx * headDx + uv.y * uv.y);
  let headCore = exp(-headDist * 22.0) * 1.8;
  let headHalo = exp(-headDist * 5.0) * 0.45;

  // Anisotropic trail behind the head. dBehind is along-axis distance from the head toward the
  // tail (0 ahead of head, so the trail never leaks into the head cap). K_along is small enough
  // that the trail stays visible across the full capsule — the old radial exp(-dist*22) decayed
  // to ~3e-9 within 30% of the quad. K_across is large enough to keep the trail's lateral width
  // close to the head bead so the particle reads as a comet, not a horizontal smear.
  let dBehind = max(0.0, -headDx);
  let trailCore = exp(-(dBehind * 1.5 + uv.y * uv.y * 100.0)) * 1.8;
  let trailHalo = exp(-(dBehind * 0.5 + uv.y * uv.y * 25.0)) * 0.45;

  // blurNorm fades the trail in as the capsule actually stretches; at headU = 0 it is zero and the
  // head bead alone renders the particle as a symmetric disc. The shader-debug-6oi.2 `headU > 0`
  // select gate is gone — variability is the smoothstep value, not a branch on geometry.
  let blurNorm = smoothstep(0.3, 0.7, headU);
  let core = max(headCore, trailCore * blurNorm);
  let halo = max(headHalo, trailHalo * blurNorm);

  let intensity = core + halo;
  let whiteShift = clamp(core * 0.06, 0.0, 0.3);
  let tinted = mix(color, vec3f(1.0), whiteShift);

  // Velocity-dependent interaction flare: fast particles near any attractor glow brighter in accent,
  // producing visible tendrils of infalling material. Adds HDR brightness that feeds the bloom pass
  // naturally — no composite overlay required.
  let speedGlow = smoothstep(0.5, 2.5, speed) * interactProximity * 0.45;
  let fieldBrightness = 1.0 + interactProximity * 1.1;

  return vec4f(tinted * (intensity * fieldBrightness + speedGlow), 1.0);
}

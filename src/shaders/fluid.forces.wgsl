struct Params {
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

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let res = i32(params.resolution);
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= res || y >= res) { return; }

  let i = idx(x, y);
  var vel = velIn[i];
  var dye = dyeIn[i];

  // Apply mouse force
  if (params.mouseActive > 0.5) {
    let fx = f32(x) / params.resolution;
    let fy = f32(y) / params.resolution;
    let dx = fx - params.mouseX;
    let dy = fy - params.mouseY;
    let dist2 = dx * dx + dy * dy;
    let radius = 0.02;
    let splat = exp(-dist2 / (2.0 * radius * radius)) * params.forceStrength;
    vel += vec2f(params.mouseDX, params.mouseDY) * splat;

    // Inject dye
    let dyeSplat = exp(-dist2 / (2.0 * radius * radius * 4.0));
    var dyeColor: vec3f;
    if (params.dyeMode < 0.5) {
      // Rainbow based on angle
      let angle = atan2(params.mouseDY, params.mouseDX);
      let h = (angle / 6.283 + 0.5);
      dyeColor = hsvToRgb(h, 0.9, 1.0);
    } else if (params.dyeMode < 1.5) {
      dyeColor = vec3f(0.1, 0.5, 1.0);
    } else {
      // Temperature: red = fast, blue = slow
      let speed = length(vec2f(params.mouseDX, params.mouseDY));
      dyeColor = mix(vec3f(0.2, 0.3, 1.0), vec3f(1.0, 0.2, 0.1), clamp(speed * 5.0, 0.0, 1.0));
    }
    dye += vec4f(dyeColor * dyeSplat, dyeSplat);
  }

  // Semi-Lagrangian advection
  let px = f32(x) - vel.x * params.dt;
  let py = f32(y) - vel.y * params.dt;
  velOut[i] = sampleVel(px, py);
  dyeOut[i] = sampleDye(px, py) * 0.998; // slight dissipation
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

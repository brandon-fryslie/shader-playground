// Gas DKD leapfrog integrator.
//
// Force = PM gravity + grid-pressure. Both inputs are position-only fields
// sampled at the DKD midpoint, so dt negation reverses the step.
// [LAW:one-source-of-truth] Gas uses the same 48-byte Body layout as stars so
// PM deposit/interpolate can consume either population without adapters.

struct Body {
  pos: vec3f,
  mass: f32,
  vel: vec3f,
  _pad: f32,
  _unused: vec3f,
  _pad2: f32,
}

struct Params {
  dt: f32,
  count: u32,
  domainHalf: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read> bodiesIn: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodiesOut: array<Body>;
@group(0) @binding(2) var<storage, read> gravityForce: array<vec4f>;
@group(0) @binding(3) var<storage, read> pressureForce: array<vec4f>;
@group(0) @binding(4) var<uniform> params: Params;

fn wrapPeriodic(p: vec3f) -> vec3f {
  let size = params.domainHalf * 2.0;
  let shifted = p + vec3f(params.domainHalf);
  return shifted - floor(shifted / size) * size - vec3f(params.domainHalf);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  let me = bodiesIn[idx];
  let halfDt = params.dt * 0.5;
  let posHalf = me.pos + me.vel * halfDt;
  let acc = gravityForce[idx].xyz + pressureForce[idx].xyz;
  let velNew = me.vel + acc * params.dt;
  let posNew = wrapPeriodic(posHalf + velNew * halfDt);

  bodiesOut[idx] = Body(posNew, me.mass, velNew, 0.0, vec3f(0.0), 0.0);
}

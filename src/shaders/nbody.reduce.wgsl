// [LAW:one-source-of-truth] Net angular momentum is computed in one place so the disk-recovery layer always reads from a single canonical source.
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

// [LAW:one-source-of-truth] Single fullscreen-quad vertex stage shared by every post-process pass.
// Three-vertex trick: one oversized triangle covers the screen with no index buffer.

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  // (0,0) (2,0) (0,2) → covers (-1,-1)..(3,3) clip; useful UV = (0,0)..(1,1)
  let uv = vec2f(f32((vid << 1u) & 2u), f32(vid & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * 2.0 - 1.0, 0.0, 1.0);
  // Flip Y so UV (0,0) is top-left like screen-space sampling expects.
  out.uv = vec2f(uv.x, 1.0 - uv.y);
  return out;
}

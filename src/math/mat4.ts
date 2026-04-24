import { cross3, dot3, normalize3, sub3 } from './vec3';

// [LAW:one-source-of-truth] Matrix operations live here; render and simulation code import them instead of duplicating math helpers.
export const mat4 = {
  identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  perspective(fovY: number, aspect: number, near: number, far: number) {
    const f = 1.0 / Math.tan(fovY * 0.5);
    const rangeInv = 1.0 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = far * rangeInv;
    out[11] = -1;
    out[14] = near * far * rangeInv;
    return out;
  },

  lookAt(eye: number[], target: number[], up: number[]) {
    const zAxis = normalize3(sub3(eye, target));
    const xAxis = normalize3(cross3(up, zAxis));
    const yAxis = cross3(zAxis, xAxis);
    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -dot3(xAxis, eye), -dot3(yAxis, eye), -dot3(zAxis, eye), 1,
    ]);
  },

  multiply(a: ArrayLike<number>, b: ArrayLike<number>) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1]
          + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
      }
    }
    return out;
  },

  rotateX(m: ArrayLike<number>, angle: number) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const r = mat4.identity();
    r[5] = c; r[6] = s; r[9] = -s; r[10] = c;
    return mat4.multiply(m, r);
  },

  rotateY(m: Float32Array, angle: number): Float32Array {
    const c = Math.cos(angle), s = Math.sin(angle);
    const r = mat4.identity();
    r[0] = c; r[2] = -s; r[8] = s; r[10] = c;
    return mat4.multiply(m, r);
  },

  rotateZ(m: ArrayLike<number>, angle: number) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const r = mat4.identity();
    r[0] = c; r[1] = s; r[4] = -s; r[5] = c;
    return mat4.multiply(m, r);
  },

  translate(m: ArrayLike<number>, x: number, y: number, z: number) {
    const t = mat4.identity();
    t[12] = x; t[13] = y; t[14] = z;
    return mat4.multiply(m, t);
  },
};

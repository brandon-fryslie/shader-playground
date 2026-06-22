// Foundational 3-vector primitives the input adapter needs to derive palm
// normal, grip contacts, and the advisory ray from raw joint positions. The
// epic binds avp-gestures to depend on nothing but WebXR types, so the package
// owns these rather than reaching into the app's math. [LAW:one-way-deps] They
// are pure, total functions over plain number triples — near-zero carrying cost.
// [LAW:carrying-cost]

export function normalize3(v: number[]): number[] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

export function cross3(a: number[], b: number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function sub3(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dot3(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

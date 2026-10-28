/*
  The little matrix maths the scene needs, column-major as WebGL takes it: a perspective with a lens shift, a camera
  looking at a point, and projecting points to the screen and taps back into the world.
*/
export type Vector = [number, number, number];
export type Matrix = Float32Array;

export const add = (a: Vector, b: Vector): Vector => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vector, by: number): Vector => [a[0] * by, a[1] * by, a[2] * by];
const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const normalise = (a: Vector): Vector => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/**
 * A perspective whose picture is shifted by (shiftAcross, shiftUp) in screen halves, as an architect's camera shifts
 * its lens: the lines keep their vanishing point, and the point moves.
 */
export function perspective(fovY: number, aspect: number, near: number, far: number, shiftAcross: number, shiftUp: number): Matrix {
  const focal = 1 / Math.tan(fovY / 2);
  const matrix = new Float32Array(16);
  matrix[0] = focal / aspect;
  matrix[5] = focal;
  matrix[8] = -shiftAcross;
  matrix[9] = -shiftUp;
  matrix[10] = (far + near) / (near - far);
  matrix[11] = -1;
  matrix[14] = (2 * far * near) / (near - far);
  return matrix;
}

export function lookAt(eye: Vector, target: Vector, up: Vector = [0, 1, 0]): Matrix {
  const back = normalise(subtract(eye, target));
  const right = normalise(cross(up, back));
  const upward = cross(back, right);
  return new Float32Array([
    right[0], upward[0], back[0], 0,
    right[1], upward[1], back[1], 0,
    right[2], upward[2], back[2], 0,
    -dot(right, eye), -dot(upward, eye), -dot(back, eye), 1,
  ]);
}

export function multiply(a: Matrix, b: Matrix): Matrix {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++)
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  return out;
}

/** A 4x4 inverse, for turning a tap back into a ray. */
export function invert(m: Matrix): Matrix {
  const inv = new Float32Array(16);
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
  const determinant = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  for (let index = 0; index < 16; index++) inv[index] /= determinant || 1;
  return inv;
}

/** A world point on the screen, in CSS pixels, with its depth w; null behind the camera. */
export function project(viewProjection: Matrix, point: Vector, width: number, height: number) {
  const [x, y, z] = point;
  const m = viewProjection;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 0.0001) return null;
  const clipX = m[0] * x + m[4] * y + m[8] * z + m[12];
  const clipY = m[1] * x + m[5] * y + m[9] * z + m[13];
  return { x: ((clipX / w + 1) / 2) * width, y: ((1 - clipY / w) / 2) * height, w };
}

/** The ray from the camera through a point on the screen. */
export function rayThrough(inverseViewProjection: Matrix, x: number, y: number, width: number, height: number) {
  const ndcX = (x / width) * 2 - 1;
  const ndcY = 1 - (y / height) * 2;
  const unproject = (ndcZ: number): Vector => {
    const m = inverseViewProjection;
    const w = m[3] * ndcX + m[7] * ndcY + m[11] * ndcZ + m[15];
    return [
      (m[0] * ndcX + m[4] * ndcY + m[8] * ndcZ + m[12]) / w,
      (m[1] * ndcX + m[5] * ndcY + m[9] * ndcZ + m[13]) / w,
      (m[2] * ndcX + m[6] * ndcY + m[10] * ndcZ + m[14]) / w,
    ];
  };
  const from = unproject(-1);
  const to = unproject(1);
  return { from, direction: normalise(subtract(to, from)) };
}

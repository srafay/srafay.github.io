/*
  Points and the little arithmetic the agent needs. Stage space is CSS pixels, x to the right, y up from the bottom of
  the screen, z toward the reader.
*/

export type Point = { x: number; y: number; z: number };

export const point = (x = 0, y = 0, z = 0): Point => ({ x, y, z });

export const copyPoint = (each: Point): Point => ({ ...each });

export const distance = (first: Point, second: Point) =>
  Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);

export const lerp = (from: number, to: number, share: number) => from + (to - from) * share;

export const lerpPoint = (from: Point, to: Point, share: number): Point => ({
  x: lerp(from.x, to.x, share),
  y: lerp(from.y, to.y, share),
  z: lerp(from.z, to.z, share),
});

export function normalise(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export const subtract = (first: Point, second: Point): Point => ({
  x: first.x - second.x,
  y: first.y - second.y,
  z: first.z - second.z,
});

export const add = (first: Point, second: Point): Point => ({
  x: first.x + second.x,
  y: first.y + second.y,
  z: first.z + second.z,
});

export const scale = (vector: Point, by: number): Point => ({ x: vector.x * by, y: vector.y * by, z: vector.z * by });

export const dot = (first: Point, second: Point) => first.x * second.x + first.y * second.y + first.z * second.z;

export const cross = (first: Point, second: Point): Point => ({
  x: first.y * second.z - first.z * second.y,
  y: first.z * second.x - first.x * second.z,
  z: first.x * second.y - first.y * second.x,
});

/** Turned about the vertical axis: positive turns the reader's side (+z) toward +x. */
export const turnedAboutUp = (vector: Point, angle: number): Point => ({
  x: vector.x * Math.cos(angle) + vector.z * Math.sin(angle),
  y: vector.y,
  z: -vector.x * Math.sin(angle) + vector.z * Math.cos(angle),
});

/** Turned about the across axis: positive tips the reader's side (+z) up. */
export const tippedUp = (vector: Point, angle: number): Point => ({
  x: vector.x,
  y: vector.y * Math.cos(angle) + vector.z * Math.sin(angle),
  z: -vector.y * Math.sin(angle) + vector.z * Math.cos(angle),
});

/** Turned in the screen's plane: positive is counterclockwise as the reader sees it. */
export const turnedInPlane = (vector: Point, angle: number): Point => ({
  x: vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
  y: vector.x * Math.sin(angle) + vector.y * Math.cos(angle),
  z: vector.z,
});

/** A point on a quadratic curve from one point to another, bowed through a middle control point. */
export function alongCurve(from: Point, control: Point, to: Point, share: number): Point {
  const rest = 1 - share;
  return {
    x: rest * rest * from.x + 2 * rest * share * control.x + share * share * to.x,
    y: rest * rest * from.y + 2 * rest * share * control.y + share * share * to.y,
    z: rest * rest * from.z + 2 * rest * share * control.z + share * share * to.z,
  };
}

/** The smallest box around some points, in stage space, grown by a margin. */
export function boundsOf(points: Point[], margin = 0) {
  let left = Infinity;
  let right = -Infinity;
  let bottom = Infinity;
  let top = -Infinity;
  for (const each of points) {
    left = Math.min(left, each.x);
    right = Math.max(right, each.x);
    bottom = Math.min(bottom, each.y);
    top = Math.max(top, each.y);
  }
  return { left: left - margin, right: right + margin, bottom: bottom - margin, top: top + margin };
}

export type Bounds = ReturnType<typeof boundsOf>;

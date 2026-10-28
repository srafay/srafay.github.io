/*
  The python's spine: a fixed number of points from the tail (first) to the neck (last), in stage space. Stage space
  is CSS pixels, x to the right, y up from the bottom of the screen, z toward the reader. Every pose, trick and the
  grab write a spine, so any two can be blended point by point. The head sits on the last point.
*/

export type Point = { x: number; y: number; z: number };

/** How many points the body is made of. */
export const SPINE_POINTS = 40;

export type Spine = Point[];

export const point = (x = 0, y = 0, z = 0): Point => ({ x, y, z });

export const copySpine = (spine: Spine): Spine => spine.map((each) => ({ ...each }));

export const distance = (first: Point, second: Point) =>
  Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);

export const lerp = (from: number, to: number, share: number) => from + (to - from) * share;

export const lerpPoint = (from: Point, to: Point, share: number): Point => ({
  x: lerp(from.x, to.x, share),
  y: lerp(from.y, to.y, share),
  z: lerp(from.z, to.z, share),
});

/** Each point moved part of the way toward another spine. Weights may differ along the body. */
export function blendSpines(from: Spine, to: Spine, share: number | ((index: number) => number)): Spine {
  return from.map((each, index) =>
    lerpPoint(each, to[index], typeof share === "number" ? share : share(index)),
  );
}

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

/** A point on a Catmull-Rom curve through four points, at a share from the second to the third. */
function catmullRom(before: Point, from: Point, to: Point, after: Point, share: number): Point {
  const along = (key: keyof Point) => {
    const p0 = before[key];
    const p1 = from[key];
    const p2 = to[key];
    const p3 = after[key];
    return (
      0.5 *
      (2 * p1 +
        (-p0 + p2) * share +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * share * share +
        (-p0 + 3 * p1 - 3 * p2 + p3) * share * share * share)
    );
  };
  return { x: along("x"), y: along("y"), z: along("z") };
}

/** A smooth path through its control points, sampled finely. */
function smoothPath(controls: Point[], samplesPerSpan = 24): Point[] {
  if (controls.length < 2) return controls.map((each) => ({ ...each }));
  const path: Point[] = [];
  for (let span = 0; span < controls.length - 1; span++) {
    const before = controls[Math.max(0, span - 1)];
    const after = controls[Math.min(controls.length - 1, span + 2)];
    for (let step = 0; step < samplesPerSpan; step++)
      path.push(catmullRom(before, controls[span], controls[span + 1], after, step / samplesPerSpan));
  }
  path.push({ ...controls[controls.length - 1] });
  return path;
}

/**
 * The body laid along a path drawn from the head back toward the tail: the neck sits on the first control point and
 * the body runs back along the path for exactly its length. A path shorter than the body is carried on straight, so
 * the python never stretches or shrinks between poses.
 */
export function spineAlong(headFirstControls: Point[], bodyLength: number): Spine {
  const path = smoothPath(headFirstControls);
  const step = bodyLength / (SPINE_POINTS - 1);
  const headFirst: Point[] = [{ ...path[0] }];
  let travelled = 0;
  let wanted = step;
  for (let index = 1; index < path.length && headFirst.length < SPINE_POINTS; index++) {
    const from = path[index - 1];
    const to = path[index];
    const span = distance(from, to);
    while (span > 0 && travelled + span >= wanted && headFirst.length < SPINE_POINTS) {
      headFirst.push(lerpPoint(from, to, (wanted - travelled) / span));
      wanted += step;
    }
    travelled += span;
  }
  // Carried on straight past the end of the path.
  while (headFirst.length < SPINE_POINTS) {
    const last = headFirst[headFirst.length - 1];
    const before = headFirst[headFirst.length - 2] ?? subtract(last, point(1, 0, 0));
    headFirst.push(add(last, scale(normalise(subtract(last, before)), step)));
  }
  return headFirst.reverse();
}

/** The direction the body runs at a point, toward the head. */
export function tangentAt(spine: Spine, index: number): Point {
  const ahead = spine[Math.min(spine.length - 1, index + 1)];
  const behind = spine[Math.max(0, index - 1)];
  return normalise(subtract(ahead, behind));
}

/** The smallest box around the spine, in stage space. */
export function boundsOf(spine: Spine) {
  let left = Infinity;
  let right = -Infinity;
  let bottom = Infinity;
  let top = -Infinity;
  for (const each of spine) {
    left = Math.min(left, each.x);
    right = Math.max(right, each.x);
    bottom = Math.min(bottom, each.y);
    top = Math.max(top, each.y);
  }
  return { left, right, bottom, top };
}

/** Which point of the spine lies nearest a place on the screen (z ignored). */
export function nearestIndex(spine: Spine, x: number, y: number) {
  let best = 0;
  let bestDistance = Infinity;
  spine.forEach((each, index) => {
    const away = Math.hypot(each.x - x, each.y - y);
    if (away < bestDistance) {
      bestDistance = away;
      best = index;
    }
  });
  return { index: best, distance: bestDistance };
}

/*
  Where every moment of the life sits in four dimensions, and how four dimensions are seen in three. Each assumption
  is one function here, so changing one changes one line:

  - time is w, exactly and evenly: now at +W, 2014 at -W;
  - a world's orbit at a moment is a circle, none at all now and widest in 2014, so the present is one point;
  - each world turns its circles in a plane of its own, and the plane leans a little further each year;
  - a world's line winds once round its orbit each year, January at its own starting angle;
  - the reader's turn is a product of plain rotations in the planes of two axes;
  - four dimensions become three by perspective from an eye on the w axis, beyond 2014.
*/
import { FIRST_YEAR } from "@/lib/about-cv/time";
import { worldIndex, type WorldKey } from "@/lib/about-cv/worlds";

/** A point in four dimensions: x, y, z and w. */
export type Point4 = [number, number, number, number];

/** How far from the middle now and 2014 stand along w. */
export const TIME_REACH_IN_W = 0.8;
/** How far the eye stands from the middle along w, on the side of 2014. It is well beyond every point, however turned. */
export const EYE_DISTANCE_IN_W = 3.5;

const clamp = (value: number, lowest: number, highest: number) =>
  Math.min(highest, Math.max(lowest, value));

/** How long ago a moment is, as a share of the life drawn: 0 now, 1 in 2014. */
export const ageShare = (time: number, present: number) =>
  clamp((present - time) / (present - FIRST_YEAR), 0, 1);

/** Time is w: now at +W, 2014 at -W, evenly in between. */
export const wOfTime = (time: number, present: number) =>
  TIME_REACH_IN_W * (1 - 2 * ageShare(time, present));

/** The moment a w stands for. */
export const timeOfW = (w: number, present: number) =>
  present - ((1 - w / TIME_REACH_IN_W) / 2) * (present - FIRST_YEAR);

/**
  How wide a world's orbit is at a moment. None now, so every world starts at the present's one point. Widest in
  2014. The square root gives the crowded last two years room near the point.
*/
export const orbitRadius = (time: number, present: number) =>
  Math.sqrt(ageShare(time, present));

/** How far each world's plane leans from level, and how far it turns about the upright across the whole life. */
const PLANE_LEAN = (50 * Math.PI) / 180;
const PLANE_DRIFT_ACROSS_THE_LIFE = (60 * Math.PI) / 180;
/** Each world's line starts its year at an angle of its own, so January never lines up across the worlds. */
const JANUARY_STEP = 1.3;

type Vector3 = [number, number, number];

const normalised = ([x, y, z]: Vector3): Vector3 => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

const cross = ([ax, ay, az]: Vector3, [bx, by, bz]: Vector3): Vector3 => [
  ay * bz - az * by,
  az * bx - ax * bz,
  ax * by - ay * bx,
];

/** Turns a vector about the upright axis by an angle. */
const aboutUpright = ([x, y, z]: Vector3, angle: number): Vector3 => [
  x * Math.cos(angle) + z * Math.sin(angle),
  y,
  -x * Math.sin(angle) + z * Math.cos(angle),
];

/**
  The plane a world's orbits lie in at a moment, as two unit vectors across it. The five worlds lean the same way
  from level, each turned a fifth of the way round from the last, like the points of a crown. Over the years each
  plane turns a little about the upright, so a world's orbits twist as they grow.
*/
export function worldPlane(world: WorldKey, time: number, present: number) {
  const turnRound = (worldIndex(world) * 2 * Math.PI) / 5;
  const normal: Vector3 = [
    Math.sin(PLANE_LEAN) * Math.cos(turnRound),
    Math.cos(PLANE_LEAN),
    Math.sin(PLANE_LEAN) * Math.sin(turnRound),
  ];
  const across = normalised(cross([0, 1, 0], normal));
  const along = normalised(cross(normal, across));
  const drift = PLANE_DRIFT_ACROSS_THE_LIFE * ageShare(time, present);
  return { across: aboutUpright(across, drift), along: aboutUpright(along, drift) };
}

/** A point on a world's orbit at a moment, at an angle round it. */
export function orbitPoint(
  world: WorldKey,
  time: number,
  angle: number,
  present: number,
): Point4 {
  const radius = orbitRadius(time, present);
  const { across, along } = worldPlane(world, time, present);
  const cos = Math.cos(angle) * radius;
  const sin = Math.sin(angle) * radius;
  return [
    across[0] * cos + along[0] * sin,
    across[1] * cos + along[1] * sin,
    across[2] * cos + along[2] * sin,
    wOfTime(time, present),
  ];
}

/** Where a world's line stands in its yearly turn at a moment: once round a year, January at the world's own angle. */
export const lineAngle = (world: WorldKey, time: number) =>
  2 * Math.PI * (time - FIRST_YEAR) + worldIndex(world) * JANUARY_STEP;

/** A point on a world's line: its orbit at that moment, at that moment's place in the year. */
export const linePoint = (world: WorldKey, time: number, present: number) =>
  orbitPoint(world, time, lineAngle(world, time), present);

/** The present: the one point every world starts from. */
export const presentPoint = (present: number): Point4 => [0, 0, 0, wOfTime(present, present)];

/** The years stand on a spine straight up from the middle, each at the size of its orbits. */
export const yearPoint = (time: number, present: number): Point4 => [
  0,
  orbitRadius(time, present),
  0,
  wOfTime(time, present),
];

/** The cities stand on the spine straight down, each at the middle of the years spent there. */
export const cityPoint = (time: number, present: number): Point4 => [
  0,
  -orbitRadius(time, present),
  0,
  wOfTime(time, present),
];

/** A level circle at a moment, for the moves between cities. */
export const levelCirclePoint = (time: number, angle: number, present: number): Point4 => {
  const radius = orbitRadius(time, present);
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius, wOfTime(time, present)];
};

/*
  The reader's turn. A 4x4 rotation is the product of rotations in planes of two axes. Turns in the xw, yw and zw
  planes swing time into space. The idle turn is in the xz plane, a turntable about the upright.
*/
export type Plane = "xy" | "xz" | "yz" | "xw" | "yw" | "zw";

const AXIS = { x: 0, y: 1, z: 2, w: 3 } as const;

/** A 4x4 matrix, row by row: entry (row, column) at row * 4 + column. */
export type Matrix4D = Float64Array;

export const identity4 = (): Matrix4D => {
  const matrix = new Float64Array(16);
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  return matrix;
};

/** The rotation by an angle in one plane. */
export function planeRotation(plane: Plane, angle: number): Matrix4D {
  const matrix = identity4();
  const first = AXIS[plane[0] as keyof typeof AXIS];
  const second = AXIS[plane[1] as keyof typeof AXIS];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  matrix[first * 4 + first] = cos;
  matrix[first * 4 + second] = -sin;
  matrix[second * 4 + first] = sin;
  matrix[second * 4 + second] = cos;
  return matrix;
}

/** The product a b: b is applied first. */
export function multiply4(a: Matrix4D, b: Matrix4D): Matrix4D {
  const product = new Float64Array(16);
  for (let row = 0; row < 4; row++)
    for (let column = 0; column < 4; column++) {
      let sum = 0;
      for (let step = 0; step < 4; step++) sum += a[row * 4 + step] * b[step * 4 + column];
      product[row * 4 + column] = sum;
    }
  return product;
}

/** The reader's turn: four angles in radians. */
export type Turn = { spin: number; xw: number; yw: number; zw: number };

/**
  The turn as one matrix. The turntable spin comes first, about the upright through the present, so it turns the
  worlds round the time axis and the object stays in place. Then zw, yw and xw swing time into space.
*/
export function turnMatrix(turn: Turn): Matrix4D {
  return [
    planeRotation("xw", turn.xw),
    planeRotation("yw", turn.yw),
    planeRotation("zw", turn.zw),
    planeRotation("xz", turn.spin),
  ].reduce((product, next) => multiply4(product, next));
}

/** A point turned. */
export function turned(matrix: Matrix4D, [x, y, z, w]: Point4): Point4 {
  return [0, 1, 2, 3].map(
    (row) =>
      matrix[row * 4] * x + matrix[row * 4 + 1] * y + matrix[row * 4 + 2] * z + matrix[row * 4 + 3] * w,
  ) as Point4;
}

/** How much nearer or further a point stands to the eye along w: its picture grows or shrinks by this. */
export const perspectiveScale = (w: number) => EYE_DISTANCE_IN_W / (EYE_DISTANCE_IN_W + w);

/** Four dimensions seen in three: a perspective from the eye on the w axis. */
export function seenInThree([x, y, z, w]: Point4): [number, number, number] {
  const scale = perspectiveScale(w);
  return [x * scale, y * scale, z * scale];
}

/** How far the time axis has turned away from w, in degrees: 0 at no turn, 90 when time lies wholly in space. */
export const angleThroughW = (matrix: Matrix4D) =>
  (Math.acos(clamp(matrix[15], -1, 1)) * 180) / Math.PI;

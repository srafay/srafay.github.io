/*
  Where the object stands in three dimensions after its turn, so the camera can hold it. The bound is taken from the
  orbits themselves: a few points round each world's orbit at a few moments, turned and seen in three. As the object
  turns through w its years swing apart and the bound grows, and the camera eases back to keep it all in view. During
  the unfold only the years already reached count, so the first months fill the screen and the camera pulls back as
  the years arrive.
*/
import { FIRST_YEAR } from "@/lib/about-cv/time";
import { worlds } from "@/lib/about-cv/worlds";
import { orbitPoint, presentPoint, seenInThree, turned, type Matrix4D } from "@/lib/hypercube/space";

export type Bound = { centre: [number, number, number]; radius: number };

/** How many moments, and how many points round each orbit, are sampled to bound the object. */
const MOMENTS = 8;
const POINTS_ROUND = 10;
/** The smallest bound framed, so the opening point grows on the screen before the camera starts to pull back. */
export const SMALLEST_FRAMED_RADIUS = 0.3;
/** Room kept round the present, in units of the object, so its glow is never cut by the screen's edge. */
const PRESENT_ROOM = 0.2;

/** The bound of the years from now back to the front, for a turn. */
export function boundOf(matrix: Matrix4D, front: number, present: number): Bound {
  const oldest = Math.max(FIRST_YEAR, Math.min(front, present));
  const lowest = [Infinity, Infinity, Infinity];
  const highest = [-Infinity, -Infinity, -Infinity];
  const include = (point: [number, number, number]) => {
    for (let axis = 0; axis < 3; axis++) {
      lowest[axis] = Math.min(lowest[axis], point[axis]);
      highest[axis] = Math.max(highest[axis], point[axis]);
    }
  };
  for (let moment = 0; moment <= MOMENTS; moment++) {
    // The older moments matter most, being widest, so the samples crowd toward the oldest.
    const share = Math.sqrt(moment / MOMENTS);
    const time = present - (present - oldest) * share;
    for (const world of worlds)
      for (let step = 0; step < POINTS_ROUND; step++)
        include(seenInThree(turned(matrix, orbitPoint(world.key, time, (step / POINTS_ROUND) * Math.PI * 2, present))));
  }
  const presentSeen = seenInThree(turned(matrix, presentPoint(present)));
  for (const shift of [-PRESENT_ROOM, PRESENT_ROOM]) {
    include([presentSeen[0] + shift, presentSeen[1], presentSeen[2]]);
    include([presentSeen[0], presentSeen[1] + shift, presentSeen[2]]);
  }
  const centre = [0, 1, 2].map((axis) => (lowest[axis] + highest[axis]) / 2) as [number, number, number];
  const radius = Math.max(...[0, 1].map((axis) => (highest[axis] - lowest[axis]) / 2));
  return { centre, radius };
}

/** Where the object's middle sits on the screen, as shares across and down, and how much of the screen it fills. */
export type ScreenPlace = { across: number; down: number; fillWidth: number; fillHeight: number };

/** A phone holds the object in its middle, a little low, under the name. A computer holds it right of the name. */
export function screenPlaceFor(width: number, height: number): ScreenPlace {
  const portrait = height > width;
  if (portrait) return { across: 0.5, down: 0.58, fillWidth: 0.86, fillHeight: 0.6 };
  return { across: 0.665, down: 0.52, fillWidth: 0.6, fillHeight: 0.86 };
}

/** How far the camera stands from a ball of a radius so it fills the share of the screen asked for. */
export function distanceToFrame(radius: number, verticalFieldDegrees: number, aspect: number, place: ScreenPlace) {
  const halfHeight = Math.tan((verticalFieldDegrees * Math.PI) / 360);
  const byHeight = radius / (halfHeight * place.fillHeight);
  const byWidth = radius / (halfHeight * aspect * place.fillWidth);
  return Math.max(byHeight, byWidth);
}

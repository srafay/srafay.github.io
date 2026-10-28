/*
  The knot: the middle of the body is drawn toward an overhand knot (a trefoil, opened) and back. Not simulated: the
  knot's shape is made once for the body's length, then blended in, held, and blended out.
*/
import { distance, lerpPoint, point, type Point, type Spine } from "./spine";

/** Which stretch of the body ties the knot: most of it, so each loop is wide enough to see through. */
const FIRST_POINT = 5;
const LAST_POINT = 33;

/** The trefoil knot at a turn, before scaling. */
const trefoil = (turn: number): Point =>
  point(
    Math.sin(turn) + 2 * Math.sin(2 * turn),
    Math.cos(turn) - 2 * Math.cos(2 * turn),
    -Math.sin(3 * turn),
  );

/** The knot's points, spaced evenly along it, scaled so it is as long as the stretch of body that ties it. */
export function knotShape(stretchLength: number, count: number): Point[] {
  const fine: Point[] = [];
  const start = 0.35;
  const end = Math.PI * 2 - 0.35;
  for (let step = 0; step <= 600; step++) fine.push(trefoil(start + ((end - start) * step) / 600));
  let total = 0;
  for (let index = 1; index < fine.length; index++) total += distance(fine[index - 1], fine[index]);
  const evenly: Point[] = [fine[0]];
  let travelled = 0;
  let wanted = total / (count - 1);
  for (let index = 1; index < fine.length && evenly.length < count; index++) {
    const span = distance(fine[index - 1], fine[index]);
    while (travelled + span >= wanted && evenly.length < count) {
      evenly.push(lerpPoint(fine[index - 1], fine[index], (wanted - travelled) / span));
      wanted += total / (count - 1);
    }
    travelled += span;
  }
  while (evenly.length < count) evenly.push(fine[fine.length - 1]);
  const scaleBy = stretchLength / total;
  return evenly.map((each) => point(each.x * scaleBy, each.y * scaleBy, each.z * scaleBy * 1.4));
}

/** How far into the knot the body is at a share of the trick: in, held, out. */
export function knotWeight(share: number) {
  if (share < 0.3) return easeInOut(share / 0.3);
  if (share < 0.7) return 1;
  return easeInOut(1 - (share - 0.7) / 0.3);
}

const easeInOut = (share: number) => share * share * (3 - 2 * share);

/** The spine with its middle tied by a weight from 0 to 1. The knot sits where that stretch was, lifted off the floor. */
export function tieKnot(spine: Spine, weight: number, bodyLength: number): Spine {
  if (weight <= 0) return spine;
  const count = LAST_POINT - FIRST_POINT + 1;
  const link = bodyLength / (spine.length - 1);
  const shape = knotShape(link * (count - 1), count);
  let centreX = 0;
  let centreY = 0;
  for (let index = FIRST_POINT; index <= LAST_POINT; index++) {
    centreX += spine[index].x / count;
    centreY += spine[index].y / count;
  }
  const lift = bodyLength * 0.12;
  return spine.map((each, index) => {
    if (index < FIRST_POINT - 3 || index > LAST_POINT + 3) return each;
    const inside = Math.min(Math.max(index - FIRST_POINT, 0), count - 1);
    const knotPoint = shape[inside];
    const target = point(centreX + knotPoint.x, centreY + lift + knotPoint.y, each.z + knotPoint.z);
    // The ends of the stretch ease in, so the knot joins the rest of the body without a kink.
    const edge = Math.min(index - (FIRST_POINT - 3), LAST_POINT + 3 - index) / 4;
    return lerpPoint(each, target, weight * Math.min(1, Math.max(0, edge)));
  });
}

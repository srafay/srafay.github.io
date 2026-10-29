/*
  Where the agent rests and how its graph lies there. A home gives the router's centre, its radius, how open the fan
  is and which way it opens. The fan is the tools' places round the router before attention turns it: under the router
  in the open, and on its side in the den, the router at the strip's left and the tools opening right toward its
  bubble, since the strip is wide and short. Each home is one function, so moving one changes one place.
*/
import { denRadius, helloRadiusOnComputer, helloRadiusOnPhone, marginFit, shape, sideMargin } from "./proportions";
import { NODE_COUNT, nodeOfTool } from "./topology";
import { boundsOf, lerp, lerpPoint, point, turnedInPlane, type Point } from "./vectors";

/** Where the agent rests: the first screen, a side margin on a computer, or the den along a phone's bottom. */
export type Home = "hello" | "left" | "right" | "den";

/** What the homes need to know about the screen. */
export type Stage = {
  width: number;
  height: number;
  /** A phone-sized screen: narrower than 700 CSS pixels. */
  narrow: boolean;
  /** A screen with no side margin to rest in, under 900 CSS pixels: the agent rests in the den, the bottom strip. */
  den: boolean;
  /** How tall the bottom strip is, from the screen's bottom edge. */
  denTop: number;
  /** Where the den's floor is, above the screen's bottom edge and any safe area. */
  denFloor: number;
};

/**
 * A home: the router's centre, its radius, how folded the fan is (0 open, 1 folded), and how far the fan is turned
 * from hanging under the router, in radians counterclockwise (a quarter turn opens it to the right).
 */
export type Place = { router: Point; radius: number; folded: number; turn: number };

/** The den's fan opens to the right: a quarter turn. */
const DEN_TURN = Math.PI / 2;

/** The fan folded on its side, opening toward one side (1 right, -1 left), as in the den: out of a cord's way. */
export const turnOpening = (side: 1 | -1) => side * DEN_TURN;

/** The largest the router gets on this screen: the first screen's size, which the canvas is made for. */
export const largestRadius = (stage: Stage) =>
  stage.narrow || stage.den ? helloRadiusOnPhone(stage.width) : helloRadiusOnComputer(stage.width);

/** The first screen: large, in the open. On a phone in the lower half, right of centre; on a computer under "Syed". */
function helloPlace(stage: Stage): Place {
  const radius = largestRadius(stage);
  const across = stage.den ? stage.width * 0.6 : stage.width * 0.2;
  const above = stage.den ? 12 : 30;
  return { router: point(across, stage.denTop + above + depthBelow(radius, 0), 0), radius, folded: 0, turn: 0 };
}

/** A computer's side margin, low in it, its size fitted to the margin. */
function marginPlace(stage: Stage, side: "left" | "right"): Place {
  const { radius, folded } = marginFit(stage.width);
  const margin = sideMargin(stage.width);
  const across = side === "left" ? margin / 2 : stage.width - margin / 2;
  return { router: point(across, stage.denTop + 30 + depthBelow(radius, folded ? 1 : 0), 0), radius, folded: folded ? 1 : 0, turn: 0 };
}

/** The den: folded compact and on its side at the strip's left, every cell of it under the strip's top. */
function denPlace(stage: Stage): Place {
  const radius = denRadius(stage.denTop, stage.denFloor);
  const extent = fanExtent(radius, 1, DEN_TURN);
  const router = point(16 - extent.left, stage.denFloor + 4 - extent.bottom, 0);
  return { router, radius, folded: 1, turn: DEN_TURN };
}

/** How far the folded or open fan reaches round its router, the router and every tool with its size included. */
export function fanExtent(radius: number, folded: number, turn: number) {
  const toolReach = shape.toolSize * radius * lerp(1, shape.foldedToolScale, folded);
  const points = [point(-radius, -radius), point(radius, radius)];
  for (const offset of fanOffsets(radius, folded, turn))
    points.push(point(offset.x - toolReach, offset.y - toolReach), point(offset.x + toolReach, offset.y + toolReach));
  return boundsOf(points);
}

export function placeOf(stage: Stage, home: Home): Place {
  if (home === "hello") return helloPlace(stage);
  if (home === "den") return denPlace(stage);
  return marginPlace(stage, home);
}

/** How far the fan reaches under the router's centre, in CSS pixels, when it hangs under it. */
export const depthBelow = (radius: number, folded: number) => -fanExtent(radius, folded, 0).bottom;

/** The den's room right of the folded agent, where its asides and a chart go: from its left edge, up from the bottom. */
export function denRoomLeft(stage: Stage) {
  const { router, radius, turn } = denPlace(stage);
  return router.x + fanExtent(radius, 1, turn).right + 12;
}

/** How far the fan is from lying on its side: 1 under the router, 0 in the den's quarter turn. */
export const opennessOf = (turn: number) => 1 - Math.min(1, Math.abs(turn) / (Math.PI / 2));

/** The route's cone, out of the fan: over the router at an angle from straight up, on a short link. */
export function conePlace(radius: number, aim: number): Point {
  const length = shape.coneLinkLength * radius;
  return point(Math.sin(aim) * length, Math.cos(aim) * length, radius * 0.5);
}

/** Evenly spread places under the router for some tools, alternately nearer and further, in front and behind. */
function spreadUnder(count: number, spread: number, length: number, depth: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const degrees = -spread / 2 + (spread / (count - 1)) * index;
    const angle = (degrees * Math.PI) / 180;
    const reach = length * (1 + (index % 2 === 0 ? -shape.linkStagger : shape.linkStagger));
    return point(Math.sin(angle) * reach, -Math.cos(angle) * reach, index % 2 === 0 ? depth : -depth);
  });
}

/**
 * Each tool's place round the router, before attention leans or turns it. Open, the five other tools fan out under the
 * router and the route's cone sits over it, where it can aim; on its side in the den, all six lie in one fan opening
 * right. Folding shortens the links and closes the fan; a turn swings it round the router.
 */
export function fanOffsets(radius: number, folded: number, turn = 0): Point[] {
  const spread = lerp(shape.openSpread, shape.foldedSpread, folded);
  const length = lerp(shape.openLinkLength, shape.foldedLinkLength, folded) * radius;
  const depth = lerp(shape.openDepth, shape.foldedDepth, folded) * radius;
  const route = nodeOfTool("route") - 1;
  const six = spreadUnder(NODE_COUNT - 1, spread, length, depth);
  const five = spreadUnder(NODE_COUNT - 2, spread, length, depth);
  five.splice(route, 0, conePlace(radius, Math.PI * 0.2));
  const openness = opennessOf(turn);
  return six.map((each, index) => turnedInPlane(lerpPoint(each, five[index], openness), turn));
}

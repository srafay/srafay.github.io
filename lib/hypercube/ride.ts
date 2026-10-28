/*
  The ride along the world line: one path through the object that meets every event in the order it began, from 2014
  to the present. Each event is already a point in four dimensions (its world places it in space, its time is w), so
  the path is a curve through those points, and since time only runs forward it is monotone in w: a world line.

  Each assumption is one function here: the order, where the ride meets an event, the curve through the stops, how
  the curve is laid as dots, and the pacing. Nothing here knows about the screen.
*/
import { cardMeta } from "@/lib/about-cv/answers";
import type { WorldEvent } from "@/lib/about-cv/events";
import { rgbOf, PRESENT } from "./palette";
import type { Dots, HypercubeData } from "./shape";
import { linePoint, orbitRadius, presentPoint, wOfTime, type Point4 } from "./space";

/** A stop on the ride: an event, the moment the ride meets it, and where that is in four dimensions. */
export type RideStop = { event: WorldEvent; time: number; point: Point4 };

/** The ride meets an event where it begins. The present is met at now, the end of every world's line. */
export const stopTime = (event: WorldEvent, present: number) =>
  event.isPresent ? present : Math.min(present, event.start);

/** Where the ride meets an event: where it begins on its world's line (a span's bright arc starts there), or now. */
export const stopPoint = (event: WorldEvent, present: number): Point4 =>
  event.isPresent ? presentPoint(present) : linePoint(event.world, stopTime(event, present), present);

/** Every event in the order it began, as the data sorts them, with the present last: the ride ends at now. */
export function rideOrder(events: WorldEvent[], present: number) {
  return [...events].sort(
    (first, second) =>
      Number(first.isPresent ?? false) - Number(second.isPresent ?? false) ||
      stopTime(first, present) - stopTime(second, present),
  );
}

export function rideStops(data: HypercubeData): RideStop[] {
  return rideOrder(data.events, data.present).map((event) => ({
    event,
    time: stopTime(event, data.present),
    point: stopPoint(event, data.present),
  }));
}

/**
  What the peek says under an event's name: its card's own words for when and where. A pastime's card says it is now,
  from the GitHub profile, and so does its peek, so the ride never suggests it began this year.
*/
export function peekWords(event: WorldEvent) {
  const when = cardMeta(event);
  return event.kind === "pastime" && event.subtitle ? `${when}, ${event.subtitle.charAt(0).toLowerCase()}${event.subtitle.slice(1)}` : when;
}

const distance4 = (first: Point4, second: Point4) =>
  Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2], first[3] - second[3]);

type Vector3 = [number, number, number];

const lengthOf = ([x, y, z]: Vector3) => Math.hypot(x, y, z);

/**
  The way round the object from one direction to another: along the great circle between them, as an orbit runs. Two
  directions almost opposite have no one great circle, so the way between them is straightened and pushed out again.
*/
function between(from: Vector3, to: Vector3, share: number): Vector3 {
  const cosine = Math.max(-1, Math.min(1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2]));
  const angle = Math.acos(cosine);
  if (angle < 1e-6) return from;
  if (Math.PI - angle < 1e-3) {
    const straight = from.map((value, axis) => value + (to[axis] - value) * share) as Vector3;
    const size = lengthOf(straight) || 1;
    return straight.map((value) => value / size) as Vector3;
  }
  const fromWeight = Math.sin((1 - share) * angle) / Math.sin(angle);
  const toWeight = Math.sin(share * angle) / Math.sin(angle);
  return from.map((value, axis) => value * fromWeight + to[axis] * toWeight) as Vector3;
}

/**
  The curve through the stops, made the way the object itself is made. Between two stops time runs evenly, so the
  point's shell (its distance from the middle, and its w) follows time exactly as every orbit's does, and its direction
  turns along the great circle from the one stop to the next. So the thread lies on the object's own shells, curving
  as an orbit curves, and draws in toward the present as the years pass. Its parameter runs from 0 at the first stop to
  the count less one at the last; between stop i and stop i + 1 it runs from i to i + 1.
*/
export function rideCurve(stops: RideStop[], present: number) {
  const directions = stops.map((stop): Vector3 | null => {
    const space: Vector3 = [stop.point[0], stop.point[1], stop.point[2]];
    const size = lengthOf(space);
    return size > 1e-6 ? (space.map((value) => value / size) as Vector3) : null;
  });
  const last = stops.length - 1;
  return (along: number): Point4 => {
    if (last < 1) return stops[0].point;
    const segment = Math.max(0, Math.min(last - 1, Math.floor(along)));
    const share = Math.max(0, Math.min(1, along - segment));
    const time = stops[segment].time + (stops[segment + 1].time - stops[segment].time) * share;
    // The present has no direction, being the one point: the way to it keeps the last direction and shrinks to nothing.
    const from = directions[segment] ?? directions[segment + 1] ?? [0, 1, 0];
    const to = directions[segment + 1] ?? from;
    const radius = orbitRadius(time, present);
    const direction = between(from, to, share);
    return [direction[0] * radius, direction[1] * radius, direction[2] * radius, wOfTime(time, present)];
  };
}

/** How finely each stretch between two stops is walked to lay its dots evenly. */
const WALK_STEPS = 96;
/** The thread's look: the brightest strength in the object, and a little larger than a line's dots. */
const THREAD_STRENGTH = 1.5;
const THREAD_SIZE = 2.4;

/**
  The thread: dots laid evenly along the curve, in the present's warm light. Each dot also keeps how far along the
  ride it lies (its curve parameter), so the scene draws only what the moving point has passed.
*/
export function threadDots(stops: RideStop[], gap: number, present: number): { dots: Dots; along: Float32Array } {
  const curve = rideCurve(stops, present);
  const colour = rgbOf(PRESENT);
  const places: number[] = [];
  const times: number[] = [];
  const colours: number[] = [];
  const looks: number[] = [];
  const worlds: number[] = [];
  const alongs: number[] = [];
  const lay = (along: number, point: Point4) => {
    const segment = Math.min(stops.length - 2, Math.floor(along));
    const share = along - segment;
    places.push(...point);
    times.push(stops[segment].time + (stops[segment + 1].time - stops[segment].time) * share);
    colours.push(...colour);
    looks.push(THREAD_STRENGTH, THREAD_SIZE);
    worlds.push(-1);
    alongs.push(along);
  };
  let carried = 0;
  let previous = curve(0);
  lay(0, previous);
  for (let segment = 0; segment < stops.length - 1; segment++)
    for (let step = 1; step <= WALK_STEPS; step++) {
      const along = segment + step / WALK_STEPS;
      const point = curve(along);
      carried += distance4(previous, point);
      previous = point;
      if (carried < gap) continue;
      carried = 0;
      lay(along, point);
    }
  return {
    dots: {
      count: times.length,
      places: new Float32Array(places),
      times: new Float32Array(times),
      colours: new Float32Array(colours),
      looks: new Float32Array(looks),
      worlds: new Float32Array(worlds),
    },
    along: new Float32Array(alongs),
  };
}

/** How the ride is paced, in seconds: event by event, never by even time, so a busy year is not a flicker of cards. */
export type RidePacing = {
  /** How long the point rests at each event. */
  dwell: number;
  /** How long it rests at the present, the last stop. */
  presentDwell: number;
  /** A move to the next event takes this, plus a share for each year between them, up to the longest. */
  travelBase: number;
  travelPerYear: number;
  longestTravel: number;
  /** The camera's way in to the first stop, and its pull back at the end. */
  wayIn: number;
  wayOut: number;
};

export const RIDE_PACING: RidePacing = {
  dwell: 1,
  presentDwell: 2.5,
  travelBase: 0.25,
  travelPerYear: 0.45,
  longestTravel: 1.2,
  wayIn: 1.2,
  wayOut: 2,
};

/** The move from one stop to the next: quick, a little longer across a quiet stretch of years. */
export const travelSeconds = (from: number, to: number, pacing: RidePacing) =>
  Math.min(pacing.longestTravel, pacing.travelBase + pacing.travelPerYear * Math.max(0, to - from));

export type RideSchedule = {
  /** When the point reaches each stop, in seconds from the start. */
  arrivals: number[];
  /** When it leaves the present and the camera pulls back. */
  pullBack: number;
  /** When the ride is over. */
  total: number;
  pacing: RidePacing;
};

export function rideSchedule(stops: RideStop[], pacing = RIDE_PACING): RideSchedule {
  const arrivals = [pacing.wayIn];
  for (let index = 1; index < stops.length; index++)
    arrivals.push(arrivals[index - 1] + pacing.dwell + travelSeconds(stops[index - 1].time, stops[index].time, pacing));
  const pullBack = arrivals[arrivals.length - 1] + pacing.presentDwell;
  return { arrivals, pullBack, total: pullBack + pacing.wayOut, pacing };
}

/** A move eases out of one stop and into the next. */
const eased = (share: number) => share * share * (3 - 2 * share);

/**
  Where the ride stands at a moment of its clock: how far along the curve the point is, and the last stop it has
  reached (-1 before the first). Under reduced motion the point never glides: it stays at a stop, then jumps to the next.
*/
export function rideAt(schedule: RideSchedule, seconds: number, jumps: boolean) {
  const { arrivals, pacing } = schedule;
  let reached = -1;
  while (reached + 1 < arrivals.length && arrivals[reached + 1] <= seconds) reached++;
  if (reached < 0) return { along: 0, reached };
  const leaves = arrivals[reached] + pacing.dwell;
  const next = arrivals[reached + 1];
  if (next === undefined || seconds <= leaves || jumps) return { along: reached, reached };
  return { along: reached + eased(Math.min(1, (seconds - leaves) / (next - leaves))), reached };
}

/** The ride's clock at the moment it reaches a stop. */
export const arrivalOf = (schedule: RideSchedule, index: number) =>
  schedule.arrivals[Math.max(0, Math.min(schedule.arrivals.length - 1, index))];

/** The last stop met by a moment in time, for a scrub along the year rail: the first stop when it is earlier still. */
export function stopAtTime(stops: RideStop[], time: number) {
  let found = 0;
  stops.forEach((stop, index) => {
    if (stop.time <= time) found = index;
  });
  return found;
}

/** The moment the point stands for, for the slice and the year: its stops' times, in between along a move. */
export function timeAlong(stops: RideStop[], along: number) {
  const segment = Math.max(0, Math.min(stops.length - 2, Math.floor(along)));
  const share = Math.max(0, Math.min(1, along - segment));
  return stops[segment].time + (stops[segment + 1].time - stops[segment].time) * share;
}

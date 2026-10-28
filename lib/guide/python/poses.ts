/*
  Where the python rests and how it lies there. Each pose is a list of control points from the neck back toward the
  tail, in stage space (CSS pixels, y up from the bottom of the screen), and the body is laid along it for exactly its
  length (spineAlong). Each pose is one function, so moving a perch changes one place.
*/
import { lerp, point, spineAlong, type Point, type Spine } from "./spine";

/** What the poses need to know about the screen. */
export type Stage = {
  width: number;
  height: number;
  bodyLength: number;
  /** A phone-sized screen: narrower than 700 CSS pixels. */
  narrow: boolean;
  /** A screen with no side margin to rest in, under 900 CSS pixels: the python rests in the den, the bottom strip. */
  den: boolean;
  /** How tall the bottom strip is, from the screen's bottom edge. */
  denTop: number;
  /** Where the den's floor is, above the screen's bottom edge and any safe area. */
  denFloor: number;
};

/** How long the python is in the den: short enough that coil, neck and head stand inside the strip. */
export function denLength(stage: Stage) {
  return Math.min(stage.bodyLength * 0.55, (stage.denTop - stage.denFloor - 8) / 0.56);
}

/** How steeply the reader looks down on a coil lying on the floor. */
const LOOK_DOWN = 0.9;

/** A point on the floor (across, and depth away from the reader) seen from the reader's slightly raised eye. */
export function onTheFloor(across: number, depth: number, floor: number, height = 0): Point {
  return point(across, floor + height + depth * Math.sin(LOOK_DOWN), -depth * Math.cos(LOOK_DOWN));
}

/**
 * The first screen: a python at rest, coiled on the ground with its neck rising in an S and its head turned to the
 * reader beside its bubble. On a phone it sits in the lower half toward the right, so the bubble has room on its left;
 * on a computer it sits under the first word of the name, with the bubble to its right.
 */
export function helloControls(stage: Stage): Point[] {
  const { width, narrow } = stage;
  return narrow
    ? coilControls(width * 0.64, stage.denTop + 26, stage.bodyLength)
    : coilControls(width * 0.2, stage.denTop + 8, stage.bodyLength);
}

/** A perch during the tour on a computer: coiled in the side margin, its neck raised. */
export function perchControls(stage: Stage, side: "left" | "right"): Point[] {
  const { width, bodyLength } = stage;
  const across = side === "left" ? bodyLength * 0.2 + 24 : width - bodyLength * 0.2 - 24;
  return coilControls(across, stage.denTop + 26, bodyLength);
}

/** The den: coiled at the left of the bottom strip, its head up and turned toward the strip's other end. */
export function denControls(stage: Stage): Point[] {
  const { bodyLength } = stage;
  return coilControls(16 + bodyLength * 0.19, stage.denFloor + bodyLength * 0.06, bodyLength);
}

/**
 * A resting coil: the tail inside, the body wound round it on the ground, and from the front of the coil the neck
 * rising in an S toward the reader, the way a python rests with its head up.
 */
export function coilControls(centre: number, floor: number, bodyLength: number): Point[] {
  // A python is short for its coil: a whole ring of radius r takes 2 pi r of body. So the rest is a tight pile, as a
  // ball python rests, its rings rising a little as they wind inward, and the rest of the length is the neck.
  const outer = bodyLength * 0.13;
  const controls: Point[] = [
    point(centre + bodyLength * 0.02, floor + bodyLength * 0.34, 130),
    point(centre - bodyLength * 0.04, floor + bodyLength * 0.24, 110),
    point(centre + bodyLength * 0.02, floor + bodyLength * 0.13, 90),
    point(centre, floor + bodyLength * 0.04, 70),
  ];
  const turns = 1.5;
  const steps = 16;
  for (let step = 0; step <= steps; step++) {
    const share = step / steps;
    const angle = -Math.PI / 2 - share * turns * Math.PI * 2;
    const radius = lerp(outer, bodyLength * 0.035, share);
    controls.push(onTheFloor(centre + Math.cos(angle) * radius, Math.sin(angle) * radius + outer, floor, share * bodyLength * 0.07));
  }
  return controls;
}

export const helloSpine = (stage: Stage): Spine => spineAlong(helloControls(stage), stage.bodyLength);

export const perchSpine = (stage: Stage, side: "left" | "right"): Spine =>
  spineAlong(perchControls(stage, side), stage.bodyLength);

export const denSpine = (stage: Stage): Spine => spineAlong(denControls(stage), stage.bodyLength);

/** Breathing: the body swells and settles about every 3.6 seconds. */
export const breathAt = (seconds: number) => 1 + 0.025 * Math.sin((seconds / 3.6) * Math.PI * 2);

/** The neck sways a little when idle, more toward the head, never the body on the floor. */
export function idleSway(spine: Spine, seconds: number, bodyLength: number): Spine {
  const count = spine.length;
  return spine.map((each, index) => {
    const weight = Math.max(0, (index - count * 0.7) / (count * 0.3));
    const swing = weight * weight * bodyLength * 0.012;
    return {
      x: each.x + Math.sin(seconds * 1.1) * swing,
      y: each.y + Math.sin(seconds * 0.7 + 1) * swing * 0.6,
      z: each.z,
    };
  });
}

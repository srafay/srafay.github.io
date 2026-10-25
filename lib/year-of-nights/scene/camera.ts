/*
  The scene's camera: a pinhole looking straight down the depth axis, with no turn, so the galaxy is always seen face
  on and reads as a calendar. Moving the camera across, up and in is all the motion there is. Points further away
  move less when it moves, which is the parallax.
*/
import { clamp, easeInOutCubic, mix, smoothstep } from "./motion";

export type Point = { x: number; y: number; z: number };
export type Camera = { x: number; y: number; z: number };
/** A part of the stage, in CSS pixels from its top left corner. */
export type Region = {
  left: number;
  top: number;
  width: number;
  height: number;
};
/** A box in the world for the camera to fit inside a region: its centre, its plane and its half sizes. */
export type Frame = {
  x: number;
  y: number;
  z: number;
  halfWidth: number;
  halfHeight: number;
};
export type Stage = { width: number; height: number };
export type Projected = { x: number; y: number; scale: number; depth: number };

/** Screen pixels per world unit for a point this many units in front of the camera. */
const FOCAL_LENGTH = 1000;
/** Closer than this, a point is behind or inside the camera and is not drawn. */
export const NEAREST_DEPTH = 40;

export function project(
  point: Point,
  camera: Camera,
  stage: Stage,
): Projected | null {
  const depth = point.z - camera.z;
  if (depth < NEAREST_DEPTH) return null;
  const scale = FOCAL_LENGTH / depth;
  return {
    x: stage.width / 2 + (point.x - camera.x) * scale,
    y: stage.height / 2 + (point.y - camera.y) * scale,
    scale,
    depth,
  };
}

/** The camera that shows the frame's box as large as fits inside the region, centred in it. */
export function cameraForFrame(
  frame: Frame,
  region: Region,
  stage: Stage,
): Camera {
  const depth =
    FOCAL_LENGTH *
    Math.max(
      frame.halfWidth / (region.width / 2),
      frame.halfHeight / (region.height / 2),
    );
  const scale = FOCAL_LENGTH / depth;
  const regionCentreX = region.left + region.width / 2;
  const regionCentreY = region.top + region.height / 2;
  return {
    x: frame.x - (regionCentreX - stage.width / 2) / scale,
    y: frame.y - (regionCentreY - stage.height / 2) / scale,
    z: frame.z - depth,
  };
}

/** Between two resting cameras at the same kind of distance: an even glide. */
export function glide(from: Camera, to: Camera, amount: number): Camera {
  const eased = easeInOutCubic(clamp(amount));
  return {
    x: mix(from.x, to.x, eased),
    y: mix(from.y, to.y, eased),
    z: mix(from.z, to.z, eased),
  };
}

/**
 * From one scene to the next: the camera leads with depth and follows across a moment later, so a flight to something
 * behind the galaxy passes through the galaxy's own stars, and the place it is going to is in view by the end.
 */
export function flight(from: Camera, to: Camera, amount: number): Camera {
  const inDepth = easeInOutCubic(smoothstep(0, 0.85, amount));
  const across = easeInOutCubic(smoothstep(0.05, 0.95, amount));
  return {
    x: mix(from.x, to.x, across),
    y: mix(from.y, to.y, across),
    z: mix(from.z, to.z, inDepth),
  };
}

/** Where the reduced-motion camera is: at one end or the other, never between. */
export const cut = (from: Camera, to: Camera, amount: number) =>
  amount < 0.5 ? from : to;

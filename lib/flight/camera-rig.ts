/*
  The camera, described the way a camera operator would: the point on the surface it looks at, how far away it is,
  how far it tips from looking straight down toward the horizon, which way it faces, its lens, and where on the
  screen the point it looks at sits. Every frame of the flight is a blend of two of these.

  "Where on the screen" is a lens shift, not a turn of the camera: the picture slides in its frame, so a planet that
  sits right of centre is still drawn as if the camera faced it squarely, and its edge stays round.
*/
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { alongGreatCircle, headingDirection, turnedEast } from "./geography";
import { mix, mixAngle, mixDistance } from "./motion";

export type CameraPose = {
  /** The point on the unit sphere the camera looks at. */
  target: Vector3;
  /** From that point to the camera, in planet radii. */
  distance: number;
  /** 0 looks straight down at the target; larger tips the camera toward the horizon. Radians. */
  tilt: number;
  /** Which way the top of the screen faces along the surface: 0 is north, a quarter turn east. Radians. */
  heading: number;
  /** The lens's vertical field of view, in degrees. */
  fieldOfView: number;
  /** Where the target sits, as a share of the stage's width and height from its centre (right and down are +). */
  shiftAcross: number;
  shiftDown: number;
};

export type StageSize = { width: number; height: number };

/** The camera's place and its up direction for a pose. */
export function cameraPlacement(pose: CameraPose) {
  const target = pose.target.clone().normalize();
  const ahead = headingDirection(target, pose.heading);
  const back = target
    .clone()
    .multiplyScalar(Math.cos(pose.tilt))
    .sub(ahead.clone().multiplyScalar(Math.sin(pose.tilt)));
  const position = target.clone().add(back.multiplyScalar(pose.distance));
  const up = ahead
    .clone()
    .multiplyScalar(Math.cos(pose.tilt))
    .add(target.clone().multiplyScalar(Math.sin(pose.tilt)));
  return { target, position, up };
}

export function applyPose(
  camera: PerspectiveCamera,
  pose: CameraPose,
  stage: StageSize,
) {
  const { target, position, up } = cameraPlacement(pose);
  camera.position.copy(position);
  camera.up.copy(up);
  camera.lookAt(target);
  camera.fov = pose.fieldOfView;
  camera.aspect = stage.width / stage.height;
  camera.near = Math.max(0.002, pose.distance * 0.05);
  camera.far = 400;
  const shiftRightPixels = pose.shiftAcross * stage.width;
  const shiftDownPixels = pose.shiftDown * stage.height;
  camera.setViewOffset(
    stage.width,
    stage.height,
    -shiftRightPixels,
    -shiftDownPixels,
    stage.width,
    stage.height,
  );
}

/**
 * The distance from the surface at which the whole planet, looked at squarely, fills a circle of the given radius on
 * a stage of the given height.
 */
export function distanceForDiscRadius(
  radiusPixels: number,
  stageHeight: number,
  fieldOfView: number,
) {
  const halfFieldTangent = Math.tan(MathUtils.degToRad(fieldOfView) / 2);
  const angularRadius = Math.atan(
    (radiusPixels * halfFieldTangent) / (stageHeight / 2),
  );
  return 1 / Math.sin(angularRadius) - 1;
}

/** The planet's apparent radius in pixels for a camera looking at it squarely from a distance above the surface. */
export function discRadiusAt(
  distance: number,
  stageHeight: number,
  fieldOfView: number,
) {
  const halfFieldTangent = Math.tan(MathUtils.degToRad(fieldOfView) / 2);
  const angularRadius = Math.asin(1 / (1 + distance));
  return ((stageHeight / 2) * Math.tan(angularRadius)) / halfFieldTangent;
}

/**
 * A pose part of the way from one to another. The target travels the great circle between them, the distance blends
 * on a log scale, and `rise` lifts the camera in the middle of the move (a rise of 2 is three times as far at the
 * halfway point), so a long flight climbs to show the region it crosses and comes down again.
 */
export function blendPoses(
  from: CameraPose,
  to: CameraPose,
  fraction: number,
  rise: number,
): CameraPose {
  const climb = 1 + rise * Math.sin(Math.PI * fraction);
  return {
    target: alongGreatCircle(from.target, to.target, fraction),
    distance: mixDistance(from.distance, to.distance, fraction) * climb,
    tilt: mix(from.tilt, to.tilt, fraction),
    heading: mixAngle(from.heading, to.heading, fraction),
    fieldOfView: mix(from.fieldOfView, to.fieldOfView, fraction),
    shiftAcross: mix(from.shiftAcross, to.shiftAcross, fraction),
    shiftDown: mix(from.shiftDown, to.shiftDown, fraction),
  };
}

/** The same pose with the planet turned east under it by some degrees, as when it turns or the reader spins it. */
export const withPlanetTurned = (
  pose: CameraPose,
  degreesEast: number,
): CameraPose => ({ ...pose, target: turnedEast(pose.target, -degreesEast) });

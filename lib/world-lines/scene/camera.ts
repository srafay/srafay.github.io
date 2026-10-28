/*
  Where the camera is at each point of the scroll. The travel has five stretches. First the whole spacetime from above
  the present (the first screen). Then the descent into the vault at now, and the travel back through the years to
  2014. Then a short look into the faint years before, and the pull back out to the present, where the links are.
  Each stretch is a share of the scroll. Each pose depends on the screen's shape, so a narrow screen frames it tall.
*/
import * as THREE from "three";
import { FIRST_YEAR } from "@/lib/world-lines/time";
import { cameraLineHeight, zOfTime, type Vault } from "./layout";

/**
 * Where the camera stands, what it looks at, its field of view, and how far its picture is shifted sideways. The
 * shift is a lens shift, as an architect's camera has. The lines stay one-point, and their vanishing point moves.
 */
export type Pose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  shiftAcross: number;
};

/** The shares of the scroll each stretch takes, from 0 to 1, in order. */
export const STRETCHES = {
  overview: 0.035,
  descent: 0.085,
  travelEnds: 0.86,
  before: 0.9,
};

const isNarrow = (aspect: number) => aspect < 0.9;

/**
 * A camera that looks straight back along the years, tilted down by `pitchDegrees`, standing `back` units past now and
 * `height` units over the floor. Looking straight back keeps every line converging on one vanishing point.
 */
function lookingBack(
  height: number,
  back: number,
  pitchDegrees: number,
  fov: number,
  shiftAcross: number,
): Pose {
  const distance = 20;
  const drop = Math.tan((pitchDegrees * Math.PI) / 180) * distance;
  return {
    position: new THREE.Vector3(0, height, back),
    target: new THREE.Vector3(0, height - drop, back - distance),
    fov,
    shiftAcross,
  };
}

/**
 * The first screen: the whole vault from above and just past now, looking straight back toward 2014, one image on
 * both screens. On a phone the lines converge just under the name and fan down to the present at the bottom. On a
 * computer the picture is shifted right, so the vanishing point sits right of the name.
 */
export function overviewPose(aspect: number, vault: Vault): Pose {
  // Worked out so 2014 lands just under the name (about 27 percent down) and now at the bottom of the screen.
  if (isNarrow(aspect))
    return lookingBack(vault.height + 3.55, 5.5, 20.7, 54, 0);
  return lookingBack(vault.height + 2.75, 5.8, 16, 46, 0.22);
}

/** Inside the vault at a moment, looking back into the past along the lines. */
export function travelPose(
  aspect: number,
  vault: Vault,
  time: number,
  present: number,
): Pose {
  const z = zOfTime(time, present);
  const height = cameraLineHeight(vault);
  return {
    position: new THREE.Vector3(0, height * 0.98, z + 1.2),
    target: new THREE.Vector3(0, height * 0.86, z - 6),
    fov: isNarrow(aspect) ? 64 : 56,
    shiftAcross: 0,
  };
}

/** The pull back at the end: the first screen's view again, with now at the foot of the screen above the worlds. */
export function endPose(aspect: number, vault: Vault): Pose {
  return overviewPose(aspect, vault);
}

/** A smooth start and stop: no stretch begins or ends with a jolt. */
export const smoothStep = (amount: number) => {
  const clamped = Math.min(1, Math.max(0, amount));
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
};

export function blendPoses(from: Pose, to: Pose, amount: number, into: Pose) {
  into.position.lerpVectors(from.position, to.position, amount);
  into.target.lerpVectors(from.target, to.target, amount);
  into.fov = from.fov + (to.fov - from.fov) * amount;
  into.shiftAcross =
    from.shiftAcross + (to.shiftAcross - from.shiftAcross) * amount;
  return into;
}

const shareOf = (progress: number, from: number, to: number) =>
  (progress - from) / (to - from);

/** The time the camera stands at while it travels: now at the start of the travel, a little before 2014 at its end. */
export function travelTime(progress: number, present: number) {
  const amount = Math.min(
    1,
    Math.max(0, shareOf(progress, STRETCHES.descent, STRETCHES.travelEnds)),
  );
  return present - amount * (present - FIRST_YEAR + 0.25);
}

/** The point of the scroll where the camera stands at a time: travelTime turned round. */
export function progressAtTime(time: number, present: number) {
  const amount = (present - time) / (present - FIRST_YEAR + 0.25);
  const clamped = Math.min(1, Math.max(0, amount));
  return (
    STRETCHES.descent + clamped * (STRETCHES.travelEnds - STRETCHES.descent)
  );
}

/** How far after a moment the camera stands to see it well ahead of it, in years. */
export const YEARS_BEHIND_A_MOMENT = 1.3;

export type PoseSet = { overview: Pose; end: Pose };

/** How far inside the vault the camera is, from 0 (the first screen, the end) to 1 (travelling through the years). */
export function insideAmount(progress: number) {
  if (progress <= STRETCHES.overview) return 0;
  if (progress <= STRETCHES.descent)
    return smoothStep(shareOf(progress, STRETCHES.overview, STRETCHES.descent));
  if (progress <= STRETCHES.before) return 1;
  return 1 - smoothStep(shareOf(progress, STRETCHES.before, 1));
}

/** The camera's pose at a point of the scroll, written into `into`. */
export function poseAt(
  progress: number,
  aspect: number,
  vault: Vault,
  present: number,
  poses: PoseSet,
  into: Pose,
) {
  if (progress <= STRETCHES.overview)
    return blendPoses(poses.overview, poses.overview, 0, into);
  if (progress <= STRETCHES.descent) {
    const amount = smoothStep(
      shareOf(progress, STRETCHES.overview, STRETCHES.descent),
    );
    return blendPoses(
      poses.overview,
      travelPose(aspect, vault, present, present),
      amount,
      into,
    );
  }
  if (progress <= STRETCHES.travelEnds)
    return blendPoses(
      travelPose(aspect, vault, travelTime(progress, present), present),
      poses.overview,
      0,
      into,
    );
  const lastTravel = travelPose(
    aspect,
    vault,
    travelTime(STRETCHES.travelEnds, present),
    present,
  );
  if (progress <= STRETCHES.before) {
    const amount = smoothStep(
      shareOf(progress, STRETCHES.travelEnds, STRETCHES.before),
    );
    const lookingOn = travelPose(aspect, vault, FIRST_YEAR - 1.6, present);
    return blendPoses(lastTravel, lookingOn, amount * 0.5, into);
  }
  const amount = smoothStep(shareOf(progress, STRETCHES.before, 1));
  const lookingOn = blendPoses(
    lastTravel,
    travelPose(aspect, vault, FIRST_YEAR - 1.6, present),
    0.5,
    {
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      fov: 0,
      shiftAcross: 0,
    },
  );
  return blendPoses(lookingOn, poses.end, amount, into);
}

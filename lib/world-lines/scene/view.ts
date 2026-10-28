/*
  The reader's own view, on top of the travel's. A turn swings the camera around the moment in view and stays where
  the reader leaves it. A zoom brings the camera nearer the moment, or takes it out until the whole life is in view.
  At that far end the years along the lines are drawn shorter, and the whole spacetime fills most of the screen from
  three-quarters above. While nobody touches it, it turns slowly like a turntable.
*/
import * as THREE from "three";
import type { Pose } from "./camera";
import { Follower } from "@/lib/about-cv/scene/follower";

/** The zoom: -1 is as near the moment as the camera goes, 0 the travel's own view, 1 the whole spacetime. */
const ZOOM_NEAREST = -1;
const ZOOM_WHOLE = 1;
/** At the nearest zoom the camera stands at this share of its distance from the moment. */
const NEAREST_DISTANCE_SHARE = 0.35;
/** From here to the far end the zoom counts as the whole in view, where the turntable may run. */
const WHOLE_FROM = 0.97;
/** How far a turn may tip the view down below the travel's own (negative) or up over it, in radians. */
const TURN_LOWEST = -0.35;
const TURN_HIGHEST = 1.1;
/** A turn or zoom smaller than this counts as the travel's own view, with nothing to reset. */
const CHANGED_FROM = 0.02;
/** A turn this large has taken the lens shift away: a shifted lens turned around the moment would look skewed. */
const TURN_THAT_ENDS_THE_SHIFT = 0.35;
/** The turntable: how fast it turns, in radians a second (about four degrees), and how long it waits after a touch. */
const TURNTABLE_SPEED = 0.07;
const TURNTABLE_WAITS_MILLISECONDS = 1200;

/** The whole spacetime's field of view, and how much of the screen it fills: its shorter side, at most its longer. */
export const WHOLE_FIELD_OF_VIEW = 46;
const WHOLE_FILLS_SHORTER_SIDE = 0.8;
const WHOLE_FILLS_LONGER_SIDE = 0.88;
/**
  Where the whole is seen from before any turn: three-quarters from above and in front of now, on the side of the
  years. From there the five lines fan apart toward the reader.
*/
export const WHOLE_START = { azimuth: -0.62, elevation: 0.52 };
const WHOLE_LOWEST = 0.05;
const WHOLE_HIGHEST = 1.45;

/**
  At the far end the years along the lines are drawn this many times shorter. The lines run about eight times longer
  than the arch is wide on a computer, and twice that on a phone, whose arch is narrower. Seen whole they would read
  as one thread. Shortened, they read as a shape that can be turned.
*/
const wholeTimeSquash = (aspect: number) => (aspect < 0.9 ? 5 : 3);

/** How much time is squashed at a share of the way to the whole: not at all in the travel, fully at the far end. */
export const timeSquashAt = (wholeShare: number, aspect: number) =>
  1 + (wholeTimeSquash(aspect) - 1) * wholeShare;

/** The squash at the far end, for framing the whole. */
export const fullTimeSquash = (aspect: number) => timeSquashAt(1, aspect);

/** A point of the scene in a space whose time is squashed by a share. */
export const squashed = (point: THREE.Vector3, squash: number) =>
  new THREE.Vector3(point.x, point.y, point.z / squash);

/** The middle of what is drawn, which the whole turns around: the middle of its box. */
export const middleOf = (points: THREE.Vector3[]) =>
  new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());

/** The way from the middle to the camera, for a turn across (azimuth) and a height (elevation). */
const towardCamera = (azimuth: number, elevation: number) =>
  new THREE.Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  );

const clamp = (value: number, lowest: number, highest: number) =>
  Math.min(highest, Math.max(lowest, value));

/** Where the whole is seen from after the reader's turn: across adds to the turn, up to the height. */
export const wholeAngles = (across: number, up: number) => ({
  azimuth: WHOLE_START.azimuth + across,
  elevation: clamp(WHOLE_START.elevation + up, WHOLE_LOWEST, WHOLE_HIGHEST),
});

/**
  How far from the middle the camera stands for the whole spacetime to fill its share of the screen. Every point drawn
  (each bead, year and city) must fit inside the picture at its own depth.
*/
export function distanceToFrame(
  points: THREE.Vector3[],
  azimuth: number,
  elevation: number,
  aspect: number,
) {
  const toCamera = towardCamera(azimuth, elevation);
  const forward = toCamera.clone().negate();
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  const up = right.clone().cross(forward);
  const tangentUp = Math.tan((WHOLE_FIELD_OF_VIEW * Math.PI) / 360);
  const tangentAcross = tangentUp * aspect;
  const [fillAcross, fillUp] =
    aspect < 1
      ? [WHOLE_FILLS_SHORTER_SIDE, WHOLE_FILLS_LONGER_SIDE]
      : [WHOLE_FILLS_LONGER_SIDE, WHOLE_FILLS_SHORTER_SIDE];
  const centre = middleOf(points);
  let distance = 0;
  for (const point of points) {
    const fromCentre = point.clone().sub(centre);
    const nearer = fromCentre.dot(toCamera);
    distance = Math.max(
      distance,
      nearer + Math.abs(fromCentre.dot(right)) / (tangentAcross * fillAcross),
      nearer + Math.abs(fromCentre.dot(up)) / (tangentUp * fillUp),
    );
  }
  return distance;
}

/** The whole in view: on a sphere around its middle, looking at it. */
export function wholePose(
  middle: THREE.Vector3,
  azimuth: number,
  elevation: number,
  distance: number,
): Pose {
  return {
    position: towardCamera(azimuth, elevation)
      .multiplyScalar(distance)
      .add(middle),
    target: middle.clone(),
    fov: WHOLE_FIELD_OF_VIEW,
    shiftAcross: 0,
  };
}

/**
  The moment in view, which a turn swings around. It is the point at the middle of the screen where the camera's
  look reaches the lines' middle height. So a turned view stays centred on the lines. A look that runs level, as inside
  the vault, takes the point this far ahead instead, in scene units (about three and a half years).
*/
const MOMENT_AHEAD = 8;
const NEAREST_MOMENT = 3;
const FURTHEST_MOMENT = 20;

/** How far ahead along the look the moment in view is. */
function momentDistance(position: THREE.Vector3, look: THREE.Vector3, middleHeight: number) {
  if (look.y > -0.02) return MOMENT_AHEAD;
  const toMiddle = (position.y - middleHeight) / -look.y;
  return clamp(toMiddle, NEAREST_MOMENT, FURTHEST_MOMENT);
}

/**
  Turns a travel pose around the moment in view, and brings it nearer for a zoom in. A turned view loses the lens
  shift little by little, since a shifted lens swung around the moment would look skewed.
*/
export function turnAndBringNearer(
  pose: Pose,
  across: number,
  up: number,
  nearerShare: number,
  middleHeight: number,
) {
  const ahead = pose.target.clone().sub(pose.position);
  const lookingFar = ahead.length();
  const look = ahead.normalize();
  const toMoment = momentDistance(pose.position, look, middleHeight);
  const moment = pose.position.clone().add(look.clone().multiplyScalar(toMoment));
  const spherical = new THREE.Spherical().setFromVector3(
    pose.position.clone().sub(moment),
  );
  spherical.theta += across;
  spherical.phi = clamp(spherical.phi - up, 0.12, Math.PI - 0.3);
  spherical.radius *= 1 - nearerShare * (1 - NEAREST_DISTANCE_SHARE);
  const fromMoment = new THREE.Vector3().setFromSpherical(spherical);
  pose.position.copy(moment).add(fromMoment);
  // It still looks through the moment, as far beyond it as before.
  pose.target
    .copy(moment)
    .add(
      fromMoment
        .clone()
        .normalize()
        .multiplyScalar(-Math.max(0, lookingFar - toMoment)),
    );
  const turned = Math.min(
    1,
    (Math.abs(across) + Math.abs(up)) / TURN_THAT_ENDS_THE_SHIFT,
  );
  pose.shiftAcross *= 1 - turned;
}

export class ReaderView {
  /** Where the reader has asked the view to go. The followers glide there. */
  readonly goal = { across: 0, up: 0, zoom: 0 };
  private readonly across = new Follower(0, 40);
  private readonly up = new Follower(0, 40);
  private readonly zoom = new Follower(0, 30);
  private turntableArmed = false;
  private lastTouch = 0;

  constructor(private readonly reducedMotion: boolean) {}

  turnBy(across: number, up: number) {
    this.goal.across += across;
    this.goal.up = clamp(this.goal.up + up, TURN_LOWEST, TURN_HIGHEST);
    this.jumpWhenStill();
  }

  /** Zooms by an amount: negative nearer the moment, positive further out. Reaching the whole arms the turntable. */
  zoomBy(amount: number) {
    const wasWhole = this.goal.zoom >= WHOLE_FROM;
    this.goal.zoom = clamp(this.goal.zoom + amount, ZOOM_NEAREST, ZOOM_WHOLE);
    const isWhole = this.goal.zoom >= WHOLE_FROM;
    if (isWhole && !wasWhole) this.turntableArmed = !this.reducedMotion;
    if (!isWhole) this.turntableArmed = false;
    this.jumpWhenStill();
  }

  /** Zooms to a place on the scale from -1 (nearest) to 1 (the whole). */
  zoomTo(zoom: number) {
    this.zoomBy(zoom - this.goal.zoom);
  }

  /** The reader touched the scene: a turning turntable stops for good, and a waiting one waits again. */
  touched(now: number) {
    if (this.turntableTurns(now)) this.turntableArmed = false;
    this.lastTouch = now;
  }

  reset() {
    Object.assign(this.goal, { across: 0, up: 0, zoom: 0 });
    this.turntableArmed = false;
    this.jumpWhenStill();
  }

  /** Whether the view is turned or zoomed away from the travel's own. */
  isChanged() {
    return (
      Math.abs(this.goal.across) > CHANGED_FROM ||
      Math.abs(this.goal.up) > CHANGED_FROM ||
      Math.abs(this.goal.zoom) > CHANGED_FROM
    );
  }

  private turntableTurns(now: number) {
    return (
      this.turntableArmed &&
      this.goal.zoom >= WHOLE_FROM &&
      now - this.lastTouch > TURNTABLE_WAITS_MILLISECONDS
    );
  }

  /** Moves the view on by a frame's time. Says whether it moves, or waits to turn, so frames keep coming. */
  step(seconds: number, now: number) {
    if (this.turntableTurns(now))
      this.goal.across += TURNTABLE_SPEED * seconds;
    let moving = this.across.step(this.goal.across, seconds);
    moving = this.up.step(this.goal.up, seconds) || moving;
    moving = this.zoom.step(this.goal.zoom, seconds) || moving;
    return moving || (this.turntableArmed && this.goal.zoom >= WHOLE_FROM);
  }

  /** The view now: its turn across and up in radians, and its zoom from -1 to 1. */
  now() {
    return {
      across: this.across.value,
      up: this.up.value,
      zoom: this.zoom.value,
    };
  }

  /** How far toward the whole the view is, from 0 (the travel's own view or nearer) to 1. */
  wholeShare() {
    return clamp(this.zoom.value, 0, 1);
  }

  /** How far nearer the moment the view is, from 0 to 1. */
  nearerShare() {
    return clamp(-this.zoom.value, 0, 1);
  }

  /** Under reduced motion the view moves at once, with no glide. */
  private jumpWhenStill() {
    if (!this.reducedMotion) return;
    this.across.jump(this.goal.across);
    this.up.jump(this.goal.up);
    this.zoom.jump(this.goal.zoom);
  }
}

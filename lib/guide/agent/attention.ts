/*
  Where the agent attends, shown with no face: the whole graph leans and turns toward it. The router moves a little
  toward the place and the fan of tools swings the other way, so the line from the fan's middle to the router points
  at it, as a pendulum trails a moving hand. At the same time the graph turns (yaws and pitches) toward the place, so
  the fan foreshortens and its near tools come forward. Both are smoothed, so the gaze glides and settles.
*/
import { Follower } from "@/lib/about-cv/scene/follower";
import { normalise, tippedUp, turnedAboutUp, turnedInPlane, type Point } from "./vectors";

/** How far the router leans toward the place, as a share of its radius. */
const LEAN = 0.45;
/** The most the fan swings away, in radians: about 23 degrees. */
const SWING = 0.4;
/** The most the graph turns across and tips up or down, in radians: about 29 and 20 degrees, so the tools stay apart. */
const TURN_ACROSS = 0.5;
const TURN_UP = 0.35;
/** How quickly the gaze follows: a soft spring, settled in about a second. */
const GAZE_STIFFNESS = 30;
/**
 * Where the cone may sit to aim, in radians either side of straight up: over the router, clear of the fan of tools
 * under it. Wherever it sits, it points straight at what the agent attends to.
 */
const AIM_REACH = (75 * Math.PI) / 180;
/** How much more the router's front turns than the graph does, so what it wears shows which side it faces. */
const FRONT_TURN = 2.6;

/** The pose attention gives: the router's lean, the fan's swing, and the graph's turn. */
export type Gaze = { leanX: number; leanY: number; swing: number; across: number; up: number; aim: number };

/** Where over the router the cone sits to aim at a place: its angle from straight up, within its reach either side. */
export function aimAngleToward(router: Point, place: Point) {
  const angle = Math.atan2(place.x - router.x, place.y - router.y);
  return Math.min(AIM_REACH, Math.max(-AIM_REACH, angle));
}

export class Attention {
  private readonly leanX = new Follower(0, GAZE_STIFFNESS);
  private readonly leanY = new Follower(0, GAZE_STIFFNESS);
  private readonly swing = new Follower(0, GAZE_STIFFNESS);
  private readonly across = new Follower(0, GAZE_STIFFNESS);
  private readonly up = new Follower(0, GAZE_STIFFNESS);
  private readonly aim = new Follower(0, GAZE_STIFFNESS);

  /** Moves the gaze toward a place seen from the router, by a frame's time; jumps there when seconds is 0. */
  step(router: Point, place: Point, radius: number, seconds: number): Gaze {
    const wanted = gazeToward(router, place, radius);
    const followers: [Follower, number][] = [
      [this.leanX, wanted.leanX],
      [this.leanY, wanted.leanY],
      [this.swing, wanted.swing],
      [this.across, wanted.across],
      [this.up, wanted.up],
    ];
    followers.push([this.aim, aimAngleToward(router, place)]);
    for (const [follower, target] of followers) {
      if (seconds > 0) follower.step(target, seconds);
      else follower.jump(target);
    }
    return this.now();
  }

  now(): Gaze {
    return { leanX: this.leanX.value, leanY: this.leanY.value, swing: this.swing.value, across: this.across.value, up: this.up.value, aim: this.aim.value };
  }
}

/** The gaze that faces a place: the further it is, up to a few radii, the more the graph leans. */
export function gazeToward(router: Point, place: Point, radius: number): Gaze {
  const toward = { x: place.x - router.x, y: place.y - router.y };
  const away = Math.hypot(toward.x, toward.y) || 1;
  const strength = Math.min(1, away / (radius * 3));
  const across = (toward.x / away) * strength;
  const up = (toward.y / away) * strength;
  return {
    leanX: across * LEAN * radius,
    leanY: up * LEAN * radius,
    swing: -across * SWING,
    across: across * TURN_ACROSS,
    up: up * TURN_UP,
    aim: aimAngleToward(router, place),
  };
}

/** A tool's place round the router, swung and turned by the gaze. */
export const gazedOffset = (offset: Point, gaze: Gaze) =>
  tippedUp(turnedAboutUp(turnedInPlane(offset, gaze.swing), gaze.across), gaze.up);

/**
 * The router's own frame for what it wears: its front faces the place, turned further than the graph so a cap's peak
 * or the glasses show the side it faces; its top leans a little with the swing.
 */
export function routerFrame(gaze: Gaze) {
  const front = Math.min(1.2, Math.max(-1.2, gaze.across * FRONT_TURN));
  const turn = (vector: Point) => tippedUp(turnedAboutUp(turnedInPlane(vector, gaze.swing * 0.5), front), gaze.up);
  const forward = normalise(turn({ x: 0, y: 0, z: 1 }));
  const up = normalise(turn({ x: 0, y: 1, z: 0 }));
  const side = normalise(turn({ x: 1, y: 0, z: 0 }));
  return { forward, up, side };
}

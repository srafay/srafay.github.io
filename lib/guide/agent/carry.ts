/*
  Carrying a section's name in, as a crane lifts its load. The agent goes down to the bottom of the screen (on a phone,
  up out of its den) and takes the name on a cord from its router, the name still hidden below the screen's edge or
  behind the den's strip. It lifts it up and over to its place on a slight arc, lowers it the last few pixels and lets
  go. The name swings from the agent's movement as a load on a cord does, and has settled by the time it lands. The
  agent and the hook stay on the screen the whole way. Everything here is in stage space: CSS pixels, y up from the
  screen's bottom.
*/
import { lerp, point, type Point } from "./vectors";

/** How long each part of a carry takes, in seconds: down to take the name, up with it, lowering it, and letting go. */
export type CarryTimes = { take: number; carry: number; lower: number; release: number };

/** From the den on a phone it rises only a little to take the name, then carries it further, up the whole screen. */
export const carryTimes = (fromDen: boolean): CarryTimes =>
  fromDen ? { take: 0.4, carry: 1.0, lower: 0.5, release: 0.25 } : { take: 0.45, carry: 0.9, lower: 0.5, release: 0.25 };

/** How far under the router the name's hook hangs, in radii: clear of the fan, folded on its side above it. */
export const CORD_RADII = 2.8;

/** How far over its place the name is carried before it is lowered, in CSS pixels. */
const LIFT = 24;

/**
 * How much room a carry needs over a name's place, in CSS pixels, for an agent of this radius: its router's top, its
 * cord and the lift, so the agent stays on the screen while it lowers the name.
 */
export const headroomFor = (radius: number) => radius * (1.3 + CORD_RADII) + LIFT + 8;

/** The most the name tilts as it swings, in radians: a few degrees, so it reads as a hanging word, never a falling one. */
const MOST_TILT = 0.14;

/** How stiff and how damped the name's swing is: a period of about 1.1 s, settling over a few swings. */
const SWING_STIFFNESS = 32;
const SWING_DAMPING = 2.2;

/** The name being carried: its width, the agent's side, its hook (the top middle) in its place now, where it rises from. */
export type CarriedWord = {
  width: number;
  /** The side the agent works from: 1 the right, -1 the left. The name is taken a little toward it. */
  side: 1 | -1;
  place(): Point;
  /** How high the hook is when the name is taken: the screen's bottom edge, or the top of the den's strip. */
  takenAt: number;
};

export type CarryPart = "take" | "carry" | "lower" | "release";

/** One moment of a carry: where the router is, where the hook is (null before the name is taken), its tilt, the cord. */
export type CarryMoment = {
  part: CarryPart;
  router: Point;
  hook: Point | null;
  /** The name's tilt, in radians, positive when its hook swings right of the router. */
  tilt: number;
  /** How much of the cord shows, from 0 to 1: it draws back up as the agent lets go. */
  cordShown: number;
  landed: boolean;
  done: boolean;
};

const smooth = (share: number) => share * share * (3 - 2 * share);
const easeOut = (share: number) => 1 - (1 - share) ** 3;
const clamp = (value: number, least: number, most: number) => Math.min(most, Math.max(least, value));

export class Carry {
  readonly times: CarryTimes;
  /** The hook's place across the screen and its speed: it swings behind the router. */
  private hookX = 0;
  private hookSpeed = 0;
  private hookTaken = false;

  constructor(
    readonly word: CarriedWord,
    private readonly startRouter: Point,
    readonly started: number,
    fromDen: boolean,
  ) {
    this.times = carryTimes(fromDen);
  }

  /** The cord's length for an agent of this radius. */
  cord = (radius: number) => radius * CORD_RADII;

  /**
   * Where the router takes the name: over the bottom edge (or the den's strip), a little toward its own side of the
   * name's place, so the lift goes up on a slant and the name swings. Never off the screen.
   */
  private takePoint(stageWidth: number, radius: number) {
    const place = this.word.place();
    const toward = place.x + this.word.side * Math.min(this.word.width * 0.2, stageWidth * 0.15);
    const across = clamp(toward, radius * 3, stageWidth - radius * 3);
    return point(across, this.word.takenAt + this.cord(radius), 0);
  }

  /** Where the router stops over the name's place, the name lifted a little. */
  private overThePlace(radius: number) {
    const place = this.word.place();
    return point(place.x, place.y + this.cord(radius) + LIFT, 0);
  }

  /** The carry at a moment: seconds is the frame's own time, for the swing. */
  at(now: number, seconds: number, radius: number, stageWidth: number): CarryMoment {
    const { take, carry, lower } = this.times;
    const into = now - this.started;
    const cord = this.cord(radius);
    const taken = this.takePoint(stageWidth, radius);
    const over = this.overThePlace(radius);
    const place = this.word.place();
    if (into < take) {
      const share = smooth(into / take);
      const router = point(lerp(this.startRouter.x, taken.x, share), lerp(this.startRouter.y, taken.y, share), 0);
      return { part: "take", router, hook: null, tilt: 0, cordShown: 0, landed: false, done: false };
    }
    if (into < take + carry) {
      const share = smooth((into - take) / carry);
      // A slight arc out to its side, as a crane's jib swings its load clear.
      const arc = Math.sin(share * Math.PI) * radius * 1.2 * this.word.side;
      const router = point(clamp(lerp(taken.x, over.x, share) + arc, radius * 2, stageWidth - radius * 2), lerp(taken.y, over.y, share), 0);
      const { hook, tilt } = this.swing(router, cord, seconds);
      return { part: "carry", router, hook, tilt, cordShown: 1, landed: false, done: false };
    }
    if (into < take + carry + lower) {
      const share = easeOut((into - take - carry) / lower);
      const router = point(over.x, lerp(over.y, place.y + cord, share), 0);
      const swung = this.swing(router, cord, seconds);
      // The last stretch eases the hook onto its place exactly, and the tilt to nothing.
      const hook = point(lerp(swung.hook.x, place.x, share), lerp(swung.hook.y, place.y, share), 0);
      return { part: "lower", router, hook, tilt: swung.tilt * (1 - share), cordShown: 1, landed: false, done: false };
    }
    const router = point(place.x, place.y + cord, 0);
    const releaseShare = clamp((into - take - carry - lower) / this.times.release, 0, 1);
    return { part: "release", router, hook: place, tilt: 0, cordShown: 1 - releaseShare, landed: true, done: releaseShare >= 1 };
  }

  /** The hook hangs under the router on its cord and swings behind it across the screen. */
  private swing(router: Point, cord: number, seconds: number) {
    if (!this.hookTaken) {
      this.hookTaken = true;
      this.hookX = router.x;
      this.hookSpeed = 0;
    }
    const steps = Math.max(1, Math.ceil(seconds / (1 / 120)));
    const delta = seconds / steps;
    for (let step = 0; step < steps; step++) {
      const pull = (router.x - this.hookX) * SWING_STIFFNESS - this.hookSpeed * SWING_DAMPING;
      this.hookSpeed += pull * delta;
      this.hookX += this.hookSpeed * delta;
    }
    // The hook never strays further than the cord allows, so it hangs, never flies.
    this.hookX = clamp(this.hookX, router.x - cord * 0.6, router.x + cord * 0.6);
    const tilt = clamp(Math.atan2(this.hookX - router.x, cord) * 0.5, -MOST_TILT, MOST_TILT);
    return { hook: point(this.hookX, router.y - cord, 0), tilt };
  }
}

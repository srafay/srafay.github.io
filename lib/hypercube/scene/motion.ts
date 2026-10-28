/*
  What moves the object without a hand on it, and what the hand changes. The unfold runs from the present back to
  2014 at a slow pace from the first frame, and a held press speeds it on. The turn is the rest pose, plus the
  reader's own turn through w, plus a lean from the pointer or the tilted phone, plus the idle turn: a slow
  turntable about the time axis and a gentle sway through w. The zoom is the reader's.
*/
import { Follower } from "@/lib/about-cv/scene/follower";
import { FIRST_YEAR } from "@/lib/about-cv/time";
import { turnMatrix, type Turn } from "@/lib/hypercube/space";

const degrees = (value: number) => (value * Math.PI) / 180;

/** How long the unfold takes to reach 2014 untouched, and how much quicker it runs while held. */
export const SLOW_UNFOLD_SECONDS = 7;
export const HELD_UNFOLD_SPEED = 5;

export class Unfold {
  /** How far the unfold has come, from 0 (only the present) to 1 (back to 2014). */
  share = 0;
  holding = false;
  private readonly speed = new Follower(1, 60);

  constructor(alreadyDone: boolean) {
    if (alreadyDone) this.share = 1;
  }

  isDone() {
    return this.share >= 1;
  }

  /** Runs on by a frame's time. Says whether it is still running. */
  step(seconds: number) {
    if (this.isDone()) return false;
    this.speed.step(this.holding ? HELD_UNFOLD_SPEED : 1, seconds);
    this.share = Math.min(1, this.share + (seconds / SLOW_UNFOLD_SECONDS) * this.speed.value);
    return true;
  }

  /** Jumps to a share, for the checks that crop the opening at a set moment. */
  setShare(share: number) {
    this.share = Math.min(1, Math.max(0, share));
  }

  /** The oldest moment shown: now at the start, 2014 at the end. */
  frontTime(present: number) {
    return present - this.share * (present - FIRST_YEAR);
  }
}

/** The pose the object rests in: already turned a little through w, so the fold shows on the first screen. */
export const REST_TURN = { xw: degrees(28), yw: degrees(0), zw: degrees(12) };
/** The idle turntable's pace, in radians a second, and how much quicker a held press after the unfold makes it. */
export const IDLE_SPIN = 0.06;
export const HELD_SPIN_SPEED = 7;
/** The idle sway through w: how far, and how long one sway takes, in seconds. */
const SWAY = degrees(8);
const SWAY_SECONDS = 50;
/** How far the reader may turn up and down through w (yw), so the object never turns over its top. */
const LARGEST_UP_TURN = degrees(85);
/** How far the pointer or a tilt leans the object through w, at most. */
export const LARGEST_LEAN = degrees(35);

export class ObjectTurn {
  private readonly across = new Follower(REST_TURN.xw, 90);
  private readonly up = new Follower(REST_TURN.yw, 90);
  private readonly leanAcross = new Follower(0, 30);
  private readonly leanUp = new Follower(0, 30);
  private readonly spinRate = new Follower(IDLE_SPIN, 25);
  private targetAcross = REST_TURN.xw;
  private targetUp = REST_TURN.yw;
  private wantedLeanAcross = 0;
  private wantedLeanUp = 0;
  private spin = 0;
  private swayClock = 0;
  /** Whether a held press is speeding the turntable. */
  speeding = false;

  constructor(private readonly still: boolean) {
    if (still) this.spinRate.jump(0);
  }

  /** The reader's turn through w: across in the xw plane, up in the yw plane, in radians. */
  turnBy(across: number, up: number) {
    this.targetAcross += across;
    this.targetUp = Math.max(-LARGEST_UP_TURN, Math.min(LARGEST_UP_TURN, this.targetUp + up));
    if (this.still) {
      this.across.jump(this.targetAcross);
      this.up.jump(this.targetUp);
    }
  }

  /** A lean from the pointer or a tilted phone, each from -1 to 1. It is not the reader's turn and is not reset. */
  leanTo(across: number, up: number) {
    this.wantedLeanAcross = Math.max(-1, Math.min(1, across)) * LARGEST_LEAN;
    this.wantedLeanUp = Math.max(-1, Math.min(1, up)) * LARGEST_LEAN;
    if (this.still) {
      this.leanAcross.jump(this.wantedLeanAcross);
      this.leanUp.jump(this.wantedLeanUp);
    }
  }

  /** Turns to a pose through w: across in the xw plane, up in the yw plane, in radians. */
  turnTo(across: number, up: number) {
    this.targetAcross = across;
    this.targetUp = Math.max(-LARGEST_UP_TURN, Math.min(LARGEST_UP_TURN, up));
    if (this.still) {
      this.across.jump(this.targetAcross);
      this.up.jump(this.targetUp);
    }
  }

  /** The reader's own turn across (xw), where it is heading. */
  readerAcross() {
    return this.targetAcross;
  }

  /** The reader's own turn up (yw), where it is heading. */
  readerUp() {
    return this.targetUp;
  }

  reset() {
    this.turnTo(REST_TURN.xw, REST_TURN.yw);
    this.paused = false;
  }

  /** While the camera is flown close to a bead or rides with the moving point, the turntable rests. */
  paused = false;

  isChanged() {
    return (
      Math.abs(this.targetAcross - REST_TURN.xw) > 0.02 || Math.abs(this.targetUp - REST_TURN.yw) > 0.02
    );
  }

  /** Runs on by a frame's time. Says whether the reader's turn or a lean is still settling. */
  step(seconds: number) {
    let moving = this.across.step(this.targetAcross, seconds);
    moving = this.up.step(this.targetUp, seconds) || moving;
    moving = this.leanAcross.step(this.wantedLeanAcross, seconds) || moving;
    moving = this.leanUp.step(this.wantedLeanUp, seconds) || moving;
    if (!this.still) {
      this.spinRate.step(this.paused ? 0 : this.speeding ? IDLE_SPIN * HELD_SPIN_SPEED : IDLE_SPIN, seconds);
      this.spin += this.spinRate.value * seconds;
      this.swayClock += seconds;
    }
    return moving;
  }

  /** The turntable's pace now, in radians a second. */
  spinPace() {
    return this.still || this.spinRate.value < 1e-4 ? 0 : this.spinRate.value;
  }

  angles(): Turn {
    return {
      spin: this.spin,
      xw: this.across.value + this.leanAcross.value,
      yw: this.up.value + this.leanUp.value,
      zw: REST_TURN.zw + (this.still ? 0 : SWAY * Math.sin((this.swayClock / SWAY_SECONDS) * Math.PI * 2)),
    };
  }

  matrix() {
    return turnMatrix(this.angles());
  }

  /**
    The turn the camera frames: the reader's turn and lean, without the idle spin and sway. So at rest the camera
    keeps still while the object turns in place.
  */
  framingMatrix() {
    const angles = this.angles();
    return turnMatrix({ ...angles, spin: 0, zw: REST_TURN.zw });
  }
}

/** The reader's zoom, from -1 (nearest) to 1 (furthest), and how far the camera stands for it. */
export class Zoom {
  private readonly shown = new Follower(0, 70);
  private target = 0;

  constructor(private readonly still: boolean) {}

  zoomBy(amount: number) {
    this.target = Math.max(-1, Math.min(1, this.target + amount));
    if (this.still) this.shown.jump(this.target);
  }

  zoomTo(zoom: number) {
    this.zoomBy(zoom - this.target);
  }

  reset() {
    this.zoomTo(0);
  }

  isChanged() {
    return Math.abs(this.target) > 0.02;
  }

  step(seconds: number) {
    return this.shown.step(this.target, seconds);
  }

  /** The camera's distance against the framed one: nearer at -1, further at 1. */
  distanceShare() {
    return Math.pow(2, this.shown.value * 1.15);
  }

  now() {
    return this.shown.value;
  }
}

/*
  How far the object has gone to rest, and what that means for each layer. The share runs from 0 (awake) to 1 (at
  rest): slowly out, quickly back, at once under reduced motion. At rest the object drops a dimension: time flattens
  (the perspective through w goes, each dot keeps its own three dimensions), then the shells square into a cube of
  dots that turns as one solid. The words and the readouts sleep.
*/

/** How long the object takes to go to rest, and to wake, in seconds. */
const RESTING_SECONDS = 2.6;
const WAKING_SECONDS = 1;

const smoothstep = (from: number, to: number, value: number) => {
  const share = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return share * share * (3 - 2 * share);
};

export class RestMotion {
  share = 0;
  private target = 0;

  constructor(private readonly still: boolean) {}

  /** Goes to rest, or wakes. Formed at once when asked (a hidden page draws no frames to ease through). */
  goTo(resting: boolean, atOnce = false) {
    this.target = resting ? 1 : 0;
    if (atOnce || this.still) this.share = this.target;
  }

  isResting() {
    return this.target === 1;
  }

  /** Runs on by a frame's time. Says whether it is still changing. */
  step(seconds: number) {
    if (this.share === this.target) return false;
    const pace = this.target > this.share ? 1 / RESTING_SECONDS : 1 / WAKING_SECONDS;
    this.share =
      this.target > this.share ? Math.min(this.target, this.share + seconds * pace) : Math.max(this.target, this.share - seconds * pace);
    return true;
  }

  /** How far time has flattened: the first half of going to rest. */
  flatten() {
    return smoothstep(0, 0.55, this.share);
  }

  /** How far the shells have squared into a cube: the second half. */
  cube() {
    return smoothstep(0.45, 1, this.share);
  }

  /** How awake the words and readouts are. */
  awake() {
    return 1 - smoothstep(0, 0.6, this.share);
  }
}

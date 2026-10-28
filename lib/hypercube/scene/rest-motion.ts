/*
  How far the object has gone to rest, and what that means for each layer. The share runs from 0 (awake) to 1 (at
  rest): slowly out, quickly back, at once under reduced motion. Two rests are drawn from one share:

  - "dimension": time flattens (the perspective through w goes, each dot keeps its own three dimensions), then the
    shells square into a cube of dots that turns as one solid. The words and readouts sleep.
  - "quiet": nothing changes shape. The words and readouts sleep and the turntable slows to half its pace.
*/

export type RestKind = "dimension" | "quiet";

/** How long the object takes to go to rest, and to wake, in seconds. */
const RESTING_SECONDS = 2.6;
const WAKING_SECONDS = 1;
/** In the quiet rest the turntable keeps this share of its pace. */
const QUIET_SPIN = 0.5;

const smoothstep = (from: number, to: number, value: number) => {
  const share = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return share * share * (3 - 2 * share);
};

export class RestMotion {
  share = 0;
  private target = 0;

  constructor(
    public kind: RestKind,
    private readonly still: boolean,
  ) {}

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
    return this.kind === "dimension" ? smoothstep(0, 0.55, this.share) : 0;
  }

  /** How far the shells have squared into a cube: the second half. */
  cube() {
    return this.kind === "dimension" ? smoothstep(0.45, 1, this.share) : 0;
  }

  /** How awake the words and readouts are. */
  awake() {
    return 1 - smoothstep(0, 0.6, this.share);
  }

  /** The share of the turntable's pace it keeps. */
  spinShare() {
    return this.kind === "quiet" ? 1 - (1 - QUIET_SPIN) * this.share : 1;
  }
}

/** A spring that follows a target without overshoot, so the camera glides after the reader's hand and settles. */
export class Follower {
  value: number;
  private speed = 0;
  constructor(
    value: number,
    private readonly stiffness = 70,
  ) {
    this.value = value;
  }

  /** Moves toward the target by a frame's time. Says whether it is still moving. */
  step(target: number, seconds: number) {
    const damping = 2 * Math.sqrt(this.stiffness);
    const steps = Math.max(1, Math.ceil(seconds / (1 / 120)));
    const delta = seconds / steps;
    for (let index = 0; index < steps; index++) {
      const force =
        (target - this.value) * this.stiffness - this.speed * damping;
      this.speed += force * delta;
      this.value += this.speed * delta;
    }
    return (
      Math.abs(target - this.value) > 0.00002 || Math.abs(this.speed) > 0.00002
    );
  }

  jump(value: number) {
    this.value = value;
    this.speed = 0;
  }
}

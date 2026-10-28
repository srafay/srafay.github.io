/*
  The python held in a hand: a chain of points that keep their spacing and resist sharp bends, pinned where the hand
  holds it, pulled down by gravity, so it dangles and sways from that point. A snake lifts its head when held, so the
  last few points are drawn gently upward. Let go, and the chain falls until it lies on the floor.
*/
import { copySpine, distance, type Spine } from "./spine";

/** How strongly gravity pulls, in body lengths a second squared. */
const GRAVITY = 5.2;
/** How much of its speed the chain keeps each step: below 1 so a swing settles. */
const KEEP_SPEED = 0.986;
/** How many passes are made over the constraints each step: more is stiffer. */
const PASSES = 14;
/**
 * How many points at the neck end lift when held, and how hard, as a share of gravity: more than gravity, so the head
 * half hangs below the hand like the rest, then curls up at its end into a J, the head raised to the reader.
 */
const LIFTING_POINTS = 5;
const HEAD_LIFT = 1.3;
/**
 * Bends sharper than this share of a straight pair of links are pushed open. A python is stiff with muscle, so held
 * in the middle it drapes as an upturned U, its two halves side by side, not folded flat on each other.
 */
const LEAST_BEND = 0.96;

export class Rope {
  points: Spine;
  private previous: Spine;
  private readonly link: number;
  /** The held point, or null once let go. */
  held: number | null = null;
  private hand = { x: 0, y: 0 };
  /** Which way the body runs through the hand: +1 when the head side lies to the right of the tail side. */
  private through = 1;
  /** The floor's height: a fallen chain rests on it. */
  floor = 0;
  /** True once a dropped chain has nearly stopped. */
  settled = false;
  private stillFor = 0;

  constructor(
    spine: Spine,
    private readonly bodyLength: number,
  ) {
    this.points = copySpine(spine);
    this.previous = copySpine(spine);
    this.link = bodyLength / (spine.length - 1);
  }

  hold(index: number, x: number, y: number) {
    this.held = index;
    const before = this.points[Math.max(0, index - 1)];
    const after = this.points[Math.min(this.points.length - 1, index + 1)];
    this.through = after.x >= before.x ? 1 : -1;
    this.hand = { x, y };
    this.settled = false;
    this.stillFor = 0;
  }

  moveHand(x: number, y: number) {
    this.hand = { x, y };
  }

  letGo() {
    this.held = null;
  }

  /** One step of the chain over a frame's time, in smaller steps so a long frame stays stable. */
  step(seconds: number) {
    const steps = Math.min(6, Math.max(1, Math.ceil(seconds / (1 / 120))));
    const delta = Math.min(seconds, 0.1) / steps;
    for (let index = 0; index < steps; index++) this.substep(delta);
  }

  private substep(delta: number) {
    const gravity = GRAVITY * this.bodyLength * delta * delta;
    const count = this.points.length;
    let movement = 0;
    for (let index = 0; index < count; index++) {
      const here = this.points[index];
      const before = this.previous[index];
      const lifting = this.held !== null && this.held < count - LIFTING_POINTS - 2 && index >= count - LIFTING_POINTS;
      const next = {
        x: here.x + (here.x - before.x) * KEEP_SPEED,
        y: here.y + (here.y - before.y) * KEEP_SPEED - (lifting ? -gravity * (HEAD_LIFT - 1) : gravity),
        z: here.z + (here.z - before.z) * KEEP_SPEED - here.z * 0.02,
      };
      movement += Math.abs(next.x - here.x) + Math.abs(next.y - here.y);
      this.previous[index] = here;
      this.points[index] = next;
    }
    for (let pass = 0; pass < PASSES; pass++) this.keepShape();
    if (this.held === null) {
      this.stillFor = movement / count < this.bodyLength * 0.0004 ? this.stillFor + delta : 0;
      this.settled = this.stillFor > 0.25;
    }
  }

  /** The links keep their length, sharp bends open, the held point stays in the hand, nothing goes through the floor. */
  private keepShape() {
    const points = this.points;
    for (let index = 0; index < points.length - 1; index++) this.keepApart(index, index + 1, this.link, this.link);
    for (let index = 0; index < points.length - 2; index++)
      this.keepApart(index, index + 2, this.link * 2 * LEAST_BEND, Infinity);
    if (this.held !== null) this.holdLevel(this.held);
    points.forEach((each, index) => {
      if (each.y >= this.floor) return;
      each.y = this.floor;
      // Friction on the floor: a fallen body slides a little and stops.
      this.previous[index].x = this.previous[index].x * 0.6 + each.x * 0.4;
      this.previous[index].y = each.y;
    });
  }

  /**
   * The body lies level across the hand, the way it drapes over a finger, so both halves hang down either side and
   * nothing folds at the hold.
   */
  private holdLevel(held: number) {
    const points = this.points;
    points[held].x = this.hand.x;
    points[held].y = this.hand.y;
    for (const side of [-1, 1]) {
      const neighbour = points[held + side];
      if (!neighbour) continue;
      neighbour.x = this.hand.x + side * this.through * this.link;
      neighbour.y = this.hand.y;
    }
  }

  /** Two points pulled or pushed so their distance lies between a least and a most. */
  private keepApart(first: number, second: number, least: number, most: number) {
    const one = this.points[first];
    const two = this.points[second];
    const apart = distance(one, two) || 0.0001;
    const wanted = apart < least ? least : apart > most ? most : apart;
    if (wanted === apart) return;
    const share = (apart - wanted) / apart / 2;
    const offsetX = (two.x - one.x) * share;
    const offsetY = (two.y - one.y) * share;
    const offsetZ = (two.z - one.z) * share;
    one.x += offsetX;
    one.y += offsetY;
    one.z += offsetZ;
    two.x -= offsetX;
    two.y -= offsetY;
    two.z -= offsetZ;
  }
}

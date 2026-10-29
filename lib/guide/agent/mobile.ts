/*
  The graph as a hanging mobile: every node is a point mass on a spring. At rest each tool is drawn toward its place in
  the fan, so the links sway and the tools swing a little as the router moves. Held in a hand, the graph hangs as a
  mobile: by the router, the tools hang under it side by side at different heights, on cords from across its lower
  half, the deeper ones in the middle so no cord crosses another tool, and they swing as the hand moves; by a tool, the
  router hangs under the hand and the rest hang from the router. Let go, the springs take them home.
*/
import { NODE_COUNT, ROUTER } from "./topology";
import { add, copyPoint, distance, point, scale, subtract, type Point } from "./vectors";

/** How stiff a tool's spring to its place is at rest, and how much of its speed it loses: a gentle swing that settles in a second. */
const SPRING = 90;
const SPRING_DAMPING = 10;
/** Held, the springs are softer, so the tools swing behind the hand like a mobile. */
const HANGING_SPRING = 42;
const HANGING_DAMPING = 6;
/** The smallest step the motion is worked out in, in seconds, so a long frame stays steady. */
const STEP = 1 / 120;

/**
 * Where each tool hangs under the router when it is held, in router radii: side by side across, the middle ones
 * deepest, so every cord from the router's lower half runs above the tools beside it.
 */
const HANGING_ACROSS = [-3.3, -1.98, -0.66, 0.66, 1.98, 3.3];
const HANGING_DEPTH = [1.7, 2.6, 3.3, 3.0, 2.3, 1.9];

/** A tool's place hanging under a held router. */
export const hangingPlace = (router: Point, radius: number, node: number) =>
  add(router, point(HANGING_ACROSS[node - 1] * radius, -HANGING_DEPTH[node - 1] * radius, 0));

/** How far under the hand the router hangs when a tool is held. */
const ROUTER_UNDER_A_HELD_TOOL = 2.2;

export class Mobile {
  points: Point[];
  private previous: Point[];
  /** The node in the hand, or null. */
  held: number | null = null;
  private hand: Point = { x: 0, y: 0, z: 0 };

  constructor(start: Point[]) {
    this.points = start.map(copyPoint);
    this.previous = start.map(copyPoint);
  }

  /** Puts every node in place at once, still. */
  place(places: Point[]) {
    this.points = places.map(copyPoint);
    this.previous = places.map(copyPoint);
  }

  hold(node: number, hand: Point) {
    this.held = node;
    this.hand = { ...hand, z: this.points[node].z };
  }

  moveHand(hand: Point) {
    this.hand = { ...hand, z: this.hand.z };
  }

  letGo() {
    this.held = null;
  }

  /**
   * One frame of motion. Free, the router goes where it is told and each tool is drawn to its place. Held, the hand
   * holds its node and the rest hang.
   */
  step(seconds: number, router: Point, places: Point[], radius: number) {
    const steps = Math.min(8, Math.max(1, Math.ceil(seconds / STEP)));
    const delta = Math.min(seconds, 0.1) / steps;
    for (let index = 0; index < steps; index++) {
      if (this.held === null) this.restStep(delta, router, places);
      else this.hangStep(delta, radius);
    }
  }

  private restStep(delta: number, router: Point, places: Point[]) {
    this.previous[ROUTER] = this.points[ROUTER];
    this.points[ROUTER] = copyPoint(router);
    for (let node = 1; node < NODE_COUNT; node++) this.springTo(node, places[node], SPRING, SPRING_DAMPING, delta);
  }

  private hangStep(delta: number, radius: number) {
    const held = this.held as number;
    this.previous[held] = this.points[held];
    this.points[held] = { ...this.hand };
    if (held !== ROUTER)
      this.springTo(ROUTER, add(this.hand, point(0, -ROUTER_UNDER_A_HELD_TOOL * radius, 0)), HANGING_SPRING, HANGING_DAMPING, delta);
    const router = this.points[ROUTER];
    for (let node = 1; node < NODE_COUNT; node++)
      if (node !== held) this.springTo(node, hangingPlace(router, radius, node), HANGING_SPRING, HANGING_DAMPING, delta);
    // A quick swing never pushes two tools into one another.
    for (let first = 1; first < NODE_COUNT; first++)
      for (let second = first + 1; second < NODE_COUNT; second++) this.pushApart(first, second, radius * 1.25);
  }

  /** One small step of a node on a spring toward a place, losing some speed. */
  private springTo(node: number, place: Point, stiffness: number, damping: number, delta: number) {
    const here = this.points[node];
    const speed = scale(subtract(here, this.previous[node]), 1 / delta);
    const acceleration = subtract(scale(subtract(place, here), stiffness), scale(speed, damping));
    this.previous[node] = here;
    this.points[node] = add(add(here, scale(speed, delta)), scale(acceleration, delta * delta));
  }

  /** Two nodes never closer than this. The node in the hand does not move. */
  private pushApart(first: number, second: number, least: number) {
    const one = this.points[first];
    const two = this.points[second];
    const apart = distance(one, two) || 0.0001;
    if (apart >= least) return;
    const share = (apart - least) / apart;
    const firstMoves = first === this.held ? 0 : second === this.held ? 1 : 0.5;
    const offset = scale(subtract(two, one), share);
    this.points[first] = add(one, scale(offset, firstMoves));
    this.points[second] = subtract(two, scale(offset, 1 - firstMoves));
  }
}

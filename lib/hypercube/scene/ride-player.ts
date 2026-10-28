/*
  The ride, played. A clock runs through the schedule (lib/hypercube/ride.ts): the moving point rests at each event and
  moves quickly to the next. As it goes it drives what is already there: the travel reader (so the year in focus, the
  rail, the big year and the readouts follow), the camera (which looks at the point), the turn through w (eased from
  wherever it is toward time laid out in a line, landing there at the present), and what is lit. The reader stays in
  charge: pause, resume, step, scrub, hold to hurry, and any other hand on the object pauses it where it is.
*/
import { stays } from "@/content/about/profile";
import type { WorldEvent } from "@/lib/about-cv/events";
import { Follower } from "@/lib/about-cv/scene/follower";
import type { ScrollReader } from "@/lib/about-cv/scene/scroll";
import { timeAtStartOf } from "@/lib/about-cv/time";
import {
  arrivalOf,
  rideAt,
  rideCurve,
  rideSchedule,
  stopAtTime,
  timeAlong,
  type RideSchedule,
} from "@/lib/hypercube/ride";
import type { Point4 } from "@/lib/hypercube/space";
import { travelAtTime } from "./focus";
import type { HypercubeScene } from "./hypercube-scene";
import type { Sound } from "./sound";

export type RideState = "off" | "playing" | "paused" | "ended";

/**
  How the camera rides: how close (on the zoom's scale, from -1 nearest to 1 the whole), and how far from the object's
  middle toward the moving point it looks. A phone's narrow frame stays further back, so the whole object stays in it.
*/
const RIDE_CAMERA = { phone: { zoom: 0, follow: 0.75 }, computer: { zoom: -0.22, follow: 0.65 } };
/** Where the turn through w is heading by the present: a quarter turn, time laid out in a line. */
const LAID_OUT = -Math.PI / 2;
/** Holding the stage or Space runs the ride this many times quicker. */
const HURRIED = 4;
/** How long the circle of a move between cities answers after the point crosses it, in seconds. */
const CROSSING_SECONDS = 0.6;
/** The soonest the turn must land, in seconds, so it never swings faster than this near the end. */
const SHORTEST_LANDING = 0.5;

/** The city a moment falls in: the last stay begun by then. */
export function cityAt(time: number) {
  let city: string | null = null;
  for (const stay of stays) if (timeAtStartOf(stay.from) <= time) city = stay.city;
  return city;
}

/** The moments the moves between cities happen. */
const moveTimes = stays.slice(1).map((stay) => timeAtStartOf(stay.from));

export class RidePlayer {
  state: RideState = "off";
  private readonly schedule: RideSchedule;
  private readonly curve: (along: number) => Point4;
  private clock = 0;
  private hurried = false;
  /** How many seconds of the ride pass in one second: 1, unless a check runs it quicker. */
  private checkPace = 1;
  /** While a scrub on the rail holds the point, the clock stands still. */
  private held = false;
  /** Set when a ride control moved the clock, so the travel follows even while paused. */
  private jumped = false;
  private reached = -1;
  private along = 0;
  private time: number;
  private head: Point4;
  private readonly light = new Follower(0, 30);
  private crossing = 0;
  /** Called when the state changes, and when the point reaches an event (or null before the first). */
  onState: (state: RideState) => void = () => {};
  onReach: (event: WorldEvent | null) => void = () => {};

  constructor(
    private readonly scene: HypercubeScene,
    private readonly travel: ScrollReader,
    private readonly sound: Sound,
  ) {
    this.schedule = rideSchedule(scene.stops);
    this.curve = rideCurve(scene.stops, scene.data.present);
    this.head = this.curve(0);
    this.time = scene.stops[0].time;
    scene.beforeCamera((seconds) => this.frame(seconds));
  }

  isOn() {
    return this.state === "playing" || this.state === "paused";
  }

  /** Starts the ride from 2014. A ride asked for during the unfold finishes the unfold first, at once. */
  start() {
    const { scene } = this;
    if (!scene.unfold.isDone()) scene.unfold.setShare(1);
    this.clock = 0;
    this.reached = -1;
    this.jumped = true;
    scene.focus.ride = { current: null, met: new Set(), city: cityAt(scene.stops[0].time) };
    this.followThePoint();
    this.setState("playing");
    this.onReach(null);
    scene.relight();
  }

  /** The control: starts, pauses or resumes. */
  toggle() {
    if (this.state === "playing") return this.pause();
    if (this.state === "paused") return this.resume();
    this.start();
  }

  pause() {
    if (this.state !== "playing") return;
    this.hurried = false;
    this.setState("paused");
  }

  resume() {
    if (this.state !== "paused") return;
    this.followThePoint();
    this.setState("playing");
  }

  private followThePoint() {
    const camera = this.scene.touch ? RIDE_CAMERA.phone : RIDE_CAMERA.computer;
    this.scene.follow(() => this.head, camera.follow);
    this.scene.setRiding(true);
    this.scene.zoom.zoomTo(camera.zoom);
  }

  /** Any other hand on the object: a playing ride pauses where it is, and an ended one lets its thread go. */
  handled() {
    if (this.state === "playing") this.pause();
    else if (this.state === "ended") this.setState("off");
  }

  /** Holding the stage or Space hurries a playing ride; letting go returns it to its pace. */
  hurry(on: boolean) {
    this.hurried = on && this.state === "playing";
    this.scene.requestFrame();
  }

  /** Previous or next event, by -1 or 1. */
  stepBy(direction: number) {
    if (!this.isOn()) return;
    this.goToStop(Math.max(0, Math.min(this.scene.stops.length - 1, Math.max(0, this.reached) + direction)));
  }

  /** A scrub along the rail to a moment: the point goes to the last event begun by then, and holds while held. */
  scrubTo(time: number, holding: boolean) {
    if (!this.isOn()) return false;
    this.held = holding;
    this.goToStop(stopAtTime(this.scene.stops, time));
    return true;
  }

  release() {
    this.held = false;
    this.scene.requestFrame();
  }

  /** Ends the ride now: the camera lets the point go and its thread fades. Says whether there was one. */
  end() {
    if (this.state === "off") return false;
    const wasOn = this.isOn();
    this.setState("off");
    if (wasOn) this.letGo();
    return true;
  }

  private goToStop(index: number) {
    this.clock = arrivalOf(this.schedule, index);
    this.jumped = true;
    this.scene.requestFrame();
  }

  private setState(state: RideState) {
    if (this.state === state) return;
    this.state = state;
    this.onState(state);
    this.scene.requestFrame();
  }

  /**
    The point reaches the present and the ride is over: the camera pulls back to the whole, time lies laid out (landed
    there even when steps or a scrub left the turn short of it), and the thread stays.
  */
  private finish() {
    this.scene.turn.turnTo(LAID_OUT, 0);
    this.letGo();
    this.setState("ended");
  }

  private letGo() {
    const { scene } = this;
    scene.focus.ride = null;
    scene.follow(null);
    scene.setRiding(false);
    scene.zoom.zoomTo(0);
    this.travel.scrollToProgress(0);
    this.onReach(null);
    scene.relight();
  }

  /** Every frame, before the camera: the clock, the point, the thread, what is lit and what follows. */
  private frame(seconds: number) {
    const { scene } = this;
    let moving = this.light.step(this.state === "off" ? 0 : 1, seconds);
    if (scene.reducedMotion) this.light.jump(this.state === "off" ? 0 : 1);
    scene.uniforms.rideLight.value = this.light.value;
    if (this.state === "playing" && !this.held) {
      this.clock += seconds * this.pace();
      moving = true;
    }
    if (this.state === "playing" || this.jumped) this.place(seconds);
    this.answerCrossing(seconds);
    moving = moving || this.crossing > 0;
    if (this.state === "playing" && this.clock >= this.schedule.pullBack) this.finish();
    return moving;
  }

  /** Puts the point where the clock says, lights what it has reached, and has the travel and the turn follow. */
  private place(seconds: number) {
    const { scene } = this;
    const at = rideAt(this.schedule, this.clock, scene.reducedMotion);
    this.along = at.along;
    this.head = this.curve(at.along);
    scene.uniforms.rideAlong.value = at.along;
    scene.uniforms.rideHead.value.set(...this.head);
    const time = at.reached < 0 ? scene.stops[0].time : timeAlong(scene.stops, at.along);
    this.crossed(this.time, time);
    this.time = time;
    if (at.reached !== this.reached) this.reach(at.reached);
    this.travel.scrollToProgress(travelAtTime(time, scene.data.present));
    if (this.state === "playing" && !this.jumped) this.turnWithTime(seconds * (this.held ? 0 : 1));
    this.jumped = false;
  }

  private reach(index: number) {
    const { scene } = this;
    const ride = scene.focus.ride;
    this.reached = index;
    if (!ride) return;
    const event = index >= 0 ? scene.stops[index].event : null;
    ride.current = event;
    ride.met = new Set(scene.stops.slice(0, index + 1).map((stop) => stop.event.id));
    ride.city = cityAt(index >= 0 ? scene.stops[index].time : scene.stops[0].time);
    if (event && this.state === "playing") this.sound.tone(event.world);
    this.onReach(event);
    scene.relight();
  }

  /** The faint circle of a move between cities answers as the point crosses its moment. */
  private crossed(from: number, to: number) {
    const crossedMove = moveTimes.find((move) => from < move && move <= to);
    if (crossedMove === undefined) return;
    this.scene.uniforms.crossedMove.value = crossedMove;
    this.crossing = 1;
    if (this.scene.focus.ride) this.scene.focus.ride.city = cityAt(to);
    this.scene.labels?.placeSoon();
  }

  private answerCrossing(seconds: number) {
    if (this.crossing <= 0) return;
    this.crossing = Math.max(0, this.crossing - seconds / CROSSING_SECONDS);
    this.scene.uniforms.crossingGlow.value = this.crossing;
  }

  /**
    The turn through w follows time: from wherever the reader left it, it heads for time laid out in a line at the pace
    that lands there as the point reaches the present, and the turn up and down settles to level on the way.
  */
  private turnWithTime(seconds: number) {
    const { turn } = this.scene;
    const left = Math.max(SHORTEST_LANDING, (this.schedule.pullBack - this.clock) / this.pace());
    const share = Math.min(1, seconds / left);
    turn.turnTo(turn.readerAcross() + (LAID_OUT - turn.readerAcross()) * share, turn.readerUp() * (1 - share));
  }

  /** Where the moving point is now, in four dimensions. */
  headPoint() {
    return this.head;
  }

  /** How many seconds of the ride pass in one second now. */
  private pace() {
    return (this.hurried ? HURRIED : 1) * this.checkPace;
  }

  /** For the checks: runs the ride's clock this many times quicker, so a suite need not wait 70 seconds. */
  runQuicker(times: number) {
    this.checkPace = times;
  }

  /** For the checks: where the ride stands. */
  report() {
    return {
      state: this.state,
      clock: this.clock,
      length: this.schedule.total,
      reached: this.reached,
      event: this.reached >= 0 ? this.scene.stops[this.reached].event.id : null,
      along: this.along,
      time: this.time,
      hurried: this.hurried,
      light: this.light.value,
    };
  }

  /** For the checks and the crops: jumps the clock to a stop. */
  jumpTo(index: number) {
    if (!this.isOn()) this.start();
    this.goToStop(index);
  }
}

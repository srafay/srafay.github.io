/*
  The ride, played. A clock runs through the schedule (lib/hypercube/ride.ts): the moving point rests at each event and
  moves quickly to the next. As it goes it drives what is already there: the travel reader (so the year in focus, the
  rail and the big year follow), the camera (which looks toward the point), the turn through w (from where the ride
  began toward time laid out in a line, landing there at the present), and what is lit.

  It plays by itself once the unfold reaches 2014, and plays on while the reader looks around: a turn, a zoom or a tilt
  is kept as the reader's own offset on top of the ride's, and a vertical swipe scrubs it through time. Only the pause
  control, a card or a panel pause it. Holding still hurries it. Skip goes straight to the end.
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
  middle toward the moving point it looks.
*/
const RIDE_CAMERA = { phone: { zoom: 0, follow: 0.7 }, computer: { zoom: 0, follow: 0.65 } };
/** Where the turn through w is heading by the present: a quarter turn, time laid out in a line. */
const LAID_OUT = -Math.PI / 2;
/** How far the reader may turn up and down through w on top of the ride, so the object never turns over its top. */
const LARGEST_UP_OFFSET = (85 * Math.PI) / 180;
/** Holding the stage or Space runs the ride this many times quicker. */
const HURRIED = 4;
/** How long the circle of a move between cities answers after the point crosses it, in seconds. */
const CROSSING_SECONDS = 0.6;
/** How long after reaching the present the finale plays, in seconds of the ride: once Twin Technology's skills land. */
const FINALE_AFTER = 0.6;

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
  /** Set when a ride control moved the clock, so the travel follows even while paused. */
  private jumped = false;
  /** Set on load: the ride starts by itself on the frame the unfold reaches 2014. */
  private autoplayArmed = false;
  private finaleDone = false;
  /** Set when the reader skipped to the end, so the page is given back at once, with no pull back to watch. */
  private skipped = false;
  private reached = -1;
  private along = 0;
  private time: number;
  private head: Point4;
  private readonly light = new Follower(0, 30);
  private crossing = 0;
  /** Where the turn through w stood as the ride began: the ride's own turn runs from here to laid out. */
  private startAcross = 0;
  /** The reader's own turn (across and up through w) and zoom, kept on top of the ride's while it plays. */
  private readonly offset = { across: 0, up: 0, zoom: 0 };
  /** Called when the state changes, when a ride starts, when the point reaches a stop, and at the finale. */
  onState: (state: RideState) => void = () => {};
  onStart: () => void = () => {};
  onReach: (event: WorldEvent | null, index: number) => void = () => {};
  onFinale: () => void = () => {};
  onSkip: () => void = () => {};

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

  /** The ride waits for the unfold, then starts by itself. Never under reduced motion. */
  armAutoplay() {
    this.autoplayArmed = !this.scene.reducedMotion;
  }

  /** Whether the ride is waiting for the unfold to start by itself, or running: Skip shows for both. */
  isAutoplaying() {
    return this.autoplayArmed || this.isOn();
  }

  /** Starts the ride from 2014. A ride asked for during the unfold finishes the unfold first, at once. */
  start() {
    const { scene } = this;
    this.autoplayArmed = false;
    if (!scene.unfold.isDone()) scene.unfold.setShare(1);
    this.clock = 0;
    this.reached = -1;
    this.jumped = true;
    this.finaleDone = false;
    this.skipped = false;
    this.startAcross = scene.turn.readerAcross();
    this.offset.across = 0;
    this.offset.up = 0;
    this.offset.zoom = 0;
    scene.focus.ride = { current: null, met: new Set(), city: cityAt(scene.stops[0].time) };
    this.followThePoint();
    this.onStart();
    this.setState("playing");
    this.onReach(null, -1);
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
  }

  /** A hand on the object once the ride has ended lets its thread go. During a ride it changes the view only. */
  handled() {
    if (this.state === "ended") this.setState("off");
  }

  /** The reader turns the object while it rides: kept as an offset on top of the ride's own turn. */
  turnBy(across: number, up: number) {
    this.offset.across += across;
    this.offset.up = Math.max(-LARGEST_UP_OFFSET, Math.min(LARGEST_UP_OFFSET, this.offset.up + up));
    this.scene.requestFrame();
  }

  /** The reader zooms while it rides: kept as an offset on top of the ride's own zoom. */
  zoomBy(amount: number) {
    this.offset.zoom = Math.max(-1, Math.min(1, this.offset.zoom + amount));
    this.scene.requestFrame();
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

  /** A scrub to a moment, by the rail or a vertical swipe: the point goes to the last event begun by then. */
  scrubTo(time: number) {
    if (!this.isOn()) return false;
    const index = stopAtTime(this.scene.stops, time);
    if (index !== this.reached) this.goToStop(index);
    return true;
  }

  /** A scrub along the thin rail, by a share of the whole ride: the point goes to the last stop reached by then. */
  seekShare(share: number) {
    if (!this.isOn()) return;
    const clock = Math.max(0, Math.min(1, share)) * this.schedule.pullBack;
    let index = 0;
    this.schedule.arrivals.forEach((arrival, place) => {
      if (arrival <= clock) index = place;
    });
    if (index !== this.reached) this.goToStop(index);
  }

  /**
    Ends the ride now: the camera lets the point go and its thread fades. Before it has started by itself, it no longer
    will (Escape during the unfold says no thanks). Says whether there was a ride to end or to call off.
  */
  end() {
    const wasArmed = this.autoplayArmed;
    this.autoplayArmed = false;
    if (this.state === "off") {
      if (wasArmed) this.onState("off");
      return wasArmed;
    }
    const wasOn = this.isOn();
    this.setState("off");
    if (wasOn) this.letGo();
    return true;
  }

  /** Skip: straight to the end, the board full, the object laid out, the thread drawn whole. */
  skipToEnd() {
    if (!this.isOn()) this.start();
    this.clock = this.schedule.pullBack;
    this.jumped = true;
    this.place();
    this.onSkip();
    this.finaleDone = true;
    this.skipped = true;
    this.finish();
  }

  /** Whether the ride just ended by Skip. */
  wasSkipped() {
    return this.skipped;
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
    The point reaches the present and the ride is over: the camera pulls back to the whole, and time lands laid out as
    the reader's offsets ease away (the turn and zoom glide to the ride's last pose), and the thread stays.
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
    this.onReach(null, this.reached);
    scene.relight();
  }

  /** Every frame, before the camera: the clock, the point, the thread, what is lit and what follows. */
  private frame(seconds: number) {
    const { scene } = this;
    if (this.autoplayArmed && scene.unfold.isDone()) this.start();
    let moving = this.light.step(this.state === "off" ? 0 : 1, seconds);
    if (scene.reducedMotion) this.light.jump(this.state === "off" ? 0 : 1);
    scene.uniforms.rideLight.value = this.light.value;
    if (this.state === "playing") {
      this.clock += seconds * this.pace();
      moving = true;
    }
    if (this.state === "playing" || this.jumped) this.place();
    if (this.isOn()) this.holdTheView();
    this.answerCrossing(seconds);
    moving = moving || this.crossing > 0;
    const finaleAt = this.schedule.arrivals[this.schedule.arrivals.length - 1] + FINALE_AFTER;
    if (this.isOn() && !this.finaleDone && this.clock >= finaleAt) {
      this.finaleDone = true;
      this.onFinale();
    }
    if (this.state === "playing" && this.clock >= this.schedule.pullBack) this.finish();
    return moving;
  }

  /** Puts the point where the clock says, lights what it has reached, and has the travel follow. */
  private place() {
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
    // On the way in to the first stop every year still shows, as the unfold left it; the slice comes in at 2014.
    this.travel.scrollToProgress(at.reached < 0 ? 0 : travelAtTime(time, scene.data.present));
    this.jumped = false;
  }

  /**
    The turn and zoom the ride holds: its own turn runs evenly with its clock from where it began to laid out, and the
    reader's offsets sit on top of it, so the ride's motion carries on under whatever the reader did.
  */
  private holdTheView() {
    const share = Math.min(1, this.clock / this.schedule.pullBack);
    const across = this.startAcross + (LAID_OUT - this.startAcross) * share;
    this.scene.turn.turnTo(across + this.offset.across, this.offset.up);
    this.scene.zoom.zoomTo((this.scene.touch ? RIDE_CAMERA.phone : RIDE_CAMERA.computer).zoom + this.offset.zoom);
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
    this.onReach(event, index);
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

  /** Where the moving point is now, in four dimensions. */
  headPoint() {
    return this.head;
  }

  /** How far through the whole ride the clock is, from 0 to 1, for the thin rail. */
  progress() {
    return Math.min(1, this.clock / this.schedule.pullBack);
  }

  /** How many seconds of the ride pass in one second now. */
  pace() {
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
      offset: { ...this.offset },
      autoplay: this.autoplayArmed,
    };
  }

  /** For the checks and the crops: jumps the clock to a stop. */
  jumpTo(index: number) {
    if (!this.isOn()) this.start();
    this.goToStop(index);
  }
}

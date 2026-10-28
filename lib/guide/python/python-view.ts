/*
  The python on the page: where it rests, how it moves, where it looks, what it wears, how it is held, and how it is
  drawn. One frame loop, which runs only while something moves: at the screen's rate during a grab, a trick or a
  move, and at 30 frames a second when it only breathes. Nothing is drawn while the page is hidden.
*/
import * as THREE from "three";
import { Follower } from "@/lib/about-cv/scene/follower";
import type { FieldsBehind } from "./dither";
import { DitherRenderer } from "./dither";
import { Wardrobe, type CostumeKey } from "./costumes";
import { HitArea } from "./hit-area";
import { PythonModel, type HeadFrame } from "./model";
import { breathAt, denLength, denSpine, helloSpine, idleSway, perchSpine, type Stage } from "./poses";
import { bodyLengthFor, head as headShape } from "./proportions";
import { Rope } from "./rope";
import {
  blendSpines,
  boundsOf,
  copySpine,
  cross,
  dot,
  nearestIndex,
  normalise,
  add,
  scale,
  subtract,
  tangentAt,
  type Point,
  type Spine,
  SPINE_POINTS,
} from "./spine";
import { clearExtras, tricks, type TrickKey, type TrickStart } from "./tricks";

/** Where the python rests: the first screen's pose, a perch in a side margin, or the den along the bottom. */
export type Home = "hello" | "left" | "right" | "den";

/** Drawn at most this often when the python only breathes: 30 frames a second. */
const IDLE_FRAME_SECONDS = 1 / 30 - 0.003;
/** How long a move between homes takes, in seconds. */
const MOVE_SECONDS = 1.1;
/** The longest a dropped python lies where it fell before it goes home, in seconds. */
const LONGEST_FALL_SECONDS = 1.4;
/** How long a dropped python takes to return to its pose. */
const RETURN_SECONDS = 0.9;
/** A press becomes a grab after this much movement (CSS pixels) or this long held (seconds). */
const GRAB_AFTER_PIXELS = 6;
const GRAB_AFTER_SECONDS = 0.18;

const ease = (share: number) => share * share * (3 - 2 * share);

export type PythonViewOptions = {
  reducedMotion: boolean;
  /** The fields behind the canvas, from its bottom and top in stage space (y up from the screen's bottom). */
  fieldsBehind(bottom: number, top: number): FieldsBehind;
  /** Called when the python is tapped, not dragged. */
  onTap(): void;
  /** Called the first time it is picked up. */
  onPickedUp(): void;
  /** Called when it is let go after being held. */
  onDropped(): void;
  /** Called when the head moves, with its place and the body's bounds in stage space, for the bubble that follows it. */
  onHeadMoved(head: Point, headLength: number, body: { left: number; right: number; bottom: number; top: number }): void;
  /** The bottom strip, measured by the page: how tall it is and where its floor is, up from the screen's bottom. */
  den(): { top: number; floor: number };
  label: string;
};

type Move = { from: Spine; fromLength: number; started: number; seconds: number };

type Press = { pointerId: number; x: number; y: number; at: number; index: number };
type PlayingTrick = { key: TrickKey; started: number; start: TrickStart };

export class PythonView {
  readonly reducedMotion: boolean;
  stage: Stage;
  private readonly model: PythonModel;
  private readonly dither: DitherRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(0, 1, 1, 0, -5000, 5000);
  private readonly wardrobe: Wardrobe;
  readonly hits: HitArea;
  private home: Home = "hello";
  private move: Move | null = null;
  private rope: Rope | null = null;
  private press: Press | null = null;
  private trick: PlayingTrick | null = null;
  private returning: Move | null = null;
  private droppedAt = 0;
  private spine: Spine;
  /** How long the python is now: its full length, or shorter in the den, and between the two while it moves. */
  private length: number;
  private readonly gaze = { x: new Follower(0, 30), y: new Follower(0, 30), z: new Follower(1, 30) };
  private lookAt: Point | null = null;
  private lastUp: Point = { x: 0, y: 1, z: 0 };
  private nextFlick = 0.4;
  private nextBlink = 2.5;
  private frameRequested = false;
  private lastDrawn = 0;
  private lastTime = 0;
  private hidden = false;
  private nudgedUntil = 0;
  frames = 0;
  /** The head's frame as last drawn, for checks and the bubble. */
  headFrame: HeadFrame | null = null;

  constructor(
    private readonly layer: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly options: PythonViewOptions,
  ) {
    this.reducedMotion = options.reducedMotion;
    this.stage = this.measureStage();
    this.length = this.stage.bodyLength;
    this.dither = new DitherRenderer(canvas);
    this.model = new PythonModel(this.stage.bodyLength, this.stage.narrow ? 10 : 14);
    this.scene.add(this.model.group);
    this.wardrobe = new Wardrobe(this.model.costumeHolder);
    this.hits = new HitArea(layer, SPINE_POINTS, options.label);
    this.spine = this.homeSpine(0);
    this.sizeCanvas();
    this.listen();
  }

  /** The screen as the poses see it. The height is taken on width changes only, so a phone's sliding bars move nothing. */
  private measureStage(): Stage {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const den = this.options.den();
    return { width, height, bodyLength: bodyLengthFor(width), narrow: width < 700, den: width < 900, denTop: den.top, denFloor: den.floor };
  }

  private sizeCanvas() {
    const headLength = headShape.lengthShare * this.stage.bodyLength;
    this.dither.resize(this.stage.bodyLength + headLength * 2 + 24, window.devicePixelRatio || 1);
  }

  /** The screen's width changed: everything is laid out again for it. */
  resize() {
    const width = window.innerWidth;
    if (width === this.stage.width && (window.devicePixelRatio || 1) === this.dither.devicePixelRatio) return;
    this.stage = this.measureStage();
    this.length = this.targetLength();
    this.model.setBodyLength(this.length);
    this.sizeCanvas();
    this.rope = null;
    this.move = null;
    this.spine = this.homeSpine(this.clock());
    this.requestFrame();
  }

  private clock = () => performance.now() / 1000;

  /** The bottom strip was measured again (its height changed): the den follows it. */
  denChanged() {
    const den = this.options.den();
    if (den.top === this.stage.denTop && den.floor === this.stage.denFloor) return;
    this.stage = { ...this.stage, denTop: den.top, denFloor: den.floor };
    this.requestFrame();
  }

  /** How long the python is at its home: shorter in the den, so it fits inside the strip. */
  private targetLength() {
    return this.home === "den" ? denLength(this.stage) : this.stage.bodyLength;
  }

  /** The screen as the poses see it, with the python at its length now. */
  private poseStage(): Stage {
    return { ...this.stage, bodyLength: this.length };
  }

  /** The pose at home now, breathing and swaying unless motion is reduced. */
  private homeSpine(seconds: number): Spine {
    const stage = this.poseStage();
    const base = this.home === "hello" ? helloSpine(stage) : this.home === "den" ? denSpine(stage) : perchSpine(stage, this.home);
    return this.reducedMotion ? base : idleSway(base, seconds, this.length);
  }

  /** Resting in the den and not moving, held or falling. */
  get inDen() {
    return this.home === "den" && !this.rope && !this.move && !this.returning;
  }

  goHome(home: Home) {
    if (home === this.home) return;
    this.home = home;
    if (this.rope) return;
    this.move = this.reducedMotion ? null : { from: copySpine(this.spine), fromLength: this.length, started: this.clock(), seconds: MOVE_SECONDS };
    this.requestFrame();
  }

  get currentHome() {
    return this.home;
  }

  wear(costume: CostumeKey | null) {
    this.wardrobe.wear(costume);
    this.requestFrame();
  }

  get worn() {
    return this.wardrobe.worn;
  }

  play(key: TrickKey) {
    if (this.rope) return false;
    clearExtras(this.model);
    const neck = this.spine[this.spine.length - 1];
    const towardRoom = neck.x > this.stage.width / 2 ? -1 : 1;
    this.trick = { key, started: this.clock(), start: { spine: copySpine(this.spine), bodyLength: this.length, towardRoom } };
    this.requestFrame();
    return true;
  }

  /** The head's length on screen, in CSS pixels. */
  get headLength() {
    return headShape.lengthShare * this.length;
  }

  get playing() {
    return this.trick?.key ?? null;
  }

  get held() {
    return Boolean(this.rope && this.rope.held !== null);
  }

  /** Looks at a place in stage space, or at the reader when null. */
  look(place: Point | null) {
    this.lookAt = place;
    this.requestFrame();
  }

  private listen() {
    const toStage = (event: PointerEvent): Point => ({ x: event.clientX, y: window.innerHeight - event.clientY, z: 0 });
    this.hits.element.addEventListener("pointerdown", (event) => {
      if (!this.hits.owns(event.target) || event.button > 0) return;
      const place = toStage(event);
      const index = Number((event.target as HTMLElement).dataset.spineIndex ?? 0);
      const nearest = nearestIndex(this.spine, place.x, place.y);
      this.press = { pointerId: event.pointerId, ...place, at: this.clock(), index: nearest.distance < 80 ? nearest.index : index };
      try {
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      } catch {
        // A pointer the browser no longer counts as down cannot be captured: the window still hears it move.
      }
      event.preventDefault();
      this.requestFrame();
    });
    // A touch that began on the python never scrolls the page, even where touch-action is not honoured.
    this.hits.element.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
    window.addEventListener("pointermove", (event) => {
      const place = toStage(event);
      if (event.pointerType === "mouse") this.look(place);
      if (!this.press || event.pointerId !== this.press.pointerId) return;
      const moved = Math.hypot(place.x - this.press.x, place.y - this.press.y);
      if (!this.rope && moved > GRAB_AFTER_PIXELS) this.pickUp(place);
      this.rope?.moveHand(place.x, place.y);
      this.look(place);
    });
    const release = (event: PointerEvent) => {
      if (!this.press || event.pointerId !== this.press.pointerId) return;
      const wasHeld = Boolean(this.rope);
      this.press = null;
      if (wasHeld) this.letGo();
      else this.options.onTap();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") this.look(toStage(event));
    });
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.visibilityState === "hidden";
      if (!this.hidden) this.requestFrame();
    });
  }

  /**
   * The python's length follows its home: while it moves it grows or shrinks on the way, so it slithers down into the
   * den and back out at full size. Held, it keeps the length it had.
   */
  private followLength(now: number) {
    if (this.rope) return;
    const target = this.targetLength();
    const travel = this.move ?? this.returning;
    this.length = travel ? travel.fromLength + (target - travel.fromLength) * ease(Math.min(1, (now - travel.started) / travel.seconds)) : target;
    if (this.model.bodyLength !== this.length) this.model.setBodyLength(this.length);
  }

  /** Takes hold of the python at the pressed point, from where the hand is now. */
  private pickUp(hand: Point) {
    if (!this.press) return;
    this.trick = null;
    clearExtras(this.model);
    this.move = null;
    this.returning = null;
    this.rope = new Rope(this.spine, this.length);
    this.rope.floor = this.stage.den ? this.stage.denFloor : this.stage.denTop + 4;
    this.rope.hold(this.press.index, hand.x, hand.y);
    this.layer.dataset.held = "";
    this.options.onPickedUp();
    this.requestFrame();
  }

  /** Lets go: it falls to the floor, then goes home. */
  letGo() {
    if (this.rope?.held !== null && this.rope) this.options.onDropped();
    this.rope?.letGo();
    this.droppedAt = this.clock();
    this.requestFrame();
  }

  /** Lifts it from the keyboard: held where its middle is, raised a little. */
  liftByKeys() {
    this.press = { pointerId: -1, x: this.spine[20].x, y: this.spine[20].y, at: this.clock(), index: 20 };
    this.pickUp({ x: this.spine[20].x, y: this.spine[20].y + this.length * 0.4, z: 0 });
    this.press = null;
  }

  /** Moves a python held from the keyboard. */
  nudgeHeld(across: number, up: number) {
    if (!this.rope || this.rope.held === null) return;
    const held = this.rope.points[this.rope.held];
    this.rope.moveHand(held.x + across, held.y + up);
    this.requestFrame();
  }

  /** The page scrolled: draw at the screen's rate for a moment, so a field's edge passing behind it keeps up. */
  nudge() {
    this.nudgedUntil = this.clock() + 0.25;
    this.requestFrame();
  }

  /** At most one frame is asked for at a time. */
  requestFrame() {
    if (this.frameRequested || this.hidden) return;
    this.frameRequested = true;
    requestAnimationFrame(() => this.frame());
  }

  private frame() {
    this.frameRequested = false;
    const now = this.clock();
    const seconds = Math.min(0.1, this.lastTime ? now - this.lastTime : 1 / 60);
    this.lastTime = now;
    const busy = Boolean(this.rope || this.trick || this.move || this.returning || this.press) || now < this.nudgedUntil;
    const idle = !this.reducedMotion;
    if (!busy && idle && now - this.lastDrawn < IDLE_FRAME_SECONDS) {
      this.requestFrame();
      return;
    }
    this.draw(now, seconds);
    this.lastDrawn = now;
    if (busy || idle) this.requestFrame();
  }

  private draw(now: number, seconds: number) {
    // A press held still becomes a grab too: the python lifts from where the hand rests.
    if (this.press && !this.rope && now - this.press.at > GRAB_AFTER_SECONDS) this.pickUp({ x: this.press.x, y: this.press.y, z: 0 });
    this.followLength(now);
    let spine = this.homeSpine(now);
    if (this.move) {
      const share = Math.min(1, (now - this.move.started) / this.move.seconds);
      spine = slither(this.move.from, spine, share, this.length);
      if (share >= 1) this.move = null;
    }
    if (this.rope) {
      this.rope.step(seconds);
      spine = this.rope.points;
      const fallenLongEnough = now - this.droppedAt > LONGEST_FALL_SECONDS;
      if (this.rope.held === null && (this.rope.settled || fallenLongEnough)) {
        this.returning = { from: copySpine(this.rope.points), fromLength: this.length, started: now, seconds: RETURN_SECONDS };
        this.rope = null;
        delete this.layer.dataset.held;
      }
    }
    if (this.returning && !this.rope) {
      const share = Math.min(1, (now - this.returning.started) / this.returning.seconds);
      spine = slither(this.returning.from, this.homeSpine(now), share, this.length);
      if (share >= 1) this.returning = null;
    }
    let tongueOverride: number | null = null;
    let bulge: { at: number; size: number } | null = null;
    const playing = this.trick;
    const play = playing ? tricks[playing.key] : null;
    const share = playing && play ? (this.reducedMotion ? play.stillAt : Math.min(1, (now - playing.started) / play.seconds)) : 0;
    if (playing && play) spine = play.body(spine, share, playing.start);
    let headFrame = this.headFrameFor(spine, seconds);
    if (playing && play) {
      if (play.head) headFrame = play.head(headFrame, share, playing.start);
      tongueOverride = play.tongue?.(share) ?? null;
      bulge = play.bulge?.(share) ?? null;
      Object.assign(this.model.frame, headFrame);
      play.extras?.(this.model, share, playing.start, headFrame);
      const heldFor = this.reducedMotion ? 1.5 : play.seconds;
      if (now - playing.started >= heldFor) {
        this.trick = null;
        clearExtras(this.model);
      }
    }
    this.spine = spine;
    this.model.updateBody(spine, this.reducedMotion ? 1 : breathAt(now), bulge);
    this.model.updateHead(headFrame);
    this.headFrame = headFrame;
    this.model.setTongue(tongueOverride ?? this.tongueAt(now));
    this.model.setEyesOpen(this.eyesOpenAt(now));
    this.placeCanvasAndDraw(spine, headFrame);
    const headLength = headShape.lengthShare * this.length;
    this.hits.place(spine, headFrame.centre, this.length, Boolean(this.rope));
    this.options.onHeadMoved(headFrame.centre, headLength, boundsOf(spine));
    this.frames++;
  }

  /** The head on the end of the neck, turned toward what it looks at. */
  private headFrameFor(spine: Spine, seconds: number): HeadFrame {
    const neck = spine[spine.length - 1];
    const along = tangentAt(spine, spine.length - 1);
    // How far in front of the screen the reader's eye is taken to be: nearer turns the head more toward the place.
    const reach = this.length * 0.4;
    // With nothing to follow it looks across the screen, toward the side its bubble opens on, so the reader sees its
    // face three-quarters: the wedge of the head and one eye clearly, never both eyes end-on like a cartoon.
    const target = this.lookAt ?? this.restingGaze(neck);
    const toward = normalise({ x: target.x - neck.x, y: target.y - neck.y, z: reach });
    const held = this.rope?.held !== null && this.rope !== null;
    const leaning = normalise(add(scale(along, held ? 0.6 : 0.25), scale(toward, held ? 0.4 : 0.75)));
    const wanted = levelled(leaning);
    let forward: Point;
    if (seconds > 0 && !this.reducedMotion) {
      this.gaze.x.step(wanted.x, seconds);
      this.gaze.y.step(wanted.y, seconds);
      this.gaze.z.step(wanted.z, seconds);
      forward = normalise({ x: this.gaze.x.value, y: this.gaze.y.value, z: this.gaze.z.value });
    } else {
      this.gaze.x.jump(wanted.x);
      this.gaze.y.jump(wanted.y);
      this.gaze.z.jump(wanted.z);
      forward = wanted;
    }
    let up = subtract({ x: 0, y: 1, z: 0 }, scale(forward, forward.y));
    if (Math.hypot(up.x, up.y, up.z) < 0.25) up = subtract(this.lastUp, scale(forward, dot(this.lastUp, forward)));
    up = normalise(up);
    this.lastUp = up;
    const side = normalise(cross(up, forward));
    const halfLength = (headShape.lengthShare * this.length) / 2;
    return { centre: add(neck, scale(forward, halfLength * 0.72)), forward, up, side };
  }

  /** Where it looks with nothing to follow: half a screen across, toward the roomier side, a little above its head. */
  private restingGaze(neck: Point): Point {
    const toward = neck.x > this.stage.width / 2 ? -1 : 1;
    return { x: neck.x + toward * this.stage.width * 0.5, y: neck.y + this.stage.height * 0.12, z: 0 };
  }

  /** Two quick flicks every four to seven seconds. */
  private tongueAt(now: number) {
    if (this.reducedMotion) return 0;
    if (now > this.nextFlick + 0.5) this.nextFlick = now + 4 + Math.random() * 3;
    const into = now - this.nextFlick;
    if (into < 0 || into > 0.5) return 0;
    const flick = (into % 0.25) / 0.25;
    return Math.sin(flick * Math.PI);
  }

  /** A slow blink every three to six seconds. Real snakes cannot blink; this one was asked to. */
  private eyesOpenAt(now: number) {
    if (this.reducedMotion) return 1;
    if (now > this.nextBlink + 0.3) this.nextBlink = now + 3 + Math.random() * 3;
    const into = now - this.nextBlink;
    if (into < 0 || into > 0.3) return 1;
    return Math.abs(Math.cos((into / 0.3) * Math.PI));
  }

  /** The canvas follows the python, whole cells at a time, and the camera with it. Then it is drawn. */
  private placeCanvasAndDraw(spine: Spine, headFrame: HeadFrame) {
    const bounds = boundsOf([...spine, headFrame.centre]);
    const side = this.dither.cssSide;
    const unit = this.dither.cell / this.dither.devicePixelRatio;
    const left = Math.round(((bounds.left + bounds.right) / 2 - side / 2) / unit) * unit;
    const bottom = Math.round(((bounds.bottom + bounds.top) / 2 - side / 2) / unit) * unit;
    this.canvas.style.transform = `translate3d(${left}px, ${-bottom}px, 0)`;
    this.camera.left = left;
    this.camera.right = left + side;
    this.camera.bottom = bottom;
    this.camera.top = bottom + side;
    this.camera.updateProjectionMatrix();
    this.dither.render(this.scene, this.camera, this.options.fieldsBehind(bottom, bottom + side));
    this.canvasBox = { left, bottom, side };
  }

  canvasBox = { left: 0, bottom: 0, side: 0 };

  get cell() {
    return { devicePixels: this.dither.cell, devicePixelRatio: this.dither.devicePixelRatio };
  }

  /** Redraws at a different cell size, for comparison crops only. */
  setCell(devicePixels: number) {
    const headLength = headShape.lengthShare * this.stage.bodyLength;
    this.dither.resize(this.stage.bodyLength + headLength * 2 + 24, this.dither.devicePixelRatio, devicePixels);
    this.requestFrame();
  }

  /** The spine as last drawn, for checks. */
  get currentSpine() {
    return this.spine;
  }
}

/** A head kept near level, so the reader sees its wedge and both eyes rather than its chin or its crown end-on. */
function levelled(forward: Point): Point {
  const pitch = Math.min(0.32, Math.max(-0.38, forward.y));
  const flat = Math.hypot(forward.x, forward.z) || 1;
  const across = Math.sqrt(1 - pitch * pitch) / flat;
  return { x: forward.x * across, y: pitch, z: forward.z * across };
}

/**
 * A move from one pose to another: the body blends across, and a sideways wave runs along it while it moves, so it
 * slithers rather than slides. The wave dies away as it arrives.
 */
function slither(from: Spine, to: Spine, share: number, bodyLength: number): Spine {
  const eased = ease(share);
  const blended = blendSpines(from, to, (index) => ease(Math.min(1, Math.max(0, eased * 1.4 - (1 - index / (from.length - 1)) * 0.4))));
  const strength = Math.sin(share * Math.PI) * bodyLength * 0.035;
  return blended.map((each, index) => {
    const tangent = tangentAt(blended, index);
    const sideways = { x: -tangent.y, y: tangent.x, z: 0 };
    const wave = Math.sin(index * 0.55 - share * 14) * strength;
    return { x: each.x + sideways.x * wave, y: each.y + sideways.y * wave, z: each.z };
  });
}

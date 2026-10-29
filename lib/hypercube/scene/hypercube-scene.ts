/*
  The Hypercube scene on its stage: the renderer, the layers of dots (orbits and lines, dust, beads, the ride's thread,
  the present and the ride's moving point), the words, the camera that holds the object as it unfolds and turns, and
  the frame loop. A frame is drawn only when something moves. The idle turn keeps it moving, at thirty frames a second
  on a phone. Nothing is drawn while the page is hidden.
*/
import * as THREE from "three";
import type { WorldEvent } from "@/lib/about-cv/events";
import { Follower } from "@/lib/about-cv/scene/follower";
import type { SkillWord } from "@/lib/about-cv/skills";
import { worldIndex, type WorldKey } from "@/lib/about-cv/worlds";
import { PRESENT, rgbOf } from "@/lib/hypercube/palette";
import { rideStops, stopPoint, threadDots, type RideStop } from "@/lib/hypercube/ride";
import {
  beadDots,
  beadPoint,
  beadStarts,
  beadTime,
  COMPUTER_DETAIL,
  dustDots,
  PHONE_DETAIL,
  structureDots,
  type Detail,
  type Dots,
  type HypercubeData,
} from "@/lib/hypercube/shape";
import {
  angleThroughW,
  presentPoint,
  seenInThree,
  turned,
  type Matrix4D,
  type Point4,
} from "@/lib/hypercube/space";
import {
  beadLayer,
  CUBE_FIT,
  dotUniforms,
  dustLayer,
  headLayer,
  presentLayer,
  structureLayer,
  threadLayer,
  type DotUniforms,
} from "./dots";
import { Focus } from "./focus";
import {
  boundOf,
  distanceToFrame,
  immersivePlaceFor,
  restingAcross,
  restingDown,
  screenPlaceFor,
  SMALLEST_FRAMED_RADIUS,
  type Bound,
  type ScreenPlace,
} from "./framing";
import { LabelLayer, type Rectangle } from "./label-layer";
import { labelAtlas, sceneLabels, type Label } from "./labels";
import { ObjectTurn, Unfold, Zoom } from "./motion";
import { RestMotion } from "./rest-motion";

export type HypercubeElements = {
  root: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  title: HTMLElement;
};

/** Phones draw at most this many device pixels per CSS pixel, computers at most two. */
const LARGEST_PHONE_PIXEL_RATIO = 1.5;
const LARGEST_COMPUTER_PIXEL_RATIO = 2;
/** A phone draws the idle turn at about thirty frames a second; a computer at the screen's own rate. */
const PHONE_IDLE_INTERVAL = 1000 / 30;
/** The camera's field of view, up and down, in degrees, and how far above level it looks down on the object. */
const FIELD_OF_VIEW = 36;
const CAMERA_LIFT = (14 * Math.PI) / 180;
/** How large the present's light is drawn, in CSS pixels, on a phone and on a computer. */
const PRESENT_GLOW_PHONE = 120;
const PRESENT_GLOW_COMPUTER = 170;
/** How large the ride's moving point is drawn, in CSS pixels, on a phone and on a computer. */
const HEAD_GLOW_PHONE = 30;
const HEAD_GLOW_COMPUTER = 38;
/** Narrower than this, in CSS pixels, the present names itself by its short label. */
const NARROW_STAGE = 400;
/** How far round the present's point no other word may sit, in CSS pixels: its bright core and near glow. */
const PRESENT_KEEPS_CLEAR = 22;
/**
  The cube the object rests as: how far it leans toward the camera and how far it is turned round, and the radius the
  camera frames for it. As the cube turns, its corners sweep out to 0.93 of its shell across and 0.94 up and down
  (CUBE_FIT times root two, and with the lean), so these keep every corner clear of the rail and the controls: on a
  phone it rests a little left of the middle, in the open span, and fills from about three fifths to three quarters
  of the width as it turns.
*/
const CUBE_LEAN = (20 * Math.PI) / 180;
const CUBE_TURN = (32 * Math.PI) / 180;
const CUBE_FRAMED_RADIUS = { phone: 1.1, computer: 1.32 };

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const isTouchScreen = () => matchMedia("(hover: none) and (pointer: coarse)").matches;

const singleDot = (point: Point4, time: number, colour: [number, number, number]): Dots => ({
  count: 1,
  places: new Float32Array(point),
  times: new Float32Array([time]),
  colours: new Float32Array(colour),
  looks: new Float32Array([1, 1]),
  worlds: new Float32Array([-1]),
});

/** The city a moment falls in, for the ride's hand over from one to the next. */
export type CityAt = (time: number) => string | null;

export class HypercubeScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.01, 100);
  readonly uniforms: DotUniforms = dotUniforms();
  readonly reducedMotion = prefersReducedMotion();
  readonly touch = isTouchScreen();
  readonly detail: Detail;
  readonly unfold: Unfold;
  readonly turn: ObjectTurn;
  readonly zoom: Zoom;
  readonly focus: Focus;
  readonly rest: RestMotion;
  /** The ride's stops, in order. */
  readonly stops: RideStop[];
  /** How many dots each layer draws, for the checks and the hand-back. */
  readonly structureCount: number;
  readonly dustCount: number;
  readonly threadCount: number;
  labels: LabelLayer | null = null;
  private readonly beads: ReturnType<typeof beadLayer>;
  private readonly dust: ReturnType<typeof dustLayer>;
  private readonly cameraDistance = new Follower(1, 40);
  private readonly cameraTarget = [new Follower(0, 40), new Follower(0, 40), new Follower(0, 40)];
  /** Where the object's middle sits down the screen, eased as a ride moves it. */
  private readonly placeDown = new Follower(0.5, 40);
  private readonly placeAcross = new Follower(0.5, 40);
  private riding = false;
  private place: ScreenPlace = screenPlaceFor(1, 1);
  private width = 1;
  private height = 1;
  private framePending = false;
  private lastFrame = 0;
  private framesDrawn = 0;
  private readonly startTime = performance.now();
  private readonly frameListeners: ((scene: HypercubeScene, moving: boolean, seconds: number) => void)[] = [];
  private readonly changeListeners: (() => void)[] = [];
  private matrixNow: Matrix4D;
  private hasFramed = false;
  private visible = true;
  /** The places no word may cover: the name and its lines, and every control. */
  private blockedRectangles: Rectangle[] = [];
  /** The skills whose dust is lit on the chip, kept until it has flown home after they go out. */
  private dustLitSkills = new Set<number>();

  constructor(
    readonly elements: HypercubeElements,
    readonly data: HypercubeData,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: elements.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(
      Math.min(this.touch ? LARGEST_PHONE_PIXEL_RATIO : LARGEST_COMPUTER_PIXEL_RATIO, window.devicePixelRatio || 1),
    );
    this.uniforms.pixelRatio.value = this.renderer.getPixelRatio();
    this.detail = this.touch ? PHONE_DETAIL : COMPUTER_DETAIL;
    this.unfold = new Unfold(this.reducedMotion);
    this.turn = new ObjectTurn(this.reducedMotion);
    this.zoom = new Zoom(this.reducedMotion);
    this.focus = new Focus(data.present, this.reducedMotion);
    this.rest = new RestMotion(this.reducedMotion);
    this.matrixNow = this.turn.matrix();
    this.stops = rideStops(data);

    const structure = structureDots(data, this.detail);
    const dust = dustDots(data, this.detail);
    const thread = threadDots(this.stops, this.detail.threadGap, data.present);
    this.structureCount = structure.count;
    this.dustCount = dust.dots.count;
    this.threadCount = thread.dots.count;
    this.beads = beadLayer(beadDots(data), beadStarts(data), this.uniforms);
    this.dust = dustLayer(dust.dots, dust.targets, dust.skillOfSpeck, dust.litTints, this.uniforms);
    const warm = rgbOf(PRESENT);
    this.scene.add(
      structureLayer(structure, this.uniforms),
      this.dust.points,
      this.beads.points,
      threadLayer(thread.dots, thread.along, this.uniforms),
      presentLayer(
        singleDot(presentPoint(data.present), data.present, warm),
        this.uniforms,
        this.touch ? PRESENT_GLOW_PHONE : PRESENT_GLOW_COMPUTER,
        !this.reducedMotion,
      ),
      headLayer(singleDot(presentPoint(data.present), data.present, warm), this.uniforms, this.touch ? HEAD_GLOW_PHONE : HEAD_GLOW_COMPUTER),
    );
    this.measureStage();
    this.watchSize();
    this.watchVisibility();
  }

  private measureStage() {
    this.width = Math.max(1, this.elements.stage.clientWidth);
    this.height = Math.max(1, this.elements.stage.clientHeight);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.place = screenPlaceFor(this.width, this.height);
    if (this.labels) this.labels.quads.viewport.value.set(this.width, this.height);
  }

  stageSize() {
    return { width: this.width, height: this.height };
  }

  private watchSize() {
    let lastWidth = window.innerWidth;
    window.addEventListener("resize", () => {
      // A phone's bars change only the height, mid-gesture. The stage keeps still for those.
      if (this.touch && window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      this.measureStage();
      this.labels?.placeSoon();
      this.requestFrame();
    });
  }

  private watchVisibility() {
    new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      if (this.visible) this.requestFrame();
    }).observe(this.elements.stage);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.requestFrame();
    });
  }

  /** Called every frame, after the camera moved and before the picture is drawn. */
  onFrame(listener: (scene: HypercubeScene, moving: boolean, seconds: number) => void) {
    this.frameListeners.push(listener);
  }

  /** Called when what is lit, isolated or in focus changes. */
  onChange(listener: () => void) {
    this.changeListeners.push(listener);
  }

  /** Something moved: the next screen frame draws. */
  requestFrame() {
    this.urgent = true;
    this.askForScreenFrame();
  }

  /** Whether the frame asked for must draw, rather than wait for the idle turn's next slot. */
  private urgent = false;
  /** When the idle turn may draw next, on a phone. */
  private nextIdleAt = 0;

  private askForScreenFrame() {
    if (this.framePending) return;
    this.framePending = true;
    requestAnimationFrame((now) => this.frame(now));
  }

  /** How far the time axis has turned into space, in degrees. */
  angleThroughW() {
    return angleThroughW(this.matrixNow);
  }

  frameCount() {
    return this.framesDrawn;
  }

  /** The words: built once the faces load, while the unfold already runs. */
  async addLabels(cityAt: CityAt) {
    this.cityAt = cityAt;
    const labels = sceneLabels(this.data, this.width < NARROW_STAGE);
    const atlas = await labelAtlas(labels);
    this.labels = new LabelLayer(labels, atlas, {
      locate: (label) => this.locate(label),
      standing: (label) => this.standing(label),
      blocked: () => this.blockedNow(),
      stage: () => this.stageSize(),
      phone: this.touch,
    });
    this.labels.quads.viewport.value.set(this.width, this.height);
    this.scene.add(this.labels.quads.mesh);
    this.requestFrame();
  }

  private cityAt: CityAt = () => null;

  /** The places no word may cover. The controls and the title give theirs on start and on a resize. */
  setBlocked(rectangles: Rectangle[]) {
    this.blockedRectangles = rectangles;
    this.labels?.placeSoon();
    this.requestFrame();
  }

  /** The places no word may cover now, for the checks. */
  blockedForChecks() {
    return this.blockedNow();
  }

  private blockedNow() {
    const present = this.pointOnStage(presentPoint(this.data.present));
    if (!present) return this.blockedRectangles;
    return [
      ...this.blockedRectangles,
      {
        left: present.x - PRESENT_KEEPS_CLEAR,
        right: present.x + PRESENT_KEEPS_CLEAR,
        top: present.y - PRESENT_KEEPS_CLEAR,
        bottom: present.y + PRESENT_KEEPS_CLEAR,
      },
    ];
  }

  private locate(label: Label) {
    const seen = seenInThree(turned(this.matrixNow, this.seatOf(label)));
    const place = this.stagePositionOf(seen);
    if (!place) return null;
    return { ...place, depth: this.depthOf(seen) };
  }

  /**
    Where a word sits. A lit skill's word sits beside one of its events (litSkillSeat). On a ride an event's name sits
    where the ride met it, on the thread, beside the moving point: for a span that is where it began, not its bead.
    Every other word sits at its own point.
  */
  private seatOf(label: Label): Point4 {
    if (label.skill !== undefined && this.focus.litSkill === label.skill && this.litSkillSeat) return this.litSkillSeat;
    if (label.event && this.focus.ride && !this.focus.isSelecting()) return stopPoint(label.event, this.data.present);
    return label.point;
  }

  /**
    Whether a label may show now, whether it is lit, and whether it is in focus. With nothing lit, every word may show,
    within the caps. Once a skill is lit, a card open or a search has found something, only the lit events carry
    labels; with a world isolated or a year in focus, only that world's or that year's events. On a ride, the event at
    the point and the events of its year it has already met, and only the city of its moment. The present, the cities
    and the lit skills' own words always may.
  */
  private standing(label: Label) {
    const focus = this.focus;
    if (focus.ride && !focus.isSelecting()) return this.standingOnTheRide(label);
    const reached = label.kind === "present" || label.time >= this.unfold.frontTime(this.data.present) - 0.05;
    const isolatedIndex = focus.isolated ? worldIndex(focus.isolated) : -1;
    const narrowed = focus.isSelecting() || isolatedIndex >= 0 || focus.year !== null;
    // In a lit state the present still shows its label, but after the lit events, where there is room.
    if (label.kind === "present") return { allowed: true, lit: false, inFocus: narrowed };
    if (label.event) {
      const lit = focus.isLit(label.event);
      const inFocus = focus.isSelecting()
        ? lit
        : (isolatedIndex < 0 || label.world === isolatedIndex) && (focus.year === null || focus.inSlice(label.event));
      return { allowed: reached && (!narrowed || inFocus), lit, inFocus: narrowed && inFocus };
    }
    if (label.skill) {
      const lit = focus.isSkillLit(label.skill);
      return { allowed: reached && (lit || !narrowed), lit, inFocus: false };
    }
    if (label.kind === "year") return { allowed: reached && !narrowed, lit: false, inFocus: false };
    if (label.city && focus.found?.cities.has(label.city)) return { allowed: true, lit: true, inFocus: false };
    return { allowed: reached, lit: false, inFocus: false };
  }

  private standingOnTheRide(label: Label) {
    const ride = this.focus.ride as NonNullable<Focus["ride"]>;
    const isolatedIndex = this.focus.isolated ? worldIndex(this.focus.isolated) : -1;
    if (label.kind === "present") return { allowed: true, lit: false, inFocus: true };
    if (label.event) {
      const lit = ride.current?.id === label.event.id;
      const met = ride.met.has(label.event.id) && this.focus.inSlice(label.event);
      const inWorld = isolatedIndex < 0 || label.world === isolatedIndex;
      return { allowed: lit || (met && inWorld), lit, inFocus: met };
    }
    if (label.city) return { allowed: label.city === ride.city, lit: false, inFocus: true };
    return { allowed: false, lit: false, inFocus: false };
  }

  /** What is lit has changed: the beads, the dust, the words and the readouts follow. */
  relight() {
    const lit = new Set<number>();
    this.data.events.forEach((event, index) => {
      if (this.focus.isLit(event)) lit.add(index);
    });
    this.beads.light(lit);
    const skills = new Set<number>();
    this.data.skills.forEach((skill, index) => {
      if (this.focus.isSkillLit(skill)) skills.add(index);
    });
    // Specks of a skill that went out keep their light until they have flown home (see frame).
    if (skills.size) {
      this.dustLitSkills = skills;
      this.dust.light(skills);
    }
    this.uniforms.isolated.value = this.focus.isolated ? worldIndex(this.focus.isolated) : -1;
    this.labels?.placeSoon();
    for (const listener of this.changeListeners) listener();
    this.requestFrame();
  }

  setYear(year: number | null) {
    if (this.focus.year === year) return;
    this.focus.year = year;
    this.relight();
  }

  isolate(world: WorldKey | null) {
    this.focus.isolated = world;
    this.relight();
  }

  /**
    Where a lit skill's word sits: beside whichever of its events stands highest on the screen as it is lit, clear of
    the answer line below and of the present's light. Its home is the middle of its events, often inside that light.
  */
  private litSkillSeat: Point4 | null = null;

  private seatFor(skill: SkillWord) {
    const points = skill.events
      .map((id) => this.data.events.find((event) => event.id === id))
      .filter((event): event is WorldEvent => event !== undefined)
      .map((event) => ({ point: beadPoint(event, this.data.present), place: this.beadOnStage(event) }))
      .filter((entry) => entry.place !== null);
    points.sort((first, second) => (first.place?.y ?? 0) - (second.place?.y ?? 0));
    return points[0]?.point ?? null;
  }

  lightSkill(skill: SkillWord | null) {
    this.litSkillSeat = skill ? this.seatFor(skill) : null;
    this.focus.litSkill = skill;
    this.focus.openEvent = null;
    this.relight();
  }

  openEvent(event: WorldEvent | null) {
    this.focus.openEvent = event;
    if (event) this.focus.litSkill = null;
    this.relight();
  }

  /** What a search found, or null when it closes. */
  setFound(found: Focus["found"]) {
    this.focus.found = found;
    this.relight();
  }

  /** How many events are lit now: by the slice, by a lit skill, a search, a ride or an open card. */
  litCount() {
    return this.data.events.filter(
      (event) => this.focus.inSlice(event) || this.focus.isLit(event),
    ).length;
  }

  private frame(now: number) {
    this.framePending = false;
    if (!this.visible || document.hidden) return;
    if (!this.urgent && now < this.nextIdleAt) return this.askForScreenFrame();
    this.urgent = false;
    const seconds = Math.min(0.05, this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60);
    this.lastFrame = now;
    let moving = this.unfold.step(seconds);
    moving = this.rest.step(seconds) || moving;
    moving = this.turn.step(seconds) || moving;
    moving = this.zoom.step(seconds) || moving;
    moving = this.focus.step(seconds) || moving;
    this.matrixNow = this.turn.matrix();
    this.uniforms.turn.value.set(...(Array.from(this.matrixNow) as Parameters<THREE.Matrix4["set"]>));
    const front = this.unfold.frontTime(this.data.present);
    this.uniforms.front.value = front;
    this.uniforms.frontGlow.value = this.unfold.isDone() ? 0 : 1;
    this.uniforms.time.value = (now - this.startTime) / 1000;
    const slice = this.focus.slice();
    // At rest in three dimensions there is no time to slice, and nothing stays lit: the whole cube shows.
    const awakeShare = 1 - this.rest.flatten();
    this.uniforms.sliceOn.value = slice.on * awakeShare;
    this.uniforms.focus.value = slice.centre;
    this.uniforms.sliceHalfWidth.value = slice.halfWidth;
    this.uniforms.selecting.value = this.focus.selecting() * awakeShare;
    this.uniforms.gather.value = this.focus.gather();
    if (this.focus.gather() < 0.001 && this.dustLitSkills.size && !this.anySkillLit()) {
      this.dustLitSkills = new Set();
      this.dust.light(this.dustLitSkills);
    }
    this.setRestUniforms();
    // Every listener that moves something (the ride, the travel's carrying on) runs before the camera holds it.
    for (const listener of this.beforeListeners) moving = listener(seconds) || moving;
    moving = this.placeCamera(front, seconds) || moving;
    const turning = moving || this.turn.spinPace() > 0;
    if (this.labels) {
      this.labels.quads.awake.value = this.rest.awake();
      // A view that jumped (reduced motion, a reset) has its words placed again at once, so none is left on another.
      if (this.viewJumped()) this.labels.placeSoon();
      const fading = this.labels.update(now, seconds, turning);
      // A word fading in asks for frames of its own only when nothing else draws: the idle turn's frames carry it.
      moving = moving || (fading && this.turn.spinPace() === 0);
    }
    for (const listener of this.frameListeners) listener(this, moving, seconds);
    this.renderer.render(this.scene, this.camera);
    this.framesDrawn++;
    if (this.framesDrawn === 1) this.elements.stage.dataset.cubeState = "drawing";
    if (moving) this.requestFrame();
    else if (this.turn.spinPace() > 0) this.scheduleIdle(now);
  }

  private readonly beforeListeners: ((seconds: number) => boolean)[] = [];

  /** Called every frame before the camera is placed. Says whether what it moves is still moving. */
  beforeCamera(listener: (seconds: number) => boolean) {
    this.beforeListeners.push(listener);
  }

  private anySkillLit() {
    return this.data.skills.some((skill) => this.focus.isSkillLit(skill));
  }

  /** The rest's shares, and the cube's own turn: the turntable's spin, leaned toward the camera. */
  private readonly restTurn = new THREE.Matrix4();
  private readonly restLean = new THREE.Matrix4();

  private setRestUniforms() {
    const flatten = this.rest.flatten();
    this.uniforms.flatten.value = flatten;
    this.uniforms.cube.value = this.rest.cube();
    if (flatten <= 0) return;
    this.restLean.makeRotationX(CUBE_LEAN);
    this.restTurn.makeRotationY(this.turn.angles().spin + CUBE_TURN).premultiply(this.restLean);
    this.uniforms.restTurn.value.copy(this.restTurn);
  }

  /** Where the cube's eight corners land on the stage now, at rest, in CSS pixels: for the checks. */
  cubeCornersOnStage() {
    const corners: { x: number; y: number }[] = [];
    for (const across of [-1, 1])
      for (const up of [-1, 1])
        for (const depth of [-1, 1]) {
          const corner = new THREE.Vector3(across, up, depth).multiplyScalar(CUBE_FIT).applyMatrix4(this.restTurn);
          const place = this.stagePositionOf([corner.x, corner.y, corner.z]);
          if (place) corners.push(place);
        }
    return corners;
  }

  /** The reader's turn and zoom as last drawn, to tell a jump from a glide. */
  private lastView = { xw: 0, yw: 0, zoom: 0 };

  /** Whether the reader's turn or zoom moved further in one frame than a glide does. */
  private viewJumped() {
    const angles = this.turn.angles();
    const view = { xw: angles.xw, yw: angles.yw, zoom: this.zoom.now() };
    const moved = Math.abs(view.xw - this.lastView.xw) + Math.abs(view.yw - this.lastView.yw) + Math.abs(view.zoom - this.lastView.zoom);
    this.lastView = view;
    return moved > 0.08;
  }

  /** The idle turn: one more frame soon, at thirty a second on a phone. */
  private scheduleIdle(now: number) {
    if (!this.touch) return this.requestFrame();
    // Every screen frame is asked for, and one is drawn once the interval has passed. A timer would drift against the
    // screen and fire late on a busy phone; the screen's own frames keep the pace even.
    this.nextIdleAt = now + PHONE_IDLE_INTERVAL - 4;
    this.askForScreenFrame();
  }

  /** The bound of the years reached and of the whole, worked out again only when the framed turn or the front moved. */
  private boundsKept: { turnKey: string; front: number; reached: Bound; whole: Bound } | null = null;

  private boundsFor(framing: Matrix4D, front: number) {
    const turnKey = Array.from(framing, (value) => value.toFixed(4)).join(" ");
    const kept = this.boundsKept;
    if (kept?.turnKey === turnKey && Math.abs(kept.front - front) < 1e-4) return kept;
    this.boundsKept = {
      turnKey,
      front,
      reached: boundOf(framing, front, this.data.present),
      whole: kept?.turnKey === turnKey ? kept.whole : boundOf(framing, -Infinity, this.data.present),
    };
    return this.boundsKept;
  }

  /**
    The camera holds the years reached so far, at the screen place asked for, from a little above. Flown to a bead or
    riding with the moving point, it looks at that point instead. As the object rests, it eases to the cube.
  */
  private placeCamera(front: number, seconds: number) {
    const framing = this.turn.framingMatrix();
    const { reached: bound, whole: wholeBound } = this.boundsFor(framing, front);
    const flatten = this.rest.flatten();
    const cubeRadius = this.touch ? CUBE_FRAMED_RADIUS.phone : CUBE_FRAMED_RADIUS.computer;
    const framedRadius = Math.max(SMALLEST_FRAMED_RADIUS, bound.radius) * (1 - flatten) + cubeRadius * flatten;
    const aspect = this.width / this.height;
    // A ride frames the object for the whole screen (framing.ts immersivePlaceFor).
    const place = this.riding ? immersivePlaceFor(this.width, this.height) : this.place;
    // At rest the reader's zoom gives way too, so the whole cube is in view.
    const distance =
      distanceToFrame(framedRadius, FIELD_OF_VIEW, aspect, place) * this.zoom.distanceShare() ** (1 - flatten);
    const followed = this.followed?.();
    const seen = followed ? seenInThree(turned(this.matrixNow, followed)) : bound.centre;
    const looked = bound.centre.map((value, axis) => value + (seen[axis] - value) * this.followShare) as [number, number, number];
    const target = looked.map((value) => value * (1 - flatten)) as [number, number, number];
    let moving = false;
    // The cube at rest sits a little higher on a phone, in the open space between the title and the controls.
    const portrait = this.height > this.width;
    const down = this.riding ? place.down : place.down + (restingDown(place, portrait) - place.down) * flatten;
    const across = this.riding ? place.across : place.across + (restingAcross(place, portrait) - place.across) * flatten;
    if (!this.hasFramed || this.reducedMotion) {
      this.placeDown.jump(down);
      this.placeAcross.jump(across);
      this.cameraDistance.jump(distance);
      target.forEach((value, axis) => this.cameraTarget[axis].jump(value));
      this.hasFramed = true;
    } else {
      moving = this.cameraDistance.step(distance, seconds);
      moving = this.placeDown.step(down, seconds) || moving;
      moving = this.placeAcross.step(across, seconds) || moving;
      target.forEach((value, axis) => {
        moving = this.cameraTarget[axis].step(value, seconds) || moving;
      });
    }
    const [x, y, z] = this.cameraTarget.map((follower) => follower.value);
    const away = this.cameraDistance.value;
    this.camera.position.set(x, y + Math.sin(CAMERA_LIFT) * away, z + Math.cos(CAMERA_LIFT) * away);
    this.camera.lookAt(x, y, z);
    this.camera.aspect = aspect;
    this.camera.setViewOffset(
      this.width,
      this.height,
      -(this.placeAcross.value - 0.5) * this.width,
      -(this.placeDown.value - 0.5) * this.height,
      this.width,
      this.height,
    );
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    // Dots grow a little as the camera comes nearer than the framing of the whole, and the far side fades.
    const whole = distanceToFrame(wholeBound.radius, FIELD_OF_VIEW, aspect, this.place);
    this.uniforms.sizeScale.value = Math.min(2.2, Math.max(0.75, Math.sqrt(whole / away)));
    this.uniforms.referenceDepth.value = away;
    this.uniforms.fogNear.value = away - framedRadius * 0.2;
    this.uniforms.fogFar.value = away + framedRadius * 1.1;
    this.framedShare = (2 * framedRadius) / (2 * away * Math.tan((FIELD_OF_VIEW * Math.PI) / 360));
    return moving;
  }

  /** How much of the stage's height the framed object takes now, as drawn: the immersion share the checks read. */
  private framedShare = 0;

  frameShare() {
    return this.framedShare;
  }

  /** The point the camera looks at instead of the whole object: a flown-to bead, or the ride's moving point. */
  private followed: (() => Point4) | null = null;
  /** How far toward that point the camera looks, from 0 (the whole object's middle) to 1 (the point itself). */
  private followShare = 1;

  /** Flies the camera to look at an event's bead, following it as the object turns, or back to the whole with null. */
  flyTo(event: WorldEvent | null) {
    this.follow(event ? () => beadPoint(event, this.data.present) : null);
  }

  /**
    Has the camera follow a point in four dimensions as the object turns, or the whole object again with null. With a
    share under 1 it looks only that far from the object's middle toward the point, so the whole stays in view.
  */
  follow(point: (() => Point4) | null, share = 1) {
    this.followed = point;
    this.followShare = share;
    this.turn.paused = point !== null;
    this.requestFrame();
  }

  /** A ride frames the object for the whole screen, every bar, name and control stepped away. */
  setRiding(riding: boolean) {
    this.riding = riding;
    this.requestFrame();
  }

  isFlown() {
    return this.followed !== null;
  }

  /** Where an event's bead lands on the stage now, in CSS pixels. */
  beadOnStage(event: WorldEvent) {
    return this.pointOnStage(beadPoint(event, this.data.present));
  }

  /** Whether an event's bead is drawn now: the unfold has reached it. */
  beadIsShown(event: WorldEvent) {
    return beadTime(event, this.data.present) >= this.unfold.frontTime(this.data.present) - 0.02;
  }

  /** Where a point in four dimensions lands on the stage now, in CSS pixels, or null behind the camera. */
  pointOnStage(point: Point4) {
    return this.stagePositionOf(seenInThree(turned(this.matrixNow, point)));
  }

  private readonly projected = new THREE.Vector3();

  stagePositionOf(point: [number, number, number]) {
    this.projected.set(point[0], point[1], point[2]).project(this.camera);
    if (this.projected.z > 1 || this.projected.z < -1) return null;
    return {
      x: (this.projected.x * 0.5 + 0.5) * this.width,
      y: (0.5 - this.projected.y * 0.5) * this.height,
    };
  }

  /** How far a point seen in three stands from the camera. */
  private depthOf(point: [number, number, number]) {
    this.projected.set(point[0], point[1], point[2]).applyMatrix4(this.camera.matrixWorldInverse);
    return -this.projected.z;
  }
}

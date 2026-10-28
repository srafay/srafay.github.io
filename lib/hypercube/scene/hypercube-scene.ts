/*
  The Hypercube scene on its stage: the renderer, the layers of dots (orbits and lines, dust, beads, the present), the
  words, the camera that holds the object as it unfolds and turns, and the frame loop. A frame is drawn only when
  something moves. The idle turn keeps it moving, at thirty frames a second on a phone. Nothing is drawn while the
  page is hidden.
*/
import * as THREE from "three";
import type { WorldEvent } from "@/lib/about-cv/events";
import { Follower } from "@/lib/about-cv/scene/follower";
import type { SkillWord } from "@/lib/about-cv/skills";
import { worldIndex, type WorldKey } from "@/lib/about-cv/worlds";
import { PRESENT, rgbOf } from "@/lib/hypercube/palette";
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
import { beadLayer, dotUniforms, dustLayer, presentLayer, structureLayer, type DotUniforms } from "./dots";
import { Focus } from "./focus";
import {
  boundOf,
  distanceToFrame,
  screenPlaceFor,
  SMALLEST_FRAMED_RADIUS,
  type Bound,
  type ScreenPlace,
} from "./framing";
import { LabelLayer, type Rectangle } from "./label-layer";
import { labelAtlas, sceneLabels, type Label } from "./labels";
import { ObjectTurn, Unfold, Zoom } from "./motion";

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
/** Narrower than this, in CSS pixels, the present names itself by its short label. */
const NARROW_STAGE = 400;
/** How far round the present's point no other word may sit, in CSS pixels: its bright core and near glow. */
const PRESENT_KEEPS_CLEAR = 22;

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
  /** How many dots each layer draws, for the checks and the hand-back. */
  readonly structureCount: number;
  readonly dustCount: number;
  labels: LabelLayer | null = null;
  private readonly beads: ReturnType<typeof beadLayer>;
  private readonly cameraDistance = new Follower(1, 40);
  private readonly cameraTarget = [new Follower(0, 40), new Follower(0, 40), new Follower(0, 40)];
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
    this.matrixNow = this.turn.matrix();

    const structure = structureDots(data, this.detail);
    const dust = dustDots(data, this.detail);
    this.structureCount = structure.count;
    this.dustCount = dust.dots.count;
    this.beads = beadLayer(beadDots(data), beadStarts(data), this.uniforms);
    this.scene.add(
      structureLayer(structure, this.uniforms),
      dustLayer(dust.dots, dust.targets, dust.skillOfSpeck, this.uniforms),
      this.beads.points,
      presentLayer(
        singleDot(presentPoint(data.present), data.present, rgbOf(PRESENT)),
        this.uniforms,
        this.touch ? PRESENT_GLOW_PHONE : PRESENT_GLOW_COMPUTER,
        !this.reducedMotion,
      ),
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
  async addLabels() {
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

  /** The places no word may cover. The controls and the title give theirs on start and on a resize. */
  setBlocked(rectangles: Rectangle[]) {
    this.blockedRectangles = rectangles;
    this.labels?.placeSoon();
    this.requestFrame();
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
    const seat = label.skill !== undefined && this.focus.litSkill === label.skill ? this.litSkillSeat : null;
    const seen = seenInThree(turned(this.matrixNow, seat ?? label.point));
    const place = this.stagePositionOf(seen);
    if (!place) return null;
    return { ...place, depth: this.depthOf(seen) };
  }

  /**
    Whether a label may show now, whether it is lit, and whether it is in focus. With nothing lit, every word may show,
    within the caps. Once a skill is lit or a card open, only its events carry labels; with a world isolated or a year in
    focus, only that world's or that year's events. The present, the cities and the lit skill's own word always may.
  */
  private standing(label: Label) {
    const focus = this.focus;
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
      const lit = focus.litSkill === label.skill;
      return { allowed: reached && (lit || !narrowed), lit, inFocus: false };
    }
    if (label.kind === "year") return { allowed: reached && !narrowed, lit: false, inFocus: false };
    return { allowed: reached, lit: false, inFocus: false };
  }

  /** What is lit has changed: the beads, the words and the readouts follow. */
  relight() {
    const lit = new Set<number>();
    this.data.events.forEach((event, index) => {
      if (this.focus.isLit(event)) lit.add(index);
    });
    this.beads.light(lit);
    const skillIndex = this.focus.litSkill ? this.data.skills.indexOf(this.focus.litSkill) : -1;
    if (skillIndex >= 0) this.uniforms.litSkill.value = skillIndex;
    this.uniforms.isolated.value = this.focus.isolated ? worldIndex(this.focus.isolated) : -1;
    this.labels?.placeSoon();
    for (const listener of this.changeListeners) listener();
    this.requestFrame();
  }

  /** The colour a lit skill's dust turns. */
  setLitColour(hex: string) {
    this.uniforms.litColour.value.set(hex);
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

  /** How many events are lit now: by the slice, by a lit skill, or an open card. */
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
    this.uniforms.sliceOn.value = slice.on;
    this.uniforms.focus.value = slice.centre;
    this.uniforms.sliceHalfWidth.value = slice.halfWidth;
    this.uniforms.selecting.value = this.focus.selecting();
    this.uniforms.gather.value = this.focus.gather();
    if (this.focus.gather() < 0.001 && !this.focus.litSkill) this.uniforms.litSkill.value = -1;
    moving = this.placeCamera(front, seconds) || moving;
    const turning = moving || this.turn.spinPace() > 0;
    if (this.labels) {
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

  /** The camera holds the years reached so far, at the screen place asked for, from a little above. */
  private placeCamera(front: number, seconds: number) {
    const framing = this.turn.framingMatrix();
    const { reached: bound, whole: wholeBound } = this.boundsFor(framing, front);
    const framedRadius = Math.max(SMALLEST_FRAMED_RADIUS, bound.radius);
    const aspect = this.width / this.height;
    const distance = distanceToFrame(framedRadius, FIELD_OF_VIEW, aspect, this.place) * this.zoom.distanceShare();
    const target = this.flownEvent
      ? seenInThree(turned(this.matrixNow, beadPoint(this.flownEvent, this.data.present)))
      : bound.centre;
    let moving = false;
    if (!this.hasFramed || this.reducedMotion) {
      this.cameraDistance.jump(distance);
      target.forEach((value, axis) => this.cameraTarget[axis].jump(value));
      this.hasFramed = true;
    } else {
      moving = this.cameraDistance.step(distance, seconds);
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
      -(this.place.across - 0.5) * this.width,
      -(this.place.down - 0.5) * this.height,
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
    return moving;
  }

  /** The event the camera was flown to by a double tap, or null to hold the whole object. */
  private flownEvent: WorldEvent | null = null;

  /** Flies the camera to look at an event's bead, following it as the object turns, or back to the whole with null. */
  flyTo(event: WorldEvent | null) {
    this.flownEvent = event;
    this.turn.paused = event !== null;
    this.requestFrame();
  }

  isFlown() {
    return this.flownEvent !== null;
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

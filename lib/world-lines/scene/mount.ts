/*
  Mounts the World lines scene on a root element. It holds the renderer, the five lines of light, the words and the
  specks, the camera that follows the scroll, and the frame loop. A frame is drawn only when something changed: the
  camera moved, a drift step is due, the pointer moved, or a tap lit something. Off screen nothing is drawn.
*/
import * as THREE from "three";
import type { WorldEvent } from "@/lib/world-lines/events";
import type { SkillWord } from "@/lib/world-lines/skills";
import { FIRST_YEAR } from "@/lib/world-lines/time";
import { worldIndex, worlds, type WorldKey } from "@/lib/world-lines/worlds";
import {
  blendPoses,
  endPose,
  insideAmount,
  overviewPose,
  poseAt,
  smoothStep,
  STRETCHES,
  travelTime,
  type Pose,
  type PoseSet,
} from "./camera";
import {
  buildBeads,
  buildWorldForms,
  presentGlow,
  type Beads,
  type Palette,
} from "./forms";
import { glowUniforms, type GlowUniforms } from "./glow";
import {
  skillPlaces,
  timeOfZ,
  vaultFor,
  worldPoint,
  type Point,
  type Vault,
} from "./layout";
import { FACES, placeCities, placeWords, wordRequests } from "./scene-words";
import { createScrollReader, type ScrollReader } from "./scroll";
import { Follower } from "./follower";
import {
  distanceToFrame,
  fullTimeSquash,
  middleOf,
  ReaderView,
  squashed,
  timeSquashAt,
  turnAndBringNearer,
  wholeAngles,
  wholePose,
} from "./view";
import { buildAtlas, loadFaces } from "./word-atlas";
import {
  COMPUTER_READABLE,
  COMPUTER_SKILL_CAP,
  PHONE_READABLE,
  PHONE_SKILL_CAP,
  WordPlacement,
  type Rectangle,
} from "./word-placement";
import {
  atlasTexture,
  buildSpeckLayer,
  buildWordLayer,
  wordUniforms,
  type WordLayer,
  type WordUniforms,
} from "./words";

export type SceneData = {
  events: WorldEvent[];
  skills: SkillWord[];
  present: number;
};

export type SceneElements = {
  root: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  title: HTMLElement;
};

/** Phones draw at most this many device pixels per CSS pixel. The words are distance fields, so they stay sharp. */
const LARGEST_PIXEL_RATIO = 1.5;
/** How long the travel is, in screens: about one screen a year, plus the stretches before and after. */
const TRAVEL_SCREENS = 15;
/** A phone draws drift steps at about thirty a second. A computer draws them at the screen's own rate. */
const PHONE_DRIFT_INTERVAL = 1000 / 30;
/** How far ahead an event's label shows while the camera travels, in scene units: about two and a half years. */
const LABEL_REACH_INSIDE = 5.5;
/** A clipping plane's constant that keeps every depth in the scene. */
const KEEP_EVERYTHING = 1e6;
/** How many skills read as words at rest and while travelling, on a phone and on a computer. */
const READABLE_SKILLS_ON_A_PHONE = [PHONE_READABLE, 15];
const READABLE_SKILLS_ON_A_COMPUTER = [COMPUTER_READABLE, 26];
/** The fog: where the dark starts to take the lines, and where it has them all. Further from above, nearer inside. */
const FOG_FROM_AFAR = { near: 12, far: 44 };
const FOG_INSIDE = { near: 6, far: 26 };
/** With the whole spacetime in view, the fog draws far back. */
const FOG_WHOLE = { near: 30, far: 90 };
/** How much of their light the other worlds keep while one is isolated. */
const ISOLATION_DIMMING = 0.16;
/** How far the camera leans toward an isolated world's line, as a share of the line's distance from the middle. */
const ISOLATION_LEAN_SHARE = 0.55;
/** How far across from the middle a world's line runs. */
const onArchAcross = (vault: Vault, world: WorldKey) =>
  worldPoint(world, vault, 0).x;

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouchScreen = () =>
  matchMedia("(hover: none) and (pointer: coarse)").matches;

/**
 * The site's warm white for the light, its muted tone for quiet words and its signal for what the reader lit. One
 * warm light of the page's own marks the present, so now is the warmest and brightest thing on the screen.
 */
export function palette(): Palette {
  return {
    light: new THREE.Color("#ece6dc"),
    muted: new THREE.Color("#948b80"),
    signal: new THREE.Color("#9de6c4"),
    present: new THREE.Color("#ffd2a1"),
  };
}

/** A camera whose view keeps its holder's squash of time. three otherwise drops any scale from a camera's view. */
class SquashingCamera extends THREE.PerspectiveCamera {
  override updateMatrixWorld(force?: boolean) {
    super.updateMatrixWorld(force);
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }

  override updateWorldMatrix(updateParents: boolean, updateChildren: boolean) {
    super.updateWorldMatrix(updateParents, updateChildren);
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }
}

export class WorldLinesScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera = new SquashingCamera(50, 1, 0.05, 140);
  /** The camera's holder. Its depth scale is how much time is squashed, so every projection sees the same squash. */
  private readonly squashedTime = new THREE.Object3D().add(this.camera);
  private readonly lookMatrix = new THREE.Matrix4();
  private readonly lookPoint = new THREE.Vector3();
  readonly vault: Vault;
  readonly beads: Beads;
  readonly uniforms: WordUniforms;
  readonly glow: GlowUniforms = glowUniforms();
  readonly scroll: ScrollReader;
  readonly reducedMotion = prefersReducedMotion();
  readonly touch = isTouchScreen();
  readonly colours = palette();
  words: WordLayer | null = null;
  cityWords: WordLayer | null = null;
  skillPoints: Point[] = [];
  private placement: WordPlacement | null = null;
  private poses: PoseSet;
  private pose: Pose = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 50,
    shiftAcross: 0,
  };
  private progress = new Follower(0);
  private lookAcross = new Follower(0, 40);
  private lookUp = new Follower(0, 40);
  private pointerAcross = 0;
  private pointerUp = 0;
  private framePending = false;
  private lastFrame = 0;
  private lastDriftFrame = 0;
  private visible = true;
  private width = 0;
  private height = 0;
  private readonly startTime = performance.now();
  private readonly listeners: ((scene: WorldLinesScene) => void)[] = [];
  private readonly fronts = new Map<string, THREE.Plane>();
  private titleRectangle: Rectangle | null = null;

  constructor(
    readonly elements: SceneElements,
    readonly data: SceneData,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: elements.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(
      Math.min(LARGEST_PIXEL_RATIO, window.devicePixelRatio || 1),
    );
    this.uniforms = wordUniforms(this.colours.signal);
    this.measureStage();
    this.vault = vaultFor(this.width / this.height);
    this.poses = this.makePoses();
    this.scene.add(
      buildWorldForms(
        data.events,
        this.vault,
        data.present,
        this.colours,
        this.glow,
      ),
    );
    this.beads = buildBeads(
      data.events,
      this.vault,
      data.present,
      this.colours,
      this.glow,
    );
    this.scene.add(this.beads.object);
    const presentIndex = data.events.findIndex((event) => event.isPresent);
    if (presentIndex >= 0)
      this.scene.add(
        presentGlow(this.beads.points[presentIndex], this.colours),
      );
    this.attachFronts();
    this.skillPoints = skillPlaces(
      data.skills,
      data.events,
      this.vault,
      data.present,
      FIRST_YEAR,
    );
    this.view = new ReaderView(this.reducedMotion);
    this.scroll = createScrollReader(
      elements.stage,
      TRAVEL_SCREENS,
      !this.reducedMotion,
    );
    this.scroll.onScroll(() => this.requestFrame());
    this.progress.jump(this.scroll.progress());
    this.watchSize();
    this.watchVisibility();
    this.watchPointer();
  }

  /*
    Each world's lines, and the beads with the present's light, keep only what is nearer than a front. The intro runs
    each front back from now to 2014. The planes are attached once, before the first frame, so the programs are built
    once with them. At rest each front stands past everything and keeps it all.
  */
  private attachFronts() {
    this.renderer.localClippingEnabled = true;
    this.scene.traverse((object) => {
      const material = (object as THREE.Mesh).material as
        THREE.Material | undefined;
      if (!material) return;
      const key = (object.userData.world as string | undefined) ?? "vault";
      if (!this.fronts.has(key))
        this.fronts.set(
          key,
          new THREE.Plane(new THREE.Vector3(0, 0, 1), KEEP_EVERYTHING),
        );
      material.clippingPlanes = [this.fronts.get(key) as THREE.Plane];
    });
  }

  /** Keeps only what is nearer than depth z on a world's lines (or "vault" for the beads); Infinity keeps everything. */
  setFront(key: string, z: number) {
    const plane = this.fronts.get(key);
    if (plane) plane.constant = Number.isFinite(z) ? -z : KEEP_EVERYTHING;
  }

  private makePoses(): PoseSet {
    const aspect = this.width / this.height;
    return {
      overview: overviewPose(aspect, this.vault),
      end: endPose(aspect, this.vault),
    };
  }

  /** The stage's size, read only when the window's width changes or the page starts. */
  private measureStage() {
    this.width = this.elements.stage.clientWidth;
    this.height = this.elements.stage.clientHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.uniforms.viewportHeight.value = this.height;
    this.uniforms.viewportWidth.value = this.width;
  }

  stageSize() {
    return { width: this.width, height: this.height };
  }

  private watchSize() {
    let lastWidth = window.innerWidth;
    window.addEventListener("resize", () => {
      // A phone's bars change only the height, mid-swipe. The stage is sized in small-viewport units and keeps still.
      if (window.innerWidth === lastWidth && this.touch) return;
      lastWidth = window.innerWidth;
      this.measureStage();
      this.poses = this.makePoses();
      this.scroll.measure();
      this.frameTheWhole();
      this.measureTitle();
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

  /** On a computer the view leans a little toward the pointer, except while a drag turns it. */
  private watchPointer() {
    if (this.touch || this.reducedMotion) return;
    this.elements.stage.addEventListener("pointermove", (event) => {
      if (event.buttons) return;
      this.pointerAcross = (event.clientX / this.width - 0.5) * 2;
      this.pointerUp = (event.clientY / this.height - 0.5) * 2;
      this.requestFrame();
    });
  }

  /*
    The reader's own view: a turn around the moment in view, and a zoom from near the moment out to the whole life.
    The gestures (gestures.ts) and the controls call these. At the far end of the zoom the whole spacetime fills most of
    the screen, framed from every point drawn.
  */
  private readonly view: ReaderView;
  /** Every point drawn that the whole view must hold, squashed for the far end, and their middle unsquashed. */
  private wholePoints: THREE.Vector3[] = [];
  private readonly wholeMiddle = new THREE.Vector3();
  private readonly viewListeners: (() => void)[] = [];

  /** Turns the view around the moment: across and up in radians. It stays where it is left. */
  turnBy(across: number, up: number) {
    this.view.turnBy(across, up);
    this.viewChanged();
  }

  /** Zooms: a negative amount nearer the moment, a positive one out toward the whole life, 1 for the whole way. */
  zoomBy(amount: number) {
    this.view.zoomBy(amount);
    this.viewChanged();
  }

  /** Zooms to a place on the scale from -1 (nearest) to 1 (the whole). */
  zoomTo(zoom: number) {
    this.view.zoomTo(zoom);
    this.viewChanged();
  }

  /** Back to the travel's own view. */
  resetView() {
    this.view.reset();
    this.viewChanged();
  }

  /** The reader touched the scene: the turntable at the far end stops. */
  touched() {
    this.view.touched(performance.now());
  }

  /** Whether the view is turned or zoomed away from the travel's own, so Reset view can show. */
  viewIsChanged() {
    return this.view.isChanged();
  }

  /** The view now, for the checks: its turn across and up, and its zoom from -1 (nearest) to 1 (the whole). */
  viewNow() {
    return this.view.now();
  }

  /** How far out toward the whole the view is, from 0 to 1. */
  wholeShare() {
    return this.view.wholeShare();
  }

  onViewChange(listener: () => void) {
    this.viewListeners.push(listener);
  }

  private viewChanged() {
    this.placement?.forget();
    for (const listener of this.viewListeners) listener();
    this.requestFrame();
  }

  /** Every point drawn that the whole view must hold: each bead, year and city, and the present. */
  private drawnPoints() {
    const words = (this.words?.words ?? []).filter(
      (word) =>
        word.kind === "year" || word.kind === "city" || word.kind === "present",
    );
    return [
      ...this.beads.points,
      ...words.map((word) => new THREE.Vector3(word.at.x, word.at.y, word.at.z)),
    ];
  }

  /** Works out what the whole view frames, after the words are drawn and on a resize. */
  private frameTheWhole() {
    const points = this.drawnPoints();
    const squash = fullTimeSquash(this.width / this.height);
    this.wholePoints = points.map((point) => squashed(point, squash));
    this.wholeMiddle.copy(middleOf(points));
  }

  /*
    One world isolated: the other worlds' lines, beads and words dim, and every event of this one shows its label
    where there is room. The camera leans toward its line. Null shows every world again.
  */
  private isolated: WorldKey | null = null;
  private readonly isolationLean = new Follower(0, 30);

  isolateWorld(world: WorldKey | null) {
    this.isolated = world;
    this.uniforms.isolatedWorld.value = world ? worldIndex(world) : -1;
    this.scene.traverse((object) => {
      const material = (object as THREE.Mesh).material as
        THREE.ShaderMaterial | undefined;
      const ownWorld = object.userData.world as WorldKey | undefined;
      if (!material?.uniforms?.strength || !ownWorld) return;
      material.uniforms.strength.value =
        !world || ownWorld === world ? 1 : ISOLATION_DIMMING;
    });
    this.restBeads();
    if (this.placement) this.placement.isolatedWorld = world;
    this.placement?.forget();
    this.requestFrame();
  }

  isolatedWorld() {
    return this.isolated;
  }

  /** Puts every bead back to its resting light, the isolated world's bright and the others dimmed. */
  restBeads() {
    this.data.events.forEach((event, index) =>
      this.beads.setBrightness(
        index,
        !this.isolated || event.world === this.isolated ? 1 : ISOLATION_DIMMING,
        this.beads.restingColour(index),
      ),
    );
  }

  /** A word under the pointer or a finger is drawn a little brighter. -1 for none. */
  setHoveredWord(index: number) {
    if (this.uniforms.hoveredWord.value === index) return;
    this.uniforms.hoveredWord.value = index;
    this.requestFrame();
  }

  /** The controls' places on the stage, so no word in the scene is drawn under them. */
  private controlRectangles: Rectangle[] = [];

  setControlRectangles(rectangles: Rectangle[]) {
    this.controlRectangles = rectangles;
    this.setTitleShown(this.titleShown);
  }

  onFrame(listener: (scene: WorldLinesScene) => void) {
    this.listeners.push(listener);
  }

  async addWords() {
    await loadFaces(FACES);
    const atlas = await buildAtlas(
      wordRequests(this.data.skills, this.data.events, this.data.present),
    );
    const texture = atlasTexture(atlas);
    const placed = placeWords(
      this.data.skills,
      this.skillPoints,
      this.data.events,
      this.vault,
      this.data.present,
      this.colours,
    );
    this.words = buildWordLayer(placed, atlas, texture, this.uniforms);
    this.cityWords = buildWordLayer(
      placeCities(this.vault, this.data.present, atlas, this.colours),
      atlas,
      texture,
      this.uniforms,
      true,
    );
    this.scene.add(
      buildSpeckLayer(this.words, this.uniforms, this.colours.light),
      this.cityWords.mesh,
      this.words.mesh,
    );
    this.placement = new WordPlacement(
      [
        { layer: this.words, shapes: atlas.entries },
        { layer: this.cityWords, shapes: atlas.entries },
      ],
      this.uniforms,
      this.touch ? PHONE_SKILL_CAP : COMPUTER_SKILL_CAP,
      this.touch ? PHONE_READABLE : COMPUTER_READABLE,
    );
    // Event labels keep off the lines of light: the placement knows where each line stands on the arch.
    this.placement.lineAxes = worlds.map((world) => {
      const { x, y } = worldPoint(world.key, this.vault, 0);
      return { x, y };
    });
    this.measureTitle();
    this.frameTheWhole();
    this.placeCamera();
    this.placement.update(this.camera, 1, false);
    this.requestFrame();
  }

  wordPlacement() {
    return this.placement;
  }

  /** Where the name and its line sit on the stage, so no word lands on them. Read at start and on a resize. */
  private measureTitle() {
    const stage = this.elements.stage.getBoundingClientRect();
    const title = this.elements.title.getBoundingClientRect();
    this.titleRectangle = {
      left: title.left - stage.left - 8,
      top: title.top - stage.top - 8,
      right: title.right - stage.left + 8,
      bottom: title.bottom - stage.top + 8,
    };
    if (this.placement) {
      this.placement.viewport = { width: this.width, height: this.height };
      this.setTitleShown(true);
    }
  }

  /** The links joined the name at the end, or left it: measure it again (a layout read, once per change, never a frame). */
  titleChangedSize() {
    this.measureTitle();
  }

  /** While the name is on screen, words keep off it. They always keep off the controls. */
  private titleShown = true;

  setTitleShown(shown: boolean) {
    this.titleShown = shown;
    if (!this.placement) return;
    this.placement.blocked = [
      ...(shown && this.titleRectangle ? [this.titleRectangle] : []),
      ...this.controlRectangles,
    ];
    this.placement.forget();
    this.requestFrame();
  }

  /** What the reader lit has changed: the words are placed again, the lit ones first. */
  wordsRelit() {
    this.placement?.forget();
    this.requestFrame();
  }

  /** The cities' rectangles as drawn just now, for a tap to find. */
  drawnCityRectangles() {
    return this.placement?.placedCities ?? [];
  }

  /** The rectangles of the skills drawn as words just now, for a tap to find. */
  drawnSkillRectangles() {
    return this.placement?.placedSkills ?? [];
  }

  /** The moment a depth of the scene stands for. */
  timeAtDepth(z: number) {
    return timeOfZ(z, this.data.present);
  }

  skillPointOf(skill: SkillWord) {
    const index = this.data.skills.indexOf(skill);
    const point = this.skillPoints[index];
    return new THREE.Vector3(point.x, point.y, point.z);
  }

  /** How far through the travel the camera is now, from 0 to 1, after the spring. */
  shownProgress() {
    return this.progress.value;
  }

  /** The year the camera stands in while it travels, or null outside the travel. */
  yearNow(): number | null {
    const progress = this.progress.value;
    if (progress < STRETCHES.descent * 0.9 || progress > STRETCHES.travelEnds)
      return null;
    return Math.max(
      FIRST_YEAR,
      Math.floor(travelTime(progress, this.data.present)),
    );
  }

  requestFrame() {
    if (this.framePending) return;
    this.framePending = true;
    requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number) {
    this.framePending = false;
    if (!this.visible || document.hidden) return;
    const seconds = Math.min(
      0.05,
      this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60,
    );
    this.lastFrame = now;
    let moving = this.scroll.step(seconds);
    if (this.reducedMotion) this.progress.jump(this.scroll.progress());
    moving = this.progress.step(this.scroll.progress(), seconds) || moving;
    moving = this.lookAcross.step(this.pointerAcross, seconds) || moving;
    moving = this.lookUp.step(this.pointerUp, seconds) || moving;
    moving = this.view.step(seconds, now) || moving;
    // With the whole in view, a word shown keeps its place as the view turns, so words do not swap back and forth.
    if (this.placement) this.placement.steady = this.view.wholeShare() > 0.5;
    moving = this.isolationLean.step(this.isolated ? 1 : 0, seconds) || moving;
    this.beads.setTime((now - this.startTime) / 1000, !this.reducedMotion);
    this.placeCamera();
    this.followDepth();
    if (this.placement)
      moving =
        this.placement.update(this.camera, seconds, !this.reducedMotion) ||
        moving;
    this.uniforms.time.value = (now - this.startTime) / 1000;
    for (const listener of this.listeners) listener(this);
    this.renderer.render(this.scene, this.camera);
    if (moving) this.requestFrame();
    else if (!this.reducedMotion) this.scheduleDrift(now);
  }

  /** From afar readable words hold their size and the fog is far. Inside the vault the fog closes in. */
  private followDepth() {
    const whole = this.view.wholeShare();
    const inside = insideAmount(this.progress.value) * (1 - whole);
    this.uniforms.holdSmall.value = 1 - inside;
    this.uniforms.labelReach.value = LABEL_REACH_INSIDE + (1 - inside) * 400;
    const near =
      FOG_FROM_AFAR.near +
      (FOG_INSIDE.near - FOG_FROM_AFAR.near) * inside +
      (FOG_WHOLE.near - FOG_FROM_AFAR.near) * whole;
    const far =
      FOG_FROM_AFAR.far +
      (FOG_INSIDE.far - FOG_FROM_AFAR.far) * inside +
      (FOG_WHOLE.far - FOG_FROM_AFAR.far) * whole;
    this.uniforms.fogNear.value = this.glow.fogNear.value = near;
    this.uniforms.fogFar.value = this.glow.fogFar.value = far;
    // Inside the vault the skills are the travel's main event: more of them turn from specks into words, and they
    // drift wider as they float past.
    if (this.placement) {
      const [atRest, inTravel] = this.touch
        ? READABLE_SKILLS_ON_A_PHONE
        : READABLE_SKILLS_ON_A_COMPUTER;
      this.placement.readableCount = Math.round(
        atRest + (inTravel - atRest) * inside,
      );
    }
    this.uniforms.drift.value = this.reducedMotion ? 0 : 1 + inside * 1.5;
    this.beads.setPixelsPerUnitAtOne(
      this.camera.projectionMatrix.elements[5] *
        0.5 *
        this.renderer.domElement.height,
    );
  }

  /** The skills drift: one more frame soon, at thirty a second on a phone. */
  private scheduleDrift(now: number) {
    const interval = this.touch ? PHONE_DRIFT_INTERVAL : 0;
    if (!interval) return this.requestFrame();
    const wait = Math.max(0, interval - (now - this.lastDriftFrame));
    this.lastDriftFrame = now + wait;
    setTimeout(() => this.requestFrame(), wait);
  }

  /** The whole in view, after the reader's turn, in a space whose time is squashed by a share. */
  private wholeViewPose(squash: number, across: number, up: number): Pose {
    const { azimuth, elevation } = wholeAngles(across, up);
    const distance = distanceToFrame(
      this.wholePoints,
      azimuth,
      elevation,
      this.width / this.height,
    );
    return wholePose(
      squashed(this.wholeMiddle, squash),
      azimuth,
      elevation,
      distance,
    );
  }

  /** With one world isolated, the camera leans across toward its line, the way a reader turns to look at it. */
  private leanTowardIsolatedWorld() {
    const lean = this.isolationLean.value;
    if (lean < 0.0001) return;
    if (this.isolated)
      this.isolationAcross = onArchAcross(this.vault, this.isolated);
    const across = this.isolationAcross * ISOLATION_LEAN_SHARE * lean;
    this.pose.position.x += across;
    this.pose.target.x += across;
  }

  private isolationAcross = 0;

  private placeCamera() {
    const aspect = this.width / this.height;
    poseAt(
      this.progress.value,
      aspect,
      this.vault,
      this.data.present,
      this.poses,
      this.pose,
    );
    this.leanTowardIsolatedWorld();
    const view = this.view.now();
    turnAndBringNearer(
      this.pose,
      view.across,
      view.up,
      this.view.nearerShare(),
      this.vault.height * 0.5,
    );
    const wholeShare = smoothStep(this.view.wholeShare());
    const squash = timeSquashAt(wholeShare, aspect);
    if (wholeShare > 0.0001) {
      this.pose.position.z /= squash;
      this.pose.target.z /= squash;
      blendPoses(
        {
          ...this.pose,
          position: this.pose.position.clone(),
          target: this.pose.target.clone(),
        },
        this.wholeViewPose(squash, view.across, view.up),
        wholeShare,
        this.pose,
      );
    }
    this.camera.fov = this.pose.fov;
    this.camera.aspect = aspect;
    this.camera.filmGauge = 35;
    // The lens shift, as a share of half the picture's width, written as the film offset three's camera takes.
    const halfWidthAtOne =
      Math.tan(((this.pose.fov / 2) * Math.PI) / 180) * aspect;
    this.camera.filmOffset =
      -this.pose.shiftAcross * this.camera.getFilmWidth() * halfWidthAtOne;
    // The pose is in the squashed space, the camera's own. Its holder stretches that space back out to the scene.
    this.squashedTime.scale.set(1, 1, squash);
    this.camera.position.copy(this.pose.position);
    const lean = 0.05 * this.pose.position.distanceTo(this.pose.target);
    this.lookPoint.set(
      this.pose.target.x + this.lookAcross.value * lean,
      this.pose.target.y - this.lookUp.value * lean * 0.5,
      this.pose.target.z,
    );
    this.lookMatrix.lookAt(this.camera.position, this.lookPoint, this.camera.up);
    this.camera.quaternion.setFromRotationMatrix(this.lookMatrix);
    this.camera.updateProjectionMatrix();
    this.squashedTime.updateMatrixWorld(true);
  }
}

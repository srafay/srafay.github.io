/*
  Mounts the World lines scene on a root element. It holds the renderer, the five lines of light, the words and the
  specks, the camera that follows the scroll, and the frame loop. A frame is drawn only when something changed: the
  camera moved, a drift step is due, the pointer moved, or a tap lit something. Off screen nothing is drawn.
*/
import * as THREE from "three";
import type { WorldEvent } from "@/lib/world-lines/events";
import type { SkillWord } from "@/lib/world-lines/skills";
import { FIRST_YEAR } from "@/lib/world-lines/time";
import {
  endPose,
  insideAmount,
  overviewPose,
  poseAt,
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
  type Point,
  type Vault,
} from "./layout";
import { FACES, placeCities, placeWords, wordRequests } from "./scene-words";
import { createScrollReader, type ScrollReader } from "./scroll";
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
  scroller: HTMLElement;
  track: HTMLElement;
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
/** How far a sideways drag may turn the view, as a share of the pointer's lean, and how far the pointer leans it. */
const DRAG_REACH = 1.6;
/** How many skills read as words at rest and while travelling, on a phone and on a computer. */
const READABLE_SKILLS_ON_A_PHONE = [PHONE_READABLE, 15];
const READABLE_SKILLS_ON_A_COMPUTER = [COMPUTER_READABLE, 26];
/** The fog: where the dark starts to take the lines, and where it has them all. Further from above, nearer inside. */
const FOG_FROM_AFAR = { near: 12, far: 44 };
const FOG_INSIDE = { near: 6, far: 26 };

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

/** A spring that follows a target without overshoot, so the camera glides after the scroll and settles. */
class Follower {
  value: number;
  private speed = 0;
  constructor(
    value: number,
    private readonly stiffness = 70,
  ) {
    this.value = value;
  }
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

export class WorldLinesScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.05, 140);
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
  private dragStartX: number | null = null;
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
    elements.track.style.setProperty(
      "--lines-track-height",
      this.reducedMotion ? "100svh" : `${TRAVEL_SCREENS * 100}svh`,
    );
    this.scroll = createScrollReader(
      elements.scroller,
      elements.track,
      elements.stage,
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

  /** On a computer the view leans a little toward the pointer. */
  private watchPointer() {
    if (this.touch || this.reducedMotion) return;
    this.elements.stage.addEventListener("pointermove", (event) => {
      if (this.dragStartX !== null) return;
      this.pointerAcross = (event.clientX / this.width - 0.5) * 2;
      this.pointerUp = (event.clientY / this.height - 0.5) * 2;
      this.requestFrame();
    });
  }

  /** A sideways drag turns the view, within limits that keep the lines in frame, and lets it spring back on release. */
  beginLook(clientX: number) {
    this.dragStartX = clientX;
  }

  moveLook(clientX: number) {
    if (this.dragStartX === null) return;
    const share = (clientX - this.dragStartX) / Math.max(1, this.width);
    this.pointerAcross = Math.max(
      -DRAG_REACH,
      Math.min(DRAG_REACH, -share * 3),
    );
    this.requestFrame();
  }

  endLook() {
    this.dragStartX = null;
    if (this.touch) this.pointerAcross = 0;
    this.requestFrame();
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
    this.measureTitle();
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

  /** While the name is on screen, words keep off it. */
  setTitleShown(shown: boolean) {
    if (!this.placement) return;
    this.placement.blocked =
      shown && this.titleRectangle ? [this.titleRectangle] : [];
    this.placement.forget();
    this.requestFrame();
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
    const target = this.reducedMotion ? 0 : this.scroll.progress();
    let moving = this.progress.step(target, seconds);
    moving = this.lookAcross.step(this.pointerAcross, seconds) || moving;
    moving = this.lookUp.step(this.pointerUp, seconds) || moving;
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
    const inside = insideAmount(this.progress.value);
    this.uniforms.holdSmall.value = 1 - inside;
    this.uniforms.labelReach.value = LABEL_REACH_INSIDE + (1 - inside) * 400;
    const near =
      FOG_FROM_AFAR.near + (FOG_INSIDE.near - FOG_FROM_AFAR.near) * inside;
    const far =
      FOG_FROM_AFAR.far + (FOG_INSIDE.far - FOG_FROM_AFAR.far) * inside;
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
    this.camera.fov = this.pose.fov;
    this.camera.aspect = aspect;
    this.camera.filmGauge = 35;
    // The lens shift, as a share of half the picture's width, written as the film offset three's camera takes.
    const halfWidthAtOne =
      Math.tan(((this.pose.fov / 2) * Math.PI) / 180) * aspect;
    this.camera.filmOffset =
      -this.pose.shiftAcross * this.camera.getFilmWidth() * halfWidthAtOne;
    this.camera.position.copy(this.pose.position);
    const lean = 0.05 * this.pose.position.distanceTo(this.pose.target);
    this.camera.lookAt(
      this.pose.target.x + this.lookAcross.value * lean,
      this.pose.target.y - this.lookUp.value * lean * 0.5,
      this.pose.target.z,
    );
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
}

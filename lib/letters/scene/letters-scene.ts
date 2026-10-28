/*
  The scene: one WebGL2 canvas holding the land and the sky, drawn only when something moves. At rest the land rolls
  and the skills drift at 30 frames a second; with reduced motion nothing rolls or drifts and a frame is drawn only
  when the reader does something. Nothing is drawn while the page is hidden, and nothing reads the page's layout
  during a frame: the stage's size is measured on a resize alone.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import type { SkillWord } from "@/lib/about-cv/skills";
import type { WorldKey } from "@/lib/about-cv/worlds";
import { rowOfZ, xOfColumn, yOfHeight, zOfRow } from "@/lib/letters/land/grid";
import { charactersOf, type EventOnLand, type Land } from "@/lib/letters/land/land";
import { field } from "@/lib/letters/palette";
import type { Atlas } from "@/lib/about-cv/scene/word-atlas";
import { buildSceneAtlas, cellKey } from "./atlas";
import { atlasTexture, rgb } from "./gl";
import { LandLayer } from "./land-layer";
import { LabelsLayer } from "./labels-layer";
import { MarksLayer } from "./marks-layer";
import { LETTER_LIFT, letterSize, Thinning } from "./thinning";
import { add, scale, type Vector } from "./matrix";
import { SkyLayer, type Rectangle } from "./sky-layer";
import { View } from "./view";

export type LettersData = { events: WorldEvent[]; skills: SkillWord[]; present: number; land: Land };

export type SceneElements = { root: HTMLElement; stage: HTMLElement; canvas: HTMLCanvasElement };

/** What a tap or a pointer lands on. */
export type Picked =
  | { kind: "event"; item: EventOnLand; cell: number }
  | { kind: "city"; index: number; cell: number }
  | { kind: "skill"; index: number };

/** The sharpest the scene is drawn on a touch screen, in device pixels per CSS pixel, and on a computer. */
const TOUCH_PIXEL_RATIO = 1.5;
const COMPUTER_PIXEL_RATIO = 2;
/** The resting pace of the roll and the drift, in frames a second. */
const RESTING_FRAMES = 30;
/** How long the letters take to type themselves in, in seconds. */
const TYPING_IN_SECONDS = 1.2;
/** How high the land rolls, in cells. */
const ROLL = 0.22;
/** How often the sky's words are placed again while the view moves, in milliseconds. */
const PLACE_EVERY = 100;

type FrameListener = (seconds: number, moving: boolean) => boolean | void;

export class LettersScene {
  readonly gl: WebGL2RenderingContext;
  readonly view: View;
  readonly landLayer: LandLayer;
  readonly sky: SkyLayer;
  readonly marks: MarksLayer;
  readonly labels: LabelsLayer;
  /** The events in focus now (lit, isolated, found), by index: those too far to read are named. */
  focusEvents = new Set<number>();
  readonly thinning: Thinning;
  /** The camera the rows were last thinned for, so they are thinned again only when it moves. */
  private thinnedFor = "";
  /** Where the city names and years shown lie on screen, for the sky to keep off. */
  private markPlaces: Rectangle[] = [];
  readonly touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** The row in focus the travel asks for. */
  travelRow = 0;
  private frameRequested = false;
  private lastFrame = 0;
  private lastPlaced = -Infinity;
  private readonly started = performance.now();
  private atlasReadyAt: number | null = null;
  private atlas: Atlas | null = null;
  private listeners: FrameListener[] = [];
  private blocked: Rectangle[] = [];
  private frames = 0;
  private wasMoving = true;
  /** The skills lit now, by index, for the placement. */
  litWords = new Set<number>();
  /** Whether the land may roll and the sky drift: off with reduced motion and while the joke plays. */
  ambient = true;

  constructor(
    readonly elements: SceneElements,
    readonly data: LettersData,
  ) {
    const gl = elements.canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: true });
    if (!gl) throw new Error("No WebGL2");
    this.gl = gl;
    this.view = new View(data.land.grid, this.reducedMotion);
    this.travelRow = this.view.rowAtTravel(0);
    this.landLayer = new LandLayer(gl, data.land);
    this.sky = new SkyLayer(gl, data.skills, data.land);
    this.marks = new MarksLayer(gl, data.land);
    this.thinning = new Thinning(gl, data.land);
    this.labels = new LabelsLayer(gl, data.land, (item) => this.crestPoint(item));
    this.landLayer.useKeptRows(this.thinning.texture);
    this.resetOwners();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.requestFrame();
    });
    if (this.reducedMotion) this.ambient = false;
    void this.buildAtlas();
  }

  private async buildAtlas() {
    const atlas = await buildSceneAtlas(charactersOf(this.data.land), this.data.skills, this.data.events);
    this.atlas = atlas;
    const texture = atlasTexture(this.gl, atlas.width, atlas.height, atlas.pixels);
    this.landLayer.useAtlas(atlas, texture);
    this.sky.useAtlas(atlas, texture);
    this.marks.useAtlas(atlas, texture);
    this.labels.useAtlas(atlas, texture);
    this.atlasReadyAt = performance.now();
    this.lastPlaced = -Infinity;
    this.requestFrame();
  }

  isAtlasReady() {
    return this.atlasReadyAt !== null;
  }

  /** How far the letters have typed themselves in: 0 none, 1 all. */
  reveal() {
    if (this.atlasReadyAt === null) return 0;
    if (this.reducedMotion) return 1.2;
    return ((performance.now() - this.atlasReadyAt) / 1000 / TYPING_IN_SECONDS) * 1.1;
  }

  /** Seconds since the page began, for the roll and the drift. */
  time() {
    return (performance.now() - this.started) / 1000;
  }

  private resize() {
    const { stage, canvas } = this.elements;
    const width = stage.clientWidth || window.innerWidth;
    const height = stage.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, this.touch ? TOUCH_PIXEL_RATIO : COMPUTER_PIXEL_RATIO);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    this.view.resize(width, height);
    this.lastPlaced = -Infinity;
    this.requestFrame();
  }

  /** The places of the name, the bio and the controls: no skill word is drawn over them. Measured on resize only. */
  /** The places of the name, the bio, the hint and the top band: the land's letters under them draw as dots. */
  setQuiet(rectangles: Rectangle[]) {
    this.landLayer.setQuiet(rectangles);
    this.requestFrame();
  }

  setBlocked(rectangles: Rectangle[]) {
    this.blocked = rectangles;
    this.lastPlaced = -Infinity;
    this.thinnedFor = "";
    this.requestFrame();
  }

  onFrame(listener: FrameListener) {
    this.listeners.push(listener);
  }

  requestFrame() {
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame((now) => this.frame(now));
  }

  frameCount() {
    return this.frames;
  }

  private frame(now: number) {
    this.frameRequested = false;
    if (document.hidden) return;
    const seconds = Math.min(0.05, this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60);
    const ambient = this.ambient && !this.reducedMotion;
    // At rest the roll and drift only need 30 frames a second: skip a screen frame when the last was too recent.
    if (ambient && !this.wasMoving && this.lastFrame && now - this.lastFrame < 1000 / RESTING_FRAMES - 2) {
      this.requestFrame();
      return;
    }
    this.lastFrame = now;
    let moving = this.view.step(this.travelRow, seconds);
    for (const listener of this.listeners) if (listener(seconds, moving)) moving = true;
    const time = this.time();
    const drift = ambient ? 1 : 0;
    this.thinIfMoved();
    if (now - this.lastPlaced > (moving ? PLACE_EVERY : 0) || (!moving && this.wasMoving)) {
      this.lastPlaced = now;
      const { width, height } = this.view.size();
      const reading = this.view.zoom.value < -0.5;
      const kept = [...this.blocked, ...this.thinning.readableRows, ...this.markPlaces];
      this.labels.place(this.view, this.focusEvents, (item) => this.crestSize(item), kept);
      this.sky.place(this.view, time, drift, [...kept, ...this.labels.places], this.litWords, width / height < 0.9, reading);
    }
    if (this.sky.step(seconds, this.reducedMotion)) moving = true;
    if (this.labels.step(seconds, this.reducedMotion)) moving = true;
    const reveal = this.reveal();
    const typing = this.atlasReadyAt !== null && reveal < 1.15;
    this.draw(time, drift, reveal);
    this.frames++;
    this.wasMoving = moving || typing;
    if (moving || typing || ambient || this.atlasReadyAt === null) this.requestFrame();
  }

  private draw(time: number, drift: number, reveal: number) {
    const { gl } = this;
    gl.viewport(0, 0, this.elements.canvas.width, this.elements.canvas.height);
    const [red, green, blue] = rgb(field);
    gl.clearColor(red, green, blue, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.landLayer.drawSolid(this.view);
    this.marks.draw(this.view);
    this.landLayer.draw(this.view, { time, roll: this.ambient && !this.reducedMotion ? ROLL : 0, reveal });
    this.sky.draw(this.view, time, drift);
    this.labels.draw(this.view);
  }

  /** Thins the rows again when the camera has moved since the last time, and only then. */
  private thinIfMoved() {
    const signature = Array.from(this.view.viewProjection, (value) => value.toFixed(4)).join(",");
    if (signature === this.thinnedFor) return;
    this.thinnedFor = signature;
    this.thinning.update(this.view);
    this.markPlaces = this.marks.update(this.view, this.thinning.readableRows, (point) => this.isHidden(point));
  }

  /** Sets every owner back to its resting state: the present warm, the cities their own tint. */
  resetOwners() {
    const { land } = this.data;
    for (const item of land.events)
      this.landLayer.setOwner(item.index, { kind: item.event.isPresent ? 1 : 0, light: 0, dim: 0, lifted: 0 });
    for (let index = 0; index < 3; index++) this.landLayer.setOwner(land.cityOwner(index), { kind: 2, light: 0, dim: 0, lifted: 0 });
  }

  /** Where an event stands highest: the middle of its track on its crest row. */
  crestPoint(item: EventOnLand): Vector {
    const { land } = this.data;
    const column = item.track.left + item.track.width / 2;
    const cell = item.crestRow * land.grid.columns + Math.floor(column);
    return [xOfColumn(column), yOfHeight(land.heights[cell] ?? 0) + LETTER_LIFT, zOfRow(item.crestRow + 0.5)];
  }

  /** How big an event's own letters are drawn now, at its crest. */
  crestSize(item: EventOnLand) {
    return letterSize(this.view, this.crestPoint(item))?.em ?? 0;
  }

  /** The world middle of an event's cells, and its top. */
  centreOf(item: EventOnLand): Vector {
    const { land } = this.data;
    const row = (item.rows[0] + item.rows[1]) / 2;
    const column = item.track.left + item.track.width / 2;
    const cell = Math.round(row) * land.grid.columns + Math.round(column);
    return [xOfColumn(column), yOfHeight(land.heights[cell] ?? 1), zOfRow(row)];
  }

  /** What lies under a point on the screen: a skill word in the sky first, then the land along the ray. */
  pick(x: number, y: number): Picked | null {
    for (const word of this.sky.placed) {
      const target = word.target;
      if (x >= target.left - 4 && x <= target.right + 4 && y >= target.top && y <= target.bottom) return { kind: "skill", index: word.index };
    }
    const { land } = this.data;
    const { grid } = land;
    const { width, height } = this.view.size();
    const ray = this.rayAt(x, y, width, height);
    for (let distance = 0; distance < 2400; distance += 0.35) {
      const point = add(ray.from, scale(ray.direction, distance));
      if (point[1] < -1.5) break;
      const column = Math.floor(point[0]);
      const row = Math.floor(rowOfZ(point[2]));
      if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) continue;
      const cell = row * grid.columns + column;
      const owner = land.owners[cell];
      if (owner < 0 || point[1] > yOfHeight(land.heights[cell]) + 1.2) continue;
      if (land.ownerIsCity(owner)) return { kind: "city", index: owner - land.events.length, cell };
      return { kind: "event", item: land.events[owner], cell };
    }
    return null;
  }

  private rayAt(x: number, y: number, width: number, height: number) {
    const m = this.view.inverse;
    const ndcX = (x / width) * 2 - 1;
    const ndcY = 1 - (y / height) * 2;
    const unproject = (ndcZ: number): Vector => {
      const w = m[3] * ndcX + m[7] * ndcY + m[11] * ndcZ + m[15];
      return [
        (m[0] * ndcX + m[4] * ndcY + m[8] * ndcZ + m[12]) / w,
        (m[1] * ndcX + m[5] * ndcY + m[9] * ndcZ + m[13]) / w,
        (m[2] * ndcX + m[6] * ndcY + m[10] * ndcZ + m[14]) / w,
      ];
    };
    const from = unproject(-1);
    const to = unproject(1);
    const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    return { from, direction: [(to[0] - from[0]) / length, (to[1] - from[1]) / length, (to[2] - from[2]) / length] as Vector };
  }

  /** Where a drawn letter (or dot) stands in the world: its column, its cell's height and row. */
  instancePoint(index: number): Vector {
    const { land } = this.data;
    const cell = land.instances.cell[index];
    const row = Math.floor(cell / land.grid.columns);
    return [xOfColumn(land.instances.column[index]), yOfHeight(land.heights[cell]) + LETTER_LIFT, zOfRow(row + 0.5)];
  }

  /** Where a drawn letter stands on screen now, and the size it is drawn at, in CSS pixels. */
  instanceOnScreen(index: number) {
    return letterSize(this.view, this.instancePoint(index));
  }

  /** Whether the land hides a point from the camera: a walk along the line to it, under the land's solid anywhere. */
  isHidden(point: Vector) {
    const { land } = this.data;
    const { grid } = land;
    const eye = this.view.eye;
    const length = Math.hypot(point[0] - eye[0], point[1] - eye[1], point[2] - eye[2]);
    for (let distance = 1; distance < length - 2.5; distance += 0.6) {
      const share = distance / length;
      const x = eye[0] + (point[0] - eye[0]) * share;
      const y = eye[1] + (point[1] - eye[1]) * share;
      const z = eye[2] + (point[2] - eye[2]) * share;
      const column = Math.floor(x);
      const row = Math.floor(rowOfZ(z));
      if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) continue;
      if (y < yOfHeight(land.heights[row * grid.columns + column]) - 1.2) return true;
    }
    return false;
  }

  /** For the checks: how many letters drawn now intersect another on screen. */
  overlaps() {
    const atlas = this.atlas;
    const glyphWidth = (code: number) => {
      const entry = atlas?.entries.get(cellKey(String.fromCharCode(code)));
      return entry ? (entry.aspect / entry.sizeShare) * (1 - 2 * entry.padAcross) : 0.7;
    };
    return this.thinning.overlaps(this.view, glyphWidth, (point) => this.isHidden(point));
  }

  /** The worlds' order, for the lanes the camera leans over. */
  laneColumn(world: WorldKey) {
    return this.data.land.grid.laneMiddle(world);
  }
}

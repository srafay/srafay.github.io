/*
  Which words are drawn, and where nothing collides. A phone holds at most PHONE_SKILL_CAP skills at once and a
  computer COMPUTER_SKILL_CAP, the nearest first. The rest wait. Then one pass places words by priority. The present's
  label comes first, then cities, line names, years, event labels and a few skills, each kind nearest first. A word
  is placed only where it overlaps nothing already placed and not the name. So at rest no label crosses another. An
  event's label that a line of light would run through moves to the other side of its bead, or above or below it.
  It goes wherever the lines leave it clear. Far away the years thin out by themselves, and near, every year has room. A skill not placed is a speck of light.
  All of it is worked out again only when the camera has moved.
*/
import * as THREE from "three";
import type { AtlasEntry } from "@/lib/about-cv/scene/word-atlas";
import { worldIndex, type WorldKey } from "@/lib/about-cv/worlds";
import type { PlacedWord, WordLayer, WordUniforms } from "./words";

export const PHONE_SKILL_CAP = 44;
export const COMPUTER_SKILL_CAP = 110;
/** How many skills read as words at once on a phone and on a computer. The others are specks. */
export const PHONE_READABLE = 10;
export const COMPUTER_READABLE = 16;
/** How far the camera moves before the placement is made again, in scene units. */
const MOVE_BEFORE_PLACING = 0.2;
/** How fast a word arrives, leaves, or turns from speck to word, as a share of the way per second. */
const CHANGE_SPEED = 3.2;
/** Room kept clear around each placed word, in pixels. */
const MARGIN = 5;

export type Rectangle = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const overlaps = (first: Rectangle, second: Rectangle) =>
  first.left < second.right &&
  second.left < first.right &&
  first.top < second.bottom &&
  second.top < first.bottom;

/** A rectangle with the room kept clear around it. */
const padded = (rectangle: Rectangle) => ({
  left: rectangle.left - MARGIN,
  right: rectangle.right + MARGIN,
  top: rectangle.top - MARGIN,
  bottom: rectangle.bottom + MARGIN,
});

type ScreenPoint = { x: number; y: number };

/** Which side of the line through a and b the point c is on: positive, negative, or 0 on it. */
const sideOf = (a: ScreenPoint, b: ScreenPoint, c: ScreenPoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const segmentsCross = (a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint) =>
  sideOf(a, b, c) * sideOf(a, b, d) < 0 && sideOf(c, d, a) * sideOf(c, d, b) < 0;

const inside = (rectangle: Rectangle, point: ScreenPoint) =>
  point.x > rectangle.left &&
  point.x < rectangle.right &&
  point.y > rectangle.top &&
  point.y < rectangle.bottom;

/** Whether a stretch of line on the stage runs through a rectangle. */
function runsThrough(a: ScreenPoint, b: ScreenPoint, rectangle: Rectangle) {
  if (inside(rectangle, a) || inside(rectangle, b)) return true;
  const corners = [
    { x: rectangle.left, y: rectangle.top },
    { x: rectangle.right, y: rectangle.top },
    { x: rectangle.right, y: rectangle.bottom },
    { x: rectangle.left, y: rectangle.bottom },
  ];
  return corners.some((corner, index) => segmentsCross(a, b, corner, corners[(index + 1) % 4]));
}

/** How far along a line, either side of a label's depth, its stretch is tested, and in how many pieces. */
const LINE_PROBE_REACH = 4;
const LINE_PROBE_PIECES = 8;
/** How far in from a label's edges a line must run to count as running through it, in pixels, across and up. */
const OWN_LINE_ROOM = [14, 5];
const OTHER_LINE_ROOM = [1, 1];

/**
  Where an event's label may sit around its bead, in the order tried: its own side, the other side, above, below.
  The first a line of light leaves clear is used. With none clear it keeps its own side, and its halo does the rest.
*/
function labelChoices(anchor: [number, number]): [number, number][] {
  const [across, up] = anchor;
  const mirrored: [number, number] = [1 - across, up];
  const choices: [number, number][] = [anchor, mirrored, [across, -0.55], [across, 1.55]];
  return choices.filter(
    (choice, index) =>
      choices.findIndex((other) => other[0] === choice[0] && other[1] === choice[1]) === index,
  );
}

const PRIORITY: Record<PlacedWord["kind"], number> = {
  present: 0,
  city: 1,
  lineName: 2,
  year: 3,
  event: 4,
  skill: 5,
};

type Entry = {
  word: PlacedWord;
  shape: AtlasEntry;
  layer: WordLayer;
  index: number;
};

export class WordPlacement {
  private readonly entries: Entry[];
  private readonly skills: Entry[];
  private readonly presenceTargets = new Map<Entry, number>();
  private readonly placedTargets = new Map<Entry, number>();
  /** The share of the skills' cap allowed in: the intro raises it from 0 to 1 so the nearest arrive first. */
  private arrival = 1;
  private lastPlacedAt = new THREE.Vector3(Infinity, 0, 0);
  private readonly scratch = new THREE.Vector3();
  /** Places on the stage nothing may cover, such as the name, and the present's own light. */
  blocked: Rectangle[] = [];
  viewport = { width: 1, height: 1 };
  /** Rectangles of the skills drawn as words, for a tap to find. */
  placedSkills: { rectangle: Rectangle; word: string }[] = [];
  /** Rectangles of the cities as drawn, for a tap to find. */
  placedCities: { rectangle: Rectangle; city: string }[] = [];
  /** The five lines' places on the arch, so a label can be kept off them. */
  lineAxes: { x: number; y: number }[] = [];
  /** The anchor each label is drawn with now, when moved off its own. */
  private readonly anchorsInUse = new Map<Entry, [number, number]>();
  /** The isolated world, whose events are placed first and held readable. Null when every world shows. */
  isolatedWorld: WorldKey | null = null;

  /**
    True while the whole is in view and may turn. Every word shown keeps its place ahead of one that was not, so
    words do not swap back and forth as the angle changes.
  */
  steady = false;

  /** Whether a word is an event of the isolated world. */
  private isIsolatedEvent(entry: Entry) {
    return (
      this.isolatedWorld !== null &&
      entry.word.kind === "event" &&
      entry.word.world === worldIndex(this.isolatedWorld)
    );
  }

  /** Whether the reader has lit this word: a lit skill, its events, or an open card's skills. */
  private isLit(entry: Entry) {
    return this.uniforms.selecting.value > 0.5 && entry.layer.isLit(entry.index);
  }

  /** A word that holds a readable size wherever it is: an isolated world's event, or a lit word. */
  private isHeldReadable(entry: Entry) {
    return this.isLit(entry) || this.isIsolatedEvent(entry);
  }

  /** The fewest pixels a word shows at: a word held readable holds 13, as the word layer does. */
  private minimumOf(entry: Entry) {
    return this.isHeldReadable(entry)
      ? Math.max(13, entry.word.minimumPixels)
      : entry.word.minimumPixels;
  }

  /** How much a word holds its fewest pixels, from 0 to 1, as the word layer works it out. */
  private holdOf(entry: Entry) {
    if (this.minimumOf(entry) <= 0) return 0;
    return this.isHeldReadable(entry) ? 1 : this.uniforms.holdSmall.value;
  }

  constructor(
    layers: { layer: WordLayer; shapes: Map<string, AtlasEntry> }[],
    private readonly uniforms: WordUniforms,
    private readonly cap: number,
    /** How many skills may read as words at once. The scene raises it inside the vault. */
    public readableCount: number,
  ) {
    this.entries = layers.flatMap(({ layer, shapes }) =>
      layer.words.map((word, index) => ({
        word,
        shape: shapes.get(word.key) as AtlasEntry,
        layer,
        index,
      })),
    );
    this.skills = this.entries.filter((entry) => entry.word.kind === "skill");
    for (const entry of this.entries) {
      this.presenceTargets.set(entry, entry.word.kind === "skill" ? 0 : 1);
      this.placedTargets.set(entry, 0);
    }
  }

  setArrival(share: number) {
    this.arrival = share;
    this.forget();
  }

  /** Places again on the next update, after a resize, a jump or a change of what is blocked. */
  forget() {
    this.lastPlacedAt.set(Infinity, 0, 0);
  }

  /** Places again when the camera has moved enough. Returns true while anything is still fading in or out. */
  update(
    camera: THREE.PerspectiveCamera,
    seconds: number,
    gradual = true,
  ): boolean {
    if (camera.position.distanceTo(this.lastPlacedAt) > MOVE_BEFORE_PLACING) {
      this.lastPlacedAt.copy(camera.position);
      this.place(camera);
    }
    return this.approach(gradual ? seconds : 1);
  }

  private depthOf(entry: Entry, camera: THREE.PerspectiveCamera) {
    this.scratch
      .set(entry.word.at.x, entry.word.at.y, entry.word.at.z)
      .applyMatrix4(camera.matrixWorldInverse);
    return -this.scratch.z;
  }

  /** The letters' height in pixels at a depth, before any growing. */
  private letterPixels(
    entry: Entry,
    camera: THREE.PerspectiveCamera,
    depth: number,
  ) {
    const pixelsPerUnit =
      (camera.projectionMatrix.elements[5] * 0.5 * this.viewport.height) /
      Math.max(depth, 0.001);
    return entry.word.letterHeight * pixelsPerUnit;
  }

  /** Whether the word layer would show this word at all here: big enough, near enough, not behind or too close. */
  private wouldShow(entry: Entry, depth: number, letters: number) {
    if (depth < 0.6) return false;
    if (depth > this.uniforms.fogFar.value * 0.92) return false;
    const holds = this.holdOf(entry) > 0.5;
    if (!holds && letters < 12.5) return false;
    if (
      entry.word.kind === "event" &&
      !this.isHeldReadable(entry) &&
      depth > this.uniforms.labelReach.value * 1.2
    )
      return false;
    return true;
  }

  /** The letters' rectangle on the stage, the atlas's empty padding left out. */
  private rectangleOf(
    entry: Entry,
    camera: THREE.PerspectiveCamera,
    letters: number,
    anchor: [number, number] = entry.word.anchor,
  ): Rectangle | null {
    const { word, shape } = entry;
    const holds = this.holdOf(entry);
    const largest =
      this.uniforms.maximumPixels.value / Math.max(letters, 0.001);
    const grow = Math.min(
      Math.max(1, 1 + (this.minimumOf(entry) / letters - 1) * holds),
      word.kind === "city" ? Infinity : largest,
    );
    if (word.kind === "city") {
      const quadHeight = word.letterHeight / shape.sizeShare;
      return this.boundsOf(
        this.tiltedCorners(word, quadHeight * shape.aspect, quadHeight),
        camera,
        shape,
      );
    }
    this.scratch.set(word.at.x, word.at.y, word.at.z).project(camera);
    if (this.scratch.z > 1 || this.scratch.z < -1) return null;
    const x = (this.scratch.x * 0.5 + 0.5) * this.viewport.width;
    const y = (0.5 - this.scratch.y * 0.5) * this.viewport.height;
    const height = (letters / shape.sizeShare) * grow;
    const width = height * shape.aspect;
    const [anchorAcross, anchorUp] = anchor;
    return {
      left: x - anchorAcross * width + width * shape.padAcross,
      right: x + (1 - anchorAcross) * width - width * shape.padAcross,
      top: y - (1 - anchorUp) * height + height * shape.padUp,
      bottom: y + anchorUp * height - height * shape.padUp,
    };
  }

  /**
    An event's label where no line of light runs through it, trying each place around its bead in turn. The word
    layer is told when a label moves, so it draws it there. Any other word keeps its own place.
  */
  private clearestRectangle(
    entry: Entry,
    camera: THREE.PerspectiveCamera,
    letters: number,
    taken: Rectangle[],
  ) {
    if (entry.word.kind !== "event" || !this.lineAxes.length)
      return this.rectangleOf(entry, camera, letters);
    const fits = (rectangle: Rectangle | null): rectangle is Rectangle =>
      rectangle !== null &&
      this.isOnStage(rectangle, "event") &&
      !taken.some((other) => overlaps(padded(rectangle), other));
    const choices = labelChoices(entry.word.anchor).map((anchor) => ({
      anchor,
      rectangle: this.rectangleOf(entry, camera, letters, anchor),
    }));
    // Clear of the lines and of every word placed, or else in its own place, where the halo does the rest.
    const chosen =
      choices.find(
        ({ rectangle }) => fits(rectangle) && !this.crossesALine(entry, rectangle, camera),
      ) ?? choices[0];
    this.useAnchor(entry, chosen.anchor);
    return chosen.rectangle;
  }

  /**
    Whether any line of light runs through a rectangle near a word's depth. The label's own line always passes its
    bead, beside the label, so only a stretch of it well inside the letters counts.
  */
  private crossesALine(
    entry: Entry,
    rectangle: Rectangle,
    camera: THREE.PerspectiveCamera,
  ) {
    return this.lineAxes.some((axis, world) => {
      const [across, up] = world === entry.word.world ? OWN_LINE_ROOM : OTHER_LINE_ROOM;
      const shrunk = {
        left: rectangle.left + across,
        right: rectangle.right - across,
        top: rectangle.top + up,
        bottom: rectangle.bottom - up,
      };
      let previous: ScreenPoint | null = null;
      for (let piece = 0; piece <= LINE_PROBE_PIECES; piece++) {
        const z =
          entry.word.at.z -
          LINE_PROBE_REACH +
          (2 * LINE_PROBE_REACH * piece) / LINE_PROBE_PIECES;
        const point = this.onStage(axis.x, axis.y, z, camera);
        if (previous && point && runsThrough(previous, point, shrunk)) return true;
        previous = point;
      }
      return false;
    });
  }

  /** Where a point of the scene lands on the stage, in pixels, or null behind the camera. */
  private onStage(x: number, y: number, z: number, camera: THREE.PerspectiveCamera) {
    this.scratch.set(x, y, z).project(camera);
    if (this.scratch.z > 1 || this.scratch.z < -1) return null;
    return {
      x: (this.scratch.x * 0.5 + 0.5) * this.viewport.width,
      y: (0.5 - this.scratch.y * 0.5) * this.viewport.height,
    };
  }

  /** Tells the word layer the anchor a label is drawn with, when it changes. */
  private useAnchor(entry: Entry, anchor: [number, number]) {
    const current = this.anchorsInUse.get(entry) ?? entry.word.anchor;
    if (current[0] === anchor[0] && current[1] === anchor[1]) return;
    this.anchorsInUse.set(entry, anchor);
    entry.layer.setAnchor(entry.index, anchor);
  }

  /** A city stands tilted on the floor. These are its four corners, as the word layer's FLAT shader places them. */
  private tiltedCorners(word: PlacedWord, width: number, height: number) {
    const [anchorAcross, anchorUp] = word.anchor;
    return [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].map(([across, up]) => {
      const offsetAcross = (across - anchorAcross) * width;
      const offsetUp = (up - anchorUp) * height;
      return new THREE.Vector3(
        word.at.x + offsetAcross,
        word.at.y + offsetUp * 0.77,
        word.at.z - offsetUp * 0.64,
      );
    });
  }

  private boundsOf(
    corners: THREE.Vector3[],
    camera: THREE.PerspectiveCamera,
    shape: AtlasEntry,
  ): Rectangle | null {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const corner of corners) {
      corner.project(camera);
      if (corner.z > 1 || corner.z < -1) return null;
      xs.push((corner.x * 0.5 + 0.5) * this.viewport.width);
      ys.push((0.5 - corner.y * 0.5) * this.viewport.height);
    }
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const insetAcross = (right - left) * shape.padAcross;
    const insetUp = (bottom - top) * shape.padUp;
    return {
      left: left + insetAcross,
      right: right - insetAcross,
      top: top + insetUp,
      bottom: bottom - insetUp,
    };
  }

  /** Wholly on the stage: a word cut by the screen's edge is not shown at all. Cities, being large, may run off a side. */
  private isOnStage(rectangle: Rectangle, kind: PlacedWord["kind"]) {
    const edge = kind === "city" ? -this.viewport.width * 0.2 : 2;
    return (
      rectangle.left >= edge &&
      rectangle.top >= 2 &&
      rectangle.right <= this.viewport.width - edge &&
      rectangle.bottom <= this.viewport.height - 2
    );
  }

  private place(camera: THREE.PerspectiveCamera) {
    camera.updateMatrixWorld();
    const measured = this.entries.map((entry) => {
      const depth = this.depthOf(entry, camera);
      return { entry, depth, letters: this.letterPixels(entry, camera, depth) };
    });

    // The skills drawn at all: the nearest within the cap, as far as the intro lets them in.
    const skillsByDepth = measured
      .filter(({ entry }) => entry.word.kind === "skill")
      .sort(
        (first, second) =>
          this.keepsItsPresence(first.entry) - this.keepsItsPresence(second.entry) ||
          (first.depth > 0 ? first.depth : Infinity) -
            (second.depth > 0 ? second.depth : Infinity),
      );
    const allowed = Math.round(this.cap * this.arrival);
    // A lit skill is always drawn, outside the cap.
    skillsByDepth.forEach(({ entry }, rank) =>
      this.presenceTargets.set(entry, rank < allowed || this.isLit(entry) ? 1 : 0),
    );

    const order = measured
      .filter(
        ({ entry }) =>
          entry.word.kind !== "skill" || this.presenceTargets.get(entry) === 1,
      )
      .sort(
        (first, second) =>
          this.priorityOf(first.entry) - this.priorityOf(second.entry) ||
          this.keepsItsPlace(first.entry) - this.keepsItsPlace(second.entry) ||
          first.depth - second.depth,
      );
    const taken: Rectangle[] = [...this.blocked];
    let readableSkills = 0;
    this.placedSkills = [];
    this.placedCities = [];
    for (const target of this.placedTargets.keys())
      this.placedTargets.set(target, 0);
    for (const { entry, depth, letters } of order) {
      const isSkill = entry.word.kind === "skill";
      const lit = this.isLit(entry);
      if (isSkill && !lit && readableSkills >= this.readableCount) continue;
      if (!this.wouldShow(entry, depth, letters)) continue;
      const rectangle = this.clearestRectangle(entry, camera, letters, taken);
      if (!rectangle || !this.isOnStage(rectangle, entry.word.kind)) continue;
      const room = padded(rectangle);
      // The present always shows. Everything else shows only where it is clear.
      if (
        entry.word.kind !== "present" &&
        taken.some((other) => overlaps(room, other))
      )
        continue;
      taken.push(room);
      this.placedTargets.set(entry, 1);
      if (isSkill) {
        if (!lit) readableSkills++;
        this.placedSkills.push({
          rectangle,
          word: entry.word.key.slice("skill:".length),
        });
      }
      if (entry.word.kind === "city")
        this.placedCities.push({
          rectangle,
          city: entry.word.key.slice("city:".length),
        });
    }
  }

  /**
    A year or a city shown last time keeps its place ahead of one that was not. So a turning view does not swap them
    back and forth, each fading through the other. Sorts first (0) when it was shown.
  */
  private keepsItsPlace(entry: Entry) {
    const steady =
      this.steady || entry.word.kind === "year" || entry.word.kind === "city";
    return steady && this.placedTargets.get(entry) === 1 ? 0 : 1;
  }

  /** While the view turns, a skill drawn last time stays drawn ahead of a nearer one. Sorts first (0) when it was. */
  private keepsItsPresence(entry: Entry) {
    return this.steady && this.presenceTargets.get(entry) === 1 ? 0 : 1;
  }

  /** The order words are placed in: lit words straight after the present, then an isolated world's events. */
  private priorityOf(entry: Entry) {
    if (this.isLit(entry)) return 0.25;
    return this.isIsolatedEvent(entry) ? 0.5 : PRIORITY[entry.word.kind];
  }

  private approach(seconds: number) {
    const step = Math.min(1, seconds * CHANGE_SPEED);
    const move = (now: number, target: number) =>
      Math.abs(target - now) < 0.02 ? target : now + (target - now) * step;
    const changedLayers = new Set<WordLayer>();
    for (const entry of this.entries) {
      const { layer, index } = entry;
      if (entry.word.kind === "skill") {
        const presence = layer.presenceOf(index);
        const target = this.presenceTargets.get(entry) as number;
        if (presence !== target) {
          layer.setPresence(index, move(presence, target));
          changedLayers.add(layer);
        }
      }
      const placed = layer.readableOf(index);
      const placedTarget = this.placedTargets.get(entry) as number;
      if (placed !== placedTarget) {
        layer.setReadable(index, move(placed, placedTarget));
        changedLayers.add(layer);
      }
    }
    for (const layer of changedLayers) layer.markChanged();
    return changedLayers.size > 0;
  }
}

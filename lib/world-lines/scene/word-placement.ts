/*
  Which words are drawn, and where nothing collides. A phone holds at most PHONE_SKILL_CAP skills at once and a
  computer COMPUTER_SKILL_CAP, the nearest first. The rest wait. Then one pass places words by priority. The present's
  label comes first, then cities, line names, years, event labels and a few skills, each kind nearest first. A word
  is placed only where it overlaps nothing already placed and not the name. So at rest no label crosses another. Far
  away the years thin out by themselves, and near, every year has room. A skill not placed is a speck of light.
  All of it is worked out again only when the camera has moved.
*/
import * as THREE from "three";
import type { AtlasEntry } from "./word-atlas";
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
    const holds =
      entry.word.minimumPixels > 0 && this.uniforms.holdSmall.value > 0.5;
    if (!holds && letters < 12.5) return false;
    if (
      entry.word.kind === "event" &&
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
  ): Rectangle | null {
    const { word, shape } = entry;
    const holds = word.minimumPixels > 0 ? this.uniforms.holdSmall.value : 0;
    const largest =
      this.uniforms.maximumPixels.value / Math.max(letters, 0.001);
    const grow = Math.min(
      Math.max(1, 1 + (word.minimumPixels / letters - 1) * holds),
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
    const [anchorAcross, anchorUp] = word.anchor;
    return {
      left: x - anchorAcross * width + width * shape.padAcross,
      right: x + (1 - anchorAcross) * width - width * shape.padAcross,
      top: y - (1 - anchorUp) * height + height * shape.padUp,
      bottom: y + anchorUp * height - height * shape.padUp,
    };
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
          (first.depth > 0 ? first.depth : Infinity) -
          (second.depth > 0 ? second.depth : Infinity),
      );
    const allowed = Math.round(this.cap * this.arrival);
    skillsByDepth.forEach(({ entry }, rank) =>
      this.presenceTargets.set(entry, rank < allowed ? 1 : 0),
    );

    const order = measured
      .filter(
        ({ entry }) =>
          entry.word.kind !== "skill" || this.presenceTargets.get(entry) === 1,
      )
      .sort(
        (first, second) =>
          PRIORITY[first.entry.word.kind] - PRIORITY[second.entry.word.kind] ||
          first.depth - second.depth,
      );
    const taken: Rectangle[] = [...this.blocked];
    let readableSkills = 0;
    this.placedSkills = [];
    for (const target of this.placedTargets.keys())
      this.placedTargets.set(target, 0);
    for (const { entry, depth, letters } of order) {
      const isSkill = entry.word.kind === "skill";
      if (isSkill && readableSkills >= this.readableCount) continue;
      if (!this.wouldShow(entry, depth, letters)) continue;
      const rectangle = this.rectangleOf(entry, camera, letters);
      if (!rectangle || !this.isOnStage(rectangle, entry.word.kind)) continue;
      const padded = {
        left: rectangle.left - MARGIN,
        right: rectangle.right + MARGIN,
        top: rectangle.top - MARGIN,
        bottom: rectangle.bottom + MARGIN,
      };
      // The present always shows. Everything else shows only where it is clear.
      if (
        entry.word.kind !== "present" &&
        taken.some((other) => overlaps(padded, other))
      )
        continue;
      taken.push(padded);
      this.placedTargets.set(entry, 1);
      if (isSkill) {
        readableSkills++;
        this.placedSkills.push({
          rectangle,
          word: entry.word.key.slice("skill:".length),
        });
      }
    }
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

/*
  What the reader has lit. A lit skill brightens itself, every event whose CV line names it, and the threads between,
  in the site's signal colour, and dims everything else. An opened event lights itself and the skills its lines name,
  with their threads to it. Nothing lit, everything is as it was.
*/
import * as THREE from "three";
import type { WorldEvent } from "@/lib/world-lines/events";
import type { SkillWord } from "@/lib/world-lines/skills";
import type { Palette } from "./forms";
import type { Point } from "./layout";
import type { WorldLinesScene } from "./mount";
import { eventKey, skillKey } from "./scene-words";

const toVector = (point: Point) => new THREE.Vector3(point.x, point.y, point.z);

/** How bright a lit thread is. */
const LIT_THREAD_STRENGTH = 0.85;
/** Where along a thread, from its event, it begins to fade out, and how bright it still is there. */
const THREAD_FADES_FROM = 0.7;
const THREAD_SHARE_WHERE_FADING = 0.3;
/** How much a bead keeps of its light while something else is lit. */
const DIMMED_BEAD = 0.25;

function threadMaterial() {
  return new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}

export class Lighting {
  private readonly eventIndex = new Map<string, number>();
  private readonly eventWord = new Map<string, number>();
  private readonly skillWord = new Map<string, number>();
  private readonly skillPoint = new Map<string, THREE.Vector3>();
  private litThreads: THREE.LineSegments | null = null;

  constructor(
    private readonly scene: WorldLinesScene,
    private readonly events: WorldEvent[],
    private readonly skills: SkillWord[],
    private readonly palette: Palette,
  ) {
    events.forEach((event, index) => this.eventIndex.set(event.id, index));
    scene.words?.words.forEach((word, index) => {
      if (word.kind === "event" || word.kind === "present")
        this.eventWord.set(word.key, index);
      if (word.kind === "skill") this.skillWord.set(word.key, index);
    });
    skills.forEach((skill, index) =>
      this.skillPoint.set(skill.word, toVector(scene.skillPoints[index])),
    );
  }

  private threadsBetween(
    pairs: readonly (readonly [string, string])[],
    colour: THREE.Color,
    strength: number,
  ) {
    const positions: number[] = [];
    const colours: number[] = [];
    for (const [word, id] of pairs) {
      const from = this.skillPoint.get(word);
      const index = this.eventIndex.get(id);
      if (!from || index === undefined) continue;
      const to = this.scene.beads.points[index];
      // The thread is brightest at its event and fades out before the skill, so it never runs through the word's letters.
      const fading = to.clone().lerp(from, THREAD_FADES_FROM);
      const shade = (share: number) => [
        colour.r * strength * share,
        colour.g * strength * share,
        colour.b * strength * share,
      ];
      positions.push(to.x, to.y, to.z, fading.x, fading.y, fading.z);
      colours.push(...shade(1), ...shade(THREAD_SHARE_WHERE_FADING));
      positions.push(fading.x, fading.y, fading.z, from.x, from.y, from.z);
      colours.push(...shade(THREAD_SHARE_WHERE_FADING), ...shade(0));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colours, 3),
    );
    const threads = new THREE.LineSegments(geometry, threadMaterial());
    // Drawn before the words, so a word's dark halo lies over any thread that passes under it.
    threads.renderOrder = -1;
    return threads;
  }

  /** Lights a skill and every event that names it. */
  lightSkill(skill: SkillWord) {
    this.light(
      [skill.word],
      skill.events,
      skill.events.map((id) => [skill.word, id] as const),
    );
  }

  /** Lights an event and the skills its CV lines name. */
  lightEvent(event: WorldEvent) {
    this.light(
      event.skills,
      [event.id],
      event.skills.map((word) => [word, event.id] as const),
    );
  }

  private light(
    words: string[],
    eventIds: string[],
    threads: (readonly [string, string])[],
  ) {
    this.clearThreads();
    const layer = this.scene.words;
    if (!layer) return;
    layer.words.forEach((_, index) => layer.setLit(index, false));
    for (const word of words) {
      const index = this.skillWord.get(skillKey({ word } as SkillWord));
      if (index !== undefined) layer.setLit(index, true);
    }
    for (const id of eventIds) {
      const index = this.eventWord.get(eventKey({ id } as WorldEvent));
      if (index !== undefined) layer.setLit(index, true);
    }
    layer.markChanged();
    this.scene.uniforms.selecting.value = 1;
    this.scene.wordsRelit();
    const lit = new Set(eventIds);
    this.events.forEach((event, index) =>
      lit.has(event.id)
        ? this.scene.beads.setBrightness(index, 1, this.palette.signal)
        : this.scene.beads.setBrightness(
            index,
            DIMMED_BEAD,
            this.palette.light,
          ),
    );
    this.litThreads = this.threadsBetween(
      threads,
      this.palette.signal,
      LIT_THREAD_STRENGTH,
    );
    this.scene.scene.add(this.litThreads);
    this.scene.requestFrame();
  }

  private clearThreads() {
    if (!this.litThreads) return;
    this.scene.scene.remove(this.litThreads);
    this.litThreads.geometry.dispose();
    (this.litThreads.material as THREE.Material).dispose();
    this.litThreads = null;
  }

  clear() {
    this.clearThreads();
    const layer = this.scene.words;
    if (layer) {
      layer.words.forEach((_, index) => layer.setLit(index, false));
      layer.markChanged();
    }
    this.scene.uniforms.selecting.value = 0;
    this.scene.wordsRelit();
    this.scene.restBeads();
    this.scene.requestFrame();
  }
}

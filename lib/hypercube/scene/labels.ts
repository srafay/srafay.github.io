/*
  The words in the scene: every event's label with its glyph, the present's with its date, the years on the upper
  spine, the cities on the lower one, and every skill with its mark. They are drawn by the browser in the site's own
  faces into version 4's distance-field atlas, then laid flat on the screen at their points, so they stay sharp and
  upright however the object turns.

  Which words show is worked out a few times a second, by priority: the present, what the reader lit, the slice's
  events, the cities, the years, the events nearest the camera, then a few skills. A word shows only where it covers
  no other word, the name or a control. A word shown last time keeps its place ahead of a new one, so a turning object
  does not swap its words back and forth.
*/
import * as THREE from "three";
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { placeGlyph, type Glyph } from "@/lib/about-cv/icons";
import {
  buildAtlas,
  EDGE_VALUE,
  loadFaces,
  type Atlas,
  type AtlasEntry,
  type WordRequest,
} from "@/lib/about-cv/scene/word-atlas";
import type { SkillWord } from "@/lib/about-cv/skills";
import { worldIndex } from "@/lib/about-cv/worlds";
import { PRESENT, QUIET_WORDS, rgbOf, worldColour, WORDS, type Rgb } from "@/lib/hypercube/palette";
import {
  beadPoint,
  beadTime,
  cityMarks,
  homeWorldOf,
  skillHomes,
  yearMarks,
  type HypercubeData,
} from "@/lib/hypercube/shape";
import type { Point4 } from "@/lib/hypercube/space";

export type LabelKind = "present" | "event" | "year" | "city" | "skill";

export type Label = {
  key: string;
  kind: LabelKind;
  text: string;
  glyph?: Glyph;
  /** How tall its letters are drawn on the screen, in CSS pixels. */
  size: number;
  colour: Rgb;
  /** Where it stands in four dimensions. */
  point: Point4;
  /** Its moment, so the unfold and the slice can hold it back. */
  time: number;
  /** Its world's index, or -1. */
  world: number;
  event?: WorldEvent;
  skill?: SkillWord;
  city?: string;
};

/** The faces the atlas draws, at twice the largest size shown, so they stay sharp on a 3x screen. */
const FACES = {
  event: "500 30px Figtree",
  present: "600 30px Figtree",
  year: "500 30px Fraunces",
  city: "500 36px Fraunces",
  skill: "400 28px Figtree",
} as const;
const FACE_PIXELS: Record<LabelKind, number> = { event: 30, present: 30, year: 30, city: 36, skill: 28 };
/** How tall each kind is drawn on the screen, in CSS pixels. Nothing is under 13. */
const SHOWN_PIXELS: Record<LabelKind, number> = { event: 14, present: 15, year: 14, city: 18, skill: 13 };

const towardWhite = (colour: Rgb, share: number): Rgb => colour.map((channel) => channel + (1 - channel) * share) as Rgb;

/** "Twin Technology, since August 2026": the present names itself with its date. */
export const presentLabel = (event: WorldEvent) =>
  `${event.label}, ${event.dates.charAt(0).toLowerCase()}${event.dates.slice(1)}`;

/**
  Every word in the scene. On a narrow screen the present names itself by its short label alone, since its date would
  run off the screen; its card gives the date.
*/
export function sceneLabels(data: HypercubeData, narrow: boolean): Label[] {
  const homes = skillHomes(data);
  const labels: Label[] = [];
  for (const event of data.events)
    labels.push({
      key: `event:${event.id}`,
      kind: event.isPresent ? "present" : "event",
      text: event.isPresent && !narrow ? presentLabel(event) : event.label,
      glyph: glyphOfEvent(event),
      size: SHOWN_PIXELS[event.isPresent ? "present" : "event"],
      colour: event.isPresent ? rgbOf(PRESENT) : towardWhite(worldColour(event.world), 0.45),
      point: beadPoint(event, data.present),
      time: beadTime(event, data.present),
      world: worldIndex(event.world),
      event,
    });
  for (const mark of yearMarks(data.present))
    labels.push({
      key: `year:${mark.year}`,
      kind: "year",
      text: String(mark.year),
      size: SHOWN_PIXELS.year,
      colour: rgbOf(QUIET_WORDS),
      point: mark.place,
      time: mark.time,
      world: -1,
    });
  for (const mark of cityMarks(data.present))
    labels.push({
      key: `city:${mark.city}`,
      kind: "city",
      text: mark.city,
      glyph: placeGlyph,
      size: SHOWN_PIXELS.city,
      colour: towardWhite(rgbOf(QUIET_WORDS), 0.35),
      point: mark.place,
      time: mark.time,
      world: -1,
      city: mark.city,
    });
  data.skills.forEach((skill, index) => {
    const world = homeWorldOf(skill, data.events);
    labels.push({
      key: `skill:${skill.word}`,
      kind: "skill",
      text: skill.word,
      glyph: glyphOfSkill(skill),
      size: SHOWN_PIXELS.skill,
      colour: towardWhite(world ? worldColour(world, true) : rgbOf(WORDS), 0.35),
      point: homes[index],
      time: data.present,
      world: world ? worldIndex(world) : -1,
      skill,
    });
  });
  return labels;
}

function requestFor(label: Label): WordRequest {
  return {
    key: label.key,
    text: label.text,
    font: FACES[label.kind],
    sizePixels: FACE_PIXELS[label.kind],
    glyph: label.glyph,
    glyphShare: label.kind === "city" ? 0.55 : undefined,
  };
}

export const labelFaces = Object.values(FACES);

/** Builds the atlas for every label, a little each frame, after the faces have loaded. */
export async function labelAtlas(labels: Label[]) {
  await loadFaces(labelFaces);
  return buildAtlas(labels.map(requestFor));
}

const vertexShader = /* glsl */ `
attribute vec2 corner;
attribute vec4 box;
attribute vec4 atlasRect;
attribute vec3 wordColour;
attribute float opacity;
uniform vec2 viewport;
varying vec2 atlasPoint;
varying vec3 colour;
varying float shown;
void main() {
  vec2 pixel = box.xy + corner * box.zw;
  gl_Position = vec4(pixel.x / viewport.x * 2.0 - 1.0, 1.0 - pixel.y / viewport.y * 2.0, 0.0, 1.0);
  atlasPoint = vec2(mix(atlasRect.x, atlasRect.z, corner.x), mix(atlasRect.y, atlasRect.w, corner.y));
  colour = wordColour;
  shown = opacity;
  if (opacity < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D atlas;
uniform float awake;
varying vec2 atlasPoint;
varying vec3 colour;
varying float shown;
void main() {
  float field = texture2D(atlas, atlasPoint).r;
  float softness = max(fwidth(field) * 0.7, 0.002);
  float coverage = smoothstep(${EDGE_VALUE.toFixed(3)} - softness, ${EDGE_VALUE.toFixed(3)} + softness, field);
  // A soft dark halo just outside the letters, so a word over bright dots stays readable.
  float halo = smoothstep(${(EDGE_VALUE - 0.45).toFixed(3)}, ${(EDGE_VALUE - 0.05).toFixed(3)}, field) * 0.75;
  float alpha = max(coverage, halo) * shown * awake;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(colour * coverage / max(coverage, halo), alpha);
}
`;

/** The atlas as a one-channel texture, with smaller copies for small words. */
function atlasTexture(atlas: Atlas) {
  const texture = new THREE.DataTexture(atlas.pixels, atlas.width, atlas.height, THREE.RedFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** Every label as one quad, all drawn in one call. The page's thread writes only where each is and how much it shows. */
export class WordQuads {
  readonly mesh: THREE.Mesh;
  private readonly boxes: Float32Array;
  private readonly opacities: Float32Array;
  private readonly boxAttribute: THREE.InstancedBufferAttribute;
  private readonly opacityAttribute: THREE.InstancedBufferAttribute;
  readonly viewport = { value: new THREE.Vector2(1, 1) };
  /** How awake the words are, from 0 (asleep, while the object rests) to 1. */
  readonly awake = { value: 1 };

  constructor(
    labels: Label[],
    readonly atlas: Atlas,
  ) {
    const count = labels.length;
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute("corner", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(12).fill(0), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.instanceCount = count;
    this.boxes = new Float32Array(count * 4);
    this.opacities = new Float32Array(count);
    const rects = new Float32Array(count * 4);
    const colours = new Float32Array(count * 3);
    labels.forEach((label, index) => {
      rects.set((atlas.entries.get(label.key) as AtlasEntry).uv, index * 4);
      colours.set(label.colour, index * 3);
    });
    this.boxAttribute = new THREE.InstancedBufferAttribute(this.boxes, 4);
    this.boxAttribute.setUsage(THREE.DynamicDrawUsage);
    this.opacityAttribute = new THREE.InstancedBufferAttribute(this.opacities, 1);
    this.opacityAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("box", this.boxAttribute);
    geometry.setAttribute("opacity", this.opacityAttribute);
    geometry.setAttribute("atlasRect", new THREE.InstancedBufferAttribute(rects, 4));
    geometry.setAttribute("wordColour", new THREE.InstancedBufferAttribute(colours, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { atlas: { value: atlasTexture(atlas) }, viewport: this.viewport, awake: this.awake },
      // Laid out with y growing down the screen, each quad winds the other way round: both sides are drawn.
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
  }

  setBox(index: number, left: number, top: number, width: number, height: number) {
    this.boxes.set([left, top, width, height], index * 4);
  }

  setOpacity(index: number, opacity: number) {
    this.opacities[index] = opacity;
  }

  opacityOf(index: number) {
    return this.opacities[index];
  }

  markChanged() {
    this.boxAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
  }
}

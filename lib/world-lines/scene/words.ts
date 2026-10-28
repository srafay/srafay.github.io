/*
  Every word in the scene as one quad of the word atlas, all drawn in one call. The graphics chip does the per-frame
  work. It turns each word to face the camera, or stands a city on the floor. It keeps a word that must stay readable
  at 13 pixels or more, fades one that would be smaller, and colours what the reader lit. The page's own thread only
  writes a word's presence, lit state and placement when they change.
*/
import * as THREE from "three";
import { EDGE_VALUE, type Atlas, type AtlasEntry } from "./word-atlas";
import type { Point } from "./layout";

export type WordKind =
  "skill" | "event" | "year" | "lineName" | "present" | "city";

export type PlacedWord = {
  key: string;
  kind: WordKind;
  at: Point;
  /** The letters' height in scene units at their natural size. */
  letterHeight: number;
  /** Where the point sits in the word: (0, 0.5) puts the point at the word's left middle. */
  anchor: [number, number];
  colour: THREE.Color;
  strength: number;
  /** Never shown smaller than this many pixels: it grows instead. Zero lets it fade out when small. */
  minimumPixels: number;
};

const KIND_NUMBER: Record<WordKind, number> = {
  skill: 0,
  event: 1,
  year: 2,
  lineName: 3,
  present: 4,
  city: 5,
};

/** How a skill drifts, slowly, on its own phase: the word and its speck share it, so one becomes the other in place. */
const DRIFT = /* glsl */ `vec3(
      sin(time * 0.21 + phase * 6.283) * 0.05,
      sin(time * 0.17 + phase * 11.0) * 0.035,
      cos(time * 0.13 + phase * 3.1) * 0.07
    ) * drift`;

const vertexShader = /* glsl */ `
attribute vec2 corner;
attribute vec3 wordCentre;
// The quad's height, its width over its height, the share of it the letters take, and the fewest pixels it may show.
attribute vec4 shape;
attribute vec4 atlasRect;
attribute vec2 wordAnchor;
attribute vec3 wordColour;
// How strong it is, what kind of word it is, and where its drift begins.
attribute vec3 style;
// How present it is (the phone's cap, the intro), whether the reader lit it, and how readable it is (a skill that is
// not one of the few chosen to read is haze).
attribute vec3 state;

uniform float viewportHeight;
uniform float time;
uniform float drift;
uniform float fogNear;
uniform float fogFar;
uniform float maximumPixels;
uniform float holdSmall;
uniform float labelReach;
uniform float selecting;
uniform vec3 signal;

varying vec2 atlasPoint;
varying vec3 colour;
varying float opacity;
varying float haloShare;

void main() {
  float quadHeight = shape.x;
  float quadAspect = shape.y;
  float sizeShare = shape.z;
  float minimumPixels = shape.w;
  float wordStrength = style.x;
  float wordKind = style.y;
  float phase = style.z;
  float presence = state.x;
  float lit = state.y;
  float readable = state.z;
  vec3 centre = wordCentre;
  bool isSkill = wordKind < 0.5;
  if (isSkill) {
    centre += ${DRIFT};
  }
  vec4 viewCentre = modelViewMatrix * vec4(centre, 1.0);
  float depth = max(0.001, -viewCentre.z);
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * viewportHeight / depth;
  float letterPixels = quadHeight * sizeShare * pixelsPerUnit;
  // From afar (the first screen and the end) a word that must stay readable grows to its smallest size. Inside the
  // vault words are near enough to be read as they are, and a far one simply fades.
  float holdsSize = minimumPixels > 0.0 ? holdSmall : 0.0;
  float grow = max(1.0, mix(1.0, minimumPixels / letterPixels, holdsSize));
  // A word coming close stops growing at the largest size a label needs, so it never swells into a grey ghost.
  // A city is meant to be large and keeps growing.
  if (wordKind < 4.5) grow = min(grow, maximumPixels / max(letterPixels, 0.001));
  vec2 size = vec2(quadHeight * quadAspect, quadHeight) * grow;
  vec2 offset = (corner - wordAnchor) * size;
#ifdef FLAT
  // Standing on the floor and leaning back about fifty degrees, like a sign laid on the ground facing the way back.
  vec4 viewPoint = modelViewMatrix * vec4(centre + vec3(offset.x, offset.y * 0.77, -offset.y * 0.64), 1.0);
#else
  vec4 viewPoint = viewCentre + vec4(offset, 0.0, 0.0);
#endif
  gl_Position = projectionMatrix * viewPoint;
  atlasPoint = vec2(mix(atlasRect.x, atlasRect.z, corner.x), mix(atlasRect.w, atlasRect.y, corner.y));

  float shownPixels = letterPixels * grow;
  float legible = mix(smoothstep(11.5, 13.5, letterPixels), 1.0, holdsSize);
  // Inside the vault an event's label shows only within reading distance, so far labels never pile up at the horizon.
  float withinReach = wordKind > 0.5 && wordKind < 1.5 ? 1.0 - smoothstep(labelReach, labelReach * 1.4, depth) : 1.0;
  float notTooClose = smoothstep(0.45, 1.3, depth);
  float notTooBig = 1.0;
  // Only words the placement chose are drawn as words. An unchosen skill is a speck of light instead.
  float placed = readable;
  float fog = 1.0 - smoothstep(fogNear, fogFar, depth);
  float isLit = step(0.5, lit) * selecting;
  float dimmed = mix(1.0, mix(0.2, 1.0, step(0.5, lit)), selecting);
  colour = mix(wordColour, signal, isLit);
  opacity = wordStrength * presence * legible * withinReach * notTooClose * notTooBig * mix(placed, 1.0, isLit) * fog * dimmed;
  // A dimmed word loses its halo too, or the halo would stand out as a dark shape.
  haloShare = dimmed * dimmed;
  if (opacity < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D atlas;
varying vec2 atlasPoint;
varying vec3 colour;
varying float opacity;
varying float haloShare;

void main() {
  float field = texture2D(atlas, atlasPoint).r;
  float softness = max(fwidth(field) * 0.7, 0.002);
  float coverage = smoothstep(${EDGE_VALUE.toFixed(3)} - softness, ${EDGE_VALUE.toFixed(3)} + softness, field);
  // A soft dark halo just outside the letters, so a word sitting on a bright line stays readable there.
  float halo = smoothstep(${(EDGE_VALUE - 0.42).toFixed(3)}, ${(EDGE_VALUE - 0.04).toFixed(3)}, field) * 0.7 * haloShare;
  float alpha = max(coverage, halo) * opacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(colour * (coverage / max(alpha / max(opacity, 0.0001), 0.0001)), alpha);
}
`;

export type WordUniforms = {
  viewportHeight: { value: number };
  viewportWidth: { value: number };
  time: { value: number };
  drift: { value: number };
  fogNear: { value: number };
  fogFar: { value: number };
  maximumPixels: { value: number };
  /** 1 from afar, where readable words keep 13 pixels; 0 inside the vault. */
  holdSmall: { value: number };
  /** How far an event's label reaches inside the vault, in scene units. */
  labelReach: { value: number };
  selecting: { value: number };
  signal: { value: THREE.Color };
  atlas: { value: THREE.Texture | null };
};

export function wordUniforms(signal: THREE.Color): WordUniforms {
  return {
    viewportHeight: { value: 800 },
    viewportWidth: { value: 400 },
    time: { value: 0 },
    drift: { value: 1 },
    fogNear: { value: 14 },
    fogFar: { value: 44 },
    maximumPixels: { value: 26 },
    holdSmall: { value: 1 },
    labelReach: { value: 1000 },
    selecting: { value: 0 },
    signal: { value: signal },
    atlas: { value: null },
  };
}

export type WordLayer = {
  mesh: THREE.Mesh;
  words: PlacedWord[];
  /** How present a word is, from 0 to 1: the phone's cap and the intro's arrival write here. */
  presenceOf(index: number): number;
  setPresence(index: number, amount: number): void;
  setLit(index: number, lit: boolean): void;
  readableOf(index: number): number;
  setReadable(index: number, amount: number): void;
  /** Sends the changed presences and lit states to the graphics chip, once per frame at most. */
  markChanged(): void;
};

/** A quad's four corners and two triangles, shared by every word. */
function quadGeometry(count: number) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "corner",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
  );
  // three needs a position attribute to count vertices. The corners are the real positions.
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Array(12).fill(0), 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.instanceCount = count;
  return geometry;
}

function perWord(
  geometry: THREE.InstancedBufferGeometry,
  name: string,
  values: Float32Array,
  size: number,
) {
  const attribute = new THREE.InstancedBufferAttribute(values, size);
  geometry.setAttribute(name, attribute);
  return attribute;
}

export function buildWordLayer(
  words: PlacedWord[],
  atlas: Atlas,
  texture: THREE.Texture,
  uniforms: WordUniforms,
  flat = false,
): WordLayer {
  const count = words.length;
  const geometry = quadGeometry(count);
  const centres = new Float32Array(count * 3);
  const shapes = new Float32Array(count * 4);
  const rects = new Float32Array(count * 4);
  const anchors = new Float32Array(count * 2);
  const colours = new Float32Array(count * 3);
  const styles = new Float32Array(count * 3);
  const states = new Float32Array(count * 3);
  words.forEach((word, index) => {
    const entry = atlas.entries.get(word.key) as AtlasEntry;
    centres.set([word.at.x, word.at.y, word.at.z], index * 3);
    shapes.set(
      [
        word.letterHeight / entry.sizeShare,
        entry.aspect,
        entry.sizeShare,
        word.minimumPixels,
      ],
      index * 4,
    );
    rects.set(entry.uv, index * 4);
    anchors.set(word.anchor, index * 2);
    colours.set([word.colour.r, word.colour.g, word.colour.b], index * 3);
    styles.set(
      [word.strength, KIND_NUMBER[word.kind], (index * 0.618) % 1],
      index * 3,
    );
    states.set([1, 0, 0], index * 3);
  });
  perWord(geometry, "wordCentre", centres, 3);
  perWord(geometry, "shape", shapes, 4);
  perWord(geometry, "atlasRect", rects, 4);
  perWord(geometry, "wordAnchor", anchors, 2);
  perWord(geometry, "wordColour", colours, 3);
  perWord(geometry, "style", styles, 3);
  const stateAttribute = perWord(geometry, "state", states, 3);
  stateAttribute.setUsage(THREE.DynamicDrawUsage);

  uniforms.atlas.value = texture;
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    defines: flat ? { FLAT: 1 } : {},
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = flat ? 1 : 2;
  return {
    mesh,
    words,
    presenceOf: (index) => states[index * 3],
    setPresence(index, amount) {
      states[index * 3] = amount;
    },
    setLit(index, lit) {
      states[index * 3 + 1] = lit ? 1 : 0;
    },
    readableOf: (index) => states[index * 3 + 2],
    setReadable(index, amount) {
      states[index * 3 + 2] = amount;
    },
    markChanged() {
      stateAttribute.needsUpdate = true;
    },
  };
}

const speckVertexShader = /* glsl */ `
attribute vec2 corner;
attribute vec3 wordCentre;
attribute vec3 style;
attribute vec3 state;
uniform float viewportHeight;
uniform float viewportWidth;
uniform float time;
uniform float drift;
uniform float fogNear;
uniform float fogFar;
uniform float speckPixels;
uniform float speckStrength;
varying vec2 fromCentre;
varying float opacity;

void main() {
  float phase = style.z;
  if (style.y > 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec3 centre = wordCentre + ${DRIFT};
  vec4 viewCentre = modelViewMatrix * vec4(centre, 1.0);
  float depth = max(0.001, -viewCentre.z);
  vec4 clip = projectionMatrix * viewCentre;
  float pixels = speckPixels * mix(1.5, 0.75, smoothstep(2.0, 24.0, depth));
  clip.xy += (corner - 0.5) * vec2(2.0 * pixels / viewportWidth, 2.0 * pixels / viewportHeight) * clip.w;
  gl_Position = clip;
  fromCentre = (corner - 0.5) * 2.0;
  float fog = 1.0 - smoothstep(fogNear, fogFar, depth);
  float notTooClose = smoothstep(0.45, 1.3, depth);
  opacity = speckStrength * state.x * (1.0 - state.z) * fog * notTooClose;
  if (opacity < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const speckFragmentShader = /* glsl */ `
uniform vec3 speckColour;
varying vec2 fromCentre;
varying float opacity;
void main() {
  float distanceSquared = dot(fromCentre, fromCentre);
  if (distanceSquared > 1.0) discard;
  float light = exp(-distanceSquared * 9.0);
  gl_FragColor = vec4(speckColour * light * opacity, 1.0);
}
`;

/**
 * The skills that are not words yet, each a small soft light drifting where its word will be. They are drawn from
 * the same per-word data as the words. So a speck turns into its word in place as the camera brings it near.
 */
export function buildSpeckLayer(
  layer: WordLayer,
  uniforms: WordUniforms,
  colour: THREE.Color,
) {
  const material = new THREE.ShaderMaterial({
    vertexShader: speckVertexShader,
    fragmentShader: speckFragmentShader,
    uniforms: {
      viewportHeight: uniforms.viewportHeight,
      viewportWidth: uniforms.viewportWidth,
      time: uniforms.time,
      drift: uniforms.drift,
      fogNear: uniforms.fogNear,
      fogFar: uniforms.fogFar,
      speckPixels: { value: 3.2 },
      speckStrength: { value: 0.85 },
      speckColour: { value: colour },
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(layer.mesh.geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  return mesh;
}

/** The atlas as a one-channel texture, sampled smoothly, with smaller copies for words seen far away. */
export function atlasTexture(atlas: Atlas) {
  const texture = new THREE.DataTexture(
    atlas.pixels,
    atlas.width,
    atlas.height,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  );
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/*
  The dots on the graphics chip. Every dot carries its point in four dimensions. The vertex shader turns it with the
  reader's 4x4 turn, sees it in three by perspective from the eye on the w axis, then three.js takes it to the screen.
  The same shader keeps back what the unfold has not reached, lights the slice of time in focus, dims the worlds that
  are not isolated, brightens what the reader lit and sends a lit skill's dust to its events. Each dot is a soft
  round light, added to the night.

  The ride adds its thread, drawn only where the moving point has passed, and the point itself. The rest flattens
  time and squares the shells into a cube: one share, eased, no new geometry.
*/
import * as THREE from "three";
import type { Dots } from "@/lib/hypercube/shape";
import { EYE_DISTANCE_IN_W } from "@/lib/hypercube/space";

/** The uniforms every layer of dots shares, so one write moves them all. */
export type DotUniforms = {
  turn: { value: THREE.Matrix4 };
  eye: { value: number };
  /** The unfold's front, a time: nothing older than it shows. */
  front: { value: number };
  /** 1 while the unfold runs, so the ring at the front glows as it is laid. */
  frontGlow: { value: number };
  /** The slice: the time in focus, how much the slice shows (0 for all years), and its half width in years. */
  focus: { value: number };
  sliceOn: { value: number };
  sliceHalfWidth: { value: number };
  /** How much light a dot outside the slice keeps: little at rest, more on a ride, so the whole stays in view. */
  sliceFloor: { value: number };
  /** The isolated world's index, or -1 when every world shows. */
  isolated: { value: number };
  /** How much the reader has lit something (a skill, an event), from 0 to 1: the rest steps back. */
  selecting: { value: number };
  /** How far lit skills' dust has flown to their events, from 0 to 1. */
  gather: { value: number };
  /** Device pixels for each CSS pixel, and how much every dot grows when the camera comes nearer. */
  pixelRatio: { value: number };
  sizeScale: { value: number };
  /** The camera's distance to the middle of the object, so the near side of it draws a little larger. */
  referenceDepth: { value: number };
  /** Where the far side of the object starts to fade, and where it has faded most. */
  fogNear: { value: number };
  fogFar: { value: number };
  /** Seconds since the page started, for the present's breath. */
  time: { value: number };
  /** The ride: how far along its curve the point is, how strongly its thread shows, and where the point is. */
  rideAlong: { value: number };
  rideLight: { value: number };
  rideHead: { value: THREE.Vector4 };
  /** A move between cities the ride has just crossed (its moment) and how brightly its circle still answers. */
  crossedMove: { value: number };
  crossingGlow: { value: number };
  /** The rest: how far time has flattened, how far the shells have squared into a cube, and the cube's own turn. */
  flatten: { value: number };
  cube: { value: number };
  restTurn: { value: THREE.Matrix4 };
};

export function dotUniforms(): DotUniforms {
  return {
    turn: { value: new THREE.Matrix4() },
    eye: { value: EYE_DISTANCE_IN_W },
    front: { value: 0 },
    frontGlow: { value: 0 },
    focus: { value: 0 },
    sliceOn: { value: 0 },
    sliceHalfWidth: { value: 0.5 },
    sliceFloor: { value: 0.13 },
    isolated: { value: -1 },
    selecting: { value: 0 },
    gather: { value: 0 },
    pixelRatio: { value: 1 },
    sizeScale: { value: 1 },
    referenceDepth: { value: 5 },
    fogNear: { value: 4 },
    fogFar: { value: 6 },
    time: { value: 0 },
    rideAlong: { value: 0 },
    rideLight: { value: 0 },
    rideHead: { value: new THREE.Vector4() },
    crossedMove: { value: -1 },
    crossingGlow: { value: 0 },
    flatten: { value: 0 },
    cube: { value: 0 },
    restTurn: { value: new THREE.Matrix4() },
  };
}

/** How large the cube a shell squares into is against the shell, so its corners stay inside the frame of the object. */
export const CUBE_FIT = 0.66;

/** The part every dot's vertex shader shares: from four dimensions to the screen, and how much light it keeps. */
const SEEN = /* glsl */ `
attribute vec4 place;
attribute float moment;
attribute vec3 colour;
attribute vec2 look;
attribute float world;

uniform mat4 turn;
uniform float eye;
uniform float front;
uniform float frontGlow;
uniform float focus;
uniform float sliceOn;
uniform float sliceHalfWidth;
uniform float sliceFloor;
uniform float isolated;
uniform float selecting;
uniform float pixelRatio;
uniform float sizeScale;
uniform float referenceDepth;
uniform float fogNear;
uniform float fogFar;
uniform float time;
uniform float flatten;
uniform float cube;
uniform mat4 restTurn;

varying vec3 dotColour;
varying float dotLight;

// At rest a dot leaves the turned four-dimensional picture for its own three dimensions, turned as one solid, and
// its shell squares into a cube of the same size.
vec3 restingPlace(vec4 point) {
  vec3 plain = (restTurn * vec4(point.xyz, 1.0)).xyz;
  float largest = max(abs(point.x), max(abs(point.y), abs(point.z)));
  float squared = ${CUBE_FIT.toFixed(3)} * length(point.xyz) / max(largest, 0.0001);
  return plain * mix(1.0, squared, cube);
}

// As the shells square into a cube, the outermost shell carries the light and the cube's edges catch it, so the rest
// reads as one plain cube of dots with the years nested inside it.
float cubeLight(vec4 point) {
  vec3 size = abs(point.xyz);
  float largest = max(size.x, max(size.y, size.z));
  float second = size.x + size.y + size.z - largest - min(size.x, min(size.y, size.z));
  float edge = smoothstep(0.8, 0.98, second / max(largest, 0.0001));
  float shell = smoothstep(0.55, 0.95, length(point.xyz));
  return mix(1.0, (0.25 + 1.2 * shell) * (1.0 + 2.5 * edge), cube);
}

// Sets gl_Position and returns the light the dot keeps for where it is: nearer along w and nearer the camera.
float placeDot(vec4 point, out float nearness, out float depth) {
  vec4 turned = turn * point;
  float scale = eye / (eye + turned.w);
  vec3 seen = turned.xyz * scale;
  if (flatten > 0.0) {
    seen = mix(seen, restingPlace(point), flatten);
    scale = mix(scale, 1.0, flatten);
  }
  vec4 viewPoint = modelViewMatrix * vec4(seen, 1.0);
  gl_Position = projectionMatrix * viewPoint;
  depth = max(0.05, -viewPoint.z);
  nearness = scale;
  // Nearer the eye along w is larger and brighter, as nearer in space would be.
  float throughW = pow(scale, 1.6);
  float fog = 1.0 - 0.6 * smoothstep(fogNear, fogFar, depth);
  return throughW * fog * (cube > 0.0 ? cubeLight(point) : 1.0);
}

// How much of the slice of time in focus a moment is in, from 0 to 1.
float inSliceOf(float pointMoment) {
  return 1.0 - smoothstep(sliceHalfWidth * 0.6, sliceHalfWidth * 1.4, abs(pointMoment - focus));
}

// The light a dot keeps for its moment: what the unfold has reached, with the newest ring glowing as it is laid, and
// the slice of time in focus lit while the rest falls to dim dust.
float timeLight(float pointMoment) {
  float reached = smoothstep(front - 0.03, front + 0.015, pointMoment);
  float newness = 1.0 - smoothstep(0.0, 0.4, pointMoment - front);
  float slice = mix(1.0, mix(sliceFloor, 1.45, inSliceOf(pointMoment)), sliceOn);
  return reached * (1.0 + 1.6 * newness * frontGlow) * slice;
}

// The light a dot keeps for its world: the isolated one brighter, the others stepped back.
float worldLight(float dotWorld) {
  return isolated < -0.5 ? 1.0 : (abs(dotWorld - isolated) < 0.5 ? 1.25 : 0.1);
}

// Sets gl_Position and returns the light the dot keeps, before its own strength.
float seeDot(vec4 point, float pointMoment, out float nearness, out float depth) {
  return placeDot(point, nearness, depth) * timeLight(pointMoment) * worldLight(world);
}

// How much nearer the camera than the object's middle a dot is drawn larger: gently on the far side, and like an
// out-of-focus light on the near side, where it grows and softens.
float depthGrowth(float depth) {
  float ratio = referenceDepth / depth;
  return ratio > 1.0 ? pow(ratio, 2.2) : pow(ratio, 0.6);
}

// The dot's size on the screen, and its light once spread over that size.
float sizeAndLight(float size, float nearness, float depth, inout float light) {
  float asked = size * pixelRatio * sizeScale * nearness * depthGrowth(depth);
  float pixels = clamp(asked, 1.4 * pixelRatio, 16.0 * pixelRatio);
  // A dot drawn smaller than it was asked for keeps its light by being brighter.
  light *= min(2.0, max(1.0, asked / pixels));
  // A near dot grown out of focus spreads its light, so it reads as a soft light, not a brighter blot.
  light *= pow(1.0 / max(1.0, depthGrowth(depth)), 1.3);
  return pixels;
}
`;

const dotVertexShader = /* glsl */ `
${SEEN}
#ifdef BEADS
attribute float lit;
attribute float beadStart;
#endif
#ifdef DUST
attribute vec4 target;
attribute float skillLit;
attribute vec3 litTint;
uniform float gather;
#endif
#ifdef STRUCTURE
uniform float crossedMove;
uniform float crossingGlow;
#endif
void main() {
  float nearness;
  float depth;
  vec4 point = place;
  vec3 tint = colour;
  float emphasis = 1.0;
  float grow = 1.0;
  float momentSeen = moment;
#ifdef DUST
  if (skillLit > 0.5) {
    point = mix(place, target, gather);
    tint = mix(colour, litTint, gather);
    emphasis = 1.0 + 2.5 * gather;
    grow = 1.0 + 0.6 * gather;
  } else emphasis = mix(1.0, 0.3, selecting);
#endif
#ifdef BEADS
  // A span lights in every year it ran through: the slice sees the moment of it nearest the focus.
  momentSeen = clamp(focus, beadStart, moment);
  emphasis = mix(1.0, mix(0.3, 1.9, lit), selecting);
  grow = mix(1.0, mix(0.85, 1.45, lit), selecting);
#endif
#ifdef STRUCTURE
  emphasis = mix(1.0, 0.5, selecting);
  // The faint circle of a move between cities answers as the ride crosses it.
  if (world < -0.5 && abs(moment - crossedMove) < 0.001) emphasis *= 1.0 + 3.0 * crossingGlow;
#endif
  float light = seeDot(point, momentSeen, nearness, depth) * look.x * emphasis;
  gl_PointSize = sizeAndLight(look.y * grow, nearness, depth, light);
  dotColour = tint;
  dotLight = light;
  if (light < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/**
  The ride's thread: a dot shows once the moving point has passed it. Behind the point it keeps under half its light,
  and within the year in focus all of it, so the year in focus shines and the older ones recede until the ride ends.
  It is never dimmed by a world, since it belongs to none.
*/
const threadVertexShader = /* glsl */ `
${SEEN}
attribute float along;
uniform float rideAlong;
uniform float rideLight;
void main() {
  float nearness;
  float depth;
  float light = placeDot(place, nearness, depth) * look.x * rideLight;
  float trail = mix(1.0, mix(0.4, 1.0, inSliceOf(moment)), sliceOn);
  light *= trail * (1.0 - smoothstep(rideAlong - 0.002, rideAlong + 0.002, along));
  gl_PointSize = sizeAndLight(look.y, nearness, depth, light);
  dotColour = colour;
  dotLight = light;
  if (light < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const dotFragmentShader = /* glsl */ `
varying vec3 dotColour;
varying float dotLight;
void main() {
  vec2 fromCentre = gl_PointCoord * 2.0 - 1.0;
  float distanceSquared = dot(fromCentre, fromCentre);
  if (distanceSquared > 1.0) discard;
  float shape = exp(-distanceSquared * 3.2);
  gl_FragColor = vec4(dotColour * dotLight * shape, 1.0);
}
`;

/** A bead: a white-hot core in its world's hue, larger than a dot. */
const beadFragmentShader = /* glsl */ `
varying vec3 dotColour;
varying float dotLight;
void main() {
  vec2 fromCentre = gl_PointCoord * 2.0 - 1.0;
  float distanceSquared = dot(fromCentre, fromCentre);
  if (distanceSquared > 1.0) discard;
  float halo = exp(-distanceSquared * 4.0);
  float core = exp(-distanceSquared * 26.0);
  vec3 light = dotColour * halo * 0.75 + mix(dotColour, vec3(1.0), 0.65) * core * 1.2;
  gl_FragColor = vec4(light * dotLight, 1.0);
}
`;

/** The present: the one warm light, breathing slowly. The ride's moving point is a smaller one of the same light. */
const presentVertexShader = /* glsl */ `
${SEEN}
uniform float glowPixels;
uniform float breath;
#ifdef HEAD
uniform vec4 rideHead;
uniform float rideLight;
#endif
void main() {
  float nearness;
  float depth;
#ifdef HEAD
  placeDot(rideHead, nearness, depth);
  dotLight = rideLight;
#else
  placeDot(place, nearness, depth);
  // The present is always reached and never dimmed by the slice or a world: it is now.
  dotLight = 1.0;
#endif
  gl_PointSize = glowPixels * pixelRatio * (1.0 + 0.05 * sin(time * 1.3) * breath);
  dotColour = colour;
  if (dotLight < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const presentFragmentShader = /* glsl */ `
varying vec3 dotColour;
varying float dotLight;
void main() {
  vec2 fromCentre = gl_PointCoord * 2.0 - 1.0;
  float distanceSquared = dot(fromCentre, fromCentre);
  if (distanceSquared > 1.0) discard;
  float wide = exp(-distanceSquared * 5.5) * 0.55;
  float near = exp(-distanceSquared * 28.0) * 0.9;
  float core = exp(-distanceSquared * 320.0) * 1.6;
  // Fade the last of the halo to nothing at the sprite's edge, so no rim shows.
  float edge = 1.0 - smoothstep(0.7, 1.0, distanceSquared);
  vec3 light = dotColour * (wide + near) * edge + vec3(1.0, 0.96, 0.9) * core;
  gl_FragColor = vec4(light * dotLight, 1.0);
}
`;

/** The arrays as one geometry: three needs a position to count points; the place is the real one. */
export function dotGeometry(dots: Dots) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dots.count * 3), 3));
  geometry.setAttribute("place", new THREE.BufferAttribute(dots.places, 4));
  geometry.setAttribute("moment", new THREE.BufferAttribute(dots.times, 1));
  geometry.setAttribute("colour", new THREE.BufferAttribute(dots.colours, 3));
  geometry.setAttribute("look", new THREE.BufferAttribute(dots.looks, 2));
  geometry.setAttribute("world", new THREE.BufferAttribute(dots.worlds, 1));
  return geometry;
}

function additive(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, { value: unknown }>,
  defines: Record<string, number> = {},
) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    defines,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
}

/** The orbits, the lines, the spans and the moves. */
export function structureLayer(dots: Dots, uniforms: DotUniforms) {
  const points = new THREE.Points(
    dotGeometry(dots),
    additive(dotVertexShader, dotFragmentShader, uniforms, { STRUCTURE: 1 }),
  );
  points.frustumCulled = false;
  return points;
}

/**
  sRGB shares as three's working colours, the way a THREE.Color set from a hex keeps them. A lit skill's colour was a
  THREE.Color uniform, so its specks light in exactly the colour they did.
*/
function workingColours(shares: Float32Array) {
  const converted = new Float32Array(shares.length);
  const colour = new THREE.Color();
  for (let index = 0; index < shares.length; index += 3) {
    colour.setRGB(shares[index], shares[index + 1], shares[index + 2], THREE.SRGBColorSpace);
    converted.set([colour.r, colour.g, colour.b], index);
  }
  return converted;
}

/**
  The skills' dust, with where each speck flies when its skill is lit and the colour it lights in. Any number of
  skills can be lit at once (a search lights every skill it finds): each speck says whether its skill is lit.
*/
export function dustLayer(
  dots: Dots,
  targets: Float32Array,
  skillOfSpeck: Float32Array,
  litTints: Float32Array,
  uniforms: DotUniforms,
) {
  const geometry = dotGeometry(dots);
  geometry.setAttribute("target", new THREE.BufferAttribute(targets, 4));
  geometry.setAttribute("litTint", new THREE.BufferAttribute(workingColours(litTints), 3));
  const lit = new THREE.BufferAttribute(new Float32Array(dots.count), 1);
  lit.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("skillLit", lit);
  const points = new THREE.Points(geometry, additive(dotVertexShader, dotFragmentShader, uniforms, { DUST: 1 }));
  points.frustumCulled = false;
  points.renderOrder = 1;
  let litNow = new Set<number>();
  return {
    points,
    /** Lights the specks of the skills in the set, by index, and leaves the rest unlit. */
    light(skills: Set<number>) {
      if (skills.size === litNow.size && [...skills].every((skill) => litNow.has(skill))) return;
      litNow = new Set(skills);
      for (let speck = 0; speck < dots.count; speck++) lit.array[speck] = skills.has(skillOfSpeck[speck]) ? 1 : 0;
      lit.needsUpdate = true;
    },
  };
}

/** The beads, one per event, each with how lit it is. */
export function beadLayer(dots: Dots, starts: Float32Array, uniforms: DotUniforms) {
  const geometry = dotGeometry(dots);
  geometry.setAttribute("beadStart", new THREE.BufferAttribute(starts, 1));
  const lit = new THREE.BufferAttribute(new Float32Array(dots.count), 1);
  lit.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("lit", lit);
  const points = new THREE.Points(geometry, additive(dotVertexShader, beadFragmentShader, uniforms, { BEADS: 1 }));
  points.frustumCulled = false;
  points.renderOrder = 2;
  return {
    points,
    /** Lights the beads in the set, by index, and leaves the rest unlit. */
    light(indices: Set<number>) {
      for (let index = 0; index < dots.count; index++) lit.array[index] = indices.has(index) ? 1 : 0;
      lit.needsUpdate = true;
    },
  };
}

/** The ride's thread, each dot with how far along the ride it lies. */
export function threadLayer(dots: Dots, along: Float32Array, uniforms: DotUniforms) {
  const geometry = dotGeometry(dots);
  geometry.setAttribute("along", new THREE.BufferAttribute(along, 1));
  const points = new THREE.Points(geometry, additive(threadVertexShader, dotFragmentShader, uniforms));
  points.frustumCulled = false;
  points.renderOrder = 2;
  return points;
}

/** The present's light: one large warm point. */
export function presentLayer(dots: Dots, uniforms: DotUniforms, glowPixels: number, breathes: boolean) {
  const material = additive(presentVertexShader, presentFragmentShader, {
    ...uniforms,
    glowPixels: { value: glowPixels },
    breath: { value: breathes ? 1 : 0 },
  });
  const points = new THREE.Points(dotGeometry(dots), material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  return points;
}

/** The ride's moving point: a smaller light of the present's warmth, where the uniforms put it. */
export function headLayer(dots: Dots, uniforms: DotUniforms, glowPixels: number) {
  const material = additive(
    presentVertexShader,
    presentFragmentShader,
    { ...uniforms, glowPixels: { value: glowPixels }, breath: { value: 0 } },
    { HEAD: 1 },
  );
  const points = new THREE.Points(dotGeometry(dots), material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  return points;
}

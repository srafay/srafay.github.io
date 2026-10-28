/*
  Light, not lines. A world line is drawn as a ribbon that always turns its face to the camera. It is bright in its
  middle and falls off softly to its edges, added to the dark behind it. It is a filament of light with its own glow.
  There is no post-processing pass, so the words beside it stay sharp. Its width is in scene units. A near line glows wide,
  a far one narrows to a thread, and the fog dims it into the dark.

  Beads are soft round lights of the same kind. Both keep the intro's clipping front (three's clipping chunks).
*/
import * as THREE from "three";
import type { Point } from "./layout";

const ribbonVertex = /* glsl */ `
#include <clipping_planes_pars_vertex>
attribute vec3 direction;
attribute float side;
attribute vec3 glowColour;
uniform float halfWidth;
varying float across;
varying vec3 colour;
varying float depth;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vec3 along = normalize((modelViewMatrix * vec4(direction, 0.0)).xyz);
  vec3 sideways = normalize(cross(along, -mvPosition.xyz));
  mvPosition.xyz += sideways * halfWidth * side;
  across = side;
  colour = glowColour;
  depth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}
`;

const ribbonFragment = /* glsl */ `
#include <clipping_planes_pars_fragment>
uniform float core;
uniform float halo;
uniform float sharpness;
uniform float fogNear;
uniform float fogFar;
uniform float strength;
varying float across;
varying vec3 colour;
varying float depth;
void main() {
  #include <clipping_planes_fragment>
  float distanceSquared = across * across;
  float light = core * exp(-distanceSquared * sharpness) + halo * exp(-distanceSquared * 3.2);
  float fog = 1.0 - smoothstep(fogNear, fogFar, depth);
  // A light passing the camera fades instead of filling the screen.
  float notTooClose = smoothstep(0.35, 1.9, depth);
  gl_FragColor = vec4(colour * light * fog * notTooClose * strength, 1.0);
}
`;

export type GlowUniforms = {
  fogNear: { value: number };
  fogFar: { value: number };
};

export const glowUniforms = (): GlowUniforms => ({
  fogNear: { value: 10 },
  fogFar: { value: 42 },
});

export type RibbonLook = {
  /** Half the glow's width, in scene units. */
  halfWidth: number;
  /** How bright the narrow core is, and the soft halo around it. */
  core: number;
  halo: number;
  /** How narrow the core is: higher is a finer filament. */
  sharpness: number;
};

export function ribbonMaterial(look: RibbonLook, shared: GlowUniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: ribbonVertex,
    fragmentShader: ribbonFragment,
    uniforms: {
      halfWidth: { value: look.halfWidth },
      core: { value: look.core },
      halo: { value: look.halo },
      sharpness: { value: look.sharpness },
      strength: { value: 1 },
      fogNear: shared.fogNear,
      fogFar: shared.fogFar,
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    clipping: true,
  });
}

/**
 * One ribbon through a run of points, or several runs in one geometry. Each point carries a colour, which already
 * holds its brightness (the fade at the lines' ends, a span brighter than its filament).
 */
export function ribbonGeometry(
  runs: { points: Point[]; colours: THREE.Color[] }[],
) {
  const positions: number[] = [];
  const directions: number[] = [];
  const sides: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  let vertex = 0;
  for (const run of runs) {
    const { points } = run;
    if (points.length < 2) continue;
    points.forEach((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const direction = [
        after.x - before.x,
        after.y - before.y,
        after.z - before.z,
      ];
      const colour = run.colours[index];
      for (const side of [-1, 1]) {
        positions.push(point.x, point.y, point.z);
        directions.push(direction[0], direction[1], direction[2]);
        sides.push(side);
        colours.push(colour.r, colour.g, colour.b);
      }
      if (index > 0) {
        const previous = vertex - 2;
        indices.push(
          previous,
          previous + 1,
          vertex,
          previous + 1,
          vertex + 1,
          vertex,
        );
      }
      vertex += 2;
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "direction",
    new THREE.Float32BufferAttribute(directions, 3),
  );
  geometry.setAttribute("side", new THREE.Float32BufferAttribute(sides, 1));
  geometry.setAttribute(
    "glowColour",
    new THREE.Float32BufferAttribute(colours, 3),
  );
  geometry.setIndex(indices);
  return geometry;
}

export function ribbon(
  runs: { points: Point[]; colours: THREE.Color[] }[],
  look: RibbonLook,
  shared: GlowUniforms,
) {
  const mesh = new THREE.Mesh(
    ribbonGeometry(runs),
    ribbonMaterial(look, shared),
  );
  mesh.frustumCulled = false;
  return mesh;
}

const pointVertex = /* glsl */ `
#include <clipping_planes_pars_vertex>
attribute float size;
attribute vec3 glowColour;
uniform float pixelsPerUnitAtOne;
uniform float time;
uniform float pulse;
varying vec3 colour;
varying float depth;
varying float gain;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  depth = -mvPosition.z;
  colour = glowColour;
  gl_PointSize = max(2.0, size * pixelsPerUnitAtOne / max(depth, 0.05));
  // The beads near the camera breathe a little, each on its own beat, so they look like things to touch.
  float nearness = 1.0 - smoothstep(3.0, 10.0, depth);
  gain = 1.0 + pulse * nearness * 0.5 * (0.5 + 0.5 * sin(time * 2.2 + float(gl_VertexID) * 1.7));
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}
`;

const pointFragment = /* glsl */ `
#include <clipping_planes_pars_fragment>
uniform float fogNear;
uniform float fogFar;
varying vec3 colour;
varying float depth;
varying float gain;
void main() {
  #include <clipping_planes_fragment>
  vec2 fromCentre = gl_PointCoord * 2.0 - 1.0;
  float distanceSquared = dot(fromCentre, fromCentre);
  if (distanceSquared > 1.0) discard;
  float light = (exp(-distanceSquared * 28.0) * 1.2 + exp(-distanceSquared * 5.0) * 0.35) * gain;
  float fog = 1.0 - smoothstep(fogNear, fogFar, depth);
  float notTooClose = smoothstep(0.3, 1.4, depth);
  gl_FragColor = vec4(colour * light * fog * notTooClose, 1.0);
}
`;

export type GlowPoints = {
  points: THREE.Points;
  /** Sets a point's colour, its brightness included. */
  setColour(index: number, colour: THREE.Color): void;
  /** The scale from a point's size in scene units to pixels at depth 1; set on every resize. */
  setPixelsPerUnitAtOne(value: number): void;
  /** The time in seconds, and whether the near beads breathe (never under reduced motion). */
  setTime(seconds: number, breathing: boolean): void;
};

/** Soft round lights, each `size` scene units across its glow (halo included). */
export function glowPoints(
  places: Point[],
  sizes: number[],
  colours: THREE.Color[],
  shared: GlowUniforms,
): GlowPoints {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      places.flatMap((place) => [place.x, place.y, place.z]),
      3,
    ),
  );
  geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
  const colourAttribute = new THREE.Float32BufferAttribute(
    colours.flatMap((colour) => [colour.r, colour.g, colour.b]),
    3,
  );
  geometry.setAttribute("glowColour", colourAttribute);
  const uniforms = {
    pixelsPerUnitAtOne: { value: 800 },
    time: { value: 0 },
    pulse: { value: 0 },
    fogNear: shared.fogNear,
    fogFar: shared.fogFar,
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    uniforms,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    clipping: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    setColour(index, colour) {
      colourAttribute.setXYZ(index, colour.r, colour.g, colour.b);
      colourAttribute.needsUpdate = true;
    },
    setTime(seconds, breathing) {
      uniforms.time.value = seconds;
      uniforms.pulse.value = breathing ? 1 : 0;
    },
    setPixelsPerUnitAtOne(value) {
      uniforms.pixelsPerUnitAtOne.value = value;
    },
  };
}

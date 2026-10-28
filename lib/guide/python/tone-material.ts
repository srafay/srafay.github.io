/*
  The first pass draws the python in grey: how light each part is, from 0 to 1, in the red channel. The second pass
  (dither.ts) turns that grey into the two colours of the field. Light comes from the upper left and a little in front,
  as a lamp over a desk would; the back of a turned coil falls dark.
*/
import * as THREE from "three";

export type ToneOptions = {
  /** How light the surface is before light falls on it, from 0 to 1. */
  baseTone: number;
  /** Whether it wears a python's blotches (the body). */
  blotched?: boolean;
  /** Whether it wears a python's dark crown over pale lips (the skull, in its own units). */
  crowned?: boolean;
  /** How much the light matters: 0 is flat, 1 is fully lit. */
  shading?: number;
  /** How much of it is there, from 0 to 1: the dither keeps only this share of its cells (a shed skin fading). */
  presence?: number;
};

const vertexShader = /* glsl */ `
  attribute vec2 skin;
  varying vec3 surfaceNormal;
  varying vec2 skinPlace;
  varying vec3 ownPlace;
  void main() {
    surfaceNormal = normalize(normalMatrix * normal);
    skinPlace = skin;
    ownPlace = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/*
  A python's back: darker than its flanks, crossed by dark saddles at a steady rhythm, offset on each flank, over a
  narrow pale strip of belly. A python reads by its back, so the back wins. The skin coordinates are the share along
  the body (x) and the turn around it from the back (y, 0 to 1).
*/
const fragmentShader = /* glsl */ `
  uniform float baseTone;
  uniform float blotched;
  uniform float shading;
  uniform float crowned;
  uniform float presence;
  varying vec3 surfaceNormal;
  varying vec2 skinPlace;
  varying vec3 ownPlace;
  const vec3 LIGHT = normalize(vec3(-0.55, 0.75, 0.55));
  void main() {
    vec3 normal = normalize(surfaceNormal);
    float light = max(dot(normal, LIGHT), 0.0);
    float tone = baseTone * mix(1.0, 0.25 + 0.95 * light, shading);
    if (blotched > 0.5) {
      float around = abs(skinPlace.y - 0.5) * 2.0; // 1 on the back, 0 on the belly
      float side = skinPlace.y < 0.5 ? 0.0 : 0.5;
      float saddle = sin((skinPlace.x * 23.0 + side * step(around, 0.62)) * 6.2831853);
      float onBack = smoothstep(0.25, 0.45, around);
      float blotch = step(-0.05, saddle) * onBack;
      tone *= mix(1.0, 0.78, smoothstep(0.3, 0.8, around));
      tone *= mix(1.0, 0.3, blotch);
      tone = mix(tone, max(tone, 0.86), smoothstep(0.17, 0.05, around));
    }
    if (crowned > 0.5) tone *= mix(1.0, 0.36, smoothstep(0.42, 0.58, ownPlace.y + 0.12 * ownPlace.z));
    gl_FragColor = vec4(clamp(tone, 0.0, 1.0), presence, 0.0, 1.0);
  }
`;

export function toneMaterial(options: ToneOptions) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      baseTone: { value: options.baseTone },
      blotched: { value: options.blotched ? 1 : 0 },
      shading: { value: options.shading ?? 1 },
      crowned: { value: options.crowned ? 1 : 0 },
      presence: { value: options.presence ?? 1 },
    },
  });
}

/** A geometry with no skin of its own still needs the attribute the shader reads. */
export function withPlainSkin(geometry: THREE.BufferGeometry) {
  const count = geometry.getAttribute("position").count;
  geometry.setAttribute("skin", new THREE.BufferAttribute(new Float32Array(count * 2).fill(0.5), 2));
  return geometry;
}

/*
  The first pass draws the agent in grey: how light each part is, from 0 to 1, in the red channel; how much of it is
  there, in the green (a faint copy keeps only that share of its cells); and whether it is lit, in the blue (a lit node
  is one flat colour, with no dither). The second pass (dither.ts) turns that into the two colours of the field. Light
  comes from the upper left and a little in front, as a lamp over a desk would.
*/
import * as THREE from "three";

export type ToneOptions = {
  /** How light the surface is before light falls on it, from 0 to 1. */
  baseTone: number;
  /** How much the light matters: 0 is flat, 1 is fully lit. */
  shading?: number;
  /** How much of it is there, from 0 to 1: the dither keeps only this share of its cells. */
  presence?: number;
};

const vertexShader = /* glsl */ `
  varying vec3 surfaceNormal;
  void main() {
    surfaceNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float baseTone;
  uniform float shading;
  uniform float presence;
  uniform float lit;
  varying vec3 surfaceNormal;
  const vec3 LIGHT = normalize(vec3(-0.55, 0.75, 0.55));
  void main() {
    vec3 normal = normalize(surfaceNormal);
    float light = max(dot(normal, LIGHT), 0.0);
    float tone = baseTone * mix(1.0, 0.22 + 0.95 * light, shading);
    gl_FragColor = vec4(clamp(tone, 0.0, 1.0), presence, lit, 1.0);
  }
`;

export type ToneMaterial = THREE.ShaderMaterial;

export function toneMaterial(options: ToneOptions): ToneMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      baseTone: { value: options.baseTone },
      shading: { value: options.shading ?? 1 },
      presence: { value: options.presence ?? 1 },
      lit: { value: 0 },
    },
  });
}

/** Lights a material (one flat colour) or puts it back. */
export const setLit = (material: ToneMaterial, lit: boolean) => {
  material.uniforms.lit.value = lit ? 1 : 0;
};

/** How much of a material is there, for a faint copy. */
export const setPresence = (material: ToneMaterial, presence: number) => {
  material.uniforms.presence.value = presence;
};

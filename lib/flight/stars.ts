/*
  The stars: a few thousand points far out around the planet, drawn on the same canvas. Most are faint and a few are
  bright, as the sky's are, with a slight spread of colour from blue-white to warm. They are placed from a fixed seed,
  so every visit sees the same sky.
*/
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
} from "three";
import { STARS_FRAGMENT, STARS_VERTEX } from "./shaders";

const STAR_COUNT = 2600;
const SKY_RADIUS = 80;
const SEED = 20140101;

/** A small repeatable random number source (mulberry32). */
function randomNumbers(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A star's light: most faint, a few bright, the way magnitudes fall off. */
const starBrightness = (random: () => number) =>
  0.05 + 0.95 * Math.pow(random(), 6);

/** A colour between blue-white and warm white. */
function starTint(random: () => number) {
  const warmth = random();
  return [0.82 + 0.18 * warmth, 0.86 + 0.08 * warmth, 1 - 0.22 * warmth];
}

export function makeStars() {
  const random = randomNumbers(SEED);
  const places = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const brightnesses = new Float32Array(STAR_COUNT);
  const tints = new Float32Array(STAR_COUNT * 3);
  for (let star = 0; star < STAR_COUNT; star++) {
    const height = random() * 2 - 1;
    const around = random() * Math.PI * 2;
    const across = Math.sqrt(1 - height * height);
    places.set(
      [
        across * Math.cos(around) * SKY_RADIUS,
        height * SKY_RADIUS,
        across * Math.sin(around) * SKY_RADIUS,
      ],
      star * 3,
    );
    const brightness = starBrightness(random);
    brightnesses[star] = brightness;
    sizes[star] = 1.6 + 2.2 * brightness;
    tints.set(starTint(random), star * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(places, 3));
  geometry.setAttribute("size", new BufferAttribute(sizes, 1));
  geometry.setAttribute("brightness", new BufferAttribute(brightnesses, 1));
  geometry.setAttribute("tint", new BufferAttribute(tints, 3));
  const material = new ShaderMaterial({
    vertexShader: STARS_VERTEX,
    fragmentShader: STARS_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    uniforms: {
      pixelRatio: { value: 1 },
      starBrightness: { value: 1 },
    },
  });
  const stars = new Points(geometry, material);
  stars.renderOrder = 1;
  stars.frustumCulled = false;
  return {
    stars,
    setPixelRatio(pixelRatio: number) {
      material.uniforms.pixelRatio.value = pixelRatio;
    },
    setBrightness(brightness: number) {
      material.uniforms.starBrightness.value = brightness;
    },
  };
}

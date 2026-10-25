/*
  The planet and its atmosphere: a finely divided sphere (its edge stays round at the size of the first screen) drawn
  by the globe shader, and a slightly larger shell, seen from inside, on which the glow beyond the edge is worked out.
*/
import {
  AdditiveBlending,
  BackSide,
  Color,
  DataTexture,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Texture,
} from "three";
import type { Grade } from "./grades";
import {
  GLOBE_FRAGMENT,
  GLOBE_VERTEX,
  SHELL_FRAGMENT,
  SHELL_VERTEX,
} from "./shaders";

/** The shell reaches far enough out for the glow to have faded to nothing. */
const SHELL_RADIUS = 1.09;
/** The planet before its maps arrive: the dark navy of the night map's own sea. */
const BARE_PLANET = new Color("#070a16");
/** Air with the sun just under the horizon. */
const DAWN = new Color("#ff9a5c");

/** A one-pixel stand-in for a map not yet loaded, so the shader always has something to read. */
function placeholderMap() {
  const texture = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

export function makePlanet() {
  const globeMaterial = new ShaderMaterial({
    vertexShader: GLOBE_VERTEX,
    fragmentShader: GLOBE_FRAGMENT,
    uniforms: {
      nightMap: { value: placeholderMap() },
      surfaceMap: { value: placeholderMap() },
      nightShown: { value: 0 },
      surfaceShown: { value: 0 },
      lightsReveal: { value: 0 },
      sunDirection: { value: new Vector3(0, 0, -1) },
      hazeColour: { value: new Color() },
      hazeDensity: { value: 0 },
      rimColour: { value: new Color() },
      rimStrength: { value: 1 },
      lightsGain: { value: 1 },
      landGain: { value: 1 },
      landTint: { value: new Color() },
      bareColour: { value: BARE_PLANET },
    },
  });
  const globe = new Mesh(new SphereGeometry(1, 256, 128), globeMaterial);

  const shellMaterial = new ShaderMaterial({
    vertexShader: SHELL_VERTEX,
    fragmentShader: SHELL_FRAGMENT,
    side: BackSide,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    uniforms: {
      sunDirection: { value: new Vector3(0, 0, -1) },
      rimColour: { value: new Color() },
      rimStrength: { value: 1 },
      airglowColour: { value: new Color() },
      airglowStrength: { value: 1 },
      dawnColour: { value: DAWN },
      shown: { value: 1 },
    },
  });
  const shell = new Mesh(
    new SphereGeometry(SHELL_RADIUS, 192, 96),
    shellMaterial,
  );
  shell.renderOrder = 3;

  return {
    globe,
    shell,
    showNightMap(texture: Texture) {
      globeMaterial.uniforms.nightMap.value = texture;
    },
    showSurfaceMap(texture: Texture) {
      globeMaterial.uniforms.surfaceMap.value = texture;
    },
    /** How far each map has faded in, and how far the intro's sweep of lights has come. */
    setReveal(night: number, surface: number, lights: number) {
      globeMaterial.uniforms.nightShown.value = night;
      globeMaterial.uniforms.surfaceShown.value = surface;
      globeMaterial.uniforms.lightsReveal.value = lights;
    },
    setLight(sun: Vector3, grade: Grade) {
      const globeUniforms = globeMaterial.uniforms;
      globeUniforms.sunDirection.value.copy(sun);
      globeUniforms.hazeColour.value.copy(grade.haze);
      globeUniforms.hazeDensity.value = grade.hazeDensity;
      globeUniforms.rimColour.value.copy(grade.rim);
      globeUniforms.rimStrength.value = grade.rimStrength;
      globeUniforms.lightsGain.value = grade.lightsGain;
      globeUniforms.landGain.value = grade.landGain;
      globeUniforms.landTint.value.copy(grade.landTint);
      const shellUniforms = shellMaterial.uniforms;
      shellUniforms.sunDirection.value.copy(sun);
      shellUniforms.rimColour.value.copy(grade.rim);
      shellUniforms.rimStrength.value = grade.rimStrength;
      shellUniforms.airglowColour.value.copy(grade.airglow);
      shellUniforms.airglowStrength.value = grade.airglowStrength;
    },
  };
}

export type Planet = ReturnType<typeof makePlanet>;

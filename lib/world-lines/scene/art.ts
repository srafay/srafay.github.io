/*
  The Blender art over and under the live scene (lib/world-lines/art/manifest.ts says what each piece is true for).

  The still is the first screen path-traced, laid over the scene while it loads. It stays while the intro's light runs
  back along the lines, then fades. By then the live lines stand exactly where the still has them, so nothing jumps.

  The haze is only the light the haze scatters around the lines. It lies under the scene and the scene is added to
  it, so the live lines sit in real scattered light. It shows at the first screen's pose only, the pose it was
  rendered from. It fades as soon as the camera leaves that pose: a travel, a turn, a zoom or an isolated world. On a computer it moves with the
  pointer's lean, so it stays with the lines.

  Either picture shows only where a plate matches the screen's shape. A plate that fails to load leaves the page as
  it was without it.
*/
import * as THREE from "three";
import type { WorldLinesScene } from "./mount";

/** The haze's opacity is written only when it changes by more than this, and is gone below it. */
const OPACITY_STEP = 0.01;
/** How long the still takes to fade, as the stylesheet has it, after which it is hidden. */
const STILL_FADE_MILLISECONDS = 700;
/**
  The rendered present glow's size in the scene. Its light spreads further than the drawn one's, so it is drawn
  smaller to keep the same core. At the first screen the haze adds the rest.
*/
const PRESENT_SPRITE_SCALE = 1.15;

/** The picture of a plate, if its screen shape matched and it loaded. */
function shownPlate(picture: HTMLElement | null) {
  const image = picture?.querySelector("img");
  return image && image.currentSrc && image.complete && image.naturalWidth > 0 ? image : null;
}

/** A plate that fails to load takes itself away, so the page is as it was without it, even if it failed already. */
function dropOnFailure(picture: HTMLElement | null) {
  const image = picture?.querySelector("img");
  if (!picture || !image) return;
  if (image.currentSrc && image.complete && image.naturalWidth === 0) return picture.remove();
  image.addEventListener("error", () => picture.remove());
}

/**
  Fades the still once the intro's light has reached 2014, or at once under reduced motion, where the scene starts as
  it ends.
*/
function fadeTheStill(scene: WorldLinesScene, lightHasRun: () => boolean) {
  const still = scene.elements.stage.querySelector<HTMLElement>("[data-lines-still]");
  if (!still) return;
  dropOnFailure(still);
  // Once faded it leaves the page, so the browser no longer keeps a screen-sized picture under the scene.
  const fade = () => {
    still.setAttribute("data-lines-gone", "");
    window.setTimeout(() => (still.hidden = true), STILL_FADE_MILLISECONDS);
  };
  if (scene.reducedMotion) return fade();
  let faded = false;
  scene.onFrame(() => {
    if (faded || !lightHasRun()) return;
    faded = true;
    fade();
  });
}

/** Follows the camera with the haze: shown at the first screen's pose, moved with the lean, gone everywhere else. */
function followWithTheHaze(scene: WorldLinesScene) {
  const haze = scene.elements.stage.querySelector<HTMLElement>("[data-lines-haze]");
  if (!haze) return;
  dropOnFailure(haze);
  const stage = scene.elements.stage;
  let shownOpacity = 0;
  scene.onFrame(() => {
    const opacity = shownPlate(haze) ? scene.restPoseShare() : 0;
    if (Math.abs(opacity - shownOpacity) < OPACITY_STEP && !(opacity < OPACITY_STEP && shownOpacity > 0)) return;
    shownOpacity = opacity < OPACITY_STEP ? 0 : opacity;
    haze.style.opacity = shownOpacity.toFixed(3);
    // The canvas is added to the haze only while the haze shows, so the blend costs nothing elsewhere.
    stage.toggleAttribute("data-lines-haze-shown", shownOpacity > 0);
  });
  scene.onFrame(() => {
    if (shownOpacity === 0) return;
    const lean = scene.leanPixels();
    haze.style.translate = `${lean.x.toFixed(1)}px ${lean.y.toFixed(1)}px`;
  });
}

/**
  The present's glow from the rendered sprite in place of the drawn one. It is tinted the present's own warm colour,
  so it stays the one warm light. Until the sprite arrives, or if it never does, the drawn glow stays.
*/
function swapInThePresentSprite(scene: WorldLinesScene) {
  const address = scene.elements.stage.dataset.linesPresentGlow;
  const light = scene.presentLight;
  if (!address || !light) return;
  new THREE.TextureLoader().load(address, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = light.material;
    material.map?.dispose();
    material.map = texture;
    material.needsUpdate = true;
    light.scale.setScalar(PRESENT_SPRITE_SCALE);
    scene.requestFrame();
  });
}

export function addArt(scene: WorldLinesScene, lightHasRun: () => boolean) {
  fadeTheStill(scene, lightHasRun);
  followWithTheHaze(scene);
  swapInThePresentSprite(scene);
}

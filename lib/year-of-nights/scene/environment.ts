/*
  What the scene asks of the device it runs on. Each answer is one function, so a change to how a phone is treated is
  a change here only.
*/

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A finger, not a mouse: the sky is read with taps, and it has no pointer to follow. */
export const isTouchScreen = () =>
  matchMedia("(hover: none) and (pointer: coarse)").matches;

/** Phones draw at most 1.5 canvas pixels per screen pixel. Computers draw at most 2. */
export function canvasPixelRatio() {
  const highest = isTouchScreen() ? 1.5 : 2;
  return Math.min(window.devicePixelRatio || 1, highest);
}

/**
 * How often the sky redraws while nothing moves it but its own slow drift. Phones take half the frames: the drift is
 * slow enough that 30 a second look the same.
 */
export const driftFramesPerSecond = () => (isTouchScreen() ? 30 : 60);

/** A short tick under the finger when a star is touched, where the phone has one. */
export function tickUnderFinger() {
  if (isTouchScreen() && "vibrate" in navigator) navigator.vibrate(6);
}

/** Portrait screens put the stars above the words. Wider ones put them beside. */
export const isPortrait = (width: number, height: number) =>
  width / height < 0.9;

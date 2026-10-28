/*
  How the python is shaped, as shares of its length, so a phone's python and a computer's are the same animal at two
  sizes. A python is thick-bodied with a narrow neck and a distinct head; these follow a ball python's build, drawn
  stockier, with a head half as big again, so the eye, its glint and the pale lip read at phone size in 1-bit cells.
*/

/** How long the python is on screen, in CSS pixels: about the width of a phone, and more on a computer. */
export function bodyLengthFor(viewportWidth: number) {
  if (viewportWidth < 700) return Math.min(440, Math.max(330, viewportWidth));
  return Math.min(780, Math.max(560, viewportWidth * 0.5));
}

/** The body's radius at a share of its length from the tail (0) to the neck (1), as a share of the length. */
export function radiusShareAt(share: number) {
  // A tail that tapers sharply to a point, the thickest part near half way, then a neck narrowing to a little over
  // half, so the head stands out from it as a python's does.
  const tail = Math.min(1, share / 0.5);
  const neck = share < 0.7 ? 1 : 1 - Math.pow((share - 0.7) / 0.3, 1.3) * 0.42;
  const swell = Math.sin((tail * Math.PI) / 2);
  return Math.max(0.003, 0.053 * Math.pow(swell, 1.7) * neck);
}

export const head = {
  /** From the back of the skull to the snout. */
  lengthShare: 0.225,
  widthShare: 0.165,
  heightShare: 0.12,
  /** The eyes: their radius, and where they sit in the skull's own units (1 is half its size on each axis). */
  eyeRadiusShare: 0.0215,
  eyeAcross: 0.62,
  eyeForward: 0.42,
  eyeUp: 0.3,
  /** The tongue, out at full flick. */
  tongueLengthShare: 0.09,
  tongueWidthShare: 0.011,
};

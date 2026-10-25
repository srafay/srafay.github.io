/* Small number helpers the flight shares: limits, blends and the easing of a camera move. */

export const clamp = (value: number, lowest: number, highest: number) =>
  Math.min(highest, Math.max(lowest, value));

export const mix = (from: number, to: number, fraction: number) =>
  from + (to - from) * fraction;

export function smoothstep(edgeFrom: number, edgeTo: number, value: number) {
  const fraction = clamp((value - edgeFrom) / (edgeTo - edgeFrom), 0, 1);
  return fraction * fraction * (3 - 2 * fraction);
}

/** A camera move that sets off gently, travels and settles gently: no jolt at either end. */
export function easeInOut(fraction: number) {
  const clamped = clamp(fraction, 0, 1);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/** Blends two angles in radians the short way round. */
export function mixAngle(from: number, to: number, fraction: number) {
  const fullTurn = Math.PI * 2;
  const difference =
    ((((to - from) % fullTurn) + fullTurn * 1.5) % fullTurn) - Math.PI;
  return from + difference * fraction;
}

/** Blends two distances on a log scale, so a zoom from far to near feels even all the way. */
export const mixDistance = (from: number, to: number, fraction: number) =>
  Math.exp(mix(Math.log(from), Math.log(to), fraction));

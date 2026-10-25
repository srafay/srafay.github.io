/* Small numeric helpers the scene's motion is built from. */

export const clamp = (value: number, lowest = 0, highest = 1) =>
  Math.min(highest, Math.max(lowest, value));

export const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

/** 0 below the edge's start, 1 above its end, an S-curve between. */
export function smoothstep(start: number, end: number, value: number) {
  const amount = clamp((value - start) / (end - start));
  return amount * amount * (3 - 2 * amount);
}

export const easeOutCubic = (amount: number) => 1 - (1 - amount) ** 3;
export const easeInCubic = (amount: number) => amount ** 3;
export const easeInOutCubic = (amount: number) =>
  amount < 0.5 ? 4 * amount ** 3 : 1 - (-2 * amount + 2) ** 3 / 2;
export const easeOutExpo = (amount: number) =>
  amount >= 1 ? 1 : 1 - 2 ** (-10 * amount);

/**
 * A value that holds at each whole step and moves between them in the middle part of the way, so a scene rests on
 * each of its parts for a while as the reader scrolls through it.
 */
export function heldSteps(position: number, stepCount: number) {
  if (stepCount <= 1) return 0;
  const scaled = clamp(position) * (stepCount - 1);
  const step = Math.min(Math.floor(scaled), stepCount - 2);
  return step + smoothstep(0.3, 0.7, scaled - step);
}

/**
 * Brings a value toward its target by the share a steady spring would cover in this much time, the same at any frame
 * rate. A shorter time constant follows more tightly.
 */
export function follow(
  current: number,
  target: number,
  elapsedSeconds: number,
  timeConstantSeconds: number,
) {
  return mix(
    current,
    target,
    1 - Math.exp(-elapsedSeconds / timeConstantSeconds),
  );
}

/**
 * 2653 as "2,653", the way the page's HTML writes counts. Done by hand: the browser's own number format costs a
 * phone a long first call, which landed in the middle of a flight.
 */
export const withThousands = (count: number) =>
  String(Math.round(count)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

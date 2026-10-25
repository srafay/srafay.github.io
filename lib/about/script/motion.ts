/** A reader who asked their device for less motion gets every answer in its arrived state. */
export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

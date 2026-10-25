/*
  How far down the page the reader is, as a place in the flight. The flight's position is a number from 0 to the
  last stop: a whole number is a stop the camera holds at (0 is the planet with the name, 1 Karachi, 2 Darwin,
  3 Sydney, 4 the whole planet again), and a fraction is part of the way between two stops.

  Distances are in screens: one screen is the stage's own height (100svh), so a toolbar sliding in or out on a phone
  never changes the timeline. The page's track is as tall as this list plus the screen the stage itself fills.
*/
export type Segment =
  { kind: "hold"; screens: number } | { kind: "flight"; screens: number };

/** Holds long enough to read two or three lines; flights one full screen of scrolling each. */
export const SEGMENTS: Segment[] = [
  { kind: "hold", screens: 0.35 },
  { kind: "flight", screens: 1 },
  { kind: "hold", screens: 1.1 },
  { kind: "flight", screens: 1 },
  { kind: "hold", screens: 1.1 },
  { kind: "flight", screens: 1 },
  { kind: "hold", screens: 1.1 },
  { kind: "flight", screens: 1 },
  { kind: "hold", screens: 0.8 },
];

export const LAST_STOP = SEGMENTS.filter(
  (segment) => segment.kind === "flight",
).length;

const scrollableScreens = () =>
  SEGMENTS.reduce((total, segment) => total + segment.screens, 0);

/** The track's height in screens: everything the reader scrolls through, plus the stage's own screen. */
export const trackScreens = () => scrollableScreens() + 1;

/** The flight's position after scrolling this many screens into the track. */
export function positionAfter(screens: number) {
  let remaining = Math.max(0, screens);
  let stop = 0;
  for (const segment of SEGMENTS) {
    if (segment.kind === "hold") {
      if (remaining <= segment.screens) return stop;
      remaining -= segment.screens;
      continue;
    }
    if (remaining <= segment.screens) return stop + remaining / segment.screens;
    remaining -= segment.screens;
    stop += 1;
  }
  return LAST_STOP;
}

/**
 * How many screens into the track a position is. A whole stop answers a little way into its hold, so the camera has
 * arrived and the stop's words show.
 */
export function screensBefore(position: number) {
  const stop = Math.floor(position);
  const fraction = position - stop;
  let screens = 0;
  let stopsPassed = 0;
  for (const segment of SEGMENTS) {
    if (segment.kind === "hold") {
      if (stopsPassed === stop && fraction === 0)
        return screens + Math.min(0.1, segment.screens / 2);
      screens += segment.screens;
      continue;
    }
    if (stopsPassed === stop) return screens + fraction * segment.screens;
    screens += segment.screens;
    stopsPassed += 1;
  }
  return screens;
}

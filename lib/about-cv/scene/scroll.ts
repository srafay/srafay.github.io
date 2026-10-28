/*
  The reader's place along the travel. The page has no scroll of its own: the stage is the whole page, and the place
  is held here. The wheel or a trackpad, a vertical swipe, the arrow keys, the year rail and the flights to a point all
  move it. A swipe carries on after the finger lifts and slows the way a scrolled page does. A full travel takes as
  much wheel or finger as the long page it replaces took to scroll. So the pace is the one the passed version had.
*/
export type ScrollReader = {
  /** How far through the travel the reader is, from 0 to 1. */
  progress(): number;
  /** Goes to that place at once. The scene's own spring glides the camera there. */
  scrollToProgress(progress: number): void;
  /** Moves by a distance in pixels, as a wheel or a finger does: a positive distance goes back in time. */
  moveBy(pixels: number): void;
  /** A finger has let go at this speed, in pixels a second: the place carries on and slows. */
  release(pixelsPerSecond: number): void;
  /** Stops any carrying on, as a finger landing on a scrolling page does. */
  stop(): void;
  /** Carries the place on by a frame's time. Says whether it is still moving. */
  step(seconds: number): boolean;
  /** Measures the stage again, after a resize. */
  measure(): void;
  onScroll(listener: () => void): void;
  offScroll(listener: () => void): void;
};

/** How fast a swipe's carrying on dies away: the time for its speed to fall to about a third, as a page's does. */
const INERTIA_TIME_CONSTANT = 0.325;
/** Below this speed, in shares of the travel a second, the carrying on stops. */
const SLOWEST_CARRY = 0.0004;

export function createScrollReader(
  stage: HTMLElement,
  travelScreens: number,
  withInertia: boolean,
): ScrollReader {
  let listeners: (() => void)[] = [];
  let place = 0;
  /** In shares of the travel a second. */
  let carry = 0;
  let travelLength = 1;

  const measure = () => {
    travelLength = Math.max(1, (travelScreens - 1) * stage.clientHeight);
  };

  const goTo = (progress: number) => {
    const next = Math.min(1, Math.max(0, progress));
    if (next === place) return false;
    place = next;
    for (const listener of listeners) listener();
    return true;
  };

  measure();

  return {
    progress: () => place,
    scrollToProgress(progress) {
      carry = 0;
      goTo(progress);
    },
    moveBy(pixels) {
      carry = 0;
      goTo(place + pixels / travelLength);
    },
    release(pixelsPerSecond) {
      carry = withInertia ? pixelsPerSecond / travelLength : 0;
    },
    stop() {
      carry = 0;
    },
    step(seconds) {
      if (Math.abs(carry) < SLOWEST_CARRY) {
        carry = 0;
        return false;
      }
      // At either end the carrying on stops, as a page stops at its top and its foot.
      if (!goTo(place + carry * seconds)) carry = 0;
      carry *= Math.exp(-seconds / INERTIA_TIME_CONSTANT);
      return carry !== 0;
    },
    measure,
    onScroll: (listener) => listeners.push(listener),
    offScroll(listener) {
      listeners = listeners.filter((candidate) => candidate !== listener);
    },
  };
}

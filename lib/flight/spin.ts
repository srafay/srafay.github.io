/*
  A drag across the stage spins the view: from far off it turns the planet under the finger, close to a city it walks
  the camera round the city. On a touch screen only a sideways drag is taken (the stage is pan-y), so a swipe up or
  down still scrolls the page. Let go mid-drag and the spin carries on and slows; scrolling on to the next place
  eases it back to nothing, so every stop is arrived at exactly.
*/
const INERTIA_FADE_MILLISECONDS = 420;
const SMALLEST_SPEED = 0.0004;
/** Scrolling one screen undoes this much of a spin, so a spin has melted away by the time a flight lands. */
const SETTLE_PER_SCREEN = 5;

export class Spin {
  /** How far the reader has spun, in pixels of drag. The scene turns these into degrees for the view it shows. */
  pixels = 0;
  private speed = 0;
  private dragging: {
    pointer: number;
    lastX: number;
    lastTime: number;
  } | null = null;

  constructor(
    surface: HTMLElement,
    private readonly onSpin: () => void,
  ) {
    surface.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      this.dragging = {
        pointer: event.pointerId,
        lastX: event.clientX,
        lastTime: event.timeStamp,
      };
      this.speed = 0;
    });
    surface.addEventListener("pointermove", (event) => {
      const drag = this.dragging;
      if (!drag || drag.pointer !== event.pointerId) return;
      const moved = event.clientX - drag.lastX;
      const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
      this.pixels += moved;
      this.speed = moved / elapsed;
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
      this.onSpin();
    });
    const release = (event: PointerEvent) => {
      if (this.dragging?.pointer !== event.pointerId) return;
      this.dragging = null;
      // A browser that took the gesture for a scroll cancels it: that is no throw.
      if (event.type === "pointercancel") this.speed = 0;
      this.onSpin();
    };
    surface.addEventListener("pointerup", release);
    surface.addEventListener("pointercancel", release);
  }

  get isDragging() {
    return this.dragging !== null;
  }

  /** Carries a released spin on for a frame. Returns whether it is still moving. */
  coast(elapsedMilliseconds: number) {
    if (this.dragging || Math.abs(this.speed) < SMALLEST_SPEED) {
      if (!this.dragging) this.speed = 0;
      return false;
    }
    this.pixels += this.speed * elapsedMilliseconds;
    this.speed *= Math.exp(-elapsedMilliseconds / INERTIA_FADE_MILLISECONDS);
    return true;
  }

  /** Eases the spin away as the reader scrolls. */
  settle(scrolledScreens: number) {
    if (this.dragging) return;
    this.pixels *= Math.exp(-Math.abs(scrolledScreens) * SETTLE_PER_SCREEN);
    if (Math.abs(this.pixels) < 0.05) this.pixels = 0;
    if (scrolledScreens !== 0) this.speed = 0;
  }
}

/*
  What a bubble must never cover: the name, the bio and every control. Measured when sizes change, never per frame.
  Things that scroll with the page are kept in page coordinates, the bars in screen coordinates (the bottom bar from
  the screen's bottom edge, since a phone's toolbar moves it), so each frame needs only the scroll and the height.
*/

/** A rectangle on the screen, in CSS pixels, y down from the top. */
export type Box = { left: number; top: number; right: number; bottom: number };

export const overlapArea = (first: Box, second: Box) =>
  Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) *
  Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));

/** A little air kept round everything a bubble avoids. */
const AIR = 8;

/**
 * Whether something is seen now: not hidden (the bars while the tour plays), and not a line, card or name still
 * waiting its turn unseen. What is not seen is not kept clear.
 */
const seenNow = (element: HTMLElement) =>
  getComputedStyle(element).visibility !== "hidden" && !element.closest("[data-waiting], [data-awaiting-fetch], [data-awaiting-carry]");

const grown = (box: DOMRect | Box): Box => ({
  left: box.left - AIR,
  top: box.top - AIR,
  right: box.right + AIR,
  bottom: box.bottom + AIR,
});

export class KeepClear {
  private onPage: Box[] = [];
  private onTop: Box[] = [];
  /** The bottom bar's boxes, top and bottom measured up from the screen's bottom edge. */
  private onBottom: Box[] = [];

  /** The page's own controls in view when the last line was said (cards, skills, links), in page coordinates. */
  private controlsInView: Box[] = [];

  constructor(
    private readonly scrolling: () => HTMLElement[],
    private readonly top: () => HTMLElement[],
    private readonly bottom: () => HTMLElement[],
    private readonly pageControls: () => HTMLElement[] = () => [],
  ) {}

  /**
   * The page's controls on screen now, read once when a line is said (never per frame): a bubble may not cover them
   * either, though in a section full of buttons it can only cover the fewest.
   */
  measureControlsInView() {
    const scrolled = window.scrollY;
    const height = window.innerHeight;
    this.controlsInView = [];
    for (const control of this.pageControls()) {
      if (!seenNow(control)) continue;
      const box = control.getBoundingClientRect();
      if (box.bottom < 0 || box.top > height || !box.width) continue;
      this.controlsInView.push({ left: box.left, right: box.right, top: box.top + scrolled, bottom: box.bottom + scrolled });
    }
  }

  measure() {
    const scrolled = window.scrollY;
    const height = window.innerHeight;
    this.onPage = this.scrolling().map((element) => {
      const box = grown(element.getBoundingClientRect());
      return { ...box, top: box.top + scrolled, bottom: box.bottom + scrolled };
    });
    this.onTop = this.top()
      .filter(seenNow)
      .map((element) => grown(element.getBoundingClientRect()));
    this.onBottom = this.bottom()
      .filter((element) => !element.hidden)
      .map((element) => {
        const box = grown(element.getBoundingClientRect());
        return { ...box, top: height - box.top, bottom: height - box.bottom };
      });
  }

  /** Every box to keep clear, on the screen now. */
  boxes(scrollY: number, height: number): Box[] {
    return [
      ...[...this.onPage, ...this.controlsInView].map((box) => ({ ...box, top: box.top - scrollY, bottom: box.bottom - scrollY })),
      ...this.onTop,
      ...this.onBottom.map((box) => ({ ...box, top: height - box.top, bottom: height - box.bottom })),
    ];
  }
}

/*
  Every scroll read and write of the page goes through here. On touch screens the page scrolls inside a fixed box,
  which the head script asks for with lines-in-a-box. So the browser's bars never slide and resize the scene.
  Elsewhere the document scrolls as usual. A passive listener only stores the position, and the frame reads it. The
  track's place is measured on a resize, never in a frame.
*/
export type ScrollReader = {
  /** How far through the track the reader is, from 0 to 1. */
  progress(): number;
  /** Scrolls so the track is at that progress. */
  scrollToProgress(progress: number, smooth?: boolean): void;
  /** Measures the track again, after a resize. */
  measure(): void;
  onScroll(listener: () => void): void;
};

export const scrollsInABox = () =>
  document.documentElement.classList.contains("lines-in-a-box");

export function createScrollReader(
  scroller: HTMLElement,
  track: HTMLElement,
  stage: HTMLElement,
): ScrollReader {
  const inBox = scrollsInABox();
  const listeners: (() => void)[] = [];
  let position = 0;
  let trackTop = 0;
  let travelLength = 1;

  const readPosition = () => (inBox ? scroller.scrollTop : window.scrollY);

  const measure = () => {
    trackTop = inBox
      ? track.offsetTop
      : track.getBoundingClientRect().top + window.scrollY;
    travelLength = Math.max(1, track.offsetHeight - stage.offsetHeight);
    position = readPosition();
  };

  const target: HTMLElement | Window = inBox ? scroller : window;
  target.addEventListener(
    "scroll",
    () => {
      position = readPosition();
      for (const listener of listeners) listener();
    },
    { passive: true },
  );
  measure();

  return {
    progress: () =>
      Math.min(1, Math.max(0, (position - trackTop) / travelLength)),
    scrollToProgress(progress, smooth = false) {
      const top = trackTop + progress * travelLength;
      const behavior: ScrollBehavior = smooth ? "smooth" : "auto";
      if (inBox) scroller.scrollTo({ top, behavior });
      else window.scrollTo({ top, behavior });
    },
    measure,
    onScroll: (listener) => listeners.push(listener),
  };
}

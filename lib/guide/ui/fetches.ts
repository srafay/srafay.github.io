/*
  Deep research pulls each card from its pile of sources. A card waits in its place until its line has been written,
  unseen and taking no presses (opacity only, so a screen reader still has it), then comes out of the research tool:
  from a tenth of its size where the tool is, to its place, on a slight arc, in 0.55 s, by transforms only. A card of a
  line passed by a jump or a fast scroll, one that takes keyboard focus, and one in view when the page loads already
  scrolled are simply in place. A card in place is never fetched again in the visit. Under reduced motion every card is
  in place from the start.
*/

export type FetchesOptions = {
  reducedMotion: boolean;
  /** Where deep research sits on the screen now (y down), or null. */
  source(): { x: number; y: number } | null;
  /** A card is on its way: the tool lights, and the agent watches the card land. */
  onFetch(card: HTMLElement, seconds: number): void;
  /** Whether the page has so far been scrolled only by a reload restoring it. */
  restoredOnly(): boolean;
};

/** How long a card takes from the pile to its place, in seconds. */
export const FETCH_SECONDS = 0.55;

/** How small a card starts, as it leaves the pile. */
const START_SCALE = 0.1;

export class Fetches {
  private readonly waiting = new Set<HTMLElement>();
  private readonly flying = new Map<HTMLElement, Animation>();

  constructor(
    cards: HTMLElement[],
    private readonly options: FetchesOptions,
  ) {
    if (options.reducedMotion) return;
    for (const card of cards) {
      card.dataset.awaitingFetch = "";
      this.waiting.add(card);
      card.addEventListener("focusin", () => this.land(card));
    }
    const inView = new IntersectionObserver((entries) => {
      if (!options.restoredOnly()) return;
      for (const entry of entries)
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) this.land(entry.target as HTMLElement);
    });
    for (const card of cards) inView.observe(card);
  }

  /** The card comes out of the pile of sources and lands in its place. */
  fetch(card: HTMLElement) {
    if (!this.waiting.has(card)) return;
    const source = this.options.source();
    if (!source || typeof card.animate !== "function") return this.land(card);
    this.waiting.delete(card);
    const box = card.getBoundingClientRect();
    const across = source.x - (box.left + box.width / 2);
    const down = source.y - (box.top + box.height / 2);
    delete card.dataset.awaitingFetch;
    card.dataset.fetching = "";
    const animation = card.animate(
      [
        { transform: `translate3d(${across}px, ${down}px, 0) scale(${START_SCALE})` },
        { transform: `translate3d(${across * 0.35}px, ${down * 0.35 - 24}px, 0) scale(0.55)`, offset: 0.6 },
        { transform: "none" },
      ],
      { duration: FETCH_SECONDS * 1000, easing: "cubic-bezier(0.3, 0.6, 0.25, 1)" },
    );
    this.flying.set(card, animation);
    this.options.onFetch(card, FETCH_SECONDS);
    animation.onfinish = () => this.land(card);
  }

  /** The card in its place now. */
  land(card: HTMLElement) {
    this.waiting.delete(card);
    const animation = this.flying.get(card);
    this.flying.delete(card);
    animation?.cancel();
    delete card.dataset.awaitingFetch;
    delete card.dataset.fetching;
  }

  /** Every card in its place now: for Skip. */
  landAll() {
    for (const card of [...this.waiting, ...this.flying.keys()]) this.land(card);
  }
}

/*
  Each section's name is carried in by the agent the first time it comes wholly into the carrying band (below the
  control pill, in the upper part of the screen), as a crane sets down its load. The name waits unseen in its place
  until then (opacity only, so a screen reader still has it), and its section's lines wait for it. Only transforms move
  it, so its place in the page never changes and nothing below it moves. A name passed on the way to another, or left
  under the pill, is simply in place, and a name set in place is never carried again in the visit. Names in view when
  the page loads already scrolled (a scroll neither the reader nor the tour made) are in place too. Under reduced
  motion every name is in place from the start.
*/
import type { CarryHandlers } from "@/lib/guide/agent/agent-view";
import type { CarriedWord, CarryMoment } from "@/lib/guide/agent/carry";

export type CarriesOptions = {
  reducedMotion: boolean;
  agent: { carry(word: CarriedWord, handlers: CarryHandlers): boolean; landCarry(): void; readonly carryHeadroom: number };
  /** The side the agent works from in a section: 1 the right, -1 the left. */
  sideOf(section: HTMLElement): 1 | -1;
  /** How high the hook is when a name is taken, in stage space: the bottom edge, or the top of the den's strip. */
  takenAt(): number;
  /** The foot of the chrome along the top of the screen, in CSS pixels: the bar, or the control pill while it is there. */
  bandTop(): number;
  /** Whether the page has so far been scrolled only by a reload restoring it: by neither the reader nor the tour. */
  restoredOnly(): boolean;
  /** The agent has the name on its cord: the first time in a visit, it may say a word. */
  onTaken(first: boolean): void;
  /** A name is in its place: its section's lines may begin. */
  onSet(section: HTMLElement): void;
};

/** A name's hook (the top middle of its words) in the document, measured once, with no transform on it. */
type Hook = { x: number; documentY: number; width: number };

/** The carrying band's foot: the upper 70 percent of the screen, or lower if the tallest name needs it to fit. */
const BAND_FOOT_SHARE = 0.7;

export class Carries {
  private readonly waiting = new Set<HTMLElement>();
  private carrying: HTMLElement | null = null;
  private carried = 0;
  private band: IntersectionObserver | null = null;

  constructor(
    private readonly names: HTMLElement[],
    private readonly options: CarriesOptions,
  ) {
    if (options.reducedMotion) return;
    for (const name of names) {
      name.dataset.awaitingCarry = "";
      this.waiting.add(name);
    }
    this.watch();
    window.addEventListener("resize", () => this.watch());
    // Names on the screen, or above it, when the page loads already scrolled are simply in place.
    const inView = new IntersectionObserver((entries) => {
      if (!options.restoredOnly()) return;
      for (const entry of entries) {
        const name = entry.target as HTMLElement;
        if (this.waiting.has(name) && name !== this.carrying && (entry.isIntersecting || entry.boundingClientRect.bottom < 0)) this.setNameInPlace(name);
      }
    });
    for (const name of names) inView.observe(name);
  }

  /** Watches the carrying band, which starts under the control pill: made again when the pill comes or goes. */
  watch() {
    if (this.options.reducedMotion) return;
    this.band?.disconnect();
    this.band = new IntersectionObserver((entries) => this.seen(entries), {
      rootMargin: `-${Math.round(this.bandTop())}px 0px -${Math.round(window.innerHeight - this.bandFoot())}px 0px`,
      threshold: [0, 0.99],
    });
    for (const name of this.waiting) this.band.observe(name);
  }

  /**
   * Where the band ends, down the screen: the upper 70 percent, or as far as the tallest name needs to fit wholly in it
   * (a name set on two lines on a computer is taller than the rest of the band).
   */
  private bandFoot() {
    const tallest = Math.max(0, ...this.names.map((name) => name.getBoundingClientRect().height));
    return Math.min(window.innerHeight, Math.max(window.innerHeight * BAND_FOOT_SHARE, this.bandTop() + tallest + 48));
  }

  /** Whether a section's name is still to be set in place. */
  isWaiting(section: HTMLElement) {
    const name = section.querySelector<HTMLElement>(".guide-section-name");
    return Boolean(name && this.waiting.has(name));
  }

  /** Whether a name is being carried now. */
  get isCarrying() {
    return this.carrying !== null;
  }

  /** A section's name in place now, if it still waits: the tour waited long enough for its carry. */
  setInPlace(section: HTMLElement) {
    const name = section.querySelector<HTMLElement>(".guide-section-name");
    if (name && name !== this.carrying) this.setNameInPlace(name);
  }

  /** Every name in place now, carried or not: for Skip. */
  setAllInPlace() {
    this.options.agent.landCarry();
    for (const name of [...this.waiting]) this.setNameInPlace(name);
  }

  /**
   * A name wholly in the band is carried. One leaving the band through its top (passed upward, or left under the pill)
   * is simply in place, and so is any in view while the page has only been restored.
   */
  private seen(entries: IntersectionObserverEntry[]) {
    const bandTop = this.bandTop();
    for (const entry of entries) {
      const name = entry.target as HTMLElement;
      if (!this.waiting.has(name) || name === this.carrying) continue;
      if (this.options.restoredOnly() && entry.isIntersecting) this.setNameInPlace(name);
      else if (entry.intersectionRatio >= 0.99) this.carry(name);
      else if (entry.boundingClientRect.top < bandTop) this.setNameInPlace(name);
    }
  }

  private carry(name: HTMLElement) {
    // Names passed on the way here are simply in place; a carry under way lands at once.
    const order = this.names.indexOf(name);
    for (const other of [...this.waiting]) if (this.names.indexOf(other) < order && other !== this.carrying) this.setNameInPlace(other);
    this.options.agent.landCarry();
    const section = name.closest<HTMLElement>("[data-section]");
    if (!section) return this.setNameInPlace(name);
    const hook = hookOf(name);
    const place = () => ({ x: hook.x, y: window.innerHeight - (hook.documentY - window.scrollY), z: 0 });
    name.style.transformOrigin = `${(hook.x - name.getBoundingClientRect().left).toFixed(1)}px 0px`;
    this.carrying = name;
    const started = this.options.agent.carry(
      { width: hook.width, side: this.options.sideOf(section), place, takenAt: this.options.takenAt() },
      {
        onFrame: (moment) => this.move(name, moment, place()),
        onTaken: () => this.options.onTaken(this.carried++ === 0),
        onLanded: () => this.setNameInPlace(name),
      },
    );
    if (!started) this.setNameInPlace(name);
  }

  /** Where the band starts: under the chrome along the top, with room over a name for the agent and its cord. */
  bandTop() {
    return this.options.bandTop() + this.options.agent.carryHeadroom;
  }

  /**
   * The name where its hook is this frame, tilted as it swings; unseen until the agent has it on its cord. If the reader
   * scrolls its place up out of the band, there is no room left to lower it: it lands at once.
   */
  private move(name: HTMLElement, moment: CarryMoment, place: { x: number; y: number }) {
    if (window.innerHeight - place.y < this.bandTop() - 24) return this.options.agent.landCarry();
    if (!moment.hook || moment.landed) return;
    delete name.dataset.awaitingCarry;
    name.dataset.carrying = "";
    const across = moment.hook.x - place.x;
    const down = place.y - moment.hook.y;
    name.style.transform = `translate3d(${across.toFixed(2)}px, ${down.toFixed(2)}px, 0) rotate(${(-moment.tilt).toFixed(4)}rad)`;
  }

  private setNameInPlace(name: HTMLElement) {
    if (this.carrying === name) this.carrying = null;
    if (!this.waiting.delete(name)) return;
    this.band?.unobserve(name);
    delete name.dataset.awaitingCarry;
    delete name.dataset.carrying;
    name.style.transform = "";
    name.dataset.carried = "";
    const section = name.closest<HTMLElement>("[data-section]");
    if (section) this.options.onSet(section);
  }
}

/** The top middle of a name's words (its glyph and its text, not its full-width box), in the document. */
function hookOf(name: HTMLElement): Hook {
  const box = name.getBoundingClientRect();
  const parts = [...name.children].map((child) => child.getBoundingClientRect()).filter((part) => part.width > 0);
  const left = parts.length ? Math.min(...parts.map((part) => part.left)) : box.left;
  const right = parts.length ? Math.max(...parts.map((part) => part.right)) : box.right;
  return { x: (left + right) / 2, documentY: box.top + window.scrollY, width: right - left };
}

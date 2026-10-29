/*
  The tour's lines. Left to the reader, a line is said as it comes into view: the newest line in view is the one being
  said, and any line above it that is still being said, or still waiting, is shown whole at once. So a reader who reads
  along hears each line in turn, and a reader who jumps lands on a whole chat with only the newest line typing. While
  the tour plays by itself, it drives the lines instead, one after another in order. A tap on a line finishes it. A
  section can be held (its name not yet carried in): its lines wait until it is let go.
*/
import { narrationWordMilliseconds, typeInto, type Typing } from "./typing";

export type NarratorOptions = {
  instant: boolean;
  onWord(word: string, span: HTMLElement): void;
  /** A line began: the agent looks at it, and its pen goes to it. */
  onLineStarted(line: HTMLElement): void;
  /** A line is whole: written to its end (written true), or shown at once (passed, tapped, skipped). */
  onLineDone(line: HTMLElement, written: boolean): void;
};

export class Narrator {
  private current: { element: HTMLElement; typing: Typing } | null = null;
  private readonly said = new WeakSet<HTMLElement>();
  private readonly order = new Map<HTMLElement, number>();
  /** The lines in view now, and the sections whose lines wait. */
  private readonly inView = new Set<HTMLElement>();
  private readonly heldSections = new Set<Element>();
  /** Whether the tour drives the lines, in order, rather than the reader's view. */
  private driven = false;
  readonly lines: HTMLElement[];

  constructor(lines: HTMLElement[], private readonly options: NarratorOptions) {
    lines.forEach((line, index) => {
      this.order.set(line, index);
      // Each line holds its whole text from the start, hidden until it is said, so nothing below moves as it types.
      line.dataset.waiting = "";
      line.addEventListener("click", () => this.finish(line));
    });
    this.lines = lines;
    const observer = new IntersectionObserver((entries) => this.seen(entries), { rootMargin: "0px 0px -18% 0px" });
    for (const line of lines) observer.observe(line);
  }

  /** Holds a section's lines until it is let go. */
  hold(section: Element) {
    this.heldSections.add(section);
  }

  /** Lets a section's lines be said, and says the newest in view if it is one of them. */
  release(section: Element) {
    if (!this.heldSections.delete(section)) return;
    this.sayNewestInView();
  }

  /** Whether a section's lines are held. */
  isHeld(line: HTMLElement) {
    const section = line.closest("[data-section]");
    return Boolean(section && this.heldSections.has(section));
  }

  /** The tour takes the lines over (true), or gives them back to the reader's view (false). */
  drive(driven: boolean) {
    this.driven = driven;
    if (!driven) this.sayNewestInView();
  }

  private seen(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      const line = entry.target as HTMLElement;
      if (entry.isIntersecting) this.inView.add(line);
      else this.inView.delete(line);
      if (!this.driven && !this.said.has(line) && !entry.isIntersecting && entry.boundingClientRect.top < 0) this.finish(line);
    }
    this.sayNewestInView();
  }

  /** The newest line in view that is not said and not held, or null. */
  newestInView() {
    let newest: HTMLElement | null = null;
    for (const line of this.inView) {
      if (this.said.has(line) || this.isHeld(line)) continue;
      if (!newest || this.placeOf(line) > this.placeOf(newest)) newest = line;
    }
    return newest;
  }

  /** The newest line in view is said; any line above it is shown whole. Left to the reader only. */
  private sayNewestInView() {
    if (this.driven) return;
    const newest = this.newestInView();
    if (!newest) return;
    this.finishBefore(newest);
    this.say(newest);
  }

  private placeOf = (line: HTMLElement) => this.order.get(line) ?? 0;

  /** Every line above this one is shown whole: it has been passed. */
  finishBefore(line: HTMLElement) {
    for (const each of this.lines.slice(0, this.placeOf(line))) if (!this.said.has(each)) this.finish(each);
  }

  /** The first line after this one (or the first of all) that is not yet said, or null at the end. */
  nextUnsaid(after: HTMLElement | null = null) {
    const from = after ? this.placeOf(after) + 1 : 0;
    return this.lines.slice(from).find((line) => !this.said.has(line)) ?? null;
  }

  /** Says a line now, as the tour asks: it is written word by word by the pen. */
  say(line: HTMLElement) {
    if (this.current?.element === line || this.said.has(line)) return;
    delete line.dataset.waiting;
    this.options.onLineStarted(line);
    const typing = typeInto(line, line.dataset.line ?? "", {
      instant: this.options.instant,
      wordClass: "guide-word",
      wordMilliseconds: narrationWordMilliseconds(),
      onWord: (word, span) => this.options.onWord(word, span),
      onDone: () => this.markSaid(line, !this.options.instant),
    });
    this.current = { element: line, typing };
  }

  private markSaid(line: HTMLElement, written: boolean) {
    if (this.said.has(line)) return;
    this.said.add(line);
    line.dataset.said = "";
    this.options.onLineDone(line, written);
  }

  /** Shows a line whole now: tapped, or passed. */
  finish(line: HTMLElement) {
    if (this.current?.element === line && !this.current.typing.done) {
      this.current.typing.finish();
      return;
    }
    if (this.said.has(line)) return;
    delete line.dataset.waiting;
    typeInto(line, line.dataset.line ?? "", { instant: true, wordClass: "guide-word" });
    this.markSaid(line, false);
  }

  /** Every line whole now: for Skip. */
  finishAll() {
    for (const line of this.lines) this.finish(line);
  }

  /** Whether a line has been said or shown whole. */
  isSaid(line: HTMLElement) {
    return this.said.has(line);
  }

  /** Holds the line being typed where it is, and lets it go on: the page hidden, the tour paused. */
  holdTyping() {
    this.current?.typing.hold();
  }

  carryOnTyping() {
    this.current?.typing.carryOn();
  }

  /** The line being said now, for checks. */
  get saying() {
    return this.current && !this.current.typing.done ? this.current.element.dataset.line ?? null : null;
  }

  /** The element of the line being typed now, or null. */
  get typingLine() {
    return this.current && !this.current.typing.done ? this.current.element : null;
  }
}

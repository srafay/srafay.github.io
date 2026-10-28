/*
  The tour's lines, said as they come into view. The newest line in view is the one being said; any line above it
  that is still being said, or still waiting, is shown whole at once. So a reader who reads along hears each line in
  turn, and a reader who jumps lands on a whole chat with only the newest line typing. A tap on a line finishes it.
  While a line is said, the python turns to it.
*/
import { typeInto, type Typing } from "./typing";

export type NarratorOptions = {
  instant: boolean;
  onWord(word: string): void;
  /** A line began: the python looks at it. */
  onLineStarted(line: HTMLElement): void;
};

export class Narrator {
  private current: { element: HTMLElement; typing: Typing } | null = null;
  private readonly said = new WeakSet<HTMLElement>();
  private readonly order = new Map<HTMLElement, number>();

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

  private readonly lines: HTMLElement[];

  private seen(entries: IntersectionObserverEntry[]) {
    let newest: HTMLElement | null = null;
    for (const entry of entries) {
      const line = entry.target as HTMLElement;
      if (this.said.has(line)) continue;
      if (entry.isIntersecting) {
        if (!newest || (this.order.get(line) ?? 0) > (this.order.get(newest) ?? 0)) newest = line;
      } else if (entry.boundingClientRect.top < 0) this.finish(line);
    }
    if (!newest) return;
    // Every line above the newest one is shown whole: it has been passed.
    const newestPlace = this.order.get(newest) ?? 0;
    for (const line of this.lines.slice(0, newestPlace)) if (!this.said.has(line)) this.finish(line);
    this.say(newest);
  }

  private say(line: HTMLElement) {
    if (this.current?.element === line) return;
    delete line.dataset.waiting;
    this.options.onLineStarted(line);
    const typing = typeInto(line, line.dataset.line ?? "", {
      instant: this.options.instant,
      wordClass: "guide-word",
      onWord: (word) => this.options.onWord(word),
      onDone: () => {
        this.said.add(line);
        line.dataset.said = "";
      },
    });
    this.current = { element: line, typing };
  }

  /** Shows a line whole now: tapped, or passed. */
  finish(line: HTMLElement) {
    if (this.current?.element === line) {
      this.current.typing.finish();
      return;
    }
    if (this.said.has(line)) return;
    delete line.dataset.waiting;
    typeInto(line, line.dataset.line ?? "", { instant: true, wordClass: "guide-word" });
    this.said.add(line);
    line.dataset.said = "";
  }

  /** The line being said now, for checks. */
  get saying() {
    return this.current && !this.current.typing.done ? this.current.element.dataset.line ?? null : null;
  }
}

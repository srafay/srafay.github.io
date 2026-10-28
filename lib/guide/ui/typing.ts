/*
  How the python's words appear: word by word, at about the pace a person reads aloud, with a pause after each
  sentence. The words are all laid out from the start and only shown in turn, so the bubble never changes size while
  it types and nothing below it moves. A screen reader gets the whole line at once from a hidden twin, never a word at
  a time. A tap finishes the line.
*/
import { element } from "@/lib/about-cv/scene/dom";

/** How long one word takes, and the extra pause after a full stop, in milliseconds. */
const WORD_MILLISECONDS = 300;
const SENTENCE_PAUSE_MILLISECONDS = 260;

/** The pause after a word: longer after the end of a sentence. */
export const pauseAfter = (word: string) =>
  WORD_MILLISECONDS + (/[.?!:]$/.test(word) ? SENTENCE_PAUSE_MILLISECONDS : 0);

export type Typing = {
  /** Shows every word now. */
  finish(): void;
  readonly done: boolean;
};

/**
 * Lays a line into an element as hidden words and shows them one by one. onWord is called as each appears (for the
 * blip). Under reduced motion, or with instant, the whole line shows at once.
 */
export function typeInto(
  target: HTMLElement,
  line: string,
  options: { instant: boolean; onWord?(word: string): void; onDone?(): void; wordClass: string },
): Typing {
  const words = line.split(/\s+/).filter(Boolean);
  const shown = element("span");
  shown.setAttribute("aria-hidden", "true");
  const spans = words.map((word, index) => {
    const span = element("span", options.wordClass, word);
    shown.append(span, index < words.length - 1 ? " " : "");
    return span;
  });
  target.replaceChildren(shown, element("span", "guide-hidden", line));
  let next = 0;
  let timer = 0;
  let done = false;
  const finish = () => {
    if (done) return;
    window.clearTimeout(timer);
    for (const span of spans) span.dataset.said = "";
    done = true;
    options.onDone?.();
  };
  const step = () => {
    if (done) return;
    if (next >= spans.length) {
      finish();
      return;
    }
    spans[next].dataset.said = "";
    options.onWord?.(words[next]);
    timer = window.setTimeout(step, pauseAfter(words[next]));
    next++;
  };
  if (options.instant) finish();
  else step();
  return {
    finish,
    get done() {
      return done;
    },
  };
}

/*
  How the agent's words appear: word by word, with a pause after each sentence. Its own bubble goes at about the pace
  a person reads aloud; the tour's narration, written by its pen, at a silent reading pace. The words are all laid out
  from the start and only shown in turn, so the bubble never changes size while it types and nothing below it moves.
  A screen reader gets the whole line at once from a hidden twin, never a word at a time. A tap finishes the line.
*/
import { element } from "@/lib/about-cv/scene/dom";

/** How long one word of the agent's own bubble takes, and the extra pause after a full stop, in milliseconds. */
const WORD_MILLISECONDS = 300;
const SENTENCE_PAUSE_MILLISECONDS = 260;

/** How long one word of the tour's narration takes to write, in milliseconds: about 270 words a minute. */
export const narrationWordMilliseconds = () => 220;

/** The pause after a word: longer after the end of a sentence. */
export const pauseAfter = (word: string, wordMilliseconds = WORD_MILLISECONDS) =>
  wordMilliseconds + (/[.?!:]$/.test(word) ? SENTENCE_PAUSE_MILLISECONDS : 0);

/** How long a line takes to type, in seconds: the sum of every word's pause. */
export const secondsToSay = (line: string, wordMilliseconds = WORD_MILLISECONDS) =>
  line
    .split(/\s+/)
    .filter(Boolean)
    .reduce((total, word) => total + pauseAfter(word, wordMilliseconds), 0) / 1000;

export type Typing = {
  /** Shows every word now. */
  finish(): void;
  /** Holds the typing where it is (the page is hidden, the tour paused), and lets it go on. */
  hold(): void;
  carryOn(): void;
  readonly done: boolean;
};

/**
 * Lays a line into an element as hidden words and shows them one by one. onWord is called as each appears, with its
 * word and its element (for the blip and the pen). Under reduced motion, or with instant, the whole line shows at once.
 */
export function typeInto(
  target: HTMLElement,
  line: string,
  options: { instant: boolean; onWord?(word: string, span: HTMLElement): void; onDone?(): void; wordClass: string; wordMilliseconds?: number },
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
  let held = false;
  const finish = () => {
    if (done) return;
    window.clearTimeout(timer);
    for (const span of spans) span.dataset.said = "";
    done = true;
    options.onDone?.();
  };
  const step = () => {
    if (done || held) return;
    if (next >= spans.length) {
      finish();
      return;
    }
    spans[next].dataset.said = "";
    options.onWord?.(words[next], spans[next]);
    timer = window.setTimeout(step, pauseAfter(words[next], options.wordMilliseconds));
    next++;
  };
  if (options.instant) finish();
  else step();
  return {
    finish,
    hold() {
      if (done || held) return;
      held = true;
      window.clearTimeout(timer);
    },
    carryOn() {
      if (done || !held) return;
      held = false;
      timer = window.setTimeout(step, 120);
    },
    get done() {
      return done;
    },
  };
}

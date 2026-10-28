/*
  The python's own bubble, beside its head, for what it says off the script: hellos, tricks, costumes, being picked
  up, and a skill's answer. It follows the head, on whichever side has more room, and stays on screen. It is a polite
  live region, so a screen reader hears each line once, whole. A tap on it finishes the line, or hides a finished one.
*/
import { element } from "@/lib/about-cv/scene/dom";
import type { Point } from "@/lib/guide/python/spine";
import { overlapArea, type Box } from "./keep-clear";
import { typeInto, type Typing } from "./typing";

/** How long a finished aside stays before it fades, per word, with a floor, in milliseconds. */
const STAY_PER_WORD = 420;
const LEAST_STAY = 2600;

/** The room in the den for an aside: from left to right, and from the den's floor up to its top, up from the bottom. */
export type DenSpace = { left: number; right: number; floor: number; top: number };

/** The page shows the den speaking (its buttons give way) and grows the den when a line needs more room. */
function showDenSpeaking(speaking: boolean, grow = 0) {
  if (speaking) document.body.dataset.denSpeaking = "";
  else delete document.body.dataset.denSpeaking;
  document.body.style.setProperty("--guide-den-grow", `${Math.max(0, Math.ceil(grow))}px`);
}

export class Say {
  readonly element: HTMLElement;
  private readonly words: HTMLElement;
  private readonly extra: HTMLElement;
  private typing: Typing | null = null;
  private hideTimer = 0;
  private size = { width: 0, height: 0 };
  private head: Point = { x: 0, y: 0, z: 0 };
  private headLength = 40;
  /** While true the bubble stays until closed: an answer with buttons in it. */
  private held = false;
  onWord: (word: string) => void = () => {};
  onHidden: () => void = () => {};

  constructor(
    parent: HTMLElement,
    private readonly instant: () => boolean,
    /** What the bubble must not cover, on the screen now, given the screen's height. */
    private readonly keepClear: (height: number) => Box[] = () => [],
    /** Called as a line starts, to take in what is on screen to keep clear of. */
    private readonly lookAround: () => void = () => {},
    /**
     * The den's space beside the python's head, when it rests in the den on a phone: an aside is said there, in
     * place of the bar's buttons. Null when it is not in the den.
     */
    private readonly denSpace: () => DenSpace | null = () => null,
  ) {
    this.element = element("div", "guide-say");
    this.element.setAttribute("aria-live", "polite");
    this.element.dataset.guideSay = "";
    this.words = element("p", "guide-say-line");
    this.extra = element("div", "guide-say-extra");
    this.element.append(this.words, this.extra);
    this.element.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).closest("button, a")) return;
      // In the den one tap gives the buttons back at once; elsewhere a tap finishes the line, the next one hides it.
      if ("inDen" in this.element.dataset) this.hide();
      else if (this.typing && !this.typing.done) this.typing.finish();
      else if (!this.held) this.hide();
    });
    parent.append(this.element);
  }

  /** Says a line, replacing whatever was being said. With extra, the bubble holds buttons and stays until closed. */
  say(line: string, extra?: HTMLElement[]) {
    window.clearTimeout(this.hideTimer);
    this.typing?.finish();
    this.held = Boolean(extra?.length);
    this.extra.replaceChildren(...(extra ?? []));
    this.extra.hidden = !extra?.length;
    this.typing = typeInto(this.words, line, {
      instant: this.instant(),
      wordClass: "guide-say-word",
      onWord: (word) => this.onWord(word),
      onDone: () => {
        if (!this.held)
          this.hideTimer = window.setTimeout(() => this.hide(), Math.max(LEAST_STAY, line.split(" ").length * STAY_PER_WORD));
      },
    });
    this.element.dataset.shown = "";
    const den = this.denSpace();
    if (den) {
      this.element.dataset.inDen = "";
      this.element.style.width = `${Math.round(den.right - den.left)}px`;
    } else {
      delete this.element.dataset.inDen;
      this.element.style.width = "";
    }
    this.lookAround();
    // Measured once a line, never a frame: where it goes beside the head depends on its size.
    const box = this.element.getBoundingClientRect();
    this.size = { width: box.width, height: box.height };
    this.place();
  }

  hide() {
    window.clearTimeout(this.hideTimer);
    this.typing?.finish();
    delete this.element.dataset.shown;
    if ("inDen" in this.element.dataset) showDenSpeaking(false);
    this.held = false;
    this.onHidden();
  }

  get shown() {
    return "shown" in this.element.dataset;
  }

  get isHolding() {
    return this.held && this.shown;
  }

  /** The words being said now, whole, for checks. */
  get line() {
    return this.words.querySelector(".guide-hidden")?.textContent ?? "";
  }

  /** The python's body, in stage space: a bubble keeps clear of it as well as of its face. */
  private body = { left: 0, right: 0, bottom: 0, top: 0 };

  /** The head moved: the bubble keeps beside it, and clear of the body. */
  follow(head: Point, headLength: number, body?: { left: number; right: number; bottom: number; top: number }) {
    this.head = head;
    this.headLength = headLength;
    if (body) this.body = body;
    if (this.shown) this.place();
  }

  /**
   * Where the bubble goes: the first place by the head that covers nothing it must keep clear (the name, the bio,
   * every control, and the face itself). Beside the head on the roomier side first, then above it, then beside it on
   * the other side, then below it. If every place covers something, the one that covers least.
   */
  private place() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if ("inDen" in this.element.dataset && this.shown) {
      const den = this.denSpace();
      // The python left the den (the reader went back to the top): the aside goes with the den.
      if (!den) return this.hide();
      showDenSpeaking(true, this.size.height - (den.top - den.floor) + 12);
      this.element.style.transform = `translate3d(${Math.round(den.left)}px, ${-Math.round(den.floor)}px, 0)`;
      this.overlapping = 0;
      return;
    }
    if (performance.now() < this.coveringUntil) {
      const left = this.head.x - this.size.width / 2;
      const top = height - this.head.y - this.size.height / 2;
      this.element.style.transform = `translate3d(${Math.round(left)}px, ${-Math.round(height - top - this.size.height)}px, 0)`;
      return;
    }
    const { width: bubbleWidth, height: bubbleHeight } = this.size;
    const centreX = this.head.x;
    const centreY = height - this.head.y;
    const reach = this.headLength * 0.62;
    const gap = 10;
    const face: Box = { left: centreX - reach, top: centreY - reach, right: centreX + reach, bottom: centreY + reach };
    const roomierOnLeft = centreX > width / 2;
    const beside = (onLeft: boolean) => ({
      left: onLeft ? centreX - reach - gap - bubbleWidth : centreX + reach + gap,
      top: centreY - bubbleHeight * 0.75,
    });
    const along = [0.85, 0.5, 0.15].map((share) => centreX - bubbleWidth * share);
    // When every place by the head covers something (the python held up by the name), a clear place further off is
    // better than words on words: the open band just above the bottom strip, at either side, or the middle.
    const bottomStrip = this.keepClear(height).reduce((highest, box) => (box.bottom >= height - 2 ? Math.min(highest, box.top) : highest), height);
    const farTop = Math.min(bottomStrip, height) - bubbleHeight - 16;
    const candidates = [
      beside(roomierOnLeft),
      ...along.map((left) => ({ left, top: centreY - reach - gap - bubbleHeight })),
      beside(!roomierOnLeft),
      ...along.map((left) => ({ left, top: centreY + reach + gap })),
      { left: 16, top: farTop },
      { left: width - bubbleWidth - 16, top: farTop },
      { left: (width - bubbleWidth) / 2, top: height / 2 - bubbleHeight / 2 },
    ].map(({ left, top }) => {
      const clampedLeft = Math.min(Math.max(12, left), width - bubbleWidth - 12);
      const clampedTop = Math.min(Math.max(8, top), height - bubbleHeight - 8);
      return { left: clampedLeft, top: clampedTop, right: clampedLeft + bubbleWidth, bottom: clampedTop + bubbleHeight };
    });
    const thickness = this.headLength * 0.25;
    const bodyBox: Box = {
      left: this.body.left - thickness,
      right: this.body.right + thickness,
      top: height - this.body.top - thickness,
      bottom: height - this.body.bottom + thickness,
    };
    const avoid = [face, bodyBox, ...this.keepClear(height)];
    let best = candidates[0];
    let bestOverlap = Infinity;
    for (const candidate of candidates) {
      const overlap = avoid.reduce((sum, box) => sum + overlapArea(candidate, box), 0);
      if (overlap < bestOverlap) {
        best = candidate;
        bestOverlap = overlap;
      }
      if (overlap === 0) break;
    }
    this.overlapping = bestOverlap;
    this.element.style.transform = `translate3d(${Math.round(best.left)}px, ${-Math.round(height - best.bottom)}px, 0)`;
  }

  /** How much of what it must keep clear the bubble covers where it last went, in square CSS pixels: 0 is none. */
  overlapping = 0;

  private coveringUntil = 0;

  /** Peekaboo: for a while the bubble sits over the python's face, big enough to hide it. */
  cover(seconds: number) {
    this.coveringUntil = performance.now() + seconds * 1000;
    this.element.dataset.covering = "";
    this.element.style.minWidth = `${Math.round(this.headLength * 1.7)}px`;
    this.element.style.minHeight = `${Math.round(this.headLength * 1.4)}px`;
    const box = this.element.getBoundingClientRect();
    this.size = { width: box.width, height: box.height };
    this.place();
    window.setTimeout(() => {
      delete this.element.dataset.covering;
      this.element.style.minWidth = "";
      this.element.style.minHeight = "";
      const after = this.element.getBoundingClientRect();
      this.size = { width: after.width, height: after.height };
      this.place();
    }, seconds * 1000);
  }
}

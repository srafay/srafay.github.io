/*
  The agent's own bubble, beside its router, for what it says off the script: hellos, tricks, costumes, being picked
  up, and a skill's answer. It follows the router, on whichever side has more room, and stays on screen. It is a
  polite live region, so a screen reader hears each line once, whole. A tap on it finishes the line, or hides a
  finished one.
*/
import { element } from "@/lib/about-cv/scene/dom";
import type { Point } from "@/lib/guide/agent/vectors";
import { overlapArea, type Box } from "./keep-clear";
import { typeInto, type Typing } from "./typing";

/** How long a finished aside stays before it fades, per word, with a floor, in milliseconds. */
const STAY_PER_WORD = 420;
const LEAST_STAY = 2600;

/** The room in the den for an aside: from left to right, and from the den's floor up to its top, up from the bottom. */
export type DenSpace = { left: number; right: number; floor: number; top: number };

/** The page shows the den speaking (its buttons give way) and grows the den when a line or a chart needs more room. */
function showDenSpeaking(speaking: boolean, grow = 0) {
  const growth = `${Math.max(0, Math.ceil(grow))}px`;
  // Written only when it changes: the bubble is placed every drawn frame, and a write restyles the page.
  if (speaking !== ("denSpeaking" in document.body.dataset)) {
    if (speaking) document.body.dataset.denSpeaking = "";
    else delete document.body.dataset.denSpeaking;
  }
  if (document.body.style.getPropertyValue("--guide-den-grow") !== growth) document.body.style.setProperty("--guide-den-grow", growth);
}

export class Say {
  readonly element: HTMLElement;
  private readonly words: HTMLElement;
  private readonly extra: HTMLElement;
  private typing: Typing | null = null;
  private hideTimer = 0;
  private size = { width: 0, height: 0 };
  private head: Point = { x: 0, y: 0, z: 0 };
  /** How far the agent reaches round its router: the bubble keeps that clear. */
  private reach = 40;
  /** Room the den keeps above its line for something the agent shows there (the chart), in CSS pixels. */
  private denRoom = 0;
  /** Until when a line stays through a change of section (a route), in milliseconds of the page clock. */
  private keptUntil = 0;
  /** While true the bubble stays until closed: an answer with buttons in it. */
  private held = false;
  onWord: (word: string) => void = () => {};
  onHidden: () => void = () => {};
  /** Called when the reader taps a line away. */
  onDismissed: () => void = () => {};

  constructor(
    parent: HTMLElement,
    private readonly instant: () => boolean,
    /** What the bubble must not cover, on the screen now, given the screen's height. */
    private readonly keepClear: (height: number) => Box[] = () => [],
    /** Called as a line starts, to take in what is on screen to keep clear of. */
    private readonly lookAround: () => void = () => {},
    /**
     * The den's space beside the agent, when it rests in the den on a phone: an aside is said there, in
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
      if ("inDen" in this.element.dataset) this.dismiss();
      else if (this.typing && !this.typing.done) this.typing.finish();
      else if (!this.held) this.dismiss();
    });
    parent.append(this.element);
  }

  /** Says a line, replacing whatever was being said. With extra, the bubble holds buttons and stays until closed. */
  say(line: string, extra?: HTMLElement[]) {
    // The line being typed is finished first: finishing sets its own timer to hide, which is then cleared with the rest.
    this.typing?.finish();
    window.clearTimeout(this.hideTimer);
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
    this.chosen = -1;
    this.place();
  }

  /** Which of the places by the router the bubble took for this line: it keeps it while it still covers nothing. */
  private chosen = -1;

  /** Where the bubble is on the screen (y down), as last placed. */
  box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

  /** The bubble's middle, in stage space (y up from the screen's bottom), while it is shown; null when it is not. */
  get centre(): Point | null {
    if (!this.shown) return null;
    return { x: (this.box.left + this.box.right) / 2, y: window.innerHeight - (this.box.top + this.box.bottom) / 2, z: 0 };
  }

  hide() {
    // The line being typed is finished first: finishing sets its own timer to hide, which is then cleared with the rest.
    this.typing?.finish();
    window.clearTimeout(this.hideTimer);
    delete this.element.dataset.shown;
    if ("inDen" in this.element.dataset) showDenSpeaking(this.denRoom > 0, this.denRoom);
    this.held = false;
    this.keptUntil = 0;
    this.onHidden();
  }

  /** Hidden by the reader's tap: whatever was going to be said next is not. */
  private dismiss() {
    this.hide();
    this.onDismissed();
  }

  /** The den keeps room above its line for the chart, its buttons away, even before a line is said. */
  reserveDenRoom(pixels: number) {
    this.denRoom = pixels;
    if (pixels > 0 && this.denSpace()) showDenSpeaking(true, pixels);
    if (this.shown) this.place();
  }

  releaseDenRoom() {
    if (!this.denRoom) return;
    this.denRoom = 0;
    if (this.shown && "inDen" in this.element.dataset) this.place();
    else showDenSpeaking(false);
  }

  /** The line now stays through a change of section for a while, as a route scrolls the page. */
  keepThroughScroll(seconds: number) {
    this.keptUntil = performance.now() + seconds * 1000;
  }

  get shown() {
    return "shown" in this.element.dataset;
  }

  get isHolding() {
    return (this.held || performance.now() < this.keptUntil) && this.shown;
  }

  /** The words being said now, whole, for checks. */
  get line() {
    return this.words.querySelector(".guide-hidden")?.textContent ?? "";
  }

  /** Everything the agent draws, in stage space: a bubble keeps clear of it as well as of the router. */
  private body = { left: 0, right: 0, bottom: 0, top: 0 };

  /** The agent moved: the bubble keeps beside its router, and clear of the rest of it. */
  follow(router: Point, reach: number, body?: { left: number; right: number; bottom: number; top: number }) {
    this.head = router;
    this.reach = reach;
    if (body) this.body = body;
    if (this.shown) this.place();
  }

  /**
   * Where the bubble goes: the first place by the router that covers nothing it must keep clear (the name, the bio,
   * every control, and the agent itself). Beside the router on the roomier side first, then above it, then beside it
   * on the other side, then below it. If every place covers something, the one that covers least.
   */
  private place() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if ("inDen" in this.element.dataset && this.shown) {
      const den = this.denSpace();
      // The agent left the den (the reader went back to the top): the aside goes with the den.
      if (!den) return this.hide();
      showDenSpeaking(true, Math.max(0, this.size.height - (den.top - den.floor) + 12) + this.denRoom);
      this.element.style.transform = `translate3d(${Math.round(den.left)}px, ${-Math.round(den.floor)}px, 0)`;
      this.box = { left: den.left, right: den.left + this.size.width, bottom: height - den.floor, top: height - den.floor - this.size.height };
      this.overlapping = 0;
      return;
    }
    const { width: bubbleWidth, height: bubbleHeight } = this.size;
    const centreX = this.head.x;
    const centreY = height - this.head.y;
    const reach = this.reach;
    const gap = 10;
    const face: Box = { left: centreX - reach, top: centreY - reach, right: centreX + reach, bottom: centreY + reach };
    const roomierOnLeft = centreX > width / 2;
    const beside = (onLeft: boolean) => ({
      left: onLeft ? centreX - reach - gap - bubbleWidth : centreX + reach + gap,
      top: centreY - bubbleHeight * 0.75,
    });
    const along = [0.85, 0.5, 0.15].map((share) => centreX - bubbleWidth * share);
    // Beside the whole agent, not only its router: its tools spread wider than the router does.
    const besideAll = (onLeft: boolean) => ({
      left: onLeft ? this.body.left - gap - bubbleWidth : this.body.right + gap,
      top: centreY - bubbleHeight * 0.75,
    });
    // When every place by the router covers something (the agent held up by the name), a clear place further off is
    // better than words on words: the open band just above the bottom strip, at either side, or the middle.
    const bottomStrip = this.keepClear(height).reduce((highest, box) => (box.bottom >= height - 2 ? Math.min(highest, box.top) : highest), height);
    const farTop = Math.min(bottomStrip, height) - bubbleHeight - 16;
    const candidates = [
      beside(roomierOnLeft),
      besideAll(roomierOnLeft),
      ...along.map((left) => ({ left, top: centreY - reach - gap - bubbleHeight })),
      beside(!roomierOnLeft),
      besideAll(!roomierOnLeft),
      ...along.map((left) => ({ left, top: centreY + reach + gap })),
      { left: 16, top: farTop },
      { left: width - bubbleWidth - 16, top: farTop },
      { left: (width - bubbleWidth) / 2, top: height / 2 - bubbleHeight / 2 },
    ].map(({ left, top }) => {
      const clampedLeft = Math.min(Math.max(12, left), width - bubbleWidth - 12);
      const clampedTop = Math.min(Math.max(8, top), height - bubbleHeight - 8);
      return { left: clampedLeft, top: clampedTop, right: clampedLeft + bubbleWidth, bottom: clampedTop + bubbleHeight };
    });
    const thickness = this.reach * 0.08;
    const bodyBox: Box = {
      left: this.body.left - thickness,
      right: this.body.right + thickness,
      top: height - this.body.top - thickness,
      bottom: height - this.body.bottom + thickness,
    };
    const avoid = [face, bodyBox, ...this.keepClear(height)];
    const overlapOf = (candidate: Box) => avoid.reduce((sum, box) => sum + overlapArea(candidate, box), 0);
    let best = candidates[0];
    let bestOverlap = Infinity;
    let bestIndex = 0;
    // The place taken for this line stays while it covers nothing, so the bubble does not hop as the agent turns to it.
    if (this.chosen >= 0 && overlapOf(candidates[this.chosen]) === 0) {
      best = candidates[this.chosen];
      bestOverlap = 0;
      bestIndex = this.chosen;
    } else
      for (const [index, candidate] of candidates.entries()) {
        const overlap = overlapOf(candidate);
        if (overlap < bestOverlap) {
          best = candidate;
          bestOverlap = overlap;
          bestIndex = index;
        }
        if (overlap === 0) break;
      }
    this.chosen = bestIndex;
    this.box = best;
    this.overlapping = bestOverlap;
    this.element.style.transform = `translate3d(${Math.round(best.left)}px, ${-Math.round(height - best.bottom)}px, 0)`;
  }

  /** How much of what it must keep clear the bubble covers where it last went, in square CSS pixels: 0 is none. */
  overlapping = 0;
}

/*
  A rest when the page is left alone. After 40 seconds with no input, or at once when the reader switches tabs, the
  object drops a dimension and rests as a cube (rest-motion.ts says how it looks), one quiet line shows under the bio
  and the tab's title says so. Any input wakes it over about a second, at once under reduced motion. Reading is not idle: it never starts while
  a card, the sheet, Find me, a search or a ride is open, while a finger or a button is down, or during the unfold.
  On a tab switch no frame is drawn, so the rest is formed at once and the reader comes back to it.
*/
import { element } from "@/lib/about-cv/scene/dom";
import type { HypercubeScene } from "./hypercube-scene";

/** How long the page must be left alone before it rests, in milliseconds. */
const IDLE_MILLISECONDS = 40_000;

/** What the rest says, on the page and in the tab's title. */
const REST_WORDS = { line: "Resting in three dimensions.", title: "Resting in three dimensions" };

export class Idle {
  readonly line = element("p", "cube-rest-line");
  private timer = 0;
  private readonly awakeTitle = document.title;
  /** Whether the object may rest now: false while the reader is reading something or has a hand on it. */
  mayRest: () => boolean = () => true;
  /** Called as the object goes to rest and as it wakes. */
  onRest: (resting: boolean) => void = () => {};

  constructor(private readonly scene: HypercubeScene) {
    this.line.hidden = true;
    this.line.setAttribute("aria-live", "polite");
    scene.elements.title.append(this.line);
    const wake = () => this.wake();
    for (const type of ["pointerdown", "wheel", "keydown", "touchstart"]) document.addEventListener(type, wake, { capture: true, passive: true });
    document.addEventListener("pointermove", (event) => event.pointerType === "mouse" && this.wake(), { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.rest(true);
    });
    this.wait();
  }

  isResting() {
    return this.scene.rest.isResting();
  }

  private wait() {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.rest(false), IDLE_MILLISECONDS);
  }

  /** Any input: the object wakes, and the wait begins again. */
  wake() {
    if (this.isResting()) {
      this.scene.rest.goTo(false);
      this.line.hidden = true;
      document.title = this.awakeTitle;
      this.scene.elements.stage.removeAttribute("data-cube-resting");
      this.onRest(false);
      this.scene.requestFrame();
    }
    this.wait();
  }

  /** Rests now, formed at once when the page is hidden (no frame is drawn until the reader is back). */
  rest(hidden: boolean) {
    if (this.isResting()) return;
    if (!this.mayRest() || !this.scene.unfold.isDone()) return this.wait();
    this.scene.rest.goTo(true, hidden);
    this.line.textContent = REST_WORDS.line;
    this.line.hidden = false;
    document.title = REST_WORDS.title;
    this.scene.elements.stage.setAttribute("data-cube-resting", "");
    this.onRest(true);
    this.scene.requestFrame();
  }
}

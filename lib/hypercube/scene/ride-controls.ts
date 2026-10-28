/*
  The ride's controls and its peek. "Ride through time" with its play glyph sits by Lay out time and reads "Pause" while
  the ride plays and "Resume" while it waits. While a ride is on, Previous event and Next event flank it as glyphs.
  The peek is a small card under the bio, where the hint was: the event the point has reached, its glyph and name, and
  its card's own words for when and where. A tap on it opens the full card.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent } from "@/lib/about-cv/glyphs";
import { controlGlyphs, glyphElement, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { hypercubeGlyphs } from "@/lib/hypercube/icons";
import { peekWords } from "@/lib/hypercube/ride";
import type { RidePlayer, RideState } from "./ride-player";

/** What the main control says and shows in each state of the ride. */
const MAIN_CONTROL: Record<RideState, { text: string; glyph: Glyph }> = {
  off: { text: "Ride through time", glyph: hypercubeGlyphs.play },
  ended: { text: "Ride through time", glyph: hypercubeGlyphs.play },
  playing: { text: "Pause", glyph: hypercubeGlyphs.pause },
  paused: { text: "Resume", glyph: hypercubeGlyphs.play },
};

/** How long the peek takes to change from one event to the next, in milliseconds. */
const PEEK_CHANGE_MILLISECONDS = 150;

function glyphButton(glyph: Glyph, label: string, className: string) {
  const button = element("button", className);
  button.type = "button";
  button.dataset.cubeControl = "";
  button.setAttribute("aria-label", label);
  button.append(glyphElement(glyph, "cube-icon"));
  return button;
}

export class RideControls {
  readonly row = element("div", "cube-view-row cube-ride-row");
  readonly main = element("button", "cube-control cube-ride");
  readonly previous = glyphButton(controlGlyphs.previous, "Previous event", "cube-control cube-ride-step");
  readonly next = glyphButton(controlGlyphs.next, "Next event", "cube-control cube-ride-step");
  readonly peek = element("button", "cube-peek");
  private readonly mainWords = element("span");
  private peekTimer = 0;
  /** Called when the peek is opened, so the full card shows. */
  onOpen: (event: WorldEvent) => void = () => {};
  /** Called when the peek shows or hides, so the words in the scene keep off it. */
  onPeekShown: () => void = () => {};

  constructor(private readonly player: RidePlayer) {
    this.main.type = "button";
    this.main.dataset.cubeControl = "";
    this.row.dataset.cubeControl = "";
    this.row.append(this.previous, this.main, this.next);
    this.main.addEventListener("click", () => player.toggle());
    this.previous.addEventListener("click", () => player.stepBy(-1));
    this.next.addEventListener("click", () => player.stepBy(1));
    this.peek.type = "button";
    this.peek.hidden = true;
    this.peek.dataset.cubeControl = "";
    this.peek.setAttribute("aria-live", "polite");
    this.show("off");
    player.onState = (state) => this.show(state);
    player.onReach = (event) => this.peekAt(event);
  }

  private show(state: RideState) {
    const { text, glyph } = MAIN_CONTROL[state];
    this.mainWords.textContent = text;
    this.main.replaceChildren(glyphElement(glyph, "cube-icon"), this.mainWords);
    const on = state === "playing" || state === "paused";
    this.previous.hidden = !on;
    this.next.hidden = !on;
    this.row.toggleAttribute("data-cube-riding", on);
  }

  /** The peek follows the point: the event it has reached, or nothing before the first and after the last. */
  private peekAt(event: WorldEvent | null) {
    window.clearTimeout(this.peekTimer);
    if (!event) {
      if (this.peek.hidden) return;
      this.peek.hidden = true;
      this.onPeekShown();
      return;
    }
    const fill = () => {
      const name = element("strong");
      name.append(glyphElement(glyphOfEvent(event), "cube-icon"), element("span", undefined, event.label));
      this.peek.replaceChildren(name, element("span", "cube-peek-when", peekWords(event)));
      this.peek.onclick = () => this.onOpen(event);
      this.peek.dataset.cubePeekChanging = "";
      requestAnimationFrame(() => delete this.peek.dataset.cubePeekChanging);
    };
    const wasHidden = this.peek.hidden;
    if (wasHidden || this.player.state !== "playing") {
      fill();
      this.peek.hidden = false;
      if (wasHidden) this.onPeekShown();
      return;
    }
    this.peek.dataset.cubePeekChanging = "";
    this.peekTimer = window.setTimeout(fill, PEEK_CHANGE_MILLISECONDS);
  }
}

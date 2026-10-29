/*
  Search. On a computer, typing anywhere starts one; on a phone the Search control opens the keyboard. What the query
  finds (lib/about-cv/search.ts, shared by every version) lights in the object: every event it finds is lit, every
  skill it finds gathers its dust to its events, every city it names lights its name, and the lit rules place the
  words. One line says how many. Enter flies to the first, and Enter and the arrows step through them.

  A search starts only when no field has the focus and no card, sheet or Find me is open. On a phone the field stands
  just above the keyboard: iOS shrinks the visual viewport, not the layout one, so the field is placed by the visual
  viewport, read only when it changes.
*/
import { stays } from "@/content/about/profile";
import { controlGlyphs, glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { searchCv, searchLine, searchStepLine, type SearchResult } from "@/lib/about-cv/search";
import { closeButton } from "@/lib/about-cv/ui/event-card";
import type { HypercubeScene } from "./hypercube-scene";
import type { Interaction } from "./interaction";

const CITIES = stays.map((stay) => stay.city);

/** The keys that start a search when typed anywhere: a letter or a digit, so every other key keeps its job. */
export const startsASearch = (event: KeyboardEvent) =>
  !event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && /[a-z0-9]/i.test(event.key);

export class Search {
  readonly box = element("div", "cube-search");
  readonly input = element("input");
  readonly line = element("p", "cube-search-line");
  private result: SearchResult = { query: "", events: [], skills: [], cities: [] };
  private step = -1;
  /** Called when the search opens or closes, so the controls can measure and the ride can pause. */
  onChange: () => void = () => {};

  constructor(
    private readonly scene: HypercubeScene,
    private readonly interaction: Interaction,
  ) {
    this.build();
    scene.elements.stage.append(this.box);
    if (window.visualViewport) {
      const place = () => this.placeAboveKeyboard();
      window.visualViewport.addEventListener("resize", place);
      window.visualViewport.addEventListener("scroll", place);
    }
  }

  private build() {
    this.box.hidden = true;
    this.box.dataset.cubeControl = "";
    this.box.setAttribute("role", "search");
    const field = element("label", "cube-search-field");
    this.input.type = "search";
    this.input.placeholder = "Type a skill, a course or a place";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.enterKeyHint = "search";
    field.append(glyphElement(controlGlyphs.search, "cube-icon"), element("span", "cube-hidden", "Search"), this.input);
    const close = closeButton("cube", () => this.close(), "Close the search");
    close.classList.add("cube-search-close");
    field.append(close);
    this.line.setAttribute("aria-live", "polite");
    this.box.append(field, this.line);
    this.input.addEventListener("input", () => this.run());
    this.input.addEventListener("keydown", (event) => {
      const forward = event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowRight";
      const back = event.key === "ArrowUp" || event.key === "ArrowLeft";
      if (!forward && !back) return;
      event.preventDefault();
      this.goTo(back ? this.step - 1 : this.step < 0 ? 0 : this.step + 1);
    });
  }

  isOpen() {
    return !this.box.hidden;
  }

  /** Opens the field, with the first key in it when typing started it. */
  open(first = "") {
    this.box.hidden = false;
    this.input.value = first;
    this.input.focus({ preventScroll: true });
    this.placeAboveKeyboard();
    this.run();
    this.onChange();
  }

  /** Clears and closes. Says whether it was open. */
  close() {
    if (this.box.hidden) return false;
    this.box.hidden = true;
    this.input.value = "";
    this.run();
    this.input.blur();
    this.onChange();
    return true;
  }

  /** On a phone the field stands just above the keyboard, from where the visual viewport ends. */
  private placeAboveKeyboard() {
    const viewport = window.visualViewport;
    if (!viewport || this.box.hidden) return;
    const keyboard = Math.max(0, window.innerHeight - (viewport.offsetTop + viewport.height));
    this.box.style.setProperty("--cube-search-bottom", `${Math.round(keyboard + 10)}px`);
  }

  /** Finds what the field holds and lights it in the object. */
  private run() {
    const { scene } = this;
    this.step = -1;
    this.result = searchCv(this.input.value, { events: scene.data.events, skills: scene.data.skills, cities: CITIES });
    if (!this.result.query) {
      this.line.textContent = "";
      scene.setFound(null);
      return;
    }
    // A search is the top thing: a card or a lit skill gives way to it.
    this.interaction.clear();
    scene.setFound({
      events: new Set(this.result.events.map((event) => event.id)),
      skills: new Set(this.result.skills),
      cities: new Set(this.result.cities),
    });
    this.line.textContent = searchLine(this.result);
  }

  /** Goes to a find by its place in the list: the camera flies there and the line names it. */
  private goTo(index: number) {
    const { events, skills } = this.result;
    if (!events.length) {
      // Only skills hold it: light the first one instead.
      if (skills.length) this.interaction.lightSkill(skills[0]);
      return;
    }
    this.step = (index + events.length) % events.length;
    const event = events[this.step];
    this.line.textContent = searchStepLine(this.step, events.length, event.label);
    this.interaction.flyTo(event);
  }

  /** For the checks: what the search holds. */
  report() {
    return { open: this.isOpen(), line: this.line.textContent, events: this.result.events.map((event) => event.id), skills: this.result.skills.map((skill) => skill.word) };
  }
}

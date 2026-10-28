/*
  Search. The world is made of letters, so letters search it. On a computer, typing anywhere starts a search; on a
  phone the Search control opens the keyboard. What the query finds is the shared matcher's (lib/about-cv/search.ts,
  as every version finds it): the events whose card holds it, the skills and the cities that do. Here every letter on
  the land that spells it lights near white, the skills it found light in the sky, and so does a city it names. The
  camera frames the events that hold it, one quiet line says how many, Enter goes to the first and the arrows step
  through them.

  A search starts only when no field has the focus and no card, sheet or Find me is open. On a phone the field sits
  just above the keyboard: iOS shrinks the visual viewport, not the layout one, so the field is placed by the visual
  viewport, read only when it changes.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { controlGlyphs, glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { searchCv } from "@/lib/about-cv/search";
import { closeButton } from "@/lib/about-cv/ui/event-card";
import { cities } from "@/lib/letters/land/cities";
import type { EventOnLand } from "@/lib/letters/land/land";
import type { Interaction } from "./interaction";
import type { LettersScene } from "./letters-scene";

/** How long the camera waits after the last key before framing the matches, in milliseconds. */
const FRAME_AFTER = 180;

type Match = { kind: "event"; item: EventOnLand } | { kind: "city"; index: number };

const plural = (count: number, one: string, many: string) => (count === 1 ? `1 ${one}` : `${count === 0 ? "no" : count} ${many}`);

/** The line under the field: what the search lights, or that nothing spells it. */
export function searchLine(query: string, events: number, skills: number, places: number) {
  if (!events && !skills && !places) return `Nothing here spells "${query}".`;
  const parts = [plural(events + places, "place on the land", "places on the land"), plural(skills, "skill", "skills")];
  return `"${query}" lights ${parts.join(" and ")}. Enter goes to the first.`;
}

export class Search {
  readonly box = element("div", "letters-search");
  readonly input = element("input");
  readonly line = element("p", "letters-search-line");
  private matches: Match[] = [];
  private step = -1;
  private frameTimer = 0;
  private readonly lit: Float32Array;
  /** The events the search holds now, by id, for the land's dimming. */
  matchedIds: Set<string> | null = null;
  matchedCities = new Set<number>();
  onChange: () => void = () => {};

  constructor(
    private readonly scene: LettersScene,
    private readonly interaction: Interaction,
  ) {
    const { land } = scene.data;
    this.lit = new Float32Array(land.instances.count);
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
    this.box.dataset.lettersControl = "";
    this.box.setAttribute("role", "search");
    const field = element("label", "letters-search-field");
    this.input.type = "search";
    this.input.placeholder = "Type a skill, a place or a course";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.enterKeyHint = "search";
    field.append(glyphElement(controlGlyphs.search, "letters-icon"), element("span", "letters-hidden", "Find on the land"), this.input);
    const close = closeButton("letters", () => this.close(), "Close the search");
    close.className = "letters-control letters-search-close";
    field.append(close);
    this.line.setAttribute("aria-live", "polite");
    this.box.append(field, this.line);
    this.input.addEventListener("input", () => this.run());
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.goTo(this.step < 0 ? 0 : this.step + 1);
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        this.goTo(this.step + 1);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        this.goTo(this.step - 1);
      }
    });
  }

  isOpen() {
    return !this.box.hidden;
  }

  /** Opens the field, with the first letter typed when typing started it. */
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
    this.box.style.setProperty("--letters-search-bottom", `${Math.round(keyboard + 10)}px`);
  }

  /** Finds what the field holds: lights the cells that spell it and the skills that hold it, and counts them. */
  private run() {
    const { scene } = this;
    const { land, skills } = scene.data;
    const query = this.input.value.trim();
    const upper = query.toUpperCase();
    this.lit.fill(0);
    this.step = -1;
    this.matches = [];
    this.matchedCities = new Set();
    if (!query) {
      this.matchedIds = null;
      this.interaction.searching = null;
      this.line.textContent = "";
      scene.landLayer.setLitCells(this.lit);
      scene.litWords = this.interaction.litSkill ? new Set([skills.indexOf(this.interaction.litSkill)]) : new Set();
      this.interaction.applyOwnerStates();
      return;
    }
    const found = searchCv(query, { events: land.events.map((item) => item.event), skills, cities: cities.map((city) => city.name) });
    const foundIds = new Set(found.events.map((event) => event.id));
    // Which of the found events' letters spell the query: every place it stands in the stream its land spells.
    const spelled = new Map<number, Set<number>>();
    for (const item of land.events) {
      if (!foundIds.has(item.event.id)) continue;
      const indices = new Set<number>();
      for (let at = item.stream.text.indexOf(upper); at >= 0; at = item.stream.text.indexOf(upper, at + 1))
        for (let offset = 0; offset < upper.length; offset++) indices.add(at + offset);
      spelled.set(item.index, indices);
    }
    land.instances.cell.forEach((cell, index) => {
      const owner = land.owners[cell];
      if (!land.ownerIsCity(owner) && spelled.get(owner)?.has(land.instances.stream[index])) this.lit[index] = 1;
    });
    scene.landLayer.setLitCells(this.lit);
    const events = land.events.filter((item) => spelled.has(item.index)).sort(newestFirst);
    const skillIndices = found.skills.map((skill) => skills.indexOf(skill));
    cities.forEach((city, index) => {
      if (found.cities.includes(city.name)) this.matchedCities.add(index);
    });
    scene.litWords = new Set(skillIndices);
    this.matchedIds = new Set(events.map((item) => item.event.id));
    this.interaction.searching = { events: this.matchedIds, cities: this.matchedCities };
    this.matches = [...events.map((item) => ({ kind: "event" as const, item })), ...[...this.matchedCities].map((index) => ({ kind: "city" as const, index }))];
    this.line.textContent = searchLine(query, events.length, skillIndices.length, this.matchedCities.size);
    this.interaction.applyOwnerStates();
    window.clearTimeout(this.frameTimer);
    if (events.length) this.frameTimer = window.setTimeout(() => this.interaction.frameEvents(events), FRAME_AFTER);
  }

  /** Goes to a match, by its place in the list: the camera flies there and the line names it. */
  private goTo(index: number) {
    if (!this.matches.length) {
      // Only skills hold it: light the first one instead.
      const first = [...this.scene.litWords][0];
      if (first !== undefined) this.interaction.lightSkill(this.scene.data.skills[first]);
      return;
    }
    this.step = (index + this.matches.length) % this.matches.length;
    const match = this.matches[this.step];
    const name = match.kind === "event" ? match.item.event.label : cities[match.index].name;
    this.line.textContent = `${this.step + 1} of ${this.matches.length}: ${name}.`;
    if (match.kind === "event") this.interaction.flyTo(match.item);
    else this.interaction.flyToCity(match.index);
  }
}

const newestFirst = (first: EventOnLand, second: EventOnLand) => endOf(second.event) - endOf(first.event);
const endOf = (event: WorldEvent) => event.end ?? event.start;

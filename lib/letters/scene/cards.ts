/*
  The card that opens over the land: an event's, through the shared card body (lib/about-cv/ui/event-card.ts), or a
  city's, written here. A city's card says only what the CV says: the city, the CV's years there, and the events of
  those years as buttons that open their own cards. The card's words sit in one wrapper, so the flight can hide them
  while the letters land on their places, then show them.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent } from "@/lib/about-cv/glyphs";
import { glyphElement, placeGlyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";
import { cardHeading, closeButton, fillEventCard } from "@/lib/about-cv/ui/event-card";
import { cities, type City } from "@/lib/letters/land/cities";

export const PREFIX = "letters";

export type CardOptions = {
  events: WorldEvent[];
  skills: SkillWord[];
  onClose(): void;
  onSkill(skill: SkillWord): void;
  onEvent(event: WorldEvent): void;
};

/** The events a city's card lists: those drawn in the city's years, newest first. */
export function eventsOfCity(city: City, events: WorldEvent[]) {
  const index = cities.indexOf(city);
  const until = cities[index + 1]?.from ?? Infinity;
  return events
    .filter((event) => {
      const at = event.end ?? event.start;
      return at >= city.from && at < until;
    })
    .sort((first, second) => (second.end ?? second.start) - (first.end ?? first.start));
}

export class Card {
  readonly panel = element("section", "letters-card letters-panel");
  /** What the card shows now: an event's id, a city's name, or null. */
  showing: { kind: "event"; event: WorldEvent } | { kind: "city"; city: City } | null = null;

  constructor(private readonly options: CardOptions) {
    this.panel.hidden = true;
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("data-letters-control", "");
    this.panel.tabIndex = -1;
  }

  /** The wrapper holding every word of the card, which the flight hides until its letters land. */
  words() {
    return this.panel.querySelector<HTMLElement>(".letters-card-text");
  }

  private wrapWords() {
    const close = this.panel.querySelector(`.${PREFIX}-close`);
    const words = element("div", "letters-card-text");
    for (const child of [...this.panel.children]) if (child !== close) words.append(child);
    this.panel.append(words);
  }

  showEvent(event: WorldEvent, keepFocus = false) {
    const restoreFocus = fillEventCard(
      this.panel,
      event,
      {
        prefix: PREFIX,
        events: this.options.events,
        skills: this.options.skills,
        onClose: this.options.onClose,
        onSkill: this.options.onSkill,
        onStep: this.options.onEvent,
      },
      keepFocus,
    );
    this.wrapWords();
    this.panel.setAttribute("aria-label", event.label);
    this.showing = { kind: "event", event };
    this.panel.hidden = false;
    restoreFocus();
  }

  showCity(city: City) {
    const heading = cardHeading(PREFIX, placeGlyph, city.name);
    const list = element("ul", "letters-place-events");
    for (const event of eventsOfCity(city, this.options.events)) {
      const item = element("li");
      const button = element("button", "letters-place-event");
      button.type = "button";
      button.append(glyphElement(glyphOfEvent(event), `${PREFIX}-icon`), event.label);
      button.addEventListener("click", () => this.options.onEvent(event));
      item.append(button);
      list.append(item);
    }
    const words = element("div", "letters-card-text");
    words.append(heading, element("p", "letters-card-meta", city.inTheCv), element("p", "letters-card-meta", "In these years:"), list);
    this.panel.replaceChildren(closeButton(PREFIX, this.options.onClose), words);
    this.panel.setAttribute("aria-label", city.name);
    this.showing = { kind: "city", city };
    this.panel.hidden = false;
  }

  close() {
    if (this.panel.hidden) return false;
    this.panel.hidden = true;
    this.panel.removeAttribute("data-letters-arriving");
    this.showing = null;
    return true;
  }
}

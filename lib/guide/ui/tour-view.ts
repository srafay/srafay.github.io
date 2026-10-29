/*
  The tour's sections after the first screen, built from the narration and the CV. Each is a flat field with its name
  set huge beside its world's glyph, then a chat: the agent's line, light, and the item it presents beside it, as a
  dark card. A tap on a card opens its full entry. A project with public code shows a repository card: its name, the
  CV's line and the link, nothing else.
*/
import { cardMeta } from "@/lib/about-cv/answers";
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfWorld } from "@/lib/about-cv/glyphs";
import { glyphElement, linkGlyphs, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { WorldKey } from "@/lib/about-cv/worlds";
import type { SectionKey } from "@/lib/guide/palette";
import type { Exchange } from "@/lib/guide/script/lines";
import { SECTION_TITLES, TOUR_ORDER } from "@/lib/guide/tour";
import { guideGlyphs } from "@/lib/guide/icons";

/** The glyph beside each section's name: its world's, where it is a world. */
const SECTION_GLYPHS: Partial<Record<SectionKey, Glyph>> = {
  now: glyphOfWorld("work"),
  work: glyphOfWorld("work"),
  study: glyphOfWorld("study"),
  projects: glyphOfWorld("projects"),
  courses: glyphOfWorld("courses"),
  offTheClock: glyphOfWorld("offTheClock" as WorldKey),
};

export type TourHandlers = {
  openEvent(event: WorldEvent, from: HTMLElement): void;
  /** Builds what an extra holds: the mockups, the skills, the links, the tricks. */
  extra(kind: NonNullable<Exchange["extra"]>, section: SectionKey): HTMLElement;
};

/** "https://github.com/srafay/Flask-App" as "srafay/Flask-App". */
export const repositoryName = (address: string) => address.replace(/^https:\/\/github\.com\//, "");

/** The card a line presents: the event's glyph, its name, when and where, and its first line from the CV. */
function card(event: WorldEvent, handlers: TourHandlers) {
  const holder = element("div", "guide-card");
  holder.dataset.event = event.id;
  const open = element("button", "guide-card-open");
  open.type = "button";
  const heading = element("span", "guide-card-title");
  heading.append(glyphElement(glyphOfEvent(event), "guide-icon"), element("span", undefined, event.world === "work" && event.subtitle ? event.subtitle : event.title));
  open.append(heading);
  const second = event.world === "work" ? event.title : event.subtitle;
  if (second) open.append(element("span", "guide-card-meta", second));
  open.append(element("span", "guide-card-meta", cardMeta(event)));
  const firstLine = event.lines[0];
  if (firstLine) open.append(element("span", "guide-card-line", firstLine));
  open.setAttribute("aria-label", `${event.label}: open its full entry`);
  open.addEventListener("click", () => handlers.openEvent(event, open));
  holder.append(open);
  if (event.address) {
    const repository = element("a", "guide-repository");
    repository.href = event.address;
    repository.rel = "noopener";
    repository.append(glyphElement(linkGlyphs.GitHub, "guide-icon"), element("span", undefined, repositoryName(event.address)));
    holder.append(repository);
  }
  return holder;
}

function exchangeElement(exchange: Exchange, eventsById: Map<string, WorldEvent>, section: SectionKey, handlers: TourHandlers) {
  const row = element("li", "guide-exchange");
  const line = element("p", "guide-line", exchange.line);
  line.dataset.line = exchange.line;
  row.append(line);
  const event = exchange.eventId ? eventsById.get(exchange.eventId) : undefined;
  if (event) row.append(card(event, handlers));
  if (exchange.extra) {
    row.classList.add("guide-exchange-wide");
    row.append(handlers.extra(exchange.extra, section));
  }
  return row;
}

/** The section's name, huge, with its world's glyph. */
function sectionHeading(key: SectionKey) {
  const heading = element("h2", "guide-section-name");
  const glyph = SECTION_GLYPHS[key] ?? (key === "findMe" ? guideGlyphs.backToSystem : undefined);
  if (glyph) heading.append(glyphElement(glyph, "guide-icon guide-section-glyph"));
  heading.append(element("span", undefined, SECTION_TITLES[key]));
  heading.id = `guide-section-${key}`;
  return heading;
}

/** Builds every section after the first screen into the tour, and the first screen's own lines into its chat. */
export function buildTour(
  tour: HTMLElement,
  narration: Record<SectionKey, Exchange[]>,
  events: WorldEvent[],
  handlers: TourHandlers,
) {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  for (const key of TOUR_ORDER) {
    if (key === "hello") continue;
    const section = element("section", `guide-section guide-field-${key}`);
    section.dataset.section = key;
    section.setAttribute("aria-labelledby", `guide-section-${key}`);
    const list = element("ul", "guide-chat");
    for (const exchange of narration[key]) list.append(exchangeElement(exchange, eventsById, key, handlers));
    section.append(sectionHeading(key), list);
    tour.append(section);
  }
  return [...tour.querySelectorAll<HTMLElement>(".guide-line")];
}

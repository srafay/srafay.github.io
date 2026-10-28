/*
  Searching the CV, as every version of the About page does it: a query to the events, skills and cities that hold it.
  An event holds a query when its card's own text does, the text a reader sees when it opens: its heading, its second
  line, when and where, its lines from the CV, the clue for an undated one, and the skills it names. A skill holds it
  when its word does, a city when its name does. Case is ignored. Pure: no page, no scene.
*/
import { cardMeta } from "@/lib/about-cv/answers";
import type { WorldEvent } from "@/lib/about-cv/events";
import type { SkillWord } from "@/lib/about-cv/skills";

/** How a card's pieces are joined when its text is read as one, as version 7's land spells it. */
const PIECE_JOIN = " · ";

/** The card's heading: the organisation for work, the title for the rest (as lib/about-cv/ui/event-card.ts). */
export const cardHeadingOf = (event: WorldEvent) =>
  event.subtitle && event.world === "work" ? event.subtitle : event.title;

/** The card's text, piece by piece, in its order. */
export function cardPieces(event: WorldEvent) {
  const heading = cardHeadingOf(event);
  const pieces = [heading];
  const second = event.world === "work" ? event.title : event.subtitle;
  if (second && second !== heading) pieces.push(second);
  pieces.push(cardMeta(event), ...event.lines);
  if (event.evidence) pieces.push(event.evidence);
  if (event.skills.length) pieces.push(event.skills.join(", "));
  return pieces;
}

/** The card's whole text, read as one. */
export const cardText = (event: WorldEvent) => cardPieces(event).join(PIECE_JOIN);

/** Where to look: the events, the skills, and the cities by name. */
export type SearchSpace = { events: WorldEvent[]; skills: SkillWord[]; cities: string[] };

export type SearchResult = {
  query: string;
  /** Newest first, by when each ends. */
  events: WorldEvent[];
  skills: SkillWord[];
  cities: string[];
};

const endOf = (event: WorldEvent) => event.end ?? event.start;
const folded = (text: string) => text.toUpperCase();

/** What a query finds. An empty query finds nothing. */
export function searchCv(query: string, space: SearchSpace): SearchResult {
  const wanted = folded(query.trim());
  if (!wanted) return { query: "", events: [], skills: [], cities: [] };
  return {
    query: query.trim(),
    events: space.events
      .filter((event) => folded(cardText(event)).includes(wanted))
      .sort((first, second) => endOf(second) - endOf(first)),
    skills: space.skills.filter((skill) => folded(skill.word).includes(wanted)),
    cities: space.cities.filter((city) => folded(city).includes(wanted)),
  };
}

const counted = (count: number, one: string, many: string) =>
  count === 1 ? `1 ${one}` : `${count === 0 ? "no" : count} ${many}`;

/** The line under the field: what the search lights, or that nothing in the CV holds it. */
export function searchLine({ query, events, skills }: SearchResult) {
  if (!events.length && !skills.length) return `Nothing in the CV holds "${query}".`;
  return `"${query}" lights ${counted(events.length, "event", "events")} and ${counted(skills.length, "skill", "skills")}. Enter goes to the first.`;
}

/** The line while the reader steps through what was found: "1 of 10: Atelier." */
export const searchStepLine = (step: number, count: number, name: string) => `${step + 1} of ${count}: ${name}.`;

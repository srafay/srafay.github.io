/*
  The words the page says back: where a lit skill was used, and what an event's card holds. Plain sentences built from
  the data, so the scene, the keyboard layer and the lists all say the same thing.
*/
import { UNDATED, type WorldEvent } from "@/lib/world-lines/events";
import type { SkillWord } from "@/lib/world-lines/skills";

const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

const countInWords = (count: number) => COUNT_WORDS[count] ?? String(count);

/** "A", "A and B", "A, B and C". */
export function listInWords(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The years the events span, from their marks in time: "2018", "2018 to 2026". */
function yearsOf(events: WorldEvent[]) {
  const years = events.map((event) => Math.floor(event.start));
  const first = Math.min(...years);
  const last = Math.max(
    ...events.map((event) => Math.floor(event.end ?? event.start)),
  );
  return first === last ? String(first) : `${first} to ${last}`;
}

/** How an event is named in a sentence: a role by its organisation, a course or project by its short name. */
export const nameInSentence = (event: WorldEvent) => event.label;

export type SkillAnswer = {
  skill: string;
  sentence: string;
  events: WorldEvent[];
};

/**
 * Where a skill was used: "Flask: four events, 2018. Media Research & Innovations, Flask REST APIs, Image Recognition
 * API and Media Icon." A skill no event names says where the CV lists it.
 */
export function skillAnswer(
  skill: SkillWord,
  eventsById: Map<string, WorldEvent>,
): SkillAnswer {
  const events = skill.events
    .map((id) => eventsById.get(id))
    .filter((event): event is WorldEvent => Boolean(event))
    .sort((first, second) => second.start - first.start);
  if (!events.length)
    return {
      skill: skill.word,
      sentence: `Listed in the CV under ${skill.group}. No role, project or course names it.`,
      events,
    };
  const count =
    events.length === 1 ? "One event" : `${countInWords(events.length)} events`;
  return {
    skill: skill.word,
    sentence: `${count}, ${yearsOf(events)}: ${listInWords(events.map(nameInSentence))}.`,
    events,
  };
}

/** The card's line under the heading: the organisation, then when and where. */
export function cardMeta(event: WorldEvent) {
  const when = event.dates === UNDATED ? `${UNDATED}.` : event.dates;
  return event.place && event.dates !== UNDATED
    ? `${when}, ${event.place}`
    : when;
}

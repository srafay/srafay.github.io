/*
  The words the page says back: where a lit skill was used, and what an event's card holds. Plain sentences built from
  the data, so the scene, the keyboard layer and the lists all say the same thing.
*/
import { UNDATED, type EventKind, type WorldEvent } from "@/lib/about-cv/events";
import type { SkillWord } from "@/lib/about-cv/skills";

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
      sentence: `Listed under ${skill.group}. No role, project or course names it.`,
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

const KIND_NOUNS: Record<EventKind, [string, string]> = {
  role: ["role", "roles"],
  internship: ["internship", "internships"],
  degree: ["degree", "degrees"],
  thesis: ["thesis", "theses"],
  project: ["project", "projects"],
  course: ["course", "courses"],
  activity: ["activity", "activities"],
  pastime: ["pastime", "pastimes"],
};

/** "7 roles and 2 internships": what a world holds, counted by kind, in the order its events first appear. */
export function kindsInWords(events: WorldEvent[]) {
  const counts = new Map<EventKind, number>();
  for (const event of events) counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  const parts = [...counts].map(([kind, count]) => `${count} ${KIND_NOUNS[kind][count === 1 ? 0 : 1]}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
}

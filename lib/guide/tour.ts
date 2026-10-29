/*
  The tour's order and what each section holds. The order: what he does now, then the work, what it stands on, what
  he built, what he keeps learning, the person off the clock, the index of every skill, and where to find him. The
  narration (script/lines.ts) gives each section its exchanges; checkTour makes sure the whole CV is on the tour.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import type { SectionKey } from "@/lib/guide/palette";
import { narration } from "@/lib/guide/script/lines";

export const TOUR_ORDER: SectionKey[] = [
  "hello",
  "now",
  "work",
  "study",
  "projects",
  "courses",
  "offTheClock",
  "skills",
  "findMe",
];

/** Each section's heading, set huge. The first screen's heading is the name itself. */
export const SECTION_TITLES: Record<SectionKey, string> = {
  hello: "",
  now: "Now",
  work: "Work",
  study: "Study",
  projects: "Projects",
  courses: "Courses",
  offTheClock: "Off the clock",
  skills: "Skills",
  findMe: "Find me",
};

/** Which side the agent rests on in each section on a computer, so it moves between sections. */
export const PERCH_SIDE: Record<SectionKey, "left" | "right"> = {
  hello: "left",
  now: "right",
  work: "left",
  study: "right",
  projects: "left",
  courses: "right",
  offTheClock: "left",
  skills: "right",
  findMe: "left",
};

/** Fails the build if the narration names an event that does not exist, or leaves a CV event off the tour. */
export function checkTour(events: WorldEvent[]) {
  const ids = new Set(events.map((event) => event.id));
  const placed = new Set<string>();
  for (const [section, exchanges] of Object.entries(narration()))
    for (const exchange of exchanges) {
      if (!exchange.eventId) continue;
      if (!ids.has(exchange.eventId)) throw new Error(`The ${section} section names ${exchange.eventId}, which is not an event`);
      placed.add(exchange.eventId);
    }
  const missing = events.filter((event) => !placed.has(event.id)).map((event) => event.id);
  if (missing.length) throw new Error(`Not on the tour: ${missing.join(", ")}`);
}

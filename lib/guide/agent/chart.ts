/*
  The chart the agent makes: a real bar chart of the CV by year, from the shared events (lib/about-cv/events.ts). Each
  bar counts the items under way in its year. One rule each, so a change of rule is one line:
  - an item with a span counts in every year its span overlaps, its end exclusive, so a course that ends on the last
    day of December is not counted in the next year;
  - an item at a point counts in its year;
  - an undated item counts where every version places it, by its clue.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { FIRST_YEAR } from "@/lib/about-cv/time";

export type YearBar = { year: number; count: number };

/** Whether an item was under way in a year. */
export function underWayIn(event: WorldEvent, year: number) {
  if (event.end === undefined) return Math.floor(event.start) === year;
  return event.start < year + 1 && event.end > year;
}

/** One bar a year, from the CV's first year to the present's. */
export function cvByYear(events: WorldEvent[], present: number): YearBar[] {
  const bars: YearBar[] = [];
  for (let year = FIRST_YEAR; year <= Math.floor(present); year++)
    bars.push({ year, count: events.filter((event) => underWayIn(event, year)).length });
  return bars;
}

/** The tallest bar; the earliest of any tie. */
export const tallestOf = (bars: YearBar[]) => bars.reduce((tallest, bar) => (bar.count > tallest.count ? bar : tallest), bars[0]);

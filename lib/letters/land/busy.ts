/*
  The busy base. The land is a sum: the ground itself stands at the base of everything under way at the time, and each
  event rises from it. So a year with many things at once is a raised plateau, its events a range on top, and a year
  with one thing is low ground with a lone ridge. busy(t) counts the events
  whose dated span touches t, each easing out over a little time past its span, so the base has no cliffs. No year is
  named here: the shape comes from the data alone.
*/
import { smooth } from "./rises";
import type { Span } from "./layout";

/** How far past its span an event still counts toward the base, easing to nothing, in years. */
const EASE_YEARS = 0.3;
/** How many cells of height each event under way adds to the base. */
export const BUSY_LIFT = 0.75;

export function busyAt(spans: Span[], time: number) {
  let count = 0;
  for (const { start, end } of spans) {
    const outside = time < start ? start - time : time > end ? time - end : 0;
    count += 1 - smooth(outside / EASE_YEARS);
  }
  return count;
}

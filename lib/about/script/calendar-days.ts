/*
  The contribution calendar as the script sees it: each day's count, read from the SVG's own attributes
  (components/about/contribution-calendar.tsx), and the day under a point, found with the cell arithmetic the
  drawing used (lib/about/calendar-geometry.ts).
*/
import {
  cellAtPoint,
  dayIndexAt,
  placeOfDay,
  weekdayOfDate,
} from "@/lib/about/calendar-geometry";
import { formatCount, formatDayInFull } from "@/lib/format";

const MILLISECONDS_IN_A_DAY = 86_400_000;

export function readCalendar(drawing: SVGSVGElement) {
  const counts = (drawing.dataset.counts ?? "").split(" ").map(Number);
  const firstDay = drawing.dataset.firstDay ?? "";
  const firstWeekday = weekdayOfDate(firstDay);
  const weeks = placeOfDay(counts.length - 1, firstWeekday).week + 1;
  return {
    counts,
    firstDay,
    firstWeekday,
    weeks,
    /** The drawing's own width, which a screen stretches or keeps (the box scrolls). */
    drawnWidth: drawing.viewBox.baseVal.width,
    drawnHeight: drawing.viewBox.baseVal.height,
  };
}

export type Calendar = ReturnType<typeof readCalendar>;

/** The day under a point given in the drawing's own units, if there is one. */
export function dayAtPoint(calendar: Calendar, x: number, y: number) {
  const cell = cellAtPoint(x, y, calendar.weeks);
  if (!cell) return undefined;
  const index = dayIndexAt(cell.week, cell.weekday, calendar.firstWeekday);
  return index >= 0 && index < calendar.counts.length ? index : undefined;
}

export const placeOfCalendarDay = (calendar: Calendar, index: number) =>
  placeOfDay(index, calendar.firstWeekday);

/** "2026-10-22" for the day so many days after the first. */
export function dateOfDay(calendar: Calendar, index: number) {
  const time =
    Date.parse(`${calendar.firstDay}T00:00:00Z`) +
    index * MILLISECONDS_IN_A_DAY;
  return new Date(time).toISOString().slice(0, 10);
}

const weekdayName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
  });

/** "No contributions", "1 contribution", "12 contributions": GitHub's own words. */
function countInWords(count: number) {
  if (count === 0) return "No contributions";
  return `${formatCount(count)} ${count === 1 ? "contribution" : "contributions"}`;
}

/** "12 contributions on Wednesday 22 October 2026". */
export function dayInWords(calendar: Calendar, index: number) {
  const date = dateOfDay(calendar, index);
  return `${countInWords(calendar.counts[index])} on ${weekdayName(date)} ${formatDayInFull(date)}`;
}

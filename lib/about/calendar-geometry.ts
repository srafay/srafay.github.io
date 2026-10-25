/*
  Where each day of the About page's contribution calendar sits, in the calendar's own units. Each week is a column
  from Sunday and each weekday a row. There is room on the left for the day names and above for the month names. The
  calendar (components/about/contribution-calendar.tsx) draws with these numbers. The page's script
  (lib/about/script/) finds the day under a finger or a pointer with the same ones, so the two always agree.
*/
export const CELL_SIZE = 10;
export const CELL_GAP = 3;
export const CELL_STEP = CELL_SIZE + CELL_GAP;
export const CELL_ROUNDING = 2;
export const DAY_NAME_WIDTH = 30;
export const MONTH_NAME_HEIGHT = 18;
export const DAYS_IN_A_WEEK = 7;

export const cellLeft = (week: number) => DAY_NAME_WIDTH + week * CELL_STEP;
export const cellTop = (weekday: number) =>
  MONTH_NAME_HEIGHT + weekday * CELL_STEP;
export const calendarWidth = (weeks: number) => cellLeft(weeks) - CELL_GAP;
export const calendarHeight = () => cellTop(DAYS_IN_A_WEEK) - CELL_GAP;

/** A day's square, drawn inside its cell by the rounding, which a round-joined stroke then fills back out to the cell's edge. */
export function square(left: number, top: number) {
  const side = CELL_SIZE - 2 * CELL_ROUNDING;
  return `M${left + CELL_ROUNDING} ${top + CELL_ROUNDING}h${side}v${side}h-${side}z`;
}

/** The weekday of a date written "2025-10-26", Sunday as 0, worked out in UTC like the rest of the page's dates. */
export const weekdayOfDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).getUTCDay();

/** The column and row of the day so many days after the first, given the weekday the first day falls on. */
export function placeOfDay(dayIndex: number, firstWeekday: number) {
  const fromFirstSunday = dayIndex + firstWeekday;
  return {
    week: Math.floor(fromFirstSunday / DAYS_IN_A_WEEK),
    weekday: fromFirstSunday % DAYS_IN_A_WEEK,
  };
}

/** The day in a column and row, counted from the first day. It can fall before the first day or after the last. */
export const dayIndexAt = (
  week: number,
  weekday: number,
  firstWeekday: number,
) => week * DAYS_IN_A_WEEK + weekday - firstWeekday;

/**
 * The column and row under a point in the calendar's units. Each gap is shared between the cells on either side.
 * Over the names or past the last week there is none.
 */
export function cellAtPoint(x: number, y: number, weeks: number) {
  const week = Math.floor((x - DAY_NAME_WIDTH + CELL_GAP / 2) / CELL_STEP);
  const weekday = Math.floor(
    (y - MONTH_NAME_HEIGHT + CELL_GAP / 2) / CELL_STEP,
  );
  const inside =
    week >= 0 && week < weeks && weekday >= 0 && weekday < DAYS_IN_A_WEEK;
  return inside ? { week, weekday } : undefined;
}

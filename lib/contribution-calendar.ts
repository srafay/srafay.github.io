/*
  The About page's contribution calendar, worked out from GitHub's days (content/about/contributions.json): one column
  a week with Sunday at the top, as GitHub draws it, and five shades from no contributions to the busiest days.
*/
import calendar from "@/content/about/contributions.json";

export type ContributionDay = { date: string; count: number };
export type Level = 0 | 1 | 2 | 3 | 4;
export type CalendarCell = ContributionDay & {
  week: number;
  weekday: number;
  level: Level;
};
export type MonthLabel = { week: number; name: string };

const MILLISECONDS_IN_A_DAY = 86_400_000;
const DAYS_IN_A_WEEK = 7;
const SUNDAY = 0;
// A month's name needs about three weeks of width. A month that starts closer than that to the next gets no name.
const WEEKS_A_MONTH_NAME_NEEDS = 3;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const dayNumber = (date: string) =>
  Date.parse(`${date}T00:00:00Z`) / MILLISECONDS_IN_A_DAY;
const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const monthOf = (date: string) => date.slice(0, 7);
const monthName = (date: string) => MONTH_NAMES[Number(date.slice(5, 7)) - 1];

/**
 * The counts the first three shades end at: the quarters of the days that had any contributions. A day above the
 * last of them gets the darkest shade.
 */
export function shadeLimits(days: ContributionDay[]): number[] {
  const busyDays = days
    .map((day) => day.count)
    .filter((count) => count > 0)
    .sort((smaller, larger) => smaller - larger);
  if (busyDays.length === 0) return [0, 0, 0];
  return [0.25, 0.5, 0.75].map(
    (quarter) => busyDays[Math.floor((busyDays.length - 1) * quarter)],
  );
}

/** A day's shade: none for no contributions, then one more for each limit its count is above. */
export function levelOf(count: number, limits: number[]): Level {
  if (count === 0) return 0;
  return (limits.filter((limit) => count > limit).length + 1) as Level;
}

/** Each day in its week's column and its weekday's row. The first column starts on the Sunday on or before day one. */
export function calendarCells(days: ContributionDay[]): CalendarCell[] {
  const limits = shadeLimits(days);
  const firstSunday = dayNumber(days[0].date) - weekdayOf(days[0].date);
  return days.map((day) => ({
    ...day,
    week: Math.floor((dayNumber(day.date) - firstSunday) / DAYS_IN_A_WEEK),
    weekday: weekdayOf(day.date),
    level: levelOf(day.count, limits),
  }));
}

export const weekCount = (cells: CalendarCell[]) =>
  Math.max(...cells.map((cell) => cell.week)) + 1;

/** A month's name over the first week that starts in it, as GitHub names the columns. */
export function monthLabels(cells: CalendarCell[]): MonthLabel[] {
  const weekStarts = cells.filter(
    (cell, index) => index === 0 || cell.weekday === SUNDAY,
  );
  const monthStarts = weekStarts.filter(
    (cell, index) =>
      index === 0 || monthOf(cell.date) !== monthOf(weekStarts[index - 1].date),
  );
  return monthStarts
    .filter((start, index) => {
      const next = monthStarts[index + 1];
      return !next || next.week - start.week >= WEEKS_A_MONTH_NAME_NEEDS;
    })
    .map((start) => ({ week: start.week, name: monthName(start.date) }));
}

export const busiestDay = (days: ContributionDay[]) =>
  days.reduce((busiest, day) => (day.count > busiest.count ? day : busiest));

/**
 * Everything the calendar shows. The total is GitHub's own, which can differ by a few from the sum of the days (on
 * 25 October 2026 it was 2,653 against 2,645).
 */
export function contributionYear() {
  const { days, total, inPrivateRepositories } = calendar;
  const cells = calendarCells(days);
  return {
    cells,
    weeks: weekCount(cells),
    months: monthLabels(cells),
    firstDay: days[0].date,
    lastDay: days[days.length - 1].date,
    total,
    inPrivateRepositories,
    busiest: busiestDay(days),
  };
}

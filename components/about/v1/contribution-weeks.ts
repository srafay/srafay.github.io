/*
  The year of GitHub contributions as weeks, for version 1's strip: one column a week, Sunday to Saturday, the same
  53 columns GitHub's own calendar has (lib/contribution-calendar.ts places each day in its week). The last column
  can hold fewer than seven days, because the year ends on the day the data was read.
*/
import {
  calendarCells,
  contributionYear,
  type CalendarCell,
} from "@/lib/contribution-calendar";
import calendar from "@/content/about/contributions.json";

export type ContributionWeek = {
  /** The week's first day in the data, written as "2026-10-18". */
  firstDay: string;
  days: number;
  total: number;
};

/** The days grouped into their week's column, in order. */
export function weeksOf(cells: CalendarCell[]): ContributionWeek[] {
  const weeks: ContributionWeek[] = [];
  for (const cell of cells) {
    weeks[cell.week] ??= { firstDay: cell.date, days: 0, total: 0 };
    weeks[cell.week].days += 1;
    weeks[cell.week].total += cell.count;
  }
  return weeks;
}

export const busiestWeekOf = (weeks: ContributionWeek[]) =>
  weeks.reduce((busiest, week) =>
    week.total > busiest.total ? week : busiest,
  );

export const emptyWeekCount = (weeks: ContributionWeek[]) =>
  weeks.filter((week) => week.total === 0).length;

/** Everything the strip shows: the weeks, and GitHub's own totals for the caption. */
export function contributionWeeks() {
  const weeks = weeksOf(calendarCells(calendar.days));
  const year = contributionYear();
  return {
    weeks,
    busiest: busiestWeekOf(weeks),
    emptyWeeks: emptyWeekCount(weeks),
    firstDay: year.firstDay,
    lastDay: year.lastDay,
    total: year.total,
    inPrivateRepositories: year.inPrivateRepositories,
  };
}

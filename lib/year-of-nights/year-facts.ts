/*
  The facts version 2's year scene tells, worked out from the days themselves, so a new contributions.json tells the
  new year without a word changed: the busiest day, the longest stretch with no contributions, and the longest run of
  days that each had at least one. The words (components/about/v2/) and the scene's highlights both read these.
*/
import type { ContributionDay } from "./galaxy";

/** Consecutive days, by their places in the year: the first and the last, both included. */
export type Stretch = { firstIndex: number; lastIndex: number };

export const stretchLength = (stretch: Stretch) =>
  stretch.lastIndex - stretch.firstIndex + 1;

/** The index of the day with the most contributions. The earliest wins a tie. */
export function busiestDayIndex(days: ContributionDay[]) {
  return days.reduce(
    (busiest, day, index) =>
      day.count > days[busiest].count ? index : busiest,
    0,
  );
}

/** The longest run of consecutive days that all pass the test. The earliest wins a tie. */
export function longestStretch(
  days: ContributionDay[],
  belongs: (day: ContributionDay) => boolean,
): Stretch {
  let longest: Stretch = { firstIndex: 0, lastIndex: -1 };
  let runStart = -1;
  days.forEach((day, index) => {
    if (!belongs(day)) {
      runStart = -1;
      return;
    }
    if (runStart < 0) runStart = index;
    const run = { firstIndex: runStart, lastIndex: index };
    if (stretchLength(run) > stretchLength(longest)) longest = run;
  });
  return longest;
}

export const isEmptyDay = (day: ContributionDay) => day.count === 0;
export const isActiveDay = (day: ContributionDay) => day.count > 0;

export const longestQuietStretch = (days: ContributionDay[]) =>
  longestStretch(days, isEmptyDay);

export const longestActiveRun = (days: ContributionDay[]) =>
  longestStretch(days, isActiveDay);

export const daySum = (days: ContributionDay[]) =>
  days.reduce((sum, day) => sum + day.count, 0);

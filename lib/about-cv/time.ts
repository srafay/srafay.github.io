/*
  Time as the scene measures it: years as a decimal, so September 2025 is 2025.667. Months are the CV's own
  ("2025-09"). The present is the reader's own clock, so every line ends on the day the page is read.
*/
import { formatMonthInFull } from "@/lib/format";

/** The first year the CV reaches: NED, 2014. The lines run faint before it. */
export const FIRST_YEAR = 2014;

const MONTHS_IN_A_YEAR = 12;

/** "2025-09" as 2025.667, the start of that month. */
export function timeAtStartOf(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return year + (monthNumber - 1) / MONTHS_IN_A_YEAR;
}

/** "2025-09" as the end of that month, 2025.75. */
export const timeAtEndOf = (month: string) =>
  timeAtStartOf(month) + 1 / MONTHS_IN_A_YEAR;

/** The middle of a year, for things the CV dates by the year alone. */
export const middleOfYear = (year: number) => year + 0.5;

/** Today as a decimal year. */
export function presentTime(today = new Date()): number {
  const startOfYear = Date.UTC(today.getUTCFullYear(), 0, 1);
  const startOfNextYear = Date.UTC(today.getUTCFullYear() + 1, 0, 1);
  return (
    today.getUTCFullYear() +
    (today.getTime() - startOfYear) / (startOfNextYear - startOfYear)
  );
}

/** "September 2025 to June 2026", "Since August 2026", or "June 2026" for a single month. */
export function monthsInWords(
  started: string,
  ended?: string,
  ongoing = false,
) {
  if (ongoing) return `Since ${formatMonthInFull(started)}`;
  if (!ended || ended === started) return formatMonthInFull(started);
  return `${formatMonthInFull(started)} to ${formatMonthInFull(ended)}`;
}

/** "2014 to 2018". */
export const yearsInWords = (started: number, ended: number) =>
  `${started} to ${ended}`;

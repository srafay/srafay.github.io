/*
  Dates and counts written out for reading, as the About page shows them: "September 2025", "25 October 2026",
  "2,653". Dates are worked out in UTC, so a reader's own time zone never moves one by a day.
*/
const IN_UTC = { timeZone: "UTC" } as const;

/** "2025-09" as "September 2025". */
export function formatMonthInFull(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
    ...IN_UTC,
    month: "long",
    year: "numeric",
  });
}

/** "2026-10-25" as "25 October 2026". */
export function formatDayInFull(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    ...IN_UTC,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** A count with its thousands marked: 2653 as "2,653". */
export const formatCount = (count: number) => count.toLocaleString("en-AU");

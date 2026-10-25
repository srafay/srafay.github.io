/*
  A role's months in words, for the short lines the About page's script writes ("June 2025 to September 2025", "since
  August 2026"). The timeline itself writes the same dates as <time> elements (components/about/history.tsx).
*/
import { formatMonthInFull } from "@/lib/format";

/** The months a role ran, each written as "2025-09". The end is left out while the role goes on. */
export type RoleTimes = { started: string; ended?: string };

export const isCurrentRole = (role: RoleTimes) => !role.ended;

export function roleDatesInWords(role: RoleTimes) {
  if (!role.ended) return `since ${formatMonthInFull(role.started)}`;
  return `${formatMonthInFull(role.started)} to ${formatMonthInFull(role.ended)}`;
}

export const yearOf = (month: string) => Number(month.slice(0, 4));

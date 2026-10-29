/*
  The words of version 2, "A year of nights". Facts are read from content/about/profile.ts and contributions.json, and
  the year's facts are worked out from the days (lib/year-of-nights/year-facts.ts), so a new year of contributions or
  a corrected month rewrites every line that shows it.
*/
import calendar from "@/content/about/contributions.json";
import {
  bio,
  currentRole,
  introduction,
  personalNote,
  pinnedRepositories,
  publicRepositoryCount,
  repositoriesReadOn,
} from "@/content/about/profile";
import { formatCount, formatDayInFull, formatMonthInFull } from "@/lib/format";
import { shortNameOf } from "@/lib/year-of-nights/career";
import {
  busiestDayIndex,
  longestActiveRun,
  longestQuietStretch,
  stretchLength,
  type Stretch,
} from "@/lib/year-of-nights/year-facts";

const { days } = calendar;

/** "Senior Software Engineer" as "Senior software engineer". */
export const inSentenceCase = (title: string) =>
  title.charAt(0) + title.slice(1).toLowerCase();

/** "12 December 2025 to 20 January 2026", or "4 April to 22 May 2026" when both days fall in one year. */
export function dayRange(firstDate: string, lastDate: string) {
  const first = formatDayInFull(firstDate);
  const last = formatDayInFull(lastDate);
  const sameYear = firstDate.slice(0, 4) === lastDate.slice(0, 4);
  return `${sameYear ? first.replace(/ \d{4}$/, "") : first} to ${last}`;
}

const rangeOf = (stretch: Stretch) =>
  dayRange(days[stretch.firstIndex].date, days[stretch.lastIndex].date);

const busiest = days[busiestDayIndex(days)];
const quiet = longestQuietStretch(days);
const run = longestActiveRun(days);

export const hero = {
  bio,
  now: `${inSentenceCase(currentRole.title)} at ${shortNameOf(currentRole.organisation)} since ${formatMonthInFull(currentRole.started)}.`,
  explanation: `Every star here is one day of my last year on GitHub. The bigger and brighter the star, the busier the day.`,
  touchHint: "Tap one to read it.",
  pointerHint: "Point at one to read it.",
  readerLabel: `The year's ${days.length} days as stars. Use the arrow keys to read them a day at a time, and up and down for a week.`,
};

export const year = {
  title: `A year in ${days.length} stars`,
  total: calendar.total,
  inPrivate: calendar.inPrivateRepositories,
  lastDay: formatDayInFull(days[days.length - 1].date),
  steps: [
    `The brightest star is ${formatDayInFull(busiest.date)}, with ${busiest.count} in one day.`,
    `The longest dark stretch ran ${stretchLength(quiet)} days, from ${rangeOf(quiet)}.`,
    `The longest unbroken run lasted ${stretchLength(run)} days, from ${rangeOf(run)}.`,
  ],
  busiestDay: formatDayInFull(busiest.date),
  busiestCount: busiest.count,
};

/** "Masters of IT (Software Engineering)" as "Masters of IT": the label beside a star has room for the short name. */
export const degreeName = (title: string) => title.replace(/\s*\(.*\)$/, "");

/** The introduction's first paragraph, then the first sentence of its second. */
export const career = {
  paragraphs: [introduction[0], introduction[1].split(". ")[0] + "."],
};

export const code = {
  title: `Six repositories`,
  explanation: `Six of my ${publicRepositoryCount} public repositories, each drawn as large as its stars on GitHub. Counted on ${formatDayInFull(repositoriesReadOn)}.`,
  count: pinnedRepositories.length,
};

export const starsInWords = (stars: number) => (stars === 1 ? "star" : "stars");

export const tools = { title: "What I build with" };

export const elsewhere = {
  title: "Where to find me",
  note: personalNote,
  backHome: "Back home",
};

export { formatCount };

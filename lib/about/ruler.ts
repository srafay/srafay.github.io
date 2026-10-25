/*
  The year ruler over the About page's Experience. It runs from the January of the first role's year to the month the
  page is built. Each role is a bar at its place and length, and the cities the roles were in sit under the bars.
  Every place is a share of the ruler's width, so the drawing (components/about/year-ruler.tsx) needs no script.
*/
import { experience, type Role } from "@/content/about/profile";
import {
  cityOfRole,
  roleAnchor,
  roleKey,
  rolesOldestFirst,
} from "@/lib/about/roles";
import { isCurrentRole, roleDatesInWords } from "@/lib/about/role-dates";

const MONTHS_IN_A_YEAR = 12;

/** A month as a count of months, so spans can be measured: "2025-09" is 2025 × 12 + 8. */
const monthCount = (month: string) =>
  Number(month.slice(0, 4)) * MONTHS_IN_A_YEAR + Number(month.slice(5, 7)) - 1;

/** The month the page is built in, written "2026-10". The current role's bar runs to its end. */
function monthOfBuild() {
  const today = new Date();
  const month = String(today.getUTCMonth() + 1).padStart(2, "0");
  return `${today.getUTCFullYear()}-${month}`;
}

/** The months a role covers, from the start of its first to the end of its last (the build month while it goes on). */
const monthsOfRole = (role: Role) => ({
  start: monthCount(role.started),
  end: monthCount(role.ended ?? monthOfBuild()) + 1,
});

type RoleSpan = { role: Role; start: number; end: number };

/** Where one role starts in the month the one before it ended, each gets half of that month, so the bars meet. */
function shareTouchingMonths(spans: RoleSpan[]) {
  return spans.map((span, index) => {
    const before = spans[index - 1];
    const after = spans[index + 1];
    const start =
      before && before.end > span.start
        ? (before.end + span.start) / 2
        : span.start;
    const end =
      after && span.end > after.start ? (span.end + after.start) / 2 : span.end;
    return { ...span, start, end };
  });
}

const roleSpans = (): RoleSpan[] =>
  shareTouchingMonths(
    rolesOldestFirst().map((role) => ({ role, ...monthsOfRole(role) })),
  );

/** The ruler's first and last month: the January of the first role's year, and the end of the build month. */
function rulerMonths() {
  const firstYear = Math.min(
    ...experience.map((role) => Number(role.started.slice(0, 4))),
  );
  return {
    first: firstYear * MONTHS_IN_A_YEAR,
    last: monthCount(monthOfBuild()) + 1,
  };
}

/** A month's place along the ruler, as a percentage of its width. */
function placeOnRuler(month: number) {
  const { first, last } = rulerMonths();
  return ((month - first) / (last - first)) * 100;
}

/** A percentage written to a thousandth, which is finer than a pixel on any screen. */
const toThousandths = (percentage: number) =>
  Math.round(percentage * 1000) / 1000;

/** Where a stretch of months starts along the ruler and how wide it is, both as percentages. */
const stretchOnRuler = (start: number, end: number) => ({
  left: toThousandths(placeOnRuler(start)),
  width: toThousandths(placeOnRuler(end) - placeOnRuler(start)),
});

export type RulerBar = {
  key: string;
  anchor: string;
  left: number;
  width: number;
  isCurrent: boolean;
  /** What a screen reader hears for the bar: the role and its months. */
  name: string;
};

export const rulerBars = (): RulerBar[] =>
  roleSpans().map(({ role, start, end }) => ({
    key: roleKey(role),
    anchor: roleAnchor(role),
    ...stretchOnRuler(start, end),
    isCurrent: isCurrentRole(role),
    name: `${role.title} at ${role.organisation}, ${roleDatesInWords(role)}`,
  }));

export type RulerYear = { year: number; left: number };

/** A mark at each January, from the first role's year to the build's. */
export function rulerYears(): RulerYear[] {
  const { first, last } = rulerMonths();
  const years: RulerYear[] = [];
  for (let month = first; month < last; month += MONTHS_IN_A_YEAR)
    years.push({
      year: month / MONTHS_IN_A_YEAR,
      left: toThousandths(placeOnRuler(month)),
    });
  return years;
}

export type RulerCity = { name: string; left: number; width: number };

/** One stretch for each run of roles in the same city, oldest first. A role with no city ends a run. */
export function rulerCities(): RulerCity[] {
  const stretches: { name: string; start: number; end: number }[] = [];
  let runningCity: string | undefined;
  for (const span of roleSpans()) {
    const city = cityOfRole(span.role)?.name;
    const current = stretches[stretches.length - 1];
    if (city && city === runningCity && current) current.end = span.end;
    else if (city)
      stretches.push({ name: city, start: span.start, end: span.end });
    runningCity = city;
  }
  return stretches.map(({ name, start, end }) => ({
    name,
    ...stretchOnRuler(start, end),
  }));
}

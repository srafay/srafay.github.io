/*
  Version 2 of the About page, "A year of nights": where each day of the contribution year sits in the sky, and how
  bright it is. The server page (its fallback drawing) and the browser's scene (lib/year-of-nights/scene/) both place
  the 365 stars with these functions, so the two always agree.

  The year is a galaxy of twelve arms, one a month. Each arm ends at its month's hour on a clock face (January at one
  o'clock round to December at twelve) and curls back toward the centre, where its first day sits. The distance from
  the centre is the day of the month. The year runs from late October to late October, and its two Octobers fill
  different days of the same arm (26 to 31 from the first year, 1 to 25 from the second), so no two days ever meet.

  Units are the galaxy's own: the centre is 0, 0, x grows to the right and y grows down, as on a screen.
*/

export type ContributionDay = { date: string; count: number };

export type DayStar = {
  /** The day's place in the year, 0 for the first. */
  index: number;
  date: string;
  count: number;
  /** 1 for January to 12 for December. */
  month: number;
  dayOfMonth: number;
  x: number;
  y: number;
  /** The star's core, in galaxy units. Its glow reaches a few times further. */
  coreRadius: number;
  /** From 0 to 1: how much light the star gives. */
  brightness: number;
};

/** Where the first day of every month sits: far enough out that twelve first days never touch under the name. */
export const ARM_START_RADIUS = 110;
/** Where the thirty-first day of a month sits. */
export const ARM_END_RADIUS = 520;
/** How far, in radians, an arm turns between its first day and its last. */
export const ARM_CURL = 1.15;
/** How far beyond an arm's last day its month's name is written. */
export const MONTH_NAME_DISTANCE = 52;

const MONTHS_IN_A_YEAR = 12;
const DAYS_IN_THE_LONGEST_MONTH = 31;
const FULL_TURN = 2 * Math.PI;

// Star sizes, in galaxy units. A day with any contribution is drawn at least this large, so it never reads as empty.
const EMPTY_DAY_CORE = 1.6;
const SMALLEST_LIT_CORE = 2.6;
const LARGEST_CORE = 10;
const EMPTY_DAY_BRIGHTNESS = 0.22;
const DIMMEST_LIT_BRIGHTNESS = 0.42;

export const MONTH_NAMES = [
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

const monthOf = (date: string) => Number(date.slice(5, 7));
const dayOfMonthOf = (date: string) => Number(date.slice(8, 10));

/** The month's hour on a clock face, as an angle clockwise from twelve o'clock. */
export const hourAngleOfMonth = (month: number) =>
  (month / MONTHS_IN_A_YEAR) * FULL_TURN;

/** How far along its arm a day sits: 0 for the first of the month, 1 for the thirty-first. */
export const progressAlongArm = (dayOfMonth: number) =>
  (dayOfMonth - 1) / (DAYS_IN_THE_LONGEST_MONTH - 1);

export const distanceFromCentre = (dayOfMonth: number) =>
  ARM_START_RADIUS +
  (ARM_END_RADIUS - ARM_START_RADIUS) * progressAlongArm(dayOfMonth);

/** The arm reaches its month's hour at its last day and curls back by ARM_CURL toward its first. */
export const angleOnArm = (month: number, dayOfMonth: number) =>
  hourAngleOfMonth(month) - ARM_CURL * (1 - progressAlongArm(dayOfMonth));

/** A point at this distance and clockwise angle from the centre, in screen-like units (y grows down). */
export function pointAt(distance: number, angle: number) {
  return { x: distance * Math.sin(angle), y: -distance * Math.cos(angle) };
}

export const pointOnGalaxy = (month: number, dayOfMonth: number) =>
  pointAt(distanceFromCentre(dayOfMonth), angleOnArm(month, dayOfMonth));

/** Where a month's name goes: just beyond the tip of its arm. */
export const monthNamePoint = (month: number) =>
  pointAt(ARM_END_RADIUS + MONTH_NAME_DISTANCE, hourAngleOfMonth(month));

/**
 * The core grows with the square root of the count, so a star's area follows the day's contributions. Empty days keep
 * a small faint core, so the calendar still shows them.
 */
export function coreRadiusForCount(count: number, busiestCount: number) {
  if (count === 0) return EMPTY_DAY_CORE;
  const share = Math.sqrt(count / busiestCount);
  return SMALLEST_LIT_CORE + (LARGEST_CORE - SMALLEST_LIT_CORE) * share;
}

export function brightnessForCount(count: number, busiestCount: number) {
  if (count === 0) return EMPTY_DAY_BRIGHTNESS;
  const share = Math.sqrt(count / busiestCount);
  return DIMMEST_LIT_BRIGHTNESS + (1 - DIMMEST_LIT_BRIGHTNESS) * share;
}

export const busiestCountOf = (days: ContributionDay[]) =>
  Math.max(...days.map((day) => day.count));

/** Every day of the year as a star in the galaxy. */
export function dayStars(days: ContributionDay[]): DayStar[] {
  const busiestCount = busiestCountOf(days);
  return days.map((day, index) => {
    const month = monthOf(day.date);
    const dayOfMonth = dayOfMonthOf(day.date);
    return {
      index,
      date: day.date,
      count: day.count,
      month,
      dayOfMonth,
      ...pointOnGalaxy(month, dayOfMonth),
      coreRadius: coreRadiusForCount(day.count, busiestCount),
      brightness: brightnessForCount(day.count, busiestCount),
    };
  });
}

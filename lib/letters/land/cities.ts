/*
  The ground. Under the events, every bare cell belongs to the city the CV puts the work and study in at that time,
  and spells its name: KARACHI, then DARWIN, then SYDNEY. So the plain itself changes its words where the life moved.
  The first row of each year spells the year across the land instead, like a line of milestones. A tap on the ground
  opens the city's card, which says only what the CV says: the city and the CV's years there, at its own precision.
*/
import { stays } from "@/content/about/profile";
import { FIRST_YEAR, timeAtStartOf } from "@/lib/about-cv/time";
import type { Grid } from "./grid";

export type City = {
  name: string;
  /** When the ground starts spelling it, from profile.ts. */
  from: number;
  /** The card's line, at the CV's own precision. */
  inTheCv: string;
};

/*
  Karachi: NED from 2014 (a year only) to Foree Pay's end in February 2020. Darwin: the Masters from 2020 (a year
  only) to AIMS's end in May 2025. Sydney: CommBank from June 2025, and on since.
*/
const CV_YEARS: Record<string, string> = {
  Karachi: "In the CV from 2014 to February 2020.",
  Darwin: "In the CV from 2020 to May 2025.",
  Sydney: "In the CV since June 2025.",
};

export const cities: City[] = stays.map((stay) => ({
  name: stay.city,
  from: timeAtStartOf(stay.from),
  inTheCv: CV_YEARS[stay.city],
}));

/** The city the ground spells at a time. */
export function cityAt(time: number): City {
  let found = cities[0];
  for (const city of cities) if (time >= city.from) found = city;
  return found;
}

/** The rows that spell a year instead of a city: the first row of each year. */
export function yearRows(grid: Grid) {
  const rows = new Map<number, number>();
  for (let year = FIRST_YEAR; year <= Math.floor(grid.present); year++)
    rows.set(Math.floor(grid.rowAt(year) - 1e-6), year);
  return rows;
}

/** The room between two repeats of a word on the ground, in cells. */
const GAP = 2;
/** How far each row's repeats shift from the row before, so the words never line up into columns. */
const STAGGER = 5;

/** One row of ground: a word repeated across the whole width, shifted a little on each row. */
export function groundRow(word: string, row: number, columns: number) {
  const unit = word + " ".repeat(GAP);
  const shift = (row * STAGGER) % unit.length;
  let line = "";
  for (let column = 0; column < columns; column++) line += unit[(column + shift) % unit.length];
  return line;
}

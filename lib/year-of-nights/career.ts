/*
  The career as version 2 tells it: stops in the cities the introduction names (Karachi, Darwin, Sydney), each with
  the roles held there, oldest first, and the Masters between the first two. Everything is read from
  content/about/profile.ts. Each rule that turns a role into a stop is its own function, so a role that moves city
  needs a change in profile.ts only.
*/
import {
  cities,
  currentRole,
  education,
  experience,
  location,
  type City,
  type Degree,
  type Role,
} from "../../content/about/profile";

export type CareerRole = Role & {
  /** A name for the role made of plain letters, for the page's anchors. */
  key: string;
  /** The name the introduction uses for the organisation. */
  shortName: string;
  /** Months from its first to its last, both counted. */
  months: number;
  isCurrent: boolean;
};

export type CareerStop = {
  city: City;
  key: string;
  roles: CareerRole[];
  firstYear: number;
  lastYear: number;
};

/** The day the page treats as today: the last day of the contribution year, so a build never depends on the clock. */
export const TODAY_MONTH = "2026-10";

// The introduction's own names for the organisations whose full names are long.
const SHORT_NAMES: Record<string, string> = {
  "Commonwealth Bank of Australia": "CommBank",
  "Australian Institute of Marine Science": "AIMS",
  "Twin Technology Pty Ltd": "Twin Technology",
};

export const shortNameOf = (organisation: string) =>
  SHORT_NAMES[organisation] ?? organisation;

/** "Northern Land Council" as "northern-land-council". */
export const keyOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const yearOf = (month: string) => Number(month.slice(0, 4));
const monthNumber = (month: string) =>
  yearOf(month) * 12 + Number(month.slice(5, 7));

/** The last month of a role: its end, or this month while it goes on. */
export const lastMonthOf = (role: Role) => role.ended ?? TODAY_MONTH;

export const monthsOf = (role: Role) =>
  monthNumber(lastMonthOf(role)) - monthNumber(role.started) + 1;

/** The city a place names, if it names one of the three. */
const cityNamedIn = (place: string | undefined) =>
  cities.find((city) => place?.includes(city.name));

/**
 * The current role names no place, so it takes the page's own location. A role held remotely with no city (the
 * internship) is drawn with the city of the role that came after it.
 */
export function cityOfRole(role: Role, rolesOldestFirst: Role[]): City {
  const isCurrent = !role.ended;
  const named = cityNamedIn(isCurrent ? location : role.place);
  if (named) return named;
  const later = rolesOldestFirst.slice(rolesOldestFirst.indexOf(role) + 1);
  const next = later.find((laterRole) => cityNamedIn(laterRole.place));
  if (!next) throw new Error(`No city for ${role.organisation} in profile.ts`);
  return cityNamedIn(next.place)!;
}

function careerRole(role: Role): CareerRole {
  return {
    ...role,
    key: keyOf(role.organisation),
    shortName: shortNameOf(role.organisation),
    months: monthsOf(role),
    isCurrent: !role.ended,
  };
}

export const rolesOldestFirst = () => [...experience].reverse();

/** The cities in the order the career reached them, each with its roles. */
export function careerStops(): CareerStop[] {
  const roles = rolesOldestFirst();
  return cities.map((city) => {
    const rolesHere = roles
      .filter((role) => cityOfRole(role, roles) === city)
      .map(careerRole);
    return {
      city,
      key: keyOf(city.name),
      roles: rolesHere,
      firstYear: Math.min(...rolesHere.map((role) => yearOf(role.started))),
      lastYear: Math.max(...rolesHere.map((role) => yearOf(lastMonthOf(role)))),
    };
  });
}

/** The Masters, taken between the first city's roles and the second's. */
export const degreeBetweenStops = (): Degree => education[0];

/** "2018 to 2020", one year when a role starts and ends in it, or "Since 2026" while it goes on. */
export function yearsOfRole(role: Role) {
  if (!role.ended) return `Since ${yearOf(role.started)}`;
  const first = yearOf(role.started);
  const last = yearOf(role.ended);
  return first === last ? String(first) : `${first} to ${last}`;
}

export const yearsOfStop = (stop: CareerStop) =>
  stop.firstYear === stop.lastYear
    ? String(stop.firstYear)
    : `${stop.firstYear} to ${stop.lastYear}`;

export const currentRoleOrganisation = () =>
  shortNameOf(currentRole.organisation);

/*
  The About page's roles as its components and script need them: an address for each in the timeline, and the city
  it was in. The timeline also carries each role's months and skills as attributes. The page's script reads them
  there, so it never needs a second copy of profile.ts.
*/
import {
  cities,
  experience,
  location,
  type City,
  type Role,
} from "@/content/about/profile";
import { isCurrentRole } from "@/lib/about/role-dates";
import { writeSkillList } from "@/lib/about/skill-list";

/** "Media Research & Innovations" as "media-research-innovations": a role's key, from the name the page calls it by. */
export const roleKey = (role: Role) =>
  role.shortName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The role's place in the timeline, which its bar on the ruler and the chips' answers link to. */
export const roleAnchor = (role: Role) => `role-${roleKey(role)}`;

/** The attributes each role in the timeline carries for the page's script (read back in lib/about/script/page-parts.ts). */
export function roleAttributes(role: Role) {
  return {
    "data-role": roleKey(role),
    "data-short-name": role.shortName,
    "data-started": role.started,
    "data-ended": role.ended,
    "data-skills": writeSkillList(role.skills),
  };
}

const cityNamedIn = (words: string) =>
  cities.find((city) => words.includes(city.name));

/**
 * The city a role was in: the one its place names ("Remote and Darwin" is Darwin). The current role has no place in
 * the CV, so it takes the city the profile gives as home now. A remote role with no city has none.
 */
export function cityOfRole(role: Role): City | undefined {
  if (role.place) return cityNamedIn(role.place);
  return isCurrentRole(role) ? cityNamedIn(location) : undefined;
}

/** Oldest first, the way a line of years reads. */
export const rolesOldestFirst = () => [...experience].reverse();

/*
  What the About page says when a Languages and tools chip is pressed. It says how many roles in Experience used it,
  over which years, and which they were, newest first as the timeline lists them. For example: "Five roles, 2018 to
  2026: Atelier, CommBank, AIMS, Foree Pay and Media Research & Innovations." The page's script makes each role a
  link to its place in the timeline.
*/
import {
  isCurrentRole,
  roleDatesInWords,
  yearOf,
  type RoleTimes,
} from "@/lib/about/role-dates";

export type RoleInAnswer = RoleTimes & { shortName: string; anchor: string };
export type AnswerPiece = { text: string } | { role: RoleInAnswer };

const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

const countInWords = (count: number) => COUNT_WORDS[count] ?? String(count);

/** "2018 to 2026", "2021 to now", or "in 2025" when the roles all fall within one year. */
function yearsInWords(roles: RoleInAnswer[]) {
  const firstYear = Math.min(...roles.map((role) => yearOf(role.started)));
  if (roles.some(isCurrentRole)) return `${firstYear} to now`;
  const lastYear = Math.max(...roles.map((role) => yearOf(role.ended ?? "")));
  return firstYear === lastYear
    ? `in ${firstYear}`
    : `${firstYear} to ${lastYear}`;
}

/** "A", "A and B", "A, B and C", with each role its own piece so it can be a link. */
function listOfRoles(roles: RoleInAnswer[]): AnswerPiece[] {
  return roles.flatMap((role, index) => {
    const remaining = roles.length - 1 - index;
    if (remaining === 0) return [{ role }];
    return [{ role }, { text: remaining === 1 ? " and " : ", " }];
  });
}

/** The answer for the roles that used a skill, in the timeline's order. One role is named with its months. */
export function skillAnswer(roles: RoleInAnswer[]): AnswerPiece[] {
  if (roles.length === 1) {
    const [role] = roles;
    return [
      { text: "One role: " },
      { role },
      { text: `, ${roleDatesInWords(role)}.` },
    ];
  }
  return [
    { text: `${countInWords(roles.length)} roles, ${yearsInWords(roles)}: ` },
    ...listOfRoles(roles),
    { text: "." },
  ];
}

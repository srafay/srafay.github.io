/*
  Small rules for turning profile.ts's facts into the words version 1 prints. Each rule is one function, so a change
  to how a thing is written is a change in one place.
*/
import { currentRole, experience, type Role } from "@/content/about/profile";
import { formatMonthInFull } from "@/lib/format";

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/** 7 as "seven". Past twelve, the figure itself. */
export const inWords = (count: number) => NUMBER_WORDS[count] ?? String(count);

/** "seven" as "Seven", for the start of a sentence. */
export const capitalised = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** "Senior Software Engineer" as "Senior software engineer", for a title inside a sentence. */
export const inSentenceCase = (title: string) =>
  title.charAt(0) + title.slice(1).toLowerCase();

/** "Twin Technology Pty Ltd" as "Twin Technology": prose names the company, not its legal form. */
export const withoutLegalSuffix = (organisation: string) =>
  organisation.replace(/\s+Pty\s+Ltd$/, "");

/** "2025-09" as 2025. */
export const yearOf = (month: string) => Number(month.slice(0, 4));

/** "2018 to 2020", or one year where it starts and ends in the same one. */
export function yearSpan(firstYear: number, lastYear: number) {
  return firstYear === lastYear
    ? String(firstYear)
    : `${firstYear} to ${lastYear}`;
}

/** The roles a part of the story covers, found by organisation. A name that matches no role stops the build. */
export function rolesAt(organisations: string[]): Role[] {
  return organisations.map((organisation) => {
    const role = experience.find(
      (candidate) => candidate.organisation === organisation,
    );
    if (!role) throw new Error(`No role at "${organisation}" in profile.ts`);
    return role;
  });
}

/** The years from the first role's start to the last one's end, as the story's margin shows them. */
export function yearsOf(roles: Role[]) {
  const starts = roles.map((role) => yearOf(role.started));
  const ends = roles.map((role) => yearOf(role.ended ?? role.started));
  return yearSpan(Math.min(...starts), Math.max(...ends));
}

/** "February 2018 to September 2018", or "Since August 2026" while the role goes on. */
export function monthsOf(role: Role) {
  if (!role.ended) return `Since ${formatMonthInFull(role.started)}`;
  return `${formatMonthInFull(role.started)} to ${formatMonthInFull(role.ended)}`;
}

/** The line under the deck: "Senior software engineer at Twin Technology since August 2026". */
export const standingLine = () =>
  `${inSentenceCase(currentRole.title)} at ${withoutLegalSuffix(currentRole.organisation)} since ${formatMonthInFull(currentRole.started)}`;

/** Every role, oldest first, the order the story is told in. */
export const rolesOldestFirst = () => [...experience].reverse();

/** "Ask me about distributed systems, ..." under the heading "Ask me about" reads "Distributed systems, ...". */
export function withoutLeadIn(text: string, leadIn: string) {
  if (!text.startsWith(leadIn)) return text;
  return capitalised(text.slice(leadIn.length));
}

/** GitHub's descriptions mostly have no full stop. In a sentence on this page they get one. */
export const asSentence = (text: string) =>
  /[.!?]$/.test(text) ? text : `${text}.`;

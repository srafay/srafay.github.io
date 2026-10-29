/*
  How the agent names the owner. The full name the first time in each section, then "he". Which of his two names he
  goes by is not known yet, so the agent never uses one alone. When it is known, LATER_NAME becomes that name and
  every later mention follows: a one-line change.
*/
import { site } from "@/lib/site";

/** "Syed Rafay", from the site's own name. */
export const FULL_NAME = site.name;

/** What the agent calls him after the first mention in a section. Null until the owner says which name he goes by. */
export const LATER_NAME: string | null = null;

/** The later mention at the start of a sentence: "He", or his name once known. */
export const He = () => LATER_NAME ?? "He";

/** The later mention inside a sentence: "he", or his name once known. */
export const he = () => LATER_NAME ?? "he";

/** The later possessive inside a sentence: "his", or his name's once known. */
export const his = () => (LATER_NAME ? `${LATER_NAME}'s` : "his");

/** The later possessive at the start of a sentence. */
export const His = () => (LATER_NAME ? `${LATER_NAME}'s` : "His");

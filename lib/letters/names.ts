/*
  How the page names the owner. Which of his two names he goes by is not known yet, so nothing on the page uses one
  alone: the full name where he is named, "he" after. When it is known, LATER_NAME becomes that name: a one-line
  change.
*/
import { site } from "@/lib/site";

/** "Syed Rafay", from the site's own name. */
export const FULL_NAME = site.name;

/** What the page calls him after the full name. Null until the owner says which name he goes by. */
export const LATER_NAME: string | null = null;

/** The later mention inside a sentence: "he", or his name once known. */
export const he = () => LATER_NAME ?? "he";

/** The tab's usual title. */
export const PAGE_TITLE = `About me · ${FULL_NAME}`;

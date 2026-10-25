/*
  Version 2's class names, as app/about/v2/year-of-nights.css spells them. A plain stylesheet in the app router is
  global, so every class carries the nights- prefix, which no other page uses, and every rule sits under .about-v2,
  the page's own wrapper. (A CSS Module would scope them by itself, but the site's Turbopack rule for its stylesheets
  in next.config.ts renames every .css file it loads, and a renamed module is read as plain CSS.)
*/
const NAMES = [
  "sky",
  "stage",
  "canvas",
  "fallback",
  "fallbackGold",
  "grain",
  "scene",
  "sceneHero",
  "sceneYear",
  "sceneCareer",
  "sceneCode",
  "sceneTools",
  "sceneElsewhere",
  "panel",
  "heroPanel",
  "name",
  "word",
  "letter",
  "heroWords",
  "bio",
  "now",
  "explanation",
  "touchHint",
  "pointerHint",
  "reader",
  "words",
  "sideWords",
  "centreWords",
  "title",
  "lead",
  "paragraph",
  "note",
  "bigNumber",
  "steps",
  "step",
  "labels",
  "label",
  "labelBody",
  "labelName",
  "labelLine",
  "labelDetail",
  "labelGold",
  "stops",
  "stop",
  "stopRoles",
  "degree",
  "cityName",
  "repositoryLink",
  "toolGroups",
  "toolGroup",
  "toolGroupName",
  "tool",
  "toolGold",
  "links",
  "link",
  "linkName",
  "linkPurpose",
  "back",
  "busiest",
  "dayCard",
  "dayDate",
  "dayCount",
  "versions",
] as const;

/** "heroWords" as "nights-hero-words". */
const prefixed = (name: string) =>
  `nights-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

export const styles = Object.fromEntries(
  NAMES.map((name) => [name, prefixed(name)]),
) as Record<(typeof NAMES)[number], string>;

/** The page's wrapper: every rule of the stylesheet starts here. */
export const PAGE_CLASS = "about-v2";

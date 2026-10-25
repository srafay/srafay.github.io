/*
  Version 3's class names, as app/about/v3/flight.css spells them. A plain stylesheet in the app router is global, so
  every class carries the flight- prefix, which no other page uses, and every rule sits under .about-v3, the page's
  own wrapper. (A CSS Module would scope them by itself, but the site's Turbopack rule for stylesheets in
  next.config.ts renames every .css file it loads, and a renamed module is read as plain CSS.) The scene's script
  finds its elements by data-flight-* attributes, never by these classes.
*/
const NAMES = [
  "track",
  "stage",
  "standIn",
  "shade",
  "dim",
  "chapters",
  "chapter",
  "hero",
  "name",
  "nameWord",
  "line",
  "words",
  "place",
  "years",
  "lead",
  "more",
  "moreButton",
  "moreOpenLabel",
  "moreCloseLabel",
  "moreBody",
  "end",
  "links",
  "back",
  "versions",
] as const;

/** "standIn" as "flight-stand-in". */
const prefixed = (name: string) =>
  `flight-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

export const styles = Object.fromEntries(
  NAMES.map((name) => [name, prefixed(name)]),
) as Record<(typeof NAMES)[number], string>;

/** The page's wrapper: every rule of the stylesheet starts here. */
export const PAGE_CLASS = "about-v3";

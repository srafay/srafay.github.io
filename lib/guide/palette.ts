/*
  The colour of each field of the tour, from the page's theme, Night print (lib/guide/themes.ts). A field is one flat
  colour with its words at full strength, its cards and bubbles in the theme's colours, and the agent drawn over it in
  its inks and the field's deep shade. The build checks every pair below for contrast (checkPalette), so a colour
  changed in the theme can never leave a word unreadable.
*/
import { theme } from "@/lib/guide/themes";

export type SectionKey =
  | "hello"
  | "now"
  | "work"
  | "study"
  | "projects"
  | "courses"
  | "offTheClock"
  | "skills"
  | "findMe";

export type FieldColours = {
  /** The field itself. */
  field: string;
  /** Every word set on the field. */
  words: string;
  /** The agent's dark cells, and the words in its bubbles, and the panel of a card. */
  deep: string;
  /**
   * How light the agent may get on this field, from 0 to 1. On a light field near white cells vanish into it, so
   * the brightest tone becomes sparse dark dots and the agent still reads by its dark cells, with no outline.
   */
  toneCeiling: number;
  /** A card's paper and words, where they are not the deep shade and the agent's light. */
  card?: string;
  cardWords?: string;
  /** A narration bubble's paper and words, where they are not the agent's light and the deep shade. */
  paper?: string;
  paperWords?: string;
  /** The icons on the cards, where they are not in the card's words' colour. */
  accent?: string;
};

/** The agent's light cells and the bubbles' paper, on every field. */
export const AGENT_LIGHT = theme.agentLight;

export const fieldColours: Record<SectionKey, FieldColours> = theme.fields;

/** What each part of a section is drawn in, with the theme's choices filled in where it leaves them to the field. */
export const cardOf = (colours: FieldColours) => ({ paper: colours.card ?? colours.deep, words: colours.cardWords ?? AGENT_LIGHT });
export const bubbleOf = (colours: FieldColours) => ({ paper: colours.paper ?? AGENT_LIGHT, words: colours.paperWords ?? colours.deep });


/** A colour as three numbers from 0 to 1, for the shader. */
export function rgbOf(hex: string): [number, number, number] {
  const number = parseInt(hex.slice(1), 16);
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
}

const linearChannel = (share: number) =>
  share <= 0.03928 ? share / 12.92 : Math.pow((share + 0.055) / 1.055, 2.4);

/** WCAG 2 relative luminance. */
function luminance(hex: string) {
  const [red, green, blue] = rgbOf(hex).map(linearChannel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2 contrast ratio between two colours. */
export function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** The ratio every word on the page must reach, and a section's name, set huge. */
export const LEAST_CONTRAST = 4.5;
export const LEAST_HEADING_CONTRAST = 3;

/** Fails the build when a word on a field, in a bubble or on a card would fall under 4.5:1. */
export function checkPalette() {
  for (const [key, colours] of Object.entries(fieldColours)) {
    const pairs: [string, string, string, number][] = [
      ["words on the field", colours.words, colours.field, LEAST_CONTRAST],
      ["a bubble's words", bubbleOf(colours).words, bubbleOf(colours).paper, LEAST_CONTRAST],
      ["a card's words", cardOf(colours).words, cardOf(colours).paper, LEAST_CONTRAST],
      ["the section's name", colours.words, colours.field, LEAST_HEADING_CONTRAST],
    ];
    for (const [what, front, back, least] of pairs) {
      const ratio = contrastRatio(front, back);
      if (ratio < least)
        throw new Error(`${key}: ${what} reach only ${ratio.toFixed(2)}:1`);
    }
  }
}

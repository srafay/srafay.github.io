/*
  The page's look as a whole: Night print, picked by the owner. Every section stands on dark stock with a faint tint of
  its own (green black, red black, blue black and so on), its name and words in bone white, its cards one step lighter
  than the stock with their icons in a small ink accent of the section's own, and its narration bubbles in bone. The
  colour lives in the agent's six inks, like a risograph printed on black paper. The agent's shapes, graph and dither,
  the tour and its words are the theme's to colour, never to change.
*/
import type { FieldColours, SectionKey } from "@/lib/guide/palette";
import type { ToolKey } from "@/lib/guide/agent/topology";

/** A hue in two prints: light for the dark fields, dark for the light ones. */
export type Ink = { light: string; dark: string };

export type Theme = {
  fields: Record<SectionKey, FieldColours>;
  /** The agent's light cells, and the paper of the bubbles. */
  agentLight: string;
  /** The six tools' inks. */
  inks: Record<ToolKey, Ink>;
};

/** Bone white: the names, the words and the bubbles' paper. */
const BONE = "#ece6d6";

/**
 * The six tools' inks: web search yellow, deep research aqua, chart green, similar images pink, focus group apricot,
 * route blue. Each light print clears 11:1 on every stock.
 */
const SIX_INKS: Record<ToolKey, Ink> = {
  search: { light: "#ffe14d", dark: "#574800" },
  research: { light: "#8ee8ee", dark: "#08525a" },
  chart: { light: "#b5f07a", dark: "#2a5410" },
  similar: { light: "#ffc2dc", dark: "#8c1450" },
  focusGroup: { light: "#ffc994", dark: "#803206" },
  route: { light: "#b8d4ff", dark: "#1f3c99" },
};

/** A section's stock: its tinted black, its card one step lighter, and its ink accent for the cards' icons. */
const stock = (field: string, card: string, accent: string): FieldColours => ({
  field,
  words: BONE,
  deep: "#06070a",
  toneCeiling: 1,
  card,
  cardWords: BONE,
  paper: BONE,
  paperWords: field,
  accent,
});

export const theme: Theme = {
  agentLight: BONE,
  inks: SIX_INKS,
  fields: {
    hello: stock("#101c16", "#1d2e25", "#b5f07a"),
    now: stock("#1f1210", "#33201c", "#ffab96"),
    work: stock("#10162a", "#1e2742", "#b8d4ff"),
    study: stock("#191226", "#2a2040", "#dcc4ff"),
    projects: stock("#0c1c1e", "#183033", "#8ee8ee"),
    courses: stock("#1f1a0e", "#332c1a", "#ffe14d"),
    offTheClock: stock("#22140f", "#38241c", "#ffc994"),
    skills: stock("#1c1a15", "#2f2c24", "#f0d79a"),
    findMe: stock("#121316", "#22242a", BONE),
  },
};

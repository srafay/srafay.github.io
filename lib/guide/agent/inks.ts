/*
  The agent's own colours. Every part of it is printed in an ink, as a risograph prints a page: each tool in its own
  ink, the same hue on every field (a light print on a dark field, a dark print on a light one), so a tool reads as
  itself wherever it is; the router and the links in the theme's light. Shadow cells stay the field's deep colour, so
  the outline holds everywhere. A costume keeps its true colour. The first pass writes which ink each cell takes
  (tone-material.ts); the dither pass looks the ink up in a small table made for the fields behind the agent.
*/
import { AGENT_LIGHT, contrastRatio, type FieldColours } from "@/lib/guide/palette";
import { theme, type Ink } from "@/lib/guide/themes";
import { TOOL_ORDER, type ToolKey } from "./topology";

/** One colour on every field, whatever is behind it: a costume's true colour. */
type TrueColour = { fixed: string };

/** The theme's light and the field's deep shade, as the agent was drawn before it had inks. */
const PLAIN = "plain";

type Print = Ink | TrueColour | typeof PLAIN;

/** The six tools' inks, from the theme: checkInks fails the build if one falls under 3:1 on a field. */
export const TOOL_INKS: Record<ToolKey, Ink> = theme.inks;

/**
 * The costumes' true colours. Black is black on a light field. On a dark one black would vanish into the field, so it
 * keeps the shine it always had there: its few light cells in the theme's light, the rest the field's deep colour.
 */
const COSTUME_COLOURS = {
  costumeWhite: { fixed: AGENT_LIGHT },
  costumeBlack: { light: AGENT_LIGHT, dark: "#1c1d22" },
  hardHat: { fixed: "#ffd21f" },
  tassel: { fixed: "#f0c040" },
} satisfies Record<string, Print>;

/** What a trick shows besides the graph, and the tool whose work it is: the chart's bars, the focus group's panel. */
const PROPS = { bars: "chart", personas: "focusGroup" } as const satisfies Record<string, ToolKey>;

/** Every ink a cell can take, in the order of their codes. */
export const PAINTS = ["router", "link", ...TOOL_ORDER, ...(Object.keys(PROPS) as (keyof typeof PROPS)[]), "costumeWhite", "costumeBlack", "hardHat", "tassel"] as const;
export type PaintKey = (typeof PAINTS)[number];

/** A paint's number, written by the first pass. */
export const paintIndex = (paint: PaintKey) => PAINTS.indexOf(paint);

/** What a part prints in. */
function printOf(paint: PaintKey): Print {
  if (paint in COSTUME_COLOURS) return COSTUME_COLOURS[paint as keyof typeof COSTUME_COLOURS];
  if (paint === "router" || paint === "link") return PLAIN;
  if (paint in PROPS) return TOOL_INKS[PROPS[paint as keyof typeof PROPS]];
  return TOOL_INKS[paint as ToolKey];
}

/** Whether a field is light: its words are dark and the agent's light cells would vanish into it. */
const isLightField = (field: FieldColours) => field.toneCeiling < 1;

/** The colour a print takes on a field. */
function colourOn(print: Print, field: FieldColours) {
  if (print === PLAIN) return AGENT_LIGHT;
  if ("fixed" in print) return print.fixed;
  return isLightField(field) ? print.dark : print.light;
}

/** The least contrast a light cell needs with the field to be drawn at full strength: below it, it is drawn sparse. */
const FULL_STRENGTH_CONTRAST = 3;

/** One paint's colours on one field: its light cells, how light it may get, and its colour when lit. */
export type InkOnField = { light: string; ceiling: number; lit: string };

/**
 * A paint on a field. Light cells take the print, and a lit part is the print, flat. Where the print would vanish into
 * the field (a light print on a light field), it is drawn sparse, up to the field's tone ceiling, and lit in the
 * field's deep colour instead, as the agent always was.
 */
export function inkOn(paint: PaintKey, field: FieldColours): InkOnField {
  const colour = colourOn(printOf(paint), field);
  const strong = contrastRatio(colour, field.field) >= FULL_STRENGTH_CONTRAST;
  return { light: colour, ceiling: strong ? 1 : field.toneCeiling, lit: strong ? colour : field.deep };
}

/** Every paint on one field, in code order. */
export const inkTableFor = (field: FieldColours) => PAINTS.map((paint) => inkOn(paint, field));

/** The contrast every tool ink must reach on every field, as a shape. */
export const LEAST_SHAPE_CONTRAST = 3;

/** Fails the build when a tool's ink would fall under 3:1 on a field. */
export function checkInks(fields: Record<string, FieldColours>) {
  for (const [key, field] of Object.entries(fields))
    for (const [tool, ink] of Object.entries(TOOL_INKS)) {
      const ratio = contrastRatio(colourOn(ink, field), field.field);
      if (ratio < LEAST_SHAPE_CONTRAST) throw new Error(`${key}: the ${tool} ink reaches only ${ratio.toFixed(2)}:1`);
    }
}

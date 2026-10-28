/*
  The colour of each field of the tour. A field is one flat colour with its words at full strength, and the python
  drawn over it in two colours only: a deep shade of that field, and near white. The build checks every pair below for
  contrast (checkPalette), so a colour changed here can never leave a word unreadable.
*/

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
  /** The python's dark cells, and the words in its bubbles, and the panel of a card. */
  deep: string;
  /**
   * How light the python may get on this field, from 0 to 1. On a light field near white cells vanish into it, so
   * the brightest tone becomes sparse dark dots and the python still reads by its dark cells, with no outline.
   */
  toneCeiling: number;
};

/** The python's light cells and the bubbles' paper, on every field. */
export const PYTHON_LIGHT = "#f6f3ea";

export const fieldColours: Record<SectionKey, FieldColours> = {
  hello: { field: "#1f6b48", words: "#ffffff", deep: "#0a2617", toneCeiling: 1 },
  now: { field: "#c2402a", words: "#ffffff", deep: "#3d1109", toneCeiling: 1 },
  work: { field: "#2b3fbf", words: "#ffffff", deep: "#0d1447", toneCeiling: 1 },
  study: { field: "#6a3d9a", words: "#ffffff", deep: "#22113a", toneCeiling: 1 },
  projects: { field: "#0d6870", words: "#ffffff", deep: "#032529", toneCeiling: 1 },
  courses: { field: "#e3a52a", words: "#211705", deep: "#4a3108", toneCeiling: 0.5 },
  offTheClock: { field: "#f08a72", words: "#2a0d07", deep: "#5a1f12", toneCeiling: 0.5 },
  skills: { field: "#e8dcc2", words: "#24201a", deep: "#4d3f26", toneCeiling: 0.5 },
  findMe: { field: "#17181d", words: "#f6f3ea", deep: "#000000", toneCeiling: 1 },
};

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

/** The ratio every word on the page must reach. */
export const LEAST_CONTRAST = 4.5;

/** Fails the build when a word on a field, in a bubble or on a card would fall under 4.5:1. */
export function checkPalette() {
  for (const [key, colours] of Object.entries(fieldColours)) {
    const pairs: [string, string, string][] = [
      ["words on the field", colours.words, colours.field],
      ["a bubble's words", colours.deep, PYTHON_LIGHT],
      ["a card's words", PYTHON_LIGHT, colours.deep],
    ];
    for (const [what, front, back] of pairs) {
      const ratio = contrastRatio(front, back);
      if (ratio < LEAST_CONTRAST)
        throw new Error(`${key}: ${what} reach only ${ratio.toFixed(2)}:1`);
    }
  }
}

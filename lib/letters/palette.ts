/*
  Version 7's colours. The field is one flat deep navy in both themes, and the only light in the scene comes from the
  letters: electric blue in four tints by brightness, near white when lit, and one warm amber for the present. Panels
  follow the site's theme. checkPalette fails the build when a pair a reader must read falls under 4.5:1.
*/
export const field = "#070a20";

/** The land's tints, dimmest to brightest. The first two are texture; any letter big enough to read is at least the third. */
export const landTints = {
  farTexture: "#24339a",
  electric: "#3a57ff",
  readable: "#7a92ff",
  highGround: "#aebdff",
};

export const lit = "#eef1ff";
export const present = "#ffc27a";
export const presentLit = "#ffe4c2";
export const cityBand = "#8fa3e8";
export const words = "#f3f5ff";
export const block = "#2a3dff";
export const blockWords = "#ffffff";
export const controlQuiet = "#a9b4ec";
export const versionsQuiet = "#9aa6e0";
export const searchField = "#121a4d";

export const panels = {
  light: { panel: "#f4f5fa", ink: "#0e1330", quiet: "#4b5274", accent: "#2235d8", line: "#9aa2c8" },
  dark: { panel: "#0f1540", ink: "#e9ecff", quiet: "#a6aed8", accent: "#9badff", line: "#4a56a0" },
};

const channel = (value: number) => {
  const share = value / 255;
  return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const value = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(value >> 16) + 0.7152 * channel((value >> 8) & 255) + 0.0722 * channel(value & 255);
};
export function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Every pair a reader must read, and the least it may be. */
function pairsToRead(): [string, string, string][] {
  const pairs: [string, string, string][] = [
    ["readable letters", landTints.readable, field],
    ["high ground letters", landTints.highGround, field],
    ["lit letters", lit, field],
    ["the present", present, field],
    ["the present lit", presentLit, field],
    ["the city band", cityBand, field],
    ["the name and bio", words, field],
    ["words on the blocks", blockWords, block],
    ["quiet controls", controlQuiet, field],
    ["the versions line", versionsQuiet, field],
    ["the search field", words, searchField],
  ];
  for (const [theme, colours] of Object.entries(panels)) {
    pairs.push([`${theme} panel ink`, colours.ink, colours.panel]);
    pairs.push([`${theme} panel quiet words`, colours.quiet, colours.panel]);
    pairs.push([`${theme} panel links`, colours.accent, colours.panel]);
  }
  return pairs;
}

export function checkPalette() {
  for (const [name, fore, back] of pairsToRead()) {
    const ratio = contrast(fore, back);
    if (ratio < 4.5) throw new Error(`Version 7: ${name} is ${ratio.toFixed(2)}:1, under 4.5:1`);
  }
}

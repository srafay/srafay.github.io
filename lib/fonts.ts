/*
  The site's two typefaces, served from public/fonts/ (Latin subsets of the variable fonts; SIL Open Font License,
  see the OFL files there). Self-hosted rather than linked from Google Fonts: their stylesheet blocked the first paint
  for seconds. The homepage (lib/home.ts) and every other page (app/layout.tsx) use these same files, so moving
  between them never downloads a font twice.
*/
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

const faces = [
  // Bodoni Moda with its optical-size axis, so the huge title and the small labels each get the right cut.
  { family: "Bodoni Moda", style: "normal", weight: "400 900", file: "bodoni-moda-opsz-normal.woff2" },
  { family: "Bodoni Moda", style: "italic", weight: "400 900", file: "bodoni-moda-opsz-italic.woff2" },
  { family: "Figtree", style: "normal", weight: "300 900", file: "figtree-wght-normal.woff2" },
];

export const fontFaceCss = faces
  .map((face) => `@font-face{font-family:"${face.family}";font-style:${face.style};font-weight:${face.weight};font-display:swap;src:url(/fonts/${face.file}) format("woff2");unicode-range:${LATIN}}`)
  .join("\n");

/** The homepage fetches these before its CSS asks for them: the name's two styles and the body text. */
export const preloadedFonts = faces.map((face) => `/fonts/${face.file}`);

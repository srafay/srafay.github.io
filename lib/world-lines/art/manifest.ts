/*
  The Blender art version 4 uses, and what each piece is true for. Worker B1 rendered it in Cycles from the page's own
  data and cameras. The masters are its PNGs. These are light WebP copies, made with Chromium's own encoder. The share
  image stays a PNG, since some link previews still refuse WebP.

  A plate shows the first screen exactly as the page's camera sees it, only for the screen shapes the render was made
  for. On a phone at most half as wide as tall the page uses its portrait vault and phone camera. On a computer at
  least 8 by 5 it uses its landscape vault and desktop camera. Between the two the lines would not land where the plate
  has them, so no plate shows there.
*/

export type PlateShape = "phone" | "desktop";

/** One file of a plate at one width. */
export type PlateFile = { file: string; width: number };

/** The screen shapes each plate is true for, as media queries. */
export const PLATE_SHAPES: Record<PlateShape, string> = {
  phone: "(max-aspect-ratio: 1/2)",
  desktop: "(min-aspect-ratio: 8/5)",
};

/** Each plate's shape, width over height, for its width on screen when it fills the screen's height. */
export const PLATE_ASPECTS: Record<PlateShape, number> = {
  phone: 1284 / 2778,
  desktop: 2880 / 1800,
};

/**
  The first screen path-traced, with no text: the still while the scene loads. From B1's -b set, whose Study planks
  are bars like the live scene's, so nothing changes shape when the still fades. Its later set has softer planks.
*/
export const stillPlates: Record<PlateShape, PlateFile[]> = {
  phone: [
    { file: "plate-phone-full-856.webp", width: 856 },
    { file: "plate-phone-full-1284.webp", width: 1284 },
  ],
  desktop: [
    { file: "plate-desktop-full-1440.webp", width: 1440 },
    { file: "plate-desktop-full-2880.webp", width: 2880 },
  ],
};

/** Only the light the haze scatters, with no glare from the cores: under the live scene at the first screen. */
export const hazePlates: Record<PlateShape, PlateFile[]> = {
  phone: [
    { file: "plate-phone-haze-856.webp", width: 856 },
    { file: "plate-phone-haze-1284.webp", width: 1284 },
  ],
  desktop: [
    { file: "plate-desktop-haze-1440.webp", width: 1440 },
    { file: "plate-desktop-haze-2880.webp", width: 2880 },
  ],
};

/** The present's glow, rendered on black and kept with its alpha, for the one warm light. */
export const presentGlowSprite = "glow-present.webp";

/** The image a link to the page shows when it is posted. */
export const shareImage = {
  file: "share-1200x630.png",
  width: 1200,
  height: 630,
  alt: "Syed Rafay's name over five lines of light running back through the years from now to 2014.",
};

/** Every art file the page needs, for the build to copy. */
export const artFiles = () => [
  ...Object.values(stillPlates).flat().map((plate) => plate.file),
  ...Object.values(hazePlates).flat().map((plate) => plate.file),
  presentGlowSprite,
  shareImage.file,
];

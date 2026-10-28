/*
  The page's colours. Each world has a hue of its own, all at one saturation and lightness so none shouts. The full
  hue is kept for the worlds' lines and their beads. The dense orbits and the skills' dust take half of it, so the
  object reads as light with colour in it. The present is the one warm light.
*/
import type { WorldKey } from "@/lib/about-cv/worlds";

export type Rgb = [number, number, number];

/** Space is black. */
export const NIGHT = "#000000";
/** The site's own warm white for words, and its muted tone for quiet words. */
export const WORDS = "#ece6dc";
export const QUIET_WORDS = "#948b80";
/** The one warm light: the present. */
export const PRESENT = "#ffd2a1";

/** Each world's hue, at saturation 70 percent and lightness 72 percent. */
export const WORLD_HUES: Record<WorldKey, string> = {
  // Periwinkle: the main thread, the calmest of the cool hues.
  work: "#86a4ea",
  // Lilac: the two degrees and the thesis.
  study: "#b186ea",
  // Glacier cyan: code on a dark screen.
  projects: "#86dcea",
  // Spring green: the most numerous dated points, learning that grows.
  courses: "#86eaa7",
  // Orchid: evenings, cricket and games, on the magenta side so it never reads as the present's amber.
  offTheClock: "#ea86cc",
};

/** How much of its hue a dense dot keeps: the orbits and the dust. */
export const QUIET_SATURATION = 0.5;

/** "#86a4ea" as three shares from 0 to 1. */
export function rgbOf(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** How light a colour looks, from 0 to 1 (the Rec. 709 weights). */
export const lightnessOf = ([red, green, blue]: Rgb) =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

/** A colour with only a share of its saturation left, at the same lightness. */
export function quieter(colour: Rgb, keep = QUIET_SATURATION): Rgb {
  const grey = lightnessOf(colour);
  return colour.map((channel) => grey + (channel - grey) * keep) as Rgb;
}

/** The hue of a world as three shares, full or quiet. */
export const worldColour = (world: WorldKey, quiet = false): Rgb =>
  quiet ? quieter(rgbOf(WORLD_HUES[world])) : rgbOf(WORLD_HUES[world]);

/**
  Whether a brand's colour can stand on the night as a lit mark. Near-black brands (GitHub, Next.js and the like)
  cannot, so they light in their world's hue instead.
*/
export const readsOnNight = (hex: string) => lightnessOf(rgbOf(`#${hex.replace("#", "")}`)) >= 0.18;

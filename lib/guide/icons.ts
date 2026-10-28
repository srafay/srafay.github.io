/*
  The glyphs version 6 adds to the shared ones (lib/about-cv/icons.ts): the python's bar, its tricks, the costumes,
  the devices of the mockups, and the way back to the homepage. Lucide line glyphs (ISC), by named import, so a renamed
  icon breaks the build. Where the shared tables already name a thing (a degree, cricket, Dota 2), their glyph is used.
*/
import {
  Bug,
  Camera,
  Disc3,
  EyeOff,
  Ghost,
  Glasses,
  HardHat,
  House,
  Infinity as Loop,
  Laptop,
  Shirt,
  Smartphone,
  Sparkles,
  Spline,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from "lucide";
import { checkGlyph, lineGlyph, pastimeMarks, typeGlyphs, worldGlyphs, type Glyph } from "@/lib/about-cv/icons";
import type { CostumeKey } from "@/lib/guide/python/costumes";
import type { TrickKey } from "@/lib/guide/python/tricks";

export const guideGlyphs = {
  tricks: lineGlyph("sparkles", Sparkles),
  dressUp: lineGlyph("shirt", Shirt),
  soundOn: lineGlyph("volume-2", Volume2),
  soundOff: lineGlyph("volume-x", VolumeX),
  backToSystem: lineGlyph("house", House),
  laptop: lineGlyph("laptop", Laptop),
  phone: lineGlyph("smartphone", Smartphone),
};

export const trickGlyphs: Record<TrickKey, Glyph> = {
  coil: lineGlyph("spline", Spline),
  knot: lineGlyph("infinity", Loop),
  peekaboo: lineGlyph("eye-off", EyeOff),
  sneeze: lineGlyph("wind", Wind),
  dance: lineGlyph("disc-3", Disc3),
  selfie: lineGlyph("camera", Camera),
  hiss: lineGlyph("zap", Zap),
  shed: lineGlyph("ghost", Ghost),
  eatBug: lineGlyph("bug", Bug),
};

/** Each costume's glyph: cricket keeps the shared pastime heart, Dota 2 its own mark, the degrees their cap. */
export const costumeGlyphs: Record<CostumeKey, Glyph> = {
  cricketCap: typeGlyphs.pastime,
  headset: pastimeMarks["Dota 2"],
  graduationCap: worldGlyphs.study,
  readingGlasses: lineGlyph("glasses", Glasses),
  hardHat: lineGlyph("hard-hat", HardHat),
};

/** Throws on a glyph with no drawing, so the build fails instead of showing an empty button. */
export function checkGuideGlyphs() {
  for (const [name, glyph] of Object.entries({ ...guideGlyphs, ...trickGlyphs, ...costumeGlyphs }))
    checkGlyph(glyph, `version 6 ${name}`);
}

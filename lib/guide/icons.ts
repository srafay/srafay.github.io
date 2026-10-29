/*
  The glyphs version 6 adds to the shared ones (lib/about-cv/icons.ts): the agent's bar, its tricks, the costumes, the
  devices of the mockups, and the way back to the homepage. Lucide line glyphs (ISC), by named import, so a renamed
  icon breaks the build. Where the shared tables already name a thing (a degree, cricket, Dota 2), their glyph is used.
  The Tricks button carries a tool case, not sparkles: the agent's tricks are its tools.
*/
import {
  ChartColumn,
  Ghost,
  Glasses,
  HardHat,
  House,
  Images,
  Laptop,
  Library,
  Pause,
  Play,
  Route,
  Search,
  Shirt,
  SkipForward,
  Smartphone,
  ToolCase,
  Users,
  Volume2,
  VolumeX,
} from "lucide";
import { checkGlyph, lineGlyph, pastimeMarks, typeGlyphs, worldGlyphs, type Glyph } from "@/lib/about-cv/icons";
import type { CostumeKey } from "@/lib/guide/agent/costumes";
import type { TrickKey } from "@/lib/guide/agent/tricks";

export const guideGlyphs = {
  tricks: lineGlyph("tool-case", ToolCase),
  dressUp: lineGlyph("shirt", Shirt),
  soundOn: lineGlyph("volume-2", Volume2),
  soundOff: lineGlyph("volume-x", VolumeX),
  pause: lineGlyph("pause", Pause),
  play: lineGlyph("play", Play),
  skip: lineGlyph("skip-forward", SkipForward),
  backToSystem: lineGlyph("house", House),
  laptop: lineGlyph("laptop", Laptop),
  phone: lineGlyph("smartphone", Smartphone),
};

export const trickGlyphs: Record<TrickKey, Glyph> = {
  search: lineGlyph("search", Search),
  research: lineGlyph("library", Library),
  chart: lineGlyph("chart-column", ChartColumn),
  similar: lineGlyph("images", Images),
  focusGroup: lineGlyph("users", Users),
  route: lineGlyph("route", Route),
  hallucinate: lineGlyph("ghost", Ghost),
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

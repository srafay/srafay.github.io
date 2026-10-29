/*
  The glyphs version 5 adds to the shared ones (lib/about-cv/icons.ts): sound, the phone's tilt, laying time out in a
  line, riding through time (play, pause and skip), and the way to the site's posts. Lucide line glyphs (ISC), by named
  import, so a renamed icon breaks the build.
*/
import { AudioLines, MoveHorizontal, NotebookPen, Pause, Play, SkipForward, Smartphone } from "lucide";
import { checkGlyph, lineGlyph } from "@/lib/about-cv/icons";

export const hypercubeGlyphs = {
  sound: lineGlyph("audio-lines", AudioLines),
  tilt: lineGlyph("smartphone", Smartphone),
  layOutTime: lineGlyph("move-horizontal", MoveHorizontal),
  play: lineGlyph("play", Play),
  pause: lineGlyph("pause", Pause),
  skip: lineGlyph("skip-forward", SkipForward),
  posts: lineGlyph("notebook-pen", NotebookPen),
};

/** Throws on a glyph with no drawing, so the build fails instead of showing an empty button. */
export function checkHypercubeGlyphs() {
  for (const [name, glyph] of Object.entries(hypercubeGlyphs)) checkGlyph(glyph, `control ${name}`);
}

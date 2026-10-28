/*
  Which glyph each thing carries, for the scene and the HTML alike. An event carries its kind's glyph (a role, a
  degree, a project, a course). A pastime carries its exact mark where Simple Icons has one, and a skill its mark or
  its group's glyph.
*/
import {
  pastimeMarks,
  typeGlyphs,
  worldGlyphs,
  type Glyph,
} from "@/lib/world-lines/icons";
import type { WorldEvent } from "@/lib/world-lines/events";
import type { WorldKey } from "@/lib/world-lines/worlds";

export { glyphOfSkill } from "@/lib/world-lines/skill-marks";

export const glyphOfWorld = (world: WorldKey): Glyph => worldGlyphs[world];

export function glyphOfEvent(event: WorldEvent): Glyph {
  if (event.kind === "pastime")
    return pastimeMarks[event.label] ?? typeGlyphs.pastime;
  return typeGlyphs[event.kind];
}

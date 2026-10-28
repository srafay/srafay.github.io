/*
  One distance-field texture for everything the scene draws as text: each character the land spells, one glyph per
  cell (Figtree 600), and each of the 211 skills as a word with its mark (Figtree 500). Built by the shared word atlas
  from the site's own woff2 files, a little each frame, so no frame waits on it.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { eventLabelKey } from "./labels-layer";
import type { SkillWord } from "@/lib/about-cv/skills";
import { buildAtlas, loadFaces, type Atlas, type WordRequest } from "@/lib/about-cv/scene/word-atlas";
import { MarksLayer } from "./marks-layer";

/** The size each character is drawn at in the atlas. The field keeps it sharp at any size on screen. */
const CELL_PIXELS = 48;
const SKILL_PIXELS = 32;
const CELL_FONT = `600 ${CELL_PIXELS}px Figtree`;
const SKILL_FONT = `500 ${SKILL_PIXELS}px Figtree`;
/** A city's name on the land, lettered like a place on a map, and a year at the land's edge. */
const CITY_FONT = "600 72px Fraunces";
const YEAR_FONT = `500 ${SKILL_PIXELS}px Figtree`;
/** An event's name, shown when its own letters are too small to read. */
const LABEL_FONT = "600 30px Figtree";

export const cellKey = (character: string) => `c:${character}`;
export const skillKey = (word: string) => `s:${word}`;

export async function buildSceneAtlas(characters: Set<string>, skills: SkillWord[], events: WorldEvent[]): Promise<Atlas> {
  await loadFaces([CELL_FONT, SKILL_FONT, CITY_FONT]);
  const marks = MarksLayer.requests();
  const requests: WordRequest[] = [
    ...[...characters].map((character) => ({
      key: cellKey(character),
      text: character,
      font: CELL_FONT,
      sizePixels: CELL_PIXELS,
    })),
    ...skills.map((skill) => ({
      key: skillKey(skill.word),
      text: skill.word,
      font: SKILL_FONT,
      sizePixels: SKILL_PIXELS,
      glyph: glyphOfSkill(skill),
    })),
    ...marks.cities.map((mark) => ({ ...mark, font: CITY_FONT, sizePixels: 72 })),
    ...marks.years.map((mark) => ({ ...mark, font: YEAR_FONT, sizePixels: SKILL_PIXELS })),
    ...events.map((event) => ({ key: eventLabelKey(event.id), text: event.label, font: LABEL_FONT, sizePixels: 30, glyph: glyphOfEvent(event) })),
  ];
  return buildAtlas(requests);
}

/*
  Which words the scene writes, in which face, and where. There is every skill and every event's short label. There
  are the years at the arch's left foot and the three cities on the floor. Skills, events and cities carry glyphs.
  Sizes are the letters' height in scene units. The word layer keeps readable ones at 13 pixels or more.
*/
import * as THREE from "three";
import { stays } from "@/content/about/profile";
import type { WorldEvent } from "@/lib/about-cv/events";
import type { SkillWord } from "@/lib/about-cv/skills";
import { FIRST_YEAR, timeAtStartOf } from "@/lib/about-cv/time";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { placeGlyph, type Glyph } from "@/lib/about-cv/icons";
import { worldIndex, type WorldKey } from "@/lib/about-cv/worlds";
import {
  anchorOf,
  onArch,
  zOfTime,
  type Point,
  type Vault,
} from "./layout";
import type { Atlas, WordRequest } from "@/lib/about-cv/scene/word-atlas";
import type { PlacedWord } from "./words";

const TEXT_SIZE = 28;
const DISPLAY_SIZE = 96;
const YEAR_SIZE = 64;

export const FACES = [
  `500 ${TEXT_SIZE}px Figtree`,
  `600 ${TEXT_SIZE}px Figtree`,
  `400 ${YEAR_SIZE}px Fraunces`,
  `500 ${DISPLAY_SIZE}px Fraunces`,
];

const textFace = (weight = 500) => `${weight} ${TEXT_SIZE}px Figtree`;

export const skillKey = (skill: SkillWord) => `skill:${skill.word}`;
export const eventKey = (event: WorldEvent) => `event:${event.id}`;
const yearKey = (year: number) => `year:${year}`;
const cityKey = (city: string) => `city:${city}`;
/** The present names itself with its date too ("Twin Technology, since August 2026"); its city is on the floor beside it. */
export const presentLabel = (present: WorldEvent) =>
  `${present.label}, ${present.dates.charAt(0).toLowerCase()}${present.dates.slice(1)}`;

const labelOf = (event: WorldEvent) =>
  event.isPresent ? presentLabel(event) : event.label;

export function wordRequests(
  skills: SkillWord[],
  events: WorldEvent[],
  present: number,
): WordRequest[] {
  const text = (
    key: string,
    words: string,
    glyph: Glyph,
    weight = 500,
  ): WordRequest => ({
    key,
    text: words,
    font: textFace(weight),
    sizePixels: TEXT_SIZE,
    glyph,
  });
  const years: WordRequest[] = [];
  for (let year = FIRST_YEAR; year <= Math.floor(present); year++)
    years.push({
      key: yearKey(year),
      text: String(year),
      font: `400 ${YEAR_SIZE}px Fraunces`,
      sizePixels: YEAR_SIZE,
    });
  return [
    ...years,
    ...stays.map((stay) => ({
      key: cityKey(stay.city),
      text: stay.city,
      font: `500 ${DISPLAY_SIZE}px Fraunces`,
      sizePixels: DISPLAY_SIZE,
      glyph: placeGlyph,
      glyphShare: CITY_GLYPH_SHARE,
    })),
    ...events.map((event) =>
      text(
        eventKey(event),
        labelOf(event),
        glyphOfEvent(event),
        event.isPresent ? 600 : 500,
      ),
    ),
    ...skills.map((skill) =>
      text(skillKey(skill), skill.word, glyphOfSkill(skill)),
    ),
  ];
}

export type WordColours = { light: THREE.Color; muted: THREE.Color };

/** A label beside its bead, on the inner side of its line, so it reads toward the middle of the vault. */
function labelAnchor(world: WorldKey): [number, number] {
  if (world === "work" || world === "study") return [-0.06, 0.15];
  if (world === "offTheClock") return [0.5, 1.25];
  return [1.06, 0.15];
}

/**
 * Events on one line within the same month share a point: three Anthropic courses in May 2026, three repositories of
 * 2016. So their labels stack one line apart, in the CV's order, instead of printing over one another.
 */
function stackPlaces(events: WorldEvent[]) {
  const seen = new Map<string, number>();
  const places = new Map<string, number>();
  for (const event of events) {
    const time = event.end ?? event.start;
    const bucket = `${event.world} ${Math.round(time * 12)}`;
    const place = seen.get(bucket) ?? 0;
    seen.set(bucket, place + 1);
    places.set(event.id, place);
  }
  return places;
}

const SKILL_LETTERS = 0.1;
const EVENT_LETTERS = 0.092;
/** The present names itself a little smaller than its light deserves, so its one line clears the year rail. */
const PRESENT_LETTERS = 0.074;
/** A city's pin against its name's size: about the height of its lower-case letters. */
const CITY_GLYPH_SHARE = 0.5;
const YEAR_LETTERS = 0.26;

export function placeWords(
  skills: SkillWord[],
  skillPlaces: Point[],
  events: WorldEvent[],
  vault: Vault,
  present: number,
  colours: WordColours,
): PlacedWord[] {
  const words: PlacedWord[] = [];
  for (let year = FIRST_YEAR; year <= Math.floor(present); year++) {
    const foot = onArch(vault, 180, 1.16);
    words.push({
      key: yearKey(year),
      kind: "year",
      at: { x: foot.x - 0.12, y: 0.04, z: zOfTime(year, present) },
      letterHeight: YEAR_LETTERS,
      anchor: [1, 0],
      colour: colours.light,
      strength: 0.62,
      minimumPixels: 13,
    });
  }
  const stacked = stackPlaces(events);
  for (const event of events) {
    const at = anchorOf(event, vault, present);
    const [across, down] = labelAnchor(event.world);
    words.push({
      key: eventKey(event),
      kind: event.isPresent ? "present" : "event",
      world: worldIndex(event.world),
      at,
      letterHeight: event.isPresent ? PRESENT_LETTERS : EVENT_LETTERS,
      anchor: event.isPresent
        ? [-0.1, -0.55]
        : [across, down - (stacked.get(event.id) ?? 0) * 0.95],
      colour: colours.light,
      strength: event.isPresent ? 1 : 0.95,
      // The present always names itself. Other labels show once they are big enough to read.
      minimumPixels: event.isPresent ? 15 : 0,
    });
  }
  skills.forEach((skill, index) =>
    words.push({
      key: skillKey(skill),
      kind: "skill",
      at: skillPlaces[index],
      letterHeight: SKILL_LETTERS,
      anchor: [0.5, 0.5],
      colour: colours.muted,
      strength: 1,
      minimumPixels: 13,
    }),
  );
  return words;
}

/** The longest a city's name may run across the floor: the floor's width. */
const floorWidth = (vault: Vault) => vault.halfWidth * 2.2;

/** The tallest a city's letters stand, in scene units, so the nearest city never covers the present. */
const CITY_LETTERS_AT_MOST = 0.5;

/** A city's name stands in the middle of its years, but never within a year of now, where the present's own words are. */
const cityTime = (from: number, to: number, present: number) =>
  Math.min((from + to) / 2, present - 1.15);

/** Each city lies flat on the floor in the middle of its years, as large as the floor's width lets it be. */
export function placeCities(
  vault: Vault,
  present: number,
  atlas: Atlas,
  colours: WordColours,
): PlacedWord[] {
  return stays.map((stay) => {
    const from = timeAtStartOf(stay.from);
    const to = stay.to ? timeAtStartOf(stay.to) : present;
    const entry = atlas.entries.get(cityKey(stay.city));
    const aspect = entry ? entry.aspect : 3;
    const share = entry ? entry.sizeShare : 0.6;
    const longest = (floorWidth(vault) * share) / aspect;
    const letterHeight = Math.min(longest, CITY_LETTERS_AT_MOST);
    return {
      key: cityKey(stay.city),
      kind: "city",
      at: { x: 0, y: 0.002, z: zOfTime(cityTime(from, to, present), present) },
      letterHeight,
      anchor: [0.5, 0.25],
      colour: colours.light,
      strength: 0.5,
      minimumPixels: 0,
    };
  });
}

/** The times the city changed, for the floor's brighter lines. */
export const moveTimes = () =>
  stays.slice(1).map((stay) => timeAtStartOf(stay.from));

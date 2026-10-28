/*
  The life's object, built from the CV as points in four dimensions. Every world is a family of dotted orbits, evenly
  spaced in size from now out to 2014, wound through by its line, a spiral that turns once a year. A span (a role, a degree, a
  course that ran for months) is its stretch of the line drawn brighter. Every event is a bead on its line. Every
  skill is a few specks of dust near the events that name it, or near its CV group when none does.

  Nothing here knows about the screen. The scene turns these points and draws them.
*/
import { cvSkillGroups, stays } from "@/content/about/profile";
import type { WorldEvent } from "@/lib/about-cv/events";
import type { SkillWord } from "@/lib/about-cv/skills";
import { FIRST_YEAR, timeAtStartOf } from "@/lib/about-cv/time";
import { worldIndex, worlds, type WorldKey } from "@/lib/about-cv/worlds";
import { quieter, rgbOf, worldColour, QUIET_WORDS, WORDS, type Rgb } from "./palette";
import {
  cityPoint,
  levelCirclePoint,
  linePoint,
  orbitPoint,
  orbitRadius,
  presentPoint,
  timeOfW,
  yearPoint,
  type Point4,
} from "./space";

export type HypercubeData = {
  events: WorldEvent[];
  skills: SkillWord[];
  present: number;
};

/** How finely the object is drawn: a phone draws fewer orbits, fewer dots and fewer specks. */
export type Detail = {
  /** How many orbits each world draws, evenly spaced in size from now out to 2014. */
  orbitsPerWorld: number;
  /** Dots on an orbit of radius 1. Smaller orbits get fewer, in proportion. */
  dotsPerRadius: number;
  /** The gap between dots along a world's line, in units of the object (2014's orbit has radius 1). */
  lineGap: number;
  /** Dust specks for each skill. */
  specksPerSkill: number;
};

export const COMPUTER_DETAIL: Detail = {
  orbitsPerWorld: 28,
  dotsPerRadius: 260,
  lineGap: 0.014,
  specksPerSkill: 7,
};

export const PHONE_DETAIL: Detail = {
  orbitsPerWorld: 15,
  dotsPerRadius: 130,
  lineGap: 0.04,
  specksPerSkill: 4,
};

/** What a dot is part of, for its strength and size. */
export type DotKind = "orbit" | "line" | "span" | "move" | "dust" | "bead";

/** How bright and how large each kind of dot is drawn, before light and distance. */
const LOOKS: Record<DotKind, { strength: number; size: number }> = {
  orbit: { strength: 0.26, size: 1.6 },
  line: { strength: 0.4, size: 1.8 },
  span: { strength: 0.9, size: 2.3 },
  move: { strength: 0.16, size: 1.6 },
  dust: { strength: 0.42, size: 2 },
  bead: { strength: 1, size: 7 },
};

/** Every dot of one layer, in the arrays the graphics chip reads. */
export type Dots = {
  count: number;
  places: Float32Array;
  times: Float32Array;
  colours: Float32Array;
  looks: Float32Array;
  worlds: Float32Array;
};

class DotList {
  private readonly places: number[] = [];
  private readonly times: number[] = [];
  private readonly colours: number[] = [];
  private readonly looks: number[] = [];
  private readonly worlds: number[] = [];

  add(place: Point4, time: number, colour: Rgb, kind: DotKind, world: number, strengthScale = 1) {
    const look = LOOKS[kind];
    this.places.push(...place);
    this.times.push(time);
    this.colours.push(...colour);
    this.looks.push(look.strength * strengthScale, look.size);
    this.worlds.push(world);
  }

  finish(): Dots {
    return {
      count: this.times.length,
      places: new Float32Array(this.places),
      times: new Float32Array(this.times),
      colours: new Float32Array(this.colours),
      looks: new Float32Array(this.looks),
      worlds: new Float32Array(this.worlds),
    };
  }
}

/** The same stream of numbers on every visit, so the dust and the dots' offsets never change between loads. */
function steadyRandom(start: number) {
  let state = start >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
  The moments an orbit is drawn at, evenly spaced in size from now out to 2014. Since an orbit's size grows with the
  square root of how long ago it was, the recent orbits are closer together in time, where the life is busiest and
  where the unfold begins.
*/
export function orbitTimes(present: number, count: number) {
  const times: number[] = [];
  for (let orbit = 1; orbit <= count; orbit++) times.push(present - (orbit / count) ** 2 * (present - FIRST_YEAR));
  return times;
}

/** Each world's orbits: full circles of dots, each at its moment, with as many dots as its size needs. */
function addOrbits(list: DotList, present: number, detail: Detail) {
  const random = steadyRandom(5);
  for (const world of worlds) {
    const colour = worldColour(world.key, true);
    for (const time of orbitTimes(present, detail.orbitsPerWorld)) {
      const count = Math.max(12, Math.round(detail.dotsPerRadius * orbitRadius(time, present)));
      const offset = random() * Math.PI * 2;
      for (let dot = 0; dot < count; dot++) {
        const angle = offset + (dot / count) * Math.PI * 2;
        list.add(orbitPoint(world.key, time, angle, present), time, colour, "orbit", worldIndex(world.key));
      }
    }
  }
}

const distance4 = (first: Point4, second: Point4) =>
  Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2], first[3] - second[3]);

/** Moments along a world's line from one time back to another, about one gap apart in the object. */
function alongTheLine(world: WorldKey, from: number, to: number, gap: number, present: number) {
  const moments: number[] = [];
  let time = from;
  let previous = linePoint(world, time, present);
  moments.push(time);
  // A small step in time, grown or shrunk so the next dot lands about one gap along the line.
  let step = 0.001;
  while (time - step > to) {
    const next = linePoint(world, time - step, present);
    const moved = distance4(previous, next);
    step *= moved > 0 ? Math.min(4, Math.max(0.25, gap / moved)) : 2;
    const landed = time - step;
    if (landed <= to) break;
    time = landed;
    previous = linePoint(world, time, present);
    moments.push(time);
  }
  return moments;
}

/** Each world's line: a spiral out from now to 2014, turning once a year. */
function addLines(list: DotList, present: number, detail: Detail) {
  for (const world of worlds)
    for (const time of alongTheLine(world.key, present, FIRST_YEAR, detail.lineGap, present))
      list.add(linePoint(world.key, time, present), time, worldColour(world.key), "line", worldIndex(world.key));
}

/** A long span is drawn a little fainter, so a four-year degree does not outshine a month-long course. */
const spanStrength = (years: number) => 1 / (1 + 0.25 * years);

/** A span's stretch of its world's line, brighter and denser. */
function addSpans(list: DotList, events: WorldEvent[], present: number, detail: Detail) {
  for (const event of events) {
    if (event.end === undefined) continue;
    const end = Math.min(event.end, present);
    const strength = spanStrength(end - event.start);
    for (const time of alongTheLine(event.world, end, event.start, detail.lineGap * 0.6, present))
      list.add(linePoint(event.world, time, present), time, worldColour(event.world), "span", worldIndex(event.world), strength);
  }
}

/** A faint level circle at each move between cities. */
function addMoves(list: DotList, present: number, detail: Detail) {
  const colour = quieter(rgbOf(QUIET_WORDS), 1);
  for (const stay of stays.slice(1)) {
    const time = timeAtStartOf(stay.from);
    const count = Math.round(detail.dotsPerRadius * 1.4 * orbitRadius(time, present));
    for (let dot = 0; dot < count; dot++)
      list.add(levelCirclePoint(time, (dot / count) * Math.PI * 2, present), time, colour, "move", -1);
  }
}

/** The structure: orbits, lines, spans and moves, drawn as one layer. */
export function structureDots(data: HypercubeData, detail: Detail): Dots {
  const list = new DotList();
  addOrbits(list, data.present, detail);
  addLines(list, data.present, detail);
  addSpans(list, data.events, data.present, detail);
  addMoves(list, data.present, detail);
  return list.finish();
}

/** Where an event's bead sits: a span's at its end, a point's at its moment, the present at now. */
export const beadTime = (event: WorldEvent, present: number) =>
  event.isPresent ? present : Math.min(present, event.end ?? event.start);

export const beadPoint = (event: WorldEvent, present: number): Point4 =>
  event.isPresent ? presentPoint(present) : linePoint(event.world, beadTime(event, present), present);

/** When each bead's event began, so a span lights in every year it ran through. */
export const beadStarts = (data: HypercubeData) =>
  new Float32Array(data.events.map((event) => Math.min(event.start, beadTime(event, data.present))));

/** The beads: one per event, in the data's order. */
export function beadDots(data: HypercubeData): Dots {
  const list = new DotList();
  for (const event of data.events)
    list.add(
      beadPoint(event, data.present),
      beadTime(event, data.present),
      worldColour(event.world),
      "bead",
      worldIndex(event.world),
    );
  return list.finish();
}

const meanOf = (points: Point4[]): Point4 =>
  [0, 1, 2, 3].map((axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length) as Point4;

/** How far a skill's specks scatter around its home: tight near the events that name it, looser with its group. */
const NAMED_SCATTER = 0.05;
const GROUP_SCATTER = 0.14;

/** A skill's home: the middle of the events that name it, or of its CV group's named skills, or mid-life. */
export function skillHomes(data: HypercubeData): Point4[] {
  const beadOf = new Map(data.events.map((event) => [event.id, beadPoint(event, data.present)]));
  const named = data.skills.map((skill) =>
    skill.events.length ? meanOf(skill.events.map((id) => beadOf.get(id) as Point4)) : null,
  );
  const groupHome = new Map<string, Point4>();
  for (const group of [...cvSkillGroups.map((each) => each.name)]) {
    const homes = data.skills
      .map((skill, index) => (skill.group === group ? named[index] : null))
      .filter((home): home is Point4 => home !== null);
    if (homes.length) groupHome.set(group, meanOf(homes));
  }
  const middleOfLife = levelCirclePoint((data.present + FIRST_YEAR) / 2, 0, data.present);
  return data.skills.map(
    (skill, index) => named[index] ?? groupHome.get(skill.group) ?? [middleOfLife[0] * 0.3, 0, 0, middleOfLife[3]],
  );
}

/** The world a skill belongs to most: the one with most of its events, the newest on a tie. None when unnamed. */
export function homeWorldOf(skill: SkillWord, events: WorldEvent[]): WorldKey | null {
  const counts = new Map<WorldKey, number>();
  for (const id of skill.events) {
    const event = events.find((candidate) => candidate.id === id);
    if (event) counts.set(event.world, (counts.get(event.world) ?? 0) + 1);
  }
  let best: WorldKey | null = null;
  for (const [world, count] of counts) if (best === null || count >= (counts.get(best) ?? 0)) best = world;
  return best;
}

/** A skill named by many events gets more specks, so when it is lit each of its events gathers some. */
const specksFor = (skill: SkillWord, detail: Detail) =>
  Math.max(detail.specksPerSkill, Math.min(24, skill.events.length * 3));

/** How far round an event a gathered speck may settle. */
const GATHERED_SCATTER = 0.03;

/**
  The skills' dust: a few specks for each skill, scattered round its home, in the quiet hue of its world. Each speck
  also has a place to fly to when its skill is lit: beside one of the events that name it, taken in turn.
*/
export function dustDots(data: HypercubeData, detail: Detail) {
  const list = new DotList();
  const random = steadyRandom(11);
  const homes = skillHomes(data);
  const beadOf = new Map(data.events.map((event) => [event.id, beadPoint(event, data.present)]));
  const skillOfSpeck: number[] = [];
  const targets: number[] = [];
  data.skills.forEach((skill, index) => {
    const world = homeWorldOf(skill, data.events);
    const colour = world ? worldColour(world, true) : rgbOf(QUIET_WORDS);
    const scatter = skill.events.length ? NAMED_SCATTER : GROUP_SCATTER;
    for (let speck = 0; speck < specksFor(skill, detail); speck++) {
      const home = homes[index];
      const place = home.map((value) => value + (random() * 2 - 1) * scatter) as Point4;
      list.add(place, timeOfW(place[3], data.present), colour, "dust", world ? worldIndex(world) : -1);
      skillOfSpeck.push(index);
      const eventId = skill.events[speck % Math.max(1, skill.events.length)];
      const target = eventId ? (beadOf.get(eventId) as Point4) : place;
      targets.push(...target.map((value) => value + (random() * 2 - 1) * GATHERED_SCATTER));
    }
  });
  return {
    dots: list.finish(),
    skillOfSpeck: new Float32Array(skillOfSpeck),
    targets: new Float32Array(targets),
  };
}

/** The years marked on the spine: every second 1 January from 2014, and this year, so the spine reads as a ruler. */
export function yearMarks(present: number) {
  const years: { year: number; time: number; place: Point4 }[] = [];
  for (let year = FIRST_YEAR; year <= Math.floor(present); year++)
    if ((year - FIRST_YEAR) % 2 === 0 || year === Math.floor(present))
      years.push({ year, time: year, place: yearPoint(year, present) });
  return years;
}

/** The cities on the lower spine, each at the middle of its stay. */
export function cityMarks(present: number) {
  return stays.map((stay) => {
    const from = timeAtStartOf(stay.from);
    const to = stay.to ? timeAtStartOf(stay.to) : present;
    const time = (from + to) / 2;
    return { city: stay.city, from, to, time, place: cityPoint(time, present) };
  });
}

export const WORD_COLOUR = rgbOf(WORDS);

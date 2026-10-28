/*
  Where everything sits in the scene. Time runs along the depth axis: the present at z = 0, the past further away
  (negative z). The five world lines stand on an arch over a floor, like a vault seen end on. The skills hang in the
  space inside it. Each rule is its own function, so moving one line or one word moves only that.
*/
import type { SkillWord } from "@/lib/world-lines/skills";
import type { WorldEvent } from "@/lib/world-lines/events";
import type { WorldKey } from "@/lib/world-lines/worlds";

/** How far one year is along the depth axis, in scene units. */
export const YEAR_LENGTH = 2.2;

export const zOfTime = (time: number, present: number) =>
  -(present - time) * YEAR_LENGTH;

export const timeOfZ = (z: number, present: number) =>
  present + z / YEAR_LENGTH;

export type Point = { x: number; y: number; z: number };

/** The arch the lines stand on: half its width at the floor, and its height. */
export type Vault = { halfWidth: number; height: number };

/**
 * A narrow screen gets a tall, narrow arch, so the lines stay on screen when the camera is inside it. A wide screen
 * gets a wide, low one.
 */
export function vaultFor(aspect: number): Vault {
  const portrait = { halfWidth: 1.05, height: 1.75 };
  const landscape = { halfWidth: 2.3, height: 1.6 };
  const amount = Math.min(1, Math.max(0, (aspect - 0.5) / 1.1));
  return {
    halfWidth:
      portrait.halfWidth + (landscape.halfWidth - portrait.halfWidth) * amount,
    height: portrait.height + (landscape.height - portrait.height) * amount,
  };
}

/** Where on the arch each world stands, in degrees from the right foot (0) over the top (90) to the left foot (180). */
const WORLD_ANGLES: Record<WorldKey, number> = {
  work: 154,
  study: 116,
  offTheClock: 90,
  projects: 64,
  courses: 26,
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** A point on the arch's ellipse, at a fraction of its size (1 is the arch itself). */
export function onArch(vault: Vault, degrees: number, fraction = 1) {
  return {
    x: Math.cos(radians(degrees)) * vault.halfWidth * fraction,
    y: Math.sin(radians(degrees)) * vault.height * fraction,
  };
}

/** Off the clock is the looser thread: it wanders a little around its place on the arch, slowly, along the years. */
function wander(world: WorldKey, z: number) {
  if (world !== "offTheClock") return { x: 0, y: 0 };
  return {
    x: Math.sin(z * 0.8) * 0.09 + Math.sin(z * 2.1 + 1.3) * 0.025,
    y: Math.sin(z * 0.53 + 0.7) * 0.07,
  };
}

/** The world line's point at a depth. */
export function worldPoint(world: WorldKey, vault: Vault, z: number): Point {
  const base = onArch(vault, WORLD_ANGLES[world]);
  const drift = wander(world, z);
  return { x: base.x + drift.x, y: base.y + drift.y, z };
}

/** How far the lines run past now, toward the camera, before they fade: the future, unwritten. */
export const LINES_PAST_NOW = 3.2;

/** How far they run before 2014, fading into the dark. */
export const LINES_BEFORE_FIRST_YEAR = 9;

/**
 * The time an event is met at: its newest moment. The travel goes from now back in time, so it meets a span at its
 * near end first.
 */
export const anchorTimeOf = (event: WorldEvent) => event.end ?? event.start;

export function anchorOf(
  event: WorldEvent,
  vault: Vault,
  present: number,
): Point {
  // A span's mark sits a hair inside its near end, so two spans that meet do not share a point.
  const time = event.end !== undefined ? event.end - 0.03 : event.start;
  return worldPoint(event.world, vault, zOfTime(time, present));
}

/** A number from 0 to 1 that a word always gets, so each word's place is the same on every visit. */
export function steadyRandom(text: string, salt = 0) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

/** The time a skill floats at: among the events that name it, or among its group's, or anywhere in the years. */
function skillTime(
  skill: SkillWord,
  eventTimes: Map<string, number>,
  groupTimes: Map<string, number[]>,
  firstTime: number,
  present: number,
) {
  const own = skill.events.map((id) => eventTimes.get(id) as number);
  const pool = own.length ? own : (groupTimes.get(skill.group) ?? []);
  if (!pool.length)
    return firstTime + steadyRandom(skill.word, 7) * (present - firstTime);
  const earliest = Math.min(...pool);
  const latest = Math.max(...pool);
  if (own.length) {
    const middle = own.reduce((sum, time) => sum + time, 0) / own.length;
    return keepClearOfNow(
      middle + (steadyRandom(skill.word, 3) - 0.5) * 1.6,
      skill.word,
      present,
    );
  }
  // A word no event names floats among its group's years, reaching a little before them: it was learned before used.
  const reachBack = 2.5;
  return keepClearOfNow(
    earliest -
      reachBack +
      steadyRandom(skill.word, 5) * (latest - earliest + reachBack),
    skill.word,
    present,
  );
}

/** The present keeps a little clear air around its light and its name: a word that would crowd it moves back a little. */
function keepClearOfNow(time: number, word: string, present: number) {
  const clearYears = 0.45;
  if (time < present - clearYears) return time;
  return present - clearYears - steadyRandom(word, 17) * 0.9;
}

/** The groups fan across the arch in the CV's order, each a wedge of the space inside it. */
function groupAngle(groupIndex: number, groupCount: number, word: string) {
  const wedge = 150 / groupCount;
  const centre = 165 - wedge * (groupIndex + 0.5);
  return centre + (steadyRandom(word, 11) - 0.5) * wedge * 3;
}

/** The camera travels along this line inside the arch, so no word may hang on it. */
export const cameraLineHeight = (vault: Vault) => vault.height * 0.52;

function keepOffTheCameraLine(point: { x: number; y: number }, vault: Vault) {
  const across = point.x / vault.halfWidth;
  const up = (point.y - cameraLineHeight(vault)) / vault.height;
  const distance = Math.hypot(across, up);
  const clearance = 0.3;
  if (distance >= clearance) return point;
  const push = clearance / Math.max(distance, 0.001);
  return {
    x: across * push * vault.halfWidth || clearance * vault.halfWidth,
    y: cameraLineHeight(vault) + up * push * vault.height,
  };
}

/** The middle of an event's time: a skill named by a long role floats somewhere along that role, not at its end. */
const middleTimeOf = (event: WorldEvent) =>
  event.end !== undefined ? (event.start + event.end) / 2 : event.start;

export function skillPlaces(
  skills: SkillWord[],
  events: WorldEvent[],
  vault: Vault,
  present: number,
  firstTime: number,
): Point[] {
  const eventTimes = new Map(
    events.map((event) => [event.id, middleTimeOf(event)]),
  );
  const groups = [...new Set(skills.map((skill) => skill.group))];
  const groupTimes = new Map<string, number[]>();
  for (const skill of skills)
    for (const id of skill.events) {
      const times = groupTimes.get(skill.group) ?? [];
      times.push(eventTimes.get(id) as number);
      groupTimes.set(skill.group, times);
    }
  return skills.map((skill) => {
    const time = skillTime(skill, eventTimes, groupTimes, firstTime, present);
    const angle = groupAngle(
      groups.indexOf(skill.group),
      groups.length,
      skill.word,
    );
    const fraction = 0.34 + steadyRandom(skill.word, 13) * 1.15;
    const onPlane = keepOffTheCameraLine(onArch(vault, angle, fraction), vault);
    return {
      x: onPlane.x,
      y: Math.max(0.12, onPlane.y),
      z: zOfTime(time, present),
    };
  });
}

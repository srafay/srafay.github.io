/*
  Everything in the sky, in world units, and where the camera stands for each part of the story. Nothing here is
  drawn for decoration: every star is a day, a city, a role, the Masters or a repository, and every line joins the
  cities in the order the career reached them.

  The galaxy of days lies on the plane z = 0. The career's constellation and the repositories' cluster hang further
  away, at the depths below, so from the first screen they are faint and small, and the pointer's parallax separates
  them from the galaxy. The story flies the camera to each in turn.
*/
import calendar from "../../../content/about/contributions.json";
import { pinnedRepositories, type City } from "../../../content/about/profile";
import { careerStops, keyOf, type CareerStop } from "../career";
import { dayStars, monthNamePoint, MONTH_NAMES, type DayStar } from "../galaxy";
import {
  busiestDayIndex,
  longestActiveRun,
  longestQuietStretch,
  type Stretch,
} from "../year-facts";
import type { Frame, Point, Region, Stage } from "./camera";
import { isPortrait } from "./environment";

export type Colour = "starlight" | "gold";
export type StarKind = "day" | "city" | "role" | "degree" | "repository";

export type WorldStar = Point & {
  kind: StarKind;
  coreRadius: number;
  brightness: number;
  colour: Colour;
  twinkleSpeed: number;
  twinklePhase: number;
  /** For a day: its place in the year. */
  dayIndex: number;
};

export type WorldLine = { from: Point; to: Point; stopIndex: number };
export type LabelSide = "left" | "right" | "above" | "below";
export type Anchor = { point: Point; side: LabelSide };

export const SCENES = [
  "hero",
  "year",
  "career",
  "code",
  "tools",
  "elsewhere",
] as const;
export type SceneName = (typeof SCENES)[number];

// Where the far parts of the sky hang: across, up and away from the galaxy.
const CAREER_PLANE = { x: 700, y: -900, z: 2100 };
const CODE_PLANE = { x: -800, y: 900, z: 4200 };

// The career is drawn on a map: degrees of longitude and latitude to world units, around the middle of the three.
const WORLD_UNITS_PER_DEGREE = 8.6;
const MAP_MIDDLE = { longitude: 109.1, latitude: -4.5 };
const ROLE_COLUMN_OFFSET = 64;
const ROLE_SPACING = 90;
/** A city's name and its years sit over its star. */
const CITY_LABEL_SIDE: LabelSide = "above";
/**
 * The closest the camera comes to a scene's stars, in screen pixels per world unit. A wide screen comes closer, so a
 * role's label has room under its name for what the role was.
 */
const closestScale = (stage: Stage) =>
  isPortrait(stage.width, stage.height) ? 1.25 : 1.8;

// How large a career or repository star's core is, in world units.
const CITY_CORE = 7;
const SMALLEST_ROLE_CORE = 2.6;
const LARGEST_ROLE_GROWTH = 5.4;
const SMALLEST_REPOSITORY_CORE = 2;
const LARGEST_REPOSITORY_GROWTH = 26;

/** A steady pseudo-random number from 0 to 1 for a star, so its twinkle is the same on every visit. */
function steadyNoise(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function twinkleFor(seed: number) {
  return {
    twinkleSpeed: 0.6 + steadyNoise(seed) * 1.1,
    twinklePhase: steadyNoise(seed + 0.5) * Math.PI * 2,
  };
}

export const days = calendar.days;
export const galaxyDays: DayStar[] = dayStars(days);
export const busiestIndex = busiestDayIndex(days);
export const quietStretch: Stretch = longestQuietStretch(days);
export const activeRun: Stretch = longestActiveRun(days);

const busiestDate = days[busiestIndex].date;
/** The busiest day is the galaxy's one gold star. */
const dayColour = (day: DayStar): Colour =>
  day.date === busiestDate ? "gold" : "starlight";

function dayWorldStar(day: DayStar): WorldStar {
  return {
    kind: "day",
    x: day.x,
    y: day.y,
    z: 0,
    coreRadius: day.coreRadius,
    brightness: day.brightness,
    colour: dayColour(day),
    dayIndex: day.index,
    ...twinkleFor(day.index),
  };
}

export const monthNames = MONTH_NAMES.map((name, index) => ({
  name,
  point: { ...monthNamePoint(index + 1), z: 0 },
}));

/** The index in the year of each month's first day there, so its name arrives with its arm in the intro. */
export const firstIndexOfMonth = (month: number) =>
  galaxyDays.findIndex((day) => day.month === month && day.dayOfMonth === 1);

/* The career. */

export const stops: CareerStop[] = careerStops();

function cityPoint(city: City): Point {
  return {
    x:
      CAREER_PLANE.x +
      (city.longitude - MAP_MIDDLE.longitude) * WORLD_UNITS_PER_DEGREE,
    y:
      CAREER_PLANE.y -
      (city.latitude - MAP_MIDDLE.latitude) * WORLD_UNITS_PER_DEGREE,
    z: CAREER_PLANE.z,
  };
}

export const cityPoints = stops.map((stop) => cityPoint(stop.city));

/** A stop's roles hang on the side away from its neighbours, so their names never cross the path between cities. */
export function roleSideOf(stopIndex: number): LabelSide {
  const here = cityPoints[stopIndex];
  const neighbours = [
    cityPoints[stopIndex - 1],
    cityPoints[stopIndex + 1],
  ].filter(Boolean);
  const towardNeighbours =
    neighbours.reduce((sum, neighbour) => sum + (neighbour.x - here.x), 0) /
    neighbours.length;
  return towardNeighbours > 0 ? "left" : "right";
}

function rolePoint(stopIndex: number, roleIndex: number): Point {
  const city = cityPoints[stopIndex];
  const roleCount = stops[stopIndex].roles.length;
  const direction = roleSideOf(stopIndex) === "right" ? 1 : -1;
  return {
    x: city.x + direction * ROLE_COLUMN_OFFSET,
    y: city.y + (roleIndex - (roleCount - 1) / 2) * ROLE_SPACING,
    z: city.z,
  };
}

/** The Masters sits on the path from the first city to the second, halfway, as it came between their roles. */
export const degreePoint: Point = {
  x: (cityPoints[0].x + cityPoints[1].x) / 2,
  y: (cityPoints[0].y + cityPoints[1].y) / 2,
  z: CAREER_PLANE.z,
};

const longestRoleMonths = Math.max(
  ...stops.flatMap((stop) => stop.roles.map((role) => role.months)),
);

/** A role's core grows with the square root of its months. The current role is the brightest point and gold. */
function roleWorldStar(
  stopIndex: number,
  roleIndex: number,
  seed: number,
): WorldStar {
  const role = stops[stopIndex].roles[roleIndex];
  const share = Math.sqrt(role.months / longestRoleMonths);
  return {
    kind: "role",
    ...rolePoint(stopIndex, roleIndex),
    coreRadius:
      SMALLEST_ROLE_CORE +
      LARGEST_ROLE_GROWTH * share +
      (role.isCurrent ? 2.5 : 0),
    brightness: role.isCurrent ? 1 : 0.62 + 0.3 * share,
    colour: role.isCurrent ? "gold" : "starlight",
    dayIndex: -1,
    ...twinkleFor(1000 + seed),
  };
}

const careerStars: WorldStar[] = [
  ...cityPoints.map((point, index) => ({
    kind: "city" as const,
    ...point,
    coreRadius: CITY_CORE,
    brightness: 0.95,
    colour: "starlight" as const,
    dayIndex: -1,
    ...twinkleFor(900 + index),
  })),
  ...stops.flatMap((stop, stopIndex) =>
    stop.roles.map((_, roleIndex) =>
      roleWorldStar(stopIndex, roleIndex, stopIndex * 10 + roleIndex),
    ),
  ),
  {
    kind: "degree",
    ...degreePoint,
    coreRadius: 4.2,
    brightness: 0.75,
    colour: "starlight",
    dayIndex: -1,
    ...twinkleFor(950),
  },
];

/** The path from city to city through the Masters, and a short spoke from each city to each of its roles. */
export const careerLines: WorldLine[] = [
  { from: cityPoints[0], to: degreePoint, stopIndex: 1 },
  { from: degreePoint, to: cityPoints[1], stopIndex: 1 },
  ...cityPoints
    .slice(1, -1)
    .map((point, index) => ({
      from: point,
      to: cityPoints[index + 2],
      stopIndex: index + 2,
    })),
  ...stops.flatMap((stop, stopIndex) =>
    stop.roles.map((_, roleIndex) => ({
      from: cityPoints[stopIndex],
      to: rolePoint(stopIndex, roleIndex),
      stopIndex,
    })),
  ),
];

/*
  The repositories: a loose column of stars, largest first, each as large as its GitHub stars allow, with every name
  on the same side so six names fit a phone's width. The largest stands apart at the top: its glow needs the room.
*/
const REPOSITORY_PLACES = [
  { x: -20, y: -330 },
  { x: 34, y: -170 },
  { x: -26, y: -60 },
  { x: 30, y: 50 },
  { x: -24, y: 160 },
  { x: 28, y: 270 },
];

const repositoriesByStars = [...pinnedRepositories].sort(
  (one, other) => other.stars - one.stars,
);
const mostStars = repositoriesByStars[0].stars;

export const repositoryPoints: Point[] = repositoriesByStars.map(
  (_, index) => ({
    x: CODE_PLANE.x + REPOSITORY_PLACES[index].x,
    y: CODE_PLANE.y + REPOSITORY_PLACES[index].y,
    z: CODE_PLANE.z,
  }),
);

const repositoryStars: WorldStar[] = repositoriesByStars.map(
  (repository, index) => {
    const share = Math.sqrt(repository.stars / mostStars);
    return {
      kind: "repository",
      ...repositoryPoints[index],
      coreRadius: SMALLEST_REPOSITORY_CORE + LARGEST_REPOSITORY_GROWTH * share,
      brightness: repository.stars === 0 ? 0.3 : 0.55 + 0.45 * share,
      colour: "starlight",
      dayIndex: -1,
      ...twinkleFor(1100 + index),
    };
  },
);

const REPOSITORY_LABEL_SIDE: LabelSide = "right";

export const worldStars: WorldStar[] = [
  ...galaxyDays.map(dayWorldStar),
  ...careerStars,
  ...repositoryStars,
];

/** The HTML labels that sit beside stars, by the names the page gives them (data-sky-anchor). */
export function anchors(): Map<string, Anchor> {
  const busiest = galaxyDays[busiestIndex];
  const entries: [string, Anchor][] = [
    ["busiest", { point: { x: busiest.x, y: busiest.y, z: 0 }, side: "above" }],
    ["degree", { point: degreePoint, side: "below" }],
    ...stops.map((stop, stopIndex): [string, Anchor] => [
      `city:${stop.key}`,
      { point: cityPoints[stopIndex], side: CITY_LABEL_SIDE },
    ]),
    ...stops.flatMap((stop, stopIndex) =>
      stop.roles.map((role, roleIndex): [string, Anchor] => [
        `role:${role.key}`,
        { point: rolePoint(stopIndex, roleIndex), side: roleSideOf(stopIndex) },
      ]),
    ),
    ...repositoriesByStars.map((repository, index): [string, Anchor] => [
      `repository:${keyOf(repository.name)}`,
      { point: repositoryPoints[index], side: REPOSITORY_LABEL_SIDE },
    ]),
  ];
  return new Map(entries);
}

/* Where the camera stands for each part of each scene. */

type Room = { left: number; right: number; top: number; bottom: number };
const NO_ROOM: Room = { left: 0, right: 0, top: 0, bottom: 0 };

/** The part of the stage a scene's stars are framed in: above the words on a phone, beside them on a computer. */
export function starRegion(scene: SceneName, stage: Stage): Region {
  const { width, height } = stage;
  const portrait = isPortrait(width, height);
  if (scene === "hero")
    return portrait
      ? { left: 0, top: height * 0.03, width, height: height * 0.64 }
      : {
          left: width * 0.04,
          top: height * 0.02,
          width: width * 0.92,
          height: height * 0.86,
        };
  if (scene === "tools") return { left: 0, top: 0, width, height };
  // The last screen shows the year again, small and low, under the links.
  if (scene === "elsewhere")
    return portrait
      ? { left: 0, top: height * 0.72, width, height: height * 0.26 }
      : {
          left: width * 0.3,
          top: height * 0.64,
          width: width * 0.4,
          height: height * 0.34,
        };
  return portrait
    ? { left: 12, top: height * 0.03, width: width - 24, height: height * 0.52 }
    : {
        left: width * 0.42,
        top: height * 0.08,
        width: width * 0.55,
        height: height * 0.84,
      };
}

/**
 * A frame around these points that leaves the given screen pixels free on each side for labels, so the labels fit
 * inside the region whatever the scale turns out to be.
 */
function frameAround(
  points: Point[],
  region: Region,
  room: Room,
  padding: number,
  closest: number,
): Frame {
  const left = Math.min(...points.map((point) => point.x)) - padding;
  const right = Math.max(...points.map((point) => point.x)) + padding;
  const top = Math.min(...points.map((point) => point.y)) - padding;
  const bottom = Math.max(...points.map((point) => point.y)) + padding;
  const scale = Math.min(
    (region.width - room.left - room.right) / (right - left),
    (region.height - room.top - room.bottom) / (bottom - top),
    closest,
  );
  return {
    x: (left + right) / 2 + (room.right - room.left) / (2 * scale),
    y: (top + bottom) / 2 + (room.bottom - room.top) / (2 * scale),
    z: points[0].z,
    halfWidth: region.width / (2 * scale),
    halfHeight: region.height / (2 * scale),
  };
}

const pointsOfStretch = (stretch: Stretch) =>
  galaxyDays
    .slice(stretch.firstIndex, stretch.lastIndex + 1)
    .map((day) => ({ x: day.x, y: day.y, z: 0 }));

/** Room for a label beside a star: wide enough for a name and its years at 16 px. */
const LABEL_ROOM = 210;
/** Room above a star for a label set over it (a city's name and its years). */
const LABEL_ROOM_ABOVE = 64;

function labelRoomOnSide(side: LabelSide): Room {
  if (side === "left") return { ...NO_ROOM, left: LABEL_ROOM };
  if (side === "right") return { ...NO_ROOM, right: LABEL_ROOM };
  return NO_ROOM;
}

/** A city with its roles. The Masters is left out: the camera passes it on the way from one city to the next. */
function stopFrame(stopIndex: number, region: Region, closest: number): Frame {
  const roles = stops[stopIndex].roles.map((_, roleIndex) =>
    rolePoint(stopIndex, roleIndex),
  );
  const room = {
    ...labelRoomOnSide(roleSideOf(stopIndex)),
    top: LABEL_ROOM_ABOVE,
    bottom: 24,
  };
  return frameAround(
    [cityPoints[stopIndex], ...roles],
    region,
    room,
    40,
    closest,
  );
}

/**
 * Where the camera waits during the tools: past every star in the world, so the sky behind the words is empty but for
 * the stars beside the tools themselves. The flight there goes through the repositories' cluster.
 */
const PAST_THE_WORLD: Frame = {
  ...CODE_PLANE,
  z: CODE_PLANE.z + 3200,
  halfWidth: 300,
  halfHeight: 300,
};

/** Each scene's resting frames, one for each of its parts, for this stage. */
export function sceneFrames(stage: Stage): Record<SceneName, Frame[]> {
  const sideOf = (scene: SceneName) => starRegion(scene, stage);
  const galaxy: Frame = { x: 0, y: 0, z: 0, halfWidth: 620, halfHeight: 620 };
  const busiest = galaxyDays[busiestIndex];
  const year = sideOf("year");
  const closest = closestScale(stage);
  return {
    hero: [galaxy],
    year: [
      frameAround(
        [{ x: busiest.x, y: busiest.y, z: 0 }],
        year,
        { ...NO_ROOM, top: 70 },
        210,
        closest,
      ),
      frameAround(pointsOfStretch(quietStretch), year, NO_ROOM, 70, closest),
      frameAround(pointsOfStretch(activeRun), year, NO_ROOM, 70, closest),
    ],
    career: stops.map((_, stopIndex) =>
      stopFrame(stopIndex, sideOf("career"), closest),
    ),
    code: [
      frameAround(
        repositoryPoints,
        sideOf("code"),
        { ...NO_ROOM, right: LABEL_ROOM + 50 },
        60,
        closest,
      ),
    ],
    tools: [PAST_THE_WORLD],
    elsewhere: [galaxy],
  };
}

/** How many parts a scene's scroll steps through. */
export const stepCountOf = (scene: SceneName) =>
  ({ hero: 1, year: 3, career: stops.length, code: 1, tools: 1, elsewhere: 1 })[
    scene
  ];

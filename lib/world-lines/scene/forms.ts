/*
  The five world lines, each a light of its own form, so a reader can tell them apart without reading their names.
  Work is one fine filament whose roles burn brighter and wider along it. Study is two broad soft bands, a degree each.
  Projects are solid points of light on a guide too faint to read as a rail. Courses are fine stitches of light across
  their line, one for every month they ran. Off the clock is a thinner thread that wanders.

  There is no floor grid and no ribs: the structure is the lines and their light, and the years are numerals only.
*/
import * as THREE from "three";
import { FIRST_YEAR } from "@/lib/about-cv/time";
import type { WorldEvent } from "@/lib/about-cv/events";
import type { WorldKey } from "@/lib/about-cv/worlds";
import { glowPoints, ribbon, type GlowUniforms, type RibbonLook } from "./glow";
import {
  LINES_BEFORE_FIRST_YEAR,
  LINES_PAST_NOW,
  anchorOf,
  worldPoint,
  zOfTime,
  type Point,
  type Vault,
} from "./layout";

export type Palette = {
  light: THREE.Color;
  muted: THREE.Color;
  signal: THREE.Color;
  present: THREE.Color;
};

/** How bright a line is at a depth: whole between 2014 and now, fading out into the future and into the far past. */
export function fadeAlong(z: number, firstZ: number) {
  if (z > 0) return Math.max(0, 1 - z / LINES_PAST_NOW);
  if (z < firstZ)
    return Math.max(0, 1 - (firstZ - z) / LINES_BEFORE_FIRST_YEAR);
  return 1;
}

/** A run of points along a world line between two depths, close enough together for a wandering line to curve. */
function along(
  world: WorldKey,
  vault: Vault,
  nearZ: number,
  farZ: number,
  step: number,
) {
  const points: Point[] = [];
  for (let z = nearZ; z > farZ; z -= step)
    points.push(worldPoint(world, vault, z));
  points.push(worldPoint(world, vault, farZ));
  return points;
}

/** The colours of a run: the line's colour at its strength, faded at the lines' two ends. */
const coloursFor = (
  points: Point[],
  colour: THREE.Color,
  strength: number,
  firstZ: number,
) =>
  points.map((point) =>
    colour.clone().multiplyScalar(strength * fadeAlong(point.z, firstZ)),
  );

const wholeLine = (
  world: WorldKey,
  vault: Vault,
  firstZ: number,
  step: number,
) =>
  along(world, vault, LINES_PAST_NOW, firstZ - LINES_BEFORE_FIRST_YEAR, step);

/** A gap between two spans that meet, so each role reads as its own. */
const SPAN_GAP = 0.08;

function spanRun(
  event: WorldEvent,
  vault: Vault,
  present: number,
  step: number,
) {
  const nearZ = zOfTime(event.end ?? event.start, present) - SPAN_GAP / 2;
  const farZ = zOfTime(event.start, present) + SPAN_GAP / 2;
  return along(event.world, vault, nearZ, Math.min(farZ, nearZ - 0.02), step);
}

const LOOKS: Record<string, RibbonLook> = {
  filament: { halfWidth: 0.05, core: 1.1, halo: 0.16, sharpness: 70 },
  role: { halfWidth: 0.08, core: 1.3, halo: 0.3, sharpness: 22 },
  band: { halfWidth: 0.11, core: 0.45, halo: 0.28, sharpness: 5 },
  guide: { halfWidth: 0.03, core: 0.5, halo: 0.06, sharpness: 90 },
  stitch: { halfWidth: 0.016, core: 1.2, halo: 0.3, sharpness: 14 },
  thread: { halfWidth: 0.04, core: 0.9, halo: 0.12, sharpness: 80 },
};

const tagged = (mesh: THREE.Mesh, world: WorldKey) => {
  mesh.userData.world = world;
  return mesh;
};

export function buildWorldForms(
  events: WorldEvent[],
  vault: Vault,
  present: number,
  palette: Palette,
  shared: GlowUniforms,
) {
  const firstZ = zOfTime(FIRST_YEAR, present);
  const light = palette.light;
  const run = (points: Point[], strength: number) => ({
    points,
    colours: coloursFor(points, light, strength, firstZ),
  });
  const spans = (world: WorldKey) =>
    events.filter(
      (event) =>
        event.world === world &&
        event.end !== undefined &&
        event.end > event.start,
    );

  const work = wholeLine("work", vault, firstZ, 1);
  const roles = spans("work").map((event) =>
    run(spanRun(event, vault, present, 0.5), event.isPresent ? 1.2 : 0.85),
  );
  const degrees = spans("study").map((event) =>
    run(spanRun(event, vault, present, 0.5), 0.7),
  );
  const stitches = events
    .filter((event) => event.world === "courses")
    .flatMap((event) => {
      const months = Math.max(
        1,
        Math.round(((event.end ?? event.start) - event.start) * 12),
      );
      return Array.from({ length: months }, (_, month) => {
        const centre = worldPoint(
          "courses",
          vault,
          zOfTime(event.start + (month + 0.5) / 12, present),
        );
        return run(
          [
            { x: centre.x - 0.09, y: centre.y - 0.03, z: centre.z },
            { x: centre.x + 0.09, y: centre.y + 0.03, z: centre.z },
          ],
          0.95,
        );
      });
    });

  const group = new THREE.Group();
  group.add(
    tagged(ribbon([run(work, 0.5)], LOOKS.filament, shared), "work"),
    tagged(ribbon(roles, LOOKS.role, shared), "work"),
    tagged(ribbon(degrees, LOOKS.band, shared), "study"),
    tagged(
      ribbon(
        [run(wholeLine("study", vault, firstZ, 1), 0.18)],
        LOOKS.guide,
        shared,
      ),
      "study",
    ),
    tagged(
      ribbon(
        [run(wholeLine("projects", vault, firstZ, 1), 0.16)],
        LOOKS.guide,
        shared,
      ),
      "projects",
    ),
    tagged(ribbon(stitches, LOOKS.stitch, shared), "courses"),
    tagged(
      ribbon(
        [run(wholeLine("courses", vault, firstZ, 1), 0.2)],
        LOOKS.guide,
        shared,
      ),
      "courses",
    ),
    tagged(
      ribbon(
        [run(wholeLine("offTheClock", vault, firstZ, 0.25), 0.55)],
        LOOKS.thread,
        shared,
      ),
      "offTheClock",
    ),
  );
  return group;
}

/** How large each event's light is, halo included, in scene units. The present is the largest. */
function beadSize(event: WorldEvent) {
  if (event.isPresent) return 0.55;
  if (event.world === "projects") return 0.2;
  if (event.world === "work") return 0.2;
  if (event.world === "study") return 0.18;
  if (event.world === "courses") return 0.12;
  return 0.15;
}

export type Beads = {
  object: THREE.Points;
  points: THREE.Vector3[];
  setBrightness(index: number, amount: number, colour: THREE.Color): void;
  setPixelsPerUnitAtOne(value: number): void;
  setTime(seconds: number, breathing: boolean): void;
  /** Each bead's resting colour, the present's warm light included. */
  restingColour(index: number): THREE.Color;
};

export function buildBeads(
  events: WorldEvent[],
  vault: Vault,
  present: number,
  palette: Palette,
  shared: GlowUniforms,
): Beads {
  const places = events.map((event) => anchorOf(event, vault, present));
  const resting = events.map((event) =>
    event.isPresent
      ? palette.present.clone().multiplyScalar(1.4)
      : palette.light.clone(),
  );
  const lights = glowPoints(
    places,
    events.map(beadSize),
    resting.map((colour) => colour.clone()),
    shared,
  );
  const scratch = new THREE.Color();
  return {
    object: lights.points,
    points: places.map((place) => new THREE.Vector3(place.x, place.y, place.z)),
    setBrightness(index, amount, colour) {
      lights.setColour(index, scratch.copy(colour).multiplyScalar(amount));
    },
    setPixelsPerUnitAtOne: lights.setPixelsPerUnitAtOne,
    setTime: lights.setTime,
    restingColour: (index) => resting[index],
  };
}

/** The present's own wide, warm light, the brightest thing on the screen. */
export function presentGlow(point: THREE.Vector3, palette: Palette) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.75)");
  gradient.addColorStop(0.15, "rgba(255,255,255,0.3)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.07)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color: palette.present,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      fog: false,
    }),
  );
  glow.position.copy(point);
  glow.scale.setScalar(1.6);
  return glow;
}

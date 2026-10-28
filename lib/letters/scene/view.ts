/*
  Where the camera stands. It looks back along time at a point in focus. The travel moves that point through the
  years, a turn swings the camera around it, and the zoom brings the camera from the whole land down to reading
  distance, where it looks down more steeply so the rows of letters part and read as lines. Each pose is a function of
  the screen's shape, so a narrow phone frames the land tall and a computer leaves room for the name at the left.
  Every quantity follows its target on a spring, so the camera glides and settles; with reduced motion it jumps.
*/
import { Follower } from "@/lib/about-cv/scene/follower";
import { FIRST_YEAR } from "@/lib/about-cv/time";
import { worlds } from "@/lib/about-cv/worlds";
import { xOfColumn, zOfRow, type Grid } from "@/lib/letters/land/grid";
import { invert, lookAt, multiply, perspective, project, type Matrix, type Vector } from "./matrix";

/**
 * The farthest a turn may swing either way. The rows read left to right: past about half a right angle they run so
 * steeply up the screen that no word reads, and past a right angle every word reads backwards.
 */
export const LARGEST_TURN = (45 * Math.PI) / 180;
/** A drag turns the land this much of what the shared gestures give, so a phone's width is about a quarter turn. */
export const TURN_SHARE = 0.55;
/** The zoom's range: -1 is reading distance, 0 the travel's own pose, the largest the whole land. */
export const READING_ZOOM = -1;
export const WHOLE_ZOOM = 1.4;
/** How far back from now the first screen looks, in years: the present sits near the foot of the screen. */
const FIRST_FOCUS_YEARS = 1.1;
/** Where the travel stops in the past: a little after NED began, so 2014 is still in front of the camera. */
const LAST_FOCUS_TIME = FIRST_YEAR + 0.6;
/** How high over the land the camera's point in focus sits, in cells. */
const FOCUS_HEIGHT = 2;

type Framing = {
  fov: number;
  distance: number;
  pitch: number;
  readingDistance: number;
  readingPitch: number;
  wholeDistance: number;
  wholePitch: number;
  shiftAcross: number;
  shiftUp: number;
  focusColumn: number;
  /** The travel's own turn: the land seen a little from the side, so its rows run in perspective across the screen. */
  restTurn: number;
};

const isNarrow = (aspect: number) => aspect < 0.9;
const degrees = (value: number) => (value * Math.PI) / 180;

/** The framing for a screen's shape: a phone stands closer and looks down more, a computer leaves the left for the name. */
function framingFor(aspect: number, grid: Grid): Framing {
  if (isNarrow(aspect))
    return {
      fov: degrees(56),
      distance: 100,
      pitch: degrees(35.5),
      readingDistance: 58,
      readingPitch: degrees(50),
      wholeDistance: 640,
      wholePitch: degrees(60),
      shiftAcross: 0,
      shiftUp: -0.42,
      focusColumn: grid.laneMiddle("work") + 7,
      restTurn: degrees(20),
    };
  return {
    fov: degrees(40),
    distance: 138,
    pitch: degrees(34.4),
    readingDistance: 82,
    readingPitch: degrees(50),
    wholeDistance: 620,
    wholePitch: degrees(50),
    shiftAcross: 0.24,
    shiftUp: -0.2,
    focusColumn: grid.laneMiddle("projects") - 6,
    restTurn: degrees(20),
  };
}

const lerp = (from: number, to: number, share: number) => from + (to - from) * share;

export class View {
  readonly row: Follower;
  readonly column: Follower;
  readonly zoom = new Follower(0, 60);
  readonly turn = new Follower(0, 60);
  /** What the reader's hand has set; a flight sets the targets too. */
  zoomTarget = 0;
  turnTarget = 0;
  /** A lane or a framing the camera leans over, in columns; null keeps the screen's own. */
  columnTarget: number | null = null;
  private width = 1;
  private height = 1;
  private framing: Framing;
  viewProjection: Matrix = new Float32Array(16);
  inverse: Matrix = new Float32Array(16);
  eye: Vector = [0, 0, 0];
  /** The camera's point in focus, and its right and up in the world. */
  target: Vector = [0, 0, 0];
  right: Vector = [1, 0, 0];
  up: Vector = [0, 1, 0];
  /** Pixels on screen per world unit at depth 1, for sizing letters. */
  focalPixels = 1;

  constructor(
    private readonly grid: Grid,
    private readonly reducedMotion: boolean,
  ) {
    this.framing = framingFor(1, grid);
    this.row = new Follower(this.rowAtTravel(0), 55);
    this.column = new Follower(this.framing.focusColumn, 55);
  }

  /** The row in focus at a share of the travel: the first screen's, back to just after 2014. */
  rowAtTravel(progress: number) {
    const near = this.grid.rowAt(this.grid.present - FIRST_FOCUS_YEARS);
    return lerp(near, this.grid.rowAt(LAST_FOCUS_TIME), progress);
  }

  /** The share of the travel that brings a row into focus. */
  travelAtRow(row: number) {
    const near = this.grid.rowAt(this.grid.present - FIRST_FOCUS_YEARS);
    return Math.min(1, Math.max(0, (row - near) / (this.grid.rowAt(LAST_FOCUS_TIME) - near)));
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.framing = framingFor(width / height, this.grid);
  }

  /** The column the camera faces when nothing leans it: the screen's own. */
  homeColumn() {
    return this.framing.focusColumn;
  }

  /** Turns by the reader's hand. The whole turn, the rest pose's and the reader's together, stays within the largest. */
  turnBy(radians: number) {
    const rest = this.framing.restTurn;
    this.turnTarget = Math.max(-LARGEST_TURN - rest, Math.min(LARGEST_TURN - rest, this.turnTarget + radians * TURN_SHARE));
  }

  zoomBy(amount: number) {
    this.zoomTarget = Math.max(READING_ZOOM, Math.min(WHOLE_ZOOM, this.zoomTarget + amount));
  }

  /** Whether the reader has turned or zoomed away from the travel's own pose. */
  isChanged() {
    return Math.abs(this.turnTarget) > 0.01 || Math.abs(this.zoomTarget) > 0.01 || this.columnTarget !== null;
  }

  reset() {
    this.turnTarget = 0;
    this.zoomTarget = 0;
    this.columnTarget = null;
  }

  /** Moves every spring toward its target by a frame's time. Says whether anything still moves. */
  step(travelRow: number, seconds: number) {
    const columnTarget = this.columnTarget ?? this.framing.focusColumn;
    if (this.reducedMotion) {
      this.row.jump(travelRow);
      this.column.jump(columnTarget);
      this.zoom.jump(this.zoomTarget);
      this.turn.jump(this.turnTarget);
      this.update();
      return false;
    }
    const moving = [
      this.row.step(travelRow, seconds),
      this.column.step(columnTarget, seconds),
      this.zoom.step(this.zoomTarget, seconds),
      this.turn.step(this.turnTarget, seconds),
    ].some(Boolean);
    this.update();
    return moving;
  }

  private nearestLaneMiddle(column: number) {
    const middles = worlds.map((world) => this.grid.laneMiddle(world.key));
    return middles.reduce((best, middle) => (Math.abs(middle - column) < Math.abs(best - column) ? middle : best), middles[0]);
  }

  /** The camera for the springs' values now. */
  update() {
    const camera = this.cameraFor(this.row.value, this.column.value, this.zoom.value, this.turn.value);
    this.eye = camera.eye;
    this.target = camera.target;
    this.right = [camera.view[0], camera.view[4], camera.view[8]];
    this.up = [camera.view[1], camera.view[5], camera.view[9]];
    this.viewProjection = camera.viewProjection;
    this.inverse = invert(this.viewProjection);
    this.focalPixels = (1 / Math.tan(this.framing.fov / 2)) * (this.height / 2);
  }

  /**
   * The nearest zoom, out from a little closer than the travel's own pose, at which every point stands inside the
   * screen's open area (clear of the bars and the controls) with the camera over this row and column.
   */
  zoomToFit(points: Vector[], row: number, column: number, open: { left: number; top: number; right: number; bottom: number }) {
    for (let zoom = -0.4; zoom <= WHOLE_ZOOM + 0.001; zoom += 0.1) {
      const camera = this.cameraFor(row, column, zoom, this.turnTarget);
      const fits = points.every((point) => {
        const spot = project(camera.viewProjection, point, this.width, this.height);
        return spot !== null && spot.x >= open.left && spot.x <= open.right && spot.y >= open.top && spot.y <= open.bottom;
      });
      if (fits) return zoom;
    }
    return WHOLE_ZOOM;
  }

  /** The camera for a row and column in focus, a zoom and the reader's turn. */
  private cameraFor(rowValue: number, columnValue: number, zoom: number, turn: number) {
    const framing = this.framing;
    const inward = Math.max(0, -zoom);
    const outward = Math.max(0, zoom) / WHOLE_ZOOM;
    const distance =
      zoom < 0
        ? framing.distance * (framing.readingDistance / framing.distance) ** inward
        : framing.distance * (framing.wholeDistance / framing.distance) ** outward;
    const pitch = zoom < 0 ? lerp(framing.pitch, framing.readingPitch, inward) : lerp(framing.pitch, framing.wholePitch, outward);
    // Zooming out pulls the camera straight back from the year in focus, so a framing chosen for a year holds.
    const row = rowValue;
    // Closing in to read, the camera settles over the middle of the nearest lane, so its lines are not cut at an edge.
    const reading = lerp(columnValue, this.nearestLaneMiddle(columnValue), inward);
    const column = lerp(reading, this.grid.columns / 2, outward);
    const shiftUp = framing.shiftUp * (1 - inward) * (1 - outward * 0.6);
    const shiftAcross = framing.shiftAcross * (1 - inward) * (1 - outward * 0.5);
    // Zoomed out to the whole land, the turn eases off, so the years run straight up the screen and all of them fit.
    const yaw = (framing.restTurn + turn) * (1 - outward * 0.8);
    const target: Vector = [xOfColumn(column), FOCUS_HEIGHT, zOfRow(row)];
    const toTarget: Vector = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    const eye: Vector = [target[0] - toTarget[0] * distance, target[1] - toTarget[1] * distance, target[2] - toTarget[2] * distance];
    const aspect = this.width / this.height;
    const projection = perspective(framing.fov, aspect, 1, distance * 4 - zOfRow(this.grid.rows), shiftAcross, shiftUp);
    const view = lookAt(eye, target);
    return { eye, target, view, viewProjection: multiply(projection, view) };
  }

  /** A world point on the screen now, in CSS pixels. */
  toScreen(point: Vector) {
    return project(this.viewProjection, point, this.width, this.height);
  }

  size() {
    return { width: this.width, height: this.height };
  }
}

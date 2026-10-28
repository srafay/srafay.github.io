/*
  The land's grid. Across it, left to right: a margin of plain, the five worlds' lanes, another margin. Along it, rows of time: row 0
  is just past now, at the reader's feet, and the rows run back into the past. One cell holds one letter. Each number
  here is one assumption, so a change of size is a change of one line.
*/
import { worlds, type WorldKey } from "@/lib/about-cv/worlds";

/** How many rows one year of the life takes. One row is about three weeks. */
export const ROWS_PER_YEAR = 18;
/** How wide each world's lane is, in columns: the width its words wrap to. */
export const LANE_COLUMNS = 16;
/** The empty columns between two lanes. */
export const LANE_GAP = 2;
/** The plain beyond the lanes on either side, in columns: ground, spelling its city. */
export const MARGIN_COLUMNS = 7;
/** How far the land reaches past now, in years, so the present is not on its very edge. */
export const NEAR_MARGIN_YEARS = 0.3;
/** Where the land ends in the past: half a year before NED began. */
export const FAR_TIME = 2013.5;

/** The world's size of one cell: a column is one unit across, a row a little deeper, so letters seen from above are not squashed. */
export const COLUMN_WIDTH = 1;
export const ROW_DEPTH = 2.2;

/** Where a column's middle stands across the world, in world units. */
export const xOfColumn = (column: number) => column * COLUMN_WIDTH;
/** Where a row stands along the world: the land runs away from the camera into negative z, so the camera's right is +x and rows read left to right. */
export const zOfRow = (row: number) => -row * ROW_DEPTH;
export const rowOfZ = (z: number) => -z / ROW_DEPTH;
/** How tall one cell of rise stands in the world: taller than a cell is wide, so the ridges stand up and hide what lies behind them. */
export const HEIGHT_UNIT = 4.2;
export const yOfHeight = (height: number) => height * HEIGHT_UNIT;

export type Grid = {
  present: number;
  rows: number;
  columns: number;
  /** The row at a time, as a decimal: row 0 is the land's near edge. */
  rowAt(time: number): number;
  /** The time at a row's middle. */
  timeAt(row: number): number;
  /** The first column of a world's lane. */
  laneLeft(world: WorldKey): number;
  /** The middle of a world's lane, in columns. */
  laneMiddle(world: WorldKey): number;
};

export function makeGrid(present: number): Grid {
  const nearEdge = present + NEAR_MARGIN_YEARS;
  const rowAt = (time: number) => (nearEdge - time) * ROWS_PER_YEAR;
  const laneLeft = (world: WorldKey) =>
    MARGIN_COLUMNS + worlds.findIndex((candidate) => candidate.key === world) * (LANE_COLUMNS + LANE_GAP);
  return {
    present,
    rows: Math.ceil(rowAt(FAR_TIME)),
    columns: MARGIN_COLUMNS * 2 + worlds.length * (LANE_COLUMNS + LANE_GAP) - LANE_GAP,
    rowAt,
    timeAt: (row) => nearEdge - (row + 0.5) / ROWS_PER_YEAR,
    laneLeft,
    laneMiddle: (world) => laneLeft(world) + LANE_COLUMNS / 2,
  };
}

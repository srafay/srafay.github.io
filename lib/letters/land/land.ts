/*
  The land, cell by cell, from the CV. Each cell belongs to the event whose rise is highest there, stands at that
  height, and shows one character of that event's stream (text.ts), or a dot for a space and for the foothills beside
  its track. Every bare cell is ground, a quiet dot that belongs to its city (cities.ts). Each ridge's crest is marked,
  and each letter knows its track, so the scene can thin rows that would stack on screen. Everything a scene needs to
  draw it, pick from it and light it is here, in flat arrays a graphics card can take as they are.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { busyAt, BUSY_LIFT } from "./busy";
import { cities, cityAt } from "./cities";
import { makeGrid, type Grid } from "./grid";
import { busySpansOf, spansOf, tracksOf, type Span, type Track } from "./layout";
import { RISES, riseAcross, riseAlong } from "./rises";
import { streamOf, wrapStream, type WrappedLine } from "./text";

/** A cell whose rise share is under this is bare ground, and spells its city. */
const BARE_BELOW = 0.08;
/** The character code a dot is stored as. */
export const DOT = 0;

export type EventOnLand = {
  event: WorldEvent;
  index: number;
  span: Span;
  track: Track;
  stream: ReturnType<typeof streamOf>;
  lines: WrappedLine[];
  /** Its crest: the row where it stands highest, where its first line (its name) is spelled. */
  crestRow: number;
  /** Its owned cells' rows and columns, nearest and farthest, for framing. */
  rows: [number, number];
  cellCount: number;
};

/**
 * A letter of a word wider than its track. The word keeps its row: its letters stand between the columns, each
 * narrowed by the same share, so the whole word fits the track. It takes its owner, height and track from the cell
 * under it.
 */
export type Squeezed = { cell: number; column: number; code: number; streamIndex: number; narrow: number };

export type Land = {
  grid: Grid;
  events: EventOnLand[];
  /** Owner index of each cell: an event's index, or events.length plus a city's index, or -1 for bare ground. */
  owners: Int16Array;
  heights: Float32Array;
  /** Each cell's character code, DOT for a dot. */
  characters: Uint16Array;
  /** Where each cell's character sits in its event's stream, or -1. */
  streamIndex: Int32Array;
  /** The cells drawn, farthest row first, so they blend back to front. */
  drawn: Uint32Array;
  /** The narrowed letters of words wider than their track, drawn after the cells. */
  squeezed: Squeezed[];
  /**
   * Everything drawn, one entry each: the drawn cells, then the narrowed letters. Each knows its cell (for its owner,
   * height, row and track), the column it stands at, its character (DOT for a dot), where it sits in its stream, and
   * how narrow it is drawn (1 for a cell).
   */
  instances: { count: number; cell: Uint32Array; column: Float32Array; code: Uint16Array; stream: Int32Array; narrow: Float32Array };
  /** 1 where a cell is on its event's crest: the highest row of its track's column. */
  crest: Uint8Array;
  /** Each letter's track, by its place in tracks, or -1 for a dot. Rows of one track thin together. */
  trackOfCell: Int16Array;
  tracks: Track[];
  /** How many of the drawn cells are letters, and how many dots. */
  letterCount: number;
  dotCount: number;
  cityOwner(cityIndex: number): number;
  ownerIsCity(owner: number): boolean;
};

const cellIndex = (grid: Grid, row: number, column: number) => row * grid.columns + column;

/** The events whose rise reaches a time, and how much of each stands there. */
function risingAt(events: EventOnLand[], time: number) {
  const rising: { item: EventOnLand; along: number }[] = [];
  for (const item of events) {
    const along = riseAlong(RISES[item.event.kind], item.span.start, item.span.end, time);
    if (along > 0) rising.push({ item, along });
  }
  return rising;
}

function placeEvents(events: WorldEvent[], grid: Grid): EventOnLand[] {
  const spans = spansOf(events);
  const tracks = tracksOf(events, spans, grid);
  return events.map((event, index) => {
    const track = tracks.get(event.id) as Track;
    const stream = streamOf(event);
    return {
      event,
      index,
      span: spans.get(event.id) as Span,
      track,
      stream,
      lines: wrapStream(stream.text, track.width),
      crestRow: -1,
      rows: [Infinity, -Infinity],
      cellCount: 0,
    };
  });
}

export function buildLand(events: WorldEvent[], present: number): Land {
  const grid = makeGrid(present);
  const placed = placeEvents(events, grid);
  const busySpans = busySpansOf(events);
  const size = grid.rows * grid.columns;
  const owners = new Int16Array(size).fill(-1);
  const heights = new Float32Array(size);
  const characters = new Uint16Array(size);
  const streamIndex = new Int32Array(size).fill(-1);
  const cityBase = events.length;

  for (let row = 0; row < grid.rows; row++) {
    const time = grid.timeAt(row);
    const base = BUSY_LIFT * busyAt(busySpans, time);
    const rising = risingAt(placed, time);
    for (let column = 0; column < grid.columns; column++) {
      // The ground itself stands at the busy base, so a busy year is a raised plateau.
      heights[cellIndex(grid, row, column)] = base;
      let best = 0;
      let owner: EventOnLand | null = null;
      let share = 0;
      for (const { item, along } of rising) {
        const across = riseAcross(item.track.left, item.track.width, column);
        if (across <= 0) continue;
        const lift = RISES[item.event.kind].height * along * across;
        if (lift > best) {
          best = lift;
          owner = item;
          share = along * across;
        }
      }
      if (!owner || share < BARE_BELOW) continue;
      const cell = cellIndex(grid, row, column);
      owners[cell] = owner.index;
      heights[cell] = base + best;
      owner.rows = [Math.min(owner.rows[0], row), Math.max(owner.rows[1], row)];
      owner.cellCount++;
    }
  }
  findCrestRows(placed, grid, owners, heights);
  spellEvents(placed, grid, owners, characters, streamIndex);
  const { squeezed, covered } = squeezeLongWords(placed, grid, owners, characters, streamIndex);
  claimGround(grid, owners, cityBase);
  const crest = markCrests(placed, grid, owners, heights);
  const { tracks, trackOfCell } = tracksOfLetters(placed, grid, owners, characters, covered);
  const drawn: number[] = [];
  let letterCount = 0;
  for (let row = grid.rows - 1; row >= 0; row--)
    for (let column = 0; column < grid.columns; column++) {
      const cell = cellIndex(grid, row, column);
      // A row a long word covers draws its narrowed letters instead of its cells.
      if (covered[cell]) continue;
      drawn.push(cell);
      if (characters[cell] !== DOT) letterCount++;
    }
  const instances = instancesOf(grid, drawn, squeezed, characters, streamIndex);
  return {
    grid,
    events: placed,
    instances,
    owners,
    heights,
    characters,
    streamIndex,
    crest,
    trackOfCell,
    tracks,
    drawn: Uint32Array.from(drawn),
    squeezed,
    letterCount: letterCount + squeezed.length,
    dotCount: drawn.length - letterCount,
    cityOwner: (cityIndex) => cityBase + cityIndex,
    ownerIsCity: (owner) => owner >= cityBase,
  };
}

/** Each event's crest row: where it stands highest along the middle of its track. */
function findCrestRows(placed: EventOnLand[], grid: Grid, owners: Int16Array, heights: Float32Array) {
  for (const item of placed) {
    const column = Math.floor(item.track.left + item.track.width / 2);
    let tallest = -Infinity;
    for (let row = item.rows[0]; row <= item.rows[1]; row++) {
      const cell = cellIndex(grid, row, column);
      if (owners[cell] === item.index && heights[cell] > tallest) {
        tallest = heights[cell];
        item.crestRow = row;
      }
    }
    if (item.crestRow < 0) item.crestRow = item.rows[1];
  }
}

/** Each owned cell inside its event's track gets the stream's character for its row and column. */
function spellEvents(
  placed: EventOnLand[],
  grid: Grid,
  owners: Int16Array,
  characters: Uint16Array,
  streamIndex: Int32Array,
) {
  for (let row = 0; row < grid.rows; row++)
    for (let column = 0; column < grid.columns; column++) {
      const cell = cellIndex(grid, row, column);
      const owner = owners[cell];
      if (owner < 0) continue;
      const item = placed[owner];
      const across = column - item.track.left;
      if (across < 0 || across >= item.track.width || !item.lines.length) continue;
      // The first line, its name, sits on its crest, the row most in view; rows read top to bottom on screen, so the
      // lines run on toward the near edge and wrap round behind the crest.
      const line = lineOn(item, row);
      const character = line.characters[across];
      if (!character || character === " ") continue;
      characters[cell] = character.charCodeAt(0);
      streamIndex[cell] = line.streamIndex[across];
    }
}

/** The line an event spells on a row, by its crest: its name on the crest, the lines running on toward now. */
const lineOn = (item: EventOnLand, row: number) => {
  const count = item.lines.length;
  return item.lines[(((item.crestRow - row) % count) + count) % count];
};

/** Rows whose line is wider than the track: the line's letters stand between the columns, narrowed to fit. */
function squeezeLongWords(placed: EventOnLand[], grid: Grid, owners: Int16Array, characters: Uint16Array, streamIndex: Int32Array) {
  const squeezed: Squeezed[] = [];
  const covered = new Uint8Array(grid.rows * grid.columns);
  for (const item of placed) {
    if (!item.lines.length) continue;
    for (let row = item.rows[0]; row <= item.rows[1]; row++) {
      const line = lineOn(item, row);
      const { left, width } = item.track;
      if (line.characters.length <= width) continue;
      const step = width / line.characters.length;
      for (let column = left; column < left + width; column++) {
        const cell = cellIndex(grid, row, column);
        if (owners[cell] !== item.index) continue;
        covered[cell] = 1;
        characters[cell] = DOT;
        streamIndex[cell] = -1;
      }
      for (let place = 0; place < line.characters.length; place++) {
        const column = left + (place + 0.5) * step;
        const cell = cellIndex(grid, row, Math.floor(column));
        if (owners[cell] !== item.index) continue;
        squeezed.push({ cell, column, code: line.characters.charCodeAt(place), streamIndex: line.streamIndex[place], narrow: step });
      }
    }
  }
  return { squeezed, covered };
}

/** The ground: every bare cell belongs to the city of its time, and is a quiet dot. */
function claimGround(grid: Grid, owners: Int16Array, cityBase: number) {
  for (let row = 0; row < grid.rows; row++) {
    const owner = cityBase + cities.indexOf(cityAt(grid.timeAt(row)));
    for (let column = 0; column < grid.columns; column++) {
      const cell = cellIndex(grid, row, column);
      if (owners[cell] < 0) owners[cell] = owner;
    }
  }
}

/** Each event's crest: in every column of its track, the row where it stands highest. */
function markCrests(placed: EventOnLand[], grid: Grid, owners: Int16Array, heights: Float32Array) {
  const crest = new Uint8Array(grid.rows * grid.columns);
  for (const item of placed)
    for (let column = item.track.left; column < item.track.left + item.track.width; column++) {
      let best = -1;
      let bestHeight = -Infinity;
      for (let row = item.rows[0]; row <= item.rows[1]; row++) {
        const cell = cellIndex(grid, row, column);
        if (owners[cell] === item.index && heights[cell] > bestHeight) {
          bestHeight = heights[cell];
          best = cell;
        }
      }
      if (best >= 0) crest[best] = 1;
    }
  return crest;
}

/** The distinct tracks the letters stand in, and each letter's, so rows of one track thin together. */
function tracksOfLetters(placed: EventOnLand[], grid: Grid, owners: Int16Array, characters: Uint16Array, covered: Uint8Array) {
  const tracks: Track[] = [];
  const known = new Map<string, number>();
  const trackOfCell = new Int16Array(grid.rows * grid.columns).fill(-1);
  for (let cell = 0; cell < trackOfCell.length; cell++) {
    const owner = owners[cell];
    if (owner < 0 || owner >= placed.length || (characters[cell] === DOT && !covered[cell])) continue;
    const { track } = placed[owner];
    const key = `${track.left}:${track.width}`;
    if (!known.has(key)) known.set(key, tracks.push(track) - 1);
    trackOfCell[cell] = known.get(key) as number;
  }
  return { tracks, trackOfCell };
}

/** Every character the land spells, for the glyph atlas. */
export function charactersOf(land: Land) {
  const found = new Set<string>();
  for (const code of land.instances.code) if (code !== DOT) found.add(String.fromCharCode(code));
  return found;
}

/** The drawn cells and the narrowed letters as one list. */
function instancesOf(grid: Grid, drawn: number[], squeezed: Squeezed[], characters: Uint16Array, streamIndex: Int32Array) {
  const count = drawn.length + squeezed.length;
  const instances = {
    count,
    cell: new Uint32Array(count),
    column: new Float32Array(count),
    code: new Uint16Array(count),
    stream: new Int32Array(count),
    narrow: new Float32Array(count).fill(1),
  };
  drawn.forEach((cell, index) => {
    instances.cell[index] = cell;
    instances.column[index] = (cell % grid.columns) + 0.5;
    instances.code[index] = characters[cell];
    instances.stream[index] = streamIndex[cell];
  });
  squeezed.forEach((letter, place) => {
    const index = drawn.length + place;
    instances.cell[index] = letter.cell;
    instances.column[index] = letter.column;
    instances.code[index] = letter.code;
    instances.stream[index] = letter.streamIndex;
    instances.narrow[index] = letter.narrow;
  });
  return instances;
}

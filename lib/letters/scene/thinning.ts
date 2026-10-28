/*
  No letter overlaps another. Seen from above, rows of letters on a slope stack on screen, and when the land is turned,
  the rows of one lane can run into another's. So, whenever the camera moves, every row of every track is placed on
  screen, nearest first, and keeps its letters only when it clears every row already kept that shares its stretch of
  screen: at least a letter's height apart across the rows. Every other row draws as dots. A steep face thins to every
  second or third row, and a gentle one keeps them all. Along a row, a letter is never wider than its column's step on
  screen (the shader sizes it so), so letters in a row never touch.

  Rows run along the world's x axis, so on screen they all run through the vanishing point of that axis. A row's place
  across the rows is its angle about that point (or, looking square on, its offset across the parallel rows), and its
  stretch is how far along its line it reaches.

  The result is a small texture, one texel per track and row, that the land's shader reads. The same measure gives the
  boxes the checks count, and the places of readable rows, which the sky's words keep off.
*/
import { xOfColumn, yOfHeight, zOfRow } from "@/lib/letters/land/grid";
import { DOT, type Land } from "@/lib/letters/land/land";
import type { Vector } from "./matrix";
import type { Rectangle } from "./sky-layer";
import type { View } from "./view";

/** A letter's size against its column's width in the world: as in the shader. */
export const LETTER_PER_UNIT = 1.05;
/**
 * The room the widest upright letter takes along its row, in letter sizes: its width along a level row, its height
 * along a row that runs up the screen. A letter is never bigger than its column's step on screen allows for this.
 */
export const WIDEST_LETTER = 0.95;
export const TALLEST_LETTER = 0.76;
/**
 * How far a kept row must stand from another across the rows, in letter sizes. A letter stays upright on screen, so
 * on a level row the room it needs across is its height (a capital is about 0.72 of the size, with a little air), and
 * on a slanted row part of its width too: the room across is the width times the slant's sine plus the height times
 * its cosine.
 */
const LETTER_HEIGHT_ROOM = 1.0;
const LETTER_WIDTH_ROOM = 0.88;
/** A letter this size or more is drawn as a letter, not a dot, and the sky keeps off its row. */
export const DRAWN_AS_LETTER_PIXELS = 8;
/** How high a letter's centre stands over its cell, in world units: as in the shader. */
export const LETTER_LIFT = 0.3;

/** The size a letter is drawn at, at a world point: its column's width, never wider than its column's step on screen. */
export function letterSize(view: View, point: Vector) {
  const spot = view.toScreen(point);
  if (!spot) return null;
  const across = view.toScreen([point[0] + 1, point[1], point[2]]);
  let byStep = Infinity;
  if (across) {
    const step = Math.hypot(across.x - spot.x, across.y - spot.y) || 1;
    const room = WIDEST_LETTER * Math.abs(across.x - spot.x) / step + TALLEST_LETTER * Math.abs(across.y - spot.y) / step;
    byStep = step / room;
  }
  const em = Math.min((view.focalPixels / spot.w) * LETTER_PER_UNIT, byStep);
  return { x: spot.x, y: spot.y, w: spot.w, em };
}

/** One row of one track, as the land holds it: where it is and how high it stands. */
type RowOfTrack = { track: number; row: number; height: number };

/** One row placed on screen: across the rows, how far it reaches along its line, its letters' size, which way it runs. */
type Placed = { across: number; scale: number; from: number; to: number; em: number; slantSine: number; slantCosine: number };

/** How the rows lie on screen now: through a vanishing point, or parallel when the camera looks square on. */
type RowLines =
  | { parallel: false; x: number; y: number; reference: number }
  | { parallel: true; alongX: number; alongY: number };

function rowLines(view: View): RowLines {
  const m = view.viewProjection;
  const { width, height } = view.size();
  // The world's x direction, projected: where parallel rows meet.
  const [clipX, clipY, clipW] = [m[0], m[1], m[3]];
  if (Math.abs(clipW) < 1e-6) {
    const length = Math.hypot(clipX * width, clipY * height) || 1;
    return { parallel: true, alongX: (clipX * width) / length, alongY: (-clipY * height) / length };
  }
  const x = ((clipX / clipW + 1) / 2) * width;
  const y = ((1 - clipY / clipW) / 2) * height;
  // Angles are measured from the way to the screen's middle, so the rows in view never straddle the turn of the
  // angle from one half-turn to minus one.
  return { parallel: false, x, y, reference: Math.atan2(height / 2 - y, width / 2 - x) };
}

/** A point's place across the rows, the scale that turns a difference of it into pixels, and its place along them. */
function measure(lines: RowLines, x: number, y: number) {
  if (lines.parallel)
    return {
      across: -x * lines.alongY + y * lines.alongX,
      scale: 1,
      along: x * lines.alongX + y * lines.alongY,
      slantSine: Math.abs(lines.alongY),
      slantCosine: Math.abs(lines.alongX),
    };
  const radius = Math.hypot(x - lines.x, y - lines.y) || 1;
  let across = Math.atan2(y - lines.y, x - lines.x) - lines.reference;
  if (across > Math.PI) across -= 2 * Math.PI;
  if (across < -Math.PI) across += 2 * Math.PI;
  return {
    across,
    scale: radius,
    along: radius,
    slantSine: Math.abs(y - lines.y) / radius,
    slantCosine: Math.abs(x - lines.x) / radius,
  };
}

/** Where a value goes in a sorted list. */
function insertionPlace(sorted: Placed[], across: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle].across < across) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Whether a row clears every kept row it shares a stretch of screen with: a letter's size apart, the larger one's. */
function clears(kept: Placed[], at: number, row: Placed) {
  const clash = (other: Placed) => {
    const apart = Math.abs(other.across - row.across) * row.scale;
    const needed = Math.max(row.em, other.em) * (LETTER_WIDTH_ROOM * row.slantSine + LETTER_HEIGHT_ROOM * row.slantCosine);
    const sharesStretch = row.from < other.to + row.em && other.from < row.to + row.em;
    return apart < needed && sharesStretch;
  };
  const reach = (other: Placed) => Math.abs(other.across - row.across) * row.scale < Math.max(row.em, other.em) * 4;
  for (let index = at - 1; index >= 0 && reach(kept[index]); index--) if (clash(kept[index])) return false;
  for (let index = at; index < kept.length && reach(kept[index]); index++) if (clash(kept[index])) return false;
  return true;
}

export class Thinning {
  readonly kept: Uint8Array;
  private readonly rowsOfTracks: RowOfTrack[] = [];
  readonly texture: WebGLTexture;
  /** Rows drawn as letters on screen now, for the sky to keep off. */
  readableRows: Rectangle[] = [];

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly land: Land,
  ) {
    const { grid } = land;
    const tallest = new Map<number, number>();
    for (let row = 0; row < grid.rows; row++) {
      tallest.clear();
      for (let column = 0; column < grid.columns; column++) {
        const cell = row * grid.columns + column;
        const track = land.trackOfCell[cell];
        if (track < 0) continue;
        tallest.set(track, Math.max(tallest.get(track) ?? -Infinity, land.heights[cell]));
      }
      for (const [track, height] of tallest) this.rowsOfTracks.push({ track, row, height });
    }
    this.kept = new Uint8Array(land.tracks.length * grid.rows).fill(255);
    this.texture = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, land.tracks.length, grid.rows, 0, gl.RED, gl.UNSIGNED_BYTE, this.kept);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  /** Places every row for the camera now, nearest first, and sends the kept rows to the card. */
  update(view: View) {
    const { tracks } = this.land;
    const lines = rowLines(view);
    const readable: Rectangle[] = [];
    const placed: { source: RowOfTrack; row: Placed; w: number; ends: [{ x: number; y: number }, { x: number; y: number }] }[] = [];
    this.kept.fill(0);
    for (const source of this.rowsOfTracks) {
      const track = tracks[source.track];
      const y = yOfHeight(source.height) + LETTER_LIFT;
      const z = zOfRow(source.row + 0.5);
      const size = letterSize(view, [xOfColumn(track.left + track.width / 2), y, z]);
      const left = view.toScreen([xOfColumn(track.left), y, z]);
      const right = view.toScreen([xOfColumn(track.left + track.width), y, z]);
      if (!size || !left || !right) continue;
      const middle = measure(lines, size.x, size.y);
      const from = measure(lines, left.x, left.y).along;
      const to = measure(lines, right.x, right.y).along;
      placed.push({
        source,
        row: {
          across: middle.across,
          scale: middle.scale,
          from: Math.min(from, to),
          to: Math.max(from, to),
          em: size.em,
          slantSine: middle.slantSine,
          slantCosine: middle.slantCosine,
        },
        w: size.w,
        ends: [left, right],
      });
    }
    placed.sort((first, second) => first.w - second.w);
    const kept: Placed[] = [];
    for (const { source, row, ends } of placed) {
      const box = {
        left: Math.min(ends[0].x, ends[1].x),
        right: Math.max(ends[0].x, ends[1].x),
        top: Math.min(ends[0].y, ends[1].y) - row.em * 0.4,
        bottom: Math.max(ends[0].y, ends[1].y) + row.em * 0.4,
      };
      const at = insertionPlace(kept, row.across);
      if (!clears(kept, at, row)) continue;
      kept.splice(at, 0, row);
      this.kept[source.row * tracks.length + source.track] = 255;
      if (row.em >= DRAWN_AS_LETTER_PIXELS) readable.push(box);
    }
    this.readableRows = readable;
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, tracks.length, this.land.grid.rows, gl.RED, gl.UNSIGNED_BYTE, this.kept);
  }

  isKept(cell: number) {
    const track = this.land.trackOfCell[cell];
    if (track < 0) return false;
    const row = Math.floor(cell / this.land.grid.columns);
    return this.kept[row * this.land.tracks.length + track] > 0;
  }

  /**
   * The boxes of every letter drawn now and seen (not hidden behind the land), and how many pairs intersect. For the
   * checks: it should be none at any pose.
   */
  overlaps(view: View, glyphWidth: (code: number) => number, isHidden: (point: Vector) => boolean) {
    const { land } = this;
    const { width, height } = view.size();
    const boxes: Rectangle[] = [];
    const { instances } = land;
    for (let index = 0; index < instances.count; index++) {
      const cell = instances.cell[index];
      if (instances.code[index] === DOT || !this.isKept(cell)) continue;
      const row = Math.floor(cell / land.grid.columns);
      const point: Vector = [xOfColumn(instances.column[index]), yOfHeight(land.heights[cell]) + LETTER_LIFT, zOfRow(row + 0.5)];
      const size = letterSize(view, point);
      if (!size || size.em < 5 || size.x < 0 || size.x > width || size.y < 0 || size.y > height) continue;
      if (isHidden(point)) continue;
      // A little more than the glyph's own box: the soft edge of a distance field counts, so letters that touch count.
      const halfWidth = (glyphWidth(instances.code[index]) * instances.narrow[index] * size.em * 1.05) / 2;
      const halfHeight = size.em * 0.42;
      boxes.push({ left: size.x - halfWidth, right: size.x + halfWidth, top: size.y - halfHeight, bottom: size.y + halfHeight });
    }
    const pairs = new Set<string>();
    const bucket = new Map<string, number[]>();
    const cellSize = 24;
    boxes.forEach((box, index) => {
      for (let bx = Math.floor(box.left / cellSize); bx <= Math.floor(box.right / cellSize); bx++)
        for (let by = Math.floor(box.top / cellSize); by <= Math.floor(box.bottom / cellSize); by++) {
          const key = `${bx}:${by}`;
          const others = bucket.get(key) ?? [];
          for (const other of others) {
            const them = boxes[other];
            if (box.left < them.right && them.left < box.right && box.top < them.bottom && them.top < box.bottom) pairs.add(`${other}:${index}`);
          }
          others.push(index);
          bucket.set(key, others);
        }
    });
    return { letters: boxes.length, overlapping: pairs.size };
  }
}

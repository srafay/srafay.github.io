/*
  The scene's words, drawn by the browser itself in the site's own faces: the woff2 files the page already loads,
  with their weights and kerning. Each word is then turned into a signed distance field, so it stays sharp at any
  size. All the words share one texture, packed in rows, and the scene draws every word in one call.

  The distance field is the exact Euclidean distance transform of Felzenszwalb and Huttenlocher, run once over each
  word's own pixels. The work is spread over frames with a time budget, so no frame waits on it.
*/
import type { Glyph } from "@/lib/about-cv/icons";

export type WordRequest = {
  key: string;
  text: string;
  /** A CSS font shorthand, such as `500 28px Figtree`. */
  font: string;
  /** The font size in that shorthand, in pixels. */
  sizePixels: number;
  /** A glyph drawn before the word, at its cap height, in its colour. */
  glyph?: Glyph;
  /** The glyph's size against the font size, when not the usual: a display face's capitals stand taller than a pin should. */
  glyphShare?: number;
};

/** A glyph's size against the font size, and the room after it, so it sits at the letters' cap height. */
const GLYPH_SHARE = 0.84;
const GLYPH_GAP_SHARE = 0.34;
/** How far a glyph's top stands above the baseline, as a share of its size: its foot sits just under the letters'. */
const GLYPH_RISE = 0.905;
/**
 * Lucide's line weight in the atlas, on its 24 grid. A step heavier than the HTML's 1.875, because the distance field
 * softens a hairline at the small sizes the scene shows a word.
 */
const ATLAS_LINE_WEIGHT = 2.15;

/** Draws a glyph with its top left corner at (left, top), size pixels square, in white. */
function drawGlyph(
  context: CanvasRenderingContext2D,
  glyph: Glyph,
  left: number,
  top: number,
  size: number,
) {
  context.save();
  context.translate(left, top);
  context.scale(size / 24, size / 24);
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  context.lineWidth = ATLAS_LINE_WEIGHT;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const data of glyph.paths) {
    const path = new Path2D(data);
    if (glyph.drawing === "stroke") context.stroke(path);
    else context.fill(path);
  }
  context.restore();
}

/** Where a word sits in the texture, and its shape. */
export type AtlasEntry = {
  /** Left, top, right, bottom, from 0 to 1. */
  uv: [number, number, number, number];
  /** Width over height of the whole quad, padding included. */
  aspect: number;
  /** How much of the quad's height the font size takes, so a word can be sized by its letters, not its padding. */
  sizeShare: number;
  /** The share of the quad's width and height that is empty padding on each side. */
  padAcross: number;
  padUp: number;
};

/** How far the field reaches past a letter's edge, in source pixels. */
const FIELD_RADIUS = 7;
/** The empty room around each word in the atlas, in source pixels. */
export const PADDING = FIELD_RADIUS + 1;
/** Where the letter's edge sits in the field, from 0 to 1. The shader draws from here inwards. */
export const EDGE_VALUE = 0.75;
const ATLAS_WIDTH = 2048;
const VERY_FAR = 1e20;

type Bitmap = { width: number; height: number; alpha: Uint8ClampedArray };

let drawingCanvas: HTMLCanvasElement | null = null;

function drawingContext() {
  drawingCanvas ??= document.createElement("canvas");
  return drawingCanvas.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;
}

/** One word drawn white on clear, with room around it for the field to spread into. */
export function wordBitmap(request: WordRequest): Bitmap {
  const context = drawingContext();
  context.font = request.font;
  const measured = context.measureText(request.text);
  const ascent = Math.ceil(request.sizePixels * 0.98);
  const descent = Math.ceil(request.sizePixels * 0.3);
  const glyphSize = request.glyph
    ? Math.round(request.sizePixels * (request.glyphShare ?? GLYPH_SHARE))
    : 0;
  const glyphRoom = request.glyph
    ? glyphSize + Math.round((glyphSize * GLYPH_GAP_SHARE) / GLYPH_SHARE)
    : 0;
  const width = Math.ceil(measured.width) + glyphRoom + PADDING * 2;
  const height = ascent + descent + PADDING * 2;
  const canvas = drawingCanvas as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;
  context.font = request.font;
  context.textBaseline = "alphabetic";
  context.fillStyle = "#fff";
  context.clearRect(0, 0, width, height);
  const baseline = PADDING + ascent;
  if (request.glyph)
    drawGlyph(
      context,
      request.glyph,
      PADDING,
      baseline - glyphSize * GLYPH_RISE,
      glyphSize,
    );
  context.font = request.font;
  context.fillStyle = "#fff";
  context.fillText(request.text, PADDING + glyphRoom, baseline);
  const pixels = context.getImageData(0, 0, width, height).data;
  const alpha = new Uint8ClampedArray(width * height);
  for (let index = 0; index < alpha.length; index++)
    alpha[index] = pixels[index * 4 + 3];
  return { width, height, alpha };
}

/** One row or column of the distance transform, in place. */
function transformLine(
  grid: Float64Array,
  offset: number,
  stride: number,
  length: number,
  values: Float64Array,
  hullPositions: Uint16Array,
  hullBounds: Float64Array,
) {
  hullPositions[0] = 0;
  hullBounds[0] = -VERY_FAR;
  hullBounds[1] = VERY_FAR;
  for (let place = 0; place < length; place++)
    values[place] = grid[offset + place * stride];
  for (let place = 1, hullSize = 0, crossing = 0; place < length; place++) {
    do {
      const previous = hullPositions[hullSize];
      crossing =
        (values[place] -
          values[previous] +
          place * place -
          previous * previous) /
        (place - previous) /
        2;
    } while (crossing <= hullBounds[hullSize] && --hullSize > -1);
    hullSize++;
    hullPositions[hullSize] = place;
    hullBounds[hullSize] = crossing;
    hullBounds[hullSize + 1] = VERY_FAR;
  }
  for (let place = 0, hullIndex = 0; place < length; place++) {
    while (hullBounds[hullIndex + 1] < place) hullIndex++;
    const nearest = hullPositions[hullIndex];
    grid[offset + place * stride] =
      values[nearest] + (place - nearest) * (place - nearest);
  }
}

function transformGrid(grid: Float64Array, width: number, height: number) {
  const longest = Math.max(width, height);
  const values = new Float64Array(longest);
  const hullPositions = new Uint16Array(longest);
  const hullBounds = new Float64Array(longest + 1);
  for (let column = 0; column < width; column++)
    transformLine(
      grid,
      column,
      width,
      height,
      values,
      hullPositions,
      hullBounds,
    );
  for (let row = 0; row < height; row++)
    transformLine(
      grid,
      row * width,
      1,
      width,
      values,
      hullPositions,
      hullBounds,
    );
}

/**
 * The word's field: for each pixel, how far it is from the nearest letter edge, inside or out. The edge maps to
 * EDGE_VALUE. Partly covered pixels place the edge inside themselves, which keeps curves smooth.
 */
export function distanceField({ width, height, alpha }: Bitmap): Uint8Array {
  const outside = new Float64Array(width * height);
  const inside = new Float64Array(width * height);
  for (let index = 0; index < alpha.length; index++) {
    const coverage = alpha[index] / 255;
    if (coverage >= 1) {
      outside[index] = 0;
      inside[index] = VERY_FAR;
    } else if (coverage <= 0) {
      outside[index] = VERY_FAR;
      inside[index] = 0;
    } else {
      const toEdge = 0.5 - coverage;
      outside[index] = toEdge > 0 ? toEdge * toEdge : 0;
      inside[index] = toEdge < 0 ? toEdge * toEdge : 0;
    }
  }
  transformGrid(outside, width, height);
  transformGrid(inside, width, height);
  const field = new Uint8Array(width * height);
  for (let index = 0; index < field.length; index++) {
    const signed = Math.sqrt(outside[index]) - Math.sqrt(inside[index]);
    const value = EDGE_VALUE - signed / FIELD_RADIUS;
    field[index] = Math.max(0, Math.min(255, Math.round(value * 255)));
  }
  return field;
}

type Placed = {
  request: WordRequest;
  x: number;
  y: number;
  width: number;
  height: number;
  field: Uint8Array;
};

/** Rows of words, left to right, a new row when one is full. */
class RowPacker {
  private x = 0;
  private y = 0;
  private rowHeight = 0;
  height = 0;

  place(width: number, height: number) {
    if (this.x + width > ATLAS_WIDTH) {
      this.x = 0;
      this.y += this.rowHeight;
      this.rowHeight = 0;
    }
    const spot = { x: this.x, y: this.y };
    this.x += width;
    this.rowHeight = Math.max(this.rowHeight, height);
    this.height = Math.max(this.height, this.y + this.rowHeight);
    return spot;
  }
}

export type Atlas = {
  width: number;
  height: number;
  pixels: Uint8Array;
  entries: Map<string, AtlasEntry>;
};

const nextFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));

/** Builds the atlas for every word, spending at most budgetMilliseconds of each frame on it. */
export async function buildAtlas(
  requests: WordRequest[],
  budgetMilliseconds = 9,
): Promise<Atlas> {
  const packer = new RowPacker();
  const placed: Placed[] = [];
  let frameStart = performance.now();
  for (const request of requests) {
    if (performance.now() - frameStart > budgetMilliseconds) {
      frameStart = await nextFrame();
    }
    const bitmap = wordBitmap(request);
    const field = distanceField(bitmap);
    const spot = packer.place(bitmap.width, bitmap.height);
    placed.push({
      request,
      ...spot,
      width: bitmap.width,
      height: bitmap.height,
      field,
    });
  }
  const height = Math.max(4, packer.height);
  const pixels = new Uint8Array(ATLAS_WIDTH * height);
  const entries = new Map<string, AtlasEntry>();
  for (const word of placed) {
    for (let row = 0; row < word.height; row++)
      pixels.set(
        word.field.subarray(row * word.width, (row + 1) * word.width),
        (word.y + row) * ATLAS_WIDTH + word.x,
      );
    entries.set(word.request.key, {
      uv: [
        word.x / ATLAS_WIDTH,
        word.y / height,
        (word.x + word.width) / ATLAS_WIDTH,
        (word.y + word.height) / height,
      ],
      aspect: word.width / word.height,
      sizeShare: word.request.sizePixels / word.height,
      padAcross: PADDING / word.width,
      padUp: PADDING / word.height,
    });
  }
  return { width: ATLAS_WIDTH, height, pixels, entries };
}

/** Waits until every face the words use is loaded, so no word is drawn in a fallback face. */
export async function loadFaces(fonts: string[]) {
  await Promise.all(
    fonts.map((font) => document.fonts.load(font, "Syed 2026")),
  );
}

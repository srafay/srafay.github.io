/*
  The marks on the land, like the lettering on a map. Each city is named once, large, lying flat across the land just
  after its stay begins, in the city tint: KARACHI, DARWIN, SYDNEY. Each year is named once, small and quiet, standing
  at the land's left edge on its first row. The land in front hides them, as it hides its own letters. A year reads
  only once it is big enough to; smaller, it is not drawn.
*/
import type { Atlas } from "@/lib/about-cv/scene/word-atlas";
import { EDGE_VALUE } from "@/lib/about-cv/scene/word-atlas";
import { cities, yearRows } from "@/lib/letters/land/cities";
import { xOfColumn, zOfRow } from "@/lib/letters/land/grid";
import type { Land } from "@/lib/letters/land/land";
import { cityBand } from "@/lib/letters/palette";
import { buffer, program, rgb, vertexArray } from "./gl";
import type { Vector } from "./matrix";
import type { View } from "./view";
import { overlaps as overlapsRectangle, type Rectangle } from "./sky-layer";

export const cityMarkKey = (name: string) => `m:${name}`;
export const yearMarkKey = (year: number) => `y:${year}`;

/** How wide a city's name lies across the land, in columns. */
const CITY_NAME_COLUMNS = 34;
/** How many rows after its stay begins a city's name lies, toward now. */
const CITY_NAME_AFTER_ROWS = 5;
/** A year's size in the world, and the column it stands in at the land's left edge. */
const YEAR_SIZE = 1.5;
const YEAR_COLUMN = 3.5;
/** The smallest a year is drawn, in CSS pixels, and the largest. */
const SMALLEST_YEAR = 11;
const LARGEST_YEAR = 15;

const VERTEX = `#version 300 es
precision highp float;
in vec2 a_corner;
in vec4 a_centre;
in vec4 a_glyph;
in vec4 a_form;
in float a_shown;
uniform mat4 u_viewProjection;
uniform vec2 u_viewport;
uniform float u_focal;
uniform float u_smallest;
uniform float u_largest;
out vec2 v_coord;
flat out vec4 v_rect;
out float v_alpha;
void main() {
  float flat_ = a_form.z;
  vec4 clip;
  float shown = 1.0;
  if (flat_ > 0.5) {
    // Lying on the land: across is x, and the word's top points away, into the past.
    vec3 corner = a_centre.xyz + vec3(a_corner.x * a_form.x * 0.5, 0.0, -a_corner.y * a_form.y * 0.5);
    clip = u_viewProjection * vec4(corner, 1.0);
  } else {
    clip = u_viewProjection * vec4(a_centre.xyz, 1.0);
    float w = max(clip.w, 0.001);
    float em = a_form.y * u_focal / w;
    shown = step(u_smallest, em);
    em = min(em, u_largest);
    float quadHeight = em / max(a_centre.w, 0.01);
    vec2 extent = vec2(quadHeight * a_form.x, quadHeight) * 0.5;
    clip.xy += a_corner * extent / (u_viewport * 0.5) * w;
  }
  gl_Position = clip;
  v_coord = a_corner * 0.5 + 0.5;
  v_rect = a_glyph;
  v_alpha = a_form.w * shown * a_shown;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_atlas;
uniform float u_edge;
uniform vec3 u_colour;
in vec2 v_coord;
flat in vec4 v_rect;
in float v_alpha;
out vec4 colour;
void main() {
  float field = texture(u_atlas, vec2(mix(v_rect.x, v_rect.z, v_coord.x), mix(v_rect.w, v_rect.y, v_coord.y))).r;
  float soft = max(fwidth(field) * 0.7, 0.012);
  float alpha = smoothstep(u_edge - soft, u_edge + soft, field) * v_alpha;
  if (alpha < 0.003) discard;
  colour = vec4(u_colour * alpha, alpha);
}`;

/** Where a name lies most in the open at a row: the middle of the stretch of columns whose land stands lowest. */
function openestColumn(land: Land, row: number) {
  const { grid, heights } = land;
  let best = grid.columns / 2;
  let lowest = Infinity;
  for (let left = 0; left + CITY_NAME_COLUMNS <= grid.columns; left++) {
    let tallest = 0;
    for (
      let near = Math.max(0, Math.floor(row) - 4);
      near <= Math.min(grid.rows - 1, Math.floor(row) + 4);
      near++
    )
      for (let column = left; column < left + CITY_NAME_COLUMNS; column++)
        tallest = Math.max(tallest, heights[near * grid.columns + column]);
    const middle = left + CITY_NAME_COLUMNS / 2;
    if (
      tallest < lowest - 0.01 ||
      (Math.abs(tallest - lowest) <= 0.01 &&
        Math.abs(middle - 30) < Math.abs(best - 30))
    ) {
      lowest = tallest;
      best = middle;
    }
  }
  return best;
}

type Mark = {
  key: string;
  centre: [number, number, number];
  flat: boolean;
  size: number;
  alpha: number;
};

export class MarksLayer {
  private readonly shader: WebGLProgram;
  private array: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private count = 0;
  private readonly marks: Mark[];
  /** Each drawn mark's shape, for working out where it lies on screen: flat names by their corners, years by size. */
  private placed: { mark: Mark; aspect: number; sizeShare: number }[] = [];
  private shown = new Float32Array(0);
  private shownBuffer: WebGLBuffer | null = null;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    land: Land,
  ) {
    this.shader = program(gl, VERTEX, FRAGMENT);
    const { grid } = land;
    const cityMarks: Mark[] = cities.map((city) => {
      const row = Math.max(2, grid.rowAt(city.from) - CITY_NAME_AFTER_ROWS);
      return {
        key: cityMarkKey(city.name),
        centre: [xOfColumn(openestColumn(land, row)), 0.2, zOfRow(row)],
        flat: true,
        size: CITY_NAME_COLUMNS,
        alpha: 0.6,
      };
    });
    const yearMarks: Mark[] = [...yearRows(grid)].map(([row, year]) => ({
      key: yearMarkKey(year),
      centre: [xOfColumn(YEAR_COLUMN), 0.6, zOfRow(row + 0.5)],
      flat: false,
      size: YEAR_SIZE,
      alpha: 0.78,
    }));
    this.marks = [...cityMarks, ...yearMarks];
  }

  /** The words the marks need in the atlas. */
  static requests() {
    const now = new Date().getUTCFullYear();
    const years: number[] = [];
    for (let year = 2014; year <= now; year++) years.push(year);
    return {
      cities: cities.map((city) => ({
        key: cityMarkKey(city.name),
        text: city.name.toUpperCase(),
      })),
      years: years.map((year) => ({
        key: yearMarkKey(year),
        text: String(year),
      })),
    };
  }

  useAtlas(atlas: Atlas, texture: WebGLTexture) {
    const { gl } = this;
    this.texture = texture;
    const centres: number[] = [];
    const glyphs: number[] = [];
    const forms: number[] = [];
    for (const mark of this.marks) {
      const entry = atlas.entries.get(mark.key);
      if (!entry) continue;
      centres.push(...mark.centre, entry.sizeShare);
      this.placed.push({ mark, aspect: entry.aspect, sizeShare: entry.sizeShare });
      glyphs.push(...entry.uv);
      // A flat name: its width and depth in the world. A year: its aspect and its size.
      if (mark.flat)
        forms.push(mark.size, mark.size / entry.aspect, 1, mark.alpha);
      else forms.push(entry.aspect, mark.size, 0, mark.alpha);
    }
    this.count = forms.length / 4;
    this.shown = new Float32Array(this.count).fill(1);
    this.shownBuffer = buffer(gl, this.shown, gl.DYNAMIC_DRAW);
    this.array = vertexArray(gl, this.shader, [
      {
        name: "a_corner",
        size: 2,
        divisor: 0,
        buffer: buffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])),
      },
      {
        name: "a_centre",
        size: 4,
        divisor: 1,
        buffer: buffer(gl, new Float32Array(centres)),
      },
      {
        name: "a_glyph",
        size: 4,
        divisor: 1,
        buffer: buffer(gl, new Float32Array(glyphs)),
      },
      {
        name: "a_form",
        size: 4,
        divisor: 1,
        buffer: buffer(gl, new Float32Array(forms)),
      },
      { name: "a_shown", size: 1, divisor: 1, buffer: this.shownBuffer },
    ]);
  }

  /**
   * Shows a mark only where no row of letters lies over it, so a name is never read through another word. Says where
   * the marks shown lie on screen, for the sky to keep off.
   */
  update(view: View, rows: Rectangle[], isHidden: (point: Vector) => boolean) {
    const shownPlaces: Rectangle[] = [];
    const { width, height } = view.size();
    this.placed.forEach(({ mark, aspect, sizeShare }, index) => {
      const place = this.screenPlace(view, mark, aspect, sizeShare);
      // A year shows only whole on screen: a cut year reads as another number.
      const whole =
        place !== null &&
        (mark.flat ||
          (place.left >= 0 && place.right <= width && place.top >= 0 && place.bottom <= height && !this.partlyHidden(mark, isHidden)));
      const clear = whole && place !== null && !rows.some((row) => overlapsRectangle(row, place));
      this.shown[index] = clear ? 1 : 0;
      if (clear && place) shownPlaces.push(place);
    });
    if (this.shownBuffer) {
      const { gl } = this;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.shownBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.shown);
    }
    return shownPlaces;
  }

  /** Whether the land hides any of a year: its middle or either end. A half-hidden year reads as another number. */
  private partlyHidden(mark: Mark, isHidden: (point: Vector) => boolean) {
    const [x, y, z] = mark.centre;
    return [-1.2, 0, 1.2].some((across) => isHidden([x + across, y, z]));
  }

  /** Where a mark lies on screen: a flat name's four corners, a year's standing box. Null when it is not in view. */
  private screenPlace(view: View, mark: Mark, aspect: number, sizeShare: number): Rectangle | null {
    const [x, y, z] = mark.centre;
    if (mark.flat) {
      const halfWidth = mark.size / 2;
      const halfDepth = mark.size / aspect / 2;
      const corners = [
        view.toScreen([x - halfWidth, y, z - halfDepth]),
        view.toScreen([x + halfWidth, y, z - halfDepth]),
        view.toScreen([x - halfWidth, y, z + halfDepth]),
        view.toScreen([x + halfWidth, y, z + halfDepth]),
      ];
      if (corners.some((corner) => !corner)) return null;
      const xs = corners.map((corner) => (corner as { x: number }).x);
      const ys = corners.map((corner) => (corner as { y: number }).y);
      return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
    }
    const spot = view.toScreen(mark.centre);
    if (!spot) return null;
    const em = (mark.size * view.focalPixels) / spot.w;
    if (em < SMALLEST_YEAR) return null;
    const height = Math.min(em, LARGEST_YEAR) / sizeShare;
    const width = height * aspect;
    return { left: spot.x - width / 2, right: spot.x + width / 2, top: spot.y - height / 2, bottom: spot.y + height / 2 };
  }

  draw(view: View) {
    if (!this.array || !this.texture) return;
    const { gl } = this;
    const { width, height } = view.size();
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.useProgram(this.shader);
    const at = (name: string) => gl.getUniformLocation(this.shader, name);
    gl.uniformMatrix4fv(at("u_viewProjection"), false, view.viewProjection);
    gl.uniform2f(at("u_viewport"), width, height);
    gl.uniform1f(at("u_focal"), view.focalPixels);
    gl.uniform1f(at("u_smallest"), SMALLEST_YEAR);
    gl.uniform1f(at("u_largest"), LARGEST_YEAR);
    gl.uniform1f(at("u_edge"), EDGE_VALUE);
    gl.uniform3fv(at("u_colour"), rgb(cityBand));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(at("u_atlas"), 0);
    gl.bindVertexArray(this.array);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    gl.bindVertexArray(null);
    gl.depthMask(true);
  }
}

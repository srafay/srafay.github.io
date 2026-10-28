/*
  The land on the graphics card. Two draws:
  - the heightfield as a solid, written to depth only, so a ridge hides what lies behind it;
  - every cell as one camera-facing quad, farthest first: an event's letter where its row is kept (thinning.ts) and it
    is big enough to read, easing into a soft dot as it shrinks, so nothing far shimmers or crawls. The ground and the
    gaps in a line are quiet dots. A letter's depth is its centre's, so the solid in front of it hides it and its own
    ground never does.
  A letter's tint rises with its height and its size, and its slope shades it: brighter on a face turned to the
  camera, dimmer on the far side, a crest a step brighter. A letter of 11 px or more never falls below the readable
  tint. Each owner (an event or a city) has a state the scene writes: lit, dimmed, lifted into a card.
*/
import { EDGE_VALUE, type Atlas } from "@/lib/about-cv/scene/word-atlas";
import { COLUMN_WIDTH, HEIGHT_UNIT, ROW_DEPTH, xOfColumn, yOfHeight, zOfRow } from "@/lib/letters/land/grid";
import { DOT, type Land } from "@/lib/letters/land/land";
import { landTints, lit, present, presentLit } from "@/lib/letters/palette";
import { cellKey } from "./atlas";
import { buffer, program, rgb, vertexArray } from "./gl";
import { LETTER_LIFT, LETTER_PER_UNIT, TALLEST_LETTER, WIDEST_LETTER } from "./thinning";
import type { View } from "./view";

/** The most places on screen where the land's letters keep quiet (the name, the bio, the hint, the top band, a field). */
const MOST_QUIET = 8;
/** The most owners the shader holds: 48 events and 3 cities fit. */
export const MOST_OWNERS = 64;
/** How far under the land its solid lies, in world units, so it never eats the foot of a letter on it. */
const SOLID_BELOW = 1.2;
/** The height at which a letter takes its brightest tint, in cells. */
const BRIGHTEST_AT = 11;

const LETTERS_VERTEX = `#version 300 es
precision highp float;
in vec2 a_corner;
in vec4 a_place;
in vec4 a_glyph;
in vec4 a_form;
in vec3 a_normal;
in vec3 a_meta;
in float a_lit;
in vec4 a_away;
uniform mat4 u_viewProjection;
uniform vec2 u_viewport;
uniform float u_focal;
uniform vec3 u_eye;
uniform float u_time;
uniform float u_roll;
uniform float u_reveal;
uniform float u_atlasReady;
uniform float u_brightestAt;
uniform float u_heightUnit;
uniform float u_lift;
uniform float u_perUnit;
uniform float u_widest;
uniform float u_tallest;
uniform float u_away;
uniform float u_awayCell;
uniform vec4 u_owner[${MOST_OWNERS}];
uniform sampler2D u_kept;
uniform vec4 u_quiet[${MOST_QUIET}];
uniform int u_quietCount;
uniform vec3 u_farTexture;
uniform vec3 u_electric;
uniform vec3 u_readable;
uniform vec3 u_highGround;
uniform vec3 u_lit;
uniform vec3 u_present;
uniform vec3 u_presentLit;
out vec2 v_glyphCoord;
flat out vec4 v_rect;
out vec2 v_local;
out float v_glyphShare;
out float v_dotRadius;
out vec3 v_colour;
out float v_alpha;

void main() {
  vec4 owner = u_owner[int(a_place.w)];
  bool ground = owner.x > 1.5;
  float height = a_place.z;
  // The ground swells slowly like a sea; a risen event only stirs.
  float wave = sin(-a_place.y * 0.055 - u_time * 0.7 + a_place.x * 0.04) + 0.5 * sin(-a_place.y * 0.021 + u_time * 0.31 - a_place.x * 0.07);
  float rolling = u_roll * wave * (ground ? 1.6 : 0.4);
  vec3 centre = vec3(a_place.x, (height + rolling) * u_heightUnit + u_lift, a_place.y);
  // The idle joke: a letter chosen for the sign leaves its place for its cell in the sign, a little after the others.
  float member = step(0.5, a_away.w);
  float gathered = member * smoothstep(0.0, 1.0, clamp(u_away * 1.4 - (a_away.w - 1.0), 0.0, 1.0));
  centre = mix(centre, a_away.xyz + vec3(0.0, rolling * 0.3, 0.0), gathered);
  vec4 clip = u_viewProjection * vec4(centre, 1.0);
  vec4 across = u_viewProjection * vec4(centre + vec3(1.0, 0.0, 0.0), 1.0);
  float w = max(clip.w, 0.001);
  float perUnit = u_focal / w;
  vec2 columnStep = (across.xy / max(across.w, 0.001) - clip.xy / w) * 0.5 * u_viewport;
  float stepLength = max(length(columnStep), 0.001);
  // A letter is as wide as its column allows, and never bigger than its column's step on screen has room for: an
  // upright letter on a slanted row takes room along the row by its width and its height both.
  float room = u_widest * abs(columnStep.x) / stepLength + u_tallest * abs(columnStep.y) / stepLength;
  float em = min(perUnit * u_perUnit, stepLength / room);
  em = mix(em, perUnit * u_awayCell * 1.15, gathered);
  // A row the thinning dropped draws as dots, so rows never stack on screen.
  float kept = a_meta.y < 0.0 ? 0.0 : texelFetch(u_kept, ivec2(int(a_meta.y), int(a_meta.z)), 0).r;
  // Under the name, the bio, the hint or the top band a letter is a dot, so no word is read through another.
  vec2 onScreen = vec2((clip.x / w + 1.0) * 0.5 * u_viewport.x, (1.0 - clip.y / w) * 0.5 * u_viewport.y);
  for (int index = 0; index < ${MOST_QUIET}; index++) {
    if (index >= u_quietCount) break;
    vec4 box = u_quiet[index];
    if (onScreen.x > box.x - em * 0.5 && onScreen.x < box.z + em * 0.5 && onScreen.y > box.y - em * 0.5 && onScreen.y < box.w + em * 0.5) kept = 0.0;
  }
  float isLetter = a_form.z * max(kept, gathered);
  float revealed = smoothstep(a_form.w, a_form.w + 0.04, u_reveal);
  float glyphShare = smoothstep(5.0, 8.0, em) * isLetter * max(revealed, gathered) * u_atlasReady;
  // An event's letter shown as a dot keeps its weight, so the far ranges stand out from the ground.
  float dotRadius = a_form.z > 0.5 ? clamp(em * 0.12, 0.7, 1.4) : clamp(em * 0.085, 0.55, 1.4);
  // A lit letter far off is a heavier dot, so a lit skill's events show from the whole land.
  dotRadius *= 1.0 + 0.7 * max(u_owner[int(a_place.w)].y, a_lit);
  float quadHeight = em / max(a_form.y, 0.01);
  vec2 glyphHalf = vec2(quadHeight * a_form.x, quadHeight) * 0.5;
  vec2 dotHalf = vec2(dotRadius + 1.0);
  vec2 extent = glyphShare > 0.001 ? max(glyphHalf, dotHalf) : dotHalf;
  vec2 offset = a_corner * extent;
  // A letter in the idle sign stands in front of everything, so the land never hides the sign.
  gl_Position = vec4(clip.xy + offset / (u_viewport * 0.5) * w, gathered > 0.5 ? -w * 0.999 : clip.z, clip.w);
  v_glyphCoord = a_corner * extent / max(glyphHalf, vec2(0.001));
  v_rect = a_glyph;
  v_local = offset;
  v_glyphShare = glyphShare;
  v_dotRadius = dotRadius;

  float heightShare = clamp(height / u_brightestAt, 0.0, 1.0);
  float readable = smoothstep(9.0, 11.0, em);
  // An event is always brighter than the ground it stands on: electric far off, readable and brighter near.
  vec3 colour = mix(mix(u_electric, u_readable, heightShare), mix(u_readable, u_highGround, heightShare), readable);
  if (owner.x > 0.5 && owner.x < 1.5) colour = mix(u_present * 0.8, u_present, readable);
  // The slope it stands on: a face turned to the camera is brighter, the far side dimmer.
  float facing = dot(normalize(a_normal), normalize(u_eye - centre));
  float shade = mix(0.62, 1.32, smoothstep(0.1, 0.92, facing));
  colour *= shade;
  // The crest of a ridge, a step brighter.
  colour = mix(colour, u_highGround * 1.08, a_meta.x * 0.45);
  // A letter big enough to read never falls below the readable tint.
  colour = mix(colour, max(colour, owner.x > 0.5 && owner.x < 1.5 ? u_present : u_readable), readable);
  float light = max(owner.y, a_lit);
  vec3 litColour = owner.x > 0.5 && owner.x < 1.5 ? u_presentLit : u_lit;
  colour = mix(colour, litColour, light);
  float alpha = smoothstep(0.6, 3.0, em);
  // Dots are the ground: quiet, one tint for all, whoever they belong to.
  if (isLetter < 0.5 && a_form.z > 0.5) {
    colour = mix(mix(u_electric * 0.9, u_highGround, heightShare) * shade, u_lit, light);
    alpha = smoothstep(0.8, 3.0, em);
  } else if (isLetter < 0.5) {
    colour = mix(u_farTexture, u_lit, light * 0.6);
    alpha = mix(0.95, 1.0, light) * smoothstep(1.2, 4.0, em);
  }
  alpha *= 1.0 - owner.z * 0.8 * (1.0 - light);
  alpha *= 1.0 - owner.w * a_form.z;
  alpha *= 1.0 - 0.85 * u_away * (1.0 - member);
  colour = mix(colour, u_highGround, gathered * 0.6);
  v_colour = colour;
  v_alpha = alpha;
}`;

const LETTERS_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_atlas;
uniform float u_edge;
in vec2 v_glyphCoord;
flat in vec4 v_rect;
in vec2 v_local;
in float v_glyphShare;
in float v_dotRadius;
in vec3 v_colour;
in float v_alpha;
out vec4 colour;
void main() {
  float glyph = 0.0;
  if (v_glyphShare > 0.001 && abs(v_glyphCoord.x) <= 1.0 && abs(v_glyphCoord.y) <= 1.0) {
    vec2 inGlyph = v_glyphCoord * 0.5 + 0.5;
    float field = texture(u_atlas, vec2(mix(v_rect.x, v_rect.z, inGlyph.x), mix(v_rect.w, v_rect.y, inGlyph.y))).r;
    float soft = max(fwidth(field) * 0.7, 0.012);
    glyph = smoothstep(u_edge - soft, u_edge + soft, field);
  }
  float dotShape = 1.0 - smoothstep(v_dotRadius - 0.5, v_dotRadius + 0.5, length(v_local));
  float shape = mix(dotShape, glyph, v_glyphShare);
  float alpha = shape * v_alpha;
  if (alpha < 0.003) discard;
  colour = vec4(v_colour * alpha, alpha);
}`;

const SOLID_VERTEX = `#version 300 es
in vec3 a_position;
uniform mat4 u_viewProjection;
void main() { gl_Position = u_viewProjection * vec4(a_position, 1.0); }`;

const SOLID_FRAGMENT = `#version 300 es
precision mediump float;
out vec4 colour;
void main() { colour = vec4(0.0); }`;

export type OwnerState = { kind: number; light: number; dim: number; lifted: number };

/** The land's slope at a cell as a normal, from its neighbours' heights in the world. */
function normalAt(land: Land, row: number, column: number): [number, number, number] {
  const { grid, heights } = land;
  const at = (r: number, c: number) =>
    heights[Math.min(grid.rows - 1, Math.max(0, r)) * grid.columns + Math.min(grid.columns - 1, Math.max(0, c))];
  const acrossSlope = (yOfHeight(at(row, column + 1)) - yOfHeight(at(row, column - 1))) / (2 * COLUMN_WIDTH);
  // Rows run into negative z: the row behind is one ROW_DEPTH further from the camera.
  const alongSlope = (yOfHeight(at(row - 1, column)) - yOfHeight(at(row + 1, column))) / (2 * ROW_DEPTH);
  const length = Math.hypot(acrossSlope, 1, alongSlope);
  return [-acrossSlope / length, 1 / length, -alongSlope / length];
}

export class LandLayer {
  private readonly lettersProgram: WebGLProgram;
  private readonly solidProgram: WebGLProgram;
  private readonly lettersArray: WebGLVertexArrayObject;
  private readonly solidArray: WebGLVertexArrayObject;
  private readonly glyphBuffer: WebGLBuffer;
  private readonly formBuffer: WebGLBuffer;
  private readonly litBuffer: WebGLBuffer;
  private readonly awayBuffer: WebGLBuffer;
  private readonly solidIndexCount: number;
  private readonly owners = new Float32Array(MOST_OWNERS * 4);
  private readonly quiet = new Float32Array(MOST_QUIET * 4);
  private quietCount = 0;
  private atlasTexture: WebGLTexture | null = null;
  private keptTexture: WebGLTexture | null = null;
  private readonly locations = new Map<string, WebGLUniformLocation | null>();
  readonly count: number;
  /** How far the idle sign has formed, from 0 to 1, and the size of one of its cells in the world. */
  away = 0;
  awayCell = 1;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly land: Land,
  ) {
    this.lettersProgram = program(gl, LETTERS_VERTEX, LETTERS_FRAGMENT);
    this.solidProgram = program(gl, SOLID_VERTEX, SOLID_FRAGMENT);
    const { grid, instances } = land;
    this.count = instances.count;
    const place = new Float32Array(this.count * 4);
    const form = new Float32Array(this.count * 4);
    const normals = new Float32Array(this.count * 3);
    const meta = new Float32Array(this.count * 3);
    instances.cell.forEach((cell, index) => {
      const row = Math.floor(cell / grid.columns);
      const column = cell % grid.columns;
      place.set([xOfColumn(instances.column[index]), zOfRow(row + 0.5), land.heights[cell], land.owners[cell]], index * 4);
      // Letters type themselves in from the near edge back to the far one.
      form.set([1, 1, instances.code[index] === DOT ? 0 : 1, (row / grid.rows) * 0.9], index * 4);
      normals.set(normalAt(land, row, column), index * 3);
      meta.set([land.crest[cell], land.trackOfCell[cell], row], index * 3);
    });
    this.glyphBuffer = buffer(gl, new Float32Array(this.count * 4));
    this.formBuffer = buffer(gl, form);
    this.litBuffer = buffer(gl, new Float32Array(this.count), gl.DYNAMIC_DRAW);
    this.awayBuffer = buffer(gl, new Float32Array(this.count * 4), gl.DYNAMIC_DRAW);
    const corners = buffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    this.lettersArray = vertexArray(gl, this.lettersProgram, [
      { name: "a_corner", size: 2, divisor: 0, buffer: corners },
      { name: "a_place", size: 4, divisor: 1, buffer: buffer(gl, place) },
      { name: "a_glyph", size: 4, divisor: 1, buffer: this.glyphBuffer },
      { name: "a_form", size: 4, divisor: 1, buffer: this.formBuffer },
      { name: "a_normal", size: 3, divisor: 1, buffer: buffer(gl, normals) },
      { name: "a_meta", size: 3, divisor: 1, buffer: buffer(gl, meta) },
      { name: "a_lit", size: 1, divisor: 1, buffer: this.litBuffer },
      { name: "a_away", size: 4, divisor: 1, buffer: this.awayBuffer },
    ]);
    const solid = this.solidMesh();
    this.solidIndexCount = solid.indices.length;
    this.solidArray = vertexArray(
      gl,
      this.solidProgram,
      [{ name: "a_position", size: 3, divisor: 0, buffer: buffer(gl, solid.positions) }],
      buffer(gl, solid.indices, gl.STATIC_DRAW, gl.ELEMENT_ARRAY_BUFFER),
    );
  }

  /** The heightfield as a grid of triangles, lowered a little under the letters. */
  private solidMesh() {
    const { grid, heights } = this.land;
    const positions = new Float32Array(grid.rows * grid.columns * 3);
    for (let row = 0; row < grid.rows; row++)
      for (let column = 0; column < grid.columns; column++) {
        const cell = row * grid.columns + column;
        positions.set([xOfColumn(column + 0.5), yOfHeight(heights[cell]) - SOLID_BELOW, zOfRow(row + 0.5)], cell * 3);
      }
    const indices = new Uint32Array((grid.rows - 1) * (grid.columns - 1) * 6);
    let at = 0;
    for (let row = 0; row < grid.rows - 1; row++)
      for (let column = 0; column < grid.columns - 1; column++) {
        const a = row * grid.columns + column;
        const b = a + 1;
        const c = a + grid.columns;
        const d = c + 1;
        indices.set([a, c, b, b, c, d], at);
        at += 6;
      }
    return { positions, indices };
  }

  /** Once the atlas is built, each letter learns where its glyph is and its shape. */
  useAtlas(atlas: Atlas, texture: WebGLTexture) {
    const { gl, land } = this;
    this.atlasTexture = texture;
    const glyphs = new Float32Array(this.count * 4);
    const form = new Float32Array(this.count * 4);
    const { instances } = land;
    instances.cell.forEach((cell, index) => {
      const row = Math.floor(cell / land.grid.columns);
      const code = instances.code[index];
      const entry = code === DOT ? undefined : atlas.entries.get(cellKey(String.fromCharCode(code)));
      if (entry) glyphs.set(entry.uv, index * 4);
      // A narrowed letter keeps its height and gives up width, so a long word fits its track.
      const aspect = (entry?.aspect ?? 1) * instances.narrow[index];
      form.set([aspect, entry?.sizeShare ?? 1, entry ? 1 : 0, (row / land.grid.rows) * 0.9], index * 4);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glyphBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, glyphs, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.formBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, form, gl.STATIC_DRAW);
  }

  /** The thinning's texture of kept rows. */
  useKeptRows(texture: WebGLTexture) {
    this.keptTexture = texture;
  }

  /** Where each letter goes in the idle sign: x, y, z, and 1 plus its delay for a member, 0 for the rest. */
  setAway(values: Float32Array) {
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.awayBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, values);
  }

  /** Lights the letters a search spells: one value per drawn instance, 1 lit. */
  setLitCells(values: Float32Array) {
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.litBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, values);
  }

  setQuiet(rectangles: { left: number; top: number; right: number; bottom: number }[]) {
    this.quiet.fill(0);
    rectangles.slice(0, MOST_QUIET).forEach((box, index) => this.quiet.set([box.left, box.top, box.right, box.bottom], index * 4));
    this.quietCount = Math.min(MOST_QUIET, rectangles.length);
  }

  setOwner(index: number, state: OwnerState) {
    this.owners.set([state.kind, state.light, state.dim, state.lifted], index * 4);
  }

  private uniform(name: string) {
    if (!this.locations.has(name)) this.locations.set(name, this.gl.getUniformLocation(this.lettersProgram, name));
    return this.locations.get(name) ?? null;
  }

  /** The solid alone, into the depth buffer, so whatever is drawn after it is hidden behind the land. */
  drawSolid(view: View) {
    const { gl } = this;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.useProgram(this.solidProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.solidProgram, "u_viewProjection"), false, view.viewProjection);
    gl.colorMask(false, false, false, false);
    gl.depthMask(true);
    gl.bindVertexArray(this.solidArray);
    gl.drawElements(gl.TRIANGLES, this.solidIndexCount, gl.UNSIGNED_INT, 0);
    gl.colorMask(true, true, true, true);
  }

  draw(view: View, settings: { time: number; roll: number; reveal: number }) {
    const { gl } = this;
    const { width, height } = view.size();
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.useProgram(this.lettersProgram);
    gl.uniformMatrix4fv(this.uniform("u_viewProjection"), false, view.viewProjection);
    gl.uniform2f(this.uniform("u_viewport"), width, height);
    gl.uniform1f(this.uniform("u_focal"), view.focalPixels);
    gl.uniform3fv(this.uniform("u_eye"), view.eye);
    gl.uniform1f(this.uniform("u_time"), settings.time);
    gl.uniform1f(this.uniform("u_roll"), settings.roll);
    gl.uniform1f(this.uniform("u_reveal"), settings.reveal);
    gl.uniform1f(this.uniform("u_atlasReady"), this.atlasTexture ? 1 : 0);
    gl.uniform1f(this.uniform("u_brightestAt"), BRIGHTEST_AT);
    gl.uniform1f(this.uniform("u_heightUnit"), HEIGHT_UNIT);
    gl.uniform1f(this.uniform("u_lift"), LETTER_LIFT);
    gl.uniform1f(this.uniform("u_perUnit"), LETTER_PER_UNIT);
    gl.uniform1f(this.uniform("u_widest"), WIDEST_LETTER);
    gl.uniform1f(this.uniform("u_tallest"), TALLEST_LETTER);
    gl.uniform1f(this.uniform("u_away"), this.away);
    gl.uniform1f(this.uniform("u_awayCell"), this.awayCell);
    gl.uniform1f(this.uniform("u_edge"), EDGE_VALUE);
    gl.uniform4fv(this.uniform("u_owner"), this.owners);
    gl.uniform4fv(this.uniform("u_quiet"), this.quiet);
    gl.uniform1i(this.uniform("u_quietCount"), this.quietCount);
    const tints: [string, string][] = [
      ["u_farTexture", landTints.farTexture],
      ["u_electric", landTints.electric],
      ["u_readable", landTints.readable],
      ["u_highGround", landTints.highGround],
      ["u_lit", lit],
      ["u_present", present],
      ["u_presentLit", presentLit],
    ];
    for (const [name, hex] of tints) gl.uniform3fv(this.uniform(name), rgb(hex));
    if (this.atlasTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
      gl.uniform1i(this.uniform("u_atlas"), 0);
    }
    if (this.keptTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.keptTexture);
      gl.uniform1i(this.uniform("u_kept"), 1);
      gl.activeTexture(gl.TEXTURE0);
    }
    gl.bindVertexArray(this.lettersArray);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    gl.bindVertexArray(null);
    gl.depthMask(true);
  }
}

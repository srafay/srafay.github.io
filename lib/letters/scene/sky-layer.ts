/*
  The skills afloat over the land: all 211, each over the events that name it, or over its CV group's place when no
  event names it. Each drifts slowly. A word is drawn as a word only where it has room: one placement pass, nearest
  first, keeps every word off every other and off the name, the bio and the controls. The rest are specks of light.
  A picked skill's word comes down to the land, to the newest event that names it.
*/
import type { SkillWord } from "@/lib/about-cv/skills";
import type { Atlas } from "@/lib/about-cv/scene/word-atlas";
import { EDGE_VALUE } from "@/lib/about-cv/scene/word-atlas";
import { xOfColumn, zOfRow } from "@/lib/letters/land/grid";
import type { Land } from "@/lib/letters/land/land";
import { landTints, lit } from "@/lib/letters/palette";
import { skillKey } from "./atlas";
import { buffer, program, rgb, vertexArray } from "./gl";
import type { Vector } from "./matrix";
import type { View } from "./view";

/** How high the skills float, in cells: above the highest ridge. */
const LOWEST_FLOAT = 32;
const FLOAT_SPREAD = 28;
/** A skill word's size in the world, in cells. */
const WORD_SIZE = 2.2;
/** A word reads only at this size or more, in CSS pixels. Under it, it is a speck. */
export const SMALLEST_WORD = 13;
/** The largest a skill word grows to, in CSS pixels, so a near one never swells into a ghost. */
const LARGEST_WORD = 16;
/** How many words read at once: the rest are specks. */
const WORDS_AT_REST = { narrow: 7, wide: 14 };
/** A tappable word's height reaches at least this, in CSS pixels. */
export const SMALLEST_TARGET = 44;

export type Rectangle = { left: number; top: number; right: number; bottom: number };

/** A small steady hash of a word, from 0 to 1, so each skill floats in its own place on every visit. */
function hashOf(text: string, salt: number) {
  let value = 2166136261 ^ salt;
  for (let index = 0; index < text.length; index++) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return ((value >>> 0) % 10000) / 10000;
}

/** Where each skill floats: over the middle of the events that name it, or over its group's. */
function anchorsOf(skills: SkillWord[], land: Land): Vector[] {
  const centreOf = (eventId: string): Vector | null => {
    const item = land.events.find((candidate) => candidate.event.id === eventId);
    if (!item || item.cellCount === 0) return null;
    return [xOfColumn(item.track.left + item.track.width / 2), 0, zOfRow((item.rows[0] + item.rows[1]) / 2)];
  };
  const named = new Map<string, Vector>();
  for (const skill of skills) {
    const centres = skill.events.map(centreOf).filter((centre): centre is Vector => centre !== null);
    if (!centres.length) continue;
    named.set(skill.word, [
      centres.reduce((sum, centre) => sum + centre[0], 0) / centres.length,
      0,
      centres.reduce((sum, centre) => sum + centre[2], 0) / centres.length,
    ]);
  }
  const groupCentre = new Map<string, Vector>();
  for (const skill of skills) {
    const own = named.get(skill.word);
    if (!own) continue;
    const sum = groupCentre.get(skill.group) ?? [0, 0, 0];
    groupCentre.set(skill.group, [sum[0] + own[0], sum[1] + 1, sum[2] + own[2]]);
  }
  const landMiddle: Vector = [xOfColumn(land.grid.columns / 2), 0, zOfRow(land.grid.rows / 2)];
  return skills.map((skill) => {
    const scatter = named.has(skill.word) ? 6 : 26;
    const group = groupCentre.get(skill.group);
    const base = named.get(skill.word) ?? (group ? [group[0] / group[1], 0, group[2] / group[1]] : landMiddle);
    return [
      base[0] + (hashOf(skill.word, 1) - 0.5) * scatter * 2,
      LOWEST_FLOAT + hashOf(skill.word, 2) * FLOAT_SPREAD,
      base[2] + (hashOf(skill.word, 3) - 0.5) * scatter * 4,
    ] as Vector;
  });
}

/** The slow drift, the same on the card and here: a few cells over half a minute. */
export function drifted(anchor: Vector, phase: number, time: number): Vector {
  return [
    anchor[0] + Math.sin(time * 0.11 + phase * 6.28) * 1.4,
    anchor[1] + Math.sin(time * 0.07 + phase * 12.1) * 0.9,
    anchor[2] + Math.cos(time * 0.09 + phase * 9.3) * 2.2,
  ];
}

const VERTEX = `#version 300 es
precision highp float;
in vec2 a_corner;
in vec4 a_anchor;
in vec4 a_glyph;
in vec2 a_form;
in vec2 a_state;
uniform mat4 u_viewProjection;
uniform vec2 u_viewport;
uniform float u_focal;
uniform float u_time;
uniform float u_drift;
uniform float u_atlasReady;
uniform float u_wordSize;
uniform float u_largest;
uniform int u_descending;
uniform float u_descent;
uniform vec3 u_descentTo;
uniform float u_fade;
uniform vec3 u_quiet;
uniform vec3 u_readable;
uniform vec3 u_lit;
out vec2 v_glyphCoord;
flat out vec4 v_rect;
out vec2 v_local;
out float v_wordShare;
out vec3 v_colour;
out float v_alpha;
void main() {
  float phase = a_anchor.w;
  vec3 position = a_anchor.xyz + u_drift * vec3(
    sin(u_time * 0.11 + phase * 6.28) * 1.4,
    sin(u_time * 0.07 + phase * 12.1) * 0.9,
    cos(u_time * 0.09 + phase * 9.3) * 2.2);
  if (gl_InstanceID == u_descending) position = mix(position, u_descentTo, u_descent);
  vec4 clip = u_viewProjection * vec4(position, 1.0);
  float w = max(clip.w, 0.001);
  float em = min(u_wordSize * u_focal / w, u_largest);
  float wordShare = a_state.x * u_atlasReady;
  float quadHeight = em / max(a_form.y, 0.01);
  vec2 wordHalf = vec2(quadHeight * a_form.x, quadHeight) * 0.5;
  vec2 speckHalf = vec2(2.5);
  vec2 extent = wordShare > 0.001 ? max(wordHalf, speckHalf) : speckHalf;
  vec2 offset = a_corner * extent;
  gl_Position = vec4(clip.xy + offset / (u_viewport * 0.5) * w, clip.z, clip.w);
  v_glyphCoord = a_corner * extent / max(wordHalf, vec2(0.001));
  v_rect = a_glyph;
  v_local = offset;
  v_wordShare = wordShare;
  float light = a_state.y;
  v_colour = mix(mix(u_quiet, u_readable, wordShare), u_lit, light);
  v_alpha = mix(0.5, 0.9, wordShare) * mix(1.0, 0.25, u_fade * (1.0 - light)) * smoothstep(1.0, 6.0, em);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_atlas;
uniform float u_edge;
in vec2 v_glyphCoord;
flat in vec4 v_rect;
in vec2 v_local;
in float v_wordShare;
in vec3 v_colour;
in float v_alpha;
out vec4 colour;
void main() {
  float word = 0.0;
  if (v_wordShare > 0.001 && abs(v_glyphCoord.x) <= 1.0 && abs(v_glyphCoord.y) <= 1.0) {
    vec2 inWord = v_glyphCoord * 0.5 + 0.5;
    float field = texture(u_atlas, vec2(mix(v_rect.x, v_rect.z, inWord.x), mix(v_rect.w, v_rect.y, inWord.y))).r;
    float soft = max(fwidth(field) * 0.7, 0.012);
    word = smoothstep(u_edge - soft, u_edge + soft, field);
  }
  float speck = 1.0 - smoothstep(0.7, 1.7, length(v_local));
  float alpha = mix(speck, word, v_wordShare) * v_alpha;
  if (alpha < 0.003) discard;
  colour = vec4(v_colour * alpha, alpha);
}`;

export type PlacedWord = { index: number; rectangle: Rectangle; target: Rectangle };

export class SkyLayer {
  private readonly shader: WebGLProgram;
  private readonly array: WebGLVertexArrayObject;
  private readonly glyphBuffer: WebGLBuffer;
  private readonly formBuffer: WebGLBuffer;
  private readonly stateBuffer: WebGLBuffer;
  readonly anchors: Vector[];
  readonly phases: number[];
  /** Each word's share of being a word (0 a speck, 1 a word) and its light, as drawn now. */
  private readonly state: Float32Array<ArrayBuffer>;
  private readonly wanted: Float32Array<ArrayBuffer>;
  private atlas: Atlas | null = null;
  private texture: WebGLTexture | null = null;
  placed: PlacedWord[] = [];
  descending = -1;
  descent = 0;
  descentTo: Vector = [0, 0, 0];
  /** How far the words fade back while something is lit, from 0 to 1. */
  fade = 0;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    readonly skills: SkillWord[],
    land: Land,
  ) {
    this.shader = program(gl, VERTEX, FRAGMENT);
    this.anchors = anchorsOf(skills, land);
    this.phases = skills.map((skill) => hashOf(skill.word, 4));
    const anchors = new Float32Array(skills.length * 4);
    this.anchors.forEach((anchor, index) => anchors.set([...anchor, this.phases[index]], index * 4));
    this.state = new Float32Array(skills.length * 2);
    this.wanted = new Float32Array(skills.length * 2);
    this.glyphBuffer = buffer(gl, new Float32Array(skills.length * 4));
    this.formBuffer = buffer(gl, new Float32Array(skills.length * 2).fill(1));
    this.stateBuffer = buffer(gl, this.state, gl.DYNAMIC_DRAW);
    this.array = vertexArray(gl, this.shader, [
      { name: "a_corner", size: 2, divisor: 0, buffer: buffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])) },
      { name: "a_anchor", size: 4, divisor: 1, buffer: buffer(gl, anchors) },
      { name: "a_glyph", size: 4, divisor: 1, buffer: this.glyphBuffer },
      { name: "a_form", size: 2, divisor: 1, buffer: this.formBuffer },
      { name: "a_state", size: 2, divisor: 1, buffer: this.stateBuffer },
    ]);
  }

  useAtlas(atlas: Atlas, texture: WebGLTexture) {
    const { gl } = this;
    this.atlas = atlas;
    this.texture = texture;
    const glyphs = new Float32Array(this.skills.length * 4);
    const form = new Float32Array(this.skills.length * 2);
    this.skills.forEach((skill, index) => {
      const entry = atlas.entries.get(skillKey(skill.word));
      if (!entry) return;
      glyphs.set(entry.uv, index * 4);
      form.set([entry.aspect, entry.sizeShare], index * 2);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glyphBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, glyphs, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.formBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, form, gl.STATIC_DRAW);
  }

  /** Where a skill's word stands now, drift included. */
  positionOf(index: number, time: number, drift: number): Vector {
    const drifting = drift > 0 ? drifted(this.anchors[index], this.phases[index], time) : this.anchors[index];
    if (index !== this.descending) return drifting;
    return drifting.map((value, axis) => value + (this.descentTo[axis] - value) * this.descent) as Vector;
  }

  /**
   * Chooses which skills read as words now: lit ones first, then nearest first, each only where it overlaps nothing
   * placed and nothing blocked. Run every tenth of a second while the view moves, and once when it rests.
   */
  place(view: View, time: number, drift: number, blocked: Rectangle[], litWords: Set<number>, narrow: boolean, reading = false) {
    if (!this.atlas) return;
    const { width, height } = view.size();
    const candidates: { index: number; em: number; x: number; y: number; lit: boolean }[] = [];
    this.skills.forEach((skill, index) => {
      const spot = view.toScreen(this.positionOf(index, time, drift));
      if (!spot) return;
      const em = Math.min((WORD_SIZE * view.focalPixels) / spot.w, LARGEST_WORD);
      if (em < SMALLEST_WORD && !litWords.has(index)) return;
      candidates.push({ index, em, x: spot.x, y: spot.y, lit: litWords.has(index) });
    });
    candidates.sort((first, second) => Number(second.lit) - Number(first.lit) || second.em - first.em);
    // At reading distance the land is the page: the sky's words step back, all but a lit one.
    const limit = reading ? 0 : narrow ? WORDS_AT_REST.narrow : WORDS_AT_REST.wide;
    const placed: PlacedWord[] = [];
    const taken = [...blocked];
    for (const candidate of candidates) {
      if (placed.length >= limit && !candidate.lit) break;
      const entry = this.atlas.entries.get(skillKey(this.skills[candidate.index].word));
      if (!entry) continue;
      const em = Math.max(candidate.em, SMALLEST_WORD);
      const textWidth = (em / entry.sizeShare) * entry.aspect * (1 - 2 * entry.padAcross);
      const textHeight = em * 1.05;
      const rectangle = {
        left: candidate.x - textWidth / 2,
        right: candidate.x + textWidth / 2,
        top: candidate.y - textHeight / 2,
        bottom: candidate.y + textHeight / 2,
      };
      const margin = 6;
      if (rectangle.left < margin || rectangle.right > width - margin || rectangle.top < margin || rectangle.bottom > height - margin)
        continue;
      if (taken.some((other) => overlaps(other, rectangle, 4))) continue;
      taken.push(rectangle);
      const reach = Math.max(0, (SMALLEST_TARGET - textHeight) / 2);
      placed.push({ index: candidate.index, rectangle, target: { ...rectangle, top: rectangle.top - reach, bottom: rectangle.bottom + reach } });
    }
    this.placed = placed;
    this.wanted.fill(0);
    for (const word of placed) this.wanted[word.index * 2] = 1;
    for (const index of litWords) this.wanted[index * 2 + 1] = 1;
  }

  /** Eases each word toward what the placement wants. A word leaving goes at once, so no faint word lies under a new one. */
  step(seconds: number, instant: boolean) {
    let moving = false;
    const rate = instant ? 1 : Math.min(1, seconds / 0.25);
    for (let index = 0; index < this.state.length; index++) {
      const target = this.wanted[index];
      const now = this.state[index];
      if (now === target) continue;
      const leaving = index % 2 === 0 && target < now;
      this.state[index] = leaving ? target : now + (target - now) * rate;
      if (Math.abs(this.state[index] - target) < 0.01) this.state[index] = target;
      else moving = true;
    }
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.stateBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.state);
    return moving;
  }

  draw(view: View, time: number, drift: number) {
    const { gl } = this;
    const { width, height } = view.size();
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.shader);
    const at = (name: string) => gl.getUniformLocation(this.shader, name);
    gl.uniformMatrix4fv(at("u_viewProjection"), false, view.viewProjection);
    gl.uniform2f(at("u_viewport"), width, height);
    gl.uniform1f(at("u_focal"), view.focalPixels);
    gl.uniform1f(at("u_time"), time);
    gl.uniform1f(at("u_drift"), drift);
    gl.uniform1f(at("u_atlasReady"), this.texture ? 1 : 0);
    gl.uniform1f(at("u_wordSize"), WORD_SIZE);
    gl.uniform1f(at("u_largest"), LARGEST_WORD);
    gl.uniform1i(at("u_descending"), this.descending);
    gl.uniform1f(at("u_descent"), this.descent);
    gl.uniform3fv(at("u_descentTo"), this.descentTo);
    gl.uniform1f(at("u_fade"), this.fade);
    gl.uniform1f(at("u_edge"), EDGE_VALUE);
    gl.uniform3fv(at("u_quiet"), rgb(landTints.electric));
    gl.uniform3fv(at("u_readable"), rgb(landTints.readable));
    gl.uniform3fv(at("u_lit"), rgb(lit));
    if (this.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(at("u_atlas"), 0);
    }
    gl.bindVertexArray(this.array);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.skills.length);
    gl.bindVertexArray(null);
  }
}

export const overlaps = (first: Rectangle, second: Rectangle, gap = 0) =>
  first.left < second.right + gap && second.left < first.right + gap && first.top < second.bottom + gap && second.top < first.bottom + gap;

/*
  The names of the events in focus. When a skill is lit, a lane isolated or a search holds events, the camera often
  stands far enough back that their own letters are dots. Then each of those events is named at its crest, with its
  glyph, at a size that reads, in near white (the present in its warm light). A name shows only where it overlaps
  nothing: no other name, no control, no readable row of the land, no mark, no word of the sky. Where an event's own
  letters are big enough to read, it needs no name: the land already spells it.
*/
import { EDGE_VALUE, type Atlas } from "@/lib/about-cv/scene/word-atlas";
import type { EventOnLand, Land } from "@/lib/letters/land/land";
import { lit, presentLit } from "@/lib/letters/palette";
import { buffer, program, rgb, vertexArray } from "./gl";
import type { Vector } from "./matrix";
import { overlaps, type Rectangle } from "./sky-layer";
import type { View } from "./view";

export const eventLabelKey = (id: string) => `e:${id}`;

/** A name's size on screen, in CSS pixels. */
const LABEL_PIXELS = 14;
/** An event whose own letters are this size or more needs no name. */
const READS_ITSELF = 11;
/** How high over its crest a name stands, in world units. */
const LABEL_LIFT = 2.4;

const VERTEX = `#version 300 es
precision highp float;
in vec2 a_corner;
in vec3 a_anchor;
in vec4 a_glyph;
in vec3 a_form;
in float a_shown;
in vec2 a_offset;
uniform mat4 u_viewProjection;
uniform vec2 u_viewport;
uniform float u_pixels;
uniform vec3 u_lit;
uniform vec3 u_present;
out vec2 v_coord;
flat out vec4 v_rect;
out float v_alpha;
out vec3 v_colour;
void main() {
  vec4 clip = u_viewProjection * vec4(a_anchor, 1.0);
  float w = max(clip.w, 0.001);
  float quadHeight = u_pixels / max(a_form.y, 0.01);
  vec2 extent = vec2(quadHeight * a_form.x, quadHeight) * 0.5;
  // The name stands just above its crest: its foot on the point, not its middle.
  // The name stands at the place the placement chose for it, an offset in pixels from just above its crest.
  clip.xy += (a_corner * extent + vec2(0.0, extent.y * 0.6) + vec2(a_offset.x, -a_offset.y)) / (u_viewport * 0.5) * w;
  gl_Position = vec4(clip.xy, -w * 0.999, w);
  v_coord = a_corner * 0.5 + 0.5;
  v_rect = a_glyph;
  v_alpha = a_shown;
  v_colour = a_form.z > 0.5 ? u_present : u_lit;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_atlas;
uniform float u_edge;
in vec2 v_coord;
flat in vec4 v_rect;
in float v_alpha;
in vec3 v_colour;
out vec4 colour;
void main() {
  float field = texture(u_atlas, vec2(mix(v_rect.x, v_rect.z, v_coord.x), mix(v_rect.w, v_rect.y, v_coord.y))).r;
  float soft = max(fwidth(field) * 0.7, 0.012);
  // A soft dark rim under the name keeps it clear of the dots behind it.
  float rim = smoothstep(u_edge - 0.32, u_edge - 0.06, field);
  float body = smoothstep(u_edge - soft, u_edge + soft, field);
  float alpha = max(body, rim * 0.85) * v_alpha;
  if (alpha < 0.003) discard;
  colour = vec4(v_colour * body * v_alpha, alpha);
}`;

export class LabelsLayer {
  private readonly shader: WebGLProgram;
  private array: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private atlas: Atlas | null = null;
  private readonly shown: Float32Array<ArrayBuffer>;
  private readonly wanted: Float32Array<ArrayBuffer>;
  private readonly shownBuffer: WebGLBuffer;
  private readonly offsets: Float32Array<ArrayBuffer>;
  private readonly offsetBuffer: WebGLBuffer;
  private readonly anchors: Vector[];
  /** Where the names shown now lie on screen, for the sky to keep off. */
  places: Rectangle[] = [];

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly land: Land,
    centreOf: (item: EventOnLand) => Vector,
  ) {
    this.shader = program(gl, VERTEX, FRAGMENT);
    this.anchors = land.events.map((item) => {
      const centre = centreOf(item);
      return [centre[0], centre[1] + LABEL_LIFT, centre[2]];
    });
    this.shown = new Float32Array(land.events.length);
    this.wanted = new Float32Array(land.events.length);
    this.shownBuffer = buffer(gl, this.shown, gl.DYNAMIC_DRAW);
    this.offsets = new Float32Array(land.events.length * 2);
    this.offsetBuffer = buffer(gl, this.offsets, gl.DYNAMIC_DRAW);
  }

  useAtlas(atlas: Atlas, texture: WebGLTexture) {
    const { gl, land } = this;
    this.atlas = atlas;
    this.texture = texture;
    const anchors = new Float32Array(land.events.length * 3);
    const glyphs = new Float32Array(land.events.length * 4);
    const forms = new Float32Array(land.events.length * 3);
    land.events.forEach((item, index) => {
      const entry = atlas.entries.get(eventLabelKey(item.event.id));
      anchors.set(this.anchors[index], index * 3);
      if (!entry) return;
      glyphs.set(entry.uv, index * 4);
      forms.set([entry.aspect, entry.sizeShare, item.event.isPresent ? 1 : 0], index * 3);
    });
    this.array = vertexArray(gl, this.shader, [
      { name: "a_corner", size: 2, divisor: 0, buffer: buffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])) },
      { name: "a_anchor", size: 3, divisor: 1, buffer: buffer(gl, anchors) },
      { name: "a_glyph", size: 4, divisor: 1, buffer: buffer(gl, glyphs) },
      { name: "a_form", size: 3, divisor: 1, buffer: buffer(gl, forms) },
      { name: "a_shown", size: 1, divisor: 1, buffer: this.shownBuffer },
      { name: "a_offset", size: 2, divisor: 1, buffer: this.offsetBuffer },
    ]);
  }

  /**
   * Names the events in focus that do not read themselves, nearest first, each only where it overlaps nothing.
   * crestSize tells how big an event's own letters are drawn now.
   */
  place(view: View, focus: Set<number>, crestSize: (item: EventOnLand) => number, blocked: Rectangle[]) {
    this.wanted.fill(0);
    this.places = [];
    if (!this.atlas || !focus.size) return;
    const { width, height } = view.size();
    const candidates: { index: number; x: number; y: number; w: number }[] = [];
    for (const index of focus) {
      const item = this.land.events[index];
      if (crestSize(item) >= READS_ITSELF) continue;
      const spot = view.toScreen(this.anchors[index]);
      if (spot) candidates.push({ index, x: spot.x, y: spot.y, w: spot.w });
    }
    candidates.sort((first, second) => first.w - second.w);
    const taken = [...blocked];
    for (const candidate of candidates) {
      const entry = this.atlas.entries.get(eventLabelKey(this.land.events[candidate.index].event.id));
      if (!entry) continue;
      const quadHeight = LABEL_PIXELS / entry.sizeShare;
      const textWidth = quadHeight * entry.aspect * (1 - 2 * entry.padAcross);
      const middle = candidate.y - quadHeight * 0.3;
      // Above its crest first; then below, beside and at the corners, the first place that overlaps nothing.
      const across = textWidth / 2 + 10;
      const up = LABEL_PIXELS * 1.5;
      const tries: [number, number][] = [[0, 0], [0, -up], [0, up], [across, 0], [-across, 0], [across, -up], [-across, -up], [across, up], [-across, up]];
      for (const [offsetX, offsetY] of tries) {
        const place = {
          left: candidate.x + offsetX - textWidth / 2,
          right: candidate.x + offsetX + textWidth / 2,
          top: middle + offsetY - LABEL_PIXELS * 0.6,
          bottom: middle + offsetY + LABEL_PIXELS * 0.6,
        };
        if (place.left < 6 || place.right > width - 6 || place.top < 6 || place.bottom > height - 6) continue;
        if (taken.some((other) => overlaps(other, place, 4))) continue;
        taken.push(place);
        this.places.push(place);
        this.wanted[candidate.index] = 1;
        this.offsets.set([offsetX, offsetY], candidate.index * 2);
        break;
      }
    }
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.offsets);
  }

  /** Eases each name toward shown or gone. Says whether any is still changing. */
  step(seconds: number, instant: boolean) {
    let moving = false;
    const rate = instant ? 1 : Math.min(1, seconds / 0.2);
    for (let index = 0; index < this.shown.length; index++) {
      const target = this.wanted[index];
      if (this.shown[index] === target) continue;
      this.shown[index] = target < this.shown[index] ? target : this.shown[index] + (target - this.shown[index]) * rate;
      if (Math.abs(this.shown[index] - target) < 0.01) this.shown[index] = target;
      else moving = true;
    }
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.shownBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.shown);
    return moving;
  }

  /** The names shown now, by event id, for the checks. */
  shownIds() {
    return this.land.events.filter((_, index) => this.shown[index] > 0.5).map((item) => item.event.id);
  }

  draw(view: View) {
    if (!this.array || !this.texture) return;
    const { gl } = this;
    const { width, height } = view.size();
    gl.useProgram(this.shader);
    const at = (name: string) => gl.getUniformLocation(this.shader, name);
    gl.uniformMatrix4fv(at("u_viewProjection"), false, view.viewProjection);
    gl.uniform2f(at("u_viewport"), width, height);
    gl.uniform1f(at("u_pixels"), LABEL_PIXELS);
    gl.uniform1f(at("u_edge"), EDGE_VALUE);
    gl.uniform3fv(at("u_lit"), rgb(lit));
    gl.uniform3fv(at("u_present"), rgb(presentLit));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(at("u_atlas"), 0);
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(this.array);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.land.events.length);
    gl.bindVertexArray(null);
  }
}

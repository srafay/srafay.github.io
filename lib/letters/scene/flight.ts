/*
  The version's signature move. When an event is tapped, its letters lift off the land and fly into its card, each
  landing on one character of the card at that character's place, size, face and colour. The card's own text is hidden
  while they fly and shown under them as they land, so they settle as the card's readable text.

  Each character of the card is matched to a cell of the land that spells the same character of the event's stream
  (the land spells the card's own words, land/text.ts), the copy nearest the tap. Words the land does not spell (the
  card's labels) fly from the event's cells nearest the tap. The flight draws on a canvas over everything, made for the
  flight and removed after it. With reduced motion there is no flight: the card fades in.
*/
import type { EventOnLand, Land } from "@/lib/letters/land/land";
import type { LettersScene } from "./letters-scene";

/** How long one letter flies, and how long the last waits after the first, in seconds. */
const FLIGHT_SECONDS = 0.72;
const SPREAD_SECONDS = 0.5;
/** How high a letter's path arcs above the straight line, in CSS pixels. */
const ARC = 36;
/** When a letter turns from the land's capital into the card's own character, as a share of its flight. */
const TURNS_AT = 0.45;
/** The land's face, as the atlas draws it. */
const LAND_FONT = "600 48px Figtree";

type Glyph = {
  landCharacter: string;
  character: string;
  font: string;
  fontPixels: number;
  from: { x: number; y: number; em: number; colour: [number, number, number] };
  to: { x: number; baseline: number; colour: [number, number, number] };
  delay: number;
};

/** A colour as "#rrggbb" or "rgb(r, g, b)" to three numbers from 0 to 255. */
const parseColour = (text: string): [number, number, number] => {
  if (text.startsWith("#")) {
    const value = parseInt(text.slice(1), 16);
    return [value >> 16, (value >> 8) & 255, value & 255];
  }
  const parts = text.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return [parts[0], parts[1], parts[2]];
};

const ease = (share: number) => (share < 0.5 ? 4 * share * share * share : 1 - (-2 * share + 2) ** 3 / 2);

/** Each visible character of the card's words, with its place and its face. Read once, as the flight starts. */
function charactersOf(words: HTMLElement, visible: DOMRect) {
  const found: { character: string; rectangle: DOMRect; font: string; fontPixels: number; colour: string; node: Text; offset: number }[] = [];
  const walker = document.createTreeWalker(words, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement;
    if (!parent) continue;
    const style = getComputedStyle(parent);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const text = node.data;
    for (let offset = 0; offset < text.length; offset++) {
      if (/\s/.test(text[offset])) continue;
      range.setStart(node, offset);
      range.setEnd(node, offset + 1);
      const rectangle = range.getBoundingClientRect();
      if (!rectangle.width || rectangle.bottom < visible.top || rectangle.top > visible.bottom) continue;
      found.push({ character: text[offset], rectangle, font, fontPixels: parseFloat(style.fontSize), colour: style.color, node, offset });
    }
  }
  return found;
}

/** Where each character of the event's stream is spelled on the land, nearest the tap first. */
function cellsByStreamIndex(land: Land, item: EventOnLand, scene: LettersScene, tap: { x: number; y: number }) {
  const byIndex = new Map<number, { instance: number; distance: number; x: number; y: number; em: number }>();
  const anyCells: { instance: number; distance: number; x: number; y: number; em: number }[] = [];
  const { width, height } = scene.view.size();
  const { instances } = land;
  for (let instance = 0; instance < instances.count; instance++) {
    if (land.owners[instances.cell[instance]] !== item.index) continue;
    const spot = scene.instanceOnScreen(instance);
    if (!spot || spot.x < -40 || spot.x > width + 40 || spot.y < -40 || spot.y > height + 40) continue;
    const distance = Math.hypot(spot.x - tap.x, spot.y - tap.y);
    const entry = { instance, distance, x: spot.x, y: spot.y, em: spot.em };
    anyCells.push(entry);
    const index = instances.stream[instance];
    if (index < 0) continue;
    const known = byIndex.get(index);
    if (!known || known.distance > distance) byIndex.set(index, entry);
  }
  anyCells.sort((first, second) => first.distance - second.distance);
  return { byIndex, anyCells };
}

/** Which stream index each text node of the card starts at: its piece's start, found by its words. */
function streamStartOf(item: EventOnLand, text: string, used: Set<number>) {
  const upper = text.toUpperCase();
  const { stream } = item;
  for (let index = 0; index < stream.pieces.length; index++) {
    const start = stream.starts[index];
    const within = stream.pieces[index].text.toUpperCase().indexOf(upper);
    if (within < 0 || used.has(start + within)) continue;
    used.add(start + within);
    return start + within;
  }
  return -1;
}

export class Flight {
  private canvas: HTMLCanvasElement | null = null;
  private frame = 0;
  private finish: (() => void) | null = null;

  constructor(private readonly scene: LettersScene) {}

  isFlying() {
    return this.canvas !== null;
  }

  /** Flies the event's letters from the land into the card's words. Calls done once they have landed. */
  fly(item: EventOnLand, words: HTMLElement, visible: DOMRect, tap: { x: number; y: number }, landColour: string, done: () => void) {
    this.cancel();
    const land = this.scene.data.land;
    const targets = charactersOf(words, visible);
    const sources = cellsByStreamIndex(land, item, this.scene, tap);
    if (!targets.length || !sources.anyCells.length) return done();
    const fromColour = parseColour(landColour);
    const nodeStarts = new Map<Text, number>();
    // Each piece of the card (its heading, a line, a skill) flies as one, so its words keep their spaces on the way.
    const pieces = [...new Set(targets.map((target) => target.node))];
    const used = new Set<number>();
    const glyphs: Glyph[] = targets.map((target, order) => {
      if (!nodeStarts.has(target.node)) nodeStarts.set(target.node, streamStartOf(item, target.node.data, used));
      const start = nodeStarts.get(target.node) as number;
      const source = (start >= 0 && sources.byIndex.get(start + target.offset)) || sources.anyCells[order % sources.anyCells.length];
      const code = land.instances.code[source.instance];
      return {
        landCharacter: code ? String.fromCharCode(code) : target.character.toUpperCase(),
        character: target.character,
        font: target.font,
        fontPixels: target.fontPixels,
        from: { x: source.x, y: source.y, em: Math.max(4, source.em), colour: fromColour },
        to: { x: target.rectangle.left, baseline: 0, colour: parseColour(target.colour) },
        delay: (pieces.indexOf(target.node) / Math.max(1, pieces.length - 1)) * SPREAD_SECONDS,
        rectangle: target.rectangle,
      } as Glyph & { rectangle: DOMRect };
    });
    this.canvas = document.createElement("canvas");
    this.canvas.className = "letters-flight";
    this.canvas.setAttribute("aria-hidden", "true");
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * ratio);
    this.canvas.height = Math.round(window.innerHeight * ratio);
    document.body.append(this.canvas);
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    // Each character's baseline, from its face's own measure, so it lands where the card's text stands.
    for (const glyph of glyphs as (Glyph & { rectangle: DOMRect })[]) {
      context.font = glyph.font;
      const measured = context.measureText(glyph.character);
      const ascent = measured.fontBoundingBoxAscent;
      const descent = measured.fontBoundingBoxDescent;
      glyph.to.baseline = glyph.rectangle.top + (glyph.rectangle.height - (ascent + descent)) / 2 + ascent;
    }
    const started = performance.now();
    const total = FLIGHT_SECONDS + SPREAD_SECONDS;
    this.finish = done;
    const step = (now: number) => {
      const seconds = (now - started) / 1000;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      for (const glyph of glyphs) drawGlyph(context, glyph, Math.min(1, Math.max(0, (seconds - glyph.delay) / FLIGHT_SECONDS)), ratio);
      if (seconds < total) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      const finish = this.finish;
      this.finish = null;
      finish?.();
      // The card's text fades in under the landed letters, then the letters go.
      this.frame = window.setTimeout(() => this.cancel(), 280) as unknown as number;
    };
    this.frame = requestAnimationFrame(step);
  }

  cancel() {
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.frame);
    this.canvas?.remove();
    this.canvas = null;
    const finish = this.finish;
    this.finish = null;
    finish?.();
  }
}

function drawGlyph(context: CanvasRenderingContext2D, glyph: Glyph, share: number, ratio: number) {
  const eased = ease(share);
  const turned = share >= TURNS_AT;
  const character = turned ? glyph.character : glyph.landCharacter;
  // The land's letter is sized by its cap height; the card's by its font size.
  const startPixels = glyph.from.em;
  const sizeNow = startPixels + (glyph.fontPixels - startPixels) * eased;
  const x = glyph.from.x + (glyph.to.x - glyph.from.x) * eased;
  const baselineFrom = glyph.from.y + startPixels * 0.36;
  const y = baselineFrom + (glyph.to.baseline - baselineFrom) * eased - Math.sin(Math.PI * share) * ARC;
  const colour = glyph.from.colour.map((value, index) => Math.round(value + (glyph.to.colour[index] - value) * eased));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.font = turned ? glyph.font : LAND_FONT;
  const scale = sizeNow / (turned ? glyph.fontPixels : 48);
  context.fillStyle = `rgb(${colour[0]},${colour[1]},${colour[2]})`;
  context.translate(x - (turned ? 0 : (context.measureText(character).width * scale) / 2) * (1 - eased), y);
  context.scale(scale, scale);
  context.fillText(character, 0, 0);
}

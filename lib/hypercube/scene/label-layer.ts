/*
  Which labels show, and where. A few times a second every candidate is projected to the stage and placed in turn, by
  priority, each where it covers nothing already placed: not another word, the name, a control or the present's own
  light. In between, the shown words follow their points every frame. A word fades in as it arrives and goes at once
  when it leaves, so a leaving word never lies faint under one that stays. A phone shows at most PHONE_EVENT_LABELS
  event labels and PHONE_SKILL_WORDS skill words at rest, a computer more. In a lit state every lit event that fits
  shows, outside those caps.
*/
import type { Atlas, AtlasEntry } from "@/lib/about-cv/scene/word-atlas";
import type { Label, LabelKind } from "./labels";
import { WordQuads } from "./labels";

export type Rectangle = { left: number; top: number; right: number; bottom: number };

export const PHONE_EVENT_LABELS = 8;
export const PHONE_SKILL_WORDS = 3;
export const COMPUTER_EVENT_LABELS = 12;
export const COMPUTER_SKILL_WORDS = 4;
/** How often the words are placed again while the object moves, in milliseconds. */
const PLACE_EVERY = 100;
/** Room kept clear round each word, in pixels, and the gap between a bead and its label. */
const MARGIN = 4;
const GAP = 9;
/** How fast a word fades in or out, as a share of the way a second. */
const FADE_SPEED = 5;

/** What the placement needs to know of the scene now. */
export type PlacementView = {
  /** Where a label's point lands on the stage, and how far it is from the camera, or null when it cannot show. */
  locate(label: Label): { x: number; y: number; depth: number } | null;
  /** Whether a label may show at all now (reached by the unfold, not dimmed away), and whether it is lit. */
  standing(label: Label): { allowed: boolean; lit: boolean; inFocus: boolean };
  /** Places no word may cover: the name, the controls, the present's light. */
  blocked(): Rectangle[];
  stage(): { width: number; height: number };
  phone: boolean;
};

/** Where a label sits round its point: across (-1 left, 0 centred, 1 right), up (-1 above, 0 level, 1 below), and how far. */
type Side = { across: -1 | 0 | 1; up: -1 | 0 | 1; gap: number };

const side = (across: Side["across"], up: Side["up"], gap = GAP): Side => ({ across, up, gap });
const RIGHT = side(1, 0);
const LEFT = side(-1, 0);
const ABOVE = side(0, -1);
const BELOW = side(0, 1);
const CENTRE = side(0, 0, 0);
/** How much further out the second ring of places is, for a lit word that finds no room in the first. */
const FAR_GAP = 26;
/** A lit word tries the four sides, then the four corners, then all eight a little further out. */
const LIT_SIDES: Side[] = [
  RIGHT,
  LEFT,
  ABOVE,
  BELOW,
  side(1, -1),
  side(1, 1),
  side(-1, -1),
  side(-1, 1),
  ...([[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 1], [-1, -1], [-1, 1]] as const).map(([across, up]) => side(across, up, FAR_GAP)),
];

const overlaps = (first: Rectangle, second: Rectangle) =>
  first.left < second.right && second.left < first.right && first.top < second.bottom && second.top < first.bottom;

const padded = (rectangle: Rectangle): Rectangle => ({
  left: rectangle.left - MARGIN,
  right: rectangle.right + MARGIN,
  top: rectangle.top - MARGIN,
  bottom: rectangle.bottom + MARGIN,
});

/** The sides a label may sit on round its point, in the order tried. */
const SIDES: Record<LabelKind, Side[]> = {
  present: [RIGHT, LEFT, ABOVE, BELOW],
  event: [RIGHT, LEFT, ABOVE, BELOW],
  skill: [RIGHT, LEFT, ABOVE, BELOW],
  year: [RIGHT, LEFT],
  city: [CENTRE, BELOW, ABOVE],
};

/** The order kinds are placed in, after the present and what is lit. */
const KIND_ORDER: Record<LabelKind, number> = { present: 0, city: 3, year: 4, event: 5, skill: 6 };

export class LabelLayer {
  readonly quads: WordQuads;
  private readonly sides: Side[];
  private readonly targets: Float32Array;
  /** Where each word's letters stand now, for a tap or a check to find. */
  private readonly lettersNow: (Rectangle | null)[];
  private lastPlaced = -Infinity;
  /** The skills and cities drawn as words just now, with their rectangles, for a tap to find. */
  placedSkills: { rectangle: Rectangle; index: number }[] = [];
  placedCities: { rectangle: Rectangle; index: number }[] = [];
  /** The words shown, for the checks. */
  shown: string[] = [];

  constructor(
    readonly labels: Label[],
    atlas: Atlas,
    private readonly view: PlacementView,
  ) {
    this.quads = new WordQuads(labels, atlas);
    this.sides = labels.map((label) => SIDES[label.kind][0]);
    this.targets = new Float32Array(labels.length);
    this.lettersNow = labels.map(() => null);
  }

  /** The middle of a word's letters as drawn now, or null when it is not drawn. */
  centreOf(index: number) {
    const letters = this.lettersNow[index];
    if (!letters || this.quads.opacityOf(index) < 0.5) return null;
    return { x: (letters.left + letters.right) / 2, y: (letters.top + letters.bottom) / 2 };
  }

  /** Every word drawn now with the rectangle of its letters, for the checks that no word is cut at a screen edge. */
  shownRectangles() {
    return this.labels.flatMap((label, index) => {
      const letters = this.lettersNow[index];
      return letters && this.quads.opacityOf(index) > 0.01 ? [{ key: label.key, ...letters }] : [];
    });
  }

  /** Places again on the next frame, after a change of what is lit, isolated or in focus. */
  placeSoon() {
    this.lastPlaced = -Infinity;
  }

  /** The letters' size on the screen: the atlas quad holds padding round the letters. */
  private quadSize(label: Label) {
    const entry = this.quads.atlas.entries.get(label.key) as AtlasEntry;
    const height = label.size / entry.sizeShare;
    return { width: height * entry.aspect, height, entry };
  }

  /** The quad's top left corner for a side of the point, and the letters' rectangle. */
  private boxAt(label: Label, x: number, y: number, side: Side) {
    const { width, height, entry } = this.quadSize(label);
    const padAcross = width * entry.padAcross;
    const padUp = height * entry.padUp;
    const lettersWidth = width - 2 * padAcross;
    const lettersHeight = height - 2 * padUp;
    // A corner sits a little nearer its point than a side, along both axes.
    const reach = side.across !== 0 && side.up !== 0 ? side.gap * 0.7 : side.gap;
    const left =
      side.across === 1 ? x + reach : side.across === -1 ? x - reach - lettersWidth : x - lettersWidth / 2;
    const top = side.up === -1 ? y - reach - lettersHeight : side.up === 1 ? y + reach : y - lettersHeight / 2;
    return {
      quad: { left: left - padAcross, top: top - padUp, width, height },
      letters: { left, top, right: left + lettersWidth, bottom: top + lettersHeight },
    };
  }

  private onStage(rectangle: Rectangle) {
    const { width, height } = this.view.stage();
    return rectangle.left >= 2 && rectangle.top >= 2 && rectangle.right <= width - 2 && rectangle.bottom <= height - 2;
  }

  /** Every frame: places again when due, then moves each word to its point and fades it toward its target. */
  update(now: number, seconds: number, moving: boolean) {
    if (now - this.lastPlaced >= (moving ? PLACE_EVERY : PLACE_EVERY * 3)) {
      this.lastPlaced = now;
      this.place();
    }
    let changing = false;
    const step = Math.min(1, seconds * FADE_SPEED);
    this.labels.forEach((label, index) => {
      const target = this.targets[index];
      let opacity = this.quads.opacityOf(index);
      if (opacity === 0 && target === 0) return;
      if (opacity !== target) {
        // A word that leaves goes at once, so it never lies faint under a word that stays. A word that arrives fades in.
        opacity = target === 0 || Math.abs(target - opacity) < 0.02 ? target : opacity + (target - opacity) * step;
        this.quads.setOpacity(index, opacity);
        changing = true;
      }
      const located = this.view.locate(label);
      if (!located) return this.quads.setOpacity(index, 0);
      const { quad, letters } = this.boxAt(label, located.x, located.y, this.sides[index]);
      // A word carried past a screen edge between placings (a ride's camera moves fast) leaves at once, never cut.
      if (!this.onStage(letters)) {
        this.targets[index] = 0;
        return this.quads.setOpacity(index, 0);
      }
      this.lettersNow[index] = letters;
      this.quads.setBox(index, quad.left, quad.top, quad.width, quad.height);
    });
    this.quads.markChanged();
    return changing;
  }

  private place() {
    const { phone } = this.view;
    const eventCap = phone ? PHONE_EVENT_LABELS : COMPUTER_EVENT_LABELS;
    const skillCap = phone ? PHONE_SKILL_WORDS : COMPUTER_SKILL_WORDS;
    const candidates: { index: number; x: number; y: number; depth: number; rank: number; lit: boolean; inFocus: boolean }[] = [];
    this.labels.forEach((label, index) => {
      const standing = this.view.standing(label);
      if (!standing.allowed) return;
      const located = this.view.locate(label);
      if (!located) return;
      const kept = this.targets[index] > 0 ? 0 : 0.5;
      // At rest the present comes first and always shows. In a lit state the lit events come first.
      const rank =
        label.kind === "present" && !standing.inFocus
          ? 0
          : standing.lit
            ? label.kind === "skill"
              ? 0.9
              : 1
            : standing.inFocus
              ? 2
              : KIND_ORDER[label.kind];
      candidates.push({ index, ...located, rank: rank + kept * 0.1, lit: standing.lit, inFocus: standing.inFocus });
    });
    candidates.sort((first, second) => first.rank - second.rank || first.depth - second.depth);
    const taken: Rectangle[] = this.view.blocked().map(padded);
    const next = new Float32Array(this.labels.length);
    let events = 0;
    let skills = 0;
    this.placedSkills = [];
    this.placedCities = [];
    this.shown = [];
    for (const candidate of candidates) {
      const label = this.labels[candidate.index];
      const unlitEvent = label.kind === "event" && !candidate.lit && candidate.rank >= KIND_ORDER.event;
      const unlitSkill = label.kind === "skill" && !candidate.lit;
      if (unlitEvent && events >= eventCap) continue;
      if (unlitSkill && skills >= skillCap) continue;
      const choices = (candidate.lit || candidate.inFocus) && label.kind !== "city" ? LIT_SIDES : SIDES[label.kind];
      const sides = [this.sides[candidate.index], ...choices.filter((choice) => choice !== this.sides[candidate.index])];
      let chosen: { side: Side; letters: Rectangle } | null = null;
      for (const side of sides) {
        const { letters } = this.boxAt(label, candidate.x, candidate.y, side);
        if (!this.onStage(letters)) continue;
        // At rest the present always shows, placed first, so nothing else is ever drawn on it.
        const alwaysShows = label.kind === "present" && !candidate.inFocus;
        if (!alwaysShows && taken.some((other) => overlaps(padded(letters), other))) continue;
        chosen = { side, letters };
        break;
      }
      if (!chosen) continue;
      this.sides[candidate.index] = chosen.side;
      taken.push(padded(chosen.letters));
      next[candidate.index] = 1;
      this.shown.push(label.key);
      if (unlitEvent) events++;
      if (unlitSkill) skills++;
      if (label.kind === "skill") this.placedSkills.push({ rectangle: chosen.letters, index: candidate.index });
      if (label.kind === "city") this.placedCities.push({ rectangle: chosen.letters, index: candidate.index });
    }
    this.targets.set(next);
  }
}

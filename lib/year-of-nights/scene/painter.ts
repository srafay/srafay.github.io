/*
  Draws one frame of the sky on a 2D canvas. Each star is two small pictures drawn once at start-up and then stamped:
  a soft glow, added to the light already there, and a core on top. Stamping a picture is far cheaper than drawing a
  gradient for every star in every frame, which keeps a phone's frame short.

  The painter reads nothing from the page. Everything it needs comes in the frame it is given.
*/
import { project, type Camera, type Point, type Stage } from "./camera";
import { clamp } from "./motion";
import {
  activeRun,
  busiestIndex,
  careerLines,
  galaxyDays,
  monthNames,
  quietStretch,
  worldStars,
  type Colour,
  type StarKind,
} from "./world";

export type SkyColours = {
  ground: string;
  starlight: string;
  gold: string;
  dim: string;
};

export type Bloom = { dayIndex: number; startedAt: number; strength: number };

/** A star drawn at a place on the stage rather than in the world: the tools and the links, beside their words. */
export type TextStar = {
  x: number;
  y: number;
  coreRadius: number;
  alpha: number;
  colour: Colour;
};
export type TextLine = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  alpha: number;
};

export type SkyFrame = {
  camera: Camera;
  stage: Stage;
  seconds: number;
  /** Seconds since the intro began, or Infinity once it is over (or never played). */
  introSeconds: number;
  galaxyTurn: number;
  twinkles: boolean;
  /** Whether a star rushing past may leave a streak: never under reduced motion. */
  streaks: boolean;
  /** How much of the year scene's highlights to draw, by part: the busiest day, the quiet stretch, the active run. */
  yearHighlights: [number, number, number];
  /** Which city's lines are lit, as the career's step (0 to 2), and how much the career shows at all. */
  careerStep: number;
  careerLight: number;
  /** How much the repositories show: faint from afar, whole in their own scene. */
  codeLight: number;
  monthNameLight: number;
  /** Below 1, the world dims so the words in front of it read. */
  worldLight: number;
  selectedDay: number;
  bloom: Bloom | null;
  textStars: TextStar[];
  textLines: TextLine[];
};

/** Where each day was drawn in the last frame, on the stage, so a tap can find the star under it. */
export type DrawnDays = {
  x: Float32Array;
  y: Float32Array;
  radius: Float32Array;
  shown: Uint8Array;
};

const SPRITE_SIZE = 64;
const GLOW_REACH = 4.6;
const GOLD_GLOW_REACH = 7;
const SMALLEST_SCREEN_CORE = 0.7;
const LARGEST_SCREEN_CORE = 16;
const NEAR_FADE_DEPTH = 420;
const BLOOM_SECONDS = 1.1;
/** A star that moved further than this since the last frame leaves a streak, up to this long. */
const STREAK_FROM_PIXELS = 7;
const LONGEST_STREAK = 140;
const MOST_SECONDS_BETWEEN_STREAK_FRAMES = 0.12;
const RIPPLE_REACH = 110;

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? [...value].map((digit) => digit + digit).join("")
      : value;
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16));
}

export const withAlpha = (hex: string, alpha: number) =>
  `rgba(${hexToRgb(hex).join(",")},${alpha})`;

function spriteCanvas(
  paint: (context: CanvasRenderingContext2D, centre: number) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE_SIZE;
  const context = canvas.getContext("2d")!;
  paint(context, SPRITE_SIZE / 2);
  return canvas;
}

/** A glow that falls off quickly near the star and lingers faintly further out, as starlight does in a lens. */
function glowSprite(colour: string) {
  return spriteCanvas((context, centre) => {
    const gradient = context.createRadialGradient(
      centre,
      centre,
      0,
      centre,
      centre,
      centre,
    );
    gradient.addColorStop(0, withAlpha(colour, 1));
    gradient.addColorStop(0.1, withAlpha(colour, 0.55));
    gradient.addColorStop(0.3, withAlpha(colour, 0.16));
    gradient.addColorStop(0.62, withAlpha(colour, 0.04));
    gradient.addColorStop(1, withAlpha(colour, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  });
}

/** A disc with a soft rim, so a core of a pixel or two still looks round. */
function coreSprite(colour: string) {
  return spriteCanvas((context, centre) => {
    const gradient = context.createRadialGradient(
      centre,
      centre,
      0,
      centre,
      centre,
      centre,
    );
    gradient.addColorStop(0, withAlpha("#ffffff", 1));
    gradient.addColorStop(0.45, withAlpha(colour, 1));
    gradient.addColorStop(0.78, withAlpha(colour, 0.5));
    gradient.addColorStop(1, withAlpha(colour, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  });
}

type Sprites = Record<
  Colour,
  { glow: HTMLCanvasElement; core: HTMLCanvasElement }
>;

/** How a day star arrives in the intro: unseen until its moment, then a short flare that settles to its own size. */
export function introOf(dayIndex: number, introSeconds: number) {
  const ignitesAt = 0.15 + (1.3 * dayIndex) / (galaxyDays.length - 1);
  const progress = clamp((introSeconds - ignitesAt) / 0.5);
  return { light: progress, flare: 1 + 0.9 * Math.sin(Math.PI * progress) };
}

/** When a month's name appears in the intro: with the first day of its arm. */
export function monthNameIntroOf(firstDayIndex: number, introSeconds: number) {
  if (firstDayIndex < 0) return 1;
  return introOf(firstDayIndex, introSeconds).light;
}

export class Painter {
  private readonly context: CanvasRenderingContext2D;
  private sprites!: Sprites;
  private colours!: SkyColours;
  private pixelRatio = 1;
  readonly drawnDays: DrawnDays;
  /**
   * Where each star was drawn in the frame before, so a star the camera rushes past leaves a short streak: the way a
   * flight through the galaxy is felt rather than only seen.
   */
  private readonly previous = {
    x: new Float32Array(worldStars.length),
    y: new Float32Array(worldStars.length),
    shown: new Uint8Array(worldStars.length),
  };
  /** The stars of one frame, gathered before drawing so the glows and the cores each go down in one pass. */
  private readonly batch = {
    x: new Float32Array(worldStars.length),
    y: new Float32Array(worldStars.length),
    core: new Float32Array(worldStars.length),
    light: new Float32Array(worldStars.length),
    glowLight: new Float32Array(worldStars.length),
    isGold: new Uint8Array(worldStars.length),
    starIndex: new Uint32Array(worldStars.length),
  };
  private readonly monthFirstDays: number[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    monthFirstDays: number[],
  ) {
    this.context = canvas.getContext("2d", { alpha: false })!;
    const count = galaxyDays.length;
    this.drawnDays = {
      x: new Float32Array(count),
      y: new Float32Array(count),
      radius: new Float32Array(count),
      shown: new Uint8Array(count),
    };
    this.monthFirstDays = monthFirstDays;
  }

  setColours(colours: SkyColours) {
    this.colours = colours;
    this.sprites = {
      starlight: {
        glow: glowSprite(colours.starlight),
        core: coreSprite(colours.starlight),
      },
      gold: { glow: glowSprite(colours.gold), core: coreSprite(colours.gold) },
    };
  }

  resize(stage: Stage, pixelRatio: number) {
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.round(stage.width * pixelRatio);
    this.canvas.height = Math.round(stage.height * pixelRatio);
  }

  draw(frame: SkyFrame) {
    const { context } = this;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.fillStyle = this.colours.ground;
    context.fillRect(0, 0, frame.stage.width, frame.stage.height);
    this.drawCareerLines(frame);
    this.drawYearThread(frame);
    this.drawStars(frame);
    this.drawQuietRings(frame);
    this.drawBusiestRing(frame);
    this.drawMonthNames(frame);
    this.drawBloom(frame);
    this.drawTextStars(frame);
  }

  private projectWorld(
    point: Point,
    frame: SkyFrame,
    turnsWithGalaxy: boolean,
  ) {
    if (!turnsWithGalaxy) return project(point, frame.camera, frame.stage);
    const cosine = Math.cos(frame.galaxyTurn);
    const sine = Math.sin(frame.galaxyTurn);
    return project(
      {
        x: point.x * cosine - point.y * sine,
        y: point.x * sine + point.y * cosine,
        z: point.z,
      },
      frame.camera,
      frame.stage,
    );
  }

  /** Stars close to the camera fade before it passes them, so a flight through the galaxy never fills the screen. */
  private nearFade(depth: number) {
    return clamp((depth - 60) / NEAR_FADE_DEPTH);
  }

  private rippleOffset(frame: SkyFrame, x: number, y: number) {
    const { bloom } = frame;
    if (!bloom) return null;
    const age = frame.seconds - bloom.startedAt;
    if (age > BLOOM_SECONDS) return null;
    const centreX = this.drawnDays.x[bloom.dayIndex];
    const centreY = this.drawnDays.y[bloom.dayIndex];
    const awayX = x - centreX;
    const awayY = y - centreY;
    const distance = Math.hypot(awayX, awayY);
    if (distance < 0.5 || distance > RIPPLE_REACH) return null;
    const wave =
      Math.sin(age * 11 - distance * 0.09) *
      Math.exp(-age * 3.2) *
      Math.exp(-distance / 55);
    const push = 7 * bloom.strength * wave;
    return { x: (awayX / distance) * push, y: (awayY / distance) * push };
  }

  private drawStars(frame: SkyFrame) {
    const { context, drawnDays, batch } = this;
    let count = 0;
    for (const [starIndex, star] of worldStars.entries()) {
      const isDay = star.kind === "day";
      if (isDay) drawnDays.shown[star.dayIndex] = 0;
      const projected = this.projectWorld(star, frame, isDay);
      if (!projected) continue;
      let light =
        star.brightness * this.nearFade(projected.depth) * frame.worldLight;
      let flare = 1;
      if (frame.introSeconds < Infinity) {
        if (isDay) {
          const intro = introOf(star.dayIndex, frame.introSeconds);
          light *= intro.light;
          flare = intro.flare;
        } else light *= clamp((frame.introSeconds - 0.8) / 1.2);
      }
      if (!isDay) light *= farLight(star.kind, frame);
      if (light <= 0.01) continue;
      let { x, y } = projected;
      if (
        x < -80 ||
        y < -80 ||
        x > frame.stage.width + 80 ||
        y > frame.stage.height + 80
      )
        continue;
      let core = clamp(
        star.coreRadius * projected.scale * flare,
        SMALLEST_SCREEN_CORE,
        LARGEST_SCREEN_CORE,
      );
      if (isDay) {
        const ripple = this.rippleOffset(frame, x, y);
        if (ripple) {
          x += ripple.x;
          y += ripple.y;
        }
        if (frame.bloom?.dayIndex === star.dayIndex)
          core *=
            1 + 0.9 * Math.exp(-(frame.seconds - frame.bloom.startedAt) * 3.5);
        if (frame.selectedDay === star.dayIndex) core *= 1.5;
        drawnDays.x[star.dayIndex] = x;
        drawnDays.y[star.dayIndex] = y;
        drawnDays.radius[star.dayIndex] = core;
        drawnDays.shown[star.dayIndex] = 1;
      }
      const twinkle = frame.twinkles
        ? 1 +
          0.09 * Math.sin(frame.seconds * star.twinkleSpeed + star.twinklePhase)
        : 1;
      batch.x[count] = x;
      batch.y[count] = y;
      batch.core[count] = core;
      batch.light[count] = light;
      batch.glowLight[count] = Math.min(1, light * 0.75 * twinkle);
      batch.isGold[count] = star.colour === "gold" ? 1 : 0;
      batch.starIndex[count] = starIndex;
      count++;
    }
    this.drawStreaks(count, frame);
    context.globalCompositeOperation = "lighter";
    for (let index = 0; index < count; index++) {
      const isGold = batch.isGold[index] === 1;
      const reach = batch.core[index] * (isGold ? GOLD_GLOW_REACH : GLOW_REACH);
      context.globalAlpha = batch.glowLight[index];
      context.drawImage(
        this.sprites[isGold ? "gold" : "starlight"].glow,
        batch.x[index] - reach,
        batch.y[index] - reach,
        reach * 2,
        reach * 2,
      );
    }
    context.globalCompositeOperation = "source-over";
    for (let index = 0; index < count; index++) {
      const size = batch.core[index] * 1.35;
      context.globalAlpha = Math.min(1, batch.light[index] * 1.1);
      context.drawImage(
        this.sprites[batch.isGold[index] === 1 ? "gold" : "starlight"].core,
        batch.x[index] - size,
        batch.y[index] - size,
        size * 2,
        size * 2,
      );
    }
    context.globalAlpha = 1;
  }

  /** A line back toward where each fast-moving star was a frame ago, all in one stroke. */
  private drawStreaks(count: number, frame: SkyFrame) {
    const { context, batch, previous } = this;
    // A frame after a pause, or a cut under reduced motion, is not a flight: nothing streaks.
    const isFlight =
      frame.streaks &&
      frame.seconds - this.previousAt < MOST_SECONDS_BETWEEN_STREAK_FRAMES;
    this.previousAt = frame.seconds;
    context.beginPath();
    let streaks = 0;
    for (let index = 0; isFlight && index < count; index++) {
      const star = batch.starIndex[index];
      const x = batch.x[index];
      const y = batch.y[index];
      if (previous.shown[star]) {
        const awayX = previous.x[star] - x;
        const awayY = previous.y[star] - y;
        const length = Math.hypot(awayX, awayY);
        if (length > STREAK_FROM_PIXELS) {
          const reach = Math.min(length, LONGEST_STREAK) / length;
          context.moveTo(x, y);
          context.lineTo(x + awayX * reach, y + awayY * reach);
          streaks++;
        }
      }
    }
    previous.shown.fill(0);
    for (let index = 0; index < count; index++) {
      const star = batch.starIndex[index];
      previous.x[star] = batch.x[index];
      previous.y[star] = batch.y[index];
      previous.shown[star] = 1;
    }
    if (!streaks) return;
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.42;
    context.strokeStyle = this.colours.starlight;
    context.lineWidth = 1.4;
    context.lineCap = "round";
    context.stroke();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
  }

  /** Forgets where stars were drawn, after a resize, so no streak joins two different layouts. */
  forgetPreviousFrame() {
    this.previous.shown.fill(0);
  }

  private previousAt = -Infinity;

  private strokePath(
    points: { x: number; y: number }[],
    colour: string,
    alpha: number,
    width: number,
  ) {
    if (points.length < 2 || alpha <= 0.01) return;
    const { context } = this;
    context.globalAlpha = alpha;
    context.strokeStyle = colour;
    context.lineWidth = width;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.stroke();
    context.globalAlpha = 1;
  }

  private drawCareerLines(frame: SkyFrame) {
    for (const line of careerLines) {
      const from = this.projectWorld(line.from, frame, false);
      const to = this.projectWorld(line.to, frame, false);
      if (!from || !to) continue;
      const lit = clamp(1 - Math.abs(frame.careerStep - line.stopIndex) * 1.4);
      const reached = frame.careerStep >= line.stopIndex - 0.5 ? 1 : 0.4;
      // The lines are drawn only as the career arrives: from afar the constellation is its stars alone.
      const alpha =
        (0.16 + 0.42 * lit) *
        reached *
        this.nearFade(Math.min(from.depth, to.depth)) *
        frame.worldLight *
        frame.careerLight;
      this.strokePath([from, to], this.colours.starlight, alpha, 1);
    }
  }

  /** The active run: a thread through its days in order, across the arms they fall on. */
  private drawYearThread(frame: SkyFrame) {
    const weight = frame.yearHighlights[2];
    if (weight <= 0.01) return;
    const points: { x: number; y: number }[] = [];
    for (
      let index = activeRun.firstIndex;
      index <= activeRun.lastIndex;
      index++
    ) {
      const day = galaxyDays[index];
      const projected = this.projectWorld(
        { x: day.x, y: day.y, z: 0 },
        frame,
        true,
      );
      if (projected) points.push(projected);
    }
    this.strokePath(points, this.colours.starlight, 0.5 * weight, 1.2);
  }

  /** The quiet stretch: a small ring round each of its empty days, so the gap reads as days, not as nothing. */
  private drawQuietRings(frame: SkyFrame) {
    const weight = frame.yearHighlights[1];
    if (weight <= 0.01) return;
    const { context } = this;
    context.strokeStyle = this.colours.starlight;
    context.lineWidth = 1;
    context.globalAlpha = 0.55 * weight;
    context.beginPath();
    for (
      let index = quietStretch.firstIndex;
      index <= quietStretch.lastIndex;
      index++
    ) {
      const day = galaxyDays[index];
      const projected = this.projectWorld(
        { x: day.x, y: day.y, z: 0 },
        frame,
        true,
      );
      if (!projected) continue;
      const radius = Math.max(4, 9 * projected.scale);
      context.moveTo(projected.x + radius, projected.y);
      context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    }
    context.stroke();
    context.globalAlpha = 1;
  }

  private drawBusiestRing(frame: SkyFrame) {
    const weight = frame.yearHighlights[0];
    if (weight <= 0.01 || !this.drawnDays.shown[busiestIndex]) return;
    const { context } = this;
    context.strokeStyle = this.colours.gold;
    context.lineWidth = 1.2;
    context.globalAlpha = 0.8 * weight;
    context.beginPath();
    const radius = this.drawnDays.radius[busiestIndex] + 12;
    context.arc(
      this.drawnDays.x[busiestIndex],
      this.drawnDays.y[busiestIndex],
      radius,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.globalAlpha = 1;
  }

  private drawMonthNames(frame: SkyFrame) {
    if (frame.monthNameLight <= 0.01) return;
    const { context } = this;
    context.font = "500 13px Figtree, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = this.colours.dim;
    monthNames.forEach((month, index) => {
      const projected = this.projectWorld(month.point, frame, true);
      if (!projected) return;
      const intro =
        frame.introSeconds < Infinity
          ? monthNameIntroOf(this.monthFirstDays[index], frame.introSeconds)
          : 1;
      context.globalAlpha =
        frame.monthNameLight * intro * this.nearFade(projected.depth);
      context.fillText(month.name, projected.x, projected.y);
    });
    context.globalAlpha = 1;
  }

  private drawBloom(frame: SkyFrame) {
    const { bloom } = frame;
    if (!bloom || !this.drawnDays.shown[bloom.dayIndex]) return;
    const age = frame.seconds - bloom.startedAt;
    if (age > BLOOM_SECONDS) return;
    const progress = age / BLOOM_SECONDS;
    const { context } = this;
    const x = this.drawnDays.x[bloom.dayIndex];
    const y = this.drawnDays.y[bloom.dayIndex];
    const colour =
      bloom.dayIndex === busiestIndex
        ? this.colours.gold
        : this.colours.starlight;
    context.strokeStyle = colour;
    for (const [delay, reach] of [
      [0, 54],
      [0.18, 34],
    ]) {
      const ringProgress = clamp((progress - delay) / (1 - delay));
      if (ringProgress <= 0) continue;
      context.globalAlpha = 0.85 * (1 - ringProgress) * bloom.strength;
      context.lineWidth = 1.5 * (1 - ringProgress) + 0.4;
      context.beginPath();
      context.arc(
        x,
        y,
        4 + reach * (1 - (1 - ringProgress) ** 3),
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  private drawTextStars(frame: SkyFrame) {
    for (const line of frame.textLines)
      this.strokePath(
        [line.from, line.to],
        this.colours.starlight,
        line.alpha,
        1,
      );
    const { context } = this;
    context.globalCompositeOperation = "lighter";
    for (const star of frame.textStars) {
      if (star.alpha <= 0.01) continue;
      const sprites = this.sprites[star.colour];
      const twinkle = frame.twinkles
        ? 1 + 0.08 * Math.sin(frame.seconds * 1.3 + star.x * 0.05)
        : 1;
      const reach = star.coreRadius * GLOW_REACH;
      context.globalAlpha = Math.min(1, star.alpha * 0.8 * twinkle);
      context.drawImage(
        sprites.glow,
        star.x - reach,
        star.y - reach,
        reach * 2,
        reach * 2,
      );
    }
    context.globalCompositeOperation = "source-over";
    for (const star of frame.textStars) {
      if (star.alpha <= 0.01) continue;
      const size = star.coreRadius * 1.35;
      context.globalAlpha = star.alpha;
      context.drawImage(
        this.sprites[star.colour].core,
        star.x - size,
        star.y - size,
        size * 2,
        size * 2,
      );
    }
    context.globalAlpha = 1;
  }
}

/** The career's and the code's stars are faint from far away. Each scene lifts its own to full light as it comes. */
function farLight(kind: StarKind, frame: SkyFrame) {
  const lift = kind === "repository" ? frame.codeLight : frame.careerLight;
  return 0.55 + 0.45 * lift;
}

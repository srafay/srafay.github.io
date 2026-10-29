/*
  The agent writes the tour's lines with its route cone, lent out as a pen. While a line types, the cone leaves its
  link (which stays drawn, to an empty socket, so the graph shows a tool out at work) and writes: its tip on the caret,
  just after the newest word on the line's baseline, its body running down and to the right under the line, as a pen
  held from below. It steps along word by word, moves to the next line at once, and flies home when the line is done.
  Nothing of it rises above its tip, so it never covers a word already written, and no cord runs to it. It is its own small canvas, drawn once
  per colour in the cone's dithered look at the agent's cell size, never rotated or scaled, so its cells stay whole.
  It takes no presses. The caret is measured when a word appears, never per frame. Under reduced motion it stays home.
*/
import { Follower } from "@/lib/about-cv/scene/follower";
import { ditherCellInDevicePixels } from "@/lib/guide/agent/dither";

export type PenOptions = {
  layer: HTMLElement;
  reducedMotion: boolean;
  /** Where the cone is on the screen (y down), as last drawn. */
  conePoint(): { x: number; y: number } | null;
  /** The cone goes out to write (true) or is home again (false). */
  lendCone(lent: boolean): void;
  /** Where on the screen a line can be written: between the chrome along the top and the strip along the bottom. */
  writingArea(): { top: number; bottom: number };
  /** The nib's colours on a line: its ink and its shadow, each clear of the line's paper. */
  coloursOn(line: HTMLElement): { ink: string; shade: string };
};

/**
 * The nib: the cone, about one and a half text lines tall, its tip on the caret and its body running down and to the
 * right, under the line being written, as a pen held from below. Nothing of it rises above the tip, so it never lies
 * over a written word. Sizes in CSS pixels.
 */
const CONE_LENGTH = 44;
const CONE_RADIUS = 11;
const CONE_SLANT = (35 * Math.PI) / 180;
/** The cone's axis and the way across it (toward its shadowed underside). */
const ALONG = { x: Math.cos(CONE_SLANT), y: Math.sin(CONE_SLANT) };
const ACROSS = { x: -Math.sin(CONE_SLANT), y: Math.cos(CONE_SLANT) };
/** The nib's canvas, and where the tip is in it, from its top left. */
const NIB_WIDTH = 52;
const NIB_HEIGHT = 40;
const TIP = { x: 2, y: 2 };
/** How far after the newest word the tip sits, and how far over the line's bottom edge the baseline is. */
const AFTER_THE_WORD = 2;
const BASELINE_SHARE = 0.24;
/** The longest the nib flies from the router to a line before it is on the line, in milliseconds. */
const FLIGHT_MILLISECONDS = 400;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * How light the nib is at a point of its canvas, or -1 outside it: lit from above, so its upper side is light and its
 * underside dark, its round base a mid tone, and a one-cell edge of shadow so its outline is clear.
 */
function toneAt(x: number, y: number, edge: number) {
  const along = (x - TIP.x) * ALONG.x + (y - TIP.y) * ALONG.y;
  const across = (x - TIP.x) * ACROSS.x + (y - TIP.y) * ACROSS.y;
  const capDepth = CONE_RADIUS * 0.35;
  const inCap = along > CONE_LENGTH && (along - CONE_LENGTH) ** 2 / capDepth ** 2 + across ** 2 / CONE_RADIUS ** 2 <= 1;
  if (inCap) return 0.42;
  if (along < 0 || along > CONE_LENGTH) return -1;
  const halfWidth = (along / CONE_LENGTH) * CONE_RADIUS;
  if (Math.abs(across) > halfWidth) return -1;
  if (halfWidth - Math.abs(across) < edge && along > edge * 2) return 0;
  return Math.min(1, Math.max(0, 0.55 - 0.5 * (across / Math.max(halfWidth, 0.001))));
}

export class Pen {
  readonly canvas: HTMLCanvasElement;
  private readonly x = new Follower(0, 160);
  private readonly y = new Follower(0, 160);
  /** Where the tip is going, in the document (so it keeps up with a scroll), or null to go home to the cone. */
  private target: { x: number; documentY: number } | null = null;
  private out = false;
  /** Whether the nib has reached the line it writes: after its flight from the router, at most 0.4 s. */
  private onTheLine = false;
  private flightStarted = 0;
  private frameAsked = false;
  private lastFrame = 0;
  private drawnFor = "";
  private cell = 1;
  private devicePixelRatio = 1;

  constructor(private readonly options: PenOptions) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "guide-nib";
    this.canvas.dataset.guideAgent = "";
    this.canvas.setAttribute("aria-hidden", "true");
    // Where the tip is in the canvas, for the checks that hold it to the caret.
    this.canvas.dataset.tipX = String(TIP.x);
    this.canvas.dataset.tipY = String(TIP.y);
    options.layer.append(this.canvas);
  }

  /** Whether the pen is out writing (or on its way back). */
  get writing() {
    return this.out;
  }

  /** A line begins: the cone goes to it, to the start of its first word. */
  write(line: HTMLElement) {
    if (this.options.reducedMotion) return;
    this.onTheLine = false;
    this.flightStarted = performance.now();
    this.drawFor(line);
    if (!this.out) {
      const from = this.options.conePoint() ?? { x: 0, y: window.innerHeight };
      this.x.jump(from.x);
      this.y.jump(from.y);
      this.out = true;
      this.canvas.dataset.out = "";
      this.options.lendCone(true);
    }
    const first = line.querySelector<HTMLElement>(".guide-word");
    if (first) this.aimAfter(first, true);
    this.ask();
  }

  /** A word appears: the nib steps on, just after it, in the same moment, so it is never seen behind the word. */
  toWord(span: HTMLElement) {
    if (!this.out || this.options.reducedMotion) return;
    this.aimAfter(span, false);
    const onScreen = this.targetInView();
    if (this.onTheLine && this.target && onScreen) {
      this.x.jump(this.target.x);
      this.y.jump(this.target.documentY - window.scrollY);
      this.place();
    }
    this.ask();
  }

  /** The line is done: the cone flies home. */
  lift() {
    if (!this.out) return;
    this.target = null;
    this.onTheLine = false;
    this.ask();
  }

  /** Whether the line being written is where the nib can be seen: below the chrome along the top, above the strip. */
  private targetInView() {
    if (!this.target) return false;
    const y = this.target.documentY - window.scrollY;
    const area = this.options.writingArea();
    return y > area.top && y < area.bottom;
  }

  private aimAfter(span: HTMLElement, beforeIt: boolean) {
    const box = span.getBoundingClientRect();
    this.target = {
      x: (beforeIt ? box.left : box.right) + AFTER_THE_WORD,
      documentY: box.bottom - box.height * BASELINE_SHARE + window.scrollY,
    };
  }

  private ask() {
    if (this.frameAsked) return;
    this.frameAsked = true;
    requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number) {
    this.frameAsked = false;
    const seconds = Math.min(0.05, this.lastFrame ? (now - this.lastFrame) / 1000 : 1 / 60);
    this.lastFrame = now;
    const home = this.options.conePoint();
    // A line scrolled off the screen is not followed there: the cone waits at home until it is back in view.
    const onScreen = this.targetInView();
    const goal = this.target && onScreen ? { x: this.target.x, y: this.target.documentY - window.scrollY } : home;
    if (!goal) return this.putAway();
    this.x.step(goal.x, seconds);
    this.y.step(goal.y, seconds);
    // On the line, the nib steps word by word and is never left behind over a word already written; at the end of a
    // line it lifts and is at the next one at once, never dragged across the words between.
    if (this.target && onScreen && this.onTheLine) {
      if (Math.abs(this.y.value - goal.y) >= 4) {
        this.x.jump(goal.x);
        this.y.jump(goal.y);
      } else if (this.x.value < goal.x) this.x.jump(goal.x);
    }
    if (this.target && (Math.hypot(this.x.value - goal.x, this.y.value - goal.y) < 2 || now - this.flightStarted > FLIGHT_MILLISECONDS)) this.onTheLine = true;
    if (!this.target && Math.hypot(this.x.value - goal.x, this.y.value - goal.y) < 3) return this.putAway();
    if (this.target && !onScreen) this.onTheLine = false;
    this.place();
    this.ask();
  }

  /** The nib at its tip's place, on whole device pixels so its cells stay crisp. */
  private place() {
    const ratio = this.devicePixelRatio;
    const left = Math.round((this.x.value - TIP.x) * ratio) / ratio;
    const top = Math.round((this.y.value - TIP.y) * ratio) / ratio;
    this.canvas.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }

  private putAway() {
    this.out = false;
    this.lastFrame = 0;
    delete this.canvas.dataset.out;
    this.options.lendCone(false);
  }

  /** Draws the nib in the colours for this line's paper, once per colour pair and cell size. */
  private drawFor(line: HTMLElement) {
    const { ink, shade } = this.options.coloursOn(line);
    const ratio = window.devicePixelRatio || 1;
    const cell = ditherCellInDevicePixels(ratio);
    const key = `${ink} ${shade} ${cell} ${ratio}`;
    if (key === this.drawnFor) return;
    this.drawnFor = key;
    this.cell = cell;
    this.devicePixelRatio = ratio;
    const cellsAcross = Math.ceil((NIB_WIDTH * ratio) / cell);
    const cellsDown = Math.ceil((NIB_HEIGHT * ratio) / cell);
    this.canvas.width = cellsAcross * cell;
    this.canvas.height = cellsDown * cell;
    this.canvas.style.width = `${this.canvas.width / ratio}px`;
    this.canvas.style.height = `${this.canvas.height / ratio}px`;
    const context = this.canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let down = 0; down < cellsDown; down++)
      for (let across = 0; across < cellsAcross; across++) {
        const tone = toneAt(((across + 0.5) * this.cell) / ratio, ((down + 0.5) * this.cell) / ratio, this.cell / ratio);
        if (tone < 0) continue;
        const threshold = (BAYER[(down % 4) * 4 + (across % 4)] + 0.5) / 16;
        context.fillStyle = tone > threshold ? ink : shade;
        context.fillRect(across * this.cell, down * this.cell, this.cell, this.cell);
      }
  }
}

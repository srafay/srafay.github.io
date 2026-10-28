/*
  The idle joke. Leave the page alone for 40 seconds, or switch to another tab, and the CV's own letters leave their
  places on the land and gather, in front of the camera, into three huge letters: A, F and K, a gamer's "away from
  keyboard", drawn in the words of the life the way a sign is drawn in characters. The tab's title says "You went
  AFK" while it lasts. Any input sends every letter home in about a second, and the title back. Reading is not idle:
  the joke never starts while a card, the sheet, Find me or a search is open, or while a finger or button is down. On a
  tab switch the frames pause, so the reader comes back to the sign already formed. With reduced motion it changes at
  once.
*/
import { DOT } from "@/lib/letters/land/land";
import { PAGE_TITLE } from "@/lib/letters/names";
import type { LettersScene } from "./letters-scene";
import type { Vector } from "./matrix";

/** How long the page must be left alone before the joke, in milliseconds. */
const IDLE_MILLISECONDS = 40_000;
/** How long the letters take to gather, and to go home, in seconds. */
const GATHER_SECONDS = 2.6;
const HOME_SECONDS = 1;
export const AWAY_TITLE = "You went AFK";
const AWAY_WORD = "AFK";
/** The sign's grid, in cells across and up. */
const SIGN_COLUMNS = 46;
const SIGN_ROWS = 17;
/** How much of the screen's width the sign takes. */
const SIGN_SHARE_NARROW = 0.86;
const SIGN_SHARE_WIDE = 0.46;
/** The longest a letter waits after the first to start its flight to the sign, as a share of the gathering. */
const LONGEST_DELAY = 0.4;

/** The cells of the word AFK on a small grid, drawn by the browser in the site's own face and read back. */
function signCells() {
  const canvas = document.createElement("canvas");
  const scale = 8;
  canvas.width = SIGN_COLUMNS * scale;
  canvas.height = SIGN_ROWS * scale;
  const context = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 ${Math.round(canvas.height * 1.15)}px Figtree`;
  const width = context.measureText(AWAY_WORD).width;
  const fit = Math.min(1, (canvas.width * 0.96) / width);
  context.font = `800 ${Math.round(canvas.height * 1.15 * fit)}px Figtree`;
  context.fillText(AWAY_WORD, canvas.width / 2, canvas.height / 2 + canvas.height * 0.04);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const cells: [number, number][] = [];
  for (let row = 0; row < SIGN_ROWS; row++)
    for (let column = 0; column < SIGN_COLUMNS; column++) {
      const x = Math.floor((column + 0.5) * scale);
      const y = Math.floor((row + 0.5) * scale);
      if (pixels[(y * canvas.width + x) * 4 + 3] > 128) cells.push([column, row]);
    }
  return cells;
}

/** A small steady shuffle, so the same letters make the sign on every visit. */
function shuffled<Item>(items: Item[]) {
  const copy = [...items];
  let seed = 7;
  for (let index = copy.length - 1; index > 0; index--) {
    seed = (seed * 16807) % 2147483647;
    const other = seed % (index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export class Idle {
  private timer = 0;
  private target = 0;
  private cells: [number, number][] | null = null;
  active = false;
  /** Whether the joke may start now: false while the reader is reading something or holding the land. */
  mayStart: () => boolean = () => true;

  constructor(private readonly scene: LettersScene) {
    const wake = () => this.wake();
    for (const type of ["pointerdown", "wheel", "keydown", "touchstart"]) document.addEventListener(type, wake, { capture: true, passive: true });
    document.addEventListener("pointermove", (event) => event.pointerType === "mouse" && this.wake(), { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.start(true);
    });
    scene.onFrame((seconds) => this.step(seconds));
    this.wait();
  }

  private wait() {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.start(false), IDLE_MILLISECONDS);
  }

  /** Any input: the letters go home at once, and the wait begins again. */
  wake() {
    if (this.active) {
      this.active = false;
      this.target = 0;
      document.title = PAGE_TITLE;
      this.scene.requestFrame();
    }
    this.wait();
  }

  /** Starts the joke, formed at once when the page is hidden (no frame is drawn until the reader is back). */
  start(hidden: boolean) {
    if (this.active || !this.mayStart()) return this.wait();
    if (!this.scene.isAtlasReady()) return this.wait();
    this.placeSign();
    this.active = true;
    this.target = 1;
    document.title = AWAY_TITLE;
    if (hidden || this.scene.reducedMotion) this.scene.landLayer.away = 1;
    this.scene.requestFrame();
  }

  /** Chooses the letters that make the sign and where each goes: a plane facing the camera, over the point in focus. */
  private placeSign() {
    const { scene } = this;
    const { land } = scene.data;
    const { view } = scene;
    this.cells ??= signCells();
    const { width, height } = view.size();
    const depth = Math.hypot(view.target[0] - view.eye[0], view.target[1] - view.eye[1], view.target[2] - view.eye[2]);
    const share = width / height < 0.9 ? SIGN_SHARE_NARROW : SIGN_SHARE_WIDE;
    const signWidth = (width * share * depth) / view.focalPixels;
    const cell = signWidth / SIGN_COLUMNS;
    const centre: Vector = [
      view.target[0] + view.up[0] * cell * 4,
      view.target[1] + view.up[1] * cell * 4,
      view.target[2] + view.up[2] * cell * 4,
    ];
    // The CV's own words make the sign: letters of the events, the ones on screen first.
    const onScreen: number[] = [];
    const offScreen: number[] = [];
    const { instances } = land;
    for (let index = 0; index < instances.count; index++) {
      if (instances.code[index] === DOT || land.ownerIsCity(land.owners[instances.cell[index]])) continue;
      const spot = scene.instanceOnScreen(index);
      if (spot && spot.x > 0 && spot.x < width && spot.y > 0 && spot.y < height) onScreen.push(index);
      else offScreen.push(index);
    }
    const letters = [...shuffled(onScreen), ...shuffled(offScreen)];
    const away = new Float32Array(instances.count * 4);
    this.cells.forEach(([column, row], order) => {
      const index = letters[order];
      if (index === undefined) return;
      const across = (column - SIGN_COLUMNS / 2 + 0.5) * cell;
      const up = (SIGN_ROWS / 2 - row - 0.5) * cell * 1.25;
      away.set(
        [
          centre[0] + view.right[0] * across + view.up[0] * up,
          centre[1] + view.right[1] * across + view.up[1] * up,
          centre[2] + view.right[2] * across + view.up[2] * up,
          1 + (order % 97) / 97 * LONGEST_DELAY,
        ],
        index * 4,
      );
    });
    scene.landLayer.setAway(away);
    scene.landLayer.awayCell = cell;
  }

  private step(seconds: number) {
    const layer = this.scene.landLayer;
    if (layer.away === this.target) return false;
    if (this.scene.reducedMotion) layer.away = this.target;
    else if (this.target > layer.away) layer.away = Math.min(this.target, layer.away + seconds / GATHER_SECONDS);
    else layer.away = Math.max(this.target, layer.away - seconds / HOME_SECONDS);
    return true;
  }
}

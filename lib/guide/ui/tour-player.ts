/*
  The tour plays by itself, on every load, after the first words. It drives the narration in order: for each line it
  brings the page on so the line sits in the reading band, waits for the section's name to be carried in, has the pen
  write the line, waits for its card to be fetched, rests, and goes on. While it plays the bars step away and one small
  control stays: Pause (Play while paused), Skip and Sound. Pause and Sound fade 2.5 s after the last touch and come
  back on any touch, pointer move or key; Skip stays until the end.

  The reader's own scroll moves the tour. A scroll is the reader's when a touch is down, a wheel, touch or scrolling key
  came in the last 100 ms, or the page is not where the tour last put it. The tour's own scroll stops at once, and its
  clock holds until the page has been still for 300 ms with no touch down, sampled every frame (never scrollend, which
  WebKit does not give reliably after a glide). Then it plays on from the newest unsaid line in view.

  Only these pause it: Pause, a card opened, a tray, a panel or the sheet; while paused the bars come back. Its clock
  stops while the page is hidden. At the end, and on Skip, the bars come back over half a second. Under reduced motion
  nothing plays by itself: a Play the tour button starts it, and it moves by jumps, a section at a time.
*/
import { glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { guideGlyphs } from "@/lib/guide/icons";
import type { Carries } from "./carries";
import type { Fetches } from "./fetches";
import type { Narrator } from "./narrator";
import { FETCH_SECONDS } from "./fetches";
import { narrationWordMilliseconds } from "./typing";

export type TourState = "waiting" | "playing" | "paused" | "ended" | "off";

export type TourPlayerOptions = {
  root: HTMLElement;
  reducedMotion: boolean;
  narrator: Narrator;
  carries: Carries;
  fetches: Fetches;
  /** The card a line presents, if any, and whether its exchange holds an extra (mockups, skills, links). */
  cardOf(line: HTMLElement): HTMLElement | null;
  hasExtra(line: HTMLElement): boolean;
  /** Where the reading band starts, under the chrome along the top. */
  bandTop(): number;
  /** The bars came or went: what is measured against them is measured again. */
  onChromeChanged(): void;
  /** The tour moved the page itself. */
  onTourScrolled(): void;
  sound: { available: boolean; isOn(): boolean; toggle(): boolean };
};

/** How long the page rests after a line, and after a line with a card (the card's flight and a beat), in seconds. */
const REST_AFTER_LINE = 0.4;
const REST_AFTER_CARD = FETCH_SECONDS + 0.15;
/** How long an extra (the mockups, the skills, the links) is left on screen, in seconds. */
const REST_FOR_AN_EXTRA = 2.5;
/** How long the page must be still, with no touch down, before the tour plays on after the reader's scroll. */
const STILL_FOR = 0.3;
/** How long a wheel, touch or key counts as the reader's, in seconds. */
const READER_INPUT_WINDOW = 0.1;
/** How long Pause and Sound stay after the last touch, pointer move or key, in seconds. */
const CONTROL_STAYS_FOR = 2.5;
/** Where a line is brought to on the screen: its top a little above the middle. */
const READING_LINE = 0.42;
/** The lowest a line may sit and still be read without moving the page. */
const READING_FOOT = 0.72;
/** How long a name may wait to be carried before it is simply set in place, in seconds. */
const NAME_WAITS_AT_MOST = 4;

const SCROLLING_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

type Phase =
  | { name: "next" }
  | { name: "name"; line: HTMLElement; since: number }
  | { name: "line"; line: HTMLElement }
  | { name: "writing"; line: HTMLElement }
  | { name: "rest"; line: HTMLElement; until: number };

const easeInOut = (share: number) => (share < 0.5 ? 4 * share ** 3 : 1 - (-2 * share + 2) ** 3 / 2);

export class TourPlayer {
  state: TourState;
  readonly element: HTMLElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly skipButton: HTMLButtonElement;
  private readonly soundButton: HTMLButtonElement | null;
  private phase: Phase = { name: "next" };
  private pausedFor: "button" | "open" | null = null;
  /** The tour's own clock, in seconds: it runs only while playing, shown, and not following the reader. */
  private clock = 0;
  private lastFrame = 0;
  private frameAsked = false;
  private hidden = false;
  /** The tour's scroll under way, and where it last put the page. */
  private scroll: { from: number; to: number; started: number; seconds: number } | null = null;
  private lastSetY = -1;
  /** The reader's hand: a touch down, the last wheel, touch or key, and the page's last move while they scroll. */
  private touchDown = false;
  private readerInputAt = -10;
  private followingReader = false;
  private lastSampleY = 0;
  private stillSince = 0;
  private lastActivity = 0;
  private revealAsked = false;
  /** Under reduced motion, the tour moves by jumps. */
  private readonly jumps: boolean;

  constructor(private readonly options: TourPlayerOptions) {
    this.jumps = options.reducedMotion;
    this.state = options.reducedMotion ? "off" : "waiting";
    this.element = element("div", "guide-player");
    this.element.setAttribute("role", "group");
    this.element.setAttribute("aria-label", "The tour");
    this.pauseButton = this.button("Pause", guideGlyphs.pause, () => (this.state === "paused" ? this.resume() : this.pause("button")));
    this.pauseButton.classList.add("guide-player-fades");
    this.skipButton = this.button("Skip", guideGlyphs.skip, () => this.skip());
    this.skipButton.setAttribute("aria-label", "Skip to the end");
    this.soundButton = options.sound.available ? this.button("Sound", options.sound.isOn() ? guideGlyphs.soundOn : guideGlyphs.soundOff, () => this.toggleSound()) : null;
    this.soundButton?.classList.add("guide-player-fades");
    this.soundButton?.setAttribute("aria-pressed", String(options.sound.isOn()));
    this.element.append(this.pauseButton, ...(this.soundButton ? [this.soundButton] : []), this.skipButton);
    options.root.append(this.element);
    this.listen();
    this.show();
  }

  private button(label: string, glyph: Parameters<typeof glyphElement>[0], onPress: () => void) {
    const button = element("button", "guide-player-button");
    button.type = "button";
    button.append(glyphElement(glyph, "guide-icon"), element("span", undefined, label));
    button.addEventListener("click", onPress);
    return button;
  }

  private label(button: HTMLButtonElement, label: string, glyph: Parameters<typeof glyphElement>[0]) {
    button.replaceChildren(glyphElement(glyph, "guide-icon"), element("span", undefined, label));
  }

  /** Whether the control's buttons are all showing (not faded). */
  get controlShown() {
    return (this.state === "playing" || this.state === "paused") && !("faded" in this.element.dataset);
  }

  /** Whether the page is moving because the tour moved it. */
  get scrolling() {
    return this.scroll !== null;
  }

  /** The first words are said: the tour plays by itself (not under reduced motion, where Play starts it). */
  begin() {
    if (this.state !== "waiting") return;
    this.play();
  }

  /** Starts the tour: from Play the tour under reduced motion, or by itself. */
  play() {
    if (this.state === "playing" || this.state === "ended") return;
    this.state = "playing";
    this.options.narrator.drive(true);
    this.lastActivity = performance.now();
    this.followTheReaderFromHere();
    this.show();
    this.ask();
  }

  /** Whether Skip is offered: from the first second of the page, until the tour is over. */
  get skipShown() {
    return this.state === "waiting" || this.state === "playing" || this.state === "paused";
  }

  pause(reason: "button" | "open") {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.pausedFor = reason;
    this.scroll = null;
    this.options.narrator.holdTyping();
    this.show();
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.pausedFor = null;
    this.lastActivity = performance.now();
    this.options.narrator.carryOnTyping();
    // The reader may have read on while it was paused: it plays on from the newest unsaid line in view.
    this.followTheReaderFromHere();
    this.show();
    this.ask();
  }

  /** Paused, the reader can read on: every line, name and card that comes into view is there whole at once. */
  private showWhatComesIntoView() {
    const narrator = this.options.narrator;
    const height = window.innerHeight;
    for (const line of narrator.lines) {
      if (narrator.isSaid(line) || line === narrator.typingLine) continue;
      const box = line.getBoundingClientRect();
      if (box.bottom < 0 || box.top > height) continue;
      const section = line.closest<HTMLElement>("[data-section]");
      if (section && this.options.carries.isWaiting(section)) this.options.carries.setInPlace(section);
      narrator.finish(line);
    }
  }

  /**
   * Ends the tour where it is, every line left as it stands, the page given back to the reader: for the checks of the
   * page without the tour.
   */
  leave() {
    if (this.state === "ended") return;
    this.end();
  }

  /** Every name, line and card in place now; the page stays where the reader is. */
  skip() {
    if (this.state === "ended") return;
    this.options.carries.setAllInPlace();
    this.options.narrator.finishAll();
    this.options.fetches.landAll();
    this.end();
  }

  private end() {
    this.state = "ended";
    this.scroll = null;
    this.options.narrator.drive(false);
    this.show();
  }

  private toggleSound() {
    const on = this.options.sound.toggle();
    if (!this.soundButton) return;
    this.soundButton.setAttribute("aria-pressed", String(on));
    this.label(this.soundButton, "Sound", on ? guideGlyphs.soundOn : guideGlyphs.soundOff);
  }

  /** The page's state for the styles: the bars away while it plays, back when paused or over. */
  private show() {
    const root = this.options.root;
    if (root.dataset.tour !== this.state) {
      root.dataset.tour = this.state;
      this.options.onChromeChanged();
    }
    const paused = this.state === "paused";
    this.label(this.pauseButton, paused ? "Play" : "Pause", paused ? guideGlyphs.play : guideGlyphs.pause);
    if (paused) delete this.element.dataset.faded;
  }

  private listen() {
    const reader = () => (this.readerInputAt = performance.now() / 1000);
    const activity = () => {
      this.lastActivity = performance.now();
      if ("faded" in this.element.dataset) delete this.element.dataset.faded;
      if (this.state === "playing") this.ask();
    };
    window.addEventListener("wheel", () => (reader(), activity()), { passive: true });
    window.addEventListener("touchstart", () => ((this.touchDown = true), reader(), activity()), { passive: true });
    window.addEventListener("touchmove", reader, { passive: true });
    for (const kind of ["touchend", "touchcancel"]) window.addEventListener(kind, () => (this.touchDown = false), { passive: true });
    window.addEventListener("keydown", (event) => {
      if (SCROLLING_KEYS.has(event.key)) reader();
      activity();
    });
    window.addEventListener("pointermove", activity, { passive: true });
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("scroll", () => this.scrolled(), { passive: true });
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.visibilityState === "hidden";
      if (this.state !== "playing") return;
      if (this.hidden) this.options.narrator.holdTyping();
      else {
        this.options.narrator.carryOnTyping();
        this.ask();
      }
    });
  }

  /** A scroll the tour did not make, or one made while the reader's hand is on the page, is the reader's. */
  private scrolled() {
    if (this.state === "paused" && !this.revealAsked) {
      this.revealAsked = true;
      requestAnimationFrame(() => {
        this.revealAsked = false;
        if (this.state === "paused") this.showWhatComesIntoView();
      });
    }
    if (this.state !== "playing") return;
    const now = performance.now() / 1000;
    const byReader = this.touchDown || now - this.readerInputAt < READER_INPUT_WINDOW || Math.abs(window.scrollY - this.lastSetY) > 2;
    if (!byReader) return;
    this.scroll = null;
    this.lastSetY = -1;
    if (!this.followingReader) {
      this.followingReader = true;
      this.stillSince = now;
      this.lastSampleY = window.scrollY;
    }
    this.ask();
  }

  private ask() {
    if (this.frameAsked || this.hidden) return;
    this.frameAsked = true;
    requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number) {
    this.frameAsked = false;
    const seconds = Math.min(0.1, this.lastFrame ? (now - this.lastFrame) / 1000 : 0);
    this.lastFrame = now;
    if (this.state === "paused" && this.pausedFor === "open" && !this.somethingOpen()) this.resume();
    if (this.state !== "playing" || this.hidden) {
      this.lastFrame = 0;
      // Paused by a card, a tray or a panel, it keeps an eye out for it closing.
      if (this.state === "paused" && this.pausedFor === "open") this.ask();
      return;
    }
    if (this.somethingOpen()) {
      this.pause("open");
      this.ask();
      return;
    }
    if (now - this.lastActivity > CONTROL_STAYS_FOR * 1000) this.element.dataset.faded = "";
    if (this.followingReader) this.watchTheReader(now / 1000);
    else {
      this.clock += seconds;
      if (this.scroll) this.moveThePage(now / 1000);
      else this.direct();
    }
    if (this.state === "playing" || this.pausedFor === "open") this.ask();
  }

  /** A card, a tray, a panel or the sheet open pauses the tour; it plays on when they close, unless it was Paused. */
  private somethingOpen() {
    return Boolean(this.options.root.querySelector(".guide-dialog:not([hidden]), .guide-panel:not([hidden]), .guide-tray:not([hidden])"));
  }

  /** While the reader scrolls, the tour holds. Once the page is still with no touch down, it plays on from there. */
  private watchTheReader(now: number) {
    if (window.scrollY !== this.lastSampleY || this.touchDown) {
      this.lastSampleY = window.scrollY;
      this.stillSince = now;
      return;
    }
    if (now - this.stillSince < STILL_FOR) return;
    this.followingReader = false;
    this.followTheReaderFromHere();
  }

  /** Plays on from the newest unsaid line in view: the lines above it are passed and shown whole. */
  private followTheReaderFromHere() {
    const narrator = this.options.narrator;
    const bandTop = this.options.bandTop();
    for (const line of narrator.lines) if (!narrator.isSaid(line) && line.getBoundingClientRect().bottom < bandTop) narrator.finish(line);
    const newest = narrator.newestInView();
    if (newest) narrator.finishBefore(newest);
    const typing = narrator.typingLine;
    this.phase = typing ? { name: "writing", line: typing } : { name: "next" };
  }

  /** One step of the tour: what to do next, given where it is. */
  private direct() {
    const phase = this.phase;
    const narrator = this.options.narrator;
    if (phase.name === "next") {
      const line = narrator.nextUnsaid();
      if (!line) return this.end();
      const section = line.closest<HTMLElement>("[data-section]");
      if (this.jumps) return this.jumpTo(line);
      if (section && this.options.carries.isWaiting(section)) {
        const name = section.querySelector<HTMLElement>(".guide-section-name");
        // Into the carrying band, which leaves room over the name for the agent and its cord.
        if (name) this.bringTo(name, this.options.carries.bandTop() + 12);
        this.phase = { name: "name", line, since: this.clock };
      } else this.phase = { name: "line", line };
      return;
    }
    if (phase.name === "name") {
      const section = phase.line.closest<HTMLElement>("[data-section]");
      const waiting = section ? this.options.carries.isWaiting(section) : false;
      if (waiting && this.clock - phase.since > NAME_WAITS_AT_MOST && !this.options.carries.isCarrying && section) this.options.carries.setInPlace(section);
      if (!waiting) this.phase = { name: "line", line: phase.line };
      return;
    }
    if (phase.name === "line") {
      const box = phase.line.getBoundingClientRect();
      const height = window.innerHeight;
      if (box.top < this.options.bandTop() || box.bottom > height * READING_FOOT) return this.bringTo(phase.line, height * READING_LINE);
      narrator.finishBefore(phase.line);
      narrator.say(phase.line);
      this.phase = { name: "writing", line: phase.line };
      return;
    }
    if (phase.name === "writing") {
      if (!narrator.isSaid(phase.line)) return;
      const card = this.options.cardOf(phase.line);
      const rest = (card ? REST_AFTER_CARD : REST_AFTER_LINE) + (this.options.hasExtra(phase.line) ? REST_FOR_AN_EXTRA : 0);
      this.phase = { name: "rest", line: phase.line, until: this.clock + rest };
      return;
    }
    if (this.clock >= phase.until) this.phase = { name: "next" };
  }

  /** Under reduced motion: the next section at once, every line in it whole, held for its reading time. */
  private jumpTo(line: HTMLElement) {
    const narrator = this.options.narrator;
    const section = line.closest<HTMLElement>("[data-section]");
    const lines = narrator.lines.filter((each) => each.closest("[data-section]") === section);
    const name = section?.querySelector<HTMLElement>(".guide-section-name") ?? line;
    this.setScroll(name.getBoundingClientRect().top + window.scrollY - this.options.bandTop() - 12);
    for (const each of lines) narrator.finish(each);
    const words = lines.reduce((sum, each) => sum + (each.dataset.line ?? "").split(/\s+/).length, 0);
    const reading = (words * narrationWordMilliseconds()) / 1000 + lines.length * REST_AFTER_LINE;
    this.phase = { name: "rest", line: lines.at(-1) ?? line, until: this.clock + reading };
  }

  /** Brings an element's top to a height on the screen, easing the page there; the reader can take over at once. */
  private bringTo(target: HTMLElement, screenY: number) {
    const to = this.clampScroll(target.getBoundingClientRect().top + window.scrollY - screenY);
    const from = window.scrollY;
    if (Math.abs(to - from) < 2) return;
    const seconds = Math.min(1.1, Math.max(0.35, Math.abs(to - from) / 1400));
    this.scroll = { from, to, started: performance.now() / 1000, seconds };
  }

  private moveThePage(now: number) {
    const scroll = this.scroll;
    if (!scroll) return;
    const share = Math.min(1, (now - scroll.started) / scroll.seconds);
    this.setScroll(scroll.from + (scroll.to - scroll.from) * easeInOut(share));
    if (share >= 1) this.scroll = null;
  }

  private setScroll(y: number) {
    const to = Math.round(this.clampScroll(y));
    this.lastSetY = to;
    this.options.onTourScrolled();
    window.scrollTo(0, to);
  }

  private clampScroll(y: number) {
    const most = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(most, Math.max(0, y));
  }
}

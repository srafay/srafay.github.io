/*
  The controls on the stage, quiet and unboxed, in version 4's language: muted at rest, full strength when pressed or
  open. Posts, Find me, Skills and Sound sit at the top right. The five world switches sit at the bottom, each
  isolating its world, a long press saying how much it holds. The year rail runs down the right edge, All years at its
  top and 2014 at its foot. By the rail's foot sit Ride through time, Lay out time (the quarter turn that lays the years
  out in a line), Tilt on a phone, Reset view and the zoom. The year in focus is set large. The readouts sit small in
  the bottom left corner, each a real value of the object now. The hint names the gestures once.

  Each control is a real button (a slider for the rail, a link for Posts) and works by touch, mouse and keyboard.
  Each control's place is given to the scene, so no word in the scene is drawn under it.
*/
import { kindsInWords } from "@/lib/about-cv/answers";
import { glyphOfWorld } from "@/lib/about-cv/glyphs";
import { controlGlyphs, glyphElement, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { ZOOM_STEP } from "@/lib/about-cv/scene/gestures";
import type { ScrollReader } from "@/lib/about-cv/scene/scroll";
import { FIRST_YEAR } from "@/lib/about-cv/time";
import { buildSkillsSheet, findMeList } from "@/lib/about-cv/ui/skills-sheet";
import { worlds, type WorldKey } from "@/lib/about-cv/worlds";
import { hypercubeGlyphs } from "@/lib/hypercube/icons";
import { beadTime } from "@/lib/hypercube/shape";
import { SLICE_ARRIVES_BY, travelAtYear, yearAtTravel } from "./focus";
import type { HypercubeScene } from "./hypercube-scene";
import type { Interaction } from "./interaction";
import type { Rectangle } from "./label-layer";
import { postsLink } from "./posts-place";
import type { RideControls } from "./ride-controls";
import type { Sound } from "./sound";
import type { Tilt } from "./tilt";

const LONG_PRESS_MILLISECONDS = 500;
const COUNT_SHOWS_MILLISECONDS = 1800;
const HINT_SEEN_KEY = "hypercube-gestures-hint-seen";
/** The skills sheet stays open beside the object on screens at least this wide. */
const SHEET_BESIDE_FROM = 900;
/** How often the readouts are written, in milliseconds: often enough to read as live, rarely enough to cost nothing. */
const READOUTS_EVERY = 200;
/** How clear of the name and bio the marker's year must stand, in CSS pixels, and how wide that year is drawn. */
const MARKER_ROOM = 24;
const MARKER_WORDS_WIDTH = 48;
/** How near the marker may come to a fixed word of the rail, as a share of its length, before the word gives way. */
const RAIL_WORD_ROOM = 0.03;
/** The quarter turn: time laid along the screen, 2014 on the left and now on the right. */
export const TIMELINE_TURN = -Math.PI / 2;

function controlButton(glyph: Glyph, text: string, className: string) {
  const button = element("button", className);
  button.type = "button";
  button.dataset.cubeControl = "";
  button.append(glyphElement(glyph, "cube-icon"), element("span", undefined, text));
  return button;
}

export class Controls {
  readonly top = element("div", "cube-top");
  readonly postsLink = postsLink();
  readonly findMeButton = controlButton(controlGlyphs.findMe, "Find me", "cube-control");
  readonly findMePanel = element("nav", "cube-find");
  readonly skillsButton = controlButton(controlGlyphs.skills, "Skills", "cube-control");
  readonly soundButton = controlButton(hypercubeGlyphs.sound, "Sound", "cube-control");
  readonly view = element("div", "cube-view");
  readonly timelineButton = controlButton(hypercubeGlyphs.layOutTime, "Lay out time", "cube-control");
  readonly tiltButton = controlButton(hypercubeGlyphs.tilt, "Tilt", "cube-control");
  readonly resetButton = controlButton(controlGlyphs.resetView, "Reset view", "cube-control");
  readonly switches = element("nav", "cube-worlds");
  readonly countTip = element("p", "cube-count");
  readonly rail = element("div", "cube-rail");
  readonly marker = element("div", "cube-rail-marker");
  readonly sheet = element("section", "cube-sheet");
  readonly filter = element("input", "cube-filter");
  readonly hint = element("p", "cube-hint");
  readonly year = element("p", "cube-year");
  readonly readouts = element("dl", "cube-readouts");
  private readonly readoutValues = new Map<string, HTMLElement>();
  private readonly switchButtons = new Map<WorldKey, HTMLButtonElement>();
  /** The rail's fixed words (All years, this year, 2014) and where each stands on it, as a share of its length. */
  private readonly railWords: { label: HTMLElement; share: number }[] = [];
  private countTimer = 0;
  private lastReadouts = 0;
  private hintSeen = false;
  private shownYear: number | null | undefined = undefined;
  /**
    A press or a drag on the year rail, to a place of the travel. A ride takes it as a scrub and says so; otherwise the
    travel goes there. While holding, the press is still down.
  */
  onRailScrub: (progress: number, holding: boolean) => boolean = () => false;
  onRailLetGo: () => void = () => {};

  constructor(
    private readonly scene: HypercubeScene,
    private readonly interaction: Interaction,
    private readonly travel: ScrollReader,
    private readonly sound: Sound,
    private readonly tilt: Tilt,
    private readonly ride: RideControls,
  ) {
    this.buildTop();
    this.buildView();
    this.buildSwitches();
    this.buildRail();
    buildSkillsSheet(this.sheet, this.filter, {
      prefix: "cube",
      skills: scene.data.skills,
      onPick: (skill) => {
        this.interaction.lightSkill(skill);
        if (this.scene.stageSize().width < SHEET_BESIDE_FROM) this.closeSheet();
      },
      onClose: () => this.closeSheet(),
    });
    this.buildHint();
    this.buildReadouts();
    this.year.setAttribute("aria-live", "polite");
    this.year.hidden = true;
    scene.elements.stage.append(
      this.top,
      this.switches,
      this.countTip,
      this.rail,
      this.view,
      this.year,
      this.readouts,
      this.sheet,
    );
    scene.elements.title.querySelector(".cube-hold")?.after(this.hint);
    // Where the board of skills goes once the ride has folded it into Skills: the top of the sheet.
    const boardHome = element("div", "cube-board-home");
    boardHome.hidden = true;
    boardHome.append(element("h3", undefined, "Collected on the ride"));
    this.sheet.querySelector("h2")?.after(boardHome);
    scene.onFrame((_scene, moving) => this.followScene(moving));
    // A press on any control is a first gesture too: the hint goes.
    for (const control of [this.top, this.switches, this.view, this.rail])
      control.addEventListener("pointerdown", () => this.dismissHint());
    window.addEventListener("resize", () => this.measure());
    this.measure();
  }

  /** The controls' and the title's places, given to the scene so its words keep off them. On start and resize only. */
  measure() {
    const stage = this.scene.elements.stage;
    const rectangles: Rectangle[] = [];
    const elements = [
      stage.querySelector<HTMLElement>(".cube-home"),
      stage.querySelector<HTMLElement>(".cube-versions"),
      this.scene.elements.title,
      this.top,
      this.switches,
      this.rail,
      this.view,
      this.readouts,
      this.year,
      this.interaction.answer,
      this.interaction.card,
      stage.querySelector<HTMLElement>(".cube-skip"),
      stage.querySelector<HTMLElement>(".cube-player"),
      stage.querySelector<HTMLElement>(".cube-peek"),
      stage.querySelector<HTMLElement>(".cube-board"),
    ];
    for (const control of elements) {
      // Chrome a ride has stepped away (visibility hidden) leaves its place to the words.
      if (!control || control.hidden || getComputedStyle(control).visibility === "hidden") continue;
      const box = control.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      rectangles.push({ left: box.left - 6, top: box.top - 6, right: box.right + 6, bottom: box.bottom + 6 });
    }
    this.scene.setBlocked(rectangles);
    this.measureMarkerRoom();
  }

  /**
    Where the rail's marker runs and where the title stands, read here (on start, resize and change) so the frame never
    reads them. Its year keeps quiet while it is level with the title and within MARKER_ROOM of its words, so on a phone
    it never reads as part of the bio's line.
  */
  private markerRoom = { railTop: 0, railHeight: 1, titleTop: 0, titleBottom: 0, close: false };

  private measureMarkerRoom() {
    const line = this.rail.querySelector<HTMLElement>(".cube-rail-line")?.getBoundingClientRect();
    const title = this.scene.elements.title.getBoundingClientRect();
    if (!line) return;
    this.markerRoom = {
      railTop: line.top,
      railHeight: Math.max(1, line.height),
      titleTop: title.top,
      titleBottom: title.bottom,
      close: line.left - MARKER_WORDS_WIDTH < title.right + MARKER_ROOM,
    };
  }

  /** Whether the marker stands level with the title, close enough to read as part of it. */
  private markerIsByTheTitle(progress: number) {
    const room = this.markerRoom;
    const y = room.railTop + progress * room.railHeight;
    return room.close && y > room.titleTop - MARKER_ROOM && y < room.titleBottom + MARKER_ROOM;
  }

  private buildTop() {
    this.top.dataset.cubeControl = "";
    this.findMePanel.id = "cube-find";
    this.findMePanel.hidden = true;
    this.findMePanel.setAttribute("aria-label", "Where to find me");
    this.findMePanel.append(findMeList("cube"));
    this.findMeButton.setAttribute("aria-expanded", "false");
    this.findMeButton.setAttribute("aria-controls", this.findMePanel.id);
    this.findMeButton.addEventListener("click", () =>
      this.findMePanel.hidden ? this.openFindMe() : this.closeFindMe(),
    );
    document.addEventListener("pointerdown", (event) => {
      const target = event.target as Node;
      if (this.findMePanel.contains(target) || this.findMeButton.contains(target)) return;
      this.closeFindMe(false);
    });
    this.skillsButton.setAttribute("aria-expanded", "false");
    this.skillsButton.addEventListener("click", () => (this.sheet.hidden ? this.openSheet() : this.closeSheet()));
    this.soundButton.setAttribute("aria-pressed", String(this.sound.on));
    this.soundButton.hidden = !this.sound.available;
    this.soundButton.addEventListener("click", () => {
      this.soundButton.setAttribute("aria-pressed", String(this.sound.toggle()));
    });
    this.top.append(this.postsLink, this.findMeButton, this.skillsButton, this.soundButton, this.findMePanel);
  }

  /**
    Whether a panel the reader is reading is open: Find me, the sheet or a card. Then a ride is not the top thing, and
    the object does not rest.
  */
  panelIsOpen() {
    return !this.findMePanel.hidden || !this.sheet.hidden || !this.interaction.card.hidden;
  }

  openFindMe() {
    this.findMePanel.hidden = false;
    this.findMeButton.setAttribute("aria-expanded", "true");
    this.findMePanel.querySelector("a")?.focus({ preventScroll: true });
  }

  closeFindMe(returnFocus = true) {
    if (this.findMePanel.hidden) return false;
    this.findMePanel.hidden = true;
    this.findMeButton.setAttribute("aria-expanded", "false");
    if (returnFocus) this.findMeButton.focus({ preventScroll: true });
    return true;
  }

  openSheet() {
    this.sheet.hidden = false;
    this.skillsButton.setAttribute("aria-expanded", "true");
    // On a touch screen the keyboard waits for a tap on the filter, or it would cover half the sheet.
    (this.scene.touch ? this.sheet : this.filter).focus({ preventScroll: true });
  }

  closeSheet() {
    if (this.sheet.hidden) return false;
    this.sheet.hidden = true;
    this.skillsButton.setAttribute("aria-expanded", "false");
    this.skillsButton.focus({ preventScroll: true });
    return true;
  }

  private buildView() {
    this.view.dataset.cubeControl = "";
    this.timelineButton.setAttribute("aria-pressed", "false");
    this.timelineButton.addEventListener("click", () => this.toggleTimeline());
    this.tiltButton.hidden = !this.tilt.available;
    this.tiltButton.setAttribute("aria-pressed", "false");
    this.tiltButton.addEventListener("click", async () => {
      this.tiltButton.setAttribute("aria-pressed", String(await this.tilt.toggle()));
    });
    this.resetButton.hidden = true;
    this.resetButton.addEventListener("click", () => this.resetView());
    const zoomOut = controlButton(controlGlyphs.zoomOut, "Zoom out", "cube-control cube-zoom");
    const zoomIn = controlButton(controlGlyphs.zoomIn, "Zoom in", "cube-control cube-zoom");
    zoomOut.addEventListener("click", () => this.zoomBy(ZOOM_STEP));
    zoomIn.addEventListener("click", () => this.zoomBy(-ZOOM_STEP));
    // On a phone each row stands over the next at the right, clear of the big year at the left; Reset view on top, so
    // it comes and goes without moving the others. On a computer they stand in one line.
    const resetRow = element("div", "cube-view-row");
    resetRow.append(this.resetButton);
    const firstRow = element("div", "cube-view-row");
    firstRow.append(this.timelineButton, this.tiltButton);
    const secondRow = element("div", "cube-view-row");
    secondRow.append(zoomOut, zoomIn);
    this.view.append(resetRow, this.ride.row, firstRow, secondRow);
  }

  private zoomBy(amount: number) {
    this.scene.zoom.zoomBy(amount);
    this.scene.requestFrame();
  }

  /** Whether time lies out in a line now, the quarter turn through w. */
  private isTimeline() {
    return Math.abs(this.scene.turn.readerAcross() - TIMELINE_TURN) < 0.05;
  }

  /** Lays the years out in a line with a quarter turn through w, or folds them back to the rest pose. */
  toggleTimeline() {
    if (this.isTimeline()) this.scene.turn.reset();
    else this.scene.turn.turnTo(TIMELINE_TURN, 0);
    this.scene.requestFrame();
  }

  /** Back to the rest pose: no turn of the reader's, no zoom, no flight. Says whether it did anything. */
  resetView() {
    if (!this.viewIsChanged()) return false;
    this.scene.turn.reset();
    this.scene.zoom.reset();
    this.scene.flyTo(null);
    this.scene.requestFrame();
    return true;
  }

  private viewIsChanged() {
    return this.scene.turn.isChanged() || this.scene.zoom.isChanged() || this.scene.isFlown();
  }

  private buildSwitches() {
    this.switches.setAttribute("aria-label", "Worlds");
    this.switches.dataset.cubeControl = "";
    this.countTip.hidden = true;
    this.countTip.setAttribute("aria-live", "polite");
    for (const world of worlds) {
      const count = kindsInWords(this.scene.data.events.filter((event) => event.world === world.key));
      const button = controlButton(glyphOfWorld(world.key), world.name, "cube-world");
      button.style.setProperty("--cube-world-hue", `var(--cube-${world.key})`);
      button.setAttribute("aria-pressed", "false");
      button.title = count;
      const description = element("span", "cube-hidden", count);
      description.id = `cube-count-${world.key}`;
      button.setAttribute("aria-describedby", description.id);
      button.append(description);
      let longPress = false;
      button.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") return;
        longPress = false;
        window.clearTimeout(this.countTimer);
        this.countTimer = window.setTimeout(() => {
          longPress = true;
          this.sayCount(count, button);
        }, LONG_PRESS_MILLISECONDS);
      });
      const cancel = () => window.clearTimeout(this.countTimer);
      button.addEventListener("pointerup", cancel);
      button.addEventListener("pointercancel", cancel);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        if (longPress) return void (longPress = false);
        this.toggleWorld(world.key);
      });
      this.switchButtons.set(world.key, button);
      this.switches.append(button);
    }
  }

  /** The count tip stands over its switch, kept whole inside the stage at either edge. */
  private sayCount(count: string, button: HTMLElement) {
    this.countTip.textContent = count;
    this.countTip.hidden = false;
    const box = button.getBoundingClientRect();
    const half = this.countTip.offsetWidth / 2;
    const width = this.scene.stageSize().width;
    this.countTip.style.left = `${Math.min(width - 8 - half, Math.max(8 + half, box.left + box.width / 2))}px`;
    window.setTimeout(() => (this.countTip.hidden = true), COUNT_SHOWS_MILLISECONDS);
  }

  toggleWorld(world: WorldKey) {
    const next = this.scene.focus.isolated === world ? null : world;
    this.scene.isolate(next);
    for (const [key, button] of this.switchButtons) button.setAttribute("aria-pressed", String(key === next));
  }

  clearIsolation() {
    if (!this.scene.focus.isolated) return false;
    this.toggleWorld(this.scene.focus.isolated);
    return true;
  }

  /** The rail is a picture of the travel: All years at the top, now under it, 2014 at the foot. */
  private buildRail() {
    const rail = this.rail;
    const present = this.scene.data.present;
    rail.dataset.cubeControl = "";
    rail.tabIndex = 0;
    rail.setAttribute("role", "slider");
    rail.setAttribute("aria-label", "Year in focus");
    rail.setAttribute("aria-orientation", "vertical");
    rail.setAttribute("aria-valuemin", String(FIRST_YEAR));
    rail.setAttribute("aria-valuemax", String(Math.floor(present)));
    const line = element("div", "cube-rail-line");
    rail.append(line);
    for (const event of this.scene.data.events) {
      const tick = element("span", "cube-rail-tick");
      const share = travelAtYear(beadTime(event, present) - 0.5, present);
      tick.style.top = `${(share * 100).toFixed(2)}%`;
      tick.style.setProperty("--cube-tick-hue", `var(--cube-${event.world})`);
      line.append(tick);
    }
    const labelAt = (text: string, share: number) => {
      const label = element("span", "cube-rail-year", text);
      label.style.top = `${(share * 100).toFixed(2)}%`;
      line.append(label);
      this.railWords.push({ label, share });
    };
    labelAt("All years", 0);
    labelAt(String(Math.floor(present)), travelAtYear(Math.floor(present), present));
    labelAt(String(FIRST_YEAR), 1);
    line.append(this.marker);
    let dragging = false;
    // The rail's place is read once as a press lands, never while it drags.
    let box = { top: 0, height: 1 };
    const goToPointer = (clientY: number) => {
      const progress = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
      if (!this.onRailScrub(progress, dragging)) this.travel.scrollToProgress(progress);
    };
    rail.addEventListener("pointerdown", (event) => {
      dragging = true;
      const measured = line.getBoundingClientRect();
      box = { top: measured.top, height: Math.max(1, measured.height) };
      rail.setPointerCapture(event.pointerId);
      goToPointer(event.clientY);
    });
    rail.addEventListener("pointermove", (event) => {
      if (dragging) goToPointer(event.clientY);
    });
    const stop = () => {
      if (dragging) this.onRailLetGo();
      dragging = false;
    };
    rail.addEventListener("pointerup", stop);
    rail.addEventListener("pointercancel", stop);
    rail.addEventListener("keydown", (event) => {
      // The year now is read from the travel, which the keys move at once, not from the scene, which follows a frame later.
      const now = yearAtTravel(this.travel.progress(), present);
      const newest = Math.floor(present);
      const target =
        event.key === "ArrowUp" || event.key === "ArrowRight"
          ? now === null || now >= newest
            ? null
            : now + 1
          : event.key === "ArrowDown" || event.key === "ArrowLeft"
            ? now === null
              ? newest
              : Math.max(FIRST_YEAR, now - 1)
            : event.key === "Home"
              ? null
              : event.key === "End"
                ? FIRST_YEAR
                : undefined;
      if (target === undefined) return;
      event.preventDefault();
      this.railToYear(target);
    });
  }

  /** Brings a year into focus, or all years with null. A ride on the rail's keys goes to that year instead. */
  private railToYear(year: number | null) {
    const progress = year === null ? 0 : travelAtYear(year, this.scene.data.present);
    if (!this.onRailScrub(progress, false)) this.travel.scrollToProgress(progress);
  }

  /** Brings a year into focus, or all years with null. */
  goToYear(year: number | null) {
    this.travel.scrollToProgress(year === null ? 0 : travelAtYear(year, this.scene.data.present));
  }

  /** The year in focus follows the travel; the rail's marker, the big year and the readouts follow the scene. */
  private followScene(moving: boolean) {
    const progress = this.travel.progress();
    const year = yearAtTravel(progress, this.scene.data.present);
    this.scene.setYear(year);
    const markerTop = `${(progress * 100).toFixed(2)}%`;
    if (this.marker.style.top !== markerTop) this.marker.style.top = markerTop;
    if (year !== this.shownYear) {
      this.shownYear = year;
      this.marker.textContent = year === null ? "" : String(year);
      this.rail.setAttribute("aria-valuenow", String(year ?? Math.floor(this.scene.data.present)));
      this.rail.setAttribute("aria-valuetext", year === null ? "All years" : String(year));
      this.year.textContent = year === null ? "" : String(year);
      // The big year is a place no word in the scene may cover: measured when it comes or goes, never per frame.
      if (this.year.hidden !== (year === null)) requestAnimationFrame(() => this.measure());
      this.year.hidden = year === null;
    }
    // A fixed word of the rail gives way to the marker where they meet, so neither is written over the other.
    for (const { label, share } of this.railWords) {
      const covered = year !== null && Math.abs(share - progress) < RAIL_WORD_ROOM;
      if (label.hidden !== covered) label.hidden = covered;
    }
    const quiet = this.markerIsByTheTitle(progress);
    if (this.marker.hasAttribute("data-cube-quiet") !== quiet) this.marker.toggleAttribute("data-cube-quiet", quiet);
    // Written only when they change, so a frame touches nothing the page must restyle.
    const resetHidden = !this.viewIsChanged();
    if (this.resetButton.hidden !== resetHidden) this.resetButton.hidden = resetHidden;
    const laidOut = String(this.isTimeline());
    if (this.timelineButton.getAttribute("aria-pressed") !== laidOut) this.timelineButton.setAttribute("aria-pressed", laidOut);
    const now = performance.now();
    if (now - this.lastReadouts >= READOUTS_EVERY || !moving) {
      this.lastReadouts = now;
      this.writeReadouts();
    }
    if (progress > SLICE_ARRIVES_BY * 0.5) this.dismissHint();
  }

  private buildReadouts() {
    this.readouts.setAttribute("aria-label", "The object now");
    for (const [key, label] of [
      ["angle", "Through w"],
      ["year", "Year"],
      ["lit", "Lit"],
      ["spin", "Spin"],
    ]) {
      const row = element("div");
      const value = element("dd");
      row.append(element("dt", undefined, label), value);
      this.readouts.append(row);
      this.readoutValues.set(key, value);
    }
  }

  private writeReadouts() {
    const write = (key: string, text: string) => {
      const value = this.readoutValues.get(key) as HTMLElement;
      if (value.textContent !== text) value.textContent = text;
    };
    write("angle", `${Math.round(this.scene.angleThroughW())}°`);
    write("year", this.scene.focus.year === null ? "All" : String(this.scene.focus.year));
    write("lit", `${this.scene.litCount()} of ${this.scene.data.events.length}`);
    write("spin", `${((this.scene.turn.spinPace() * 180) / Math.PI).toFixed(1)}°/s`);
  }

  private buildHint() {
    this.hint.hidden = true;
    this.hint.textContent = this.scene.touch
      ? "Swipe up or down to move through time. Drag sideways to turn it through the fourth dimension. Tap any light, or ride through time from 2014 to now."
      : "Scroll to move through time. Drag to turn it through the fourth dimension. Click any light, or ride through time from 2014 to now.";
  }

  /** Shows the hint once, after the unfold, unless it was seen before or a gesture came first. */
  showHintOnce() {
    try {
      if (localStorage.getItem(HINT_SEEN_KEY)) return;
    } catch {
      // Storage refused: the hint shows once for this visit.
    }
    if (this.hintSeen) return;
    this.hint.hidden = false;
    this.measure();
  }

  /** The first real gesture sends the hint away for good. A held press does not count. */
  dismissHint() {
    if (this.hintSeen) return;
    this.hintSeen = true;
    try {
      localStorage.setItem(HINT_SEEN_KEY, "yes");
    } catch {
      // Nothing to keep: it is gone for this visit either way.
    }
    if (this.hint.hidden) return;
    this.hint.dataset.cubeLeaving = "";
    window.setTimeout(() => {
      this.hint.hidden = true;
      this.measure();
    }, 400);
  }
}

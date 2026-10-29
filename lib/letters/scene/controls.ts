/*
  The controls on the stage, quiet and unboxed, in version 4's language: muted at rest, full strength when pressed or
  open. Search, Find me and Skills sit at the top right. The five world switches sit at the foot, each isolating its
  lane, a long press saying what it holds. The year rail runs down the right edge, now at its top and 2014 at its foot.
  Zoom and Reset view sit by the rail's foot. The hint names the gestures once.

  Each control is a real button (or a slider, for the rail) and works by touch, mouse and keyboard. Each one's place
  is given to the scene, so no skill word in the sky is drawn under it. Places are measured on a resize or when a panel
  opens or closes, never during a frame.
*/
import { kindsInWords } from "@/lib/about-cv/answers";
import { glyphOfWorld } from "@/lib/about-cv/glyphs";
import { controlGlyphs, glyphElement, lineGlyph, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { ZOOM_STEP } from "@/lib/about-cv/scene/gestures";
import type { ScrollReader } from "@/lib/about-cv/scene/scroll";
import { FIRST_YEAR } from "@/lib/about-cv/time";
import { buildSkillsSheet, findMeList } from "@/lib/about-cv/ui/skills-sheet";
import { worlds, type WorldKey } from "@/lib/about-cv/worlds";
import { House } from "lucide";
import type { Interaction } from "./interaction";
import type { LettersScene } from "./letters-scene";
import type { Rectangle } from "./sky-layer";

const LONG_PRESS_MILLISECONDS = 500;
const COUNT_SHOWS_MILLISECONDS = 1800;
const HINT_SEEN_KEY = "letters-gestures-hint-seen";
/** The skills sheet stays open beside the land on screens at least this wide. */
const SHEET_BESIDE_FROM = 900;
const homeGlyph = lineGlyph("house", House);

/** An element's line height in pixels, read when the controls are measured. */
function lineHeightOf(element: HTMLElement) {
  const style = getComputedStyle(element);
  const line = parseFloat(style.lineHeight);
  return Number.isFinite(line) ? line : parseFloat(style.fontSize) * 1.3;
}

function controlButton(glyph: Glyph, text: string, className = "letters-control") {
  const button = element("button", className);
  button.type = "button";
  button.dataset.lettersControl = "";
  button.append(glyphElement(glyph, "letters-icon"), element("span", undefined, text));
  return button;
}

export class Controls {
  readonly top = element("div", "letters-top");
  readonly searchButton = controlButton(controlGlyphs.search, "Search");
  readonly findMeButton = controlButton(controlGlyphs.findMe, "Find me");
  readonly findMePanel = element("nav", "letters-find letters-panel");
  readonly skillsButton = controlButton(controlGlyphs.skills, "Skills");
  readonly switches = element("nav", "letters-worlds");
  readonly countTip = element("p", "letters-count");
  readonly rail = element("div", "letters-rail");
  readonly marker = element("div", "letters-rail-marker");
  readonly view = element("div", "letters-view");
  readonly resetButton = controlButton(controlGlyphs.resetView, "Reset view");
  readonly sheet = element("section", "letters-sheet letters-panel");
  readonly filter = element("input", "letters-filter");
  readonly hint = element("p", "letters-hint");
  private readonly switchButtons = new Map<WorldKey, HTMLButtonElement>();
  private countTimer = 0;
  private hintSeen = false;
  private shownYear: number | undefined;
  /** Called when the reader asks for the search. */
  onSearch: () => void = () => {};

  constructor(
    private readonly scene: LettersScene,
    private readonly interaction: Interaction,
    private readonly travel: ScrollReader,
  ) {
    this.buildTop();
    this.buildSwitches();
    this.buildRail();
    this.buildView();
    buildSkillsSheet(this.sheet, this.filter, {
      prefix: "letters",
      skills: scene.data.skills,
      onPick: (skill) => {
        this.interaction.lightSkill(skill);
        if (this.scene.view.size().width < SHEET_BESIDE_FROM) this.closeSheet(false);
      },
      onClose: () => this.closeSheet(),
    });
    this.buildHint();
    const stage = scene.elements.stage;
    stage.append(this.top, this.switches, this.countTip, this.rail, this.view, this.sheet);
    scene.onFrame(() => this.followScene());
    for (const control of [this.top, this.switches, this.view, this.rail])
      control.addEventListener("pointerdown", () => this.dismissHint());
    window.addEventListener("resize", () => this.measure());
    void document.fonts.ready.then(() => this.measure());
    this.measure();
  }

  /** The controls' and the title's places, given to the scene so the sky's words keep off them. */
  measure() {
    const stage = this.scene.elements.stage;
    const rectangles: Rectangle[] = [];
    const away = stage.hasAttribute("data-letters-away");
    const kept = [
      stage.querySelector<HTMLElement>(".letters-home"),
      stage.querySelector<HTMLElement>(".letters-versions"),
      away ? null : stage.querySelector<HTMLElement>(".letters-name"),
      away ? null : stage.querySelector<HTMLElement>(".letters-bio"),
      this.top,
      this.switches,
      this.rail,
      this.view,
      this.interaction.answer,
      this.interaction.card.panel,
      this.sheet,
      stage.querySelector<HTMLElement>(".letters-search"),
      away ? null : stage.querySelector<HTMLElement>(".letters-hint"),
    ];
    for (const control of kept) {
      if (!control || control.hidden) continue;
      const box = control.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      rectangles.push({ left: box.left - 8, top: box.top - 8, right: box.right + 8, bottom: box.bottom + 8 });
    }
    // The band under the top bar: nothing of the sky is drawn under it.
    const band = { left: 0, top: 0, right: window.innerWidth, bottom: stage.querySelector<HTMLElement>(".letters-versions")?.getBoundingClientRect().bottom ?? 60 };
    rectangles.push(band);
    this.scene.setBlocked(rectangles);
    // The land keeps quiet under the words a reader reads over it (the name, the bio, the hint, the search) and under
    // the controls along the foot and the year rail: its letters there draw as dots. Each place reaches a line of its words further.
    const quiet = [band];
    for (const words of [
      away ? null : stage.querySelector<HTMLElement>(".letters-name"),
      away ? null : stage.querySelector<HTMLElement>(".letters-bio"),
      away ? null : stage.querySelector<HTMLElement>(".letters-hint"),
      stage.querySelector<HTMLElement>(".letters-search"),
      this.switches,
      this.view,
      this.rail,
    ]) {
      if (!words || words.hidden) continue;
      const box = words.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const line = lineHeightOf(words);
      quiet.push({ left: box.left - line, top: box.top - line, right: box.right + line, bottom: box.bottom + line });
    }
    this.scene.setQuiet(quiet);
  }

  private buildTop() {
    this.top.dataset.lettersControl = "";
    this.findMePanel.id = "letters-find";
    this.findMePanel.hidden = true;
    this.findMePanel.setAttribute("aria-label", "Where to find me");
    const list = findMeList("letters");
    const backItem = element("li");
    const back = element("a", "letters-find-link");
    back.href = "/?from=post";
    back.append(glyphElement(homeGlyph, "letters-icon"), element("span", undefined, "Back home"));
    backItem.append(back);
    list.append(backItem);
    this.findMePanel.append(list);
    this.findMeButton.setAttribute("aria-expanded", "false");
    this.findMeButton.setAttribute("aria-controls", this.findMePanel.id);
    this.findMeButton.addEventListener("click", () => (this.findMePanel.hidden ? this.openFindMe() : this.closeFindMe()));
    document.addEventListener("pointerdown", (event) => {
      const target = event.target as Node;
      if (this.findMePanel.contains(target) || this.findMeButton.contains(target)) return;
      this.closeFindMe(false);
    });
    this.skillsButton.setAttribute("aria-expanded", "false");
    this.skillsButton.addEventListener("click", () => (this.sheet.hidden ? this.openSheet() : this.closeSheet()));
    this.searchButton.addEventListener("click", () => this.onSearch());
    this.top.append(this.searchButton, this.findMeButton, this.skillsButton, this.findMePanel);
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
    this.interaction.closeCard();
    this.sheet.hidden = false;
    this.skillsButton.setAttribute("aria-expanded", "true");
    // On a touch screen the keyboard waits for a tap on the filter, or it would cover half the sheet.
    (this.scene.touch ? this.sheet : this.filter).focus({ preventScroll: true });
    this.measure();
  }

  closeSheet(returnFocus = true) {
    if (this.sheet.hidden) return false;
    this.sheet.hidden = true;
    this.skillsButton.setAttribute("aria-expanded", "false");
    if (returnFocus) this.skillsButton.focus({ preventScroll: true });
    this.measure();
    return true;
  }

  /** Whether a panel the reader is reading is open: then typing is not a search and the land is not idle. */
  panelIsOpen() {
    return !this.sheet.hidden || !this.findMePanel.hidden || !this.interaction.card.panel.hidden;
  }

  private buildSwitches() {
    this.switches.setAttribute("aria-label", "Worlds");
    this.switches.dataset.lettersControl = "";
    this.countTip.hidden = true;
    this.countTip.setAttribute("aria-live", "polite");
    for (const world of worlds) {
      const count = kindsInWords(this.scene.data.events.filter((event) => event.world === world.key));
      const button = controlButton(glyphOfWorld(world.key), world.name, "letters-world");
      button.style.setProperty("--letters-world-tint", `var(--letters-${world.key})`);
      button.setAttribute("aria-pressed", "false");
      button.title = count;
      const description = element("span", "letters-hidden", count);
      description.id = `letters-count-${world.key}`;
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

  private sayCount(count: string, button: HTMLElement) {
    this.countTip.textContent = count;
    this.countTip.hidden = false;
    const box = button.getBoundingClientRect();
    this.countTip.style.left = `${Math.max(90, Math.min(window.innerWidth - 90, box.left + box.width / 2))}px`;
    window.setTimeout(() => (this.countTip.hidden = true), COUNT_SHOWS_MILLISECONDS);
  }

  toggleWorld(world: WorldKey) {
    const next = this.interaction.isolated === world ? null : world;
    this.interaction.isolate(next);
    for (const [key, button] of this.switchButtons) button.setAttribute("aria-pressed", String(key === next));
  }

  clearIsolation() {
    if (!this.interaction.isolated) return false;
    this.toggleWorld(this.interaction.isolated);
    return true;
  }

  /** The rail is a picture of the travel: now at the top, 2014 at the foot, a tick for each event. */
  private buildRail() {
    const { rail, scene } = this;
    const { grid } = scene.data.land;
    rail.dataset.lettersControl = "";
    rail.tabIndex = 0;
    rail.setAttribute("role", "slider");
    rail.setAttribute("aria-label", "Year in focus");
    rail.setAttribute("aria-orientation", "vertical");
    rail.setAttribute("aria-valuemin", String(FIRST_YEAR));
    rail.setAttribute("aria-valuemax", String(Math.floor(grid.present)));
    const line = element("div", "letters-rail-line");
    rail.append(line);
    const shareAt = (time: number) => scene.view.travelAtRow(grid.rowAt(time));
    for (const event of scene.data.events) {
      const tick = element("span", "letters-rail-tick");
      tick.style.top = `${(shareAt((event.start + (event.end ?? event.start)) / 2) * 100).toFixed(2)}%`;
      line.append(tick);
    }
    line.append(this.marker);
    let dragging = false;
    // The rail's place is read once as a press lands, never while it drags.
    let box = { top: 0, height: 1 };
    const goToPointer = (clientY: number) =>
      this.travel.scrollToProgress(Math.min(1, Math.max(0, (clientY - box.top) / box.height)));
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
    const stop = () => (dragging = false);
    rail.addEventListener("pointerup", stop);
    rail.addEventListener("pointercancel", stop);
    rail.addEventListener("keydown", (event) => {
      const now = this.yearInFocus();
      const newest = Math.floor(grid.present);
      const steps: Record<string, number> = {
        ArrowUp: Math.min(newest, now + 1),
        ArrowRight: Math.min(newest, now + 1),
        ArrowDown: Math.max(FIRST_YEAR, now - 1),
        ArrowLeft: Math.max(FIRST_YEAR, now - 1),
        Home: newest,
        End: FIRST_YEAR,
      };
      if (!(event.key in steps)) return;
      event.preventDefault();
      this.goToYear(steps[event.key]);
    });
  }

  /** The year at the travel's place now, read from the travel itself, which keys move at once. */
  yearInFocus() {
    const { grid } = this.scene.data.land;
    return Math.min(Math.floor(grid.present), Math.max(FIRST_YEAR, Math.floor(grid.timeAt(this.scene.view.rowAtTravel(this.travel.progress())))));
  }

  goToYear(year: number) {
    const { grid } = this.scene.data.land;
    this.travel.scrollToProgress(this.scene.view.travelAtRow(grid.rowAt(year + 0.5)));
  }

  private buildView() {
    this.view.dataset.lettersControl = "";
    this.resetButton.hidden = true;
    this.resetButton.addEventListener("click", () => this.resetView());
    const zoomOut = controlButton(controlGlyphs.zoomOut, "Zoom out", "letters-control letters-zoom");
    const zoomIn = controlButton(controlGlyphs.zoomIn, "Zoom in", "letters-control letters-zoom");
    for (const button of [zoomOut, zoomIn]) button.querySelector("span")?.classList.add("letters-hidden");
    zoomOut.addEventListener("click", () => this.zoomBy(ZOOM_STEP));
    zoomIn.addEventListener("click", () => this.zoomBy(-ZOOM_STEP));
    this.view.append(this.resetButton, zoomOut, zoomIn);
  }

  private zoomBy(amount: number) {
    this.scene.view.zoomBy(amount);
    this.scene.requestFrame();
  }

  /** Back to the travel's own pose: no turn, no zoom, no lean over a lane. Says whether it did anything. */
  resetView() {
    if (!this.scene.view.isChanged()) return false;
    if (this.interaction.isolated) this.clearIsolation();
    this.scene.view.reset();
    this.scene.requestFrame();
    return true;
  }

  /** The rail's marker and Reset view follow the scene, written only when they change. */
  private followScene() {
    const progress = this.travel.progress();
    const markerTop = `${(progress * 100).toFixed(2)}%`;
    if (this.marker.style.top !== markerTop) this.marker.style.top = markerTop;
    const year = this.yearInFocus();
    if (year !== this.shownYear) {
      this.shownYear = year;
      this.marker.textContent = String(year);
      this.rail.setAttribute("aria-valuenow", String(year));
      this.rail.setAttribute("aria-valuetext", String(year));
    }
    const resetHidden = !this.scene.view.isChanged();
    if (this.resetButton.hidden !== resetHidden) this.resetButton.hidden = resetHidden;
    if (progress > 0.04) this.dismissHint();
  }

  private buildHint() {
    this.hint.hidden = true;
    this.hint.textContent = this.scene.touch
      ? "Swipe to travel through time. Drag sideways to turn. Pinch to read. Tap any word."
      : "Scroll to travel through time. Drag to turn. Ctrl and scroll to read closer. Click any word, or just type to search.";
    this.scene.elements.root.querySelector(".letters-bio")?.after(this.hint);
  }

  /** Shows the hint once, after the letters have typed themselves in, unless it was seen before. */
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

  /** The first real gesture sends the hint away for good. */
  dismissHint() {
    if (this.hintSeen) return;
    this.hintSeen = true;
    try {
      localStorage.setItem(HINT_SEEN_KEY, "yes");
    } catch {
      // Nothing to keep: it is gone for this visit either way.
    }
    if (this.hint.hidden) return;
    this.hint.dataset.lettersLeaving = "";
    window.setTimeout(() => {
      this.hint.hidden = true;
      this.measure();
    }, 400);
  }
}

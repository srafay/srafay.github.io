/*
  The controls on the stage, quiet and unboxed, in the page's own type and line icons. Find me and Skills sit at the
  top, the five world switches at the bottom and the year rail along the right edge. The zoom buttons and Reset view
  sit by the rail's foot. The skills sheet opens over the scene, and a one-time hint names the gestures. Each control
  is a real button (or a slider, for the rail) and works by touch, mouse and keyboard. Each control's place is given
  to the scene, so no word in the scene is drawn under it.
*/
import { currentRoleSkills, cvSkillGroups } from "@/content/about/profile";
import type { EventKind, WorldEvent } from "@/lib/world-lines/events";
import { glyphOfSkill, glyphOfWorld } from "@/lib/world-lines/glyphs";
import { site } from "@/lib/site";
import {
  controlGlyphs,
  glyphElement,
  linkGlyphs,
  type Glyph,
} from "@/lib/world-lines/icons";
import { CURRENT_ROLE_GROUP, wordsOf, type SkillWord } from "@/lib/world-lines/skills";
import { FIRST_YEAR } from "@/lib/world-lines/time";
import { worlds, type WorldKey } from "@/lib/world-lines/worlds";
import { progressAtTime, STRETCHES, travelTime } from "./camera";
import { element } from "./dom";
import { ZOOM_STEP } from "./gestures";
import type { Interaction } from "./interaction";
import type { WorldLinesScene } from "./mount";
import type { Rectangle } from "./word-placement";

/** How long a press on a world switch takes to become a long press that says its count. */
const LONG_PRESS_MILLISECONDS = 500;
/** How long a count said by a long press stays. */
const COUNT_SHOWS_MILLISECONDS = 1800;
/** Where the page remembers that the hint has been seen, so it shows once. */
const HINT_SEEN_KEY = "world-lines-gestures-hint-seen";
/** The skills sheet stays open beside the scene on screens at least this wide. */
const SHEET_BESIDE_FROM = 900;

/** A button with its glyph and its words, marked as a control so a press on it is never a tap on the scene. */
function controlButton(glyph: Glyph, text: string, className: string) {
  const button = element("button", className);
  button.type = "button";
  button.dataset.linesControl = "";
  button.append(glyphElement(glyph), element("span", undefined, text));
  return button;
}

const KIND_NOUNS: Record<EventKind, [string, string]> = {
  role: ["role", "roles"],
  internship: ["internship", "internships"],
  degree: ["degree", "degrees"],
  thesis: ["thesis", "theses"],
  project: ["project", "projects"],
  course: ["course", "courses"],
  activity: ["activity", "activities"],
  pastime: ["pastime", "pastimes"],
};

/** "7 roles and 2 internships": what a world holds, counted by kind, in the order its events first appear. */
export function countInWords(events: WorldEvent[]) {
  const counts = new Map<EventKind, number>();
  for (const event of events) counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  const parts = [...counts].map(([kind, count]) => `${count} ${KIND_NOUNS[kind][count === 1 ? 0 : 1]}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
}

export class Controls {
  readonly top = element("div", "lines-top");
  readonly skillsButton = controlButton(controlGlyphs.skills, "Skills", "lines-control");
  readonly findMeButton = controlButton(controlGlyphs.findMe, "Find me", "lines-control");
  readonly findMePanel = element("nav", "lines-find");
  readonly viewControls = element("div", "lines-view");
  readonly resetButton = controlButton(controlGlyphs.resetView, "Reset view", "lines-control");
  readonly switches = element("nav", "lines-worlds");
  readonly countTip = element("p", "lines-count");
  readonly rail = element("div", "lines-rail");
  readonly marker = element("div", "lines-rail-marker");
  readonly sheet = element("section", "lines-sheet");
  readonly filter = element("input", "lines-filter");
  readonly hint = element("p", "lines-hint");
  private readonly switchButtons = new Map<WorldKey, HTMLButtonElement>();
  private shownYear: number | null = null;
  private countTimer = 0;

  constructor(
    private readonly scene: WorldLinesScene,
    private readonly interaction: Interaction,
    private readonly events: WorldEvent[],
    private readonly skills: SkillWord[],
  ) {
    const stage = scene.elements.stage;
    this.buildTop();
    this.buildViewControls();
    this.buildSwitches();
    this.buildRail();
    this.buildSheet();
    this.buildHint();
    stage.append(this.top, this.switches, this.countTip, this.rail, this.viewControls, this.sheet);
    // The hint sits under the name and its line, a space the words already keep off, so it covers nothing.
    scene.elements.title.querySelector(".lines-bio")?.after(this.hint);
    scene.onFrame(() => this.followCamera());
    window.addEventListener("resize", () => this.measure());
    this.measure();
  }

  /** The controls' places, given to the scene so its words keep off them. A layout read, on start and resize only. */
  measure() {
    const stage = this.scene.elements.stage.getBoundingClientRect();
    const rectangles: Rectangle[] = [];
    const stageElement = this.scene.elements.stage;
    const corner = [".lines-home", ".lines-versions"]
      .map((selector) => stageElement.querySelector<HTMLElement>(selector))
      .filter((found): found is HTMLElement => found !== null);
    for (const control of [...corner, this.top, this.switches, this.rail, this.viewControls]) {
      if (control.hidden) continue;
      const box = control.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      rectangles.push({
        left: box.left - stage.left - 6,
        top: box.top - stage.top - 6,
        right: box.right - stage.left + 6,
        bottom: box.bottom - stage.top + 6,
      });
    }
    this.scene.setControlRectangles(rectangles);
  }

  private buildTop() {
    this.top.dataset.linesControl = "";
    this.skillsButton.setAttribute("aria-expanded", "false");
    this.skillsButton.addEventListener("click", () => (this.sheet.hidden ? this.openSheet() : this.closeSheet()));
    this.buildFindMe();
    this.top.append(this.findMeButton, this.skillsButton, this.findMePanel);
  }

  /** Find me: a small panel of the profiles, each by name, with its mark where Simple Icons has one. */
  private buildFindMe() {
    this.findMePanel.id = "lines-find";
    this.findMePanel.hidden = true;
    this.findMePanel.setAttribute("aria-label", "Where to find me");
    this.findMeButton.setAttribute("aria-expanded", "false");
    this.findMeButton.setAttribute("aria-controls", this.findMePanel.id);
    this.findMeButton.addEventListener("click", () =>
      this.findMePanel.hidden ? this.openFindMe() : this.closeFindMe(),
    );
    const list = element("ul");
    for (const link of site.links) {
      const item = element("li");
      const anchor = element("a", "lines-find-link");
      anchor.href = link.href;
      anchor.rel = "me";
      const glyph = linkGlyphs[link.label] as Glyph | undefined;
      anchor.append(glyph ? glyphElement(glyph) : element("span", "lines-icon"), element("span", undefined, link.label));
      item.append(anchor);
      list.append(item);
    }
    this.findMePanel.append(list);
    // A press anywhere else closes it, as a menu does.
    document.addEventListener("pointerdown", (event) => {
      const target = event.target as Node;
      if (this.findMePanel.contains(target) || this.findMeButton.contains(target)) return;
      this.closeFindMe(false);
    });
  }

  openFindMe() {
    this.findMePanel.hidden = false;
    this.findMeButton.setAttribute("aria-expanded", "true");
    this.findMePanel.querySelector("a")?.focus({ preventScroll: true });
  }

  /** Closes Find me, if open. Says whether it did anything. */
  closeFindMe(returnFocus = true) {
    if (this.findMePanel.hidden) return false;
    this.findMePanel.hidden = true;
    this.findMeButton.setAttribute("aria-expanded", "false");
    if (returnFocus) this.findMeButton.focus({ preventScroll: true });
    return true;
  }

  /** Zoom in and out, and Reset view, which shows only while the view is turned or zoomed. */
  private buildViewControls() {
    this.viewControls.dataset.linesControl = "";
    this.resetButton.hidden = true;
    this.resetButton.addEventListener("click", () => this.resetView());
    const zoomOut = controlButton(controlGlyphs.zoomOut, "Zoom out", "lines-control lines-zoom");
    const zoomIn = controlButton(controlGlyphs.zoomIn, "Zoom in", "lines-control lines-zoom");
    zoomOut.addEventListener("click", () => this.scene.zoomBy(ZOOM_STEP));
    zoomIn.addEventListener("click", () => this.scene.zoomBy(-ZOOM_STEP));
    this.viewControls.append(this.resetButton, zoomOut, zoomIn);
    this.scene.onViewChange(() => {
      const changed = this.scene.viewIsChanged();
      if (changed === !this.resetButton.hidden) return;
      this.resetButton.hidden = !changed;
    });
  }

  /** Back to the travel's own view, if turned or zoomed. Says whether it did anything. */
  resetView() {
    if (!this.scene.viewIsChanged()) return false;
    this.scene.resetView();
    return true;
  }

  private buildSwitches() {
    this.switches.setAttribute("aria-label", "Worlds");
    this.switches.dataset.linesControl = "";
    this.countTip.hidden = true;
    this.countTip.setAttribute("aria-live", "polite");
    for (const world of worlds) {
      const own = this.events.filter((event) => event.world === world.key);
      const count = countInWords(own);
      const button = controlButton(glyphOfWorld(world.key), world.name, "lines-world");
      button.setAttribute("aria-pressed", "false");
      button.title = count;
      button.setAttribute("aria-describedby", `lines-count-${world.key}`);
      const description = element("span", "lines-hidden", count);
      description.id = `lines-count-${world.key}`;
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

  /** A long press says how much a world holds, above the switches, for a moment. */
  private sayCount(count: string, button: HTMLElement) {
    this.countTip.textContent = count;
    this.countTip.hidden = false;
    const stage = this.scene.elements.stage.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    this.countTip.style.left = `${Math.max(8, box.left - stage.left + box.width / 2)}px`;
    window.setTimeout(() => (this.countTip.hidden = true), COUNT_SHOWS_MILLISECONDS);
  }

  toggleWorld(world: WorldKey) {
    const next = this.scene.isolatedWorld() === world ? null : world;
    this.interaction.clear();
    this.scene.isolateWorld(next);
    for (const [key, button] of this.switchButtons) button.setAttribute("aria-pressed", String(key === next));
  }

  /** Shows every world again, if one was isolated. Says whether it did anything. */
  clearIsolation() {
    if (!this.scene.isolatedWorld()) return false;
    this.scene.isolateWorld(null);
    for (const button of this.switchButtons.values()) button.setAttribute("aria-pressed", "false");
    return true;
  }

  /** The rail's share of its height for a time: 2026 at the top, 2014 at the bottom, as the scroll runs. */
  private railShare(time: number) {
    const present = this.scene.data.present;
    return Math.min(1, Math.max(0, (present - time) / (present - FIRST_YEAR + 0.25)));
  }

  private timeAtRailShare(share: number) {
    const present = this.scene.data.present;
    return present - share * (present - FIRST_YEAR + 0.25);
  }

  private buildRail() {
    const rail = this.rail;
    rail.dataset.linesControl = "";
    rail.tabIndex = 0;
    rail.setAttribute("role", "slider");
    rail.setAttribute("aria-label", "Year");
    rail.setAttribute("aria-orientation", "vertical");
    rail.setAttribute("aria-valuemin", String(FIRST_YEAR));
    rail.setAttribute("aria-valuemax", String(Math.floor(this.scene.data.present)));
    const line = element("div", "lines-rail-line");
    rail.append(line);
    for (const event of this.events) {
      const tick = element("span", "lines-rail-tick");
      tick.style.top = `${(this.railShare(event.end ?? event.start) * 100).toFixed(2)}%`;
      line.append(tick);
    }
    const present = Math.floor(this.scene.data.present);
    for (const year of [present, FIRST_YEAR]) {
      const label = element("span", "lines-rail-year", String(year));
      label.style.top = `${(this.railShare(year + 0.5) * 100).toFixed(2)}%`;
      line.append(label);
    }
    line.append(this.marker);
    let dragging = false;
    const goToPointer = (clientY: number) => {
      const box = line.getBoundingClientRect();
      const share = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
      this.goToTime(this.timeAtRailShare(share));
    };
    rail.addEventListener("pointerdown", (event) => {
      dragging = true;
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
      const now = this.shownYear ?? present;
      const target =
        event.key === "ArrowUp" || event.key === "ArrowRight"
          ? now + 1
          : event.key === "ArrowDown" || event.key === "ArrowLeft"
            ? now - 1
            : event.key === "Home"
              ? present + 1
              : event.key === "End"
                ? FIRST_YEAR
                : null;
      if (target === null) return;
      event.preventDefault();
      this.goToTime(Math.min(this.scene.data.present, Math.max(FIRST_YEAR, target) + 0.5));
    });
  }

  /** Moves the travel to a time. The camera glides there on its spring, or jumps under reduced motion. */
  private goToTime(time: number) {
    this.scene.scroll.scrollToProgress(progressAtTime(time, this.scene.data.present));
  }

  /** The rail's marker follows the camera, and the slider says the year. Written only when they change. */
  private followCamera() {
    const progress = this.scene.shownProgress();
    const time =
      progress <= STRETCHES.descent || progress >= STRETCHES.before
        ? this.scene.data.present
        : travelTime(Math.min(progress, STRETCHES.travelEnds), this.scene.data.present);
    this.marker.style.top = `${(this.railShare(time) * 100).toFixed(2)}%`;
    this.marker.toggleAttribute(
      "data-lines-travelling",
      progress > STRETCHES.descent && progress < STRETCHES.travelEnds,
    );
    const year = Math.max(FIRST_YEAR, Math.floor(time));
    if (year === this.shownYear) return;
    this.shownYear = year;
    this.marker.textContent = String(year);
    this.rail.setAttribute("aria-valuenow", String(year));
    this.rail.setAttribute("aria-valuetext", String(year));
  }

  private buildSheet() {
    const sheet = this.sheet;
    sheet.hidden = true;
    sheet.dataset.linesControl = "";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "Skills");
    sheet.tabIndex = -1;
    const heading = element("h2", undefined, "Skills");
    const close = element("button", "lines-close");
    close.type = "button";
    close.setAttribute("aria-label", "Close the skills");
    close.append(glyphElement(controlGlyphs.close));
    close.addEventListener("click", () => this.closeSheet());
    const filterLabel = element("label", "lines-filter-label");
    filterLabel.append(glyphElement(controlGlyphs.search), element("span", "lines-hidden", "Filter the skills"));
    this.filter.type = "search";
    this.filter.placeholder = "Filter, for example Py";
    this.filter.autocomplete = "off";
    this.filter.spellcheck = false;
    filterLabel.append(this.filter);
    const groups = element("div", "lines-sheet-groups");
    const groupNames = [...cvSkillGroups.map((group) => group.name), CURRENT_ROLE_GROUP];
    for (const name of groupNames) {
      const words =
        name === CURRENT_ROLE_GROUP
          ? currentRoleSkills
          : cvSkillGroups.find((group) => group.name === name)?.skills.flatMap(wordsOf) ?? [];
      const own = this.skills.filter((skill) => skill.group === name && words.includes(skill.word));
      if (!own.length) continue;
      const block = element("section", "lines-sheet-group");
      block.append(element("h3", undefined, name));
      const list = element("ul");
      for (const skill of own) {
        const item = element("li");
        const button = element("button", "lines-skill-button");
        button.type = "button";
        button.dataset.linesSkill = skill.word;
        button.append(glyphElement(glyphOfSkill(skill)), element("span", undefined, skill.word));
        button.addEventListener("click", () => {
          this.interaction.lightSkill(skill, true);
          if (this.scene.stageSize().width < SHEET_BESIDE_FROM) this.closeSheet();
        });
        item.append(button);
        list.append(item);
      }
      block.append(list);
      groups.append(block);
    }
    this.filter.addEventListener("input", () => this.applyFilter(groups));
    sheet.append(close, heading, filterLabel, groups);
  }

  /** "Py" leaves Python, PyCharm, Pytest and the rest. A group with nothing left hides. */
  private applyFilter(groups: HTMLElement) {
    const wanted = this.filter.value.trim().toLowerCase();
    for (const block of groups.querySelectorAll<HTMLElement>(".lines-sheet-group")) {
      let any = false;
      for (const button of block.querySelectorAll<HTMLElement>("[data-lines-skill]")) {
        const shows = !wanted || (button.dataset.linesSkill ?? "").toLowerCase().includes(wanted);
        (button.parentElement as HTMLElement).hidden = !shows;
        any ||= shows;
      }
      block.hidden = !any;
    }
  }

  openSheet() {
    this.sheet.hidden = false;
    this.skillsButton.setAttribute("aria-expanded", "true");
    // On a touch screen the keyboard waits for a tap on the filter. Focusing it at once would cover half the sheet.
    (this.scene.touch ? this.sheet : this.filter).focus({ preventScroll: true });
  }

  /** Closes the skills sheet, if open. Says whether it did anything. */
  closeSheet() {
    if (this.sheet.hidden) return false;
    this.sheet.hidden = true;
    this.skillsButton.setAttribute("aria-expanded", "false");
    this.skillsButton.focus({ preventScroll: true });
    return true;
  }

  /** The gestures in plain words, in the words of the hand the reader uses. */
  private buildHint() {
    this.hint.hidden = true;
    this.hint.textContent = this.scene.touch
      ? "Tap any light. Swipe to travel through time. Drag sideways to turn. Pinch to zoom."
      : "Click any light. Scroll to travel through time. Drag to turn. Hold Ctrl and scroll to zoom.";
  }

  private hintSeen = false;

  /** Shows the hint once, after the intro, unless it was seen before or a gesture came first. */
  showHintOnce() {
    try {
      if (localStorage.getItem(HINT_SEEN_KEY)) return;
    } catch {
      // Storage refused: show the hint anyway, once for this visit.
    }
    if (this.hintSeen) return;
    this.hint.hidden = false;
    this.scene.titleChangedSize();
  }

  /** The first gesture sends the hint away for good. */
  dismissHint() {
    if (this.hintSeen) return;
    this.hintSeen = true;
    try {
      localStorage.setItem(HINT_SEEN_KEY, "yes");
    } catch {
      // Nothing to keep: it is gone for this visit either way.
    }
    if (this.hint.hidden) return;
    this.hint.dataset.linesLeaving = "";
    window.setTimeout(() => {
      this.hint.hidden = true;
      this.scene.titleChangedSize();
    }, 400);
  }
}

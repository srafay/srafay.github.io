/*
  The board of skills the ride collects. Every skill has a slot from the start, a faint dot, in the CV's groups (each
  group opened by its own glyph), so the reader sees what is filled and what is still to come. When the ride reaches an
  event, each skill it names for the first time leaves the moving point as its mark, flies to its slot and locks in with
  a small crisp pulse; one it names again pulses where it is. The skills no event names arrive together at the finale.
  After the ride a tap on a slot lights that skill in the object, and the board folds into the Skills control.

  The flights are Web Animations of transform and opacity, so they run on the compositor. Their start is the scene's own
  projection of the point and their end is each slot's place, measured once when the board is laid out, so no frame
  reads the page's layout.
*/
import { glyphOfSkill } from "@/lib/about-cv/glyphs";
import { glyphElement, groupGlyphs } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";
import { boardGroups, type CollectionPlan, collectedAfter } from "@/lib/hypercube/collection";
import { litColourOf } from "@/lib/hypercube/shape";
import type { HypercubeScene } from "./hypercube-scene";

/** One mark leaves this often in a burst, in milliseconds, and at most this many fly at once. */
const STAGGER_MILLISECONDS = 80;
const MOST_IN_FLIGHT = 8;
/** How long a mark takes to fly to its slot, how far its path bows up, and how large it starts, in CSS pixels. */
const FLIGHT_MILLISECONDS = 650;
const FLIGHT_BOW = 46;
const FLYING_SIZE = 24;
/** The lock-in pulse, and the gentler one of a skill met again. */
const LOCK_PULSE = [{ transform: "scale(1.35)" }, { transform: "scale(1)" }];
const AGAIN_PULSE = [{ transform: "scale(1.25)" }, { transform: "scale(1)" }];
const PULSE_MILLISECONDS = 160;
/**
  The finale: the slots fill one after another this far apart, in milliseconds, written to the page in steps of about
  a dozen. Every frame that changes the page pays for a paint of it, so twelve steps cost a slow phone far less than
  a change in each of the cascade's 48 frames, or all 115 in one.
*/
const FINALE_STAGGER_MILLISECONDS = 7;
const FINALE_STEP_MILLISECONDS = 70;
/** How long the board folds into the Skills control. */
const FOLD_MILLISECONDS = 600;

type Slot = { skill: SkillWord; cell: HTMLElement; filled: boolean; x: number; y: number };
type Waiting = { slot: Slot; from: { x: number; y: number } };

export class SkillBoard {
  readonly element = element("section", "cube-board");
  private readonly count = element("span", "cube-board-count");
  private readonly caption = element("span", "cube-board-caption");
  private readonly cells = element("div", "cube-board-slots");
  private readonly slots: Slot[] = [];
  private readonly slotOf = new Map<SkillWord, Slot>();
  private readonly waiting: Waiting[] = [];
  private inFlight = 0;
  /** The marks in the air now, so the end of a ride can land them at once. */
  private readonly flights = new Set<Animation>();
  /** Counts the rides: a mark from a ride before this one lands nowhere. */
  private ride = 0;
  private lastLaunch = 0;
  private filledCount = 0;
  /** The stops whose skills are on the board already, by their place in the ride. */
  private reached = -1;
  /** Called when the reader taps a slot after the ride, to light its skill. */
  onPick: (skill: SkillWord) => void = () => {};
  /** How many seconds of the ride pass in one second: a hurried ride sends its marks that much closer together. */
  paceOf: () => number = () => 1;

  constructor(
    private readonly scene: HypercubeScene,
    private readonly plan: CollectionPlan,
  ) {
    this.element.setAttribute("aria-label", "Skills collected on the ride");
    this.element.dataset.cubeControl = "";
    this.element.hidden = true;
    this.caption.setAttribute("aria-hidden", "true");
    const head = element("p", "cube-board-head");
    head.append(this.count, this.caption);
    for (const group of boardGroups(scene.data.skills)) {
      const opener = element("span", "cube-board-group");
      opener.title = group.name;
      opener.append(glyphElement(groupGlyphs[group.name], "cube-icon"));
      this.cells.append(opener);
      for (const skill of group.skills) {
        const cell = element("span", "cube-slot");
        cell.dataset.cubeSkill = skill.word;
        cell.title = skill.word;
        const slot = { skill, cell, filled: false, x: 0, y: 0 };
        this.slots.push(slot);
        this.slotOf.set(skill, slot);
        this.cells.append(cell);
      }
    }
    this.cells.setAttribute("aria-hidden", "true");
    this.element.append(head, this.cells);
    this.element.addEventListener("click", (event) => this.pick(event));
    this.writeCount();
    scene.onFrame(() => {
      this.launch();
      this.cascade(performance.now());
    });
    window.addEventListener("resize", () => this.measure());
  }

  /** Empties every slot for a new ride and shows the board on the stage again, out of the sheet. */
  reset() {
    this.ride++;
    for (const flight of this.flights) flight.cancel();
    this.flights.clear();
    const home = this.element.closest<HTMLElement>(".cube-board-home");
    if (home) {
      home.hidden = true;
      this.scene.elements.stage.append(this.element);
    }
    for (const slot of this.slots) this.empty(slot);
    this.waiting.length = 0;
    this.inFlight = 0;
    this.finaleWaiting = false;
    this.cascadeSlots = [];
    this.cascadeFilled = 0;
    this.filledCount = 0;
    this.reached = -1;
    this.caption.textContent = "";
    this.element.hidden = false;
    this.element.removeAttribute("data-cube-folded");
    this.writeCount();
    requestAnimationFrame(() => this.measure());
  }

  /** Where each slot's middle is on the stage, read once when the board is laid out or the window changes. */
  measure() {
    if (this.element.hidden) return;
    for (const slot of this.slots) {
      const box = slot.cell.getBoundingClientRect();
      slot.x = box.left + box.width / 2;
      slot.y = box.top + box.height / 2;
    }
  }

  /**
    The ride has reached a stop. Every stop up to it puts its skills on the board: the stop just reached sends its new
    marks flying from the point and pulses the ones met again; any stop jumped past fills its slots at once.
  */
  reach(index: number, from: { x: number; y: number } | null) {
    if (index <= this.reached) return;
    for (let stop = this.reached + 1; stop <= index; stop++) {
      const { added, metAgain } = this.plan.stops[stop];
      const flies = stop === index && from !== null && !this.scene.reducedMotion;
      for (const skill of added) {
        const slot = this.slotOf.get(skill) as Slot;
        if (flies) this.waiting.push({ slot, from });
        else this.fill(slot, false);
      }
      if (stop === index) for (const skill of metAgain) this.pulse(this.slotOf.get(skill) as Slot, AGAIN_PULSE);
    }
    this.reached = index;
  }

  /** Asked for while marks still fly, the finale waits for the last of them to land. */
  private finaleWaiting = false;
  /** The finale's slots in the order they fill, how many have filled, and when the cascade began. */
  private cascadeSlots: Slot[] = [];
  private cascadeFilled = 0;
  private cascadeStarted = 0;
  private cascadeStepped = 0;

  /** The finale: the skills no event names fill their slots in one cascade, and the count reaches the whole. */
  finale() {
    if (this.waiting.length || this.inFlight) {
      this.finaleWaiting = true;
      return;
    }
    this.finaleWaiting = false;
    const left = this.plan.finale.filter((skill) => !this.slotOf.get(skill)?.filled);
    if (!left.length) return;
    this.caption.textContent = `And ${left.length} more that the CV lists.`;
    this.cascadeSlots = left.map((skill) => this.slotOf.get(skill) as Slot);
    this.cascadeFilled = 0;
    this.cascadeStarted = performance.now();
    this.cascadeStepped = -Infinity;
    if (this.scene.reducedMotion) this.cascade(Infinity);
    this.scene.requestFrame();
  }

  /** Fills the finale's slots whose turn has come by now, a step at a time. */
  private cascade(now: number) {
    if (this.cascadeFilled >= this.cascadeSlots.length) return;
    if (now - this.cascadeStepped < FINALE_STEP_MILLISECONDS) return this.scene.requestFrame();
    this.cascadeStepped = now;
    const due = Math.min(this.cascadeSlots.length, Math.floor((now - this.cascadeStarted) / FINALE_STAGGER_MILLISECONDS) + 1);
    for (; this.cascadeFilled < due; this.cascadeFilled++) {
      const slot = this.cascadeSlots[this.cascadeFilled];
      this.fill(slot, false, false);
    }
    if (this.cascadeFilled < this.cascadeSlots.length) this.scene.requestFrame();
  }

  /** The ride is over: marks still waiting take their slots at once, and marks in the air land now. */
  landEverything() {
    for (const { slot } of this.waiting.splice(0)) this.fill(slot, false);
    for (const flight of this.flights) flight.finish();
    this.cascade(Infinity);
  }

  /** Straight to the end: every slot filled, nothing flying. */
  fillEverything() {
    this.landEverything();
    this.finaleWaiting = false;
    for (const slot of this.slots) if (!slot.filled) this.fill(slot, false, false);
    this.reached = this.plan.stops.length - 1;
    this.caption.textContent = "";
    this.writeCount();
  }

  isFull() {
    return this.filledCount === this.slots.length;
  }

  /** Folds the board into the Skills control, then hands it to the sheet, where it stays. */
  foldInto(control: HTMLElement, sheet: HTMLElement) {
    const settle = () => {
      this.element.setAttribute("data-cube-folded", "");
      this.caption.textContent = "";
      const home = sheet.querySelector<HTMLElement>(".cube-board-home");
      if (home) {
        home.hidden = false;
        home.append(this.element);
      }
      control.animate(LOCK_PULSE, { duration: PULSE_MILLISECONDS * 2, easing: "ease-out" });
    };
    if (this.element.hidden || this.scene.reducedMotion) return settle();
    const from = this.element.getBoundingClientRect();
    const to = control.getBoundingClientRect();
    const across = to.left + to.width / 2 - (from.left + from.width / 2);
    const down = to.top + to.height / 2 - (from.top + from.height / 2);
    this.element
      .animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: `translate(${across}px, ${down}px) scale(0.08)`, opacity: 0 },
        ],
        { duration: FOLD_MILLISECONDS, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
      )
      .finished.then(settle, settle);
  }

  /** For the checks: the slots filled, the count the plan gives by the stop reached, the marks in the air, the caption. */
  report() {
    return {
      filled: this.filledCount,
      planned: collectedAfter(this.plan, this.reached),
      of: this.slots.length,
      inFlight: this.inFlight,
      waiting: this.waiting.length,
      caption: this.caption.textContent,
      folded: this.element.hasAttribute("data-cube-folded"),
    };
  }

  /** Sends the next waiting mark on its way, one every STAGGER_MILLISECONDS and never more than MOST_IN_FLIGHT. */
  private launch() {
    if (!this.waiting.length || this.inFlight >= MOST_IN_FLIGHT) return;
    const now = performance.now();
    if (now - this.lastLaunch < STAGGER_MILLISECONDS / Math.max(1, this.paceOf())) return;
    this.lastLaunch = now;
    const { slot, from } = this.waiting.shift() as Waiting;
    this.fly(slot, from);
    this.scene.requestFrame();
  }

  private fly(slot: Slot, from: { x: number; y: number }) {
    const mark = element("div", "cube-flying");
    mark.setAttribute("aria-hidden", "true");
    mark.style.color = litColourOf(slot.skill, this.scene.data.events);
    mark.append(glyphElement(glyphOfSkill(slot.skill), "cube-icon"));
    this.scene.elements.stage.append(mark);
    const size = slot.cell.getBoundingClientRect().width || FLYING_SIZE;
    const start = `translate(${from.x - FLYING_SIZE / 2}px, ${from.y - FLYING_SIZE / 2}px) scale(1)`;
    const middle = `translate(${(from.x + slot.x) / 2 - FLYING_SIZE / 2}px, ${Math.min(from.y, slot.y) - FLIGHT_BOW - FLYING_SIZE / 2}px) scale(0.8)`;
    const end = `translate(${slot.x - FLYING_SIZE / 2}px, ${slot.y - FLYING_SIZE / 2}px) scale(${(size * 0.8) / FLYING_SIZE})`;
    this.inFlight++;
    const ride = this.ride;
    const flight = mark.animate(
      [
        { transform: start, opacity: 0 },
        { transform: start, opacity: 1, offset: 0.08 },
        { transform: middle, opacity: 1, offset: 0.5 },
        { transform: end, opacity: 1 },
      ],
      { duration: FLIGHT_MILLISECONDS, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
    );
    const land = () => {
      mark.remove();
      this.flights.delete(flight);
      if (ride !== this.ride) return;
      this.inFlight--;
      this.fill(slot, true);
      if (this.finaleWaiting && !this.inFlight && !this.waiting.length) this.finale();
    };
    this.flights.add(flight);
    flight.finished.then(land, land);
  }

  /** A slot takes its skill's mark, in the skill's own colour, and the count follows. */
  private fill(slot: Slot, withPulse: boolean, named = true) {
    if (slot.filled) return;
    slot.filled = true;
    this.filledCount++;
    slot.cell.style.color = litColourOf(slot.skill, this.scene.data.events);
    slot.cell.replaceChildren(glyphElement(glyphOfSkill(slot.skill), "cube-icon"));
    slot.cell.setAttribute("data-cube-filled", "");
    if (named) this.caption.textContent = `+ ${slot.skill.word}`;
    if (withPulse) this.pulse(slot, LOCK_PULSE);
    this.writeCount();
  }

  private empty(slot: Slot) {
    slot.filled = false;
    slot.cell.replaceChildren();
    slot.cell.style.color = "";
    slot.cell.removeAttribute("data-cube-filled");
  }

  private pulse(slot: Slot, keyframes: Keyframe[]) {
    if (!slot.filled || this.scene.reducedMotion) return;
    slot.cell.animate(keyframes, { duration: PULSE_MILLISECONDS, easing: "ease-out" });
  }

  private writeCount() {
    this.count.textContent = `Skills ${this.filledCount} of ${this.slots.length}`;
  }

  /** After the ride, a tap on the board lights the skill of the nearest filled slot, as the sheet does. */
  private pick(event: MouseEvent) {
    if (this.waiting.length || this.inFlight) return;
    let best: Slot | null = null;
    let bestDistance = Infinity;
    for (const slot of this.slots) {
      if (!slot.filled) continue;
      const box = slot.cell.getBoundingClientRect();
      const distance = Math.hypot(box.left + box.width / 2 - event.clientX, box.top + box.height / 2 - event.clientY);
      if (distance < bestDistance) {
        best = slot;
        bestDistance = distance;
      }
    }
    if (best && bestDistance <= 18) this.onPick(best.skill);
  }
}

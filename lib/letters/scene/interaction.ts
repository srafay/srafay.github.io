/*
  What the reader's touches do to the land. A tap opens what it lands on: an event's card (its letters fly into it), a
  city's card from the ground, or a skill from the sky. A double tap flies there and zooms in to read. Pointing (on a
  computer) brightens the event under the pointer and names it in a small tag. A lit skill lights every event that
  names it and frames them. Each owner's state on the land (lit, dimmed, lifted into the open card) is worked out in
  one place, ownerStates, from what is open and lit now.
*/
import { skillAnswer } from "@/lib/about-cv/answers";
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { glyphElement, placeGlyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { ScrollReader } from "@/lib/about-cv/scene/scroll";
import type { SkillWord } from "@/lib/about-cv/skills";
import type { WorldKey } from "@/lib/about-cv/worlds";
import { cities } from "@/lib/letters/land/cities";
import { yOfHeight } from "@/lib/letters/land/grid";
import type { EventOnLand } from "@/lib/letters/land/land";
import { landTints, present } from "@/lib/letters/palette";
import { Card } from "./cards";
import { Flight } from "./flight";
import type { LettersScene } from "./letters-scene";
import { READING_ZOOM } from "./view";

/** How long a tap waits before it opens, in milliseconds: long enough for a second tap to make it a double tap. */
const DOUBLE_TAP_WAIT = 260;
/** How long a lit skill's word takes to come down to the land, in seconds. */
const DESCENT_SECONDS = 1.1;
/** How dim the open event's letters stay on the land while its card is open: they have flown into it. */
const LIFTED = 0.85;

export class Interaction {
  readonly card: Card;
  readonly answer = element("div", "letters-answer letters-panel");
  readonly tag = element("p", "letters-tag");
  readonly flight: Flight;
  litSkill: SkillWord | null = null;
  isolated: WorldKey | null = null;
  /** What a search holds now: the events and cities that spell it, or null with no search. */
  searching: { events: Set<string>; cities: Set<number> } | null = null;
  private hovered: EventOnLand | null = null;
  private descentStarted = 0;
  private pendingTap = 0;
  /** Called when a card or an answer opens or closes, so the controls can measure what they keep clear. */
  onChange: () => void = () => {};

  constructor(
    private readonly scene: LettersScene,
    private readonly travel: ScrollReader,
  ) {
    const { data } = scene;
    this.card = new Card({
      events: data.events,
      skills: data.skills,
      onClose: () => this.closeCard(),
      onSkill: (skill) => this.lightSkill(skill),
      onEvent: (event) => this.openEvent(this.itemOf(event), null, true),
    });
    this.flight = new Flight(scene);
    this.answer.hidden = true;
    this.answer.setAttribute("aria-live", "polite");
    this.answer.dataset.lettersControl = "";
    this.tag.hidden = true;
    scene.elements.stage.append(this.card.panel, this.answer, this.tag);
    scene.onFrame(() => this.stepDescent());
  }

  itemOf(event: WorldEvent) {
    return this.scene.data.land.events.find((item) => item.event.id === event.id) as EventOnLand;
  }

  /** A tap opens what it lands on, once the moment for a second tap has passed. */
  tap(x: number, y: number) {
    const picked = this.scene.pick(x, y);
    window.clearTimeout(this.pendingTap);
    this.pendingTap = window.setTimeout(() => {
      if (!picked) return void this.closeCard();
      if (picked.kind === "skill") return this.lightSkill(this.scene.data.skills[picked.index]);
      if (picked.kind === "city") return this.openCity(picked.index);
      this.openEvent(picked.item, { x, y });
    }, DOUBLE_TAP_WAIT);
  }

  /** Flies to what lies under a double tap and zooms in to reading distance. */
  doubleTap(x: number, y: number) {
    window.clearTimeout(this.pendingTap);
    const picked = this.scene.pick(x, y);
    if (!picked || picked.kind === "skill") return;
    const { land } = this.scene.data;
    const row = Math.floor(picked.cell / land.grid.columns);
    const column = picked.cell % land.grid.columns;
    this.travel.scrollToProgress(this.scene.view.travelAtRow(row));
    this.scene.view.columnTarget = column;
    this.scene.view.zoomTarget = READING_ZOOM;
    this.scene.requestFrame();
  }

  /** Opens an event's card. From a tap, its letters fly in from the land; otherwise (a key, Next) it simply shows. */
  openEvent(item: EventOnLand, from: { x: number; y: number } | null, keepFocus = false) {
    this.flight.cancel();
    this.card.showEvent(item.event, keepFocus);
    this.applyOwnerStates();
    this.onChange();
    const words = this.card.words();
    if (!from || this.scene.reducedMotion || !words) {
      this.card.panel.dataset.lettersFading = "";
      if (!keepFocus) this.card.panel.focus({ preventScroll: true });
      return;
    }
    delete this.card.panel.dataset.lettersFading;
    this.card.panel.dataset.lettersArriving = "";
    const colour = item.event.isPresent ? present : landTints.readable;
    requestAnimationFrame(() => {
      this.flight.fly(item, words, this.card.panel.getBoundingClientRect(), from, colour, () => {
        delete this.card.panel.dataset.lettersArriving;
      });
      this.card.panel.focus({ preventScroll: true });
    });
  }

  openCity(index: number) {
    this.flight.cancel();
    this.card.showCity(cities[index]);
    this.card.panel.dataset.lettersFading = "";
    this.applyOwnerStates();
    this.onChange();
    this.card.panel.focus({ preventScroll: true });
  }

  closeCard() {
    this.flight.cancel();
    if (!this.card.close()) return false;
    this.applyOwnerStates();
    this.onChange();
    return true;
  }

  /** Lights a skill: its word comes down to the land, every event naming it lights, and the camera frames them. */
  lightSkill(skill: SkillWord) {
    const { scene } = this;
    this.closeCard();
    this.litSkill = skill;
    const index = scene.data.skills.indexOf(skill);
    scene.litWords = new Set([index]);
    const eventsById = new Map(scene.data.events.map((event) => [event.id, event]));
    const said = skillAnswer(skill, eventsById);
    const lit = said.events.map((event) => this.itemOf(event));
    this.writeAnswer(skill, said.sentence);
    if (lit.length) {
      const newest = lit[0];
      const centre = scene.centreOf(newest);
      scene.sky.descending = index;
      scene.sky.descentTo = [centre[0], centre[1] + yOfHeight(1.5), centre[2]];
      this.descentStarted = performance.now();
      scene.sky.descent = scene.reducedMotion ? 1 : 0;
      this.frameEvents(lit);
    } else scene.sky.descending = -1;
    scene.sky.fade = 1;
    this.applyOwnerStates();
    this.onChange();
    scene.requestFrame();
  }

  clearSkill() {
    if (!this.litSkill) return false;
    this.litSkill = null;
    this.scene.litWords = new Set();
    this.scene.sky.descending = -1;
    this.scene.sky.descent = 0;
    this.scene.sky.fade = 0;
    this.answer.hidden = true;
    this.applyOwnerStates();
    this.onChange();
    this.scene.requestFrame();
    return true;
  }

  private stepDescent() {
    const { sky } = this.scene;
    if (sky.descending < 0 || sky.descent >= 1) return false;
    sky.descent = Math.min(1, (performance.now() - this.descentStarted) / 1000 / DESCENT_SECONDS);
    return true;
  }

  private writeAnswer(skill: SkillWord, sentence: string) {
    const name = element("strong");
    name.append(glyphElement(glyphOfSkill(skill), "letters-icon"), skill.word);
    const clear = element("button", "letters-clear", "Clear");
    clear.type = "button";
    clear.addEventListener("click", () => this.clearSkill());
    this.answer.replaceChildren(name, ` ${sentence} `, clear);
    this.answer.hidden = false;
  }

  /**
   * Brings a set of events into view: the travel to the middle of their crests, the camera over their middle column,
   * and the nearest zoom at which every crest stands in the open part of the screen.
   */
  frameEvents(items: EventOnLand[]) {
    if (!items.length) return;
    const { view } = this.scene;
    const crests = items.map((item) => item.crestRow);
    const columns = items.map((item) => item.track.left + item.track.width / 2);
    const row = (Math.min(...crests) + Math.max(...crests)) / 2;
    const column = (Math.min(...columns) + Math.max(...columns)) / 2;
    this.travel.scrollToProgress(view.travelAtRow(row));
    view.columnTarget = column;
    const travelRow = view.rowAtTravel(view.travelAtRow(row));
    view.zoomTarget = view.zoomToFit(items.map((item) => this.scene.crestPoint(item)), travelRow, column, this.openArea());
    this.scene.requestFrame();
  }

  /** The part of the screen clear of the bars, the rail, the switches and the answer line. */
  private openArea() {
    const { width, height } = this.scene.view.size();
    return { left: 24, top: 90, right: width - 64, bottom: height - (width < 900 ? 270 : 170) };
  }

  /** Isolates a world: the others fall back, and the camera leans over its lane. */
  isolate(world: WorldKey | null) {
    this.isolated = world;
    this.applyOwnerStates();
    if (world) this.frameEvents(this.scene.data.land.events.filter((item) => item.event.world === world));
    else this.scene.view.columnTarget = null;
    this.scene.requestFrame();
  }

  /** Each owner's state on the land, from what is open, lit, isolated and pointed at now. */
  applyOwnerStates() {
    const { scene } = this;
    const { land } = scene.data;
    const litIds = new Set(this.litSkill?.events ?? []);
    const openId = this.card.showing?.kind === "event" ? this.card.showing.event.id : null;
    for (const item of land.events) {
      const lit = litIds.has(item.event.id) || this.hovered === item;
      const outOfFocus =
        (this.litSkill !== null && !litIds.has(item.event.id)) ||
        (this.isolated !== null && item.event.world !== this.isolated) ||
        (this.searching !== null && !this.searching.events.has(item.event.id));
      scene.landLayer.setOwner(item.index, {
        kind: item.event.isPresent ? 1 : 0,
        light: lit ? 1 : 0,
        dim: outOfFocus ? 1 : 0,
        lifted: item.event.id === openId ? LIFTED : 0,
      });
    }
    // The events in focus: a lit skill's, an isolated lane's, a search's. Those too far to read get their names.
    scene.focusEvents = new Set(
      land.events
        .filter(
          (item) =>
            litIds.has(item.event.id) ||
            (this.isolated !== null && item.event.world === this.isolated) ||
            (this.searching?.events.has(item.event.id) ?? false),
        )
        .map((item) => item.index),
    );
    for (let index = 0; index < cities.length; index++)
      scene.landLayer.setOwner(land.cityOwner(index), {
        kind: 2,
        light: 0,
        dim:
          (this.litSkill !== null || this.isolated !== null || this.searching !== null) && !this.searching?.cities.has(index) ? 0.6 : 0,
        lifted: 0,
      });
    scene.requestFrame();
  }

  /** A computer's pointer over the land: the event under it brightens and a tag names it. */
  hover(x: number, y: number) {
    const picked = this.scene.pick(x, y);
    const item = picked?.kind === "event" ? picked.item : null;
    const stage = this.scene.elements.stage;
    if (picked) stage.dataset.lettersHovering = "";
    else delete stage.dataset.lettersHovering;
    if (picked?.kind === "city") this.showTag(placeGlyph, cities[picked.index].name, x, y);
    else if (picked?.kind === "skill") this.tag.hidden = true;
    else if (item) this.showTag(glyphOfEvent(item.event), item.event.label, x, y);
    else this.tag.hidden = true;
    if (item === this.hovered) return;
    this.hovered = item;
    this.applyOwnerStates();
  }

  leave() {
    this.tag.hidden = true;
    delete this.scene.elements.stage.dataset.lettersHovering;
    if (!this.hovered) return;
    this.hovered = null;
    this.applyOwnerStates();
  }

  private showTag(glyph: Parameters<typeof glyphElement>[0], text: string, x: number, y: number) {
    const words = element("span");
    words.append(glyphElement(glyph, "letters-icon"), text);
    this.tag.replaceChildren(words);
    this.tag.hidden = false;
    this.tag.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y - 34)}px)`;
  }

  /** Flies to an event, as a search steps to it: its time, its lane, a little closer, and it brightens. */
  flyTo(item: EventOnLand) {
    const { view } = this.scene;
    this.travel.scrollToProgress(view.travelAtRow((item.rows[0] + item.rows[1]) / 2));
    view.columnTarget = item.track.left + item.track.width / 2;
    view.zoomTarget = -0.5;
    this.hovered = item;
    this.applyOwnerStates();
  }

  /** Flies to the middle of a city's years on the ground. */
  flyToCity(index: number) {
    const { view } = this.scene;
    const { grid } = this.scene.data.land;
    const until = cities[index + 1]?.from ?? grid.present;
    this.travel.scrollToProgress(view.travelAtRow(grid.rowAt((cities[index].from + until) / 2)));
    view.columnTarget = null;
    view.zoomTarget = 0.3;
    this.scene.requestFrame();
  }

  /** Steps back one thing: the card, then the lit skill. Says whether it did. */
  stepBack() {
    return this.closeCard() || this.clearSkill();
  }
}

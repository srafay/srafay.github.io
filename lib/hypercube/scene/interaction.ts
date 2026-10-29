/*
  How the object answers a hand. A tap picks a bead right under the finger, then a skill or a city drawn as a word
  there, then the nearest bead within 24 pixels. A bead answers at once with a ring, then its card opens, with its
  world's tone when sound is on. A skill lights: its dust flies to the events that name it, they light, and a line says
  where it was used. A city opens what happened there. A tap on nothing clears. A double tap on a bead flies there: the
  slice moves to its year and the camera comes close. A double tap on empty space lays time out in a line, or folds
  it back. On a computer the pointer names what it is over before any click.

  The stage fills the window and never moves, so a pointer's place on the screen is its place on the stage: no
  gesture reads the page's layout.
*/
import { stays } from "@/content/about/profile";
import { skillAnswer } from "@/lib/about-cv/answers";
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { glyphElement, placeGlyph, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";
import { timeAtStartOf } from "@/lib/about-cv/time";
import { cardHeading, closeButton, fillEventCard, neighboursOf } from "@/lib/about-cv/ui/event-card";
import { beadTime, litColourOf } from "@/lib/hypercube/shape";
import type { HypercubeScene } from "./hypercube-scene";
import type { Sound } from "./sound";

/** How far from a bead a tap may land and still pick it, in pixels. A pointer hovering needs to be nearer. */
const TAP_REACH = 24;
/** A tap this near a bead is on it, ahead of any word round it. */
const SURE_REACH = 12;
const HOVER_REACH = 14;
/** The card follows the ring by this much, so the ring is seen answering first. */
const CARD_DELAY_MILLISECONDS = 140;
/** A double tap on a bead zooms in this far, from 0 (the whole) toward -1 (nearest). */
const FLOWN_ZOOM = -0.6;

const PREFIX = "cube";

export class Interaction {
  readonly answer = element("p", "cube-answer");
  readonly card = element("section", "cube-card");
  readonly ring = element("div", "cube-ring");
  readonly tag = element("p", "cube-focus-label");
  private ringEvent: WorldEvent | null = null;
  private cardTimer = 0;
  private hoverPending = false;
  /** Called when a card opens or closes or a skill is lit, so the controls can follow (the hint, the readouts). */
  onChange: () => void = () => {};
  /** Asks the controls to lay time out in a line, or fold it back. */
  onEmptyDoubleTap: () => void = () => {};
  /** Asks the controls to bring a year into focus, moving the travel there. */
  goToYear: (year: number) => void = () => {};

  constructor(
    private readonly scene: HypercubeScene,
    private readonly sound: Sound,
  ) {
    const stage = scene.elements.stage;
    this.answer.hidden = true;
    this.answer.setAttribute("aria-live", "polite");
    this.answer.dataset.cubeControl = "";
    this.card.hidden = true;
    this.card.setAttribute("role", "dialog");
    this.card.setAttribute("aria-label", "About this point in time");
    this.card.dataset.cubeControl = "";
    this.card.addEventListener("keydown", (event) => this.stepWithArrows(event));
    this.ring.hidden = true;
    this.ring.setAttribute("aria-hidden", "true");
    this.tag.hidden = true;
    this.tag.setAttribute("aria-hidden", "true");
    stage.append(this.ring, this.tag, this.answer, this.card);
    scene.onFrame(() => this.placeRing());
  }

  private get events() {
    return this.scene.data.events;
  }

  private get skills() {
    return this.scene.data.skills;
  }

  /** The nearest shown bead within a reach of a point on the stage. */
  private nearestBead(x: number, y: number, reach: number) {
    let best: WorldEvent | null = null;
    let bestDistance = reach;
    for (const event of this.events) {
      if (!this.scene.beadIsShown(event)) continue;
      const place = this.scene.beadOnStage(event);
      if (!place) continue;
      const distance = Math.hypot(place.x - x, place.y - y);
      if (distance <= bestDistance) {
        best = event;
        bestDistance = distance;
      }
    }
    return best;
  }

  private static inside(rectangle: { left: number; right: number; top: number; bottom: number }, x: number, y: number, reach: number) {
    return x >= rectangle.left - reach && x <= rectangle.right + reach && y >= rectangle.top - reach && y <= rectangle.bottom + reach;
  }

  private skillAt(x: number, y: number) {
    const labels = this.scene.labels;
    const hit = labels?.placedSkills.find(({ rectangle }) => Interaction.inside(rectangle, x, y, 6));
    return hit ? (labels?.labels[hit.index].skill ?? null) : null;
  }

  private cityAt(x: number, y: number) {
    const labels = this.scene.labels;
    const hit = labels?.placedCities.find(({ rectangle }) => Interaction.inside(rectangle, x, y, 4));
    return hit ? (labels?.labels[hit.index].city ?? null) : null;
  }

  /** Answers a tap. Says whether it opened or lit something (a ride pauses for that), rather than only clearing. */
  tap(x: number, y: number) {
    const sure = this.nearestBead(x, y, SURE_REACH);
    const skill = sure ? null : this.skillAt(x, y);
    const city = sure || skill ? null : this.cityAt(x, y);
    const near = sure || skill || city ? null : this.nearestBead(x, y, TAP_REACH);
    if (sure ?? near) this.openEvent((sure ?? near) as WorldEvent);
    else if (skill) this.lightSkill(skill);
    else if (city) this.openPlace(city);
    else {
      this.clear();
      return false;
    }
    return true;
  }

  doubleTap(x: number, y: number) {
    const bead = this.nearestBead(x, y, TAP_REACH);
    if (!bead) return this.onEmptyDoubleTap();
    this.flyTo(bead);
  }

  /** Flies to an event: its year comes into focus and the camera comes close. */
  flyTo(event: WorldEvent) {
    this.goToYear(Math.floor(beadTime(event, this.scene.data.present)));
    this.scene.flyTo(event);
    this.scene.zoom.zoomTo(FLOWN_ZOOM);
    this.scene.requestFrame();
  }

  hover(x: number, y: number) {
    if (this.hoverPending) return;
    this.hoverPending = true;
    requestAnimationFrame(() => {
      this.hoverPending = false;
      this.hoverAt(x, y);
    });
  }

  private hoverAt(x: number, y: number) {
    const bead = this.nearestBead(x, y, HOVER_REACH);
    if (bead) return this.showTag(glyphOfEvent(bead), bead.label, x, y);
    const skill = this.skillAt(x, y);
    if (skill) return this.showTag(glyphOfSkill(skill), skill.word, x, y);
    const city = this.cityAt(x, y);
    if (city) return this.showTag(placeGlyph, city, x, y);
    this.leave();
  }

  private showTag(glyph: Glyph, text: string, x: number, y: number) {
    const holder = element("span");
    holder.append(glyphElement(glyph, "cube-icon"), element("span", undefined, text));
    this.tag.replaceChildren(holder);
    this.tag.hidden = false;
    const onLeftHalf = x < this.scene.stageSize().width / 2;
    this.tag.style.transform = onLeftHalf
      ? `translate(${(x + 18).toFixed(1)}px, ${(y - 34).toFixed(1)}px)`
      : `translate(calc(${(x - 18).toFixed(1)}px - 100%), ${(y - 34).toFixed(1)}px)`;
    this.scene.elements.stage.style.cursor = "pointer";
  }

  leave() {
    if (this.tag.hidden && this.scene.elements.stage.style.cursor === "") return;
    this.tag.hidden = true;
    this.scene.elements.stage.style.cursor = "";
  }

  /** The keyboard's focus: the ring on an event's bead with its name beside it, nothing lit until Enter. */
  showFocus(event: WorldEvent) {
    this.ringEvent = event;
    this.ring.hidden = false;
    const holder = element("span");
    holder.append(glyphElement(glyphOfEvent(event), "cube-icon"), element("span", undefined, event.label));
    this.tag.replaceChildren(holder);
    this.tag.hidden = false;
    this.placeRing(true);
  }

  hideFocus() {
    this.tag.hidden = true;
    if (!this.scene.focus.openEvent) {
      this.ring.hidden = true;
      this.ringEvent = null;
    }
  }

  openEvent(event: WorldEvent, fly = false) {
    if (fly) this.flyTo(event);
    this.scene.openEvent(event);
    this.ringEvent = event;
    this.ring.hidden = false;
    this.answer.hidden = true;
    this.sound.tone(event.world);
    this.placeRing();
    window.clearTimeout(this.cardTimer);
    const show = () => this.fillCard(event, fly);
    if (this.scene.reducedMotion) show();
    else this.cardTimer = window.setTimeout(show, CARD_DELAY_MILLISECONDS);
    this.onChange();
  }

  private fillCard(event: WorldEvent, keepFocus: boolean) {
    const refocus = fillEventCard(
      this.card,
      event,
      {
        prefix: PREFIX,
        events: this.events,
        skills: this.skills,
        onClose: () => this.closeCard(),
        onSkill: (skill) => this.lightSkill(skill),
        onStep: (target) => this.openEvent(target, true),
      },
      keepFocus,
    );
    const place = this.scene.beadOnStage(event);
    this.card.dataset.cubeAt = place && place.y > this.scene.stageSize().height * 0.5 ? "top" : "bottom";
    this.card.hidden = false;
    refocus();
  }

  /** Lights a skill: its dust flies to its events, and the answer line names them. */
  lightSkill(skill: SkillWord) {
    this.closeCard(false);
    this.scene.lightSkill(skill);
    this.ringEvent = null;
    this.ring.hidden = true;
    const said = skillAnswer(skill, new Map(this.events.map((event) => [event.id, event])));
    const name = element("strong");
    const mark = glyphElement(glyphOfSkill(skill), "cube-icon");
    mark.style.color = litColourOf(skill, this.events);
    name.append(mark, said.skill);
    const clear = element("button", "cube-clear", "Clear");
    clear.type = "button";
    clear.addEventListener("click", () => this.clear());
    this.answer.replaceChildren(name, ` ${said.sentence} `, clear);
    this.answer.hidden = false;
    this.onChange();
  }

  /** A city's card: its years, and the events placed there, each a way into its own card. */
  openPlace(city: string) {
    const stay = stays.find((candidate) => candidate.city === city);
    if (!stay) return;
    this.scene.openEvent(null);
    this.scene.lightSkill(null);
    this.ringEvent = null;
    this.ring.hidden = true;
    this.answer.hidden = true;
    const from = timeAtStartOf(stay.from);
    const to = stay.to ? timeAtStartOf(stay.to) : this.scene.data.present;
    const happened = this.events
      .filter((event) => event.place?.includes(city))
      .sort((first, second) => second.start - first.start);
    const list = element("ul", "cube-card-skills");
    for (const event of happened) {
      const item = element("li");
      const button = element("button", "cube-skill-button");
      button.type = "button";
      button.append(glyphElement(glyphOfEvent(event), "cube-icon"), event.label);
      button.addEventListener("click", () => this.openEvent(event, true));
      item.append(button);
      list.append(item);
    }
    this.card.replaceChildren(
      closeButton(PREFIX, () => this.closeCard()),
      cardHeading(PREFIX, placeGlyph, city),
      element("p", "cube-card-meta", `${Math.floor(from)} to ${stay.to ? Math.floor(to) : "now"}`),
      element("p", "cube-card-meta", "What happened here"),
      list,
    );
    this.card.dataset.cubeAt = "bottom";
    this.card.hidden = false;
    this.onChange();
  }

  /** Closes the card. With alsoClear, an open event's light goes too. */
  closeCard(alsoClear = true) {
    window.clearTimeout(this.cardTimer);
    const wasOpen = !this.card.hidden;
    this.card.hidden = true;
    if (alsoClear && wasOpen && !this.scene.focus.litSkill) this.clear();
  }

  clear() {
    this.closeCard(false);
    this.scene.openEvent(null);
    this.scene.lightSkill(null);
    this.ringEvent = null;
    this.ring.hidden = true;
    this.answer.hidden = true;
    this.onChange();
  }

  /** Escape: the card closes first, then the lit skill clears. Says whether it did anything. */
  stepBack() {
    if (!this.card.hidden) {
      this.closeCard();
      return true;
    }
    if (this.scene.focus.isSelecting()) {
      this.clear();
      return true;
    }
    return false;
  }

  /** Left and Right step the open card along its world, as its Previous and Next do. */
  private stepWithArrows(event: KeyboardEvent) {
    const open = this.scene.focus.openEvent;
    if (!open) return;
    const { previous, next } = neighboursOf(open, this.events);
    const target = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : null;
    if (!target) return;
    event.preventDefault();
    this.openEvent(target, true);
  }

  /** The ring stays on its bead while the object turns, and a keyboard's tag stays beside it. */
  private placeRing(withTag = false) {
    if (!this.ringEvent || this.ring.hidden) return;
    const place = this.scene.beadOnStage(this.ringEvent);
    if (!place) {
      this.ring.style.opacity = "0";
      return;
    }
    this.ring.style.opacity = "1";
    this.ring.style.transform = `translate(${place.x.toFixed(1)}px, ${place.y.toFixed(1)}px)`;
    if (withTag || (!this.tag.hidden && this.scene.elements.stage.style.cursor === "")) {
      const onLeftHalf = place.x < this.scene.stageSize().width / 2;
      this.tag.style.transform = onLeftHalf
        ? `translate(${(place.x + 24).toFixed(1)}px, ${(place.y - 14).toFixed(1)}px)`
        : `translate(calc(${(place.x - 24).toFixed(1)}px - 100%), ${(place.y - 14).toFixed(1)}px)`;
    }
  }
}

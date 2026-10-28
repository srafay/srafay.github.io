/*
  How the scene answers a tap. A tap picks a bead right under the finger, then a word under it, then the nearest bead
  within 24 pixels, a 48 pixel target. The bead answers at once with its ring and its lit label, then its card opens. A card steps to the earlier or later
  event on its own line, and the camera follows. A tap on a skill's word lights the skill: its events and threads
  glow, and a line says where it was used. The camera goes to its first event. A tap on a city opens what happened
  there. A tap on nothing clears. A double tap flies to what it lands on and zooms in on it.

  On a computer, the pointer over a bead or a word names it before any click. A finger on a word brightens it before
  it lifts. The gestures themselves are read in gestures.ts.
*/
import * as THREE from "three";
import { stays } from "@/content/about/profile";
import { cardMeta, skillAnswer } from "@/lib/world-lines/answers";
import type { WorldEvent } from "@/lib/world-lines/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/world-lines/glyphs";
import {
  controlGlyphs,
  glyphElement,
  placeGlyph,
  type Glyph,
} from "@/lib/world-lines/icons";
import type { SkillWord } from "@/lib/world-lines/skills";
import { timeAtStartOf } from "@/lib/world-lines/time";
import { progressAtTime, YEARS_BEHIND_A_MOMENT } from "./camera";
import { element } from "./dom";
import type { Lighting } from "./lighting";
import type { WorldLinesScene } from "./mount";

/** How far from a bead a tap may land and still pick it, in pixels. A pointer hovering needs to be nearer. */
const TAP_REACH = 24;
/** A tap this near a bead is on it, ahead of any word around it. */
const SURE_REACH = 12;
const HOVER_REACH = 14;
/** The card follows the ring by this much, so the ring is seen answering first. */
const CARD_DELAY_MILLISECONDS = 140;
/** A double tap zooms in to here: about halfway from the travel's own view to the nearest. */
const DOUBLE_TAP_ZOOM = -0.55;

export type Chosen =
  | { kind: "event"; event: WorldEvent }
  | { kind: "skill"; skill: SkillWord }
  | { kind: "place"; city: string }
  | null;

/** A word or a glyph with its words, as the cards and tags write them. */
function withGlyph(glyph: Glyph, text: string, className?: string) {
  const holder = element("span", className);
  holder.append(glyphElement(glyph), element("span", undefined, text));
  return holder;
}

/** Moves the travel to just after a moment, so it stands ahead of the camera. Under reduced motion it jumps there. */
export function travelToTime(scene: WorldLinesScene, time: number) {
  const cameraTime = Math.min(scene.data.present, time + YEARS_BEHIND_A_MOMENT);
  scene.scroll.scrollToProgress(progressAtTime(cameraTime, scene.data.present));
}

export class Interaction {
  readonly answer = element("p", "lines-answer");
  readonly card = element("section", "lines-card");
  readonly ring = element("div", "lines-ring");
  readonly tag = element("p", "lines-focus-label");
  private chosen: Chosen = null;
  private ringPoint: THREE.Vector3 | null = null;
  private readonly projected = new THREE.Vector3();
  private readonly eventsById: Map<string, WorldEvent>;
  private readonly wordIndexOf = new Map<string, number>();
  private cardTimer = 0;
  private hoverPending = false;
  /** Called whenever the card or the lit skill changes, so the controls can follow. */
  onChange: (chosen: Chosen) => void = () => {};

  constructor(
    private readonly scene: WorldLinesScene,
    private readonly lighting: Lighting,
    private readonly events: WorldEvent[],
    private readonly skills: SkillWord[],
  ) {
    this.eventsById = new Map(events.map((event) => [event.id, event]));
    scene.words?.words.forEach((word, index) => this.wordIndexOf.set(word.key, index));
    const stage = scene.elements.stage;
    this.answer.hidden = true;
    this.answer.setAttribute("aria-live", "polite");
    this.card.hidden = true;
    this.card.setAttribute("role", "dialog");
    this.card.setAttribute("aria-label", "About this point in time");
    this.card.addEventListener("keydown", (event) => this.stepWithArrows(event));
    this.ring.hidden = true;
    this.ring.setAttribute("aria-hidden", "true");
    this.tag.hidden = true;
    this.tag.setAttribute("aria-hidden", "true");
    stage.append(this.ring, this.tag, this.answer, this.card);
    scene.onFrame(() => this.placeRing());
  }

  /** Escape: the card closes first, then the lit skill clears. Says whether it did anything. */
  stepBack() {
    if (!this.card.hidden) {
      this.closeCard();
      return true;
    }
    if (this.chosen) {
      this.clear();
      return true;
    }
    return false;
  }

  /** A finger has come down: on a word, the word brightens before it lifts. */
  press(clientX: number, clientY: number, pointerType: string) {
    if (pointerType !== "mouse") this.brightenWordAt(clientX, clientY);
  }

  /** The finger lifted without a tap, or the pointer left: nothing is under it now. */
  leave() {
    this.hideHover();
  }

  /** A pointer with no button down moved over the stage. */
  hover(clientX: number, clientY: number) {
    this.hoverSoon(clientX, clientY);
  }

  /** A double tap: the first tap already opened what is there. The second flies to it and zooms in. */
  doubleTap(clientX: number, clientY: number) {
    const { x, y } = this.onStage(clientX, clientY);
    const time = this.timeUnder(x, y);
    if (time !== null) travelToTime(this.scene, time);
    this.scene.zoomTo(DOUBLE_TAP_ZOOM);
  }

  /** The moment under a point of the stage: what a tap there picks, or else the nearest bead however far. */
  private timeUnder(x: number, y: number) {
    const chosen = this.chosen;
    if (chosen?.kind === "event") return chosen.event.end ?? chosen.event.start;
    if (chosen?.kind === "skill") {
      const first = skillAnswer(chosen.skill, this.eventsById).events.at(-1);
      return first ? (first.end ?? first.start) : null;
    }
    if (chosen?.kind === "place") {
      const stay = stays.find((candidate) => candidate.city === chosen.city);
      if (stay) {
        const from = timeAtStartOf(stay.from);
        const to = stay.to ? timeAtStartOf(stay.to) : this.scene.data.present;
        return (from + to) / 2;
      }
    }
    const bead = this.nearestBead(x, y, Infinity);
    return bead === null ? null : (this.events[bead].end ?? this.events[bead].start);
  }

  /** The stage position of a point in the scene, in pixels, or null when it is behind the camera. */
  stagePositionOf(point: THREE.Vector3) {
    this.projected.copy(point).project(this.scene.camera);
    if (this.projected.z > 1 || this.projected.z < -1) return null;
    const { width, height } = this.scene.stageSize();
    return { x: (this.projected.x * 0.5 + 0.5) * width, y: (0.5 - this.projected.y * 0.5) * height };
  }

  private onStage(clientX: number, clientY: number) {
    const stage = this.scene.elements.stage.getBoundingClientRect();
    return { x: clientX - stage.left, y: clientY - stage.top };
  }

  /**
    What a tap picks, surest first: a bead right under the finger, then a word under it (a skill, then a city). Last
    comes a bead within a finger's reach. A bead's generous reach never takes a tap that landed on a word.
  */
  tap(clientX: number, clientY: number) {
    const { x, y } = this.onStage(clientX, clientY);
    const under = this.nearestBead(x, y, SURE_REACH);
    if (under !== null) return this.openEvent(this.events[under]);
    const skill = this.skillAt(x, y);
    if (skill) return this.lightSkill(skill, true);
    const city = this.cityAt(x, y);
    if (city) return this.openPlace(city, true);
    const near = this.nearestBead(x, y, TAP_REACH);
    if (near !== null) return this.openEvent(this.events[near]);
    this.clear();
  }

  private nearestBead(x: number, y: number, reach: number) {
    let best: number | null = null;
    let bestDistance = reach;
    this.scene.beads.points.forEach((point, index) => {
      const place = this.stagePositionOf(point);
      if (!place) return;
      const distance = Math.hypot(place.x - x, place.y - y);
      if (distance <= bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    return best;
  }

  private static inside(rectangle: { left: number; right: number; top: number; bottom: number }, x: number, y: number, reach: number) {
    return x >= rectangle.left - reach && x <= rectangle.right + reach && y >= rectangle.top - reach && y <= rectangle.bottom + reach;
  }

  /** A skill drawn as a word under the finger, if any, with a little room around it for a finger's width. */
  private skillAt(x: number, y: number) {
    const hit = this.scene.drawnSkillRectangles().find(({ rectangle }) => Interaction.inside(rectangle, x, y, 6));
    return hit ? (this.skills.find((skill) => skill.word === hit.word) ?? null) : null;
  }

  private cityAt(x: number, y: number) {
    return this.scene.drawnCityRectangles().find(({ rectangle }) => Interaction.inside(rectangle, x, y, 4))?.city ?? null;
  }

  private brightenWordAt(clientX: number, clientY: number) {
    const { x, y } = this.onStage(clientX, clientY);
    const skill = this.skillAt(x, y);
    this.scene.setHoveredWord(skill ? (this.wordIndexOf.get(`skill:${skill.word}`) ?? -1) : -1);
  }

  /** The pointer's hover, looked at once per frame at most. */
  private hoverSoon(clientX: number, clientY: number) {
    if (this.hoverPending) return;
    this.hoverPending = true;
    requestAnimationFrame(() => {
      this.hoverPending = false;
      this.hoverAt(clientX, clientY);
    });
  }

  /** On a computer, the pointer over a bead or a word names it, with its glyph, before any click. */
  private hoverAt(clientX: number, clientY: number) {
    const { x, y } = this.onStage(clientX, clientY);
    const bead = this.nearestBead(x, y, HOVER_REACH);
    if (bead !== null) {
      const event = this.events[bead];
      this.showTag(glyphOfEvent(event), event.label, x, y);
      this.scene.setHoveredWord(this.wordIndexOf.get(`event:${event.id}`) ?? -1);
      this.scene.elements.stage.style.cursor = "pointer";
      return;
    }
    const skill = this.skillAt(x, y);
    if (skill) {
      this.showTag(glyphOfSkill(skill), skill.word, x, y);
      this.scene.setHoveredWord(this.wordIndexOf.get(`skill:${skill.word}`) ?? -1);
      this.scene.elements.stage.style.cursor = "pointer";
      return;
    }
    const city = this.cityAt(x, y);
    if (city) {
      this.showTag(placeGlyph, city, x, y);
      this.scene.elements.stage.style.cursor = "pointer";
      return;
    }
    this.hideHover();
  }

  private showTag(glyph: Glyph, text: string, x: number, y: number) {
    this.tag.replaceChildren(withGlyph(glyph, text));
    this.tag.hidden = false;
    const onLeftHalf = x < this.scene.stageSize().width / 2;
    this.tag.style.transform = onLeftHalf
      ? `translate(${(x + 18).toFixed(1)}px, ${(y - 34).toFixed(1)}px)`
      : `translate(calc(${(x - 18).toFixed(1)}px - 100%), ${(y - 34).toFixed(1)}px)`;
  }

  private hideHover() {
    if (this.tag.hidden && this.scene.elements.stage.style.cursor === "") return;
    this.tag.hidden = true;
    this.scene.elements.stage.style.cursor = "";
    this.scene.setHoveredWord(-1);
  }

  /** The keyboard's focus: the ring on a point, with its name and glyph beside it, and nothing lit until Enter. */
  showFocus(point: THREE.Vector3, name: string, glyph: Glyph) {
    this.ringPoint = point;
    this.ring.hidden = false;
    this.tag.replaceChildren(withGlyph(glyph, name));
    this.tag.hidden = false;
    this.placeRing(true);
  }

  hideFocus() {
    this.tag.hidden = true;
    if (!this.chosen) {
      this.ring.hidden = true;
      this.ringPoint = null;
    }
  }

  /** Opens an event's card. With fly, the camera goes to it first (a step along its line, or a pick from a list). */
  openEvent(event: WorldEvent, fly = false) {
    if (fly) travelToTime(this.scene, event.end ?? event.start);
    this.chosen = { kind: "event", event };
    this.ringPoint = this.scene.beads.points[this.events.indexOf(event)];
    this.ring.hidden = false;
    this.lighting.lightEvent(event);
    this.answer.hidden = true;
    this.placeRing();
    window.clearTimeout(this.cardTimer);
    this.cardTimer = window.setTimeout(() => this.fillCard(event, fly), CARD_DELAY_MILLISECONDS);
    this.onChange(this.chosen);
  }

  /** Lights a skill. With fly, the camera goes to the first event that names it. */
  lightSkill(skill: SkillWord, fly = false) {
    this.closeCard(false);
    this.chosen = { kind: "skill", skill };
    this.ringPoint = this.scene.skillPointOf(skill);
    this.ring.hidden = false;
    this.lighting.lightSkill(skill);
    const said = skillAnswer(skill, this.eventsById);
    const first = said.events.at(-1);
    if (fly && first) travelToTime(this.scene, first.end ?? first.start);
    const name = element("strong");
    name.append(glyphElement(glyphOfSkill(skill)), said.skill);
    this.answer.replaceChildren(name, ` ${said.sentence} `);
    const clear = element("button", "lines-clear", "Clear");
    clear.type = "button";
    clear.addEventListener("click", () => this.clear());
    this.answer.append(clear);
    this.answer.hidden = false;
    this.placeRing();
    this.onChange(this.chosen);
  }

  /** Opens a city's card: its years, and the events placed there, each a way into its own card. */
  openPlace(city: string, fly = false) {
    const stay = stays.find((candidate) => candidate.city === city);
    if (!stay) return;
    const from = timeAtStartOf(stay.from);
    const to = stay.to ? timeAtStartOf(stay.to) : this.scene.data.present;
    if (fly) travelToTime(this.scene, (from + to) / 2);
    this.lighting.clear();
    this.chosen = { kind: "place", city };
    this.ring.hidden = true;
    this.ringPoint = null;
    this.answer.hidden = true;
    const happened = this.events
      .filter((event) => event.place?.includes(city))
      .sort((first, second) => second.start - first.start);
    const years = `${Math.floor(from)} to ${stay.to ? Math.floor(to) : "now"}`;
    const list = element("ul", "lines-card-skills");
    for (const event of happened) {
      const item = element("li");
      const button = element("button", "lines-skill-button");
      button.type = "button";
      button.append(glyphElement(glyphOfEvent(event)), event.label);
      button.addEventListener("click", () => this.openEvent(event, true));
      item.append(button);
      list.append(item);
    }
    this.card.replaceChildren(
      this.closeButton(),
      this.heading(placeGlyph, city),
      element("p", "lines-card-meta", years),
      element("p", "lines-card-meta", "What happened here"),
      list,
    );
    this.card.dataset.linesAt = "bottom";
    this.card.hidden = false;
    this.onChange(this.chosen);
  }

  clear() {
    this.closeCard(false);
    this.chosen = null;
    this.ringPoint = null;
    this.ring.hidden = true;
    this.answer.hidden = true;
    this.lighting.clear();
    this.onChange(null);
  }

  private closeCard(alsoClear = true) {
    window.clearTimeout(this.cardTimer);
    const wasOpen = !this.card.hidden;
    this.card.hidden = true;
    if (alsoClear && wasOpen && this.chosen && this.chosen.kind !== "skill") this.clear();
  }

  private closeButton() {
    const close = element("button", "lines-close");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.append(glyphElement(controlGlyphs.close));
    close.addEventListener("click", () => this.closeCard());
    return close;
  }

  private heading(glyph: Glyph, text: string) {
    const heading = element("h2");
    heading.append(glyphElement(glyph, "lines-icon lines-heading-icon"), element("span", undefined, text));
    return heading;
  }

  /** The events on the same line as this one, earliest first. */
  private lineOf(event: WorldEvent) {
    return this.events
      .filter((candidate) => candidate.world === event.world)
      .sort((first, second) => (first.end ?? first.start) - (second.end ?? second.start));
  }

  /** Previous is the earlier event on the same line, Next the later one. */
  private neighbours(event: WorldEvent) {
    const line = this.lineOf(event);
    const place = line.indexOf(event);
    return { previous: line[place - 1] ?? null, next: line[place + 1] ?? null };
  }

  private stepButton(label: string, glyph: Glyph, target: WorldEvent | null, glyphFirst: boolean) {
    const button = element("button", "lines-step");
    button.type = "button";
    button.dataset.linesStep = label.toLowerCase();
    const words = element("span", undefined, label);
    if (glyphFirst) button.append(glyphElement(glyph), words);
    else button.append(words, glyphElement(glyph));
    if (target) {
      button.setAttribute("aria-label", `${label}: ${target.label}`);
      button.addEventListener("click", () => this.openEvent(target, true));
    } else button.disabled = true;
    return button;
  }

  /** Left and Right step the open card along its line, as its Previous and Next do. */
  private stepWithArrows(event: KeyboardEvent) {
    if (this.chosen?.kind !== "event") return;
    const { previous, next } = this.neighbours(this.chosen.event);
    const target = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : null;
    if (!target) return;
    event.preventDefault();
    this.openEvent(target, true);
  }

  private fillCard(event: WorldEvent, keepFocus: boolean) {
    const heading = this.heading(glyphOfEvent(event), event.subtitle && event.world === "work" ? event.subtitle : event.title);
    const parts: HTMLElement[] = [this.closeButton(), heading];
    const second = event.world === "work" ? event.title : event.subtitle;
    if (second && second !== heading.textContent) parts.push(element("p", "lines-card-meta", second));
    parts.push(element("p", "lines-card-meta", cardMeta(event)));
    for (const line of event.lines) parts.push(element("p", undefined, line));
    if (event.evidence) parts.push(element("p", "lines-card-meta", event.evidence));
    if (event.address) {
      const paragraph = element("p");
      const link = element("a", undefined, "The code on GitHub");
      link.href = event.address;
      link.rel = "noopener";
      paragraph.append(link);
      parts.push(paragraph);
    }
    if (event.skills.length) {
      parts.push(element("p", "lines-card-meta", "Skills it names"));
      const list = element("ul", "lines-card-skills");
      for (const word of event.skills) {
        const skill = this.skills.find((candidate) => candidate.word === word);
        if (!skill) continue;
        const item = element("li");
        const button = element("button", "lines-skill-button");
        button.type = "button";
        button.append(glyphElement(glyphOfSkill(skill)), word);
        button.addEventListener("click", () => this.lightSkill(skill));
        item.append(button);
        list.append(item);
      }
      parts.push(list);
    }
    const { previous, next } = this.neighbours(event);
    const steps = element("nav", "lines-steps");
    steps.setAttribute("aria-label", "Along this line");
    steps.append(
      this.stepButton("Previous", controlGlyphs.previous, previous, true),
      this.stepButton("Next", controlGlyphs.next, next, false),
    );
    parts.push(steps);
    const hadFocus = keepFocus && this.card.contains(document.activeElement);
    const focusedStep = hadFocus ? (document.activeElement as HTMLElement).dataset.linesStep : undefined;
    this.card.replaceChildren(...parts);
    this.card.dataset.linesAt = this.cardSideFor(event);
    this.card.hidden = false;
    // Stepping keeps the keyboard on the same step button, so Next can be pressed again and again.
    if (focusedStep) this.card.querySelector<HTMLElement>(`[data-lines-step="${focusedStep}"]`)?.focus();
  }

  /** The card opens on the half of the stage away from its point, so the ring and its light stay in view. */
  private cardSideFor(event: WorldEvent) {
    const place = this.stagePositionOf(this.scene.beads.points[this.events.indexOf(event)]);
    return place && place.y > this.scene.stageSize().height * 0.5 ? "top" : "bottom";
  }

  /** The ring stays on its point while the camera moves, and a keyboard's tag stays beside it. */
  private placeRing(withTag = false) {
    if (!this.ringPoint || this.ring.hidden) return;
    const place = this.stagePositionOf(this.ringPoint);
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

  get current() {
    return this.chosen;
  }
}

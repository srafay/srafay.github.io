/*
  How the scene answers a touch. A tap picks the nearest bead within 24 pixels of the finger, a 48 pixel target. The
  bead answers at once with its ring and its lit label, then its card opens. A tap on a skill's word lights the
  skill: its events and threads glow and a line says where it was used. A tap on nothing clears. Escape closes the
  card, then clears the skill. A sideways drag turns the view a little and lets it spring back.
*/
import * as THREE from "three";
import { site } from "@/lib/site";
import { cardMeta, skillAnswer } from "@/lib/world-lines/answers";
import type { WorldEvent } from "@/lib/world-lines/events";
import type { SkillWord } from "@/lib/world-lines/skills";
import { element } from "./dom";
import type { Lighting } from "./lighting";
import type { WorldLinesScene } from "./mount";

/** How far from a bead a tap may land and still pick it, in pixels. */
const TAP_REACH = 24;
/** How far a finger may move and still be a tap, in pixels. */
const TAP_SLOP = 8;
const TAP_LONGEST_MILLISECONDS = 600;
/** The card follows the ring by this much, so the ring is seen answering first. */
const CARD_DELAY_MILLISECONDS = 140;

export type Chosen =
  | { kind: "event"; event: WorldEvent }
  | { kind: "skill"; skill: SkillWord }
  | null;

export class Interaction {
  readonly answer = element("p", "lines-answer");
  readonly card = element("section", "lines-card");
  readonly ring = element("div", "lines-ring");
  readonly focusLabel = element("p", "lines-focus-label");
  private chosen: Chosen = null;
  private ringPoint: THREE.Vector3 | null = null;
  private readonly projected = new THREE.Vector3();
  private readonly eventsById: Map<string, WorldEvent>;
  private cardTimer = 0;
  /** Called whenever the card or the lit skill changes, so the keyboard layer can follow. */
  onChange: (chosen: Chosen) => void = () => {};

  constructor(
    private readonly scene: WorldLinesScene,
    private readonly lighting: Lighting,
    private readonly events: WorldEvent[],
    private readonly skills: SkillWord[],
  ) {
    this.eventsById = new Map(events.map((event) => [event.id, event]));
    const stage = scene.elements.stage;
    this.answer.hidden = true;
    this.answer.setAttribute("aria-live", "polite");
    this.card.hidden = true;
    this.card.setAttribute("role", "dialog");
    this.card.setAttribute("aria-label", "About this point in time");
    this.ring.hidden = true;
    this.ring.setAttribute("aria-hidden", "true");
    this.focusLabel.hidden = true;
    this.focusLabel.setAttribute("aria-hidden", "true");
    stage.append(this.ring, this.focusLabel, this.answer, this.card);
    this.listenForTaps(stage);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.stepBack();
    });
    scene.onFrame(() => this.placeRing());
  }

  /** Escape: the card closes first, then the lit skill clears. */
  stepBack() {
    if (!this.card.hidden) return this.closeCard();
    if (this.chosen) this.clear();
  }

  private listenForTaps(stage: HTMLElement) {
    let start: { x: number; y: number; time: number; id: number } | null = null;
    stage.addEventListener("pointerdown", (event) => {
      if (
        (event.target as HTMLElement).closest(
          ".lines-card, .lines-answer, a, button",
        )
      )
        return;
      start = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        id: event.pointerId,
      };
      this.scene.beginLook(event.clientX);
    });
    stage.addEventListener("pointermove", (event) => {
      if (start && event.pointerId === start.id)
        this.scene.moveLook(event.clientX);
    });
    const finish = (event: PointerEvent, cancelled: boolean) => {
      if (!start || event.pointerId !== start.id) return;
      const moved = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y,
      );
      const quick = performance.now() - start.time < TAP_LONGEST_MILLISECONDS;
      const at = { x: event.clientX, y: event.clientY };
      start = null;
      this.scene.endLook();
      if (!cancelled && moved < TAP_SLOP && quick) this.tapAt(at.x, at.y);
    };
    stage.addEventListener("pointerup", (event) => finish(event, false));
    stage.addEventListener("pointercancel", (event) => finish(event, true));
  }

  /** The stage position of a point in the scene, in pixels, or null when it is behind the camera. */
  stagePositionOf(point: THREE.Vector3) {
    this.projected.copy(point).project(this.scene.camera);
    if (this.projected.z > 1 || this.projected.z < -1) return null;
    const { width, height } = this.scene.stageSize();
    return {
      x: (this.projected.x * 0.5 + 0.5) * width,
      y: (0.5 - this.projected.y * 0.5) * height,
    };
  }

  private tapAt(clientX: number, clientY: number) {
    const stage = this.scene.elements.stage.getBoundingClientRect();
    const x = clientX - stage.left;
    const y = clientY - stage.top;
    const bead = this.nearestBead(x, y);
    if (bead !== null) return this.openEvent(this.events[bead]);
    const skill = this.skillAt(x, y);
    if (skill) return this.lightSkill(skill);
    this.clear();
  }

  private nearestBead(x: number, y: number) {
    let best: number | null = null;
    let bestDistance = TAP_REACH;
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

  /** A skill drawn as a word under the finger, if any, with a little room around it for a finger's width. */
  private skillAt(x: number, y: number) {
    const reach = 6;
    const hit = this.scene
      .drawnSkillRectangles()
      .find(
        ({ rectangle }) =>
          x >= rectangle.left - reach &&
          x <= rectangle.right + reach &&
          y >= rectangle.top - reach &&
          y <= rectangle.bottom + reach,
      );
    return hit
      ? (this.skills.find((skill) => skill.word === hit.word) ?? null)
      : null;
  }

  /** The keyboard's focus: the ring on a point, with its name beside it, and nothing lit until Enter. */
  showFocus(point: THREE.Vector3, name: string) {
    this.ringPoint = point;
    this.ring.hidden = false;
    this.focusLabel.textContent = name;
    this.focusLabel.hidden = false;
    this.placeRing();
  }

  hideFocus() {
    this.focusLabel.hidden = true;
    if (!this.chosen) {
      this.ring.hidden = true;
      this.ringPoint = null;
    }
  }

  openEvent(event: WorldEvent) {
    this.chosen = { kind: "event", event };
    this.ringPoint = this.scene.beads.points[this.events.indexOf(event)];
    this.ring.hidden = false;
    this.lighting.lightEvent(event);
    this.answer.hidden = true;
    this.placeRing();
    window.clearTimeout(this.cardTimer);
    this.cardTimer = window.setTimeout(
      () => this.fillCard(event),
      CARD_DELAY_MILLISECONDS,
    );
    this.onChange(this.chosen);
  }

  lightSkill(skill: SkillWord) {
    this.closeCard(false);
    this.chosen = { kind: "skill", skill };
    this.ringPoint = this.scene.skillPointOf(skill);
    this.ring.hidden = false;
    this.lighting.lightSkill(skill);
    const said = skillAnswer(skill, this.eventsById);
    this.answer.replaceChildren(
      element("strong", undefined, said.skill),
      ` ${said.sentence} `,
    );
    const clear = element("button", "lines-clear", "Clear");
    clear.type = "button";
    clear.addEventListener("click", () => this.clear());
    this.answer.append(clear);
    this.answer.hidden = false;
    this.placeRing();
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
    if (alsoClear && wasOpen && this.chosen?.kind === "event") this.clear();
  }

  private fillCard(event: WorldEvent) {
    const close = element("button", "lines-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", () => this.closeCard());
    const heading = element(
      "h2",
      undefined,
      event.subtitle && event.world === "work" ? event.subtitle : event.title,
    );
    const parts: HTMLElement[] = [close, heading];
    const second = event.world === "work" ? event.title : event.subtitle;
    if (second && second !== heading.textContent)
      parts.push(element("p", "lines-card-meta", second));
    parts.push(element("p", "lines-card-meta", cardMeta(event)));
    for (const line of event.lines) parts.push(element("p", undefined, line));
    if (event.evidence)
      parts.push(element("p", "lines-card-meta", event.evidence));
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
        const button = element("button", "lines-skill-button", word);
        button.type = "button";
        button.addEventListener("click", () => this.lightSkill(skill));
        item.append(button);
        list.append(item);
      }
      parts.push(list);
    }
    this.card.replaceChildren(...parts);
    this.card.dataset.linesAt = this.cardSideFor(event);
    this.card.hidden = false;
  }

  /** The card opens on the half of the stage away from its point, so the ring and its light stay in view. */
  private cardSideFor(event: WorldEvent) {
    const place = this.stagePositionOf(
      this.scene.beads.points[this.events.indexOf(event)],
    );
    return place && place.y > this.scene.stageSize().height * 0.5
      ? "top"
      : "bottom";
  }

  /** The ring stays on its point while the camera moves. */
  private placeRing() {
    if (!this.ringPoint || this.ring.hidden) return;
    const place = this.stagePositionOf(this.ringPoint);
    if (!place) {
      this.ring.style.opacity = "0";
      return;
    }
    this.ring.style.opacity = "1";
    this.ring.style.transform = `translate(${place.x.toFixed(1)}px, ${place.y.toFixed(1)}px)`;
    if (!this.focusLabel.hidden) {
      // Beside the ring, turned to whichever side has room.
      const onLeftHalf = place.x < this.scene.stageSize().width / 2;
      this.focusLabel.style.transform = onLeftHalf
        ? `translate(${(place.x + 24).toFixed(1)}px, ${(place.y - 14).toFixed(1)}px)`
        : `translate(calc(${(place.x - 24).toFixed(1)}px - 100%), ${(place.y - 14).toFixed(1)}px)`;
    }
  }

  get current() {
    return this.chosen;
  }

  /** The site's profiles, for the end of the travel. */
  static profiles() {
    return site.links;
  }
}

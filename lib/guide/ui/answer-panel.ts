/*
  Where a skill was used: the python says the short answer beside its head, and this panel names every role, project
  and course behind it, each a button that opens its full entry. A sheet from the bottom on a phone and a panel at the
  side on a computer, like an entry, so it never sits on the page's words the way a bubble would.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { controlGlyphs, glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";

export class AnswerPanel {
  readonly element: HTMLElement;
  skill: SkillWord | null = null;

  constructor(
    parent: HTMLElement,
    private readonly onOpenEvent: (event: WorldEvent, from: HTMLElement) => void,
  ) {
    this.element = element("div", "guide-panel guide-answer");
    this.element.hidden = true;
    this.element.setAttribute("role", "dialog");
    this.element.tabIndex = -1;
    parent.append(this.element);
  }

  open(skill: SkillWord, events: WorldEvent[]) {
    this.skill = skill;
    this.element.setAttribute("aria-label", `Where ${skill.word} was used`);
    const close = element("button", "guide-close");
    close.type = "button";
    close.setAttribute("aria-label", "Clear");
    close.append(glyphElement(controlGlyphs.close, "guide-icon"));
    close.addEventListener("click", () => this.close());
    const heading = element("h2");
    heading.append(glyphElement(glyphOfSkill(skill), "guide-icon guide-heading-icon"), element("span", undefined, skill.word));
    const list = element("ul", "guide-answer-events");
    for (const event of events) {
      const item = element("li");
      const button = element("button", "guide-answer-event");
      button.type = "button";
      button.dataset.event = event.id;
      button.append(glyphElement(glyphOfEvent(event), "guide-icon"), element("span", undefined, event.label));
      button.addEventListener("click", () => this.onOpenEvent(event, button));
      item.append(button);
      list.append(item);
    }
    this.element.replaceChildren(close, heading, list);
    this.element.hidden = false;
  }

  /** Closes it. Says whether it was open, for the Escape order. */
  close() {
    if (this.element.hidden) return false;
    this.element.hidden = true;
    this.skill = null;
    return true;
  }
}

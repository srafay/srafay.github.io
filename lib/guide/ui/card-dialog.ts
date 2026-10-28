/*
  An item's full entry, opened from its card: the shared card body (lib/about-cv/ui/event-card.ts) in a panel of its
  own, a sheet from the bottom on a phone and a panel at the side on a computer. Previous and Next step along its
  world. A skill in it asks the python where else that skill was used. Escape or the close button puts the focus back
  on the card it came from.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";
import { fillEventCard } from "@/lib/about-cv/ui/event-card";

export class CardDialog {
  readonly element: HTMLElement;
  private opener: HTMLElement | null = null;
  event: WorldEvent | null = null;

  constructor(
    parent: HTMLElement,
    private readonly events: WorldEvent[],
    private readonly skills: SkillWord[],
    private readonly onSkill: (skill: SkillWord) => void,
    private readonly onOpened: (event: WorldEvent) => void,
  ) {
    this.element = element("div", "guide-dialog");
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "false");
    this.element.tabIndex = -1;
    this.element.hidden = true;
    parent.append(this.element);
  }

  open(event: WorldEvent, opener?: HTMLElement, keepFocus = false) {
    if (opener) this.opener = opener;
    this.event = event;
    this.element.setAttribute("aria-label", event.label);
    const restoreFocus = fillEventCard(
      this.element,
      event,
      {
        prefix: "guide",
        events: this.events,
        skills: this.skills,
        onClose: () => this.close(),
        onSkill: (skill) => {
          this.close(false);
          this.onSkill(skill);
        },
        onStep: (next) => this.open(next, undefined, true),
      },
      keepFocus,
    );
    this.element.hidden = false;
    this.element.scrollTop = 0;
    if (keepFocus) restoreFocus();
    else this.element.focus({ preventScroll: true });
    this.onOpened(event);
  }

  /** Closes it. Says whether it was open, for the Escape order. */
  close(returnFocus = true) {
    if (this.element.hidden) return false;
    this.element.hidden = true;
    this.event = null;
    if (returnFocus) this.opener?.focus({ preventScroll: true });
    return true;
  }
}

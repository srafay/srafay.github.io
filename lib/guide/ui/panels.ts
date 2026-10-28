/*
  The top bar's two panels, open at any time: every skill (the shared sheet with its filter) and Find me (the shared
  list of profiles, with the way back to the homepage). Opening one closes the other. Escape, the close button or a
  press elsewhere closes it, and the focus goes back to the button that opened it.
*/
import { controlGlyphs, glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";
import { buildSkillsSheet } from "@/lib/about-cv/ui/skills-sheet";
import { linksBlock } from "./extras";

export class Panels {
  readonly sheet: HTMLElement;
  readonly filter: HTMLInputElement;
  readonly findMe: HTMLElement;
  private opener: HTMLElement | null = null;

  constructor(
    parent: HTMLElement,
    skills: SkillWord[],
    onPick: (skill: SkillWord) => void,
    private readonly onChange: () => void,
  ) {
    this.sheet = element("div", "guide-panel guide-sheet");
    this.filter = element("input", "guide-filter");
    buildSkillsSheet(this.sheet, this.filter, {
      prefix: "guide",
      skills,
      onPick: (skill) => {
        this.close(false);
        onPick(skill);
      },
      onClose: () => this.close(),
    });
    this.findMe = element("div", "guide-panel guide-find");
    this.findMe.hidden = true;
    this.findMe.setAttribute("role", "dialog");
    this.findMe.setAttribute("aria-label", "Find me");
    this.findMe.tabIndex = -1;
    const close = element("button", "guide-close");
    close.type = "button";
    close.setAttribute("aria-label", "Close Find me");
    close.append(glyphElement(controlGlyphs.close, "guide-icon"));
    close.addEventListener("click", () => this.close());
    this.findMe.append(close, element("h2", undefined, "Find me"), linksBlock());
    parent.append(this.sheet, this.findMe);
    document.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest(".guide-panel, [data-guide-top-controls]")) return;
      this.close(false);
    });
  }

  toggleSheet(opener: HTMLElement) {
    if (!this.sheet.hidden) return this.close();
    this.close(false);
    this.opener = opener;
    this.sheet.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    this.filter.focus({ preventScroll: true });
    this.onChange();
  }

  toggleFindMe(opener: HTMLElement) {
    if (!this.findMe.hidden) return this.close();
    this.close(false);
    this.opener = opener;
    this.findMe.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    this.findMe.focus({ preventScroll: true });
    this.onChange();
  }

  /** Closes whichever is open. Says whether one was, for the Escape order. */
  close(returnFocus = true) {
    const open = !this.sheet.hidden || !this.findMe.hidden;
    this.sheet.hidden = true;
    this.findMe.hidden = true;
    this.opener?.setAttribute("aria-expanded", "false");
    if (open && returnFocus) this.opener?.focus({ preventScroll: true });
    if (open) this.onChange();
    return open;
  }
}

/*
  The quiet bars. At the top: Find me and Skills, to open at any time. At the bottom: what the agent does on asking,
  its Tricks and its costumes (Dress me up), and Sound. Each is a real button with a name and a glyph. A tray opens
  above the bottom bar with one button a trick or a costume, and closes on a press elsewhere or Escape.
*/
import { controlGlyphs, glyphElement, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { costumeGlyphs, guideGlyphs, trickGlyphs } from "@/lib/guide/icons";
import type { CostumeKey } from "@/lib/guide/agent/costumes";
import { TRICK_ORDER, type TrickKey } from "@/lib/guide/agent/tricks";

/** The tricks by name, in the order they are offered: the six tools of the Atelier assistant, then one more. */
export const TRICK_NAMES: Record<TrickKey, string> = {
  search: "Web search",
  research: "Deep research",
  chart: "Make a chart",
  similar: "Find similar images",
  focusGroup: "Focus group",
  route: "Route",
  hallucinate: "Hallucinate",
};

/** Every trick, in order, with its name. */
export const namedTricks = () => TRICK_ORDER.map((key) => [key, TRICK_NAMES[key]] as const);

export const COSTUME_NAMES: Record<CostumeKey, string> = {
  cricketCap: "Cricket cap",
  headset: "Gamer headset",
  graduationCap: "Graduation cap",
  readingGlasses: "Reading glasses",
  hardHat: "Tiny hard hat",
};

export type BarHandlers = {
  onTrick(key: TrickKey): void;
  onCostume(key: CostumeKey | null): void;
  onSound(): boolean;
  onSkills(): void;
  onFindMe(): void;
  /** A tray opened or closed. */
  onTraysChanged(): void;
};

export function controlButton(label: string, glyph: Glyph, className = "guide-control") {
  const button = element("button", className);
  button.type = "button";
  button.append(glyphElement(glyph, "guide-icon"), element("span", undefined, label));
  return button;
}

export class Bars {
  readonly skills: HTMLButtonElement;
  readonly findMe: HTMLButtonElement;
  readonly tricks: HTMLButtonElement;
  readonly dressUp: HTMLButtonElement;
  readonly sound: HTMLButtonElement;
  readonly trickTray: HTMLElement;
  readonly costumeTray: HTMLElement;
  private readonly costumeButtons = new Map<CostumeKey | "none", HTMLButtonElement>();

  constructor(top: HTMLElement, bottom: HTMLElement, private readonly handlers: BarHandlers, soundAvailable: boolean, soundOn: boolean) {
    this.findMe = controlButton("Find me", controlGlyphs.findMe);
    this.skills = controlButton("Skills", controlGlyphs.skills);
    this.findMe.setAttribute("aria-expanded", "false");
    this.skills.setAttribute("aria-expanded", "false");
    this.findMe.addEventListener("click", () => handlers.onFindMe());
    this.skills.addEventListener("click", () => handlers.onSkills());
    top.append(this.findMe, this.skills);

    this.tricks = controlButton("Tricks", guideGlyphs.tricks);
    this.dressUp = controlButton("Dress me up", guideGlyphs.dressUp, "guide-control guide-dress-control");
    this.sound = controlButton("Sound", soundOn ? guideGlyphs.soundOn : guideGlyphs.soundOff, "guide-control guide-sound-control");
    this.sound.setAttribute("aria-pressed", String(soundOn));
    this.sound.hidden = !soundAvailable;
    bottom.append(this.tricks, this.dressUp, this.sound);

    this.trickTray = this.tray("Tricks", "guide-trick-tray");
    for (const [key, name] of namedTricks()) {
      const button = controlButton(name, trickGlyphs[key], "guide-tray-button");
      button.dataset.trick = key;
      button.addEventListener("click", () => handlers.onTrick(key));
      this.trickTray.append(button);
    }
    this.costumeTray = this.tray("Dress me up", "guide-costume-tray");
    for (const [key, name] of Object.entries(COSTUME_NAMES) as [CostumeKey, string][]) {
      const button = controlButton(name, costumeGlyphs[key], "guide-tray-button");
      button.dataset.costume = key;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => handlers.onCostume(key));
      this.costumeButtons.set(key, button);
      this.costumeTray.append(button);
    }
    const none = controlButton("Take it off", controlGlyphs.close, "guide-tray-button");
    none.dataset.costume = "none";
    none.addEventListener("click", () => handlers.onCostume(null));
    this.costumeTray.append(none);
    bottom.after(this.trickTray, this.costumeTray);
    this.tricks.setAttribute("aria-expanded", "false");
    this.dressUp.setAttribute("aria-expanded", "false");
    this.tricks.setAttribute("aria-controls", this.trickTray.id);
    this.dressUp.setAttribute("aria-controls", this.costumeTray.id);
    this.tricks.addEventListener("click", () => this.toggleTray(this.trickTray, this.tricks));
    this.dressUp.addEventListener("click", () => this.toggleTray(this.costumeTray, this.dressUp));
    this.sound.addEventListener("click", () => this.showSound(handlers.onSound()));
    document.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest(".guide-tray, .guide-bottom")) return;
      this.closeTrays();
    });
  }

  private tray(title: string, id: string) {
    const tray = element("div", "guide-tray");
    tray.id = id;
    tray.hidden = true;
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", title);
    tray.append(element("h2", undefined, title));
    return tray;
  }

  private toggleTray(tray: HTMLElement, opener: HTMLButtonElement) {
    const opening = tray.hidden;
    this.closeTrays();
    if (!opening) return;
    tray.hidden = false;
    opener.setAttribute("aria-expanded", "true");
    this.handlers.onTraysChanged();
  }

  /** Closes an open tray. Says whether one was open, for the Escape order. */
  closeTrays() {
    const open = !this.trickTray.hidden || !this.costumeTray.hidden;
    this.trickTray.hidden = true;
    this.costumeTray.hidden = true;
    this.tricks.setAttribute("aria-expanded", "false");
    this.dressUp.setAttribute("aria-expanded", "false");
    if (open) this.handlers.onTraysChanged();
    return open;
  }

  /** Every costume button on the page, in the tray and at the end, says whether its costume is being worn. */
  showWorn(worn: CostumeKey | null) {
    for (const [key, button] of this.costumeButtons) button.setAttribute("aria-pressed", String(key === worn));
    for (const button of document.querySelectorAll<HTMLElement>(".guide-playground [data-costume]"))
      button.setAttribute("aria-pressed", String(button.dataset.costume === worn));
  }

  showSound(on: boolean) {
    this.sound.setAttribute("aria-pressed", String(on));
    this.sound.replaceChildren(glyphElement(on ? guideGlyphs.soundOn : guideGlyphs.soundOff, "guide-icon"), element("span", undefined, "Sound"));
  }
}

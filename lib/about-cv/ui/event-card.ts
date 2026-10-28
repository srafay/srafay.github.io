/*
  An event's card, as every version of the About page writes it: its glyph and title, the organisation or provider,
  when and where, its lines from the CV, the clue for an undated one, its code, the skills it names (each a button
  that lights the skill), and Previous and Next along its own world. A version gives its class prefix ("lines" gives
  lines-card-meta, lines-step and so on) and what each button does.
*/
import { cardMeta } from "@/lib/about-cv/answers";
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { controlGlyphs, glyphElement, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import type { SkillWord } from "@/lib/about-cv/skills";

export type EventCardOptions = {
  /** The version's class prefix. */
  prefix: string;
  events: WorldEvent[];
  skills: SkillWord[];
  onClose(): void;
  onSkill(skill: SkillWord): void;
  /** Previous or Next was pressed: the card steps to that event. */
  onStep(event: WorldEvent): void;
};

/** The close button in a card's corner. */
export function closeButton(prefix: string, onClose: () => void, label = "Close") {
  const close = element("button", `${prefix}-close`);
  close.type = "button";
  close.setAttribute("aria-label", label);
  close.append(glyphElement(controlGlyphs.close, `${prefix}-icon`));
  close.addEventListener("click", onClose);
  return close;
}

/** A card's heading: its glyph, then its words. */
export function cardHeading(prefix: string, glyph: Glyph, text: string) {
  const heading = element("h2");
  heading.append(glyphElement(glyph, `${prefix}-icon ${prefix}-heading-icon`), element("span", undefined, text));
  return heading;
}

/** The events of one world, earliest first. */
const alongItsWorld = (event: WorldEvent, events: WorldEvent[]) =>
  events
    .filter((candidate) => candidate.world === event.world)
    .sort((first, second) => (first.end ?? first.start) - (second.end ?? second.start));

/** Previous is the earlier event of the same world, Next the later one. */
export function neighboursOf(event: WorldEvent, events: WorldEvent[]) {
  const line = alongItsWorld(event, events);
  const place = line.indexOf(event);
  return { previous: line[place - 1] ?? null, next: line[place + 1] ?? null };
}

function stepButton(
  prefix: string,
  label: string,
  glyph: Glyph,
  target: WorldEvent | null,
  glyphFirst: boolean,
  onStep: (event: WorldEvent) => void,
) {
  const button = element("button", `${prefix}-step`);
  button.type = "button";
  button.setAttribute(`data-${prefix}-step`, label.toLowerCase());
  const words = element("span", undefined, label);
  const icon = glyphElement(glyph, `${prefix}-icon`);
  if (glyphFirst) button.append(icon, words);
  else button.append(words, icon);
  if (target) {
    button.setAttribute("aria-label", `${label}: ${target.label}`);
    button.addEventListener("click", () => onStep(target));
  } else button.disabled = true;
  return button;
}

/** A skill as a button with its mark, as the cards and the sheet list it. */
export function skillButton(prefix: string, skill: SkillWord, onPick: () => void) {
  const button = element("button", `${prefix}-skill-button`);
  button.type = "button";
  button.append(glyphElement(glyphOfSkill(skill), `${prefix}-icon`), skill.word);
  button.addEventListener("click", onPick);
  return button;
}

/** Everything a card shows for an event, in order. */
export function eventCardParts(event: WorldEvent, options: EventCardOptions): HTMLElement[] {
  const { prefix } = options;
  const heading = cardHeading(
    prefix,
    glyphOfEvent(event),
    event.subtitle && event.world === "work" ? event.subtitle : event.title,
  );
  const parts: HTMLElement[] = [closeButton(prefix, options.onClose), heading];
  const second = event.world === "work" ? event.title : event.subtitle;
  if (second && second !== heading.textContent) parts.push(element("p", `${prefix}-card-meta`, second));
  parts.push(element("p", `${prefix}-card-meta`, cardMeta(event)));
  for (const line of event.lines) parts.push(element("p", undefined, line));
  if (event.evidence) parts.push(element("p", `${prefix}-card-meta`, event.evidence));
  if (event.address) {
    const paragraph = element("p");
    const link = element("a", undefined, "The code on GitHub");
    link.href = event.address;
    link.rel = "noopener";
    paragraph.append(link);
    parts.push(paragraph);
  }
  if (event.skills.length) {
    parts.push(element("p", `${prefix}-card-meta`, "Skills it names"));
    const list = element("ul", `${prefix}-card-skills`);
    for (const word of event.skills) {
      const skill = options.skills.find((candidate) => candidate.word === word);
      if (!skill) continue;
      const item = element("li");
      item.append(skillButton(prefix, skill, () => options.onSkill(skill)));
      list.append(item);
    }
    parts.push(list);
  }
  const { previous, next } = neighboursOf(event, options.events);
  const steps = element("nav", `${prefix}-steps`);
  steps.setAttribute("aria-label", "Along this line");
  steps.append(
    stepButton(prefix, "Previous", controlGlyphs.previous, previous, true, options.onStep),
    stepButton(prefix, "Next", controlGlyphs.next, next, false, options.onStep),
  );
  parts.push(steps);
  return parts;
}

/**
  Fills a card with an event. When the keyboard was on a step button (with keepFocus), it stays on the same step
  button, so Next can be pressed again and again.
*/
export function fillEventCard(card: HTMLElement, event: WorldEvent, options: EventCardOptions, keepFocus: boolean) {
  const parts = eventCardParts(event, options);
  const hadFocus = keepFocus && card.contains(document.activeElement);
  const stepAttribute = `data-${options.prefix}-step`;
  const focusedStep = hadFocus ? (document.activeElement as HTMLElement).getAttribute(stepAttribute) : null;
  card.replaceChildren(...parts);
  return () => {
    if (focusedStep) card.querySelector<HTMLElement>(`[${stepAttribute}="${focusedStep}"]`)?.focus();
  };
}

/*
  The keyboard's way in, as in version 4: a visually hidden layer with a button for every event (newest first), every
  city and every skill. Tab reaches each. Focus flies the camera to it and rings it on the land with its name beside
  the ring. Enter opens its card (or lights the skill).
*/
import { glyphOfEvent } from "@/lib/about-cv/glyphs";
import { glyphElement } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { cities } from "@/lib/letters/land/cities";
import type { EventOnLand } from "@/lib/letters/land/land";
import type { Interaction } from "./interaction";
import type { LettersScene } from "./letters-scene";
import type { Vector } from "./matrix";

export function addKeyLayer(scene: LettersScene, interaction: Interaction) {
  const { land, skills } = scene.data;
  const layer = element("nav", "letters-keys");
  layer.setAttribute("aria-label", "Everything on the land");
  const ring = element("div", "letters-ring");
  ring.hidden = true;
  ring.setAttribute("aria-hidden", "true");
  let ringed: Vector | null = null;

  const button = (text: string) => {
    const made = element("button", undefined, text);
    made.type = "button";
    made.dataset.lettersControl = "";
    made.addEventListener("blur", () => {
      ringed = null;
      ring.hidden = true;
      interaction.tag.hidden = true;
    });
    return made;
  };

  // Row 0 is now, so the nearest rows are the newest.
  const newestFirst = [...land.events].sort((first, second) => first.rows[0] - second.rows[0]);
  for (const item of newestFirst) {
    const key = button(`${item.event.label}, ${item.event.dates}`);
    key.addEventListener("focus", () => {
      interaction.flyTo(item);
      ringed = scene.centreOf(item);
      showTagFor(item);
    });
    key.addEventListener("click", () => interaction.openEvent(item, null));
    layer.append(key);
  }
  cities.forEach((city, index) => {
    const key = button(`${city.name}, ${city.inTheCv}`);
    key.addEventListener("focus", () => {
      interaction.flyToCity(index);
      ringed = null;
      ring.hidden = true;
    });
    key.addEventListener("click", () => interaction.openCity(index));
    layer.append(key);
  });
  skills.forEach((skill) => {
    const key = button(`Skill: ${skill.word}`);
    key.addEventListener("click", () => interaction.lightSkill(skill));
    layer.append(key);
  });

  function showTagFor(item: EventOnLand) {
    const words = element("span");
    words.append(glyphElement(glyphOfEvent(item.event), "letters-icon"), item.event.label);
    interaction.tag.replaceChildren(words);
  }

  // The ring and its tag follow the event as the camera flies, written only from the scene's own frame.
  scene.onFrame(() => {
    if (!ringed) return false;
    const spot = scene.view.toScreen(ringed);
    if (!spot) return false;
    ring.hidden = false;
    ring.style.transform = `translate(${Math.round(spot.x)}px, ${Math.round(spot.y)}px)`;
    interaction.tag.hidden = false;
    interaction.tag.style.transform = `translate(${Math.round(spot.x + 22)}px, ${Math.round(spot.y - 40)}px)`;
    return false;
  });
  scene.elements.stage.append(layer, ring);
  return layer;
}

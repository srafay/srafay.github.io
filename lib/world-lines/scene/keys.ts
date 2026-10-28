/*
  The keyboard's way through the scene. There is one button for every event, newest first as the travel meets them.
  Then come one for each city and one for every skill, in the CV's order. The buttons are out of sight. The focused one is
  shown in the scene with a ring on its point and its name and glyph beside it. The travel moves to its time. Enter
  opens an event's or a city's card, or lights a skill. Escape closes the top thing (main.ts).
*/
import * as THREE from "three";
import { stays } from "@/content/about/profile";
import type { WorldEvent } from "@/lib/about-cv/events";
import { glyphOfEvent, glyphOfSkill } from "@/lib/about-cv/glyphs";
import { placeGlyph } from "@/lib/about-cv/icons";
import type { SkillWord } from "@/lib/about-cv/skills";
import { timeAtStartOf } from "@/lib/about-cv/time";
import { travelToTime, type Interaction } from "./interaction";
import { zOfTime } from "./layout";
import type { WorldLinesScene } from "./mount";

const describeEvent = (event: WorldEvent) =>
  [
    event.label,
    event.title !== event.label ? event.title : "",
    event.dates,
    event.place ?? "",
  ]
    .filter(Boolean)
    .join(". ");

export function addKeys(
  scene: WorldLinesScene,
  interaction: Interaction,
  events: WorldEvent[],
  skills: SkillWord[],
) {
  const layer = document.createElement("div");
  layer.className = "lines-keys";
  layer.setAttribute("role", "group");
  layer.setAttribute(
    "aria-label",
    "Every point in time, newest first, then every city and every skill",
  );

  const button = (name: string, onFocus: () => void, onPress: () => void) => {
    const made = document.createElement("button");
    made.type = "button";
    made.textContent = name;
    made.addEventListener("focus", onFocus);
    made.addEventListener("blur", () => interaction.hideFocus());
    made.addEventListener("click", onPress);
    layer.append(made);
  };

  const newestFirst = [...events].sort(
    (first, second) =>
      (second.end ?? second.start) - (first.end ?? first.start),
  );
  for (const event of newestFirst) {
    const point = scene.beads.points[events.indexOf(event)];
    button(
      describeEvent(event),
      () => {
        travelToTime(scene, event.end ?? event.start);
        interaction.showFocus(point, event.label, glyphOfEvent(event));
      },
      () => interaction.openEvent(event),
    );
  }
  for (const stay of stays) {
    const from = timeAtStartOf(stay.from);
    const to = stay.to ? timeAtStartOf(stay.to) : scene.data.present;
    const point = new THREE.Vector3(0, 0, zOfTime((from + to) / 2, scene.data.present));
    button(
      `${stay.city}, a place`,
      () => {
        travelToTime(scene, (from + to) / 2);
        interaction.showFocus(point, stay.city, placeGlyph);
      },
      () => interaction.openPlace(stay.city),
    );
  }
  for (const skill of skills) {
    const point: THREE.Vector3 = scene.skillPointOf(skill);
    button(
      `${skill.word}, a skill`,
      () => {
        travelToTime(scene, scene.timeAtDepth(point.z));
        interaction.showFocus(point, skill.word, glyphOfSkill(skill));
      },
      () => interaction.lightSkill(skill),
    );
  }
  scene.elements.stage.append(layer);
  return layer;
}

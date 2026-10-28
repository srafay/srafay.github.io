/*
  The keyboard's way through the scene. There is one button for every event, newest first as the travel meets them,
  then one for every skill in the CV's order. The buttons are out of sight. The focused one is shown in the scene with
  a ring on its point and its name beside it. The travel moves to its time. Enter opens an event's card or lights
  a skill. Escape closes the card, then clears the skill (interaction.ts).
*/
import * as THREE from "three";
import type { WorldEvent } from "@/lib/world-lines/events";
import type { SkillWord } from "@/lib/world-lines/skills";
import { progressAtTime, YEARS_BEHIND_A_MOMENT } from "./camera";
import type { Interaction } from "./interaction";
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
    "Every point in time, newest first, then every skill",
  );

  /** Travels to just after a moment, so it stands ahead of the camera. */
  const travelTo = (time: number) => {
    if (scene.reducedMotion) return;
    const cameraTime = Math.min(
      scene.data.present,
      time + YEARS_BEHIND_A_MOMENT,
    );
    scene.scroll.scrollToProgress(
      progressAtTime(cameraTime, scene.data.present),
    );
  };

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
        travelTo(event.end ?? event.start);
        interaction.showFocus(point, event.label);
      },
      () => interaction.openEvent(event),
    );
  }
  for (const skill of skills) {
    const point: THREE.Vector3 = scene.skillPointOf(skill);
    button(
      `${skill.word}, a skill`,
      () => {
        travelTo(scene.timeAtDepth(point.z));
        interaction.showFocus(point, skill.word);
      },
      () => interaction.lightSkill(skill),
    );
  }
  scene.elements.stage.append(layer);
  return layer;
}

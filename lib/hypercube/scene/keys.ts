/*
  The keyboard. Left and Right turn the object through w in the xw plane, Up and Down move through time, and with
  Shift, Up and Down turn it in the yw plane. Plus and minus zoom. Space holds, as a press does (hold.ts).

  Then a layer of buttons out of sight, one for every event, newest first, then every city and every skill. The
  focused one is ringed in the scene with its name beside it, and the slice moves to its year. Enter opens an event's
  or a city's card, or lights a skill. Escape closes the top thing (main.ts).
*/
import { stays } from "@/content/about/profile";
import type { GestureHandlers } from "@/lib/about-cv/scene/gestures";
import { ZOOM_STEP } from "@/lib/about-cv/scene/gestures";
import { beadTime } from "@/lib/hypercube/shape";
import type { Controls } from "./controls";
import type { HypercubeScene } from "./hypercube-scene";
import type { Interaction } from "./interaction";

/** One press of Left or Right, or of Shift with Up or Down, in radians. */
const TURN_STEP = 0.15;
/** One press of Up or Down, as a share of the stage's height in travel. */
const TRAVEL_STEP_SHARE = 0.5;

/** Where the keys belong to what has focus, not to the object. */
const KEYS_STAY_INSIDE = "input, textarea, [role=slider], .cube-card, .cube-sheet";

export function listenForKeys(handlers: GestureHandlers, scene: HypercubeScene) {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as Element | null;
    if (target?.closest(KEYS_STAY_INSIDE)) return;
    const travelStep = scene.stageSize().height * TRAVEL_STEP_SHARE;
    // Shift with Up and Down turns in the yw plane whatever pointer was used last: a key is not a finger.
    const turnUp = (amount: number) => () => {
      scene.turn.turnBy(0, amount);
      scene.requestFrame();
    };
    const up = event.shiftKey ? turnUp(-TURN_STEP) : () => handlers.travel.moveBy(-travelStep);
    const down = event.shiftKey ? turnUp(TURN_STEP) : () => handlers.travel.moveBy(travelStep);
    const actions: Record<string, () => void> = {
      ArrowUp: up,
      ArrowDown: down,
      PageUp: () => handlers.travel.moveBy(-travelStep * 2),
      PageDown: () => handlers.travel.moveBy(travelStep * 2),
      ArrowLeft: () => handlers.turnBy(TURN_STEP, 0),
      ArrowRight: () => handlers.turnBy(-TURN_STEP, 0),
      "+": () => handlers.zoomBy(-ZOOM_STEP),
      "=": () => handlers.zoomBy(-ZOOM_STEP),
      "-": () => handlers.zoomBy(ZOOM_STEP),
      _: () => handlers.zoomBy(ZOOM_STEP),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });
}

const describe = (parts: (string | undefined)[]) => parts.filter(Boolean).join(". ");

export function addKeyLayer(scene: HypercubeScene, interaction: Interaction, controls: Controls) {
  const layer = document.createElement("div");
  layer.className = "cube-keys";
  layer.setAttribute("role", "group");
  layer.setAttribute("aria-label", "Every point in time, newest first, then every city and every skill");
  const button = (name: string, onFocus: () => void, onPress: () => void) => {
    const made = document.createElement("button");
    made.type = "button";
    made.textContent = name;
    made.addEventListener("focus", onFocus);
    made.addEventListener("blur", () => interaction.hideFocus());
    made.addEventListener("click", onPress);
    layer.append(made);
  };
  const { events, skills, present } = scene.data;
  const newestFirst = [...events].sort((first, second) => beadTime(second, present) - beadTime(first, present));
  for (const event of newestFirst)
    button(
      describe([event.label, event.title !== event.label ? event.title : undefined, event.dates, event.place]),
      () => {
        controls.goToYear(Math.floor(beadTime(event, present)));
        interaction.showFocus(event);
      },
      () => interaction.openEvent(event),
    );
  for (const stay of stays)
    button(
      `${stay.city}, a place`,
      () => {},
      () => interaction.openPlace(stay.city),
    );
  for (const skill of skills)
    button(
      `${skill.word}, a skill`,
      () => {},
      () => interaction.lightSkill(skill),
    );
  scene.elements.stage.append(layer);
  return layer;
}

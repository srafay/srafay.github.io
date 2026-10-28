/*
  A held press. During the unfold a press speeds it on from the moment it lands, and letting go lets it settle back
  to its slow pace. After the unfold, a press held still for a moment speeds the object's turn until it lifts. The
  space bar does the same as a press. A hold is never needed: the unfold runs on its own.
*/
import type { HypercubeScene } from "./hypercube-scene";

/** How long a press must stay still after the unfold before it speeds the turn. */
const HOLD_STILL_MILLISECONDS = 450;
/** A press shorter than this during the unfold is still a tap, though it sped the unfold while it lasted. */
const SHORTEST_HOLD_MILLISECONDS = 350;

export type Holds = {
  /** A finger or a button came down on the stage. */
  begin(pointerType: string): void;
  /** It lifted, or left the stage. */
  end(): void;
  /** It moved into a turn, a travel or a zoom: a hold waiting to begin will not. */
  cancel(): void;
  /** Whether the press now ending was a hold, so its lifting is not also a tap. */
  wasHolding(): boolean;
  lastPointerWasMouse(): boolean;
};

export function listenForHolds(scene: HypercubeScene): Holds {
  let timer = 0;
  let pointerType = "mouse";
  let holding = false;
  let heldThisPress = false;
  let pressedAt = 0;

  const start = () => {
    holding = true;
    heldThisPress = true;
    if (scene.unfold.isDone()) scene.turn.speeding = true;
    else scene.unfold.holding = true;
    scene.requestFrame();
  };

  const stop = () => {
    window.clearTimeout(timer);
    holding = false;
    scene.unfold.holding = false;
    scene.turn.speeding = false;
    scene.requestFrame();
  };

  const isTyping = (target: EventTarget | null) =>
    target instanceof Element && target.closest("input, textarea, button, a, [role=slider]") !== null;

  document.addEventListener("keydown", (event) => {
    if (event.key !== " " || event.repeat || isTyping(event.target)) return;
    event.preventDefault();
    heldThisPress = false;
    start();
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === " " && holding) stop();
  });

  return {
    begin(type) {
      pointerType = type;
      heldThisPress = false;
      pressedAt = performance.now();
      window.clearTimeout(timer);
      if (!scene.unfold.isDone()) start();
      else timer = window.setTimeout(start, HOLD_STILL_MILLISECONDS);
    },
    end: stop,
    cancel() {
      window.clearTimeout(timer);
      if (scene.turn.speeding) {
        scene.turn.speeding = false;
        holding = false;
      }
    },
    wasHolding: () => heldThisPress && performance.now() - pressedAt >= SHORTEST_HOLD_MILLISECONDS,
    lastPointerWasMouse: () => pointerType === "mouse",
  };
}

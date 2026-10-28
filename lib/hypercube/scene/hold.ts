/*
  A held press. During the unfold a press speeds it on from the moment it lands, and letting go lets it settle back
  to its slow pace. On a ride, a press held still for a moment hurries the ride until it lifts. Otherwise after the
  unfold, a press held still for a moment speeds the object's turn. The space bar does the same as a press, except
  while the ride is the top thing: then a tap of Space pauses or resumes it, and only a longer hold hurries it. A hold
  is never needed: the unfold and the ride run on their own.
*/
import type { HypercubeScene } from "./hypercube-scene";

/** How long a press must stay still after the unfold before it speeds the turn or hurries the ride. */
const HOLD_STILL_MILLISECONDS = 450;
/** A press shorter than this is still a tap, though it sped the unfold while it lasted. A tap of Space too. */
const SHORTEST_HOLD_MILLISECONDS = 350;

/** What a hold does now. */
type HoldsWhat = "unfold" | "ride" | "turn";

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

/** What a hold needs of the ride: whether it is the top thing and playing, and how to hurry and toggle it. */
export type RideForHolds = {
  isTop(): boolean;
  isPlaying(): boolean;
  hurry(on: boolean): void;
  toggle(): void;
};

export function listenForHolds(scene: HypercubeScene, ride: RideForHolds): Holds {
  let timer = 0;
  let pointerType = "mouse";
  let holding = false;
  let heldThisPress = false;
  let pressedAt = 0;
  let spaceTimer = 0;

  const holdsWhat = (): HoldsWhat => (!scene.unfold.isDone() ? "unfold" : ride.isPlaying() ? "ride" : "turn");

  const start = () => {
    holding = true;
    heldThisPress = true;
    const what = holdsWhat();
    if (what === "unfold") scene.unfold.holding = true;
    else if (what === "ride") ride.hurry(true);
    else scene.turn.speeding = true;
    scene.requestFrame();
  };

  const stop = () => {
    window.clearTimeout(timer);
    holding = false;
    scene.unfold.holding = false;
    scene.turn.speeding = false;
    ride.hurry(false);
    scene.requestFrame();
  };

  const isTyping = (target: EventTarget | null) =>
    target instanceof Element && target.closest("input, textarea, button, a, [role=slider]") !== null;

  document.addEventListener("keydown", (event) => {
    if (event.key !== " " || event.repeat || isTyping(event.target)) return;
    event.preventDefault();
    heldThisPress = false;
    if (!ride.isTop()) return start();
    // On a ride a tap of Space pauses or resumes it; held, it hurries the ride once the hold is long enough.
    window.clearTimeout(spaceTimer);
    spaceTimer = window.setTimeout(() => {
      spaceTimer = 0;
      start();
    }, SHORTEST_HOLD_MILLISECONDS);
  });
  document.addEventListener("keyup", (event) => {
    if (event.key !== " ") return;
    if (spaceTimer) {
      window.clearTimeout(spaceTimer);
      spaceTimer = 0;
      ride.toggle();
      return;
    }
    if (holding) stop();
  });

  return {
    begin(type) {
      pointerType = type;
      heldThisPress = false;
      pressedAt = performance.now();
      window.clearTimeout(timer);
      if (holdsWhat() === "unfold") start();
      else timer = window.setTimeout(start, HOLD_STILL_MILLISECONDS);
    },
    end: stop,
    cancel() {
      window.clearTimeout(timer);
      if (scene.turn.speeding || holding) {
        scene.turn.speeding = false;
        ride.hurry(false);
        holding = false;
      }
    },
    wasHolding: () => heldThisPress && performance.now() - pressedAt >= SHORTEST_HOLD_MILLISECONDS,
    lastPointerWasMouse: () => pointerType === "mouse",
  };
}

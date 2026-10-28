/*
  The one moment the page plays by itself, once, in about two seconds. Light runs back along each world line from now
  to 2014, a line a beat after the one before. The labels and the cities appear as the light reaches them. The skills
  arrive, nearest first, and the name's letters settle. Under reduced motion the scene starts as it ends.

  GSAP holds the choreography, paused, and the scene's own frames move it on. So it plays from its first frame
  whatever else the page was busy with, and draws only when the scene draws.
*/
import gsap from "gsap";
import { FIRST_YEAR } from "@/lib/world-lines/time";
import { worlds } from "@/lib/world-lines/worlds";
import { LINES_BEFORE_FIRST_YEAR, LINES_PAST_NOW, zOfTime } from "./layout";
import type { WorldLinesScene } from "./mount";

/** How long the light takes to run from the future's end of a line to past 2014, in seconds. */
const RUN_SECONDS = 1.4;
/** The beat between one line's light and the next. */
const LINE_BEAT = 0.09;
const ARRIVAL_START = 0.55;
const ARRIVAL_SECONDS = 1.15;
const NAME_SECONDS = 1.3;

/** When the light has run back to 2014 on every line: the last line starts four beats after the first. */
export const LIGHT_RUN_ENDS_SECONDS = RUN_SECONDS + (worlds.length - 1) * LINE_BEAT;

/** Labels, years, line names and the cities appear as the light reaches their depth. */
function revealWordsUpTo(scene: WorldLinesScene, frontZ: number) {
  for (const layer of [scene.words, scene.cityWords]) {
    if (!layer) continue;
    let changed = false;
    layer.words.forEach((word, index) => {
      if (word.kind === "skill") return;
      const shown = word.at.z >= frontZ ? 1 : 0;
      if (layer.presenceOf(index) === shown) return;
      layer.setPresence(index, shown);
      changed = true;
    });
    if (changed) layer.markChanged();
  }
}

/** Plays the intro. The answer says how far into it the scene is, in seconds, for the checks that photograph it. */
export function playIntro(
  scene: WorldLinesScene,
  title: HTMLElement,
): () => number {
  if (scene.reducedMotion) return () => 0;
  const farthest =
    zOfTime(FIRST_YEAR, scene.data.present) - LINES_BEFORE_FIRST_YEAR;
  const fronts: Record<string, number> = { vault: LINES_PAST_NOW, arrival: 0 };
  for (const world of worlds) fronts[world.key] = LINES_PAST_NOW;
  const apply = () => {
    scene.setFront("vault", fronts.vault);
    for (const world of worlds) scene.setFront(world.key, fronts[world.key]);
    revealWordsUpTo(scene, fronts.vault);
    scene.wordPlacement()?.setArrival(fronts.arrival);
  };
  const timeline = gsap.timeline({ paused: true, onUpdate: apply });
  timeline.to(
    fronts,
    { vault: farthest, duration: RUN_SECONDS, ease: "power2.inOut" },
    0,
  );
  worlds.forEach((world, order) =>
    timeline.to(
      fronts,
      { [world.key]: farthest, duration: RUN_SECONDS, ease: "power2.inOut" },
      order * LINE_BEAT,
    ),
  );
  timeline.to(
    fronts,
    { arrival: 1, duration: ARRIVAL_SECONDS, ease: "power2.out" },
    ARRIVAL_START,
  );
  const name = title.querySelector<HTMLElement>(".lines-name");
  if (name)
    timeline.fromTo(
      name,
      { letterSpacing: "0.03em" },
      {
        letterSpacing: "-0.02em",
        duration: NAME_SECONDS,
        ease: "expo.out",
        clearProps: "letterSpacing",
      },
      0.25,
    );
  apply();

  let startedAt = -1;
  let finished = false;
  scene.onFrame(() => {
    if (finished) return;
    const now = performance.now();
    if (startedAt < 0) startedAt = now;
    timeline.time(Math.min(timeline.duration(), (now - startedAt) / 1000));
    if (timeline.progress() < 1) return scene.requestFrame();
    finished = true;
    for (const key of ["vault", ...worlds.map((world) => world.key)])
      scene.setFront(key, Infinity);
    revealWordsUpTo(scene, -Infinity);
    scene.wordPlacement()?.setArrival(1);
    scene.requestFrame();
  });
  return () => timeline.time();
}

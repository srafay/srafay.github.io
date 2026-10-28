/*
  The words laid over the scene in HTML. The name gives way as the camera descends into the vault. The year the
  camera is passing is set large once as it enters each year, the old year rolling out as the new rolls in.
*/
import { STRETCHES } from "./camera";
import type { WorldLinesScene } from "./mount";

export function followTitle(scene: WorldLinesScene, title: HTMLElement) {
  let hidden = false;
  scene.onFrame(() => {
    const progress = scene.shownProgress();
    const shouldHide =
      progress > STRETCHES.overview + 0.008 && progress < 0.995;
    if (shouldHide === hidden) return;
    hidden = shouldHide;
    title.toggleAttribute("data-lines-hidden", hidden);
    scene.setTitleShown(!hidden);
  });
}

const ROLL_MILLISECONDS = 420;

export function addYear(scene: WorldLinesScene, stage: HTMLElement) {
  const holder = document.createElement("p");
  holder.className = "lines-year";
  holder.setAttribute("aria-hidden", "true");
  stage.append(holder);
  let shownYear: number | null = null;
  scene.onFrame(() => {
    const year = scene.yearNow();
    if (year === shownYear) return;
    const previous = shownYear;
    shownYear = year;
    holder.toggleAttribute("data-lines-shown", year !== null);
    if (year === null) return;
    const incoming = document.createElement("span");
    incoming.textContent = String(year);
    // Every year still on show leaves. One already leaving, from a quick crossing of two years, carries on as it was.
    const outgoing = [...holder.children].filter(
      (span) => !(span as HTMLElement).dataset.leaving,
    ) as HTMLElement[];
    holder.append(incoming);
    if (previous === null || scene.reducedMotion) {
      for (const span of [...holder.children])
        if (span !== incoming) span.remove();
      return;
    }
    // Going back in time the new year comes down from above. Coming forward it rises from below.
    const direction = year < previous ? -1 : 1;
    const easing = "cubic-bezier(0.2, 0.8, 0.2, 1)";
    for (const span of outgoing) {
      span.dataset.leaving = "yes";
      span.animate(
        [
          { transform: "translateY(0)" },
          { transform: `translateY(${direction * -100}%)`, opacity: 0 },
        ],
        {
          duration: ROLL_MILLISECONDS,
          easing,
          fill: "forwards",
        },
      ).onfinish = () => span.remove();
    }
    incoming.animate(
      [
        { transform: `translateY(${direction * 100}%)`, opacity: 0 },
        { transform: "translateY(0)" },
      ],
      { duration: ROLL_MILLISECONDS, easing },
    );
  });
}

/*
  Numbers that count up from nought when their scene arrives. The page's HTML already holds the real number, so a
  reader without the script, or with reduced motion, sees it at once. The count only plays it back.
*/
import { easeOutExpo, withThousands } from "./motion";

const COUNT_SECONDS = 1.4;

export type CountUp = {
  element: HTMLElement;
  target: number;
  sceneIndex: number;
  startedAt: number;
};

export function collectCountUps(sections: HTMLElement[]): CountUp[] {
  return sections.flatMap((section, sceneIndex) =>
    [...section.querySelectorAll<HTMLElement>("[data-sky-count]")].map(
      (element) => ({
        element,
        target: Number(element.dataset.skyCount),
        sceneIndex,
        startedAt: NaN,
      }),
    ),
  );
}

/** Starts the counts of a scene that has arrived, once each. */
export function startCountsOf(
  countUps: CountUp[],
  sceneIndex: number,
  seconds: number,
) {
  for (const countUp of countUps)
    if (countUp.sceneIndex === sceneIndex && Number.isNaN(countUp.startedAt)) {
      countUp.startedAt = seconds;
      countUp.element.textContent = "0";
    }
}

/** Writes each running count's number for this moment. True while any is still counting. */
export function advanceCounts(countUps: CountUp[], seconds: number) {
  let running = false;
  for (const countUp of countUps) {
    if (Number.isNaN(countUp.startedAt)) continue;
    const progress = (seconds - countUp.startedAt) / COUNT_SECONDS;
    if (progress > 1.2) continue;
    running ||= progress < 1;
    const text = withThousands(
      countUp.target * easeOutExpo(Math.min(1, progress)),
    );
    if (countUp.element.textContent !== text)
      countUp.element.textContent = text;
  }
  return running;
}

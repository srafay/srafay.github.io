/*
  The end of the travel, back at the near end: where to find him, and the way back to the cosmos the site opens on.
  It shows once the camera has pulled back out to the present. Under reduced motion it is always there, since the
  scene then never travels.
*/
import { site } from "@/lib/site";
import { element } from "./dom";
import type { WorldLinesScene } from "./mount";

/** How far through the scroll the end begins to show. */
const END_SHOWS_FROM = 0.95;
/** The homepage, told the reader came from a page so it opens quietly (the posts do the same). */
const BACK_TO_THE_SYSTEM = "/?from=post";

export function addEnd(scene: WorldLinesScene) {
  const block = element("nav", "lines-end");
  block.setAttribute("aria-labelledby", "lines-end-heading");
  const heading = element("h2", undefined, "Where to find me");
  heading.id = "lines-end-heading";
  const list = element("ul");
  for (const link of site.links) {
    const item = element("li");
    const anchor = element("a", undefined, link.label);
    anchor.href = link.href;
    anchor.rel = "me";
    item.append(anchor);
    list.append(item);
  }
  const back = element("li");
  const anchor = element("a", undefined, "Back to the system");
  anchor.href = BACK_TO_THE_SYSTEM;
  back.append(anchor);
  list.append(back);
  block.append(heading, list);
  // Under the name and its line, so the scene's words keep off it the way they keep off the name.
  scene.elements.title.append(block);

  let shown: boolean | null = null;
  scene.onFrame(() => {
    const shouldShow =
      scene.reducedMotion || scene.shownProgress() >= END_SHOWS_FROM;
    if (shouldShow === shown) return;
    shown = shouldShow;
    block.toggleAttribute("data-lines-shown", shouldShow);
    scene.titleChangedSize();
  });
  return block;
}

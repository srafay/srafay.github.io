/*
  The words that sit beside stars (a city, a role, a repository, the busiest day) are real HTML, so they stay sharp,
  selectable and readable without the script. While the scene runs, each is lifted out of its list and moved to its
  star with a transform. Only the transform and the opacity are written, and only when they change, so moving them
  never asks the browser for layout.
*/
import type { Anchor } from "./world";

export type AnchoredLabel = {
  name: string;
  element: HTMLElement;
  anchor: Anchor;
  /** The scene whose words hold the label, or -1 for a label on the stage itself. */
  sceneIndex: number;
  written: { x: number; y: number; opacity: number };
  /** The label's words as laid out, read on resize, so a frame can keep them on the screen without asking. */
  width: number;
};

/** How far a label's words sit from its star, as the stylesheet sets it. */
const GAP_FROM_STAR = 14;
/** The least room left between a label and the edge of the screen. */
const EDGE_MARGIN = 8;

export function collectLabels(
  root: HTMLElement,
  anchors: Map<string, Anchor>,
  sections: HTMLElement[],
): AnchoredLabel[] {
  const labels: AnchoredLabel[] = [];
  root.querySelectorAll<HTMLElement>("[data-sky-anchor]").forEach((element) => {
    const name = element.dataset.skyAnchor!;
    const anchor = anchors.get(name);
    if (!anchor) return;
    element.dataset.skySide = anchor.side;
    const section = element.closest<HTMLElement>("[data-sky-scene]");
    labels.push({
      name,
      element,
      anchor,
      sceneIndex: section ? sections.indexOf(section) : -1,
      written: { x: NaN, y: NaN, opacity: NaN },
      width: 0,
    });
  });
  return labels;
}

/** Moves a label to a place in its container, in whole pixels, writing only what changed. */
export function placeLabel(
  label: AnchoredLabel,
  x: number,
  y: number,
  opacity: number,
) {
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  const roundedOpacity = Math.round(opacity * 100) / 100;
  const { written, element } = label;
  if (roundedX !== written.x || roundedY !== written.y) {
    element.style.transform = `translate3d(${roundedX}px, ${roundedY}px, 0)`;
    written.x = roundedX;
    written.y = roundedY;
  }
  if (roundedOpacity !== written.opacity) {
    element.style.opacity = String(roundedOpacity);
    element.style.visibility = roundedOpacity <= 0 ? "hidden" : "visible";
    written.opacity = roundedOpacity;
  }
}

/** Reads each label's width: on start and on resize, never in a frame. */
export function measureLabels(labels: AnchoredLabel[]) {
  for (const label of labels) {
    const body = label.element.firstElementChild as HTMLElement | null;
    label.width = body?.offsetWidth ?? 0;
  }
}

/** Moves a label's anchor across just enough that its words stay inside the screen's width. */
export function keepOnScreen(
  label: AnchoredLabel,
  x: number,
  screenWidth: number,
) {
  const { width } = label;
  const lowest = EDGE_MARGIN;
  const highest = screenWidth - EDGE_MARGIN;
  const side = label.anchor.side;
  let left: number;
  if (side === "right") left = x + GAP_FROM_STAR;
  else if (side === "left") left = x - GAP_FROM_STAR - width;
  else left = x - width / 2;
  const shift =
    Math.max(lowest - left, 0) + Math.min(highest - (left + width), 0);
  return x + shift;
}

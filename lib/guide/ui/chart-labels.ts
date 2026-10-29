/*
  The words on the agent's chart, in the page's type so they read: the first and last years under their bars, the
  busiest year under its bar and its count over it. They sit where the agent says, moved by a transform only, and are
  hidden for the screen reader, which hears the chart's line instead.
*/
import { element } from "@/lib/about-cv/scene/dom";
import type { ChartLabels as Places } from "@/lib/guide/agent/agent-view";

export class ChartLabels {
  readonly element: HTMLElement;
  private readonly first = element("span", "guide-chart-label");
  private readonly last = element("span", "guide-chart-label");
  private readonly tallestYear = element("span", "guide-chart-label guide-chart-tallest");
  private readonly tallestCount = element("span", "guide-chart-label guide-chart-tallest");

  constructor(parent: HTMLElement) {
    this.element = element("div", "guide-chart-labels");
    this.element.setAttribute("aria-hidden", "true");
    this.element.hidden = true;
    this.element.append(this.first, this.last, this.tallestYear, this.tallestCount);
    parent.append(this.element);
  }

  /** Puts the labels at their places in stage space (y up from the screen's bottom), or hides them. */
  show(places: Places | null) {
    if (!places) {
      this.element.hidden = true;
      return;
    }
    this.element.hidden = false;
    if (places.inDen) this.element.dataset.inDen = "";
    else delete this.element.dataset.inDen;
    const under = places.baseline - 4;
    place(this.first, String(places.first.year), places.first.x, under, "under");
    place(this.last, String(places.last.year), places.last.x, under, "under");
    place(this.tallestYear, String(places.tallest.year), places.tallest.x, under, "under");
    place(this.tallestCount, String(places.tallest.count), places.tallest.x, places.tallest.top + 4, "over");
  }

  get shown() {
    return !this.element.hidden;
  }

  /** What the labels say now, for checks. */
  get words() {
    return [this.first, this.last, this.tallestYear, this.tallestCount].map((label) => label.textContent ?? "");
  }
}

/** A label centred on a point across, its top just under a height (under) or its bottom just over it (over). */
function place(label: HTMLElement, words: string, across: number, height: number, side: "under" | "over") {
  if (label.textContent !== words) label.textContent = words;
  const lift = side === "over" ? "-100%" : "0%";
  label.style.transform = `translate3d(calc(${Math.round(across)}px - 50%), calc(${-Math.round(height)}px + ${lift}), 0)`;
}

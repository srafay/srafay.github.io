/*
  Where a finger or the mouse can take hold of the agent. The canvas lets every touch through, so this is a set of
  small round targets: one on the router, one on each tool, and one at the middle of each link. Each says touch-action
  none, so a drag that starts on the agent picks it up, and a drag anywhere else scrolls the page as usual. Small
  circles, never one box: a box round the whole fan would stop the reader scrolling across half the screen. The link
  targets are only the link's thickness and a margin across, so a swipe that starts inside the fan mostly scrolls.
*/
import { shape } from "./proportions";
import { NODE_COUNT, ROUTER } from "./topology";
import { lerpPoint, type Point } from "./vectors";

/** How far past a node a target reaches, in CSS pixels. */
const REACH = 8;
/** The smallest a target is, in CSS pixels. */
const LEAST = 28;

export class HitArea {
  readonly element: HTMLElement;
  private readonly nodeTargets: HTMLElement[] = [];
  private readonly linkTargets: HTMLElement[] = [];
  private readonly routerTarget: HTMLButtonElement;
  private lastPlaced: Point[] = [];

  constructor(parent: HTMLElement, label: string) {
    this.element = document.createElement("div");
    this.element.className = "guide-hits";
    // The router is the one target the keyboard reaches: a button with the agent's name.
    this.routerTarget = document.createElement("button");
    this.routerTarget.type = "button";
    this.routerTarget.className = "guide-hit guide-hit-head";
    this.routerTarget.dataset.node = String(ROUTER);
    this.routerTarget.setAttribute("aria-label", label);
    this.nodeTargets.push(this.routerTarget);
    for (let node = 1; node < NODE_COUNT; node++) {
      const target = document.createElement("div");
      target.className = "guide-hit";
      target.dataset.node = String(node);
      this.nodeTargets.push(target);
      const link = document.createElement("div");
      link.className = "guide-hit guide-hit-link";
      link.dataset.node = String(node);
      this.linkTargets.push(link);
    }
    this.element.append(...this.linkTargets, ...this.nodeTargets.slice(1), this.routerTarget);
    parent.append(this.element);
  }

  get headButton() {
    return this.routerTarget;
  }

  /** Lays the targets on the graph. Skipped when nothing moved more than a couple of pixels, unless forced. */
  place(nodes: Point[], radius: number, toolScales: number[], force = false) {
    if (!force && this.lastPlaced.length && this.movedLittle(nodes)) return;
    this.lastPlaced = nodes.map((each) => ({ ...each }));
    setCircle(this.routerTarget, nodes[ROUTER], radius * 1.9 + REACH * 2);
    for (let node = 1; node < NODE_COUNT; node++) {
      const shown = toolScales[node] > 0.2;
      const target = this.nodeTargets[node];
      target.hidden = !shown;
      setCircle(target, nodes[node], Math.max(LEAST, shape.toolSize * radius * 1.7 * toolScales[node] + REACH * 2));
      const link = this.linkTargets[node - 1];
      link.hidden = !shown;
      setCircle(link, lerpPoint(nodes[ROUTER], nodes[node], 0.5), Math.max(18, shape.linkThickness * radius + REACH));
    }
  }

  private movedLittle(nodes: Point[]) {
    let most = 0;
    nodes.forEach((each, index) => {
      most = Math.max(most, Math.abs(each.x - this.lastPlaced[index].x) + Math.abs(each.y - this.lastPlaced[index].y));
    });
    return most < 3;
  }

  /**
   * While the agent flies between homes its targets let every press through, so a click on a control it passes over
   * reaches the control. Written only when it changes.
   */
  letPressesThrough(through: boolean) {
    if (through === ("passing" in this.element.dataset)) return;
    if (through) this.element.dataset.passing = "";
    else delete this.element.dataset.passing;
  }

  /** Whether an element is one of the agent's targets. */
  owns(target: EventTarget | null) {
    return target instanceof HTMLElement && target.closest(".guide-hits") === this.element;
  }

  /** How many targets there are. */
  get count() {
    return this.nodeTargets.length + this.linkTargets.length;
  }

  /** The share of a rectangle of the screen the targets cover, measured by sampling: for the log, never per frame. */
  coverage(left: number, bottom: number, width: number, height: number) {
    const circles = [...this.nodeTargets, ...this.linkTargets]
      .filter((target) => !target.hidden)
      .map((target) => ({ x: Number(target.dataset.x), y: Number(target.dataset.y), radius: Number(target.dataset.size) / 2 }));
    let inside = 0;
    let total = 0;
    for (let across = left; across < left + width; across += 4)
      for (let up = bottom; up < bottom + height; up += 4) {
        total++;
        if (circles.some((circle) => Math.hypot(circle.x - across, circle.y - up) <= circle.radius)) inside++;
      }
    return inside / total;
  }
}

/** A round target centred on a point of stage space (y up from the screen's bottom). */
function setCircle(target: HTMLElement, centre: Point, size: number) {
  target.style.width = `${size}px`;
  target.style.height = `${size}px`;
  target.style.transform = `translate3d(${centre.x - size / 2}px, ${-(centre.y - size / 2)}px, 0)`;
  target.dataset.x = String(centre.x);
  target.dataset.y = String(centre.y);
  target.dataset.size = String(size);
}

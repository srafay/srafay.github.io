/*
  Where a finger or the mouse can take hold of the python. The canvas lets every touch through, so this is a chain of
  small round targets laid along the body, a larger one on the head. Each says touch-action none, so a drag that
  starts on the python picks it up, and a drag anywhere else scrolls the page as usual. Small circles, never one box:
  a box round a long S would stop the reader scrolling across half the screen.
*/
import { radiusShareAt, head as headShape } from "./proportions";
import type { Point, Spine } from "./spine";

/** Every how many spine points a target sits. */
const EVERY = 3;
/** How far past the body a target reaches, in CSS pixels. */
const REACH = 12;

export class HitArea {
  readonly element: HTMLElement;
  private readonly targets: HTMLElement[] = [];
  private readonly headTarget: HTMLButtonElement;
  private lastPlaced: Point[] = [];

  constructor(parent: HTMLElement, spinePoints: number, label: string) {
    this.element = document.createElement("div");
    this.element.className = "guide-hits";
    for (let index = 0; index < spinePoints; index += EVERY) {
      const target = document.createElement("div");
      target.className = "guide-hit";
      target.dataset.spineIndex = String(index);
      this.targets.push(target);
      this.element.append(target);
    }
    // The head is the one target the keyboard reaches: a button with the python's name.
    this.headTarget = document.createElement("button");
    this.headTarget.type = "button";
    this.headTarget.className = "guide-hit guide-hit-head";
    this.headTarget.dataset.spineIndex = String(spinePoints - 1);
    this.headTarget.setAttribute("aria-label", label);
    this.element.append(this.headTarget);
    parent.append(this.element);
  }

  get headButton() {
    return this.headTarget;
  }

  /** Lays the targets along the body. Skipped when nothing moved more than a couple of pixels, unless forced. */
  place(spine: Spine, headCentre: Point, bodyLength: number, force = false) {
    if (!force && this.lastPlaced.length && this.movedLittle(spine)) return;
    this.lastPlaced = spine.map((each) => ({ ...each }));
    this.targets.forEach((target, order) => {
      const index = order * EVERY;
      const centre = spine[index];
      const size = 2 * radiusShareAt(index / (spine.length - 1)) * bodyLength + REACH * 2;
      setCircle(target, centre, Math.max(28, size));
    });
    setCircle(this.headTarget, headCentre, headShape.lengthShare * bodyLength + REACH * 2.5);
  }

  private movedLittle(spine: Spine) {
    let most = 0;
    for (let index = 0; index < spine.length; index += EVERY)
      most = Math.max(most, Math.abs(spine[index].x - this.lastPlaced[index].x) + Math.abs(spine[index].y - this.lastPlaced[index].y));
    return most < 3;
  }

  /** Whether an element is one of the python's targets. */
  owns(target: EventTarget | null) {
    return target instanceof HTMLElement && target.closest(".guide-hits") === this.element;
  }

  /** The share of a rectangle of the screen the targets cover, measured by sampling: for the log, never per frame. */
  coverage(left: number, bottom: number, width: number, height: number) {
    const circles = [...this.targets, this.headTarget].map((target) => ({
      x: Number(target.dataset.x),
      y: Number(target.dataset.y),
      radius: Number(target.dataset.size) / 2,
    }));
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

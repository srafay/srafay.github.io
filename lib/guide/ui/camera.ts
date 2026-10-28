/*
  The selfie's camera: one soft white flash over the page, then four viewfinder corners framing the python's head
  while it poses. One flash, never repeated, and none at all under reduced motion.
*/
import { element } from "@/lib/about-cv/scene/dom";

/** How long the flash fades and the corners stay, in milliseconds. */
const FLASH_MILLISECONDS = 260;
const FRAME_MILLISECONDS = 1900;

export class Camera {
  private readonly flash: HTMLElement;
  private readonly frame: HTMLElement;
  private timer = 0;

  constructor(parent: HTMLElement) {
    this.flash = element("div", "guide-flash");
    this.flash.setAttribute("aria-hidden", "true");
    this.frame = element("div", "guide-viewfinder");
    this.frame.setAttribute("aria-hidden", "true");
    for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"])
      this.frame.append(element("span", `guide-corner guide-corner-${corner}`));
    parent.append(this.flash, this.frame);
  }

  /** A photo of the head: centred in stage space (y up from the bottom), framed by a square of this size. */
  take(headX: number, headY: number, size: number, flash: boolean) {
    window.clearTimeout(this.timer);
    if (flash) {
      this.flash.dataset.on = "";
      // Two frames later, so the browser has painted it white before it fades.
      requestAnimationFrame(() => requestAnimationFrame(() => delete this.flash.dataset.on));
    }
    const top = window.innerHeight - headY - size / 2;
    this.frame.style.width = `${size}px`;
    this.frame.style.height = `${size}px`;
    this.frame.style.transform = `translate3d(${Math.round(headX - size / 2)}px, ${Math.round(top)}px, 0)`;
    this.frame.dataset.on = "";
    this.timer = window.setTimeout(() => delete this.frame.dataset.on, FRAME_MILLISECONDS + FLASH_MILLISECONDS);
  }
}

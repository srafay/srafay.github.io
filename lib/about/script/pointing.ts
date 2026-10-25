/**
 * Whether a pointer moving over the page means a reader pointing at something. A phone's browser also sends mouse
 * events after a tap, and even as the page scrolls under the finger's last place. On a screen that cannot hover they
 * are ignored, and only taps answer.
 */
export function isPointingWithAMouse(event: PointerEvent) {
  return event.pointerType === "mouse" && matchMedia("(hover: hover)").matches;
}

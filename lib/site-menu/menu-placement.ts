/*
  Where a panel of the menu goes on screen. The menu opens at the pointer and grows down and to the right; near the
  window's right or bottom edge it opens the other way, so it stays whole on screen. A submenu opens beside its item,
  to the right, or to the left where the right has no room. All in CSS pixels from the window's top left corner.
*/
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Box = { left: number; top: number; width: number; height: number };
export type Place = { left: number; top: number };

// A panel never touches the window's edge.
const EDGE_GAP_PIXELS = 8;
// A submenu tucks this far over its parent panel, so the pointer crosses no gap on its way into it.
const SUBMENU_OVERLAP_PIXELS = 4;

/** The window's size, less its scrollbars. */
export const windowSize = (): Size => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

/** Keeps a span of a panel inside the window, with the gap at both ends where it fits. */
function keptOnScreen(start: number, length: number, available: number) {
  const furthestStart = available - EDGE_GAP_PIXELS - length;
  return Math.max(EDGE_GAP_PIXELS, Math.min(start, furthestStart));
}

/** From the point onwards, or back from it where the far side has no room. */
function startNear(point: number, length: number, available: number) {
  const fitsOnward = point + length <= available - EDGE_GAP_PIXELS;
  return keptOnScreen(fitsOnward ? point : point - length, length, available);
}

/** The menu itself: its corner at the pointer. */
export const placeAtPoint = (
  point: Point,
  size: Size,
  viewport: Size,
): Place => ({
  left: startNear(point.x, size.width, viewport.width),
  top: startNear(point.y, size.height, viewport.height),
});

/** A submenu: beside its parent panel, its first item level with the item that opened it. */
export function placeBeside(
  parentPanel: Box,
  parentItem: Box,
  size: Size,
  firstItemInset: number,
  viewport: Size,
): Place {
  const rightOfParent =
    parentPanel.left + parentPanel.width - SUBMENU_OVERLAP_PIXELS;
  const leftOfParent = parentPanel.left - size.width + SUBMENU_OVERLAP_PIXELS;
  const fitsOnTheRight =
    rightOfParent + size.width <= viewport.width - EDGE_GAP_PIXELS;
  return {
    left: keptOnScreen(
      fitsOnTheRight ? rightOfParent : leftOfParent,
      size.width,
      viewport.width,
    ),
    top: keptOnScreen(
      parentItem.top - firstItemInset,
      size.height,
      viewport.height,
    ),
  };
}

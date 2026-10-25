/*
  The calendar names a day, as GitHub's does. Point at a square, tap it, or focus the calendar and move with the
  arrow keys. A small tooltip then says "87 contributions on Thursday 22 October 2026", and a thin ring marks the day.

  The tooltip sits in the calendar's outer box, outside the box that scrolls sideways, so it is never cut off. Every
  place is worked out from the drawing's own box, read once and again only after a scroll or a resize, so the box's
  right-to-left layout never matters and moving the pointer reads no layout.
*/
import { CELL_SIZE, cellLeft, cellTop } from "@/lib/about/calendar-geometry";
import { isPointingWithAMouse } from "./pointing";
import {
  dayAtPoint,
  dayInWords,
  placeOfCalendarDay,
  readCalendar,
  type Calendar,
} from "./calendar-days";

type Shower = "pointer" | "touch" | "keys";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const RING_MARGIN = 1;
// Nearer than this to a side of the box, the tooltip stops centring on its day and sits against that side. Then a
// tooltip as long as "No contributions on Wednesday 21 October 2026" still fits.
const TOOLTIP_HALF_WIDTH = 150;
// How close to the scrolling box's sides a day chosen with the keys may come before the box scrolls to it.
const KEYS_MARGIN = 24;

/** How far each key moves along the days: a column is a week, a row a day. */
const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -7,
  ArrowRight: 7,
  ArrowUp: -1,
  ArrowDown: 1,
};

function createTooltip(box: HTMLElement) {
  const tooltip = document.createElement("div");
  tooltip.className = "calendar-tooltip";
  tooltip.id = "calendar-day";
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("aria-live", "polite");
  tooltip.hidden = true;
  box.append(tooltip);
  return tooltip;
}

function createRing(drawing: SVGSVGElement) {
  const ring = document.createElementNS(SVG_NAMESPACE, "rect");
  ring.setAttribute("class", "calendar-ring");
  ring.setAttribute("width", String(CELL_SIZE + 2 * RING_MARGIN));
  ring.setAttribute("height", String(CELL_SIZE + 2 * RING_MARGIN));
  ring.setAttribute("rx", "3");
  ring.setAttribute("visibility", "hidden");
  drawing.append(ring);
  return ring;
}

const tooltipEdge = (centre: number, width: number) =>
  centre < TOOLTIP_HALF_WIDTH
    ? "start"
    : centre > width - TOOLTIP_HALF_WIDTH
      ? "end"
      : "middle";

export function startCalendarTooltip(
  drawing: SVGSVGElement,
  scroller: HTMLElement,
  box: HTMLElement,
) {
  const calendar: Calendar = readCalendar(drawing);
  const lastDay = calendar.counts.length - 1;
  const tooltip = createTooltip(box);
  const ring = createRing(drawing);
  scroller.setAttribute("aria-describedby", tooltip.id);

  let shown: { day: number; by: Shower } | undefined;
  let dayForKeys = lastDay;
  let boxes: { drawing: DOMRect; box: DOMRect; scroller: DOMRect } | undefined;
  let pointerKind = "mouse";
  let pointerAt: { x: number; y: number } | undefined;
  let frameAsked = false;

  const measure = () =>
    (boxes ??= {
      drawing: drawing.getBoundingClientRect(),
      box: box.getBoundingClientRect(),
      scroller: scroller.getBoundingClientRect(),
    });
  const forgetBoxes = () => (boxes = undefined);
  const scale = () => measure().drawing.width / calendar.drawnWidth;

  function show(day: number, by: Shower) {
    const { drawing: drawn, box: outer } = measure();
    const { week, weekday } = placeOfCalendarDay(calendar, day);
    const centre =
      drawn.left - outer.left + (cellLeft(week) + CELL_SIZE / 2) * scale();
    const top = drawn.top - outer.top + cellTop(weekday) * scale();
    if (shown?.day !== day) {
      tooltip.textContent = dayInWords(calendar, day);
      ring.setAttribute("x", String(cellLeft(week) - RING_MARGIN));
      ring.setAttribute("y", String(cellTop(weekday) - RING_MARGIN));
    }
    tooltip.style.left = `${centre}px`;
    tooltip.style.top = `${top}px`;
    tooltip.dataset.edge = tooltipEdge(centre, outer.width);
    tooltip.hidden = false;
    ring.removeAttribute("visibility");
    shown = { day, by };
  }

  function hide() {
    if (!shown) return;
    tooltip.hidden = true;
    ring.setAttribute("visibility", "hidden");
    shown = undefined;
  }

  /** The day under a point on the screen, through the drawing's own units. */
  function dayUnder(x: number, y: number) {
    const drawn = measure().drawing;
    return dayAtPoint(
      calendar,
      (x - drawn.left) / scale(),
      (y - drawn.top) / scale(),
    );
  }

  function followPointer() {
    frameAsked = false;
    if (!pointerAt) return;
    const day = dayUnder(pointerAt.x, pointerAt.y);
    if (day === undefined) hide();
    else show(day, "pointer");
  }

  /** Scrolls the box just enough that the day chosen with the keys is in view, clear of its sides. */
  function keepInView(day: number) {
    const { drawing: drawn, scroller: visible } = measure();
    const { week } = placeOfCalendarDay(calendar, day);
    const left = drawn.left + cellLeft(week) * scale();
    const right = left + CELL_SIZE * scale();
    const shortOnLeft = visible.left + KEYS_MARGIN - left;
    const shortOnRight = right - (visible.right - KEYS_MARGIN);
    if (shortOnLeft > 0)
      scroller.scrollBy({ left: -shortOnLeft, behavior: "instant" });
    else if (shortOnRight > 0)
      scroller.scrollBy({ left: shortOnRight, behavior: "instant" });
    forgetBoxes();
  }

  drawing.addEventListener(
    "pointerdown",
    (event) => (pointerKind = event.pointerType),
    {
      passive: true,
    },
  );
  drawing.addEventListener(
    "pointermove",
    (event) => {
      if (!isPointingWithAMouse(event)) return;
      pointerAt = { x: event.clientX, y: event.clientY };
      if (!frameAsked) requestAnimationFrame(followPointer);
      frameAsked = true;
    },
    { passive: true },
  );
  drawing.addEventListener("pointerleave", (event) => {
    pointerAt = undefined;
    if (event.pointerType === "mouse" && shown?.by === "pointer") hide();
  });
  drawing.addEventListener("click", (event) => {
    if (pointerKind === "mouse") return;
    const day = dayUnder(event.clientX, event.clientY);
    if (day === undefined || day === shown?.day) hide();
    else show(day, "touch");
  });

  scroller.addEventListener("focus", () => {
    if (scroller.matches(":focus-visible")) show(dayForKeys, "keys");
  });
  scroller.addEventListener("blur", () => {
    if (shown?.by === "keys") hide();
  });
  scroller.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return hide();
    const step = KEY_STEPS[event.key];
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? lastDay
          : step !== undefined
            ? dayForKeys + step
            : undefined;
    if (target === undefined) return;
    event.preventDefault();
    dayForKeys = Math.min(lastDay, Math.max(0, target));
    keepInView(dayForKeys);
    show(dayForKeys, "keys");
  });
  scroller.addEventListener(
    "scroll",
    () => {
      forgetBoxes();
      if (shown && shown.by !== "keys") hide();
    },
    { passive: true },
  );

  addEventListener("scroll", forgetBoxes, { passive: true });
  addEventListener("resize", () => {
    forgetBoxes();
    hide();
  });
  addEventListener(
    "pointerdown",
    (event) => {
      if (shown?.by === "touch" && !box.contains(event.target as Node)) hide();
    },
    { passive: true },
  );
  addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
}

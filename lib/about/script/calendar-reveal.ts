/*
  The calendar's one moment. The first time a reader stops on it, its busy days light in date order over about a
  second and a half. The year's total counts up with them and ends on GitHub's own figure. It runs once a page view.
  It runs only if the calendar was still below the screen when the page started, since a reader already on it has
  seen it lit. It starts once the calendar has been at least half in view for a moment, so a quick flick past does
  not set it off. With reduced motion it never runs.

  Until then a veil of empty squares lies over the busy days. Each frame moves one edge of the veil's clip, a
  staircase that steps through the weeks a day at a time, so a frame writes one attribute and one number.
*/
import {
  CELL_GAP,
  CELL_ROUNDING,
  cellLeft,
  cellTop,
  square,
} from "@/lib/about/calendar-geometry";
import { formatCount } from "@/lib/format";
import {
  placeOfCalendarDay,
  readCalendar,
  type Calendar,
} from "./calendar-days";
import { prefersReducedMotion } from "./motion";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const REVEAL_MILLISECONDS = 1500;
const SHARE_IN_VIEW_TO_START = 0.5;
const STILL_IN_VIEW_MILLISECONDS = 150;
const CLIP_ID = "calendar-veil-clip";

/** Slow at both ends: the first and last weeks light gently, the middle of the year sweeps. */
const easeInOut = (progress: number) => -(Math.cos(Math.PI * progress) - 1) / 2;

/** The part of the drawing whose days are still dark: every week after the first dark day's, and that week from it down. */
function darkPart(calendar: Calendar, firstDarkDay: number) {
  const { week, weekday } = placeOfCalendarDay(calendar, firstDarkDay);
  const halfGap = CELL_GAP / 2;
  const left = cellLeft(week) - halfGap;
  const nextLeft = cellLeft(week + 1) - halfGap;
  const top = cellTop(weekday) - halfGap;
  const bottom = calendar.drawnHeight + CELL_GAP;
  const right = calendar.drawnWidth + CELL_GAP;
  return `M${left} ${top}V${bottom}H${right}V${-CELL_GAP}H${nextLeft}V${top}Z`;
}

/** Empty squares over every busy day, clipped to the part still dark. */
function createVeil(drawing: SVGSVGElement, calendar: Calendar) {
  const clip = document.createElementNS(SVG_NAMESPACE, "clipPath");
  clip.id = CLIP_ID;
  const clipShape = document.createElementNS(SVG_NAMESPACE, "path");
  clipShape.setAttribute("d", darkPart(calendar, 0));
  clip.append(clipShape);
  const veil = document.createElementNS(SVG_NAMESPACE, "path");
  veil.setAttribute("class", "calendar-veil shade-0");
  veil.setAttribute("stroke-width", String(2 * CELL_ROUNDING));
  veil.setAttribute("stroke-linejoin", "round");
  veil.setAttribute("clip-path", `url(#${CLIP_ID})`);
  veil.setAttribute(
    "d",
    calendar.counts
      .map((count, day) => {
        if (count === 0) return "";
        const { week, weekday } = placeOfCalendarDay(calendar, day);
        return square(cellLeft(week), cellTop(weekday));
      })
      .join(""),
  );
  drawing.append(clip, veil);
  return {
    darkenFrom: (day: number) =>
      clipShape.setAttribute("d", darkPart(calendar, day)),
    remove: () => {
      clip.remove();
      veil.remove();
    },
  };
}

/** The total, counted up in step with the days lit, in a box held at its final width so the line does not shift. */
function createCounter(total: HTMLElement, calendar: Calendar) {
  const finalWords = total.textContent ?? "";
  const finalCount = Number(finalWords.replace(/\D/g, ""));
  const daySum = calendar.counts.reduce((sum, count) => sum + count, 0);
  let runningSum = 0;
  const sumsThroughDay = calendar.counts.map((count) => (runningSum += count));
  let written = finalWords;
  return {
    hold() {
      total.style.minWidth = `${total.getBoundingClientRect().width}px`;
      total.classList.add("is-counting");
    },
    show(litDays: number) {
      const shown =
        litDays === 0
          ? 0
          : Math.round((finalCount * sumsThroughDay[litDays - 1]) / daySum);
      const words = formatCount(shown);
      if (words === written) return;
      total.textContent = words;
      written = words;
    },
    finish() {
      total.textContent = finalWords;
      total.style.minWidth = "";
      total.classList.remove("is-counting");
    },
  };
}

function play(
  calendar: Calendar,
  veil: ReturnType<typeof createVeil>,
  total: HTMLElement | null,
) {
  const counter = total ? createCounter(total, calendar) : undefined;
  const dayCount = calendar.counts.length;
  counter?.hold();
  counter?.show(0);
  let startedAt: number | undefined;
  const step = (now: number) => {
    startedAt ??= now;
    const progress = Math.min(1, (now - startedAt) / REVEAL_MILLISECONDS);
    const litDays = Math.round(easeInOut(progress) * dayCount);
    if (litDays >= dayCount) {
      veil.remove();
      counter?.finish();
      return;
    }
    veil.darkenFrom(litDays);
    counter?.show(litDays);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const isBelowScreen = (element: Element) =>
  element.getBoundingClientRect().top >= innerHeight;

export function startCalendarReveal(
  drawing: SVGSVGElement,
  box: HTMLElement,
  total: HTMLElement | null,
) {
  if (prefersReducedMotion() || !isBelowScreen(box)) return;
  const calendar = readCalendar(drawing);
  const veil = createVeil(drawing, calendar);
  let waiting: ReturnType<typeof setTimeout> | undefined;
  const watcher = new IntersectionObserver(
    ([entry]) => {
      clearTimeout(waiting);
      if (entry.intersectionRatio < SHARE_IN_VIEW_TO_START) return;
      waiting = setTimeout(() => {
        watcher.disconnect();
        if (document.hidden) veil.remove();
        else play(calendar, veil, total);
      }, STILL_IN_VIEW_MILLISECONDS);
    },
    { threshold: [0, SHARE_IN_VIEW_TO_START] },
  );
  watcher.observe(box);
}

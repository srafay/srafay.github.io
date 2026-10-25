/*
  Marks the section being read in the "On this page" lists (components/about/section-links.tsx). The section being
  read is the last one whose top has passed a line a quarter of the way down the screen, or the last section once the
  page is scrolled to its end, since the last sections are too short to reach that line. A section chosen from the
  list stays marked until the reader scrolls on their own, even where the page ends before its top reaches the line.

  Where the sections start is read only when the page changes size, never while scrolling: a scroll compares the
  scroll position with those numbers, once a frame at most.
*/
import { sectionsInPageOrder } from "@/lib/about/sections";

const READING_LINE_SHARE = 0.25;
// A page this close to its end counts as scrolled to the end.
const END_TOLERANCE = 4;

export function startSectionMarks() {
  const sections = sectionsInPageOrder
    .map((section) => document.getElementById(section.id))
    .filter((element): element is HTMLElement => !!element);
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>("[data-section-link]"),
  ];
  if (sections.length === 0 || links.length === 0) return;

  let sectionTops: number[] = [];
  let pageHeight = 0;
  let marked: string | undefined;
  let chosen: string | undefined;
  let frameAsked = false;

  function measure() {
    sectionTops = sections.map(
      (section) => section.getBoundingClientRect().top + scrollY,
    );
    pageHeight = document.documentElement.scrollHeight;
  }

  function sectionBeingRead() {
    const atEnd = scrollY + innerHeight >= pageHeight - END_TOLERANCE;
    if (atEnd) return sections[sections.length - 1].id;
    const line = scrollY + innerHeight * READING_LINE_SHARE;
    const passed = sectionTops.filter((top) => top <= line).length;
    return passed === 0 ? undefined : sections[passed - 1].id;
  }

  function mark() {
    frameAsked = false;
    const current = chosen ?? sectionBeingRead();
    if (current === marked) return;
    marked = current;
    for (const link of links) {
      if (link.dataset.sectionLink === current)
        link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }

  const markSoon = () => {
    if (!frameAsked) requestAnimationFrame(mark);
    frameAsked = true;
  };

  new ResizeObserver(() => {
    measure();
    markSoon();
  }).observe(document.body);
  addEventListener("scroll", markSoon, { passive: true });

  for (const link of links)
    link.addEventListener("click", () => {
      chosen = link.dataset.sectionLink;
      markSoon();
    });
  // Only a reader's own hand moves on from a chosen section: the glide a link starts sends scroll events too.
  const scrollingByHand = () => (chosen = undefined);
  for (const type of ["wheel", "touchstart", "keydown"])
    addEventListener(type, scrollingByHand, { passive: true });
}

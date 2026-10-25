/*
  The About page's script (public/about.js, built by scripts/build-about-scenes.ts). The page reads in full without
  it. With it, the page answers a touch, a pointer or a key:
  - a pressed skill lights the roles in Experience that used it and names them, and a role lights its skills
  - the ruler over Experience names a role and its months
  - the calendar names a day, and lights its year once, the first time a reader stops on it
  - the "On this page" lists mark the section being read
  - the place in the profile column gives the time there now
  It fetches nothing. Everything it adds to the page waits until React has taken the page over.
*/
import { startCalendarReveal } from "./calendar-reveal";
import { startCalendarTooltip } from "./calendar-tooltip";
import { whenPageIsHydrated } from "./hydration";
import { startLocalTime } from "./local-time";
import { findPageParts } from "./page-parts";
import { startSectionMarks } from "./section-marks";
import { createSelection } from "./selection";
import { watchSelectionControls } from "./selection-controls";
import { createSelectionView } from "./selection-view";

function startSkillsAndRoles() {
  const parts = findPageParts();
  if (parts.roles.length === 0) return;
  const selection = createSelection(createSelectionView(parts));
  watchSelectionControls(parts, selection);
}

function startCalendar() {
  const drawing = document.querySelector<SVGSVGElement>(
    ".calendar-scroll svg[data-counts]",
  );
  const scroller = drawing?.closest<HTMLElement>(".calendar-scroll");
  const box = drawing?.closest<HTMLElement>(".calendar-box");
  if (!drawing || !scroller || !box) return;
  startCalendarTooltip(drawing, scroller, box);
  startCalendarReveal(
    drawing,
    box,
    document.querySelector<HTMLElement>("[data-calendar-total]"),
  );
}

whenPageIsHydrated(() => {
  startSkillsAndRoles();
  startCalendar();
  startSectionMarks();
  startLocalTime();
});

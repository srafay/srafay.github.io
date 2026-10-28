/*
  How each kind of event rises from the land, by what the kind is, never to make a year win. A role is a long ridge
  along its dates, a degree a broad hill, a course a short sharp peak, a project a knoll, an activity a low swell.
  Heights are in cells. Each kind is one line, so a better reading of a kind changes one line.
*/
import type { EventKind } from "@/lib/about-cv/events";

export type Form = "ridge" | "hill" | "peak" | "knoll" | "swell";

export type Rise = {
  form: Form;
  /** How high its own rise stands, in cells, before the busy base under it. */
  height: number;
  /** How far its foot reaches past its dates on each side, in years. */
  skirt: number;
};

export const RISES: Record<EventKind, Rise> = {
  // Full-time work, for as long as it lasted.
  role: { form: "ridge", height: 4, skirt: 0.25 },
  // Work the CV does not date: a short ridge about its placed time (layout.ts gives it a quarter year).
  internship: { form: "ridge", height: 3, skirt: 0.2 },
  // Years of study: broad, rounded, highest in the middle.
  degree: { form: "hill", height: 3.5, skirt: 0.4 },
  thesis: { form: "knoll", height: 3, skirt: 0.15 },
  project: { form: "knoll", height: 2.5, skirt: 0.14 },
  // A few weeks of learning: short and steep.
  course: { form: "peak", height: 3.5, skirt: 0.12 },
  activity: { form: "swell", height: 1.8, skirt: 0.3 },
  pastime: { form: "swell", height: 1.5, skirt: 0.16 },
};

/** Eases from 0 to 1 with no corner at either end. */
export const smooth = (share: number) =>
  share <= 0 ? 0 : share >= 1 ? 1 : share * share * (3 - 2 * share);

/** How much a ridge's top falls toward its ends, so it stands as a crowned ridge and not a flat shelf. */
const RIDGE_CROWN = 0.22;

/** How much of a rise stands at a time, from 0 to 1, for a form laid over [start, end] with its skirt. */
export function riseAlong(rise: Rise, start: number, end: number, time: number) {
  const from = start - rise.skirt;
  const to = end + rise.skirt;
  if (time <= from || time >= to) return 0;
  if (rise.form === "ridge") {
    const crown = 1 - RIDGE_CROWN;
    if (time < start) return crown * smooth((time - from) / rise.skirt);
    if (time > end) return crown * smooth((to - time) / rise.skirt);
    return crown + RIDGE_CROWN * Math.sin((Math.PI * (time - start)) / Math.max(end - start, 1e-6));
  }
  if (rise.form === "hill") return Math.sin((Math.PI * (time - from)) / (to - from));
  const middle = (from + to) / 2;
  const share = 1 - Math.abs(time - middle) / ((to - from) / 2);
  if (rise.form === "peak") return share ** 1.8;
  if (rise.form === "knoll") return smooth(share);
  return Math.sin((share * Math.PI) / 2) ** 2;
}

/** How far a rise eases out past the edge of its track, in columns. */
export const FOOT_COLUMNS = 2.5;

/** How much of a rise stands at a column, from 0 to 1: all of it across its track, easing out past either edge. */
export function riseAcross(trackLeft: number, trackWidth: number, column: number) {
  const outside = Math.abs(column + 0.5 - (trackLeft + trackWidth / 2)) - trackWidth / 2;
  if (outside <= -0.5) return 1;
  return 1 - smooth((outside + 0.5) / FOOT_COLUMNS);
}

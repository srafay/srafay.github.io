/*
  Where each event stands on the land: its span in time, and its track across its lane. One function per assumption.
  - A project the CV dates by its year alone shares that year with the others of its year, in the CV's order. So the
    six of 2018 stand as six knolls through 2018. Its card still says only "2018".
  - An internship has no dates: a short ridge of a quarter year about the time undated-places.ts gives it.
  - Events of one lane share its width only where their dated spans truly overlap. A role's one-month hand-over to the
    next is not an overlap: the two share the lane, and the higher one at each cell takes it.
*/
import type { WorldEvent } from "@/lib/about-cv/events";
import { worlds } from "@/lib/about-cv/worlds";
import { LANE_COLUMNS, type Grid } from "./grid";

export type Span = { start: number; end: number };
export type Track = { left: number; width: number };

/** How long an internship's undated ridge is, in years. */
const INTERNSHIP_YEARS = 0.25;
/** The shortest span a track holds, so a point event still has room. */
const SHORTEST_TRACK_YEARS = 0.08;
/** Two spans that overlap by less than this, or by less than half the shorter one, share a track. */
const HAND_OVER_YEARS = 0.1;

const isDatedByYearAlone = (event: WorldEvent) => event.kind === "project";

/** The projects of each year, in the CV's order. */
function projectsByYear(events: WorldEvent[]) {
  const byYear = new Map<number, WorldEvent[]>();
  for (const event of events.filter(isDatedByYearAlone)) {
    const year = Math.floor(event.start);
    byYear.set(year, [...(byYear.get(year) ?? []), event]);
  }
  return byYear;
}

/** Where each event is drawn along time. */
export function spansOf(events: WorldEvent[]): Map<string, Span> {
  const spans = new Map<string, Span>();
  for (const event of events) spans.set(event.id, { start: event.start, end: event.end ?? event.start });
  for (const [year, group] of projectsByYear(events))
    if (group.length > 1)
      group.forEach((event, index) => {
        const time = year + (index + 0.5) / group.length;
        spans.set(event.id, { start: time, end: time });
      });
  for (const event of events)
    if (event.kind === "internship")
      spans.set(event.id, { start: event.start - INTERNSHIP_YEARS / 2, end: event.start + INTERNSHIP_YEARS / 2 });
  return spans;
}

/** When each event counts as under way, for the busy base: a year-only date counts its whole year. */
export function busySpansOf(events: WorldEvent[]): Span[] {
  return events.map((event) =>
    isDatedByYearAlone(event)
      ? { start: Math.floor(event.start), end: Math.floor(event.start) + 1 }
      : { start: event.start, end: event.end ?? event.start },
  );
}

type Item = { event: WorldEvent; from: number; to: number };

const handOver = (item: Item) => Math.min(HAND_OVER_YEARS, 0.5 * (item.to - item.from));

/** Runs of a lane's events whose spans overlap, each run to be shared out in tracks. */
function overlappingRuns(items: Item[]) {
  const runs: Item[][] = [];
  let reach = -Infinity;
  for (const item of items) {
    if (item.from < reach - handOver(item)) runs[runs.length - 1].push(item);
    else runs.push([item]);
    reach = Math.max(reach, item.to);
  }
  return runs;
}

/** Each event's track: the whole lane, or a share of it where its span overlaps others. */
export function tracksOf(events: WorldEvent[], spans: Map<string, Span>, grid: Grid): Map<string, Track> {
  const tracks = new Map<string, Track>();
  for (const world of worlds) {
    const items = events
      .filter((event) => event.world === world.key)
      .map((event) => {
        const span = spans.get(event.id) as Span;
        return { event, from: span.start, to: Math.max(span.end, span.start + SHORTEST_TRACK_YEARS) };
      })
      .sort((first, second) => first.from - second.from);
    for (const run of overlappingRuns(items)) {
      const ends: number[] = [];
      const placed = run.map((item) => {
        let index = ends.findIndex((end) => end <= item.from + handOver(item));
        if (index < 0) index = ends.push(0) - 1;
        ends[index] = item.to;
        return { item, index };
      });
      const width = LANE_COLUMNS / ends.length;
      for (const { item, index } of placed)
        tracks.set(item.event.id, { left: Math.round(grid.laneLeft(world.key) + index * width), width: Math.round(width) });
    }
  }
  return tracks;
}

/*
  What the reader has brought into focus: the slice through time, the isolated world, the lit skill, the open event
  and where a ride stands. The travel through time is version 4's reader (a place from 0 to 1 that wheels, swipes,
  keys, the rail and the ride move, with a swipe's carrying on). Its first stretch fades the slice in at the present.
  The rest of it carries the slice back, a calendar year at a time, to 2014.
*/
import { Follower } from "@/lib/about-cv/scene/follower";
import type { WorldEvent } from "@/lib/about-cv/events";
import type { SkillWord } from "@/lib/about-cv/skills";
import { FIRST_YEAR } from "@/lib/about-cv/time";
import type { WorldKey } from "@/lib/about-cv/worlds";
import { beadTime } from "@/lib/hypercube/shape";

/** The share of the travel that fades the slice in at the present, before it moves back through the years. */
export const SLICE_ARRIVES_BY = 0.04;

/** The year in focus at a place of the travel, or null for all years. */
export function yearAtTravel(progress: number, present: number): number | null {
  if (progress < SLICE_ARRIVES_BY * 0.5) return null;
  const share = Math.max(0, (progress - SLICE_ARRIVES_BY) / (1 - SLICE_ARRIVES_BY));
  return Math.max(FIRST_YEAR, Math.floor(present - share * (present - FIRST_YEAR)));
}

/** The place of the travel that stands for a moment: evenly from now, just past the slice's fade, back to 2014. */
export const travelAtTime = (time: number, present: number) =>
  SLICE_ARRIVES_BY + ((present - Math.min(present, time)) / (present - FIRST_YEAR)) * (1 - SLICE_ARRIVES_BY);

/** The moment a place of the travel stands for, the other way round. */
export const timeAtTravel = (progress: number, present: number) =>
  present - (Math.max(0, progress - SLICE_ARRIVES_BY) / (1 - SLICE_ARRIVES_BY)) * (present - FIRST_YEAR);

/** The place of the travel that brings a year into focus: the middle of its stretch. */
export const travelAtYear = (year: number, present: number) => travelAtTime(Math.min(present, year + 0.5), present);

/** The window of time a year lights: the calendar year, up to now for this one. */
export const yearWindow = (year: number, present: number) => ({ from: year, to: Math.min(year + 1, present) });

/** Where a ride stands: the event the point is at, the events it has met, and the city of its moment. */
export type RideFocus = { current: WorldEvent | null; met: Set<string>; city: string | null };

/** How far the rest of the object steps back while a ride lights its events: less than for a lit skill or a card. */
const RIDE_STEPS_BACK = 0.45;

export class Focus {
  /** The year in focus, or null when every year shows. */
  year: number | null = null;
  isolated: WorldKey | null = null;
  litSkill: SkillWord | null = null;
  openEvent: WorldEvent | null = null;
  ride: RideFocus | null = null;
  private readonly sliceShown = new Follower(0, 60);
  private readonly centreShown: Follower;
  private readonly selectingShown = new Follower(0, 60);
  private readonly gatherShown = new Follower(0, 22);

  constructor(
    private readonly present: number,
    private readonly still: boolean,
  ) {
    this.centreShown = new Follower(present, 60);
  }

  /** Whether an event was happening in the year in focus: a span that ran through it counts, not only its end. */
  inSlice(event: WorldEvent) {
    if (this.year === null) return false;
    const { from, to } = yearWindow(this.year, this.present);
    return Math.min(event.start, beadTime(event, this.present)) < to && beadTime(event, this.present) >= from;
  }

  /** Whether an event is lit by the reader: the lit skill names it, its card is open, or a ride is at it. */
  isLit(event: WorldEvent) {
    if (this.openEvent?.id === event.id) return true;
    if (this.ride?.current?.id === event.id) return true;
    return this.litSkill?.events.includes(event.id) ?? false;
  }

  /** Whether a skill's dust is gathered to its events: it is the lit skill. */
  isSkillLit(skill: SkillWord) {
    return this.litSkill === skill;
  }

  /** Whether the reader has picked something to light: an open card or a lit skill. */
  isSelecting() {
    return this.openEvent !== null || this.litSkill !== null;
  }

  /** Runs on by a frame's time. Says whether anything is still settling. */
  step(seconds: number) {
    const span = this.year === null ? null : yearWindow(this.year, this.present);
    const centre = span ? (span.from + span.to) / 2 : this.present;
    const targets: [Follower, number][] = [
      [this.sliceShown, this.year === null ? 0 : 1],
      [this.centreShown, centre],
      [this.selectingShown, this.isSelecting() ? 1 : this.ride?.current ? RIDE_STEPS_BACK : 0],
      [this.gatherShown, this.litSkill !== null ? 1 : 0],
    ];
    let moving = false;
    for (const [follower, target] of targets) {
      if (this.still) follower.jump(target);
      else moving = follower.step(target, seconds) || moving;
    }
    return moving;
  }

  /** The slice's shown state, for the shaders: how much it shows, its middle, and its half width in years. */
  slice() {
    const halfWidth = this.year === null ? 0.5 : (yearWindow(this.year, this.present).to - this.year) / 2;
    return { on: this.sliceShown.value, centre: this.centreShown.value, halfWidth };
  }

  selecting() {
    return this.selectingShown.value;
  }

  gather() {
    return this.gatherShown.value;
  }
}

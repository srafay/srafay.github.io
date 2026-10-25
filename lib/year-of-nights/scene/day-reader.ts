/*
  Reading a single day: a tap (or, with a mouse, a hover) finds the star nearest the pointer, and a small card beside
  it gives the day's date and its count. Keyboard readers focus the galaxy and step through the days with the arrow
  keys, a day at a time across and a week at a time up and down. The card is a polite live region, so a screen
  reader hears the day it lands on.
*/
import type { DrawnDays } from "./painter";
import { withThousands } from "./motion";
import { galaxyDays } from "./world";

const TOUCH_REACH = 26;
const MOUSE_REACH = 16;
const DAYS_IN_A_WEEK = 7;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "Thursday 22 October 2026", worked out in UTC so a reader's time zone never moves the day. Written by hand: the
 * browser's date format costs a phone a long first call, which landed on the first tap.
 */
export function dayInWords(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[day.getUTCDay()]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
}

export function countInWords(count: number) {
  if (count === 0) return "No contributions";
  if (count === 1) return "1 contribution";
  return `${withThousands(count)} contributions`;
}

/** The drawn day nearest to a point on the stage, if one is within reach of a finger or a mouse. */
export function nearestDay(
  drawn: DrawnDays,
  x: number,
  y: number,
  isFinger: boolean,
) {
  const reach = isFinger ? TOUCH_REACH : MOUSE_REACH;
  let nearest = -1;
  let nearestDistance = Infinity;
  for (let index = 0; index < drawn.shown.length; index++) {
    if (!drawn.shown[index]) continue;
    const distance =
      Math.hypot(drawn.x[index] - x, drawn.y[index] - y) - drawn.radius[index];
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  }
  return nearestDistance <= reach ? nearest : -1;
}

/** The day a key moves to from this one, or the same day for a key that does not move. */
export function dayAfterKey(key: string, current: number, busiest: number) {
  const last = galaxyDays.length - 1;
  const from = current < 0 ? busiest : current;
  const moves: Record<string, number> = {
    ArrowRight: from + 1,
    ArrowLeft: from - 1,
    ArrowDown: from + DAYS_IN_A_WEEK,
    ArrowUp: from - DAYS_IN_A_WEEK,
    Home: 0,
    End: last,
  };
  if (current < 0 && key in moves) return busiest;
  if (!(key in moves)) return current;
  return Math.min(last, Math.max(0, moves[key]));
}

export class DayCard {
  private shownDay = -1;
  private width = 0;
  private height = 0;

  constructor(
    private readonly card: HTMLElement,
    private readonly dateLine: HTMLElement,
    private readonly countLine: HTMLElement,
  ) {}

  /** Fills the card for a day and measures it once, on a tap or a key, never in a frame. */
  show(dayIndex: number) {
    if (dayIndex === this.shownDay) return;
    this.shownDay = dayIndex;
    if (dayIndex < 0) {
      this.card.hidden = true;
      return;
    }
    const day = galaxyDays[dayIndex];
    this.dateLine.textContent = dayInWords(day.date);
    this.countLine.textContent = countInWords(day.count);
    this.card.dataset.skyBusiest = String(
      day.count === Math.max(...galaxyDays.map((each) => each.count)),
    );
    this.card.hidden = false;
    this.width = this.card.offsetWidth;
    this.height = this.card.offsetHeight;
  }

  /** Keeps the card beside its star as the sky drifts: to the right, or to the left near the right edge. */
  follow(starX: number, starY: number, starRadius: number, stageWidth: number) {
    if (this.shownDay < 0) return;
    const gap = starRadius + 14;
    const fitsRight = starX + gap + this.width < stageWidth - 12;
    const x = fitsRight ? starX + gap : starX - gap - this.width;
    const y = starY - this.height / 2;
    this.card.style.transform = `translate3d(${Math.round(Math.max(8, x))}px, ${Math.round(y)}px, 0)`;
  }

  get day() {
    return this.shownDay;
  }
}

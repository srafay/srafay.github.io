/*
  The time where the owner lives, under the place in the profile column: "9:14 am there". A reader whose own clock
  differs also gets the gap, "6 hours ahead of you". Someone in Karachi can then tell it is the middle of the night
  before sending a message. It turns over with the minute and does nothing while the page is hidden. With no script
  the line is absent, never wrong.
*/
const MILLISECONDS_IN_A_MINUTE = 60_000;
const MINUTES_IN_AN_HOUR = 60;
// Wakes just after the minute turns, so the clock never shows the old minute.
const WAKE_AFTER_THE_MINUTE_MILLISECONDS = 50;

/** "9:14 am" in a time zone, with am and pm written the same in every browser. */
function clockTime(moment: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(moment);
  const part = (type: string) =>
    parts.find((each) => each.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} ${part("dayPeriod").toLowerCase()}`;
}

/** How many minutes a time zone's clocks are ahead of UTC at a moment. */
function minutesAheadOfUtc(moment: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(moment);
  const part = (type: string) =>
    Number(parts.find((each) => each.type === type)?.value);
  const asIfUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
  );
  const wholeMinute =
    Math.floor(moment.getTime() / MILLISECONDS_IN_A_MINUTE) *
    MILLISECONDS_IN_A_MINUTE;
  return Math.round((asIfUtc - wholeMinute) / MILLISECONDS_IN_A_MINUTE);
}

/** The reader's own clock, in minutes ahead of UTC. */
const readerMinutesAheadOfUtc = (moment: Date) => -moment.getTimezoneOffset();

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** "6 hours", "5 and a half hours", "half an hour", "5 hours 45 minutes". */
function lengthInWords(minutes: number) {
  const hours = Math.floor(minutes / MINUTES_IN_AN_HOUR);
  const leftOver = minutes % MINUTES_IN_AN_HOUR;
  if (leftOver === 0) return plural(hours, "hour");
  if (leftOver === 30)
    return hours === 0 ? "half an hour" : `${hours} and a half hours`;
  if (hours === 0) return plural(leftOver, "minute");
  return `${plural(hours, "hour")} ${plural(leftOver, "minute")}`;
}

/** ", 6 hours ahead of you", ", 3 hours behind you", or nothing when the reader's clock shows the same time. */
function gapInWords(moment: Date, timeZone: string) {
  const gap =
    minutesAheadOfUtc(moment, timeZone) - readerMinutesAheadOfUtc(moment);
  if (gap === 0) return "";
  return `, ${lengthInWords(Math.abs(gap))} ${gap > 0 ? "ahead of" : "behind"} you`;
}

export const timeThereInWords = (moment: Date, timeZone: string) =>
  `${clockTime(moment, timeZone)} there${gapInWords(moment, timeZone)}`;

export function startLocalTime() {
  const place = document.querySelector<HTMLElement>("[data-time-zone]");
  const timeZone = place?.dataset.timeZone;
  if (!place || !timeZone) return;
  const line = document.createElement("span");
  line.className = "profile-local-time";
  let waking: ReturnType<typeof setTimeout> | undefined;

  function tick() {
    const now = new Date();
    line.textContent = timeThereInWords(now, timeZone!);
    const untilNextMinute =
      MILLISECONDS_IN_A_MINUTE - (now.getTime() % MILLISECONDS_IN_A_MINUTE);
    waking = setTimeout(
      tick,
      untilNextMinute + WAKE_AFTER_THE_MINUTE_MILLISECONDS,
    );
  }

  try {
    tick();
  } catch {
    // A browser that does not know the time zone shows the place alone.
    return;
  }
  place.append(line);
  document.addEventListener("visibilitychange", () => {
    clearTimeout(waking);
    if (!document.hidden) tick();
  });
}

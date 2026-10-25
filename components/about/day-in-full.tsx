import { formatDayInFull } from "@/lib/format";

/** A day written out, "25 October 2026", kept on one line so the day and its month never part. */
export const DayInFull = ({ day }: { day: string }) => (
  <time className="day-in-full" dateTime={day}>
    {formatDayInFull(day)}
  </time>
);

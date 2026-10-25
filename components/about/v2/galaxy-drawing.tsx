import calendar from "@/content/about/contributions.json";
import { styles } from "@/components/about/v2/class-names";
import { busiestDayIndex } from "@/lib/year-of-nights/year-facts";
import {
  ARM_END_RADIUS,
  dayStars,
  MONTH_NAME_DISTANCE,
} from "@/lib/year-of-nights/galaxy";
import { formatCount, formatDayInFull } from "@/lib/format";

/*
  The galaxy of days as plain SVG, drawn at build time from the same positions the sky's script uses
  (lib/year-of-nights/galaxy.ts). It is what a reader without the script sees behind the name. The script hides it
  and draws the living sky in its place.
*/
const EDGE = ARM_END_RADIUS + MONTH_NAME_DISTANCE + 40;

export function GalaxyDrawing() {
  const { days, total } = calendar;
  const stars = dayStars(days);
  const busiest = busiestDayIndex(days);
  const summary = `The ${days.length} days from ${formatDayInFull(days[0].date)} to ${formatDayInFull(days[days.length - 1].date)} as stars on twelve arms, one a month, each star as large as that day's contributions. GitHub counts ${formatCount(total)} in all. The largest is ${formatDayInFull(days[busiest].date)}, with ${days[busiest].count}.`;
  return (
    <svg
      className={styles.fallback}
      data-sky-fallback=""
      viewBox={`${-EDGE} ${-EDGE} ${2 * EDGE} ${2 * EDGE}`}
      role="img"
    >
      <title>{summary}</title>
      {stars.map((star) => (
        <circle
          key={star.date}
          className={star.index === busiest ? styles.fallbackGold : undefined}
          cx={star.x.toFixed(1)}
          cy={star.y.toFixed(1)}
          r={star.coreRadius.toFixed(2)}
          opacity={star.brightness.toFixed(2)}
          data-count={star.count}
        />
      ))}
    </svg>
  );
}

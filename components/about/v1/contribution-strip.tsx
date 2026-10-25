import {
  contributionWeeks,
  type ContributionWeek,
} from "@/components/about/v1/contribution-weeks";
import { capitalised, inWords } from "@/components/about/v1/facts";
import { DayInFull } from "@/components/about/day-in-full";
import { formatCount, formatDayInFull, formatMonthInFull } from "@/lib/format";

/*
  The year of contributions as one slim strip: a bar a week, its height the week's count against the busiest week's.
  The drawing stretches to the strip's width (the bars keep their share of each column), so 53 weeks fit a 320 px
  phone without a sideways scroll. Plain SVG drawn at build time, one path for every bar but the busiest.
*/
const COLUMN_WIDTH = 10;
const BAR_WIDTH = 7;
const STRIP_HEIGHT = 50;
// A week with any contributions is drawn at least this tall, so a quiet week never reads as an empty one.
const SHORTEST_BAR = 1.5;

const barHeight = (week: ContributionWeek, busiest: ContributionWeek) =>
  week.total === 0
    ? 0
    : Math.max(SHORTEST_BAR, (week.total / busiest.total) * STRIP_HEIGHT);

const barLeft = (index: number) =>
  index * COLUMN_WIDTH + (COLUMN_WIDTH - BAR_WIDTH) / 2;

/** One bar, as a path step: up from the baseline, across, and back down. */
function bar(index: number, height: number) {
  const top = STRIP_HEIGHT - height;
  return `M${barLeft(index)} ${STRIP_HEIGHT}V${top.toFixed(2)}h${BAR_WIDTH}V${STRIP_HEIGHT}z`;
}

function barsOf(
  weeks: ContributionWeek[],
  busiest: ContributionWeek,
  isWanted: (week: ContributionWeek) => boolean,
) {
  return weeks
    .map((week, index) =>
      week.total > 0 && isWanted(week)
        ? bar(index, barHeight(week, busiest))
        : "",
    )
    .join("");
}

export function ContributionStrip() {
  const year = contributionWeeks();
  const { weeks, busiest } = year;
  const isBusiest = (week: ContributionWeek) => week === busiest;
  const summary = `Contributions each week from ${formatDayInFull(year.firstDay)} to ${formatDayInFull(year.lastDay)}, a bar a week. The busiest week, from ${formatDayInFull(busiest.firstDay)}, had ${formatCount(busiest.total)}. ${capitalised(inWords(year.emptyWeeks))} weeks had none.`;

  return (
    <figure className="dispatch-strip">
      <figcaption className="dispatch-strip-caption">
        {formatCount(year.total)} contributions on GitHub in the year to{" "}
        <DayInFull day={year.lastDay} />,{" "}
        {formatCount(year.inPrivateRepositories)} of them in private
        repositories.
      </figcaption>
      <svg
        className="dispatch-strip-drawing"
        viewBox={`0 0 ${weeks.length * COLUMN_WIDTH} ${STRIP_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        <path
          className="dispatch-strip-weeks"
          d={barsOf(weeks, busiest, (week) => !isBusiest(week))}
        />
        <path
          className="dispatch-strip-busiest"
          d={barsOf(weeks, busiest, isBusiest)}
        />
      </svg>
      <p className="dispatch-strip-ends">
        <span>{formatMonthInFull(year.firstDay.slice(0, 7))}</span>
        <span className="dispatch-strip-busiest-label">
          {formatCount(busiest.total)} in the week from{" "}
          <DayInFull day={busiest.firstDay} />
        </span>
      </p>
    </figure>
  );
}

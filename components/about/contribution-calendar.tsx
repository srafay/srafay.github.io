import {
  contributionYear,
  type CalendarCell,
  type Level,
} from "@/lib/contribution-calendar";
import {
  CELL_ROUNDING,
  CELL_SIZE,
  CELL_STEP,
  CELL_GAP,
  MONTH_NAME_HEIGHT,
  calendarHeight,
  calendarWidth,
  cellLeft,
  cellTop,
  square,
} from "@/lib/about/calendar-geometry";
import { pageSections } from "@/lib/about/sections";
import { DayInFull } from "@/components/about/day-in-full";
import { formatCount, formatDayInFull } from "@/lib/format";

/*
  A year of GitHub contributions, drawn as GitHub draws it: a column a week, a row a weekday, a square a day in five
  shades of the signal colour. Plain SVG drawn at build time. It keeps its own width, and where the screen is narrower
  its box scrolls sideways, starting at the latest weeks (globals.css).

  Each shade is one path with a small square for each of its days, about a quarter of the bytes of a shape per day
  (the page carries its markup twice, once as HTML and once for React). The squares get their round corners from a
  stroke with round joins, twice as wide as the rounding, drawn in the shade's own colour.

  The page's script (lib/about/script/) names the day under a pointer or a finger, so the SVG carries each day's
  count in order from the first day, in data-counts.
*/
// GitHub names every other row, from Monday.
const NAMED_WEEKDAYS = [
  { weekday: 1, name: "Mon" },
  { weekday: 3, name: "Wed" },
  { weekday: 5, name: "Fri" },
];
const LEVELS: Level[] = [0, 1, 2, 3, 4];

const shadeClass = (level: Level) => `shade-${level}`;

function ShadePath({ level, squares }: { level: Level; squares: string }) {
  return (
    <path
      className={shadeClass(level)}
      d={squares}
      strokeWidth={2 * CELL_ROUNDING}
      strokeLinejoin="round"
    />
  );
}

/** One path for each shade that any day has. */
function DaySquares({ cells }: { cells: CalendarCell[] }) {
  return LEVELS.map((level) => {
    const squares = cells
      .filter((cell) => cell.level === level)
      .map((cell) => square(cellLeft(cell.week), cellTop(cell.weekday)))
      .join("");
    return squares && <ShadePath key={level} level={level} squares={squares} />;
  });
}

/** The five shades from fewest to most, as GitHub's key under its calendar shows them. */
function ShadeKey() {
  const width = LEVELS.length * CELL_STEP - CELL_GAP;
  return (
    <p className="calendar-key" aria-hidden="true">
      <span>Less</span>
      <svg
        viewBox={`0 0 ${width} ${CELL_SIZE}`}
        width={width}
        height={CELL_SIZE}
      >
        {LEVELS.map((level) => (
          <ShadePath
            key={level}
            level={level}
            squares={square(level * CELL_STEP, 0)}
          />
        ))}
      </svg>
      <span>More</span>
    </p>
  );
}

export function ContributionCalendar() {
  const year = contributionYear();
  const width = calendarWidth(year.weeks);
  const height = calendarHeight();
  const lastDay = formatDayInFull(year.lastDay);
  const busiestDay = formatDayInFull(year.busiest.date);
  const summary = `Contributions each day from ${formatDayInFull(year.firstDay)} to ${lastDay}. The busiest day was ${busiestDay}, with ${year.busiest.count}.`;
  const { id, label } = pageSections.contributions;

  return (
    <section
      id={id}
      className="profile-section"
      aria-labelledby="contributions-heading"
    >
      <h2 id="contributions-heading">{label}</h2>
      <figure className="contribution-calendar">
        <figcaption className="section-lead">
          <b data-calendar-total="">{formatCount(year.total)}</b> contributions
          on GitHub in the year to <DayInFull day={year.lastDay} />
        </figcaption>
        <div className="calendar-box">
          <div
            className="calendar-scroll"
            role="region"
            aria-label="Contribution calendar"
            tabIndex={0}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              style={{ minWidth: width }}
              role="img"
              data-first-day={year.firstDay}
              data-counts={year.cells.map((cell) => cell.count).join(" ")}
            >
              <title>{summary}</title>
              {year.months.map((month) => (
                <text
                  key={`${month.name} ${month.week}`}
                  x={cellLeft(month.week)}
                  y={MONTH_NAME_HEIGHT - 7}
                >
                  {month.name}
                </text>
              ))}
              {NAMED_WEEKDAYS.map((day) => (
                <text
                  key={day.name}
                  x={0}
                  y={cellTop(day.weekday) + CELL_SIZE / 2}
                  dominantBaseline="central"
                >
                  {day.name}
                </text>
              ))}
              <DaySquares cells={year.cells} />
            </svg>
          </div>
          <ShadeKey />
        </div>
      </figure>
      <p className="section-note">
        Most of the work was in private repositories:{" "}
        {formatCount(year.inPrivateRepositories)} of the{" "}
        {formatCount(year.total)}. The busiest day was{" "}
        <DayInFull day={year.busiest.date} />, with {year.busiest.count}.
      </p>
    </section>
  );
}

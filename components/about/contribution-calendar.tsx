import {
  contributionYear,
  type CalendarCell,
  type Level,
} from "@/lib/contribution-calendar";
import { DayInFull } from "@/components/about/day-in-full";
import { formatCount, formatDayInFull } from "@/lib/format";

/*
  A year of GitHub contributions, drawn as GitHub draws it: a column a week, a row a weekday, a square a day in five
  shades of the signal colour. Plain SVG drawn at build time, so nothing runs in the browser. It keeps its own width,
  and where the screen is narrower its box scrolls sideways, starting at the latest weeks (globals.css).

  Each shade is one path with a small square for each of its days, about a quarter of the bytes of a shape per day
  (the page carries its markup twice, once as HTML and once for React). The squares get their round corners from a
  stroke with round joins, twice as wide as the rounding, drawn in the shade's own colour.
*/
const CELL_SIZE = 10;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const CELL_ROUNDING = 2;
const DAY_NAME_WIDTH = 30;
const MONTH_NAME_HEIGHT = 18;
const DAYS_IN_A_WEEK = 7;
// GitHub names every other row, from Monday.
const NAMED_WEEKDAYS = [
  { weekday: 1, name: "Mon" },
  { weekday: 3, name: "Wed" },
  { weekday: 5, name: "Fri" },
];
const LEVELS: Level[] = [0, 1, 2, 3, 4];

const cellLeft = (week: number) => DAY_NAME_WIDTH + week * CELL_STEP;
const cellTop = (weekday: number) => MONTH_NAME_HEIGHT + weekday * CELL_STEP;
const calendarWidth = (weeks: number) => cellLeft(weeks) - CELL_GAP;
const calendarHeight = () => cellTop(DAYS_IN_A_WEEK) - CELL_GAP;
const shadeClass = (level: Level) => `shade-${level}`;

/** A day's square, drawn inside its cell by the rounding, which the stroke then fills back out to the cell's edge. */
function square(left: number, top: number) {
  const side = CELL_SIZE - 2 * CELL_ROUNDING;
  return `M${left + CELL_ROUNDING} ${top + CELL_ROUNDING}h${side}v${side}h-${side}z`;
}

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

  return (
    <section
      className="profile-section"
      aria-labelledby="contributions-heading"
    >
      <h2 id="contributions-heading">Contributions</h2>
      <figure className="contribution-calendar">
        <figcaption className="section-lead">
          <b>{formatCount(year.total)}</b> contributions on GitHub in the year
          to <DayInFull day={year.lastDay} />
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

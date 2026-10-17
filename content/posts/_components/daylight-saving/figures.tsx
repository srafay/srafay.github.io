import { LineIcon } from "./line-icon";
import type { CSSProperties, ReactNode } from "react";
import {
  energyChanges,
  eveningLightStats,
  gapPeriodDays,
  historyEvents,
  lastVotes,
  melbourneSolarNoon,
  midsummerDaylight,
  referendums,
  springRisks,
  sydneyGaps,
  winterSunrises,
  worldStatus,
  type TimeGap,
} from "./figure-data";

/*
  The post's charts. Each one is complete as plain HTML. When the post's script runs, it marks a figure "seen" as it
  scrolls into view, and the CSS animates it into place: bars grow, lines draw, numbers count up.
  --order staggers the parts of a figure, so they arrive one after another.
*/

/** A style attribute that also sets custom properties, e.g. `{ "--order": 2 }`. */
type CustomProperties = CSSProperties & Record<`--${string}`, string | number>;
const inOrder = (order: number, extra: CustomProperties = {}) =>
  ({ "--order": order, ...extra }) as CustomProperties;

/**
 * What the post's script needs to draw a figure with ECharts: the kind of chart, its data and its height. The HTML
 * version stays in the page for search engines, link previews and readers without the script; once ECharts has
 * drawn the chart, the HTML version steps aside.
 */
type LiveChart = { kind: string; height: number; data: unknown };

function Figure({
  title,
  caption,
  note,
  className = "",
  chart,
  icon,
  children,
}: {
  title: string;
  caption: string;
  note?: ReactNode;
  className?: string;
  chart?: LiveChart;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure
      className={`dst-figure ${icon ? "has-icon " : ""}${className}`}
      data-reveal=""
    >
      {icon && <span className="dst-figure-icon">{icon}</span>}
      <figcaption>
        <p className="dst-figure-title">{title}</p>
        <p className="dst-figure-caption">{caption}</p>
      </figcaption>
      {chart && (
        <div
          className="dst-echart"
          data-chart={JSON.stringify({ kind: chart.kind, data: chart.data })}
          style={{ height: chart.height }}
        />
      )}
      <div className="dst-figure-body dst-chart-fallback">{children}</div>
      {note && (
        <p className="dst-figure-note">
          <LineIcon name="info" />
          <span>{note}</span>
        </p>
      )}
    </figure>
  );
}

/** Minutes after midnight as a clock reading, e.g. 290 as "4:50 am". */
function formatClock(minutesAfterMidnight: number) {
  const wrapped = ((minutesAfterMidnight % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  const suffix = hours < 12 ? "am" : "pm";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** How far along an axis a value sits, in per cent. */
const percentAlong = (value: number, from: number, to: number) =>
  ((value - from) / (to - from)) * 100;

/** A number the script counts up to when its figure comes into view. */
function CountUp({
  to,
  before = "",
  after = "",
}: {
  to: number;
  before?: string;
  after?: string;
}) {
  return (
    <span
      data-count-to={to}
      data-count-before={before}
      data-count-after={after}
    >
      {before}
      {to}
      {after}
    </span>
  );
}

/** Section 0: when each state last got a say. */
/** The year of the most recent statewide vote anywhere, which the map picks out. */
const latestVoteYear = lastVotes
  .map((state) => state.lastVote)
  .filter((year): year is string => year !== null)
  .sort()
  .at(-1);

export function LastVoteMap() {
  return (
    <Figure
      icon={<LineIcon name="ballot" />}
      className="is-last-vote"
      title="When did you last get a say?"
      caption="The most recent statewide vote on daylight saving in each state and territory."
      note="No vote: no statewide vote on daylight saving turned up in the research for this post."
    >
      <div className="dst-tiles">
        {lastVotes.map((state, order) => (
          <div
            key={state.code}
            className={`dst-tile${state.lastVote ? "" : " is-unasked"}${state.lastVote === latestVoteYear ? " is-latest" : ""}`}
            style={inOrder(order, {
              gridColumn: `${state.column} / span ${state.columnSpan ?? 1}`,
              gridRow: `${state.row} / span ${state.rowSpan ?? 1}`,
            })}
            title={state.name}
          >
            <b>{state.code}</b>
            <span className="dst-tile-year">{state.lastVote ?? "No vote"}</span>
            {state.result && <span className="dst-small">{state.result}</span>}
            {state.lastVote === latestVoteYear && (
              <span className="dst-tile-leaf" aria-hidden="true">
                <LineIcon name="leaf" />
              </span>
            )}
          </div>
        ))}
      </div>
    </Figure>
  );
}

/** Section 1: how much each risk rose after the spring change. */
export function SpringRiskBars() {
  const largestRise = Math.max(...springRisks.map((risk) => risk.risePercent));
  return (
    <Figure
      title="The first days after the clocks go forward"
      chart={{ kind: "risks", height: 420, data: springRisks }}
      caption="How much each risk rose after the spring change. The measures and windows differ, so read each bar on its own."
      note={
        <>
          <span className="dst-warm">Warm bars</span> are Australian. The
          Michigan heart attacks came earlier, not extra: the weekly total did
          not change.
        </>
      }
    >
      <div className="dst-bars">
        {springRisks.map((risk, order) => (
          <div
            key={`${risk.measure}${risk.where}`}
            className={`dst-bars-row${risk.australian ? " is-australian" : ""}`}
            style={inOrder(order)}
          >
            <div className="dst-bars-label">
              <b>{risk.measure}</b>{" "}
              <span className="dst-small">
                {risk.where} · {risk.window}
              </span>
            </div>
            <div className="dst-bars-track">
              {risk.risePercent > 0 ? (
                <span
                  className="dst-bars-fill"
                  style={{ width: `${(risk.risePercent / largestRise) * 85}%` }}
                />
              ) : (
                <span className="dst-bars-zero" />
              )}
              <span className="dst-bars-value">
                {risk.risePercent > 0 ? (
                  <CountUp to={risk.risePercent} before="+" after="%" />
                ) : (
                  "No change found"
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/** Section 2: from a joke to the law. */
export function HistoryTimeline() {
  const [joke, ...rest] = historyEvents;
  const yearsBeforeHudson = rest[0].year - joke.year;
  const row = (event: (typeof historyEvents)[number], order: number) => (
    <li
      key={event.when}
      className={event.australian ? "is-local" : ""}
      style={inOrder(order)}
    >
      <span className="dst-timeline-year">{event.year}</span>
      <span className="dst-timeline-event">
        {event.event}
        {event.when !== String(event.year) && (
          <span className="dst-small">{event.when}</span>
        )}
      </span>
    </li>
  );
  return (
    <Figure
      icon={<LineIcon name="calendar" />}
      className="is-captioned-small"
      title="From a joke to the law"
      caption="Key dates in the history of daylight saving."
      note="Not one of the Australian starts came from a public vote."
    >
      <ol className="dst-timeline">
        {row(joke, 0)}
        <li className="is-gap" style={inOrder(1)}>
          <span />
          <span>
            {yearsBeforeHudson} years before anyone suggested it seriously
          </span>
        </li>
        {rest.map((event, position) => row(event, position + 2))}
      </ol>
      <p className="dst-legend">
        <span>
          <i style={{ background: "var(--dst-warm)" }} />
          Australia and New Zealand
        </span>
        <span>
          <i style={{ background: "var(--dst-accent)" }} />
          Elsewhere
        </span>
      </p>
    </Figure>
  );
}

/** Section 3: every statewide referendum, yes against no. */
export function ReferendumSplits() {
  return (
    <Figure
      title="Six votes on daylight saving"
      chart={{ kind: "referendums", height: 330, data: referendums }}
      caption="Every statewide referendum, as a share of formal votes. The dashed line is 50 per cent."
    >
      <div className="dst-split">
        {referendums.map((vote, order) => (
          <div key={`${vote.place}${vote.date}`} style={inOrder(order)}>
            <b>{vote.place}</b> <span className="dst-small">{vote.date}</span>
            <div className="dst-split-bar">
              <span
                className="dst-split-yes"
                style={{ width: `${vote.yesPercent}%` }}
              >
                Yes {vote.yesPercent.toFixed(1)}%
              </span>
              <span
                className="dst-split-no"
                style={{ width: `${100 - vote.yesPercent}%` }}
              >
                No {(100 - vote.yesPercent).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="dst-unasked">
        <b>No vote found:</b> Victoria, South Australia, Tasmania, the ACT.
        Together they have used daylight saving for more than 50 years.
      </p>
    </Figure>
  );
}

/** Section 4: promised savings against measured ones. */
export function EnergyPromises() {
  const widestChange = 1.2;
  const position = (change: number) =>
    percentAlong(change, -widestChange, widestChange);
  return (
    <Figure
      icon={<LineIcon name="bolt" />}
      className="is-captioned-small is-solid-icon"
      title="Promised against measured"
      chart={{ kind: "energy", height: 360, data: energyChanges }}
      caption="Change in electricity use from daylight saving. Left of the line is a saving. Right of the line is a cost."
      note="Hatched bars are promises. Solid bars are measurements. The line on the Victorian bar is its margin of error, which crosses zero. Per-day figures are not directly comparable with whole-season ones."
    >
      <div className="dst-diverge">
        {energyChanges.map((change, order) => {
          const start = position(Math.min(0, change.changePercent));
          const end = position(Math.max(0, change.changePercent));
          const kind = change.kind === "promised" ? " is-promised" : "";
          const side = change.changePercent < 0 ? " is-saving" : "";
          return (
            <div key={change.label} style={inOrder(order)}>
              <b>{change.label}</b>{" "}
              <span className="dst-small">
                {change.changePercent > 0 ? "+" : ""}
                {change.changePercent}% {change.basis}
              </span>
              <div className="dst-diverge-track">
                <span
                  className={`dst-diverge-fill${kind}${side}`}
                  style={{
                    left: `${start}%`,
                    width: `${Math.max(end - start, 0.6)}%`,
                  }}
                />
                {change.standardError && (
                  <span
                    className="dst-diverge-whisker"
                    style={{
                      left: `${position(change.changePercent - change.standardError)}%`,
                      width: `${position(change.changePercent + change.standardError) - position(change.changePercent - change.standardError)}%`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
        <div className="dst-diverge-axis">
          <span>Saves 1.2%</span>
          <span>0</span>
          <span>Costs 1.2%</span>
        </div>
      </div>
    </Figure>
  );
}

/** "−27%" as its parts, so the number can count up. */
function splitStat(value: string) {
  const match = value.match(/^([+−]?)(\d+)(%?)$/);
  if (!match) return null;
  return { before: match[1], to: Number(match[2]), after: match[3] };
}

/** Section 5: what an hour of evening light does. */
/** The icon for each kind of evidence on the evening light tiles. */
const statIcons = {
  crime: "shield",
  walking: "walker",
  driving: "car",
  opinion: "people",
} as const;

export function EveningLightTiles() {
  return (
    <Figure
      icon={<LineIcon name="sunrise" />}
      className="is-captioned-small"
      title="What an hour of evening light does"
      caption="Measured effects of lighter evenings. The dashed tile is the counter-evidence."
      note="The survey was funded by the office of WA MP Wilson Tucker. The article reporting it does not give the question wording."
    >
      <div className="dst-stats">
        {eveningLightStats.map((stat, order) => {
          const parts = splitStat(stat.value);
          return (
            <div
              key={stat.label}
              className={`dst-stat${stat.counterEvidence ? " is-counter" : ""}`}
              style={inOrder(order)}
            >
              <span className="dst-stat-icon">
                <LineIcon name={statIcons[stat.topic]} />
              </span>
              <p className="dst-stat-value">
                {parts ? <CountUp {...parts} /> : stat.value}
              </p>
              <p className="dst-stat-label">{stat.label}</p>
              <p className="dst-stat-setting">{stat.setting}</p>
            </div>
          );
        })}
      </div>
    </Figure>
  );
}

function ClockTicks({
  from,
  to,
  every,
}: {
  from: number;
  to: number;
  every: number;
}) {
  const ticks: number[] = [];
  for (let minute = from; minute <= to; minute += every) ticks.push(minute);
  return (
    <div className="dst-axis-ticks" aria-hidden="true">
      {ticks.map((minute) => (
        <span
          key={minute}
          style={{ left: `${percentAlong(minute, from, to)}%` }}
        >
          {formatClock(minute).replace(":00", "")}
        </span>
      ))}
    </div>
  );
}

/** Where the moving ruler sits so that a reading lands under the sun, as a translateX in per cent of the ruler. */
function rulerShift(
  reading: number,
  rulerFrom: number,
  rulerTo: number,
  windowShare: number,
) {
  const along = (reading - rulerFrom) / (rulerTo - rulerFrom);
  return `${(windowShare / 2 - along) * 100}%`;
}

/** Section 6: one sun, two clocks. The sun stays put; the clock slides under it. */
export function OneSunTwoClocks() {
  const rulerFrom = 10 * 60;
  const rulerTo = 15 * 60;
  const windowShare = 0.4;
  const ticks: number[] = [];
  for (let minute = rulerFrom; minute <= rulerTo; minute += 30)
    ticks.push(minute);
  const sunriseFrom = 7 * 60;
  const sunriseTo = 9 * 60;
  return (
    <Figure
      icon={<LineIcon name="sun" />}
      className="is-captioned-small is-one-sun"
      title="One sun, two clocks"
      caption="The sun over Melbourne at its highest, on 11 October 2026. Daylight saving does not move the sun. It slides the clock underneath it."
    >
      <div
        className="dst-sunclock"
        style={
          {
            "--standard-shift": rulerShift(
              melbourneSolarNoon.standard,
              rulerFrom,
              rulerTo,
              windowShare,
            ),
            "--saving-shift": rulerShift(
              melbourneSolarNoon.daylightSaving,
              rulerFrom,
              rulerTo,
              windowShare,
            ),
            "--ruler-width": `${100 / windowShare}%`,
          } as CustomProperties
        }
      >
        <div className="dst-sunclock-sky">
          <span className="dst-sunclock-hills" />
          <span className="dst-sunclock-water" />
          <span className="dst-sunclock-sun" />
          <span className="dst-sunclock-beam" />
        </div>
        <div className="dst-sunclock-window">
          <div className="dst-sunclock-ruler">
            {ticks.map((minute) => (
              <span
                key={minute}
                className={minute % 60 === 0 ? "is-hour" : ""}
                style={{ left: `${percentAlong(minute, rulerFrom, rulerTo)}%` }}
              >
                {minute % 60 === 0
                  ? formatClock(minute).replace(":00", "")
                  : ""}
              </span>
            ))}
          </div>
          <span className="dst-sunclock-pointer" />
        </div>
        <p className="dst-sunclock-reading">
          <span className="is-standard">
            Standard time: <b>{formatClock(melbourneSolarNoon.standard)}</b>
          </span>
          <span className="is-saving">
            Daylight saving:{" "}
            <b>{formatClock(melbourneSolarNoon.daylightSaving)}</b>
          </span>
        </p>
      </div>
      <div className="dst-axis-group">
        <b>If daylight saving ran all year: the winter sunrise</b>
        {winterSunrises.map((sunrise, order) => (
          <div
            key={sunrise.label}
            className="dst-axis-row has-place"
            style={inOrder(order)}
          >
            <b className="dst-axis-place">{placeOf(sunrise.label)}</b>
            <span className="dst-small">
              {momentOf(sunrise.label)}: {formatClock(sunrise.standard)} now,{" "}
              <b className="dst-warm">{formatClock(sunrise.daylightSaving)}</b>{" "}
              on permanent daylight saving
            </span>
            <div className="dst-axis-track">
              <span
                className="dst-axis-mark"
                style={{
                  left: `${percentAlong(sunrise.standard, sunriseFrom, sunriseTo)}%`,
                }}
              />
              <span
                className="dst-axis-mark is-warm is-moving"
                style={
                  {
                    "--from-left": `${percentAlong(sunrise.standard, sunriseFrom, sunriseTo)}%`,
                    left: `${percentAlong(sunrise.daylightSaving, sunriseFrom, sunriseTo)}%`,
                  } as CustomProperties
                }
              />
            </div>
          </div>
        ))}
        <ClockTicks from={sunriseFrom} to={sunriseTo} every={30} />
      </div>
    </Figure>
  );
}

/** The place in a reading's label, e.g. "Melbourne" from "Melbourne, late June sunrise". */
function placeOf(label: string) {
  return label.split(", ")[0];
}

/** The rest of a reading's label, after its place. */
function momentOf(label: string) {
  return label.split(", ").slice(1).join(", ");
}

/** Section 7: midsummer daylight on the clock. */
export function MidsummerDaylight() {
  const from = 4 * 60;
  const to = 21 * 60;
  const oneHourShare = percentAlong(from + 60, from, to);
  return (
    <Figure
      title="Midsummer daylight on the clock"
      chart={{ kind: "midsummer", height: 340, data: midsummerDaylight }}
      caption="Sunrise to sunset on 21 December 2026. Brisbane and Perth as they are, and with daylight saving. Sydney and Hobart already use it."
      note="Calculated with the NOAA solar equations, and checked against published tables to within a minute. Striped bars are what daylight saving would do: the same daylight, an hour later on the clock."
    >
      {midsummerDaylight.map((day, order) => (
        <div
          key={`${day.city}${day.clockName}`}
          className="dst-axis-row"
          style={inOrder(order)}
        >
          <span className="dst-small">
            <b style={{ color: "var(--dst-ink)" }}>{day.city}</b>,{" "}
            {day.clockName}: {formatClock(day.sunrise)} to{" "}
            {formatClock(day.sunset)}
          </span>
          <div className="dst-axis-track">
            <span
              className={`dst-daylight${day.hypothetical ? " is-hypothetical" : ""}`}
              style={
                {
                  left: `${percentAlong(day.sunrise, from, to)}%`,
                  width: `${percentAlong(day.sunset, from, to) - percentAlong(day.sunrise, from, to)}%`,
                  "--hour-back": `${-oneHourShare}%`,
                } as CustomProperties
              }
            />
          </div>
        </div>
      ))}
      <ClockTicks from={from} to={to} every={180} />
    </Figure>
  );
}

/** A step line through the gaps, as an SVG path. */
function stepPath(
  gaps: TimeGap[],
  hoursAhead: (gap: TimeGap) => number,
  xOf: (day: number) => number,
  yOf: (hours: number) => number,
) {
  const [first, ...rest] = gaps;
  let path = `M${xOf(first.dayOfPeriod)},${yOf(hoursAhead(first))}`;
  for (const gap of rest)
    path += ` H${xOf(gap.dayOfPeriod)} V${yOf(hoursAhead(gap))}`;
  return `${path} H${xOf(gapPeriodDays)}`;
}

/** Section 9: how far ahead Sydney is of London and New York. */
export function SydneyTimeGaps() {
  const width = 420;
  const height = 230;
  const left = 26;
  const right = 74;
  const top = 12;
  const bottom = 30;
  const lowestHours = 8;
  const highestHours = 17;
  const xOf = (day: number) =>
    left + (day / gapPeriodDays) * (width - left - right);
  const yOf = (hours: number) =>
    top +
    ((highestHours - hours) / (highestHours - lowestHours)) *
      (height - top - bottom);
  const months = [
    ["Oct", 0],
    ["Nov", 31],
    ["Dec", 61],
    ["Jan", 92],
    ["Feb", 123],
    ["Mar", 151],
    ["Apr", 182],
    ["May", 212],
  ] as const;
  const last = sydneyGaps[sydneyGaps.length - 1];
  const changes = sydneyGaps.filter((gap) => gap.change);
  return (
    <Figure
      title="How far ahead is Sydney?"
      chart={{
        kind: "gaps",
        height: 320,
        data: {
          firstDay: "2026-10-01",
          periodDays: gapPeriodDays,
          gaps: sydneyGaps,
        },
      }}
      caption="Hours Sydney is ahead of London and New York, October 2026 to May 2027. Each step is a day one of the three cities changes its clocks."
      note={changes.map((gap) => `${gap.from}: ${gap.change}`).join(" · ")}
    >
      <svg
        className="dst-steps"
        data-gap-chart=""
        data-left={left}
        data-right={width - right}
        data-width={width}
        data-top={top}
        data-bottom={height - bottom}
        data-period-days={gapPeriodDays}
        data-gaps={JSON.stringify(
          sydneyGaps.map((gap) => [
            gap.dayOfPeriod,
            gap.aheadOfLondon,
            gap.aheadOfNewYork,
          ]),
        )}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Sydney's gap to London moves between 9 and 11 hours, and its gap to New York between 14 and 16 hours."
      >
        {[9, 11, 14, 16].map((hours) => (
          <g key={hours}>
            <line
              className="dst-steps-grid"
              x1={left}
              x2={width - right}
              y1={yOf(hours)}
              y2={yOf(hours)}
            />
            <text x={left - 6} y={yOf(hours) + 4} textAnchor="end">
              {hours}
            </text>
          </g>
        ))}
        {months.map(([month, day]) => (
          <text key={month} x={xOf(day)} y={height - 8} textAnchor="middle">
            {month}
          </text>
        ))}
        <path
          className="dst-steps-london"
          pathLength={1}
          d={stepPath(sydneyGaps, (gap) => gap.aheadOfLondon, xOf, yOf)}
        />
        <path
          className="dst-steps-new-york"
          pathLength={1}
          d={stepPath(sydneyGaps, (gap) => gap.aheadOfNewYork, xOf, yOf)}
        />
        {changes.map((gap, order) => (
          <g key={gap.from} className="dst-steps-change" style={inOrder(order)}>
            <circle
              cx={xOf(gap.dayOfPeriod)}
              cy={yOf(gap.aheadOfLondon)}
              r="3.5"
            />
            <circle
              cx={xOf(gap.dayOfPeriod)}
              cy={yOf(gap.aheadOfNewYork)}
              r="3.5"
            />
          </g>
        ))}
        <text
          className="dst-steps-label is-london"
          x={xOf(gapPeriodDays) + 8}
          y={yOf(last.aheadOfLondon) + 4}
        >
          London
        </text>
        <text
          className="dst-steps-label is-new-york"
          x={xOf(gapPeriodDays) + 8}
          y={yOf(last.aheadOfNewYork) + 4}
        >
          New York
        </text>
        <line
          className="dst-steps-guide"
          x1={left}
          x2={left}
          y1={top}
          y2={height - bottom}
        />
      </svg>
      <p className="dst-gap-readout" data-show="gap">
        Drag along the chart to read any date.
      </p>
    </Figure>
  );
}

/** Section 10: where the clocks stand around the world. */
export function WorldStatus() {
  return (
    <Figure
      title="Where the clocks stand"
      caption="Daylight saving around the world, as of 12 October 2026. This can change quickly."
    >
      <div className="dst-status">
        {worldStatus.map((place, order) => (
          <div
            key={place.place}
            className="dst-status-card"
            style={inOrder(order)}
          >
            <b>{place.place}</b>
            <span
              className={`dst-status-uses${place.usesItNow ? " is-yes" : ""}`}
            >
              {place.usesItNow ? "Uses it" : "Does not"}
            </span>
            <span className="dst-status-detail">
              {place.proposal && `${place.proposal}. `}
              {place.status}. Next change: {place.nextChange}.
            </span>
          </div>
        ))}
      </div>
    </Figure>
  );
}

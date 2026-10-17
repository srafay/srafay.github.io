import { summerZones, sydneySummerOffset } from "./figure-data";
import { LineIcon, ShareIcon } from "./line-icon";
import { PetitionNote, WriteToYourMember } from "./petition-button";
import { postUrl, shareTargets } from "./sharing";
import {
  storyCardMilliseconds,
  storyCards,
  type StoryGraphic,
} from "./story-cards";

/*
  The moving and clickable parts of the daylight saving post. Everything here renders as plain HTML and CSS first:
  the clock, the ballot, the mood check and the cannon need no script at all. The deck, the sun explorer and the
  noon slider come alive when /post-scripts/daylight-saving.js runs; without it they still show something useful.
*/

/** The night of 4 October as a ruler, midnight to 6 am, with the hour that never happened hatched out. */
function NightRuler({ compact = false }: { compact?: boolean }) {
  const hours = ["12", "1", "2", "3", "4", "5", "6 am"];
  return (
    <div
      className={`dst-night${compact ? " is-compact" : ""}`}
      role="img"
      aria-label="A ruler of the night from midnight to 6 am. The hour from 2 am to 3 am is struck out."
    >
      <div className="dst-night-track">
        <span className="dst-night-gap">
          <span>skipped</span>
        </span>
        <span className="dst-night-playhead" />
      </div>
      <div className="dst-night-hours" aria-hidden="true">
        {hours.map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * The opening: a clock reading that runs 1:59:57, 1:59:58, 1:59:59, then lands on 3:00:00, over a ruler of the
 * night with the missing hour struck out. The reading counts with CSS alone; it rests on 3:00:00.
 */
export function Hero() {
  return (
    <div className="dst-hero">
      <p className="dst-hero-kicker">
        Sunday 4 October 2026, south-east Australia
      </p>
      <div className="dst-hero-card">
        <div className="dst-hero-reading-block">
          <span className="dst-badge">
            <LineIcon name="clock" />
          </span>
          <div>
            <p className="dst-hero-label">On the clock that night</p>
            <p
              className="dst-hero-time"
              role="img"
              aria-label="The clock read 1:59:59 am, then 3:00:00 am."
            >
              <span className="dst-hero-reading" />
              <span className="dst-hero-suffix">am</span>
            </p>
          </div>
        </div>
        <div className="dst-hero-ruler-block">
          <span className="dst-skip-pill">
            <LineIcon name="clock" />
            Skipped
          </span>
          <NightRuler />
        </div>
      </div>
      <p className="dst-hero-line">
        At 2 am the clocks skipped to 3. That hour came out of everyone&rsquo;s
        night, and nobody asked us first.
      </p>
    </div>
  );
}

/** Two bars, drawn to scale: a normal level of 100 and the level on the days in question. */
function ComparedBars({
  before,
  after,
  beforeLabel,
  afterLabel,
  isWorse,
}: {
  before: number;
  after: number;
  beforeLabel: string;
  afterLabel: string;
  isWorse: boolean;
}) {
  const tallest = Math.max(before, after);
  return (
    <div className="dst-art dst-art-bars" aria-hidden="true">
      {[
        { value: before, label: beforeLabel, className: "" },
        {
          value: after,
          label: afterLabel,
          className: isWorse ? " is-worse" : " is-better",
        },
      ].map((bar) => (
        <span key={bar.label} className={`dst-art-bar${bar.className}`}>
          <b>{bar.value}</b>
          <i style={{ height: `${(bar.value / tallest) * 100}%` }} />
          <small>{bar.label}</small>
        </span>
      ))}
    </div>
  );
}

/** Each card's picture: a small, exact drawing of the card's own number. */
function StoryArt({ graphic }: { graphic: StoryGraphic }) {
  switch (graphic) {
    case "night":
      return <NightRuler compact />;
    case "arrests":
      return (
        <ComparedBars
          before={100}
          after={117}
          beforeLabel="A usual day"
          afterLabel="Sunday and Monday"
          isWorse
        />
      );
    case "history":
      return (
        <ol className="dst-art dst-art-years" aria-hidden="true">
          <li>
            <b>1895</b>
            <small>A clerk&rsquo;s paper</small>
          </li>
          <li>
            <b>1916</b>
            <small>A war makes it law</small>
          </li>
          <li>
            <b>1971</b>
            <small>Most states adopt it</small>
          </li>
        </ol>
      );
    case "tally":
      return (
        <div className="dst-art dst-art-tally" aria-hidden="true">
          <span>
            <span className="dst-tally-boxes">
              {Array.from({ length: 4 }, (_, vote) => (
                <i
                  key={vote}
                  style={{ animationDelay: `${300 + vote * 200}ms` }}
                />
              ))}
            </span>
            <small>Western Australia</small>
          </span>
          <span className="is-empty">
            <span className="dst-tally-boxes">
              <i />
            </span>
            <small>Victoria</small>
          </span>
        </div>
      );
    case "error-bar":
      return (
        <svg
          className="dst-art dst-art-error"
          viewBox="0 0 260 90"
          aria-hidden="true"
        >
          <line x1="130" y1="10" x2="130" y2="66" className="dst-art-zero" />
          <line x1="96" y1="38" x2="164" y2="38" className="dst-art-whisker" />
          <line x1="96" y1="31" x2="96" y2="45" className="dst-art-whisker" />
          <line x1="164" y1="31" x2="164" y2="45" className="dst-art-whisker" />
          <circle cx="132" cy="38" r="5" className="dst-art-point" />
          <text x="130" y="84" textAnchor="middle">
            0
          </text>
          <text x="96" y="22" textAnchor="middle">
            −0.31%
          </text>
          <text x="164" y="22" textAnchor="middle">
            +0.49%
          </text>
        </svg>
      );
    case "robberies":
      return (
        <ComparedBars
          before={100}
          after={73}
          beforeLabel="Before the change"
          afterLabel="After, in the sunset hour"
          isWorse={false}
        />
      );
    case "solar-noon":
      return (
        <div className="dst-art dst-art-noon" aria-hidden="true">
          <div className="dst-noon-track">
            <span className="dst-noon-sun" />
          </div>
          <div className="dst-noon-hours">
            <span>12 pm</span>
            <span>1 pm</span>
            <span>2 pm</span>
          </div>
        </div>
      );
    case "share":
      return (
        <svg
          className="dst-art dst-art-share"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
          <circle cx="60" cy="60" r="50" className="dst-share-track" />
          <circle
            cx="60"
            cy="60"
            r="50"
            className="dst-share-fill"
            pathLength={100}
          />
        </svg>
      );
    case "sign":
      return (
        <div className="dst-art dst-art-sign" aria-hidden="true">
          <span className="dst-sign-plate">
            <small>Central Western Time</small>
            Wind clocks <b>45 min</b>
          </span>
        </div>
      );
    case "twice":
      return (
        <div className="dst-art dst-art-twice" aria-hidden="true">
          <span className="is-gone">2:30</span>
          <span className="is-double">2:30</span>
        </div>
      );
    case "ballot":
      return (
        <div className="dst-art dst-art-ballot" aria-hidden="true">
          <span>
            <i />
            Yes
          </span>
          <span>
            <i />
            No
          </span>
        </div>
      );
  }
}

/**
 * One minute, eleven cards. The next card peeks in from the right, the deck nudges once to show it moves, and a hint
 * says how to move it: swipe on a phone, click or the arrow keys on a computer. With the script it also plays itself.
 */
export function StoryDeck() {
  return (
    <div
      className="dst-deck"
      data-story-deck=""
      data-card-milliseconds={storyCardMilliseconds}
    >
      <div className="dst-deck-head">
        <div className="dst-deck-progress" aria-hidden="true">
          {storyCards.map((card) => (
            <span key={card.sectionId}>
              <i />
            </span>
          ))}
        </div>
        <p className="dst-deck-count" aria-live="polite">
          <span data-show="card">1</span> / {storyCards.length}
        </p>
        <button type="button" className="dst-deck-pause">
          <span className="is-pause">
            <LineIcon name="pause" />
            Pause
          </span>
          <span className="is-play">
            <LineIcon name="play" />
            Play
          </span>
        </button>
      </div>
      <div className="dst-deck-stage">
        <div
          className="dst-deck-track"
          tabIndex={0}
          aria-label="The one-minute version, in eleven cards. Swipe, or use the arrow keys."
        >
          {storyCards.map((card, position) => (
            <article
              key={card.sectionId}
              className="dst-card"
              aria-label={`Card ${position + 1} of ${storyCards.length}`}
            >
              <p className="dst-card-kicker">{card.kicker}</p>
              <div className="dst-card-art">
                <StoryArt graphic={card.graphic} />
              </div>
              <p className="dst-card-headline">{card.headline}</p>
              <p className="dst-card-line">{card.line}</p>
              {card.graphic === "ballot" ? (
                <>
                  <div className="dst-card-actions">
                    <WriteToYourMember />
                  </div>
                  <PetitionNote />
                </>
              ) : (
                <a className="dst-card-more" href={`#${card.sectionId}`}>
                  The evidence
                </a>
              )}
            </article>
          ))}
        </div>
        <p className="dst-swipe-hint" aria-hidden="true">
          <span className="is-touch">Swipe for more</span>
          <span className="is-mouse">Click for more</span>
          <i />
        </p>
        <button
          type="button"
          className="dst-deck-step is-back"
          aria-label="Previous card"
        >
          <LineIcon name="chevron-left" />
        </button>
        <button
          type="button"
          className="dst-deck-step is-next"
          aria-label="Next card"
        >
          <LineIcon name="chevron-right" />
        </button>
      </div>
    </div>
  );
}

const moods = [
  {
    id: "fine",
    label: "Fine, honestly",
    reply:
      "Lucky you. On the first night, people in a UK study slept 65 minutes less on average, so plenty of others did not.",
    share:
      "I felt fine after the clocks changed. Many people did not. Nobody asked any of us.",
  },
  {
    id: "off",
    label: "A bit off",
    reply:
      "You are not imagining it. On the first night, people in a UK study slept 65 minutes less.",
    share:
      "I have felt a bit off since the clocks went forward. Turns out it is not just me. Nobody asked us.",
  },
  {
    id: "wrecked",
    label: "Wrecked",
    reply:
      "Night owls never fully adjusted to the spring change, even eight weeks later. If it lasts for weeks, see a GP.",
    share:
      "Since the clocks went forward I have felt wrecked. Nobody asked us about it.",
  },
];

/** "How have you felt since October?" A tap shows a reply and a ready-made post to share. No script needed. */
export function MoodCheck({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="dst-mood">
      <p className="dst-mood-question">Since 4 October, I have felt…</p>
      <div className="dst-mood-options">
        {moods.map((mood) => (
          <span key={mood.id}>
            <input
              type="radio"
              name={`${idPrefix}-mood`}
              id={`${idPrefix}-mood-${mood.id}`}
            />
            <label htmlFor={`${idPrefix}-mood-${mood.id}`}>{mood.label}</label>
          </span>
        ))}
      </div>
      {moods.map((mood) => (
        <div
          key={mood.id}
          className="dst-mood-reply"
          data-mood={`${idPrefix}-mood-${mood.id}`}
        >
          <p>{mood.reply}</p>
          <p className="dst-share-links is-iconic">
            <span>Tell people:</span>
            {shareTargets(mood.share, postUrl).map((target) => (
              <a key={target.name} href={target.href}>
                <ShareIcon name={target.name} />
                {target.name}
              </a>
            ))}
          </p>
        </div>
      ))}
    </div>
  );
}

/** A pretend ballot paper. Marking it takes a second, which is the point. */
export function PretendBallot() {
  return (
    <div className="dst-ballot">
      <p className="dst-ballot-label">Pretend ballot paper</p>
      <p className="dst-ballot-question">
        Should your state use daylight saving for the next term of Parliament?
      </p>
      <div className="dst-ballot-boxes">
        {["Yes", "No"].map((answer) => (
          <span key={answer}>
            <input
              type="radio"
              name="dst-ballot"
              id={`dst-ballot-${answer.toLowerCase()}`}
            />
            <label htmlFor={`dst-ballot-${answer.toLowerCase()}`}>
              <i aria-hidden="true" />
              {answer}
            </label>
          </span>
        ))}
      </div>
      <div className="dst-ballot-result">
        <p>
          That took about one second. Most Australians who change their clocks
          have never been asked this question for real. Make it real: ask your
          state MP for a vote.
        </p>
        <div className="dst-actions">
          <WriteToYourMember />
        </div>
        <PetitionNote />
        <p className="dst-share-links is-iconic">
          <span>Share:</span>
          {shareTargets(
            "I just voted on daylight saving. It was a pretend ballot, because nobody has asked us for real.",
            postUrl,
          ).map((target) => (
            <a key={target.name} href={target.href}>
              <ShareIcon name={target.name} />
              {target.name}
            </a>
          ))}
        </p>
      </div>
    </div>
  );
}

/** Franklin's 1784 joke, as a button: fire the cannon and wake Paris. */
export function FranklinsCannon() {
  return (
    <div className="dst-cannon">
      <p className="dst-cannon-setup">
        Franklin&rsquo;s plan for Parisians who slept through the sunrise: ring
        every church bell, and if that fails, &ldquo;let cannon be fired in
        every street&rdquo;.
      </p>
      <p className="dst-cannon-source">
        Benjamin Franklin, letter to the Journal de Paris, 1784
      </p>
      {/* Two radios that take turns, so every click replays the shot, with no script. */}
      <input type="radio" name="dst-cannon" id="dst-cannon-first" />
      <input type="radio" name="dst-cannon" id="dst-cannon-second" />
      <label htmlFor="dst-cannon-first" className="dst-cannon-fire is-first">
        Fire Franklin&rsquo;s cannon
        <LineIcon name="arrow" />
      </label>
      <label htmlFor="dst-cannon-second" className="dst-cannon-fire is-second">
        Fire it again
      </label>
      <label htmlFor="dst-cannon-first" className="dst-cannon-fire is-third">
        Fire it again
      </label>
      <p className="dst-cannon-boom" aria-live="polite">
        <b>BOOM.</b> Paris is awake. It is six in the morning, and the candles
        are saved.
      </p>
    </div>
  );
}

/** The Nullarbor sign, with its handwritten question. */
export function WhySign() {
  return (
    <figure className="dst-why" data-reveal="">
      <div className="dst-why-plate">
        <p className="dst-why-small">Central Western Time</p>
        <p>Wind your clock</p>
        <p className="dst-why-big">45 minutes</p>
      </div>
      <p className="dst-why-scrawl">Why?</p>
      <figcaption className="dst-small">
        A sign like this stands on the Eyre Highway. Someone added the question
        in Texta.
      </figcaption>
    </figure>
  );
}

const explorerCities = [
  {
    name: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
    standardOffset: 600,
    summerSaving: true,
  },
  {
    name: "Melbourne",
    latitude: -37.8136,
    longitude: 144.9631,
    standardOffset: 600,
    summerSaving: true,
  },
  {
    name: "Brisbane",
    latitude: -27.4678,
    longitude: 153.0281,
    standardOffset: 600,
    summerSaving: false,
  },
  {
    name: "Perth",
    latitude: -31.9523,
    longitude: 115.8613,
    standardOffset: 480,
    summerSaving: false,
  },
  {
    name: "Adelaide",
    latitude: -34.9285,
    longitude: 138.6007,
    standardOffset: 570,
    summerSaving: true,
  },
  {
    name: "Hobart",
    latitude: -42.8821,
    longitude: 147.3272,
    standardOffset: 600,
    summerSaving: true,
  },
  {
    name: "Canberra",
    latitude: -35.2809,
    longitude: 149.13,
    standardOffset: 600,
    summerSaving: true,
  },
  {
    name: "Darwin",
    latitude: -12.4637,
    longitude: 130.8444,
    standardOffset: 570,
    summerSaving: false,
  },
];

const explorerRules = [
  { id: "summer", label: "Daylight saving in summer", icon: "sun" },
  { id: "always", label: "Daylight saving all year", icon: "sun" },
  { id: "never", label: "No daylight saving", icon: "no-sun" },
] as const;

/**
 * Pick a city, a rule and an alarm time, and see the year as a calendar: one square per day, showing how light it
 * is outside when the alarm goes off (or, in the evening view, at 7 pm). Under it, one day up close: a little sky
 * for that day, its sunrise, and the year in one sentence. The sums use the NOAA solar equations, in the post's
 * script.
 */
export function SunExplorer() {
  return (
    <div className="dst-explorer" data-sun-explorer="">
      <p className="dst-explorer-title">
        <LineIcon name="sun" />
        Your year of mornings
      </p>
      <p className="dst-explorer-caption">
        Each square is one day this year. It shows how light it is outside when
        your alarm goes off.
      </p>
      <div className="dst-explorer-live">
        <div className="dst-explorer-controls">
          <label className="dst-explorer-city">
            City
            <span className="dst-select">
              <LineIcon name="pin" />
              <select data-control="city" defaultValue="Melbourne">
                {explorerCities.map((city) => (
                  <option
                    key={city.name}
                    value={city.name}
                    data-latitude={city.latitude}
                    data-longitude={city.longitude}
                    data-standard-offset={city.standardOffset}
                    data-summer-saving={city.summerSaving ? "yes" : "no"}
                  >
                    {city.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="dst-explorer-alarm">
            Alarm
            <span className="dst-alarm-row">
              <LineIcon name="bell" />
              <output data-show="alarm">6:00 am</output>
              <input
                type="range"
                data-control="alarm"
                min={300}
                max={540}
                step={5}
                defaultValue={360}
                aria-label="Alarm time"
              />
            </span>
          </label>
        </div>
        <div className="dst-explorer-rules" role="radiogroup" aria-label="Rule">
          {explorerRules.map((rule) => (
            <button
              key={rule.id}
              type="button"
              data-rule={rule.id}
              aria-pressed="false"
              className={`is-${rule.id}`}
            >
              <span className="dst-rule-head">
                <LineIcon name={rule.icon} />
                <span>
                  <span className="dst-rule-name">{rule.label}</span>
                  <span className="dst-rule-now">Now</span>
                </span>
              </span>
              <span className="dst-rule-stats">
                <span>
                  <b data-stat="dark">–</b> dark mornings
                </span>
                <span>
                  <b data-stat="light">–</b> light evenings
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="dst-explorer-view" role="radiogroup" aria-label="Show">
          <button type="button" data-view="mornings" aria-pressed="true">
            Mornings
          </button>
          <button type="button" data-view="evenings" aria-pressed="false">
            Evenings at 7 pm
          </button>
        </div>
        <div className="dst-calendar-card">
          <p className="dst-calendar-headline" data-show="headline" />
          <div className="dst-calendar" data-show="calendar" />
          <div className="dst-calendar-legend" data-show="legend" />
        </div>
        <div className="dst-day-panel">
          <div
            className="dst-day-scene"
            data-show="scene"
            data-state="light"
            aria-hidden="true"
          >
            <span className="dst-scene-sky is-dark" />
            <span className="dst-scene-sky is-twilight" />
            <span className="dst-scene-sky is-light" />
            <span className="dst-scene-stars" />
            <span className="dst-scene-moon" />
            <span className="dst-scene-sun" />
            <span className="dst-scene-hills" />
            <span className="dst-scene-water" />
          </div>
          <div className="dst-day-text">
            <p className="dst-day-date">
              <LineIcon name="calendar" />
              <span data-show="tip-date">Today</span>
            </p>
            <p className="dst-day-detail" data-show="tip">
              Hover or tap any day to see its sunrise.
            </p>
            <p className="dst-explorer-sentence" data-show="sentence" />
          </div>
        </div>
        <p className="dst-share-links is-iconic" data-show="share" />
      </div>
      <p className="dst-explorer-fallback">
        This tool needs JavaScript. In short: in Melbourne, daylight saving all
        year would put the late June sunrise at 8:36 am.
      </p>
    </div>
  );
}

/** Drag the time in Sydney and watch the rest of the country's clocks. Shows noon without the script. */
export function NoonSlider() {
  const sydneyNoon = 12 * 60;
  return (
    <figure className="dst-figure dst-noon" data-noon-slider="" data-reveal="">
      <figcaption>
        <p className="dst-figure-title">Five clocks, one country</p>
        <p className="dst-figure-caption">
          What the clocks read around Australia this summer, at the same moment.
          Drag the time in Sydney.
        </p>
      </figcaption>
      <label className="dst-noon-control">
        <span>
          In Sydney it is <output data-show="sydney">12:00 pm</output>
        </span>
        <input
          type="range"
          min={0}
          max={1425}
          step={15}
          defaultValue={sydneyNoon}
        />
      </label>
      <div className="dst-zones">
        {summerZones.map((zone) => {
          const reading = sydneyNoon + zone.summerOffset - sydneySummerOffset;
          const hours = Math.floor(reading / 60);
          const minutes = reading % 60;
          const isHome = zone.summerOffset === sydneySummerOffset;
          return (
            <div
              key={zone.place}
              className={`dst-zone${isHome ? " is-home" : ""}${zone.unofficial ? " is-unofficial" : ""}`}
              data-offset-from-sydney={zone.summerOffset - sydneySummerOffset}
            >
              <span className="dst-zone-time" data-show="time">
                {hours % 12 === 0 ? 12 : hours % 12}:
                {String(minutes).padStart(2, "0")}
                {" "}
                {hours < 12 ? "am" : "pm"}
              </span>
              <span>
                {zone.place}
                {zone.note && <span className="dst-small"> · {zone.note}</span>}
                <span className="dst-small dst-warm" data-show="day" />
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

/**
 * "Your clock": the reader's own time, read from their browser's time zone. At rest it says something true for
 * everyone; the post's script fills in the reader's time, their time without daylight saving, their next clock
 * change and their sunrise. Nothing about the reader leaves their browser.
 */
export function YourClock() {
  return (
    <section className="dst-you" data-your-clock="" aria-live="polite">
      <div className="dst-you-card">
        <p className="dst-you-kicker">
          <span className="dst-badge is-small">
            <LineIcon name="clock" />
          </span>
          <span data-show="where">Your clock</span>
        </p>
        <div className="dst-you-readings">
          <div>
            <p className="dst-you-label">On your clock now</p>
            <p className="dst-you-time" data-show="now" />
          </div>
          <div>
            <p className="dst-you-label">Without daylight saving</p>
            <p className="dst-you-time is-standard" data-show="standard" />
          </div>
        </div>
        <p className="dst-you-line" data-show="line">
          This summer, clocks in NSW, Victoria, South Australia, Tasmania and
          the ACT run an hour ahead of standard time.
        </p>
      </div>
      <div className="dst-you-info">
        <LineIcon name="info" />
        <ul className="dst-you-facts" data-show="facts" />
      </div>
      <p className="dst-share-links is-iconic" data-show="share" />
    </section>
  );
}

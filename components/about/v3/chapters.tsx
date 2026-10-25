import { styles } from "@/components/about/v3/class-names";
import {
  chapters,
  heroLine,
  offTheClock,
  type Chapter,
} from "@/components/about/v3/words";
import { site } from "@/lib/site";

/*
  The words, in reading order: the name, a chapter for each city, the life off the clock. Without the scene's script
  they read as a plain column on the night; with it they are stacked on the stage and shown one at a time as the
  camera arrives at each stop (data-flight-chapter is the stop's number, read by lib/flight/chapters.ts).
*/

/** "Karachi" as "karachi", for the chapter's heading id. */
const anchorFor = (place: string) => place.toLowerCase().replace(/\W+/g, "-");

function Years({ chapter }: { chapter: Chapter }) {
  return (
    <p className={styles.years}>
      <time dateTime={String(chapter.arrived)}>{chapter.arrived}</time> to{" "}
      {chapter.left ? (
        <time dateTime={String(chapter.left)}>{chapter.left}</time>
      ) : (
        "now"
      )}
    </p>
  );
}

/** The rest of a chapter, one tap away. A native details element, so it works by keyboard and without script. */
function More({ chapter }: { chapter: Chapter }) {
  return (
    <details className={styles.more} data-flight-more="">
      <summary className={styles.moreButton}>
        <span className={styles.moreOpenLabel}>More about {chapter.place}</span>
        <span className={styles.moreCloseLabel} aria-hidden="true">
          Close
        </span>
      </summary>
      <div className={styles.moreBody} data-flight-more-body="" tabIndex={-1}>
        {chapter.more.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </details>
  );
}

function CityChapter({ chapter, stop }: { chapter: Chapter; stop: number }) {
  const headingId = `flight-${anchorFor(chapter.place)}`;
  return (
    <section
      className={styles.chapter}
      data-flight-chapter={stop}
      aria-labelledby={headingId}
    >
      <div className={styles.words}>
        <h2 className={styles.place} id={headingId}>
          {chapter.place}
        </h2>
        <Years chapter={chapter} />
        {chapter.lines.map((line) => (
          <p key={line} className={styles.lead}>
            {line}
          </p>
        ))}
        <More chapter={chapter} />
      </div>
    </section>
  );
}

export function FlightChapters() {
  const lastStop = chapters.length + 1;
  return (
    <div className={styles.chapters}>
      <header
        className={`${styles.chapter} ${styles.hero}`}
        data-flight-chapter={0}
      >
        <div className={styles.words}>
          <h1 className={styles.name}>
            <span className={styles.nameWord}>Syed</span>{" "}
            <span className={styles.nameWord}>Rafay</span>
          </h1>
          <p className={styles.line}>{heroLine}</p>
        </div>
      </header>
      {chapters.map((chapter, index) => (
        <CityChapter key={chapter.place} chapter={chapter} stop={index + 1} />
      ))}
      <section
        className={`${styles.chapter} ${styles.end}`}
        data-flight-chapter={lastStop}
        aria-labelledby="flight-off-the-clock"
      >
        <div className={styles.words}>
          <h2 className={styles.place} id="flight-off-the-clock">
            {offTheClock.title}
          </h2>
          {offTheClock.lines.map((line) => (
            <p key={line} className={styles.lead}>
              {line}
            </p>
          ))}
          <ul className={styles.links}>
            {site.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} rel="me">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <p>
            <a
              className={styles.back}
              href={offTheClock.backToTheSystem.address}
            >
              {offTheClock.backToTheSystem.label}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

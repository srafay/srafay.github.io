import { styles } from "@/components/about/v2/class-names";
import { formatCount } from "@/lib/format";
import { year } from "@/components/about/v2/words";

/*
  The year, part by part: the totals, then three lines the scroll lights in turn as the camera visits each in the
  galaxy (the busiest day, the longest dark stretch, the longest unbroken run). The numbers count up when the scene
  arrives. The HTML holds their real values.
*/
export function YearScene() {
  return (
    <section
      className={`${styles.scene} ${styles.sceneYear}`}
      data-sky-scene="year"
      aria-labelledby="year-of-nights-year"
    >
      <div className={styles.panel} data-sky-panel="">
        <div className={`${styles.words} ${styles.sideWords}`}>
          <h2 id="year-of-nights-year" className={styles.title}>
            {year.title}
          </h2>
          <p className={styles.lead}>
            <span className={styles.bigNumber} data-sky-count={year.total}>
              {formatCount(year.total)}
            </span>{" "}
            contributions on GitHub in the year to {year.lastDay},{" "}
            <span className={styles.bigNumber} data-sky-count={year.inPrivate}>
              {formatCount(year.inPrivate)}
            </span>{" "}
            of them in private repositories.
          </p>
          <ul className={styles.steps}>
            {year.steps.map((step, index) => (
              <li key={step} className={styles.step} data-sky-step={index}>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

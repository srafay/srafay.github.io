import { styles } from "@/components/about/v2/class-names";
import { cities } from "@/content/about/profile";
import {
  careerStops,
  degreeBetweenStops,
  yearsOfRole,
  yearsOfStop,
  type CareerRole,
} from "@/lib/year-of-nights/career";
import {
  career,
  degreeName,
  inSentenceCase,
} from "@/components/about/v2/words";

/*
  The career as a constellation. The words say what the work is now and before. The cities and roles are labels the
  sky's script hangs beside their stars, a city at a time as the reader scrolls. Without the script they are a plain
  list, oldest first, in the order the career reached them.
*/
const titleOfScene = cities.map((city) => city.name).join(" to ");

function RoleLabel({ role }: { role: CareerRole }) {
  return (
    <li
      className={`${styles.label} ${role.isCurrent ? styles.labelGold : ""}`}
      data-sky-anchor={`role:${role.key}`}
    >
      <span className={styles.labelBody}>
        <span className={styles.labelName}>{role.shortName}</span>
        <span className={styles.labelLine}>{yearsOfRole(role)}</span>
        <span className={styles.labelDetail}>
          {inSentenceCase(role.title)}. {role.summary}
        </span>
      </span>
    </li>
  );
}

export function CareerScene() {
  const stops = careerStops();
  const degree = degreeBetweenStops();
  return (
    <section
      className={`${styles.scene} ${styles.sceneCareer}`}
      data-sky-scene="career"
      aria-labelledby="year-of-nights-career"
    >
      <div className={styles.panel} data-sky-panel="">
        <div className={`${styles.words} ${styles.sideWords}`}>
          <h2 id="year-of-nights-career" className={styles.title}>
            {titleOfScene}
          </h2>
          {career.paragraphs.map((paragraph) => (
            <p key={paragraph} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
        <ol className={`${styles.labels} ${styles.stops}`}>
          {stops.map((stop, index) => (
            <li key={stop.key} className={styles.stop} data-sky-stop={stop.key}>
              <p className={styles.label} data-sky-anchor={`city:${stop.key}`}>
                <span className={styles.labelBody}>
                  <span className={`${styles.labelName} ${styles.cityName}`}>
                    {stop.city.name}
                  </span>
                  <span className={styles.labelLine}>{yearsOfStop(stop)}</span>
                </span>
              </p>
              <ul className={`${styles.labels} ${styles.stopRoles}`}>
                {stop.roles.map((role) => (
                  <RoleLabel key={role.key} role={role} />
                ))}
              </ul>
              {index === 0 && (
                <p
                  className={`${styles.label} ${styles.degree}`}
                  data-sky-anchor="degree"
                >
                  <span className={styles.labelBody}>
                    <span className={styles.labelName}>
                      {degreeName(degree.title)}
                    </span>
                    <span className={styles.labelLine}>{degree.school}</span>
                    <span className={styles.labelLine}>
                      {degree.startedYear} to {degree.endedYear}
                    </span>
                  </span>
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import { styles } from "@/components/about/v2/class-names";
import {
  pinnedRepositories,
  profilePurposes,
  skillGroups,
} from "@/content/about/profile";
import { formatCount } from "@/lib/format";
import { site } from "@/lib/site";
import { keyOf } from "@/lib/year-of-nights/career";
import {
  code,
  elsewhere,
  starsInWords,
  tools,
} from "@/components/about/v2/words";

/*
  The last three scenes: the repositories as a cluster, the tools as short lines of stars, and the links as the last
  stars, with the way back to the homepage's system. Repository names are labels the sky's script hangs beside their
  stars. The tools and links keep their place in the words, and the script puts a star before each.
*/

// The group of tools that is the current role's work takes the stars' accent, as the current role does.
const CURRENT_GROUP = "Now";

const repositoriesByStars = () =>
  [...pinnedRepositories].sort((one, other) => other.stars - one.stars);

export function CodeScene() {
  return (
    <section
      className={`${styles.scene} ${styles.sceneCode}`}
      data-sky-scene="code"
      aria-labelledby="year-of-nights-code"
    >
      <div className={styles.panel} data-sky-panel="">
        <div className={`${styles.words} ${styles.sideWords}`}>
          <h2 id="year-of-nights-code" className={styles.title}>
            {code.title}
          </h2>
          <p className={styles.paragraph}>{code.explanation}</p>
        </div>
        <ul className={styles.labels}>
          {repositoriesByStars().map((repository) => (
            <li
              key={repository.name}
              className={styles.label}
              data-sky-anchor={`repository:${keyOf(repository.name)}`}
            >
              <span className={styles.labelBody}>
                <a
                  className={`${styles.labelName} ${styles.repositoryLink}`}
                  href={repository.address}
                >
                  {repository.name}
                </a>
                <span className={styles.labelLine}>
                  <span data-sky-count={repository.stars}>
                    {formatCount(repository.stars)}
                  </span>{" "}
                  {starsInWords(repository.stars)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ToolsScene() {
  return (
    <section
      className={`${styles.scene} ${styles.sceneTools}`}
      data-sky-scene="tools"
      aria-labelledby="year-of-nights-tools"
    >
      <div className={styles.panel} data-sky-panel="">
        <div className={`${styles.words} ${styles.centreWords}`}>
          <h2 id="year-of-nights-tools" className={styles.title}>
            {tools.title}
          </h2>
          <div className={styles.toolGroups}>
            {skillGroups.map((group) => {
              const isCurrent = group.name === CURRENT_GROUP;
              return (
                <ul
                  key={group.name}
                  className={styles.toolGroup}
                  aria-label={group.name}
                >
                  <li className={styles.toolGroupName} aria-hidden="true">
                    {group.name}
                  </li>
                  {group.skills.map((skill) => (
                    <li
                      key={skill}
                      className={`${styles.tool} ${isCurrent ? styles.toolGold : ""}`}
                      data-sky-word={keyOf(group.name)}
                      data-sky-word-colour={isCurrent ? "gold" : undefined}
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ElsewhereScene() {
  return (
    <section
      className={`${styles.scene} ${styles.sceneElsewhere}`}
      data-sky-scene="elsewhere"
      aria-labelledby="year-of-nights-elsewhere"
    >
      <div className={styles.panel} data-sky-panel="">
        <div className={`${styles.words} ${styles.centreWords}`}>
          <h2 id="year-of-nights-elsewhere" className={styles.title}>
            {elsewhere.title}
          </h2>
          <p className={styles.note}>{elsewhere.note}</p>
          <ul className={styles.links}>
            {site.links.map((link) => (
              <li
                key={link.href}
                className={styles.link}
                data-sky-word="links"
                data-sky-word-kind="link"
              >
                <a className={styles.linkName} href={link.href} rel="me">
                  {link.label}
                </a>
                {profilePurposes[link.label] && (
                  <span className={styles.linkPurpose}>
                    {profilePurposes[link.label]}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <a className={styles.back} href="/?from=post">
            {elsewhere.backToTheSystem}
          </a>
        </div>
      </div>
    </section>
  );
}

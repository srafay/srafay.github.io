import { ContributionStrip } from "@/components/about/v1/contribution-strip";
import { asSentence, capitalised, inWords } from "@/components/about/v1/facts";
import { MarginNote, Passage, Section } from "@/components/about/v1/passage";
import { DayInFull } from "@/components/about/day-in-full";
import {
  pinnedRepositories,
  publicRepositoryCount,
  repositoriesReadOn,
  type Repository,
} from "@/content/about/profile";
import { formatCount } from "@/lib/format";

/** "1 star", "399 stars". */
const counted = (count: number, one: string, many: string) =>
  `${formatCount(count)} ${count === 1 ? one : many}`;

/** GitHub leaves a count off while it is nought, and so does the index. */
const isShown = (count: number) => count > 0;

/** "Python, 399 stars, 197 forks": the language and whatever counts there are, in a short run of small text. */
function factsOf(repository: Repository) {
  return [
    repository.language?.name,
    isShown(repository.stars) && counted(repository.stars, "star", "stars"),
    isShown(repository.forks) && counted(repository.forks, "fork", "forks"),
  ]
    .filter(Boolean)
    .join(", ");
}

function IndexEntry({ repository }: { repository: Repository }) {
  const facts = factsOf(repository);
  return (
    <li className="dispatch-entry">
      <a className="dispatch-entry-name" href={repository.address}>
        {repository.name}
      </a>
      <p className="dispatch-entry-line">
        {asSentence(repository.description)}
      </p>
      {facts && <p className="dispatch-entry-facts">{facts}</p>}
    </li>
  );
}

/** Six repositories as a book's index sets its entries, then the year of contributions under them. */
export function CodeIndex() {
  return (
    <Section id="code" title="Code">
      <Passage
        note={
          <MarginNote
            parts={[
              <>
                {capitalised(inWords(pinnedRepositories.length))} of my{" "}
                {publicRepositoryCount} public repositories, with their stars on{" "}
                <DayInFull day={repositoriesReadOn} />
              </>,
            ]}
          />
        }
      >
        <ul className="dispatch-index">
          {pinnedRepositories.map((repository) => (
            <IndexEntry key={repository.name} repository={repository} />
          ))}
        </ul>
      </Passage>
      <ContributionStrip />
    </Section>
  );
}

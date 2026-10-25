import type { CSSProperties, ReactNode } from "react";
import { ForkIcon, StarIcon } from "@/components/about/icons";
import {
  pinnedRepositories,
  repositoriesReadOn,
  type Repository,
} from "@/content/about/profile";
import { DayInFull } from "@/components/about/day-in-full";
import { pageSections } from "@/lib/about/sections";
import { formatCount } from "@/lib/format";

/** "1 star", "399 stars": the word a screen reader hears after the number. */
const countWord = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

/** GitHub leaves a count off a pinned card while it is nought, and so does this page. */
const isShown = (count: number) => count > 0;

function LanguageLabel({
  language,
}: {
  language: NonNullable<Repository["language"]>;
}) {
  const colour = { "--language-colour": language.colour } as CSSProperties;
  return (
    <span>
      <span className="language-dot" style={colour} aria-hidden="true" />
      {language.name}
    </span>
  );
}

function Count({
  count,
  one,
  many,
  icon,
}: {
  count: number;
  one: string;
  many: string;
  icon: ReactNode;
}) {
  return (
    <span>
      {icon}
      {formatCount(count)}
      <span className="sr-only"> {countWord(count, one, many)}</span>
    </span>
  );
}

function RepositoryCard({ repository }: { repository: Repository }) {
  const { language, stars, forks } = repository;
  const hasNumbers = !!language || isShown(stars) || isShown(forks);
  return (
    <li className="repository">
      <h3>
        <a href={repository.address}>{repository.name}</a>
      </h3>
      <p className="repository-description">{repository.description}</p>
      {hasNumbers && (
        <p className="repository-numbers">
          {language && <LanguageLabel language={language} />}
          {isShown(stars) && (
            <Count count={stars} one="star" many="stars" icon={<StarIcon />} />
          )}
          {isShown(forks) && (
            <Count count={forks} one="fork" many="forks" icon={<ForkIcon />} />
          )}
        </p>
      )}
    </li>
  );
}

/** Six repositories in two columns, as on a GitHub profile; one column on a phone. */
export function PinnedRepositories() {
  const { id, label } = pageSections.pinned;
  return (
    <section
      id={id}
      className="profile-section"
      aria-labelledby="pinned-heading"
    >
      <div className="section-heading">
        <h2 id="pinned-heading">{label}</h2>
        <p className="section-note">
          Stars and forks as of <DayInFull day={repositoriesReadOn} />
        </p>
      </div>
      <ul className="repositories">
        {pinnedRepositories.map((repository) => (
          <RepositoryCard key={repository.name} repository={repository} />
        ))}
      </ul>
    </section>
  );
}

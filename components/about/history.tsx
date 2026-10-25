import { education, experience, type Role } from "@/content/about/profile";
import { YearRuler } from "@/components/about/year-ruler";
import { roleAnchor, roleAttributes } from "@/lib/about/roles";
import { pageSections } from "@/lib/about/sections";
import { formatMonthInFull } from "@/lib/format";

/** A month as a <time>, written out: "September 2025". */
const MonthTime = ({ month }: { month: string }) => (
  <time dateTime={month}>{formatMonthInFull(month)}</time>
);

/** "September 2025 to June 2026", or "Since August 2026" while the role goes on. */
function roleDates(role: Role) {
  if (!role.ended)
    return (
      <>
        Since <MonthTime month={role.started} />
      </>
    );
  return (
    <>
      <MonthTime month={role.started} /> to <MonthTime month={role.ended} />
    </>
  );
}

const isCurrent = (role: Role) => !role.ended;

/**
 * Every role, newest first: the role, the company, when and where, and one line of what it was. Above them, the
 * ruler of the years they took. Each role carries its months and skills for the page's script, which lights the
 * roles a pressed skill was used in.
 */
export function Experience() {
  const { id, label } = pageSections.experience;
  return (
    <section
      id={id}
      className="profile-section"
      aria-labelledby="experience-heading"
    >
      <h2 id="experience-heading">{label}</h2>
      <YearRuler />
      <ol className="timeline">
        {experience.map((role) => (
          <li
            key={`${role.organisation} ${role.started}`}
            id={roleAnchor(role)}
            className={isCurrent(role) ? "is-current" : undefined}
            {...roleAttributes(role)}
          >
            <p className="timeline-meta">
              {roleDates(role)}
              {role.place && <> · {role.place}</>}
            </p>
            <h3>{role.title}</h3>
            <p className="timeline-organisation">{role.organisation}</p>
            <p className="timeline-summary">{role.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Education() {
  const { id, label } = pageSections.education;
  return (
    <section
      id={id}
      className="profile-section"
      aria-labelledby="education-heading"
    >
      <h2 id="education-heading">{label}</h2>
      <ol className="timeline">
        {education.map((degree) => (
          <li key={degree.title}>
            <p className="timeline-meta">
              <time dateTime={String(degree.startedYear)}>
                {degree.startedYear}
              </time>{" "}
              to{" "}
              <time dateTime={String(degree.endedYear)}>
                {degree.endedYear}
              </time>
            </p>
            <h3>{degree.title}</h3>
            <p className="timeline-organisation">{degree.school}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

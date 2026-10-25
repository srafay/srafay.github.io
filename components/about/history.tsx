import { education, experience, type Role } from "@/content/about/profile";
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

/** Every role, newest first: the role, the company, when and where, and one line of what it was. */
export function Experience() {
  return (
    <section className="profile-section" aria-labelledby="experience-heading">
      <h2 id="experience-heading">Experience</h2>
      <ol className="timeline">
        {experience.map((role) => (
          <li
            key={`${role.organisation} ${role.started}`}
            className={isCurrent(role) ? "is-current" : undefined}
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
  return (
    <section className="profile-section" aria-labelledby="education-heading">
      <h2 id="education-heading">Education</h2>
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

import { currentRole } from "@/content/about/profile";
import { pageSections } from "@/lib/about/sections";
import { formatMonthInFull } from "@/lib/format";

/** The current role, in the owner's own words. */
export function NowCard() {
  const { id, label } = pageSections.now;
  return (
    <section id={id} className="profile-section" aria-labelledby="now-heading">
      <h2 id="now-heading">{label}</h2>
      <div className="now-card">
        <p className="now-dates">
          <span className="now-marker" aria-hidden="true" />
          <span>
            Since{" "}
            <time dateTime={currentRole.started}>
              {formatMonthInFull(currentRole.started)}
            </time>
          </span>
        </p>
        <h3>{currentRole.title}</h3>
        <p className="now-organisation">{currentRole.organisation}</p>
        <p className="now-description">{currentRole.description}</p>
      </div>
    </section>
  );
}

import { skillGroups } from "@/content/about/profile";

/** A few short groups of plain words, each in a quiet hairline chip. */
export function SkillGroups() {
  return (
    <section className="profile-section" aria-labelledby="skills-heading">
      <h2 id="skills-heading">Languages and tools</h2>
      <dl className="skill-groups">
        {skillGroups.map((group) => (
          <div key={group.name}>
            <dt>{group.name}</dt>
            <dd>
              <ul className="chips">
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

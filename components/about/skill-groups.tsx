import { skillGroups } from "@/content/about/profile";
import { pageSections } from "@/lib/about/sections";
import { chipAnswers } from "@/lib/about/skills";

/**
 * A skill as a hairline chip. Where a role in Experience used it, the chip is a button: pressed, the page's script
 * lights those roles and says which they were. A skill no role names stays a plain word.
 */
function Chip({ skill }: { skill: string }) {
  if (!chipAnswers(skill)) return <span className="chip">{skill}</span>;
  return (
    <button
      type="button"
      className="chip"
      aria-pressed="false"
      data-skill={skill}
    >
      {skill}
    </button>
  );
}

/** A few short groups of plain words, each in a quiet hairline chip. */
export function SkillGroups() {
  const { id, label } = pageSections.languagesAndTools;
  return (
    <section
      id={id}
      className="profile-section"
      aria-labelledby="skills-heading"
    >
      <h2 id="skills-heading">{label}</h2>
      <dl className="skill-groups">
        {skillGroups.map((group) => (
          <div key={group.name}>
            <dt>{group.name}</dt>
            <dd>
              <ul className="chips">
                {group.skills.map((skill) => (
                  <li key={skill}>
                    <Chip skill={skill} />
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

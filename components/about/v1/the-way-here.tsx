import {
  capitalised,
  inWords,
  monthsOf,
  rolesAt,
  rolesOldestFirst,
  yearsOf,
} from "@/components/about/v1/facts";
import {
  MarginNote,
  Passage,
  Prose,
  Section,
} from "@/components/about/v1/passage";
import { chapters } from "@/components/about/v1/words";

/** Every role with its months and place, oldest first like the story, for the reader who wants the record. */
function RolesInFull() {
  const roles = rolesOldestFirst();
  return (
    <details className="dispatch-roles">
      <summary>
        {capitalised(inWords(roles.length))} roles, with their months
      </summary>
      <ol className="dispatch-roles-list">
        {roles.map((role) => (
          <li key={`${role.organisation} ${role.started}`}>
            <p className="dispatch-role">
              {role.title}, {role.organisation}
            </p>
            <p className="dispatch-role-when">
              {monthsOf(role)}
              {role.place && `, ${role.place}`}
            </p>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** The career as a short story, oldest first, each part dated and placed in the margin. */
export function TheWayHere() {
  return (
    <Section id="the-way-here" title="The way here">
      {chapters.map((chapter) => (
        <Passage
          key={chapter.place + chapter.organisations[0]}
          note={
            <MarginNote
              parts={[yearsOf(rolesAt(chapter.organisations)), chapter.place]}
            />
          }
        >
          <p>
            <Prose text={chapter.paragraph} />
          </p>
        </Passage>
      ))}
      <RolesInFull />
    </Section>
  );
}

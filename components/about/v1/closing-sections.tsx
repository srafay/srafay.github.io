import { withoutLeadIn } from "@/components/about/v1/facts";
import {
  MarginNote,
  Passage,
  Prose,
  Section,
} from "@/components/about/v1/passage";
import { degreeNotes, profileSentences } from "@/components/about/v1/words";
import { education, personalNote } from "@/content/about/profile";
import { site } from "@/lib/site";

/** The two degrees, each dated in the margin. */
export function Studies() {
  return (
    <Section id="studies" title="Studies">
      {education.map((degree) => (
        <Passage
          key={degree.title}
          note={
            <MarginNote
              parts={[`${degree.startedYear} to ${degree.endedYear}`]}
            />
          }
        >
          <p>
            {degree.title}, {degree.school}.
            {degreeNotes[degree.school] && (
              <>
                {" "}
                <Prose text={degreeNotes[degree.school]} />
              </>
            )}
          </p>
        </Passage>
      ))}
    </Section>
  );
}

/** The personal line from the GitHub profile, under a heading that already says how it begins. */
export function AskMeAbout() {
  const title = "Ask me about";
  return (
    <Section id="ask-me-about" title={title}>
      <Passage>
        <p>
          <Prose text={withoutLeadIn(personalNote, `${title} `)} />
        </p>
      </Passage>
    </Section>
  );
}

/** The site's profiles, a sentence each, each ending in its link. A profile with no sentence of its own still shows. */
export function Elsewhere() {
  return (
    <Section id="elsewhere" title="Elsewhere">
      <Passage>
        <p>
          {site.links.map((link, index) => {
            const sentence = profileSentences[link.label] ?? {
              before: "I am also on",
            };
            return (
              <span key={link.href}>
                {index > 0 && " "}
                {sentence.before}{" "}
                <a href={link.href} rel="me">
                  {link.label}
                </a>
                {sentence.after ?? "."}
              </span>
            );
          })}
        </p>
      </Passage>
    </Section>
  );
}

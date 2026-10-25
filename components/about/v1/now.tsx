import { Passage, Prose, Section } from "@/components/about/v1/passage";
import { nowParagraphs } from "@/components/about/v1/words";

/**
 * The current role as a paragraph. It has no date in the margin: the line just above the rule already says since when.
 */
export function Now() {
  return (
    <Section id="now" title="Now">
      <Passage>
        {nowParagraphs.map((paragraph) => (
          <p key={paragraph}>
            <Prose text={paragraph} />
          </p>
        ))}
      </Passage>
    </Section>
  );
}

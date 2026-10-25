import { Fragment, type ReactNode } from "react";

/*
  The article's two building blocks. A section is a heading in the reading column and what follows it. A passage is
  a paragraph with its margin note: on a computer the note stands in the margin beside the paragraph's first line;
  on a phone it is a small line above it (app/about/v1/dispatch.css).
*/

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const headingId = `dispatch-${id}-heading`;
  return (
    <section className="dispatch-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="dispatch-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * What stands in the margin, in short parts: when and where, or one short sentence. On a computer each part stands on
 * its own line. On a phone they share one line, joined by commas that only the phone shows (and a screen reader always
 * reads).
 */
export function MarginNote({ parts }: { parts: ReactNode[] }) {
  return (
    <p className="dispatch-note">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <span className="dispatch-note-joiner">, </span>}
          <span className="dispatch-note-part">{part}</span>
        </Fragment>
      ))}
    </p>
  );
}

// A word joined by a hyphen (PCI-DSS, X-ray), or a name with its short number (Java 21, Dota 2).
const KEPT_TOGETHER = /(\S+-\S+|[A-Za-z]+ \d{1,2}(?!\d))/;

/**
 * Prose with a few runs kept on one line: a narrow column would otherwise break "PCI-" from "DSS" or "Dota" from "2",
 * and either half alone reads as something else. Splitting on a capturing pattern puts each kept run at an odd index.
 */
export function Prose({ text }: { text: string }) {
  return text.split(KEPT_TOGETHER).map((piece, index) =>
    index % 2 === 1 ? (
      <span key={index} className="dispatch-whole-word">
        {piece}
      </span>
    ) : (
      piece
    ),
  );
}

export function Passage({
  note,
  children,
}: {
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dispatch-passage">
      {note}
      <div className="dispatch-text">{children}</div>
    </div>
  );
}

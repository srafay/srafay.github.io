import type { ReactNode } from "react";
import { PostScript } from "../post-script";
import {
  Hero,
  MoodCheck,
  PretendBallot,
  StoryDeck,
  SunExplorer,
  YourClock,
} from "./interactive";
import { LineIcon, ShareIcon } from "./line-icon";
import { PetitionNote, WriteToYourMember } from "./petition-button";
import {
  letterMailto,
  letterToMember,
  sectionUrl,
  shareTargets,
} from "./sharing";
import { letterStates } from "./letter-states";
import { daylightSavingStyles } from "./styles";

/**
 * The whole post. A switch at the top picks the one-minute deck or the full story. It is two radio buttons, so it
 * works without a script, including in the homepage's reader. The script (see PostScript) adds the motion.
 */
export function ReadingLength({
  quickMinutes,
  fullMinutes,
  children,
}: {
  quickMinutes: number;
  fullMinutes: number;
  children: ReactNode;
}) {
  return (
    <div className="dst">
      <style dangerouslySetInnerHTML={{ __html: daylightSavingStyles }} />
      <PostScript src="/post-scripts/daylight-saving.js" />
      <Hero />
      <YourClock />
      <div className="dst-bar">
        <div
          className="dst-switch"
          role="radiogroup"
          aria-label="How much to read"
        >
          <input type="radio" name="dst-length" id="dst-short" defaultChecked />
          <label htmlFor="dst-short">
            Quick <span>{quickMinutes} min</span>
          </label>
          <input type="radio" name="dst-length" id="dst-full" />
          <label htmlFor="dst-full">
            Full story <span>{fullMinutes} min</span>
          </label>
        </div>
        <a className="dst-button" href="#dst-your-turn">
          Have your say
        </a>
        <span className="dst-progress" aria-hidden="true" />
      </div>
      <div className="dst-short-only">
        <StoryDeck />
        <p className="dst-deck-hint">
          Want the evidence behind each card?{" "}
          <label htmlFor="dst-full" className="dst-inline-switch">
            Read the full story
          </label>
          .
        </p>
      </div>
      {children}
      <YourTurn />
    </div>
  );
}

/** One part of the full story. Only the full version shows it. */
export function Section({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="dst-section dst-full-only">
      <p className="dst-kicker">{kicker}</p>
      <h2>{title}</h2>
      {children}
      <p className="dst-section-end" aria-hidden="true">
        <LineIcon name="leaf" />
      </p>
    </section>
  );
}

/** The section in a few lines, above its full text. */
export function Short({ children }: { children: ReactNode }) {
  return (
    <div className="dst-lede">
      <p className="dst-lede-label">In short</p>
      {children}
    </div>
  );
}

/** The section's full text and sources, folded away until asked for. */
export function Full({
  minutes,
  children,
}: {
  minutes: number;
  children: ReactNode;
}) {
  return (
    <details className="dst-more">
      <summary>
        Read the whole section <span>{minutes} min</span>
      </summary>
      <div className="dst-flow">{children}</div>
    </details>
  );
}

/** The end of both versions: a pretend ballot, a few things to try, and the ask. */
function YourTurn() {
  return (
    <section id="dst-your-turn" className="dst-section dst-your-turn">
      <p className="dst-kicker">Your turn</p>
      <h2>Have your say</h2>
      <PretendBallot />
      <div className="dst-short-only">
        <MoodCheck idPrefix="dst-quick" />
        <SunExplorer />
      </div>
      <CallToAct>
        Nobody is asking you to love daylight saving or hate it. Just to be
        asked.
      </CallToAct>
      <LetterToMember />
    </section>
  );
}

const sourceId = (section: number, number: number) =>
  `dst-s${section}-source-${number}`;

/** A numbered reference to one of this section's sources. */
export function Cite({ section, number }: { section: number; number: number }) {
  return (
    <sup className="dst-cite">
      <a href={`#${sourceId(section, number)}`} aria-label={`Source ${number}`}>
        {number}
      </a>
    </sup>
  );
}

export function Sources({
  section,
  children,
}: {
  section: number;
  children: ReactNode;
}) {
  return (
    <details className="dst-sources">
      <summary>Sources for this section</summary>
      <ol data-section={section}>{children}</ol>
    </details>
  );
}

export function Source({
  section,
  number,
  children,
}: {
  section: number;
  number: number;
  children: ReactNode;
}) {
  return (
    <li id={sourceId(section, number)} value={number}>
      {children}
    </li>
  );
}

/** One line worth sharing, with links that open each network's share page already filled in. */
export function ShareLine({
  sectionId,
  text,
}: {
  sectionId: string;
  text: string;
}) {
  return (
    <aside className="dst-share">
      <p className="dst-share-line">{text}</p>
      <p className="dst-share-links is-iconic">
        <span>Share this:</span>
        {shareTargets(text, sectionUrl(sectionId)).map((target) => (
          <a key={target.name} href={target.href}>
            <ShareIcon name={target.name} />
            {target.name}
          </a>
        ))}
      </p>
    </aside>
  );
}

/** Each parliament's list of members, for finding yours by electorate. */
function MemberLinks({ newTab = false }: { newTab?: boolean }) {
  return (
    <>
      {letterStates.map((state, position) => (
        <span key={state.code}>
          {position > 0 && " · "}
          <a
            href={state.membersPage}
            {...(newTab
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {state.code}
          </a>
        </span>
      ))}
    </>
  );
}

/**
 * The message readers can send their state MP. It is printed in full on the page, so it works with no script. With
 * the post's script, "Write to your MP" and "Open it as an email" open a dialog instead: it asks for the reader's
 * state and name, then writes the email with that state's own figures, ready to copy or open in an email app.
 */
export function LetterToMember() {
  return (
    <div className="dst-letter" id="dst-letter">
      <p className="dst-letter-for" hidden>
        <LineIcon name="document" />
        <span data-show="page-letter-for" />
      </p>
      <div className="dst-letter-body" data-show="page-letter">
        {letterToMember.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>{letterToMember.signOff}</p>
      </div>
      <div className="dst-actions">
        <a
          className="dst-button has-icons"
          href={letterMailto()}
          data-letter-open=""
        >
          <LineIcon name="mail" />
          Open it as an email
          <LineIcon name="arrow" />
        </a>
      </div>
      <p className="dst-members">
        <LineIcon name="link" />
        <span>
          Find your MP: <MemberLinks />
        </span>
      </p>
      <LetterDialog />
    </div>
  );
}

/** The two steps of writing to an MP: a state and a name, then the finished email to copy or open. */
function LetterDialog() {
  return (
    <dialog
      className="dst-dialog"
      data-letter-dialog=""
      data-subject={letterToMember.subject}
      data-states={JSON.stringify(letterStates)}
      aria-labelledby="dst-dialog-title"
    >
      <form method="dialog" className="dst-dialog-step" data-step="name">
        <p className="dst-dialog-title" id="dst-dialog-title">
          Write to your MP
        </p>
        <p className="dst-dialog-text">
          The letter uses your state&rsquo;s own figures. Add your name to sign
          it, or leave it blank.
        </p>
        <fieldset className="dst-state-picker">
          <legend>Your state or territory</legend>
          <div className="dst-state-options">
            {letterStates.map((state) => (
              <span key={state.code}>
                <input
                  type="radio"
                  name="state"
                  value={state.code}
                  id={`dst-letter-state-${state.code}`}
                  defaultChecked={state.code === "NSW"}
                />
                <label htmlFor={`dst-letter-state-${state.code}`}>
                  <b>{state.code}</b>
                  <span>{state.fullName}</span>
                </label>
              </span>
            ))}
          </div>
        </fieldset>
        <label className="dst-dialog-field">
          <span>
            Your name <span className="dst-dim">(optional)</span>
          </span>
          <input
            type="text"
            name="name"
            id="dst-letter-name"
            autoComplete="name"
            maxLength={80}
          />
        </label>
        <div className="dst-actions">
          <button type="submit" className="dst-button" data-action="compose">
            Write my email
          </button>
          <button
            type="button"
            className="dst-button is-quiet"
            data-action="close"
          >
            Cancel
          </button>
        </div>
      </form>
      <div className="dst-dialog-step" data-step="letter" hidden>
        <p className="dst-dialog-title" data-show="letter-title">
          Your email
        </p>
        <p className="dst-dialog-text">
          Subject: <b>{letterToMember.subject}</b>
        </p>
        <div
          className="dst-dialog-letter"
          data-show="letter"
          id="dst-letter-text"
          tabIndex={0}
          role="textbox"
          aria-readonly="true"
          aria-label="Your email"
        />
        <div className="dst-actions">
          <button type="button" className="dst-button" data-action="copy">
            Copy the email
          </button>
          <a
            className="dst-button is-quiet"
            data-show="mailto"
            href={letterMailto()}
          >
            Open it as an email
          </a>
          <button
            type="button"
            className="dst-button is-quiet"
            data-action="back"
          >
            Back
          </button>
        </div>
        <p
          className="dst-dialog-status"
          data-show="status"
          aria-live="polite"
        />
        <p className="dst-members">
          <a
            className="dst-members-own"
            data-show="members"
            href={letterStates[0].membersPage}
            target="_blank"
            rel="noopener noreferrer"
          >
            Find your MP
          </a>
          <br />
          Other parliaments: <MemberLinks newTab />
        </p>
      </div>
      <button
        type="button"
        className="dst-dialog-close"
        data-action="close"
        aria-label="Close"
      >
        ×
      </button>
    </dialog>
  );
}

/** The closing ask: the petition and the letter, side by side. */
function CallToAct({ children }: { children: ReactNode }) {
  return (
    <div className="dst-call">
      <span className="dst-call-leaf" aria-hidden="true">
        <LineIcon name="leaf" />
      </span>
      <p>{children}</p>
      <div className="dst-actions">
        <WriteToYourMember />
      </div>
      <PetitionNote />
    </div>
  );
}

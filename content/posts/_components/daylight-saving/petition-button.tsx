import { LineIcon } from "./line-icon";
import { petitionUrl } from "./sharing";

/**
 * The NSW petition to end daylight saving, always inside the same disclaimer. This post asks for a say, not for an
 * end, so the petition is never a button of its own: it is a link in a sentence that says so first. Nothing shows
 * while there is no link.
 */
export function PetitionNote() {
  if (!petitionUrl) return null;
  return (
    <p className="dst-petition-note">
      This post does not ask to end daylight saving. It asks for a say. If you
      want it ended in NSW, there is{" "}
      <a href={petitionUrl} target="_blank" rel="noopener noreferrer">
        a separate petition for that
      </a>
      .
    </p>
  );
}

/** The post's own ask: the letter to a state MP, at the end of the page. */
export function WriteToYourMember({ className = "" }: { className?: string }) {
  return (
    <a className={`dst-button has-icons ${className}`} href="#dst-letter">
      <LineIcon name="pencil" />
      Write to your MP
      <LineIcon name="arrow" />
    </a>
  );
}

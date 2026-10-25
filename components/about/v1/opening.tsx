import { Fragment } from "react";
import { standingLine } from "@/components/about/v1/facts";
import { deck } from "@/components/about/v1/words";
import { site } from "@/lib/site";

/*
  The opening: the name broken across lines at the size of the screen, the deck, and the role that is current.
  Each word of the name is its own line; the space between them stays in the text, so the heading reads as one name.
*/
export function Opening() {
  const words = site.name.split(" ");
  return (
    <header className="dispatch-opening">
      <h1 className="dispatch-name">
        {words.map((word, index) => (
          <Fragment key={word}>
            {index > 0 && " "}
            <span className="dispatch-name-line">{word}</span>
          </Fragment>
        ))}
      </h1>
      <div className="dispatch-standfirst">
        <p className="dispatch-deck">{deck}</p>
        <p className="dispatch-standing">{standingLine()}</p>
      </div>
    </header>
  );
}

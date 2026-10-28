/*
  What each event spells on the land: its card's own text, in the card's order, in capitals, joined with " · ", and
  then " · " again so the stream cycles. The stream is wrapped to the event's track by words, each line ending ragged
  with the rest of its cells as ground. A word wider than the track is never split: it takes a line of its own, and
  the land narrows its letters to fit. The flight into the card reads the same pieces, so each letter lands on its own
  character.
*/
import { cardMeta } from "@/lib/about-cv/answers";
import type { WorldEvent } from "@/lib/about-cv/events";

export type PieceKind = "heading" | "second" | "meta" | "line" | "evidence" | "skills";
export type Piece = { kind: PieceKind; text: string };

export const SEPARATOR = " · ";

/** The card's heading: the organisation for work, the title for the rest (as lib/about-cv/ui/event-card.ts). */
export const headingOf = (event: WorldEvent) =>
  event.subtitle && event.world === "work" ? event.subtitle : event.title;

/** The card's text, piece by piece, in its order. */
export function piecesOf(event: WorldEvent): Piece[] {
  const heading = headingOf(event);
  const pieces: Piece[] = [{ kind: "heading", text: heading }];
  const second = event.world === "work" ? event.title : event.subtitle;
  if (second && second !== heading) pieces.push({ kind: "second", text: second });
  pieces.push({ kind: "meta", text: cardMeta(event) });
  for (const line of event.lines) pieces.push({ kind: "line", text: line });
  if (event.evidence) pieces.push({ kind: "evidence", text: event.evidence });
  if (event.skills.length) pieces.push({ kind: "skills", text: event.skills.join(", ") });
  return pieces;
}

/** The stream the land spells, with where each piece starts in it. */
export function streamOf(event: WorldEvent) {
  const pieces = piecesOf(event);
  let text = "";
  const starts: number[] = [];
  for (const piece of pieces) {
    starts.push(text.length);
    text += piece.text.toUpperCase() + SEPARATOR;
  }
  return { text, pieces, starts };
}

/** One wrapped line: its characters, and where each sits in the stream (-1 for padding). */
export type WrappedLine = { characters: string; streamIndex: number[] };

/** Wraps a stream to a width by words. A word wider than the width is broken where it must be. */
export function wrapStream(text: string, width: number): WrappedLine[] {
  const lines: WrappedLine[] = [];
  let characters = "";
  let indices: number[] = [];
  const flush = () => {
    lines.push({ characters, streamIndex: indices });
    characters = "";
    indices = [];
  };
  const words = [...text.matchAll(/\S+/g)];
  for (const match of words) {
    const word = match[0];
    const at = match.index ?? 0;
    // A word wider than the track is never split: it takes a line of its own, and the land narrows its letters to fit.
    if (word.length > width) {
      if (characters) flush();
      characters = word;
      indices = Array.from({ length: word.length }, (_, offset) => at + offset);
      flush();
      continue;
    }
    const needed = characters ? characters.length + 1 + word.length : word.length;
    if (needed > width) flush();
    if (characters) {
      characters += " ";
      indices.push(-1);
    }
    for (let offset = 0; offset < word.length; offset++) indices.push(at + offset);
    characters += word;
  }
  if (characters) flush();
  return lines;
}

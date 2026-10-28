import { glyphElement, type Glyph } from "@/lib/world-lines/icons";

/** An element with a class and its text, the one way this page's script makes its HTML (never from markup strings). */
export function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
  text?: string,
) {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text !== undefined) made.textContent = text;
  return made;
}

/** A heading with its glyph before its words. The glyph is drawing only, so a screen reader reads just the words. */
export function headingWithGlyph(tag: "h2" | "h3", glyph: Glyph, text: string) {
  const heading = element(tag);
  heading.append(glyphElement(glyph), text);
  return heading;
}

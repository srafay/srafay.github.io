/*
  The tools and the links are stars beside their own words: the words stay in the page's text, laid out by the
  browser, and the scene puts a star just before each one and joins a group's stars with a line, as a short
  constellation. Where the words sit is read when the page's size changes, never in a frame.
*/
import type { Colour } from "./world";

export type WordStar = {
  sceneIndex: number;
  group: string;
  /** Where the star sits in its scene's words box, in CSS pixels. */
  x: number;
  y: number;
  coreRadius: number;
  colour: Colour;
};

const GAP_BEFORE_WORD = 11;
const WORD_STAR_CORE = 2.1;
const LINK_STAR_CORE = 3.6;

export function measureWordStars(sections: HTMLElement[]): WordStar[] {
  return sections.flatMap((section, sceneIndex) => {
    const panel = section.querySelector<HTMLElement>("[data-sky-panel]");
    if (!panel) return [];
    const panelBox = panel.getBoundingClientRect();
    return [...section.querySelectorAll<HTMLElement>("[data-sky-word]")].map(
      (word) => {
        const box = word.getBoundingClientRect();
        const isLink = word.dataset.skyWordKind === "link";
        return {
          sceneIndex,
          group: word.dataset.skyWord!,
          x: box.left - panelBox.left - GAP_BEFORE_WORD - (isLink ? 6 : 0),
          y: box.top - panelBox.top + box.height * 0.55,
          coreRadius: isLink ? LINK_STAR_CORE : WORD_STAR_CORE,
          colour: word.dataset.skyWordColour === "gold" ? "gold" : "starlight",
        };
      },
    );
  });
}

/** Consecutive stars of the same group, joined in the order their words read. */
export function wordStarPairs(stars: WordStar[]) {
  return stars.slice(1).flatMap((star, index) => {
    const previous = stars[index];
    return previous.group === star.group &&
      previous.sceneIndex === star.sceneIndex
      ? [{ from: previous, to: star, order: index }]
      : [];
  });
}

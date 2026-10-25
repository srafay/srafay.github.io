/*
  The scroll, read as a story. The stage (canvas and labels) sticks to the top of the screen for the whole page. Each
  scene is a tall section whose words stick while the reader scrolls through it: that is the scene holding, and the
  scroll steps through its parts. Then its words scroll away as the next scene's arrive, a screen's height of scroll,
  and that is the slide, when the camera flies to the next scene.

  The page is measured only when its size changes (measureStory). Every frame works from those numbers and the scroll
  position alone, so a frame never asks the browser for layout.
*/
import { clamp } from "./motion";

export type SectionPlace = { top: number; height: number };
export type StoryLayout = {
  rootTop: number;
  rootHeight: number;
  stageHeight: number;
  sections: SectionPlace[];
};
export type StoryPosition = {
  sceneIndex: number;
  /** From 0 to 1 while the scene's words are stuck. */
  hold: number;
  /** From 0 to 1 while the next scene's words arrive. */
  slide: number;
};

const documentTop = (element: Element) =>
  element.getBoundingClientRect().top + window.scrollY;

/** The page's numbers the story needs: read on resize, never in a frame. */
export function measureStory(
  root: Element,
  stage: HTMLElement,
  sections: HTMLElement[],
): StoryLayout {
  return {
    rootTop: documentTop(root),
    rootHeight: root.getBoundingClientRect().height,
    stageHeight: stage.offsetHeight,
    sections: sections.map((section) => ({
      top: documentTop(section),
      height: section.offsetHeight,
    })),
  };
}

export function storyPosition(
  layout: StoryLayout,
  scrollY: number,
): StoryPosition {
  const { sections, stageHeight } = layout;
  let sceneIndex = 0;
  sections.forEach((section, index) => {
    if (scrollY >= section.top) sceneIndex = index;
  });
  const section = sections[sceneIndex];
  const holdLength = Math.max(1, section.height - stageHeight);
  const holdEnd = section.top + holdLength;
  const isLast = sceneIndex === sections.length - 1;
  return {
    sceneIndex,
    hold: clamp((scrollY - section.top) / holdLength),
    slide: isLast ? 0 : clamp((scrollY - holdEnd) / stageHeight),
  };
}

/** The story as one number: the scene's index plus how far the slide to the next has gone. */
export const storyFlow = (position: StoryPosition) =>
  position.sceneIndex + position.slide;

/** Where a sticky box's top is on screen: in its place, then stuck at the top, then carried off by its container. */
export function stickyTop(
  placeTop: number,
  placeHeight: number,
  boxHeight: number,
  scrollY: number,
) {
  return Math.min(
    Math.max(placeTop - scrollY, 0),
    placeTop + placeHeight - boxHeight - scrollY,
  );
}

export const stageTop = (layout: StoryLayout, scrollY: number) =>
  stickyTop(layout.rootTop, layout.rootHeight, layout.stageHeight, scrollY);

export function panelTop(
  layout: StoryLayout,
  sceneIndex: number,
  scrollY: number,
) {
  const section = layout.sections[sceneIndex];
  return stickyTop(section.top, section.height, layout.stageHeight, scrollY);
}

/** How visible a scene's words are: whole while it holds, fading out early in its slide and in late in the one before. */
export function panelOpacity(position: StoryPosition, sceneIndex: number) {
  const { sceneIndex: current, slide } = position;
  if (sceneIndex === current) return 1 - clamp(slide / 0.5);
  if (sceneIndex === current + 1) return clamp((slide - 0.45) / 0.5);
  return 0;
}

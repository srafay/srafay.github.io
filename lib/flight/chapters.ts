/*
  The words on the stage. Every chapter is in the page's HTML in reading order; once the flight runs they are stacked
  on the stage and only the one whose stop the camera holds at is shown (data-flight-shown, which the stylesheet
  fades). The others stay in the page for screen readers and stay focusable: when the keyboard moves into a hidden
  chapter, the page is scrolled to its stop so it shows.
*/
export class Chapters {
  private readonly chapters: HTMLElement[];
  private shown: number | null = null;

  constructor(
    private readonly stage: HTMLElement,
    private readonly scrollToChapter: (chapter: number) => void,
  ) {
    this.chapters = [
      ...stage.querySelectorAll<HTMLElement>("[data-flight-chapter]"),
    ].sort(
      (first, second) =>
        Number(first.dataset.flightChapter) -
        Number(second.dataset.flightChapter),
    );
    stage.addEventListener("focusin", (event) => {
      const chapter = this.chapterHolding(event.target);
      if (chapter !== null && chapter !== this.shown)
        this.scrollToChapter(chapter);
    });
  }

  private chapterHolding(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const chapter = target.closest<HTMLElement>("[data-flight-chapter]");
    return chapter ? Number(chapter.dataset.flightChapter) : null;
  }

  get current() {
    return this.shown;
  }

  /** Shows one chapter, or none while the camera is between stops. Returns whether anything changed. */
  show(chapter: number | null) {
    if (chapter === this.shown) return false;
    this.chapters.forEach((element, index) => {
      if (index === chapter) element.dataset.flightShown = "";
      else delete element.dataset.flightShown;
    });
    this.shown = chapter;
    // The stage's shade under the words follows whichever chapter shows (none on the first screen).
    if (chapter === null) delete this.stage.dataset.flightShowing;
    else this.stage.dataset.flightShowing = String(chapter);
    return true;
  }

  element(chapter: number) {
    return this.chapters[chapter];
  }
}

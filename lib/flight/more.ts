/*
  "More about" each place: a native <details>, so the keyboard and the page without its script get it for free.
  Once the flight runs, an open one is an overlay over the planet, which dims and holds still behind it: focus moves
  into it, and Escape or a tap anywhere outside it closes it and puts focus back on its button.
*/
export class MoreOverlays {
  private open: HTMLDetailsElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    stage: HTMLElement,
    private readonly onChange: (isOpen: boolean) => void,
  ) {
    for (const details of stage.querySelectorAll<HTMLDetailsElement>(
      "details[data-flight-more]",
    ))
      details.addEventListener("toggle", () => this.toggled(details));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.open) this.close(true);
    });
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (this.open && !this.open.contains(event.target as Node))
          this.close(this.open.contains(document.activeElement));
      },
      { passive: true },
    );
  }

  get isOpen() {
    return this.open !== null;
  }

  private toggled(details: HTMLDetailsElement) {
    if (details.open) {
      if (this.open && this.open !== details) this.open.open = false;
      this.open = details;
      this.root.dataset.flightMore = "open";
      details
        .querySelector<HTMLElement>("[data-flight-more-body]")
        ?.focus({ preventScroll: true });
      this.onChange(true);
      return;
    }
    if (this.open !== details) return;
    this.open = null;
    delete this.root.dataset.flightMore;
    this.onChange(false);
  }

  /** Closes the open overlay, and puts focus back on its button when focus was inside it. */
  close(returnFocus: boolean) {
    const details = this.open;
    if (!details) return;
    details.open = false;
    if (returnFocus)
      details.querySelector("summary")?.focus({ preventScroll: true });
  }
}

/*
  Where each section of the tour lies on the page. Measured only when something changes size (a ResizeObserver on the
  tour, and the fonts arriving), never while scrolling: on scroll the page's position alone says which field is under
  the top bar, under the bottom bar, behind the agent and in the middle of the screen.
*/
import type { FieldsBehind } from "@/lib/guide/agent/dither";
import { fieldColours, type SectionKey } from "@/lib/guide/palette";

type Span = { key: SectionKey; top: number; bottom: number };

export class Sections {
  private spans: Span[] = [];
  private readonly elements: HTMLElement[];
  onMeasured: () => void = () => {};

  constructor(tour: HTMLElement) {
    this.elements = [...tour.querySelectorAll<HTMLElement>("[data-section]")];
    const observer = new ResizeObserver(() => this.measure());
    observer.observe(tour);
    void document.fonts?.ready.then(() => this.measure());
    this.measure();
  }

  /** Reads every section's place in the document: once per change of size, never per frame. */
  measure() {
    const scrolled = window.scrollY;
    this.spans = this.elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { key: element.dataset.section as SectionKey, top: box.top + scrolled, bottom: box.bottom + scrolled };
    });
    this.onMeasured();
  }

  /** The section at a height in the document. */
  at(documentY: number): SectionKey {
    for (const span of this.spans) if (documentY < span.bottom) return span.key;
    return this.spans.at(-1)?.key ?? "hello";
  }

  /** Where a section starts in the document. */
  topOf(key: SectionKey) {
    return this.spans.find((span) => span.key === key)?.top ?? 0;
  }

  /**
   * The fields behind the agent's canvas. The canvas runs from bottom to top in stage space (CSS pixels up from the
   * screen's bottom). The field at its bottom edge is below; if a section edge crosses it, the field above that edge
   * is above, and the edge's height from the canvas's bottom is the line between them.
   */
  fieldsBehind(bottom: number, top: number, scrollY: number, viewportHeight: number): FieldsBehind {
    const documentAt = (stageY: number) => scrollY + viewportHeight - stageY;
    const lowest = documentAt(bottom);
    const highest = documentAt(top);
    const below = this.at(lowest);
    const edge = this.spans.find((span) => span.top > highest && span.top < lowest && span.key === below);
    if (!edge) return { below: fieldColours[below], above: fieldColours[below], lineFromBottom: 1e6 };
    const above = this.at(edge.top - 1);
    return { below: fieldColours[below], above: fieldColours[above], lineFromBottom: lowest - edge.top };
  }
}

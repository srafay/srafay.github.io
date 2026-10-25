/*
  What a reader does to choose what the page answers about. A chip is pressed. A role is pointed at with a mouse to
  preview it, or tapped or clicked to pin it (unless the click ended a text selection, so its words stay selectable).
  A ruler bar previews its role when pointed at or focused. A mouse click or Enter follows its link to the role and
  pins it. On a touch screen the first tap pins it, and a second tap on the pinned bar follows the link. Escape, or a
  tap outside Experience and Languages and tools, clears what is pinned.
*/
import { isPointingWithAMouse } from "./pointing";
import type { PageParts } from "./page-parts";
import type { Selection, Subject } from "./selection";

const roleSubject = (role: string): Subject => ({ kind: "role", role });

/** The last kind of pointer pressed anywhere, since a click event does not say in every engine. */
function lastPointerKind() {
  let kind = "mouse";
  addEventListener("pointerdown", (event) => (kind = event.pointerType), {
    capture: true,
    passive: true,
  });
  return () => kind;
}

const endedTextSelection = () => {
  const selected = getSelection();
  return !!selected && !selected.isCollapsed;
};

function watchChips(parts: PageParts, selection: Selection) {
  for (const chip of parts.chips)
    chip.addEventListener("click", () =>
      selection.togglePin({ kind: "skill", skill: chip.dataset.skill ?? "" }),
    );
}

function watchRoles(parts: PageParts, selection: Selection) {
  for (const role of parts.roles) {
    const subject = roleSubject(role.key);
    role.entry.addEventListener("pointerenter", (event) => {
      if (isPointingWithAMouse(event)) selection.preview(subject);
    });
    role.entry.addEventListener("pointerleave", (event) => {
      if (isPointingWithAMouse(event)) selection.endPreview(subject);
    });
    role.entry.addEventListener("click", () => {
      if (!endedTextSelection()) selection.togglePin(subject);
    });
  }
}

function watchRulerBars(
  parts: PageParts,
  selection: Selection,
  pointerKind: () => string,
) {
  for (const bar of parts.rulerBars) {
    const subject = roleSubject(bar.key);
    bar.link.addEventListener("pointerenter", (event) => {
      if (isPointingWithAMouse(event)) selection.preview(subject);
    });
    bar.link.addEventListener("pointerleave", (event) => {
      if (isPointingWithAMouse(event)) selection.endPreview(subject);
    });
    bar.link.addEventListener("focus", () => selection.preview(subject));
    bar.link.addEventListener("blur", () => selection.endPreview(subject));
    bar.link.addEventListener("click", (event) => {
      const isTouch = event.detail > 0 && pointerKind() !== "mouse";
      if (isTouch && !selection.isPinned(subject)) event.preventDefault();
      selection.pin(subject);
    });
  }
}

function watchForClearing(parts: PageParts, selection: Selection) {
  addEventListener("keydown", (event) => {
    if (event.key === "Escape") selection.clearPin();
  });
  const answeringAreas = [parts.experience, parts.skillsSection].filter(
    (area): area is HTMLElement => !!area,
  );
  addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as Node;
      if (!answeringAreas.some((area) => area.contains(target)))
        selection.clearPin();
    },
    { passive: true },
  );
}

export function watchSelectionControls(parts: PageParts, selection: Selection) {
  const pointerKind = lastPointerKind();
  watchChips(parts, selection);
  watchRoles(parts, selection);
  watchRulerBars(parts, selection, pointerKind);
  watchForClearing(parts, selection);
}

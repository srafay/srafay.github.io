/*
  What the page is answering about: a skill (a pressed chip) or a role (a role or its bar pointed at, focused or
  tapped). A press pins its answer until it is pressed again, Escape, or a tap elsewhere. Pointing at or focusing
  something shows its answer only while it lasts, over whatever is pinned, and puts the pinned one back after.
*/
export type Subject =
  { kind: "skill"; skill: string } | { kind: "role"; role: string };

export type SelectionChange = (
  shown: Subject | undefined,
  pinned: Subject | undefined,
) => void;

const sameSubject = (one?: Subject, other?: Subject) =>
  !!one &&
  !!other &&
  one.kind === other.kind &&
  (one.kind === "skill"
    ? one.skill === (other as typeof one).skill
    : one.role === (other as typeof one).role);

export function createSelection(onChange: SelectionChange) {
  let pinned: Subject | undefined;
  let previewed: Subject | undefined;
  const announce = () => onChange(previewed ?? pinned, pinned);

  return {
    pinned: () => pinned,
    isPinned: (subject: Subject) => sameSubject(pinned, subject),
    pin(subject: Subject) {
      pinned = subject;
      announce();
    },
    togglePin(subject: Subject) {
      pinned = sameSubject(pinned, subject) ? undefined : subject;
      announce();
    },
    clearPin() {
      if (!pinned) return;
      pinned = undefined;
      announce();
    },
    preview(subject: Subject) {
      if (sameSubject(previewed, subject)) return;
      previewed = subject;
      announce();
    },
    endPreview(subject: Subject) {
      if (!sameSubject(previewed, subject)) return;
      previewed = undefined;
      announce();
    },
  };
}

export type Selection = ReturnType<typeof createSelection>;

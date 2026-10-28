/*
  The five world lines, each a thread of the life. Each has a form of its own, so a reader can tell them apart
  without reading their names (scene/forms.ts draws them).
*/
export type WorldKey =
  "work" | "study" | "projects" | "courses" | "offTheClock";

export type World = {
  key: WorldKey;
  /** Its name, written at the near end of the line. */
  name: string;
  /** What the name means, for the lists and the keyboard layer. */
  description: string;
};

/** In reading order: the work first, then what it was built on, then what was around it. */
export const worlds: World[] = [
  {
    key: "work",
    name: "Work",
    description: "Every role, the internships too.",
  },
  {
    key: "study",
    name: "Study",
    description: "The two degrees and the Masters thesis.",
  },
  {
    key: "projects",
    name: "Projects",
    description:
      "The projects the CV names, with their code where it is public.",
  },
  {
    key: "courses",
    name: "Courses",
    description: "Courses and certifications, at their months.",
  },
  {
    key: "offTheClock",
    name: "Off the clock",
    description:
      "A game server, clubs, graphics, and what fills the evenings now.",
  },
];

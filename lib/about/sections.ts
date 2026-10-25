/*
  The About page's sections, in the order app/about/page.tsx shows them. Each section takes its id and heading from
  here. The two "On this page" lists link to them, so a heading and its link never disagree.
*/
export type PageSection = { id: string; label: string };

export const pageSections = {
  now: { id: "now", label: "Now" },
  pinned: { id: "pinned", label: "Pinned" },
  contributions: { id: "contributions", label: "Contributions" },
  experience: { id: "experience", label: "Experience" },
  education: { id: "education", label: "Education" },
  languagesAndTools: {
    id: "languages-and-tools",
    label: "Languages and tools",
  },
  elsewhere: { id: "elsewhere", label: "Elsewhere" },
} satisfies Record<string, PageSection>;

export const sectionsInPageOrder: PageSection[] = [
  pageSections.now,
  pageSections.pinned,
  pageSections.contributions,
  pageSections.experience,
  pageSections.education,
  pageSections.languagesAndTools,
  pageSections.elsewhere,
];

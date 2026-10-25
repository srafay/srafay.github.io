/*
  The parts of the About page the script answers with, found once. A role's months and skills are read from the
  attributes the timeline carries (lib/about/roles.ts), so the script never holds a second copy of profile.ts.
*/
import { readSkillList } from "@/lib/about/skill-list";

export type RoleOnPage = {
  key: string;
  shortName: string;
  started: string;
  ended?: string;
  skills: string[];
  /** The address of its place in the timeline, "#role-atelier". */
  anchor: string;
  entry: HTMLElement;
};

export type RulerBarOnPage = {
  key: string;
  link: HTMLAnchorElement;
  item: HTMLElement;
};

function readRole(entry: HTMLElement): RoleOnPage {
  const { role, shortName, started, ended, skills } = entry.dataset;
  return {
    key: role ?? "",
    shortName: shortName ?? "",
    started: started ?? "",
    ended,
    skills: readSkillList(skills),
    anchor: `#${entry.id}`,
    entry,
  };
}

export function findPageParts() {
  const experience = document.getElementById("experience");
  const roles = [
    ...(experience?.querySelectorAll<HTMLElement>(
      ".timeline > li[data-role]",
    ) ?? []),
  ].map(readRole);
  const ruler = document.querySelector<HTMLElement>("[data-ruler]");
  const rulerBars: RulerBarOnPage[] = [
    ...(ruler?.querySelectorAll<HTMLAnchorElement>("a[data-role]") ?? []),
  ].map((link) => ({
    key: link.dataset.role ?? "",
    link,
    item: link.parentElement as HTMLElement,
  }));
  const chips = [
    ...document.querySelectorAll<HTMLButtonElement>("button.chip[data-skill]"),
  ];
  const skillsSection = document.getElementById("languages-and-tools");
  return { experience, roles, ruler, rulerBars, chips, skillsSection };
}

export type PageParts = ReturnType<typeof findPageParts>;

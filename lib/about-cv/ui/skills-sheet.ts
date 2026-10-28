/*
  The skills sheet, as every version of the About page writes it: every skill in the CV's own groups, each a button
  with its mark or its group's glyph, and a filter ("Py" leaves Python, PyCharm, Pytest and the rest). A version gives
  its class prefix and what a pick does. Opening and closing the sheet stay with the version, since where the focus
  goes differs.
*/
import { currentRoleSkills, cvSkillGroups } from "@/content/about/profile";
import { glyphOfSkill } from "@/lib/about-cv/glyphs";
import { controlGlyphs, glyphElement, linkGlyphs, type Glyph } from "@/lib/about-cv/icons";
import { element } from "@/lib/about-cv/scene/dom";
import { CURRENT_ROLE_GROUP, wordsOf, type SkillWord } from "@/lib/about-cv/skills";
import { site } from "@/lib/site";

export type SkillsSheetOptions = {
  prefix: string;
  skills: SkillWord[];
  onPick(skill: SkillWord): void;
  onClose(): void;
};

/** "Py" leaves Python, PyCharm, Pytest and the rest. A group with nothing left hides. */
function applyFilter(prefix: string, filter: HTMLInputElement, groups: HTMLElement) {
  const wanted = filter.value.trim().toLowerCase();
  const skillAttribute = `data-${prefix}-skill`;
  for (const block of groups.querySelectorAll<HTMLElement>(`.${prefix}-sheet-group`)) {
    let any = false;
    for (const button of block.querySelectorAll<HTMLElement>(`[${skillAttribute}]`)) {
      const shows = !wanted || (button.getAttribute(skillAttribute) ?? "").toLowerCase().includes(wanted);
      (button.parentElement as HTMLElement).hidden = !shows;
      any ||= shows;
    }
    block.hidden = !any;
  }
}

/** Fills a sheet and its filter with every skill, grouped as the CV groups them. */
export function buildSkillsSheet(sheet: HTMLElement, filter: HTMLInputElement, options: SkillsSheetOptions) {
  const { prefix } = options;
  sheet.hidden = true;
  sheet.setAttribute(`data-${prefix}-control`, "");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Skills");
  sheet.tabIndex = -1;
  const heading = element("h2", undefined, "Skills");
  const close = element("button", `${prefix}-close`);
  close.type = "button";
  close.setAttribute("aria-label", "Close the skills");
  close.append(glyphElement(controlGlyphs.close, `${prefix}-icon`));
  close.addEventListener("click", options.onClose);
  const filterLabel = element("label", `${prefix}-filter-label`);
  filterLabel.append(
    glyphElement(controlGlyphs.search, `${prefix}-icon`),
    element("span", `${prefix}-hidden`, "Filter the skills"),
  );
  filter.type = "search";
  filter.placeholder = "Filter, for example Py";
  filter.autocomplete = "off";
  filter.spellcheck = false;
  filterLabel.append(filter);
  const groups = element("div", `${prefix}-sheet-groups`);
  const groupNames = [...cvSkillGroups.map((group) => group.name), CURRENT_ROLE_GROUP];
  for (const name of groupNames) {
    const words =
      name === CURRENT_ROLE_GROUP
        ? currentRoleSkills
        : (cvSkillGroups.find((group) => group.name === name)?.skills.flatMap(wordsOf) ?? []);
    const own = options.skills.filter((skill) => skill.group === name && words.includes(skill.word));
    if (!own.length) continue;
    const block = element("section", `${prefix}-sheet-group`);
    block.append(element("h3", undefined, name));
    const list = element("ul");
    for (const skill of own) {
      const item = element("li");
      const button = element("button", `${prefix}-skill-button`);
      button.type = "button";
      button.setAttribute(`data-${prefix}-skill`, skill.word);
      button.append(glyphElement(glyphOfSkill(skill), `${prefix}-icon`), element("span", undefined, skill.word));
      button.addEventListener("click", () => options.onPick(skill));
      item.append(button);
      list.append(item);
    }
    block.append(list);
    groups.append(block);
  }
  filter.addEventListener("input", () => applyFilter(prefix, filter, groups));
  sheet.append(close, heading, filterLabel, groups);
}

/** The profiles under Find me, each by name, with its mark where Simple Icons has one. */
export function findMeList(prefix: string) {
  const list = element("ul");
  for (const link of site.links) {
    const item = element("li");
    const anchor = element("a", `${prefix}-find-link`);
    anchor.href = link.href;
    anchor.rel = "me";
    const glyph = linkGlyphs[link.label] as Glyph | undefined;
    anchor.append(
      glyph ? glyphElement(glyph, `${prefix}-icon`) : element("span", `${prefix}-icon`),
      element("span", undefined, link.label),
    );
    item.append(anchor);
    list.append(item);
  }
  return list;
}

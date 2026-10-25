/*
  How a role's skills are written into one attribute on the About page and read back by its script. Skills hold
  spaces and dots ("Tool calling", ".NET") but never a comma.
*/
const SKILL_SEPARATOR = ",";

export const writeSkillList = (skills: string[]) =>
  skills.join(SKILL_SEPARATOR);

export const readSkillList = (written: string | undefined) =>
  written ? written.split(SKILL_SEPARATOR) : [];

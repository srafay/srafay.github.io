/*
  Which roles in Experience used each skill on the Languages and tools chips, from the skills each role lists in
  profile.ts. A chip with no role behind it cannot answer a press, so the page draws it as a plain word.
*/
import { experience } from "@/content/about/profile";

export const rolesUsing = (skill: string) =>
  experience.filter((role) => role.skills.includes(skill));

export const chipAnswers = (skill: string) => rolesUsing(skill).length > 0;

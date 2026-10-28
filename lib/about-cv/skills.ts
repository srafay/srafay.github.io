/*
  The skills as the scene floats them. Each distinct word floats once, in the group the CV first lists it under. Its
  threads run to the events whose own CV lines name it. A word no event names floats untethered.
*/
import {
  currentRoleSkills,
  cvSkillGroups,
  type CvSkill,
} from "@/content/about/profile";
import type { WorldEvent } from "@/lib/about-cv/events";

export type SkillWord = {
  word: string;
  /** The CV group it floats with. */
  group: string;
  /** The ids of the events that name it, oldest first. */
  events: string[];
};

/** The group the scene floats the current role's extra words with. */
export const CURRENT_ROLE_GROUP = "Named for the current role";

/** The words a CV item stands for: itself, or the words its brackets hold. */
export const wordsOf = (skill: CvSkill) =>
  typeof skill === "string" ? [skill] : skill.words;

/** The item as the CV writes it. */
export const asWritten = (skill: CvSkill) =>
  typeof skill === "string" ? skill : skill.asWritten;

/** Every distinct word with its first group, in the CV's order, then the current role's two. */
function distinctWords() {
  const groupOfWord = new Map<string, string>();
  for (const group of cvSkillGroups)
    for (const skill of group.skills)
      for (const word of wordsOf(skill))
        if (!groupOfWord.has(word)) groupOfWord.set(word, group.name);
  for (const word of currentRoleSkills)
    if (!groupOfWord.has(word)) groupOfWord.set(word, CURRENT_ROLE_GROUP);
  return groupOfWord;
}

export function skillWords(events: WorldEvent[]): SkillWord[] {
  const oldestFirst = [...events].sort(
    (first, second) => first.start - second.start,
  );
  return [...distinctWords()].map(([word, group]) => ({
    word,
    group,
    events: oldestFirst
      .filter((event) => event.skills.includes(word))
      .map((event) => event.id),
  }));
}

/** Every word an event names must float somewhere, or its thread would lead nowhere. Throws on the first that does not. */
export function checkThreads(events: WorldEvent[]) {
  const floating = distinctWords();
  for (const event of events)
    for (const word of event.skills)
      if (!floating.has(word))
        throw new Error(
          `${event.label} names "${word}", which no skill group lists`,
        );
}

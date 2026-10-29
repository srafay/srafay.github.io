/*
  The skills the ride collects as it goes. At each stop, the skills its event names that have not been collected yet
  are collected, in the order the event names them, and the ones collected before are met again. The skills no event
  names are listed only in the CV's groups, so they arrive together at the end, the finale. The board lays every skill
  out in the CV's own order: its groups in turn, each group's skills as the CV lists them.

  Pure: no page, no scene.
*/
import type { SkillWord } from "@/lib/about-cv/skills";
import type { RideStop } from "./ride";

/** What one stop of the ride does to the collection: what it adds and what it meets again. */
export type StopCollection = { added: SkillWord[]; metAgain: SkillWord[] };

export type CollectionPlan = {
  /** One entry per stop, in the ride's order. */
  stops: StopCollection[];
  /** The skills no event names, in board order: they arrive at the finale. */
  finale: SkillWord[];
};

/** Plans the collection along the ride's stops. */
export function collectionPlan(stops: RideStop[], skills: SkillWord[]): CollectionPlan {
  const byWord = new Map(skills.map((skill) => [skill.word, skill]));
  const collected = new Set<SkillWord>();
  const plan = stops.map((stop) => {
    const named = stop.event.skills.map((word) => byWord.get(word)).filter((skill): skill is SkillWord => skill !== undefined);
    const added = named.filter((skill) => !collected.has(skill));
    const metAgain = named.filter((skill) => collected.has(skill));
    for (const skill of added) collected.add(skill);
    return { added, metAgain };
  });
  return { stops: plan, finale: boardOrder(skills).filter((skill) => !collected.has(skill)) };
}

/** The board's groups in the CV's order, each with its skills in the CV's order. */
export function boardGroups(skills: SkillWord[]) {
  const groups = new Map<string, SkillWord[]>();
  for (const skill of skills) groups.set(skill.group, [...(groups.get(skill.group) ?? []), skill]);
  return [...groups].map(([name, members]) => ({ name, skills: members }));
}

/** Every skill in board order. */
export const boardOrder = (skills: SkillWord[]) => boardGroups(skills).flatMap((group) => group.skills);

/** How many skills the ride has collected after a stop, by its place in the ride (-1 before the first). */
export function collectedAfter(plan: CollectionPlan, stop: number) {
  return plan.stops.slice(0, stop + 1).reduce((count, entry) => count + entry.added.length, 0);
}

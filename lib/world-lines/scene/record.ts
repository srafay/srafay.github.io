/*
  The whole CV in words, under the stage: every role, degree, project, course, activity, place and skill group. Each
  line lists its items in the order the travel meets them. It is the reading version of the scene, and what a screen reader
  reads. Built from the same data as the scene, so the two can never disagree. It follows the visitor's theme.
*/
import {
  currentRoleSkills,
  cvSkillGroups,
  stays,
} from "@/content/about/profile";
import { cardMeta } from "@/lib/world-lines/answers";
import type { WorldEvent } from "@/lib/world-lines/events";
import { asWritten, CURRENT_ROLE_GROUP } from "@/lib/world-lines/skills";
import { monthsInWords } from "@/lib/world-lines/time";
import { element } from "./dom";
import { worlds, type WorldKey } from "@/lib/world-lines/worlds";

/** Within a line, newest first, the way the travel meets them. Undated items sit where the scene places them. */
const inTravelOrder = (events: WorldEvent[]) =>
  [...events].sort(
    (first, second) =>
      (second.end ?? second.start) - (first.end ?? first.start),
  );

/** The heading of an item: a role by its organisation, everything else by its own name. */
const headingOf = (event: WorldEvent) =>
  event.world === "work" && event.subtitle ? event.subtitle : event.title;

function item(event: WorldEvent) {
  const entry = element("li", "lines-item");
  entry.dataset.linesEvent = event.id;
  entry.append(element("h3", undefined, headingOf(event)));
  const second = event.world === "work" ? event.title : event.subtitle;
  const meta = [second, cardMeta(event)].filter(Boolean).join(". ");
  entry.append(element("p", "lines-item-meta", meta));
  for (const line of event.lines) entry.append(element("p", undefined, line));
  if (event.evidence)
    entry.append(element("p", "lines-item-meta", event.evidence));
  if (
    event.world === "study" &&
    event.id.startsWith("study-") &&
    event.subtitle === "Masters thesis"
  )
    entry.append(
      element(
        "p",
        "lines-item-meta",
        "One of the CV's projects, drawn on the Study line with the Masters.",
      ),
    );
  if (event.address) {
    const paragraph = element("p");
    const link = element("a", undefined, "The code on GitHub");
    link.href = event.address;
    link.rel = "noopener";
    paragraph.append(link);
    entry.append(paragraph);
  }
  return entry;
}

function worldSection(world: (typeof worlds)[number], events: WorldEvent[]) {
  const section = element("section");
  section.setAttribute("aria-labelledby", `lines-record-${world.key}`);
  const heading = element("h2", undefined, world.name);
  heading.id = `lines-record-${world.key}`;
  const list = element("ol");
  for (const event of inTravelOrder(events)) list.append(item(event));
  section.append(
    heading,
    element("p", "lines-world-note", world.description),
    list,
  );
  return section;
}

/** The CV's projects: the fourteen on the Projects line and the thesis, which the scene draws on the Study line. */
const projectsOf = (events: WorldEvent[]) =>
  events.filter(
    (event) =>
      event.world === "projects" || event.subtitle === "Masters thesis",
  );

const studyOf = (events: WorldEvent[]) =>
  events.filter(
    (event) => event.world === "study" && event.subtitle !== "Masters thesis",
  );

function eventsFor(world: WorldKey, events: WorldEvent[]) {
  if (world === "projects") return projectsOf(events);
  if (world === "study") return studyOf(events);
  return events.filter((event) => event.world === world);
}

function placesSection() {
  const section = element("section");
  section.setAttribute("aria-labelledby", "lines-record-places");
  const heading = element("h2", undefined, "Places");
  heading.id = "lines-record-places";
  const list = element("ol");
  for (const stay of [...stays].reverse()) {
    const entry = element("li", "lines-item");
    entry.dataset.linesPlace = stay.city;
    entry.append(element("h3", undefined, stay.city));
    entry.append(
      element(
        "p",
        "lines-item-meta",
        monthsInWords(stay.from, stay.to, !stay.to),
      ),
    );
    list.append(entry);
  }
  section.append(
    heading,
    element(
      "p",
      "lines-world-note",
      "The floor of the scene: where the work was.",
    ),
    list,
  );
  return section;
}

function skillsSection() {
  const section = element("section");
  section.setAttribute("aria-labelledby", "lines-record-skills");
  const heading = element("h2", undefined, "Skills");
  heading.id = "lines-record-skills";
  section.append(
    heading,
    element(
      "p",
      "lines-world-note",
      "Every group and item as the CV lists them.",
    ),
  );
  for (const group of cvSkillGroups) {
    const block = element("div", "lines-group");
    block.dataset.linesGroup = group.name;
    block.append(element("h3", undefined, group.name));
    const words = element("p");
    words.textContent = group.skills.map(asWritten).join(", ");
    words.dataset.linesItems = String(group.skills.length);
    block.append(words);
    section.append(block);
  }
  const extra = element("div", "lines-group");
  extra.dataset.linesGroup = CURRENT_ROLE_GROUP;
  extra.append(element("h3", undefined, CURRENT_ROLE_GROUP));
  extra.append(
    element(
      "p",
      undefined,
      `${currentRoleSkills.join(" and ")}, from the current role's own description.`,
    ),
  );
  section.append(extra);
  return section;
}

export function renderRecord(record: HTMLElement, events: WorldEvent[]) {
  const inner = element("div", "lines-record-inner");
  inner.append(
    element(
      "p",
      "lines-world-note",
      "Everything in the scene above, in words, newest first.",
    ),
    ...worlds.map((world) => worldSection(world, eventsFor(world.key, events))),
    placesSection(),
    skillsSection(),
  );
  record.replaceChildren(inner);
}

/*
  Every item of the CV as an event on its world line. Each says when it sits in time, what its label says, and what
  its card says when opened. Built from content/about/profile.ts alone, so the scene and the lists never disagree.
*/
import {
  activities,
  courses,
  currentRole,
  education,
  experience,
  internships,
  pastimes,
  projects,
  skillsNamedBy,
  type Course,
  type Degree,
  type Project,
  type Role,
} from "@/content/about/profile";
import {
  monthsInWords,
  timeAtEndOf,
  timeAtStartOf,
  middleOfYear,
  yearsInWords,
} from "@/lib/about-cv/time";
import {
  aiClubPlace,
  greenSocietyPlace,
  ieeeGraphicsPlace,
  loveForDataPlace,
  mediaIconPlace,
  placedByRepository,
  researchCentrePlace,
  serverAdministrationPlace,
  universitySystemPlace,
  type UndatedPlace,
} from "@/lib/about-cv/undated-places";
import type { WorldKey } from "@/lib/about-cv/worlds";

/** What kind of thing an event is. */
export type EventKind =
  | "role"
  | "internship"
  | "degree"
  | "thesis"
  | "project"
  | "course"
  | "activity"
  | "pastime";

export type WorldEvent = {
  /** Unique, stable, safe in an address. */
  id: string;
  world: WorldKey;
  /** What kind of thing it is, for its glyph. */
  kind: EventKind;
  /** The short label beside its mark in the scene. */
  label: string;
  /** The card's heading. */
  title: string;
  /** The organisation, school or provider. */
  subtitle?: string;
  /** When it starts, as a decimal year. */
  start: number;
  /** When it ends, for a span. Left out for a point. */
  end?: number;
  /** The dates in words, or "Undated in the CV". */
  dates: string;
  place?: string;
  /** The card's sentences. */
  lines: string[];
  /** The project's code, where the CV links it. */
  address?: string;
  /** Set where the CV gives no date: why the event sits where it does. */
  evidence?: string;
  /** The skills its CV line names, in the scene's words. */
  skills: string[];
  /** The current role: the brightest point. */
  isPresent?: boolean;
};

export const UNDATED = "Undated in the CV";

/** "Media Research & Innovations" as "media-research-innovations". */
const slug = (words: string) =>
  words
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const skillsOf = (shortName: string) => skillsNamedBy[shortName] ?? [];

const isCurrent = (role: Role) => !role.ended;

function roleEvent(role: Role, present: number): WorldEvent {
  return {
    id: `work-${slug(role.shortName)}`,
    world: "work",
    kind: "role",
    label: role.shortName,
    title: role.title,
    subtitle: role.organisation,
    start: timeAtStartOf(role.started),
    end: role.ended ? timeAtEndOf(role.ended) : present,
    dates: monthsInWords(role.started, role.ended, isCurrent(role)),
    place: role.place ?? (isCurrent(role) ? "Sydney" : undefined),
    lines: isCurrent(role) ? [currentRole.description] : [role.summary],
    skills: skillsOf(role.shortName),
    isPresent: isCurrent(role),
  };
}

const INTERNSHIP_PLACES: Record<string, UndatedPlace> = {
  "Love For Data": loveForDataPlace,
  RCAI: researchCentrePlace,
};

function internshipEvents(): WorldEvent[] {
  return internships.map((internship) => {
    const place = INTERNSHIP_PLACES[internship.shortName];
    return {
      id: `work-${slug(internship.shortName)}`,
      world: "work",
      kind: "internship",
      label: internship.shortName,
      title: internship.title,
      subtitle: internship.organisation,
      start: place.time,
      dates: UNDATED,
      lines: internship.lines,
      evidence: place.evidence,
      skills: skillsOf(internship.shortName),
    };
  });
}

/** A degree as a long plank: from the start of its first year to the middle of its last (the CV gives years only). */
const degreeEnd = (degree: Degree) => middleOfYear(degree.endedYear);

/** "NED University of Engineering & Technology" as "NED University", short enough to sit beside its plank. */
const schoolLabel = (degree: Degree) =>
  degree.school.replace(" of Engineering & Technology", "");

/** NED is in Karachi and Charles Darwin University in Darwin. */
const cityOfDegree = (degree: Degree) =>
  degree.school.startsWith("NED") ? "Karachi" : "Darwin";

function degreeEvent(degree: Degree): WorldEvent {
  return {
    id: `study-${slug(degree.school)}`,
    world: "study",
    kind: "degree",
    label: schoolLabel(degree),
    title: degree.title,
    subtitle: degree.school,
    start: degree.startedYear,
    end: degreeEnd(degree),
    dates: yearsInWords(degree.startedYear, degree.endedYear),
    place: cityOfDegree(degree),
    lines: [],
    skills: [],
  };
}

const isThesis = (project: Project) => project.context === "Masters thesis";

/** Where a project without a year sits, by the clue it has. */
function undatedProjectPlace(project: Project): UndatedPlace {
  if (project.repositoryYear) return placedByRepository(project.repositoryYear);
  if (project.shortName === "Media Icon") return mediaIconPlace;
  return universitySystemPlace;
}

function projectEvent(project: Project): WorldEvent {
  const undated = project.year === undefined;
  const place = undated ? undatedProjectPlace(project) : undefined;
  return {
    id: `${isThesis(project) ? "study" : "projects"}-${slug(project.shortName)}`,
    // The thesis is one of the CV's projects, drawn on the Study line with the Masters it was written for.
    world: isThesis(project) ? "study" : "projects",
    kind: isThesis(project) ? "thesis" : "project",
    label: project.shortName,
    title: project.name,
    subtitle: project.context,
    start: place ? place.time : middleOfYear(project.year as number),
    dates: undated ? UNDATED : String(project.year),
    lines: project.lines,
    address: project.address,
    evidence: place?.evidence,
    skills: skillsOf(project.shortName),
  };
}

function courseEvent(course: Course): WorldEvent {
  return {
    id: `courses-${slug(course.shortName)}`,
    world: "courses",
    kind: "course",
    label: course.shortName,
    title: course.name,
    subtitle: course.provider,
    start: timeAtStartOf(course.started),
    end: timeAtEndOf(course.ended ?? course.started),
    dates: monthsInWords(course.started, course.ended),
    lines: [],
    skills: skillsOf(course.shortName),
  };
}

const ACTIVITY_PLACES: Record<string, UndatedPlace> = {
  "GTA San Andreas server": serverAdministrationPlace,
  "AI club": aiClubPlace,
  "Green Society graphics": greenSocietyPlace,
  "IEEE graphics": ieeeGraphicsPlace,
};

function activityEvents(): WorldEvent[] {
  return activities.map((activity) => {
    const place = ACTIVITY_PLACES[activity.shortName];
    return {
      id: `off-${slug(activity.shortName)}`,
      world: "offTheClock",
      kind: "activity",
      label: activity.shortName,
      title: activity.role,
      subtitle: activity.organisation,
      start: place.time,
      dates: UNDATED,
      lines: activity.lines,
      evidence: place.evidence,
      skills: skillsOf(activity.shortName),
    };
  });
}

/** Cricket, Dota 2 and Python sit at now: the GitHub profile speaks of them in the present tense. */
function pastimeEvents(present: number): WorldEvent[] {
  return pastimes.map((pastime, index) => ({
    id: `off-${slug(pastime.name)}`,
    world: "offTheClock",
    kind: "pastime",
    label: pastime.name,
    title: pastime.name,
    subtitle: "From the GitHub profile",
    // A little apart, so the three labels do not sit on top of one another.
    start: present - 0.12 - index * 0.28,
    dates: "Now",
    lines: [pastime.line],
    skills: [],
  }));
}

/** Every event, each world in the order the CV lists it. */
export function allEvents(present: number): WorldEvent[] {
  return spreadSharedMoments([
    ...experience.map((role) => roleEvent(role, present)),
    ...internshipEvents(),
    ...education.map(degreeEvent),
    ...projects.map(projectEvent),
    ...courses.map(courseEvent),
    ...activityEvents(),
    ...pastimeEvents(present),
  ]);
}

/** How far apart events that share a moment on one line are drawn, in years: about eleven days. */
const SHARED_MOMENT_SPREAD = 0.03;

/**
 * Events on one line at the same moment would share one bead, and a tap could reach only one. Three Anthropic
 * courses share May 2026, and three repositories share 2016. Each after the first moves a few days later, still
 * inside its month, so each has a bead of its own.
 */
function spreadSharedMoments(events: WorldEvent[]) {
  const taken = new Set<string>();
  const momentOf = (event: WorldEvent, shift: number) =>
    `${event.world} ${((event.end ?? event.start) + shift).toFixed(3)}`;
  return events.map((event) => {
    let shift = 0;
    while (taken.has(momentOf(event, shift))) shift += SHARED_MOMENT_SPREAD;
    taken.add(momentOf(event, shift));
    if (shift === 0) return event;
    return {
      ...event,
      start: event.start + shift,
      end: event.end === undefined ? undefined : event.end + shift,
    };
  });
}

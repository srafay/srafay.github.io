/*
  The About page's words and numbers. app/about/page.tsx draws them, so a change here needs no change there.
  Sources: the owner's CV, the owner's own words for the current role (25 October 2026), and GitHub's figures for the
  pinned repositories. The contribution calendar is in contributions.json, beside this file.
*/

/** A month, written as "2025-09". */
export type Month = `${number}-${number}`;

export type Role = {
  title: string;
  organisation: string;
  started: Month;
  /** Left out while the role is current. */
  ended?: Month;
  /** Left out where the CV names no place. */
  place?: string;
  /** One line about the work, not a list of duties. */
  summary: string;
};

export type Degree = {
  title: string;
  school: string;
  startedYear: number;
  endedYear: number;
};

/** A repository as GitHub's pinned list shows it. */
export type Repository = {
  name: string;
  address: string;
  description: string;
  /** GitHub's main language for it, with GitHub's colour for that language. Left out where GitHub names none. */
  language?: { name: string; colour: string };
  stars: number;
  forks: number;
};

export type SkillGroup = { name: string; skills: string[] };

export const handle = "srafay";

/** The GitHub avatar, linked from GitHub rather than kept in the site. */
export const avatar = {
  address: "https://avatars.githubusercontent.com/u/16633972?v=4&s=240",
  pixels: 240,
};

export const bio =
  "I build cloud backends, AI tools and the screens in front of them.";

export const location = "Sydney, Australia";

/** The opening lines, first person. */
export const introduction = [
  "Since August 2026 I have been a senior software engineer at Twin Technology. I work closely with the Chief AI & Intelligence Officer on .NET, Blazor and Azure, building the next generation of an AI platform.",
  "Before that I spent more than seven years on AWS serverless backends, applied AI and full-stack apps. Those years ran from Foree Pay in Karachi, through the Northern Land Council and AIMS in Darwin, to CommBank and Atelier in Sydney.",
];

/** From the GitHub profile's own README. */
export const personalNote =
  "Ask me about distributed systems, pragmatic infrastructure as code, cricket, or Python (the language, not the reptile). When I am not shipping code, you can find me in a Dota 2 lobby.";

/** The owner's own words for the role, 25 October 2026. */
export const currentRole = {
  title: "Senior Software Engineer",
  organisation: "Twin Technology Pty Ltd",
  started: "2026-08",
  description:
    "Working closely with the Chief AI & Intelligence Officer on .NET, Blazor and Azure, creating the next generation of an AI platform.",
} as const satisfies Omit<Role, "summary"> & { description: string };

/** Newest first. */
export const experience: Role[] = [
  {
    title: currentRole.title,
    organisation: currentRole.organisation,
    started: currentRole.started,
    summary:
      "The next generation of an AI platform, on .NET, Blazor and Azure.",
  },
  {
    title: "Senior Software Engineer",
    organisation: "Atelier",
    started: "2025-09",
    ended: "2026-06",
    place: "Sydney",
    summary:
      "Serverless backends on AWS, and a multi-agent AI assistant built with LangChain and LangGraph.",
  },
  {
    title: "Senior Software Engineer",
    organisation: "Commonwealth Bank of Australia",
    started: "2025-06",
    ended: "2025-09",
    place: "Sydney",
    summary:
      "Full-stack tools that automate banking work, tested with Pytest, Vitest and Playwright.",
  },
  {
    title: "Senior Software Engineer",
    organisation: "Australian Institute of Marine Science",
    started: "2022-11",
    ended: "2025-05",
    place: "Remote and Darwin",
    summary:
      "ReefCloud and new science apps, with Python and Java APIs on AWS serverless.",
  },
  {
    title: "Software Developer",
    organisation: "Northern Land Council",
    started: "2021-12",
    ended: "2022-11",
    place: "Darwin",
    summary:
      "Web apps and REST APIs in C# on .NET Core, with Blazor and SQL Server.",
  },
  {
    title: "Software Engineer",
    organisation: "Foree Pay",
    started: "2018-10",
    ended: "2020-02",
    place: "Karachi, Pakistan",
    summary:
      "Python payment APIs for web, Android and iOS apps, built to PCI-DSS.",
  },
  {
    title: "Software Engineering Intern",
    organisation: "Media Research & Innovations",
    started: "2018-02",
    ended: "2018-09",
    place: "Remote",
    summary:
      "The Android app and Flask APIs for a broadcast monitoring startup.",
  },
];

/** Newest first, as the CV names them. */
export const education: Degree[] = [
  {
    title: "Masters of IT (Software Engineering)",
    school: "Charles Darwin University",
    startedYear: 2020,
    endedYear: 2021,
  },
  {
    title: "Bachelor of Engineering, Computer & Information Systems",
    school: "NED University of Engineering & Technology",
    startedYear: 2014,
    endedYear: 2018,
  },
];

/** The day the repositories' stars and forks were read from GitHub. */
export const repositoriesReadOn = "2026-10-25";

/*
  Six of the 44 public repositories: the two with the most stars, two of the CV's projects that people starred, this
  site, and the newest. GitHub's own pinned six on 25 October 2026 were Hadoop-hands-on, Machine_Learning_A-Z,
  Shinra-Tensei, SAMP-Server, aarh and AIC-Webpage.
*/
export const pinnedRepositories: Repository[] = [
  {
    name: "Machine_Learning_A-Z",
    address: "https://github.com/srafay/Machine_Learning_A-Z",
    description: "Learning to create Machine Learning Algorithms",
    language: { name: "Python", colour: "#3572A5" },
    stars: 399,
    forks: 197,
  },
  {
    name: "Hadoop-hands-on",
    address: "https://github.com/srafay/Hadoop-hands-on",
    description:
      "Learning how to tame the Big Data with Hadoop and related technologies",
    language: { name: "PigLatin", colour: "#fcd7de" },
    stars: 23,
    forks: 21,
  },
  {
    name: "Signature-Recognition",
    address: "https://github.com/srafay/Signature-Recognition",
    description:
      "Recognizing handwritten signatures of individuals accurately considering that they might be forged",
    language: { name: "Python", colour: "#3572A5" },
    stars: 5,
    forks: 0,
  },
  {
    name: "Time-Series-Analysis-JetRail",
    address: "https://github.com/srafay/Time-Series-Analysis-JetRail",
    description: "Time series model predicting monthly users and some analysis",
    language: { name: "Python", colour: "#3572A5" },
    stars: 3,
    forks: 8,
  },
  {
    name: "srafay.github.io",
    address: "https://github.com/srafay/srafay.github.io",
    // GitHub shows no description for this one.
    description: "The code behind this site.",
    language: { name: "HTML", colour: "#e34c26" },
    stars: 1,
    forks: 0,
  },
  {
    name: "windows-to-mac",
    address: "https://github.com/srafay/windows-to-mac",
    description:
      "Karabiner-Elements + VS Code/Cursor keybindings for Windows/PC-style shortcuts on macOS",
    stars: 0,
    forks: 0,
  },
];

/** A few groups from the CV, not the whole list. */
export const skillGroups: SkillGroup[] = [
  { name: "Now", skills: ["C#", ".NET", "Blazor", "Azure"] },
  {
    name: "Cloud",
    skills: [
      "AWS Lambda",
      "AppSync",
      "Aurora",
      "DynamoDB",
      "OpenSearch",
      "CDK",
      "SAM",
    ],
  },
  { name: "Languages", skills: ["Python", "TypeScript", "Java", "SQL"] },
  {
    name: "Front end",
    skills: ["React", "Next.js", "Angular", "Tailwind CSS"],
  },
  {
    name: "AI",
    skills: ["LangChain", "LangGraph", "RAG", "Agents", "Tool calling"],
  },
];

/** What each of the site's profiles (lib/site.ts) holds, by its label there. */
export const profilePurposes: Record<string, string> = {
  GitHub: "Code, this site included.",
  LinkedIn: "Work history.",
  "Stack Overflow": "Questions and answers.",
};

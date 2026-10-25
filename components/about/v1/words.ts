/*
  The words of version 1, the magazine profile. Facts come from content/about/profile.ts and the owner's CV; dates
  are never written here but read from the roles, so a corrected month there corrects every line that shows it.
  The deck speaks about him, as an editor would. The article speaks as him, in the first person.
*/

export const deck =
  "An engineer in Sydney who builds cloud backends, AI tools and the screens in front of them.";

/** "Now": what the current role is, then the thread back to the story below it. */
export const nowParagraphs = [
  "At Twin Technology I work closely with the Chief AI & Intelligence Officer on .NET, Blazor and Azure. The job is building the next generation of an AI platform.",
  "It brings me back to .NET and Blazor, which I used at the Northern Land Council in Darwin.",
];

/**
 * A part of the story: the roles it covers (by their organisation, as profile.ts names them), the place written in
 * its margin, and its words. Its years in the margin are worked out from those roles.
 */
export type Chapter = {
  organisations: string[];
  place: string;
  paragraph: string;
};

/** Oldest first: the story runs from Karachi to Sydney and ends where "Now" began. */
export const chapters: Chapter[] = [
  {
    organisations: ["Media Research & Innovations", "Foree Pay"],
    place: "Karachi",
    paragraph:
      "In 2018 I was an intern at Media Research & Innovations, a startup that monitored broadcasts. I built its core Android app and the Flask APIs behind it, working remotely. Then I joined Foree Pay in Karachi. I wrote Python payment APIs for its web, Android and iOS apps, built to the PCI-DSS security standard.",
  },
  {
    organisations: ["Northern Land Council"],
    place: "Darwin",
    paragraph:
      "After a Masters at Charles Darwin University, I joined the Northern Land Council in Darwin. I built web apps and REST APIs in C# on .NET Core, with Blazor and SQL Server.",
  },
  {
    organisations: ["Australian Institute of Marine Science"],
    place: "Remote and Darwin",
    paragraph:
      "At the Australian Institute of Marine Science I worked on ReefCloud and new science apps. Their APIs were Python and Java, on AWS serverless. I also moved services from Java 8 to Java 21.",
  },
  {
    organisations: ["Commonwealth Bank of Australia", "Atelier"],
    place: "Sydney",
    paragraph:
      "In Sydney I worked at CommBank first, building full-stack tools that automate banking work. Then came Atelier, where I worked closely with the Head of Technology on serverless backends on AWS. I built a multi-agent AI assistant with LangChain and LangGraph. I also built image search on AWS OpenSearch: a photo of packaging finds others that look like it.",
  },
];

/** A sentence after each degree, where there is something to say. Keyed by the school, as profile.ts names it. */
export const degreeNotes: Record<string, string> = {
  "Charles Darwin University":
    "My thesis taught neural networks to find threats in airport X-ray images.",
};

/** Where each of the site's profiles (lib/site.ts) is, said as the start of a sentence that ends with its link. */
export const profileSentences: Record<
  string,
  { before: string; after?: string }
> = {
  GitHub: { before: "My code is on", after: ", this site included." },
  LinkedIn: { before: "My work history is on" },
  "Stack Overflow": { before: "My questions and answers are on" },
};

/*
  Version 3's words: one line under the name, then a chapter for each city the camera stops at, and the life off the
  clock as it pulls back out. Every fact is from the owner's CV or content/about/profile.ts (which also holds the
  cities' places the camera flies to). Each chapter shows two or three lines on the stage and keeps two or three more
  one tap away.
*/
export type Chapter = {
  /** The city, as content/about/profile.ts names it. */
  place: string;
  arrived: number;
  /** Left out for the city the story is in now. */
  left?: number;
  /** On the stage. */
  lines: string[];
  /** One tap away. */
  more: string[];
};

export const heroLine =
  "Senior software engineer. Karachi, then Darwin, now Sydney.";

export const chapters: Chapter[] = [
  {
    place: "Karachi",
    arrived: 2014,
    left: 2020,
    lines: [
      "I studied computer and information systems at NED University.",
      "I also ran a GTA San Andreas multiplayer server, scripted in PAWN.",
      "Then I built payment APIs in Python at Foree Pay.",
    ],
    more: [
      "At NED I was a core member of the AI club. We ran machine learning sessions and introductory Kaggle contests.",
      "I led the graphics team of the Green Society. Posters and logos for the IEEE computer society at NED are how I learned Illustrator.",
      "The game server had its own forums. I ran them, moderated the game, held events and fixed the bugs.",
    ],
  },
  {
    place: "Darwin",
    arrived: 2020,
    left: 2025,
    lines: [
      "I came for a Masters at Charles Darwin University.",
      "My thesis taught convolutional networks to spot threats in airport X-ray scans.",
      "Then .NET and Blazor at the Northern Land Council, and reef science at AIMS.",
    ],
    more: [
      "The thesis used transfer learning on MobileNetV2 and InceptionResNetV2. It passed 90 percent accuracy on the GDXRay set.",
      "At the Northern Land Council I built web apps and APIs in C#, with Blazor and SQL Server.",
      "At the Australian Institute of Marine Science I worked on ReefCloud, a platform for monitoring coral reefs, and on new science apps. Their APIs ran in Python and Java on AWS serverless.",
    ],
  },
  {
    place: "Sydney",
    arrived: 2025,
    lines: [
      "Now I build the next generation of an AI platform at Twin Technology, on .NET, Blazor and Azure.",
      "I work closely with the Chief AI & Intelligence Officer.",
    ],
    more: [
      "Sydney started at CommBank, on full-stack tools that automate banking work.",
      "At Atelier I built a multi-agent assistant with LangChain and LangGraph. I also built a search that finds packaging like a photo you upload, and preview videos of packaging made with Veo.",
      "Twin brings me back to .NET and Blazor, the tools I used at the Northern Land Council in Darwin.",
    ],
  },
];

export const offTheClock = {
  title: "Off the clock",
  lines: [
    "When I am not shipping code, you can find me in a Dota 2 lobby.",
    "Ask me about cricket, or Python (the language, not the reptile).",
    "This site has a cosmos I built: a black hole on the 404 page, and a planet for every post.",
  ],
  backHome: { label: "Back home", address: "/?from=post" },
};

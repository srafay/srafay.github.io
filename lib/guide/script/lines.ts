/*
  Every word the python says, in one place, so all of it can be read and checked at once. Facts follow the CV (and
  content/about/profile.ts, which is the CV in the site's voice), word for word where it names things. The house rules
  hold: no contractions, no dashes, no semicolons, short sentences, the full name the first time in each section's
  narration and "he" after. Asides (tricks, costumes, taps, the grab) each stand alone, so any that names him says the
  full name.
*/
import type { SectionKey } from "@/lib/guide/palette";
import { FULL_NAME, He, he, His, his } from "./names";

/** One line of the tour's narration, and the CV item that comes with it, if any. */
export type Exchange = { line: string; eventId?: string; extra?: "mockups" | "skills" | "links" | "playground" };

/** The tour, section by section. Every event of the CV appears in at least one section, checked at build time. */
export const narration = (): Record<SectionKey, Exchange[]> => ({
  hello: [
    { line: `I am Python. The reptile. ${FULL_NAME} uses the other one.` },
    { line: `Scroll down. I will take you through ${his()} CV, all of it.` },
  ],
  now: [
    { line: `${FULL_NAME} is a senior software engineer at Twin Technology, in Sydney. Since August 2026.`, eventId: "work-twin-technology" },
    { line: `${He()} works closely with the Chief AI & Intelligence Officer, on .NET, Blazor and Azure.` },
    { line: "Together they are building the next generation of an AI platform." },
  ],
  work: [
    { line: `Now the work. ${FULL_NAME} has had seven roles, newest first, then two internships the CV does not date.` },
    { line: "You met this one already. Twin Technology, since August 2026.", eventId: "work-twin-technology" },
    { line: "Atelier, in Sydney. Serverless backends on AWS, and a multi-agent AI assistant built with LangChain and LangGraph.", eventId: "work-atelier" },
    { line: "CommBank, also Sydney. Tools that automate banking work, tested with Pytest, Vitest and Playwright.", eventId: "work-commbank" },
    { line: "AIMS, the Australian Institute of Marine Science. ReefCloud and new science apps. Sea snakes live on reefs. I feel represented.", eventId: "work-aims" },
    { line: "The Northern Land Council, in Darwin. Web apps and REST APIs in C#, on .NET Core with Blazor.", eventId: "work-northern-land-council" },
    { line: "Foree Pay, in Karachi. Payment APIs in Python, built to PCI-DSS. The language, not me.", eventId: "work-foree-pay" },
    { line: "The earliest dated role, in 2018. An internship at Media Research & Innovations, for a broadcast monitoring startup.", eventId: "work-media-research-innovations" },
    { line: "Love For Data. One month, one working image classifier. The CV gives it no date.", eventId: "work-love-for-data" },
    { line: "RCAI, the Research Centre for Artificial Intelligence. Arduino and ZigBee devices, Java for Android, and the official website.", eventId: "work-rcai" },
  ],
  study: [
    { line: `Then the study. ${FULL_NAME} has two degrees, and a thesis to go with the second.` },
    { line: "A Masters of IT in software engineering, at Charles Darwin University. 2020 to 2021.", eventId: "study-charles-darwin-university" },
    { line: "The thesis: finding threats in airport X-ray images with transfer learning. Ninety percent accurate or better.", eventId: "study-airport-screening-thesis" },
    { line: "Before that, a Bachelor of Engineering in Computer and Information Systems, at NED in Karachi. 2014 to 2018.", eventId: "study-ned-university-of-engineering-technology" },
  ],
  projects: [
    { line: `Projects next. One of ${FULL_NAME}'s projects is not in the CV. You are standing in it.` },
    { line: `${His()} homepage is a sky of planets round a black hole. Earth carries ${his()} post about daylight saving.`, extra: "mockups" },
    { line: "Now the fifteen in the CV. Each one with code on GitHub comes with its repository." },
    { line: "The airport screening thesis. You met it in Study.", eventId: "study-airport-screening-thesis" },
    { line: "An e-commerce app on .NET Core and Angular, in 2021. Three tiers, and an Android build with Ionic.", eventId: "projects-e-commerce-app" },
    { line: "Handwritten signatures, recognised with OpenCV.", eventId: "projects-signature-recognition" },
    { line: "An image recognition API in 2018. TensorFlow behind Flask, on AWS EC2, in Docker.", eventId: "projects-image-recognition-api" },
    { line: "JetRail, 2018. Monthly ridership forecasts with six kinds of model.", eventId: "projects-jetrail-time-series" },
    { line: "Twitter sentiment, 2018. Text classified with NLTK and Keras.", eventId: "projects-twitter-sentiment" },
    { line: "Scrapy the Scraper. Structured data from sites that offer no API.", eventId: "projects-scrapy-the-scraper" },
    { line: "Media Icon. Broadcast monitoring from end to end: an Android app and a Flask web app on AWS.", eventId: "projects-media-icon" },
    { line: "A YOLO image classifier in 2017, on TensorFlow and DarkNet. Ninety percent accurate or better.", eventId: "projects-yolo-image-classifier" },
    { line: "A GTA San Andreas multiplayer server, scripted in PAWN. Hold that thought for Off the clock.", eventId: "projects-gta-sa-server" },
    { line: "An online voting system for the CIS department at NED. JavaScript, PHP and AJAX.", eventId: "projects-online-voting-system" },
    { line: "An IoT weather station in 2016, at RCAI and NED. Live readings, viewable on the web.", eventId: "projects-iot-weather-station" },
    { line: "A university management system for the CIS department. Visual C++ and Windows Forms.", eventId: "projects-university-management-system" },
    { line: "A report generator in C# that writes forum BB code, to help faction managers work out test marks.", eventId: "projects-bb-code-report-generator" },
    { line: "A school management system, built with procedural programming.", eventId: "projects-school-management-system" },
  ],
  courses: [
    { line: `Then the courses. ${FULL_NAME} has done fifteen, newest first.` },
    { line: "Model Context Protocol, the advanced topics. Anthropic, June 2026.", eventId: "courses-model-context-protocol-advanced" },
    { line: "The introduction to it came first, in May 2026.", eventId: "courses-model-context-protocol" },
    { line: "Agent Skills, also May 2026, also Anthropic.", eventId: "courses-agent-skills" },
    { line: "And Subagents, the same month. Three in one May.", eventId: "courses-subagents" },
    { line: "The OWASP Top 10, from June to September 2025.", eventId: "courses-owasp-top-10" },
    { line: "AWS Solutions Architect Associate training, March to July 2025.", eventId: "courses-aws-solutions-architect" },
    { line: "ChatGPT Prompt Mastery, April 2025.", eventId: "courses-chatgpt-prompt-mastery" },
    { line: "Rocking AWS Serverless, at the end of 2022. The name is the course's own.", eventId: "courses-rocking-aws-serverless" },
    { line: "Build an E-commerce App with .NET Core and Angular, August to October 2021.", eventId: "courses-e-commerce-with-net-and-angular" },
    { line: "Python design patterns, November 2018. The language again. Still not me.", eventId: "courses-python-design-patterns" },
    { line: "The Ultimate Hands-On Hadoop, July to September 2018.", eventId: "courses-hands-on-hadoop" },
    { line: "Python REST APIs with Flask, Docker, MongoDB and AWS DevOps. May to June 2018.", eventId: "courses-flask-rest-apis" },
    { line: "Python for data science, at DataCamp, March 2018.", eventId: "courses-python-for-data-science" },
    { line: "Machine Learning A-Z, August to September 2017.", eventId: "courses-machine-learning-a-z" },
    { line: "Android for beginners, from Google and Udacity, in 2016. The first of the fifteen.", eventId: "courses-android-for-beginners" },
  ],
  offTheClock: [
    { line: `Off the clock. What ${FULL_NAME} does when the work is done.` },
    { line: `The GTA San Andreas server, ls-rcr.com. ${He()} was its administrator and developer.`, eventId: "off-gta-san-andreas-server" },
    { line: `The AI club at NED. ${He()} ran machine learning sessions and Kaggle competitions for beginners.`, eventId: "off-ai-club" },
    { line: `Head of Graphics at the Green Society. ${He()} led the graphics team for its events.`, eventId: "off-green-society-graphics" },
    { line: `Graphics for the IEEE NED Computer Society: logos, membership cards and posters. That is where ${he()} learned Illustrator.`, eventId: "off-ieee-graphics" },
    { line: `Cricket. ${His()} GitHub says to ask him about it.`, eventId: "off-cricket" },
    { line: `Dota 2. When ${he()} is not shipping code, you can find him in a lobby.`, eventId: "off-dota-2" },
    { line: `And Python. ${His()} GitHub says the language, not the reptile. Rude, but fair.`, eventId: "off-python" },
  ],
  skills: [
    { line: `Skills. All 211, grouped as the CV groups them. Tap one and I will name every place ${FULL_NAME} used it.`, extra: "skills" },
  ],
  findMe: [
    { line: `That is the tour. ${FULL_NAME} is easiest to find here.`, extra: "links" },
    { line: "Before you go, I still have tricks.", extra: "playground" },
  ],
});

/** The python's first words, and its one hint about being picked up. */
export const asides = {
  pickMeUp: "Psst. You can pick me up.",
  pickedUp: ["Hello up there.", "I am not venomous. Just long.", "Put me down when you are done."],
  dropped: ["I meant to land like that.", "Back to the floor.", "That was fun. Again?"],
  soundOn: "Sound on. I will keep it soft.",
};

/** What it says when tapped, one after another. */
export const tapLines = [
  "Hello again.",
  "Snakes cannot blink. I practise anyway.",
  "I am not venomous. Pythons squeeze instead.",
  "Tap Tricks for tricks. I know nine.",
  `Try Dress me up. Everything in it is from ${FULL_NAME}'s life.`,
  "Python the language is named after Monty Python, not me. I checked.",
];

export const trickLines = {
  coil: "Boing.",
  knot: "Do not worry. I can undo this.",
  peekaboo: "Peekaboo.",
  sneeze: "Bless me.",
  dance: "One, two, three, four.",
  selfie: "Hold still. Got it.",
  hiss: "Hsss.",
  shed: "New skin. Same snake.",
  eatBug: "I ate a bug. Someone has to.",
} as const;

export const costumeLines = {
  cricketCap: `Cricket. ${FULL_NAME} asks people to ask him about it. So ask him.`,
  headset: `When ${FULL_NAME} is not shipping code, you can find him in a Dota 2 lobby. His words.`,
  graduationCap: "Two degrees. Computer and Information Systems at NED in Karachi, then a Masters of IT at Charles Darwin University.",
  readingGlasses: "Fifteen courses, from Android in 2016 to the Model Context Protocol in 2026.",
  hardHat: `${FULL_NAME} once kept order on a GTA San Andreas server. Forums, reports, ban applications and in-game moderation.`,
  none: "Back to just me.",
} as const;

/** What it says before a skill's answer: Python gets its own disclaimer. */
export const skillLead = (skill: string) => (skill === "Python" ? "Python the language, not me." : `${skill}.`);

const COUNTS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/**
 * Where a skill was used, said short: "Flask. Four places, 2018." The places themselves follow as buttons, each
 * named, so no sentence runs long. A skill no event names says where the CV lists it, in the shared answer's words.
 */
export function skillAnswerLine(skill: string, events: { start: number; end?: number }[], sharedSentence: string) {
  if (!events.length) return `${skillLead(skill)} ${sharedSentence}`;
  const first = Math.min(...events.map((event) => Math.floor(event.start)));
  const last = Math.max(...events.map((event) => Math.floor(event.end ?? event.start)));
  const years = first === last ? String(first) : `${first} to ${last}`;
  const count = COUNTS[events.length] ?? String(events.length);
  return `${skillLead(skill)} ${count} ${events.length === 1 ? "place" : "places"}, ${years}. Tap one to open it.`;
}

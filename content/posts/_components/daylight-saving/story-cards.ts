/*
  The one-minute version: a deck of cards, one per section, played like a story. Each card's facts come from its
  section (see drafts/daylight-saving/), and each one passes the voice rules in AGENTS.md.
*/

export type StoryGraphic =
  | "night"
  | "arrests"
  | "history"
  | "tally"
  | "error-bar"
  | "robberies"
  | "solar-noon"
  | "share"
  | "sign"
  | "twice"
  | "ballot";

export type StoryCard = {
  kicker: string;
  headline: string;
  line: string;
  graphic: StoryGraphic;
  /** The section this card summarises, for "read more". */
  sectionId: string;
};

export const storyCards: StoryCard[] = [
  {
    kicker: "Sunday 4 October, 2 am",
    headline: "An hour vanished",
    line: "Felt off since? It might not be you. It might be the clock. And nobody asked us.",
    graphic: "night",
    sectionId: "nobody-asked",
  },
  {
    kicker: "The Sunday and Monday after",
    headline: "+17%",
    line: "Cardiac arrests outside hospital in Victoria, above normal, in the first two days.",
    graphic: "arrests",
    sectionId: "the-monday-after",
  },
  {
    kicker: "How it started",
    headline: "1895",
    line: "A Wellington clerk wanted more daylight to catch insects. A war made his idea law. Nobody voted.",
    graphic: "history",
    sectionId: "how-it-started",
  },
  {
    kicker: "Who got a say",
    headline: "4 votes, 0 votes",
    line: "Western Australia has voted on it four times. In Victoria, I could not find a single vote.",
    graphic: "tally",
    sectionId: "who-got-a-vote",
  },
  {
    kicker: "The energy promise",
    headline: "About zero",
    line: "Victoria tested the power saving in 2000. The change was too small to tell from nothing.",
    graphic: "error-bar",
    sectionId: "does-it-save-energy",
  },
  {
    kicker: "The case for it",
    headline: "−27%",
    line: "Robberies in the hour after sunset, once the clocks went forward. Robbers prefer the dark.",
    graphic: "robberies",
    sectionId: "the-case-for-it",
  },
  {
    kicker: "Your body clock",
    headline: "1:06 pm",
    line: "When the sun peaked over Melbourne on 11 October. Your body follows the sun, not the wall.",
    graphic: "solar-noon",
    sectionId: "body-clock",
  },
  {
    kicker: "Queensland, 2010",
    headline: "63%",
    line: "wanted a referendum in the government's own consultation. They are still waiting.",
    graphic: "share",
    sectionId: "queensland-and-wa",
  },
  {
    kicker: "On the Nullarbor",
    headline: "Why?",
    line: "Scrawled under a sign for an unofficial time zone. The roadhouse owner said: “Good question.”",
    graphic: "sign",
    sectionId: "clock-is-a-mess",
  },
  {
    kicker: "Twice a year",
    headline: "2:30 am",
    line: "It did not exist on 4 October. On 4 April, it happens twice. Your phone has to cope.",
    graphic: "twice",
    sectionId: "the-hour-computers-hate",
  },
  {
    kicker: "The ask",
    headline: "Let us vote",
    line: "One question at each state election. Daylight saving, yes or no? Majority wins.",
    graphic: "ballot",
    sectionId: "have-your-say",
  },
];

/** How long each card stays up when the deck plays itself, in milliseconds. */
export const storyCardMilliseconds = 5500;

/*
  What the letter to an MP says for each state and territory. The post's script adds the numbers, worked out for the
  capital with the same sun equations as the calendar: how many mornings a 6 am alarm beats the sun, and how many
  evenings are still light at 7 pm, under the state's rule now and under the other rule.
  Every sentence here is checked in the post's drafts (drafts/daylight-saving/).
*/

export type LetterState = {
  code: string;
  name: string;
  /** The name in full, as a label on its own, e.g. "New South Wales". */
  fullName: string;
  /** "state" or "territory", for "each state election". */
  kind: "state" | "territory";
  capital: string;
  latitude: number;
  longitude: number;
  /** Standard time, in minutes ahead of UTC. */
  standardOffset: number;
  usesSaving: boolean;
  /** The time zones whose readers start on this state. Canberra shares Sydney's, so the reader can change it. */
  timeZones: string[];
  /** One or two sentences on whether its people have ever been asked. */
  voteHistory: string;
  /** A finding from this state's own research, where there is one. */
  evidence?: string;
  /** The next general election, where it is confirmed. */
  nextElection?: string;
  /** The parliament's list of members, to find one's own MP. */
  membersPage: string;
};

export const letterStates: LetterState[] = [
  {
    code: "NSW",
    name: "NSW",
    fullName: "New South Wales",
    kind: "state",
    capital: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
    standardOffset: 600,
    usesSaving: true,
    timeZones: [
      "Australia/Sydney",
      "Australia/NSW",
      "Australia/Broken_Hill",
      "Australia/Lord_Howe",
    ],
    voteHistory:
      "NSW last voted on daylight saving in 1976. Anyone here younger than about 68 has never had a say.",
    nextElection: "13 March 2027",
    membersPage:
      "https://www.parliament.nsw.gov.au/members/Pages/all-members.aspx",
  },
  {
    code: "VIC",
    name: "Victoria",
    fullName: "Victoria",
    kind: "state",
    capital: "Melbourne",
    latitude: -37.8136,
    longitude: 144.9631,
    standardOffset: 600,
    usesSaving: true,
    timeZones: ["Australia/Melbourne", "Australia/Victoria"],
    voteHistory:
      "As far as I can find, Victorians have never had a vote on it.",
    evidence:
      "Here in Victoria, cardiac arrests rose 17 per cent over the first two days of the spring change.",
    nextElection: "28 November 2026",
    membersPage: "https://www.parliament.vic.gov.au/members",
  },
  {
    code: "QLD",
    name: "Queensland",
    fullName: "Queensland",
    kind: "state",
    capital: "Brisbane",
    latitude: -27.4678,
    longitude: 153.0281,
    standardOffset: 600,
    usesSaving: false,
    timeZones: [
      "Australia/Brisbane",
      "Australia/Lindeman",
      "Australia/Queensland",
    ],
    voteHistory:
      "Queensland last voted on it in 1992. In the government's own 2010 consultation, 63 per cent wanted another referendum.",
    membersPage: "https://www.parliament.qld.gov.au/Members/Current-Members",
  },
  {
    code: "SA",
    name: "South Australia",
    fullName: "South Australia",
    kind: "state",
    capital: "Adelaide",
    latitude: -34.9285,
    longitude: 138.6007,
    standardOffset: 570,
    usesSaving: true,
    timeZones: ["Australia/Adelaide", "Australia/South"],
    voteHistory:
      "As far as I can find, South Australians have never had a vote on it.",
    membersPage: "https://www.parliament.sa.gov.au/en/Members",
  },
  {
    code: "WA",
    name: "Western Australia",
    fullName: "Western Australia",
    kind: "state",
    capital: "Perth",
    latitude: -31.9523,
    longitude: 115.8613,
    standardOffset: 480,
    usesSaving: false,
    timeZones: ["Australia/Perth", "Australia/West", "Australia/Eucla"],
    voteHistory:
      "Western Australia has voted on it four times, most recently in 2009. Opinion can change, and a vote is how we would know.",
    membersPage:
      "https://www.parliament.wa.gov.au/parliament/memblist.nsf/WAllMembers",
  },
  {
    code: "TAS",
    name: "Tasmania",
    fullName: "Tasmania",
    kind: "state",
    capital: "Hobart",
    latitude: -42.8821,
    longitude: 147.3272,
    standardOffset: 600,
    usesSaving: true,
    timeZones: ["Australia/Hobart", "Australia/Tasmania", "Australia/Currie"],
    voteHistory:
      "As far as I can find, Tasmanians have never had a vote on it.",
    membersPage:
      "https://www.parliament.tas.gov.au/house-of-assembly/currentmembers",
  },
  {
    code: "ACT",
    name: "the ACT",
    fullName: "Australian Capital Territory",
    kind: "territory",
    capital: "Canberra",
    latitude: -35.2809,
    longitude: 149.13,
    standardOffset: 600,
    usesSaving: true,
    timeZones: ["Australia/ACT", "Australia/Canberra"],
    voteHistory:
      "As far as I can find, people in the ACT have never had a vote on it.",
    membersPage: "https://www.parliament.act.gov.au/members",
  },
  {
    code: "NT",
    name: "the Northern Territory",
    fullName: "Northern Territory",
    kind: "territory",
    capital: "Darwin",
    latitude: -12.4637,
    longitude: 130.8444,
    standardOffset: 570,
    usesSaving: false,
    timeZones: ["Australia/Darwin", "Australia/North"],
    voteHistory:
      "As far as I can find, Territorians have never had a vote on it.",
    membersPage: "https://parliament.nt.gov.au/members",
  },
];

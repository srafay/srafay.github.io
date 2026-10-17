/*
  The numbers behind every figure in the daylight saving post. Each one is cited in the post's drafts
  (drafts/daylight-saving/), by section; the comment beside each set names that section.
*/

export type StateVote = {
  code: string;
  name: string;
  /** Where the tile sits on the map grid: column and row, from the top left. */
  column: number;
  row: number;
  columnSpan?: number;
  rowSpan?: number;
  lastVote: string | null;
  result: string | null;
};

// Section 0 and section 3: the most recent statewide vote in each state and territory.
export const lastVotes: StateVote[] = [
  {
    code: "WA",
    name: "Western Australia",
    column: 1,
    row: 1,
    rowSpan: 2,
    lastVote: "2009",
    result: "No, 54.6%",
  },
  {
    code: "NT",
    name: "Northern Territory",
    column: 2,
    row: 1,
    lastVote: null,
    result: null,
  },
  {
    code: "QLD",
    name: "Queensland",
    column: 3,
    row: 1,
    columnSpan: 2,
    lastVote: "1992",
    result: "No, 54.5%",
  },
  {
    code: "SA",
    name: "South Australia",
    column: 2,
    row: 2,
    lastVote: null,
    result: null,
  },
  {
    code: "NSW",
    name: "New South Wales",
    column: 3,
    row: 2,
    lastVote: "1976",
    result: "Yes, about 68%",
  },
  {
    code: "ACT",
    name: "Australian Capital Territory",
    column: 4,
    row: 2,
    lastVote: null,
    result: null,
  },
  {
    code: "VIC",
    name: "Victoria",
    column: 3,
    row: 3,
    lastVote: null,
    result: null,
  },
  {
    code: "TAS",
    name: "Tasmania",
    column: 3,
    row: 4,
    lastVote: null,
    result: null,
  },
];

export type RiskBar = {
  measure: string;
  where: string;
  window: string;
  /** Per cent rise. Zero means the study found no change. */
  risePercent: number;
  australian?: boolean;
  note?: string;
};

// Section 1: how much each risk rose in the days after the spring change.
export const springRisks: RiskBar[] = [
  {
    measure: "Heart attacks treated in hospital",
    where: "Michigan, 2010 to 2013",
    window: "Monday after",
    risePercent: 24,
    note: "Weekly total unchanged: they came earlier, not extra",
  },
  {
    measure: "Cardiac arrests outside hospital",
    where: "Victoria, 2000 to 2020",
    window: "Sunday and Monday",
    risePercent: 17,
    australian: true,
  },
  {
    measure: "Stroke admissions",
    where: "Finland, 2004 to 2013",
    window: "First two days",
    risePercent: 8,
  },
  {
    measure: "Fatal road crashes",
    where: "United States, 1996 to 2017",
    window: "Days after the change",
    risePercent: 6,
  },
  {
    measure: "Heart attacks",
    where: "Sweden, from 1987",
    window: "First week",
    risePercent: 5,
  },
  {
    measure: "Heart attacks",
    where: "United States, 2013 to 2022",
    window: "Week of the change",
    risePercent: 0,
  },
  {
    measure: "Fatal road crashes",
    where: "Australia, 1989 to 2015",
    window: "Whole season",
    risePercent: 0,
    australian: true,
  },
];

export type TimelineEvent = {
  when: string;
  year: number;
  event: string;
  australian?: boolean;
};

// Section 2: from a joke to the law.
export const historyEvents: TimelineEvent[] = [
  {
    when: "26 April 1784",
    year: 1784,
    event: "Franklin's joke about candles, in the Journal de Paris",
  },
  {
    when: "16 October 1895",
    year: 1895,
    event: "George Vernon Hudson proposes a two-hour shift in Wellington",
    australian: true,
  },
  {
    when: "July 1907",
    year: 1907,
    event: "William Willett publishes The Waste of Daylight",
  },
  {
    when: "30 April 1916",
    year: 1916,
    event: "Germany and Austria-Hungary move their clocks to save coal",
  },
  {
    when: "1 October 1916",
    year: 1916,
    event: "Tasmania starts, the first in Australia",
    australian: true,
  },
  {
    when: "1917",
    year: 1917,
    event: "One federal summer, then repeal",
    australian: true,
  },
  {
    when: "1942 to 1944",
    year: 1942,
    event: "Three wartime summers",
    australian: true,
  },
  {
    when: "1 October 1967",
    year: 1967,
    event: "Tasmania brings it back in a drought",
    australian: true,
  },
  {
    when: "31 October 1971",
    year: 1971,
    event: "NSW, Victoria, SA, the ACT and Queensland follow",
    australian: true,
  },
  {
    when: "1972",
    year: 1972,
    event: "Queensland drops it after one summer",
    australian: true,
  },
  {
    when: "2008",
    year: 2008,
    event: "Common dates: first Sunday in October to first Sunday in April",
    australian: true,
  },
];

export type Referendum = {
  place: string;
  date: string;
  yesPercent: number;
};

// Section 3: every statewide referendum on daylight saving.
export const referendums: Referendum[] = [
  { place: "WA", date: "8 March 1975", yesPercent: 46.34 },
  { place: "NSW", date: "1 May 1976", yesPercent: 68.4 },
  { place: "WA", date: "7 April 1984", yesPercent: 45.65 },
  { place: "QLD", date: "22 February 1992", yesPercent: 45.5 },
  { place: "WA", date: "4 April 1992", yesPercent: 46.86 },
  { place: "WA", date: "16 May 2009", yesPercent: 45.44 },
];

export type EnergyBar = {
  label: string;
  kind: "promised" | "measured";
  /** Per cent change in electricity use. Negative is a saving. */
  changePercent: number;
  standardError?: number;
  basis: string;
};

// Section 4: what was promised against what was measured.
export const energyChanges: EnergyBar[] = [
  {
    label: "US goal for the 2007 extension",
    kind: "promised",
    changePercent: -1,
    basis: "over the extension",
  },
  {
    label: "California model",
    kind: "promised",
    changePercent: -0.6,
    basis: "over the extension",
  },
  {
    label: "Victoria, Olympic extension, 2000",
    kind: "measured",
    changePercent: 0.09,
    standardError: 0.4,
    basis: "over the extension",
  },
  {
    label: "Indiana households",
    kind: "measured",
    changePercent: 1,
    basis: "over the season",
  },
  {
    label: "US Department of Energy, 2007",
    kind: "measured",
    changePercent: -0.5,
    basis: "per day of the extension",
  },
  {
    label: "44 studies combined",
    kind: "measured",
    changePercent: -0.34,
    basis: "per day",
  },
];

export type StatTile = {
  value: string;
  label: string;
  setting: string;
  /** What the number measures, which picks the tile's icon. */
  topic: "crime" | "walking" | "driving" | "opinion";
  counterEvidence?: boolean;
};

// Section 5: what an hour of evening light does.
export const eveningLightStats: StatTile[] = [
  {
    value: "−27%",
    label: "Robberies in the hour after sunset",
    topic: "crime",
    setting: "United States, weeks after the spring change",
  },
  {
    value: "−24%",
    label: "Pedestrian and cyclist deaths",
    topic: "walking",
    setting: "United States, five weeks after the spring change",
  },
  {
    value: "+13%",
    label: "Pedestrian and cyclist deaths after clocks go back",
    topic: "walking",
    setting: "United States, five weeks after the autumn change",
  },
  {
    value: "Fewer",
    label: "Evening crashes in Australia",
    topic: "driving",
    setting: "1989 to 2015, no change overall",
  },
  {
    value: "80%",
    label: "Support for daylight saving",
    topic: "opinion",
    setting: "Australia, 2024 survey of about 1,100 people",
  },
  {
    value: "+12%",
    label: "Driver and passenger deaths",
    topic: "driving",
    setting: "United States, after the spring change",
    counterEvidence: true,
  },
];

/** A time of day as minutes after midnight, e.g. clock(13, 6) for 1:06 pm. */
export const clock = (hours: number, minutes: number) => hours * 60 + minutes;

export type SunReading = {
  label: string;
  standard: number;
  daylightSaving: number;
};

// Section 6: one sun, two clocks. Calculated with the NOAA solar equations.
export const melbourneSolarNoon: SunReading = {
  label: "Melbourne, sun highest, 11 October 2026",
  standard: clock(12, 6),
  daylightSaving: clock(13, 6),
};
export const winterSunrises: SunReading[] = [
  {
    label: "Melbourne, late June sunrise",
    standard: clock(7, 36),
    daylightSaving: clock(8, 36),
  },
  {
    label: "Hobart, late June sunrise",
    standard: clock(7, 42),
    daylightSaving: clock(8, 42),
  },
];

export type DaylightBar = {
  city: string;
  clockName: string;
  sunrise: number;
  sunset: number;
  hypothetical?: boolean;
};

// Section 7: midsummer daylight on the clock, 21 December 2026. Calculated with the NOAA solar equations.
export const midsummerDaylight: DaylightBar[] = [
  {
    city: "Brisbane",
    clockName: "as now",
    sunrise: clock(4, 50),
    sunset: clock(18, 42),
  },
  {
    city: "Brisbane",
    clockName: "with daylight saving",
    sunrise: clock(5, 50),
    sunset: clock(19, 42),
    hypothetical: true,
  },
  {
    city: "Perth",
    clockName: "as now",
    sunrise: clock(5, 7),
    sunset: clock(19, 22),
  },
  {
    city: "Perth",
    clockName: "with daylight saving",
    sunrise: clock(6, 7),
    sunset: clock(20, 22),
    hypothetical: true,
  },
  {
    city: "Sydney",
    clockName: "daylight saving",
    sunrise: clock(5, 41),
    sunset: clock(20, 5),
  },
  {
    city: "Hobart",
    clockName: "daylight saving",
    sunrise: clock(5, 28),
    sunset: clock(20, 49),
  },
];

export type SummerZone = {
  place: string;
  /** Summer offset from UTC, in minutes. */
  summerOffset: number;
  note?: string;
  unofficial?: boolean;
};

// Section 8: Australia's clocks this summer, west to east.
export const summerZones: SummerZone[] = [
  { place: "Western Australia", summerOffset: 8 * 60 },
  {
    place: "Eucla and the Nullarbor roadhouses",
    summerOffset: 8 * 60 + 45,
    note: "Unofficial",
    unofficial: true,
  },
  { place: "Northern Territory", summerOffset: 9 * 60 + 30 },
  { place: "Queensland", summerOffset: 10 * 60, note: "Includes Coolangatta" },
  {
    place: "South Australia",
    summerOffset: 10 * 60 + 30,
    note: "Includes Broken Hill, NSW",
  },
  {
    place: "NSW, Victoria, ACT, Tasmania",
    summerOffset: 11 * 60,
    note: "Includes Tweed Heads",
  },
  {
    place: "Lord Howe Island",
    summerOffset: 11 * 60,
    note: "Moves only 30 minutes",
  },
  { place: "Norfolk Island", summerOffset: 12 * 60 },
];
/** The zone every other zone is compared with: Sydney in summer. */
export const sydneySummerOffset = 11 * 60;

export type TimeGap = {
  from: string;
  /** Days after 1 October 2026, for placing the step. */
  dayOfPeriod: number;
  aheadOfLondon: number;
  aheadOfNewYork: number;
  change: string;
};

// Section 9: hours Sydney is ahead of London and New York. Checked against the IANA data in Intl.
export const sydneyGaps: TimeGap[] = [
  {
    from: "1 Oct 2026",
    dayOfPeriod: 0,
    aheadOfLondon: 9,
    aheadOfNewYork: 14,
    change: "",
  },
  {
    from: "4 Oct 2026",
    dayOfPeriod: 3,
    aheadOfLondon: 10,
    aheadOfNewYork: 15,
    change: "Sydney forward",
  },
  {
    from: "25 Oct 2026",
    dayOfPeriod: 24,
    aheadOfLondon: 11,
    aheadOfNewYork: 15,
    change: "London back",
  },
  {
    from: "1 Nov 2026",
    dayOfPeriod: 31,
    aheadOfLondon: 11,
    aheadOfNewYork: 16,
    change: "New York back",
  },
  {
    from: "14 Mar 2027",
    dayOfPeriod: 164,
    aheadOfLondon: 11,
    aheadOfNewYork: 15,
    change: "New York forward",
  },
  {
    from: "28 Mar 2027",
    dayOfPeriod: 178,
    aheadOfLondon: 10,
    aheadOfNewYork: 15,
    change: "London forward",
  },
  {
    from: "4 Apr 2027",
    dayOfPeriod: 185,
    aheadOfLondon: 9,
    aheadOfNewYork: 14,
    change: "Sydney back",
  },
];
/** Where the chart stops: 1 May 2027. */
export const gapPeriodDays = 212;

export type PlaceStatus = {
  place: string;
  usesItNow: boolean;
  proposal: string;
  status: string;
  nextChange: string;
};

// Section 10: where the clocks stand, as of 12 October 2026.
export const worldStatus: PlaceStatus[] = [
  {
    place: "NSW, Victoria, SA, Tasmania, ACT",
    usesItNow: true,
    proposal: "NSW: one month less at each end",
    status: "NSW bill lapsed, 18 September 2026",
    nextChange: "Sunday 4 April 2027",
  },
  {
    place: "Queensland, WA, NT",
    usesItNow: false,
    proposal: "Queensland petition for a south-east vote",
    status: "Premier says “hard no”",
    nextChange: "None",
  },
  {
    place: "United States",
    usesItNow: true,
    proposal: "Permanent daylight saving",
    status: "Passed the House 308 to 117. Senate returns 9 November",
    nextChange: "Sunday 1 November 2026",
  },
  {
    place: "European Union",
    usesItNow: true,
    proposal: "End the clock changes",
    status: "Parliament agreed in 2019. Governments have not",
    nextChange: "Sunday 25 October 2026",
  },
  {
    place: "Mexico",
    usesItNow: false,
    proposal: "",
    status: "Ended 30 October 2022, except near the US border",
    nextChange: "Border towns only",
  },
  {
    place: "Brazil",
    usesItNow: false,
    proposal: "",
    status: "Ended by decree, 25 April 2019",
    nextChange: "None",
  },
];

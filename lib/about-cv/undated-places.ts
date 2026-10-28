/*
  Where the scene draws the things the CV gives no date. Each is placed by the one clue there is. Its card says
  "Undated in the CV" and gives that clue, so the place is never mistaken for a date. One function per clue, so a
  better clue changes one line.
*/
import { middleOfYear } from "@/lib/about-cv/time";

export type UndatedPlace = { time: number; evidence: string };

/** The NED years, where the student work sits when nothing narrows it further. */
const NED_YEARS = "the NED years, 2014 to 2018";

/** A project whose code went up on GitHub: drawn in that year. */
export const placedByRepository = (year: number): UndatedPlace => ({
  time: middleOfYear(year),
  evidence: `Drawn in ${year}, the year its repository went up on GitHub.`,
});

/** Something made for a department or club at NED, at a point inside the NED years. */
export const placedInTheNedYears = (
  time: number,
  why: string,
): UndatedPlace => ({
  time,
  evidence: `${why}, so it is drawn in ${NED_YEARS}.`,
});

/** Media Icon: the CV's nearest dated work of the same kind is the 2018 internship on broadcast monitoring. */
export const mediaIconPlace: UndatedPlace = {
  time: 2018.62,
  evidence:
    "Drawn in 2018, beside the CV's one dated piece of broadcast monitoring work, the internship that year.",
};

/** RCAI: the CV's IoT weather station is dated 2016 and marked RCAI/NED. */
export const researchCentrePlace: UndatedPlace = {
  time: 2016.3,
  evidence:
    "Drawn in 2016 beside the IoT weather station, which the CV dates 2016 and marks RCAI/NED.",
};

/** Love For Data: an image classifier, like the CV's YOLO classifier of 2017. */
export const loveForDataPlace: UndatedPlace = {
  time: 2017.3,
  evidence:
    "Drawn in 2017, beside the CV's other early image classifier, the YOLO classifier of that year.",
};

/** The GTA San Andreas server's running: beside the server's code, which went up on GitHub in 2016. */
export const serverAdministrationPlace: UndatedPlace = {
  time: 2016.75,
  evidence:
    "Drawn beside the server's PAWN code, which went up on GitHub in 2016.",
};

export const universitySystemPlace = placedInTheNedYears(
  2015.4,
  "Made for the CIS department at NED",
);

export const aiClubPlace = placedInTheNedYears(2016.0, "A club at NED");

export const ieeeGraphicsPlace = placedInTheNedYears(
  2015.7,
  "A society at NED",
);

/** Green Society: the CV names no school, so it sits with the other graphics work, in the student years. */
export const greenSocietyPlace: UndatedPlace = {
  time: 2015.1,
  evidence:
    "The CV names no year or school for it, so it is drawn beside the IEEE NED graphics work.",
};

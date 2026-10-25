/*
  The five places the camera holds at, in order: the planet with the name over it, Karachi, Darwin, Sydney, and the
  whole planet again. Each is a camera pose and a grade. The cities come from content/about/profile.ts, where the
  first version of the page put them.

  Two layouts: a tall phone puts the words in the lower third and the city in the upper half; a wide screen puts the
  words in a left column and the city right of centre. The first screen's planet takes its place and size from the
  stand-in disc the page draws in CSS (measured by the scene), so the two always agree.
*/
import { MathUtils, Vector3 } from "three";
import { cities } from "../../content/about/profile";
import {
  distanceForDiscRadius,
  type CameraPose,
  type StageSize,
} from "./camera-rig";
import { headingToward, surfacePoint, type Place } from "./geography";
import { DARWIN, KARACHI, ORBIT, SYDNEY, type Grade } from "./grades";
import { subsolarPlace } from "./sun";

export type Disc = { centreX: number; centreY: number; radius: number };

export type Frame = {
  stage: StageSize;
  /** A stage taller than it is wide. */
  portrait: boolean;
  /** Where the first screen's planet sits on the stage, in pixels. */
  heroDisc: Disc;
};

export type Stop = {
  name: string;
  pose: CameraPose;
  grade: Grade;
  /** How high the camera climbs on the way here, as blendPoses takes it. */
  riseOnTheWay: number;
};

const cityNamed = (name: string) => {
  const city = cities.find((candidate) => candidate.name === name);
  if (!city) throw new Error(`profile.ts has no city named ${name}`);
  return city;
};

export const KARACHI_PLACE = cityNamed("Karachi");
export const DARWIN_PLACE = cityNamed("Darwin");
export const SYDNEY_PLACE = cityNamed("Sydney");
export const ROUTE: Place[] = [KARACHI_PLACE, DARWIN_PLACE, SYDNEY_PLACE];

/*
  The first screen looks at the Indian Ocean beside the three cities, so India's lights, the islands and Australia
  are all on the night side facing the reader, and the dark sea lies under the name. On a phone the view turns, so the
  route runs down the tall screen: Karachi near the top, Darwin and Sydney lower right, open sea lower left.
*/
const HERO_CENTRE_WIDE: Place = { latitude: -5, longitude: 100 };
const HERO_CENTRE_TALL: Place = { latitude: -16, longitude: 108 };
const HERO_HEADING_TALL_DEGREES = -40;
const HERO_FIELD_OF_VIEW = 28;

/** The last screen looks at the route's middle from far enough off to see the whole planet. */
const END_CENTRE: Place = { latitude: -6, longitude: 112 };

/** The lens for the close views: a little wider on a tall screen, so its narrow width still shows the region. */
const closeFieldOfView = (frame: Frame) => (frame.portrait ? 48 : 36);

/** Where the city sits on the screen at its stop, away from the words. */
function cityShift(frame: Frame) {
  return frame.portrait
    ? { shiftAcross: 0.02, shiftDown: -0.12 }
    : { shiftAcross: 0.2, shiftDown: 0.04 };
}

function heroPose(frame: Frame): CameraPose {
  const { stage, heroDisc } = frame;
  return {
    target: surfacePoint(frame.portrait ? HERO_CENTRE_TALL : HERO_CENTRE_WIDE),
    distance: distanceForDiscRadius(
      heroDisc.radius,
      stage.height,
      HERO_FIELD_OF_VIEW,
    ),
    tilt: 0,
    heading: frame.portrait ? MathUtils.degToRad(HERO_HEADING_TALL_DEGREES) : 0,
    fieldOfView: HERO_FIELD_OF_VIEW,
    shiftAcross: heroDisc.centreX / stage.width - 0.5,
    shiftDown: heroDisc.centreY / stage.height - 0.5,
  };
}

/** The whole planet at the end, beside the last words: above them on a phone, right of them on a wide screen. */
function endPose(frame: Frame): CameraPose {
  const { stage } = frame;
  const radius = frame.portrait
    ? Math.min(stage.width * 0.4, stage.height * 0.21)
    : stage.height * 0.36;
  return {
    target: surfacePoint(END_CENTRE),
    distance: distanceForDiscRadius(radius, stage.height, HERO_FIELD_OF_VIEW),
    tilt: 0,
    heading: frame.portrait ? MathUtils.degToRad(HERO_HEADING_TALL_DEGREES) : 0,
    fieldOfView: HERO_FIELD_OF_VIEW,
    shiftAcross: frame.portrait ? 0 : 0.2,
    shiftDown: frame.portrait ? -0.24 : 0,
  };
}

/** A city seen from a few thousand kilometres up, tipped toward the horizon it faces. */
function cityPose(
  frame: Frame,
  place: Place,
  facing: Vector3,
  distance: number,
  tiltDegrees: number,
): CameraPose {
  const target = surfacePoint(place);
  return {
    target,
    distance,
    tilt: MathUtils.degToRad(tiltDegrees),
    heading: headingToward(target, facing),
    fieldOfView: closeFieldOfView(frame),
    ...cityShift(frame),
  };
}

/*
  Each city faces where the story goes next: Karachi looks east over India toward Darwin, Darwin looks south-east over
  the dark continent toward Sydney, and Sydney, the last, looks toward the sun about to rise over the Pacific.
*/
export function stopsFor(frame: Frame): Stop[] {
  const darwin = surfacePoint(DARWIN_PLACE);
  const sydney = surfacePoint(SYDNEY_PLACE);
  const sunrise = surfacePoint(subsolarPlace(SYDNEY_PLACE));
  return [
    {
      name: "orbit",
      pose: heroPose(frame),
      grade: ORBIT,
      riseOnTheWay: 0,
    },
    {
      name: "Karachi",
      pose: cityPose(frame, KARACHI_PLACE, darwin, 0.62, 46),
      grade: KARACHI,
      riseOnTheWay: 0,
    },
    {
      name: "Darwin",
      pose: cityPose(frame, DARWIN_PLACE, sydney, 0.55, 48),
      grade: DARWIN,
      riseOnTheWay: 1.6,
    },
    {
      name: "Sydney",
      pose: cityPose(frame, SYDNEY_PLACE, sunrise, 0.5, 52),
      grade: SYDNEY,
      riseOnTheWay: 1.2,
    },
    {
      name: "the whole planet",
      pose: endPose(frame),
      grade: ORBIT,
      riseOnTheWay: 0,
    },
  ];
}

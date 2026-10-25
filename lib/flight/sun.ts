/*
  One sun for the whole flight, placed the way the real geometry would have it: late October, with Sydney a little
  before sunrise. Karachi and Darwin are then deep in the night, and from far off the only daylight is a thin
  dawn along the planet's eastern edge, over the western Pacific.
*/
import { MathUtils } from "three";
import { surfacePoint, type Place } from "./geography";

/** The sun's declination in late October, in degrees (south of the equator). */
const LATE_OCTOBER_DECLINATION = -12;

/** How far below Sydney's eastern horizon the sun is: in the twilight that lights the sky but not the ground. */
const SYDNEY_DEGREES_BEFORE_SUNRISE = 8;

/**
 * The longitude east of a place at which the sun stands overhead when it is a given angle below that place's eastern
 * horizon, by the spherical law of cosines.
 */
function longitudeOfSunBelowEasternHorizon(
  place: Place,
  declination: number,
  degreesBelow: number,
) {
  const latitude = MathUtils.degToRad(place.latitude);
  const sunDeclination = MathUtils.degToRad(declination);
  const angleFromOverhead = MathUtils.degToRad(90 + degreesBelow);
  const cosineOfLongitudeGap =
    (Math.cos(angleFromOverhead) -
      Math.sin(latitude) * Math.sin(sunDeclination)) /
    (Math.cos(latitude) * Math.cos(sunDeclination));
  return place.longitude + MathUtils.radToDeg(Math.acos(cosineOfLongitudeGap));
}

/** The point on the planet with the sun overhead. */
export function subsolarPlace(sydney: Place): Place {
  return {
    latitude: LATE_OCTOBER_DECLINATION,
    longitude: longitudeOfSunBelowEasternHorizon(
      sydney,
      LATE_OCTOBER_DECLINATION,
      SYDNEY_DEGREES_BEFORE_SUNRISE,
    ),
  };
}

/** The direction toward the sun, from the planet's centre. */
export const sunDirection = (sydney: Place) =>
  surfacePoint(subsolarPlace(sydney));

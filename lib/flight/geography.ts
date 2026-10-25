/*
  Places on the planet as points in the scene. The globe is a sphere of radius 1 at the origin, north along +y, the
  prime meridian facing +z and east toward +x. The textures are equirectangular with north at the top row, so a
  point's texture coordinates are its longitude and latitude stretched over 0 to 1 (the shaders work this out
  themselves from the same convention).
*/
import { MathUtils, Vector3 } from "three";
import type { City } from "../../content/about/profile";

export type Place = Pick<City, "latitude" | "longitude">;

const NORTH_POLE = new Vector3(0, 1, 0);

/** A place as a point on the unit sphere. */
export function surfacePoint({ latitude, longitude }: Place) {
  const latitudeRadians = MathUtils.degToRad(latitude);
  const longitudeRadians = MathUtils.degToRad(longitude);
  return new Vector3(
    Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
    Math.sin(latitudeRadians),
    Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
  );
}

/** The point on the sphere a fraction of the way from one point to another, along the great circle between them. */
export function alongGreatCircle(from: Vector3, to: Vector3, fraction: number) {
  const angle = from.angleTo(to);
  if (angle < 1e-6) return from.clone();
  const fromWeight = Math.sin((1 - fraction) * angle) / Math.sin(angle);
  const toWeight = Math.sin(fraction * angle) / Math.sin(angle);
  return from
    .clone()
    .multiplyScalar(fromWeight)
    .add(to.clone().multiplyScalar(toWeight))
    .normalize();
}

/** The great-circle distance between two points on the unit sphere, in radians. */
export const arcBetween = (from: Vector3, to: Vector3) => from.angleTo(to);

/** Due north along the surface at a point (any point but the poles, which the route never visits). */
export function northAt(point: Vector3) {
  return NORTH_POLE.clone()
    .sub(point.clone().multiplyScalar(point.dot(NORTH_POLE)))
    .normalize();
}

/** Due east along the surface at a point. */
export const eastAt = (point: Vector3) =>
  new Vector3().crossVectors(northAt(point), point).normalize();

/** The direction along the surface at a point that a heading names: 0 is north, a quarter turn is east. */
export function headingDirection(point: Vector3, heading: number) {
  return northAt(point)
    .multiplyScalar(Math.cos(heading))
    .add(eastAt(point).multiplyScalar(Math.sin(heading)));
}

/** The heading, in radians from north toward east, of the great circle leaving one point for another. */
export function headingToward(from: Vector3, to: Vector3) {
  const along = to
    .clone()
    .sub(from.clone().multiplyScalar(from.dot(to)))
    .normalize();
  return Math.atan2(along.dot(eastAt(from)), along.dot(northAt(from)));
}

/** A point turned about the planet's axis, as the planet's own turning carries it: positive degrees go east. */
export function turnedEast(point: Vector3, degrees: number) {
  return point.clone().applyAxisAngle(NORTH_POLE, MathUtils.degToRad(degrees));
}

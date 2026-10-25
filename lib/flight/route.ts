/*
  The route, Karachi to Darwin to Sydney: two great-circle legs lifted a little off the surface in a low arch, as a
  flight path is, drawn as one ribbon that grows as the camera flies. Its progress runs from 0 at Karachi to 1 at
  Sydney, shared out by the legs' lengths, so Darwin sits where the first leg's share ends.
*/
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import {
  alongGreatCircle,
  arcBetween,
  surfacePoint,
  type Place,
} from "./geography";
import { ROUTE_FRAGMENT, ROUTE_VERTEX } from "./shaders";

const STEPS_PER_LEG = 160;
/** Above the surface at the ends, so the line never sinks into the planet. */
const HEIGHT_AT_THE_ENDS = 0.0035;
/** The arch's height at a leg's middle, for each radian the leg covers. */
const ARCH_PER_RADIAN = 0.018;
const WIDTH_PIXELS = 2.4;

export type Route = ReturnType<typeof makeRoute>;

export function makeRoute(places: Place[], cityLight: Color) {
  const stops = places.map(surfacePoint);
  const legs = stops.slice(1).map((end, leg) => ({
    start: stops[leg],
    end,
    angle: arcBetween(stops[leg], end),
  }));
  const totalAngle = legs.reduce((total, leg) => total + leg.angle, 0);
  /** Where each stop falls on the route's progress, from 0 to 1. */
  const stopProgress = legs.reduce<number[]>(
    (shares, leg) => [
      ...shares,
      shares[shares.length - 1] + leg.angle / totalAngle,
    ],
    [0],
  );

  /** A point on the route, lifted in its leg's arch. */
  function pointOnLeg(legIndex: number, fraction: number) {
    const leg = legs[legIndex];
    const height =
      HEIGHT_AT_THE_ENDS +
      ARCH_PER_RADIAN * leg.angle * Math.sin(Math.PI * fraction);
    return alongGreatCircle(leg.start, leg.end, fraction).multiplyScalar(
      1 + height,
    );
  }

  const samples: { point: Vector3; along: number }[] = [];
  legs.forEach((_, legIndex) => {
    for (let step = legIndex === 0 ? 0 : 1; step <= STEPS_PER_LEG; step++) {
      const fraction = step / STEPS_PER_LEG;
      const along =
        stopProgress[legIndex] +
        fraction * (stopProgress[legIndex + 1] - stopProgress[legIndex]);
      samples.push({ point: pointOnLeg(legIndex, fraction), along });
    }
  });

  // Each sample becomes two corners, one either side of the line; the last looks ahead along its own direction.
  const corners = samples.length * 2;
  const places3 = new Float32Array(corners * 3);
  const nextPlaces = new Float32Array(corners * 3);
  const sides = new Float32Array(corners);
  const alongs = new Float32Array(corners);
  samples.forEach((sample, index) => {
    const next =
      index < samples.length - 1
        ? samples[index + 1].point
        : sample.point
            .clone()
            .multiplyScalar(2)
            .sub(samples[index - 1].point);
    for (const [corner, side] of [
      [index * 2, -1],
      [index * 2 + 1, 1],
    ]) {
      places3.set(sample.point.toArray(), corner * 3);
      nextPlaces.set(next.toArray(), corner * 3);
      sides[corner] = side;
      alongs[corner] = sample.along;
    }
  });
  const triangles: number[] = [];
  for (let index = 0; index < samples.length - 1; index++) {
    const corner = index * 2;
    triangles.push(
      corner,
      corner + 1,
      corner + 2,
      corner + 1,
      corner + 3,
      corner + 2,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(places3, 3));
  geometry.setAttribute("nextPlace", new BufferAttribute(nextPlaces, 3));
  geometry.setAttribute("side", new BufferAttribute(sides, 1));
  geometry.setAttribute("along", new BufferAttribute(alongs, 1));
  geometry.setIndex(triangles);

  const material = new ShaderMaterial({
    vertexShader: ROUTE_VERTEX,
    fragmentShader: ROUTE_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    // The ribbon's corners are pushed out on the screen, so which way round a triangle winds depends on the view.
    side: DoubleSide,
    uniforms: {
      drawingSize: { value: new Vector2(1, 1) },
      widthPixels: { value: WIDTH_PIXELS },
      progress: { value: 0 },
      cityLight: { value: cityLight },
      strength: { value: 1 },
    },
  });
  const ribbon = new Mesh(geometry, material);
  ribbon.renderOrder = 2;
  ribbon.frustumCulled = false;

  return {
    ribbon,
    stopProgress,
    setDrawingSize(width: number, height: number, pixelRatio: number) {
      material.uniforms.drawingSize.value.set(width, height);
      material.uniforms.widthPixels.value = WIDTH_PIXELS * pixelRatio;
    },
    /*
      The ribbon is drawn even before it grows (the shader leaves every pixel out), so its program is built with the
      first frame, not in the middle of the first leg's flight.
    */
    setProgress(progress: number) {
      material.uniforms.progress.value = progress;
    },
  };
}

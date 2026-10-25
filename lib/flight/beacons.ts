/*
  The three cities' lights, brighter than everything around them. A city's light swells once when the camera arrives
  at it.
*/
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
} from "three";
import { surfacePoint, type Place } from "./geography";
import { BEACONS_FRAGMENT, BEACONS_VERTEX } from "./shaders";

/** A beacon's glow in planet radii, about 80 km across, before the size limits on screen. */
const GLOW_SIZE = 0.013;
/** Lifted a little off the surface, so the planet never hides a beacon that faces the camera. */
const LIFT = 1.004;
/** The last city is where the story is now, and burns brightest. */
const NOW_BRIGHTER = 1.35;

/** How bright a city's light is against the others: the last on the route is now. */
const cityBrightness = (city: number, cities: number) =>
  city === cities - 1 ? NOW_BRIGHTER : 1;

export type Beacons = ReturnType<typeof makeBeacons>;

export function makeBeacons(places: Place[], cityLight: Color) {
  const count = places.length;
  const positions = new Float32Array(count * 3);
  places.forEach((place, index) =>
    positions.set(
      surfacePoint(place).multiplyScalar(LIFT).toArray(),
      index * 3,
    ),
  );
  const swells = new Float32Array(count);
  const presences = new Float32Array(count).fill(1);
  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  const swellAttribute = new BufferAttribute(swells, 1);
  const presenceAttribute = new BufferAttribute(presences, 1);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("swell", swellAttribute);
  geometry.setAttribute("presence", presenceAttribute);
  const material = new ShaderMaterial({
    vertexShader: BEACONS_VERTEX,
    fragmentShader: BEACONS_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    uniforms: {
      pixelRatio: { value: 1 },
      projectionScale: { value: 1 },
      glowSize: { value: GLOW_SIZE },
      cityLight: { value: cityLight },
    },
  });
  const points = new Points(geometry, material);
  points.renderOrder = 2;
  points.frustumCulled = false;

  return {
    points,
    /** How big a thing one unit across looks at one unit away, in drawing pixels, for the camera's lens. */
    setLens(
      drawingHeight: number,
      fieldOfViewDegrees: number,
      pixelRatio: number,
    ) {
      const halfField = (fieldOfViewDegrees * Math.PI) / 360;
      material.uniforms.projectionScale.value =
        drawingHeight / 2 / Math.tan(halfField);
      material.uniforms.pixelRatio.value = pixelRatio;
    },
    /** The cities' lights all at once: 0 is unlit, 1 lit, and above 1 a swell. */
    setCities(cityPresence: number, citySwells: number[]) {
      for (let city = 0; city < places.length; city++) {
        presences[city] = cityPresence * cityBrightness(city, places.length);
        swells[city] = citySwells[city] ?? 0;
      }
      presenceAttribute.needsUpdate = true;
      swellAttribute.needsUpdate = true;
    },
  };
}

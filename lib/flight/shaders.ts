/*
  The flight's shaders. Light is worked out in linear values and squeezed into range with a soft exponential curve
  (bright lights roll off to white rather than clipping), then three.js's colour-space chunk turns it into sRGB for
  the screen. The night map is an sRGB texture, decoded to linear light as it is read; the packed surface map holds
  data, not colour, and is read as it is.
*/

const SOFT_CURVE = /* glsl */ `
vec3 softCurve(vec3 light) { return 1.0 - exp(-light); }
`;

export const GLOBE_VERTEX = /* glsl */ `
varying vec3 surfaceNormal;
varying vec3 worldPlace;
void main() {
  surfaceNormal = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  worldPlace = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/*
  The planet. The night map (NASA's Black Marble) gives the moonlit land and the city lights; the packed surface map
  (relief in red, land in green, clouds in blue) gives the clouds and the land for the thin twilight at the sunrise
  edge. Before the maps arrive the planet is a bare dark sphere with its rim, so the first screen is never empty.
*/
export const GLOBE_FRAGMENT = /* glsl */ `
uniform sampler2D nightMap;
uniform sampler2D surfaceMap;
uniform float nightShown;
uniform float surfaceShown;
uniform float lightsReveal;
uniform vec3 sunDirection;
uniform vec3 hazeColour;
uniform float hazeDensity;
uniform vec3 rimColour;
uniform float rimStrength;
uniform float lightsGain;
uniform float landGain;
uniform vec3 landTint;
uniform vec3 bareColour;
varying vec3 surfaceNormal;
varying vec3 worldPlace;

const float PI = 3.141592653589793;
${SOFT_CURVE}

vec2 mapPlace(vec3 normal) {
  float longitude = atan(normal.x, normal.z);
  float latitude = asin(clamp(normal.y, -1.0, 1.0));
  return vec2(longitude / (2.0 * PI) + 0.5, 0.5 - latitude / PI);
}

// The map's two edges meet at the date line. Its slopes across the screen come from whichever copy of the place has
// its seam further away, so the textures are not read at their blurriest along that line.
void slopesAcrossScreen(vec2 place, out vec2 alongX, out vec2 alongY) {
  vec2 seamAway = vec2(fract(place.x + 0.5), place.y);
  vec2 xNear = dFdx(place), yNear = dFdy(place);
  vec2 xAway = dFdx(seamAway), yAway = dFdy(seamAway);
  alongX = vec2(abs(xNear.x) < abs(xAway.x) ? xNear.x : xAway.x, xNear.y);
  alongY = vec2(abs(yNear.x) < abs(yAway.x) ? yNear.x : yAway.x, yNear.y);
}

void main() {
  vec3 normal = normalize(surfaceNormal);
  vec3 towardCamera = normalize(cameraPosition - worldPlace);
  float facing = max(dot(normal, towardCamera), 0.0);
  float sunHeight = dot(normal, sunDirection);

  vec2 place = mapPlace(normal);
  vec2 alongX, alongY;
  slopesAcrossScreen(place, alongX, alongY);
  vec3 night = textureGrad(nightMap, place, alongX, alongY).rgb;
  vec3 packedSurface = textureGrad(surfaceMap, place, alongX, alongY).rgb;
  float land = smoothstep(0.25, 0.75, packedSurface.g) * surfaceShown;
  float cloud = smoothstep(0.2, 0.95, packedSurface.b) * surfaceShown;

  // The lights are the bright part of the night map; the dim part is moonlit land and sea.
  float brightness = dot(night, vec3(0.2126, 0.7152, 0.0722));
  float lightShare = smoothstep(0.012, 0.2, brightness);
  vec3 moonlit = night * (1.0 - lightShare) * landGain * landTint;
  vec3 lights = night * lightShare * lightsGain;

  // On arrival the lights come on in a sweep, from midnight toward the coming dawn.
  float towardMidnight = -sunHeight;
  float sweepEdge = mix(1.15, -0.7, lightsReveal);
  lights *= smoothstep(sweepEdge, sweepEdge + 0.35, towardMidnight);
  // Twilight washes the lights out; thick cloud softens them.
  lights *= 1.0 - smoothstep(-0.1, 0.1, sunHeight);
  lights *= 1.0 - 0.3 * cloud;

  vec3 light = mix(bareColour, moonlit, nightShown) + lights * nightShown;

  // The thin twilight along the dawn edge: blue-grey, the clouds catching it first. Never a painted day.
  float twilight = smoothstep(-0.2, 0.08, sunHeight);
  vec3 twilightSurface = mix(vec3(0.010, 0.018, 0.034), vec3(0.020, 0.024, 0.030), land) + cloud * vec3(0.07, 0.08, 0.10);
  light += twilight * twilightSurface * 1.6;

  // The atmosphere seen edge-on just inside the planet's edge: faint on the night side, stronger toward the dawn.
  float edgeOn = pow(1.0 - facing, 4.0);
  light += rimColour * edgeOn * rimStrength * (0.04 + 0.5 * twilight);

  // Haze over the surface: the further the ground, the more the place's own air colours it.
  float distanceAway = length(cameraPosition - worldPlace);
  float haze = (1.0 - exp(-hazeDensity * max(distanceAway - 0.25, 0.0))) * 0.85;
  light = mix(light, hazeColour, haze);

  gl_FragColor = vec4(softCurve(light), 1.0);
  #include <colorspace_fragment>
}
`;

export const SHELL_VERTEX = /* glsl */ `
varying vec3 worldPlace;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  worldPlace = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/*
  The atmosphere beyond the planet's edge, worked out along each line of sight rather than painted on a shell: how
  high above the surface the line passes decides how much glow it meets. Lit air glows blue, air where the sun is
  just under the horizon glows warm, and on the night side a thin line of airglow rides about 90 km up.
*/
export const SHELL_FRAGMENT = /* glsl */ `
uniform vec3 sunDirection;
uniform vec3 rimColour;
uniform float rimStrength;
uniform vec3 airglowColour;
uniform float airglowStrength;
uniform vec3 dawnColour;
uniform float shown;
varying vec3 worldPlace;

const float GLOW_THICKNESS = 0.009;
const float AIRGLOW_HEIGHT = 0.0145;
const float AIRGLOW_THICKNESS = 0.0028;
${SOFT_CURVE}

void main() {
  vec3 sight = normalize(worldPlace - cameraPosition);
  float alongSight = -dot(cameraPosition, sight);
  vec3 nearest = cameraPosition + sight * alongSight;
  float heightAbove = length(nearest) - 1.0;
  if (alongSight < 0.0 || heightAbove < 0.0) discard;

  float sunHeight = dot(normalize(nearest), sunDirection);
  float lit = smoothstep(-0.22, 0.25, sunHeight);
  float glow = exp(-heightAbove / GLOW_THICKNESS);
  vec3 light = rimColour * glow * (0.06 + 1.5 * lit) * rimStrength;

  float dawn = smoothstep(-0.32, -0.04, sunHeight) * (1.0 - smoothstep(0.0, 0.3, sunHeight));
  light += dawnColour * dawn * exp(-heightAbove / (GLOW_THICKNESS * 0.45)) * rimStrength;

  float airglowBand = exp(-pow((heightAbove - AIRGLOW_HEIGHT) / AIRGLOW_THICKNESS, 2.0));
  light += airglowColour * airglowBand * (1.0 - lit) * airglowStrength * 0.32;

  gl_FragColor = vec4(softCurve(light) * shown, 1.0);
  #include <colorspace_fragment>
}
`;

export const STARS_VERTEX = /* glsl */ `
attribute float size;
attribute float brightness;
attribute vec3 tint;
uniform float pixelRatio;
uniform float starBrightness;
varying vec3 starLight;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * pixelRatio;
  starLight = tint * brightness * starBrightness;
}
`;

export const STARS_FRAGMENT = /* glsl */ `
varying vec3 starLight;
void main() {
  float fromCentre = length(gl_PointCoord - 0.5) * 2.0;
  float fall = smoothstep(1.0, 0.0, fromCentre);
  gl_FragColor = vec4(starLight * fall * fall, 1.0);
  #include <colorspace_fragment>
}
`;

/*
  The three cities. Each is a point of light a little above the surface, sized by how far it is from the camera, with
  a core that burns white and a halo in the city light's amber.
*/
export const BEACONS_VERTEX = /* glsl */ `
attribute float swell;
attribute float presence;
uniform float pixelRatio;
uniform float projectionScale;
uniform float glowSize;
varying float beaconSwell;
varying float beaconPresence;
void main() {
  vec4 viewPlace = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPlace;
  float pixels = glowSize * projectionScale / max(-viewPlace.z, 0.001);
  gl_PointSize = clamp(pixels * (1.0 + 0.6 * swell), 11.0 * pixelRatio, 52.0 * pixelRatio);
  beaconSwell = swell;
  beaconPresence = presence;
}
`;

export const BEACONS_FRAGMENT = /* glsl */ `
uniform vec3 cityLight;
${SOFT_CURVE}
varying float beaconSwell;
varying float beaconPresence;
void main() {
  float fromCentre = length(gl_PointCoord - 0.5) * 2.0;
  if (fromCentre > 1.0) discard;
  float core = exp(-fromCentre * fromCentre * 60.0);
  float halo = exp(-fromCentre * 5.0) * (1.0 - fromCentre);
  vec3 light = mix(cityLight, vec3(1.0, 0.97, 0.9), core) * (core * 2.6 + halo * 1.1);
  light *= beaconPresence * (1.0 + 1.4 * beaconSwell);
  gl_FragColor = vec4(softCurve(light), 1.0);
  #include <colorspace_fragment>
}
`;

/*
  The route: a ribbon a few pixels wide whatever the distance, each corner pushed out sideways on the screen. It grows
  by a progress value: the part beyond it is not drawn, and the last stretch before it burns brighter.
*/
export const ROUTE_VERTEX = /* glsl */ `
attribute vec3 nextPlace;
attribute float side;
attribute float along;
uniform vec2 drawingSize;
uniform float widthPixels;
varying float routeAlong;
varying float routeSide;
void main() {
  vec4 here = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 next = projectionMatrix * modelViewMatrix * vec4(nextPlace, 1.0);
  vec2 hereOnScreen = here.xy / here.w * drawingSize * 0.5;
  vec2 nextOnScreen = next.xy / next.w * drawingSize * 0.5;
  vec2 direction = normalize(nextOnScreen - hereOnScreen + vec2(1e-6, 0.0));
  vec2 sideways = vec2(-direction.y, direction.x);
  here.xy += sideways * side * widthPixels * 0.5 / (drawingSize * 0.5) * here.w;
  gl_Position = here;
  routeAlong = along;
  routeSide = side;
}
`;

export const ROUTE_FRAGMENT = /* glsl */ `
uniform float progress;
uniform vec3 cityLight;
uniform float strength;
${SOFT_CURVE}
varying float routeAlong;
varying float routeSide;
void main() {
  if (routeAlong >= progress) discard;
  float acrossFade = 1.0 - smoothstep(0.2, 1.0, abs(routeSide));
  float nearHead = smoothstep(progress - 0.05, progress, routeAlong);
  vec3 light = cityLight * acrossFade * (0.55 + 2.2 * nearHead * nearHead) * strength;
  gl_FragColor = vec4(softCurve(light), 1.0);
  #include <colorspace_fragment>
}
`;

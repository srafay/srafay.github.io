/*
  The light of each place: the colour of the space behind the planet, the haze over its surface, its rim, its airglow,
  how bright the city lights burn and how bright the stars are. The camera blends from one to the next as it flies,
  so arriving somewhere changes the whole scene, not just the words.

  Colours are sRGB hex, as a designer reads them; the scene converts them to linear light.
*/
import { Color } from "three";
import { mix } from "./motion";

export type Grade = {
  /** The space behind everything. */
  space: Color;
  /** Haze over the surface, thicker the further the surface is from the camera. */
  haze: Color;
  hazeDensity: number;
  /** The atmosphere's glow along the planet's edge. */
  rim: Color;
  rimStrength: number;
  /** The thin layer of airglow that rides above the night side's edge, seen from orbit. */
  airglow: Color;
  airglowStrength: number;
  /** How bright the city lights burn, and how bright the moonlit land is under them and what colour it takes on. */
  lightsGain: number;
  landGain: number;
  landTint: Color;
  starBrightness: number;
};

type GradeInSrgb = Omit<
  Grade,
  "space" | "haze" | "rim" | "airglow" | "landTint"
> & {
  space: string;
  haze: string;
  rim: string;
  airglow: string;
  landTint: string;
};

const fromSrgb = (grade: GradeInSrgb): Grade => ({
  ...grade,
  space: new Color(grade.space),
  haze: new Color(grade.haze),
  rim: new Color(grade.rim),
  airglow: new Color(grade.airglow),
  landTint: new Color(grade.landTint),
});

/** Clear space: the planet from far off, as on the first screen and the last. */
export const ORBIT = fromSrgb({
  space: "#03040a",
  haze: "#0a1426",
  hazeDensity: 0,
  rim: "#5aa7ff",
  rimStrength: 1,
  airglow: "#6fb2ff",
  airglowStrength: 0.9,
  lightsGain: 1.6,
  landGain: 1,
  landTint: "#ffffff",
  starBrightness: 1,
});

/*
  Karachi: a dust-warm night. Dust off the deserts hangs over the city much of the year, and its streets burn
  sodium orange, so the haze and the rim go warm and the stars dim behind it.
*/
export const KARACHI = fromSrgb({
  space: "#0b0805",
  haze: "#3a2414",
  hazeDensity: 0.55,
  rim: "#d99a62",
  rimStrength: 0.4,
  airglow: "#d9a070",
  airglowStrength: 0.16,
  lightsGain: 1.8,
  landGain: 1.2,
  landTint: "#e2b48e",
  starBrightness: 0.55,
});

/*
  Darwin: the Top End's wet season, humid and green-black. From orbit the night side's edge carries a thin green
  line of airglow; it is kept low so it reads as light in the sky, not as a colour laid on the page.
*/
export const DARWIN = fromSrgb({
  space: "#030705",
  haze: "#0c2419",
  hazeDensity: 0.5,
  rim: "#4f9fae",
  rimStrength: 0.75,
  airglow: "#58cf96",
  airglowStrength: 0.5,
  lightsGain: 1.7,
  landGain: 1.15,
  landTint: "#bcd9c6",
  starBrightness: 0.8,
});

/*
  Sydney: harbour blue. Clear air, a blue rim, and the sun just under the horizon ahead, over the Pacific: Now looks
  east into the first light. The brightest stop.
*/
export const SYDNEY = fromSrgb({
  space: "#030918",
  haze: "#0b2348",
  hazeDensity: 0.3,
  rim: "#6fb6ff",
  rimStrength: 1.15,
  airglow: "#7cbcff",
  airglowStrength: 0.7,
  lightsGain: 2.1,
  landGain: 1,
  landTint: "#cbd9ff",
  starBrightness: 0.9,
});

export function mixGrades(from: Grade, to: Grade, fraction: number): Grade {
  const mixNumber = (key: keyof Grade) =>
    mix(from[key] as number, to[key] as number, fraction);
  const mixColour = (key: "space" | "haze" | "rim" | "airglow" | "landTint") =>
    from[key].clone().lerp(to[key], fraction);
  return {
    space: mixColour("space"),
    haze: mixColour("haze"),
    hazeDensity: mixNumber("hazeDensity"),
    rim: mixColour("rim"),
    rimStrength: mixNumber("rimStrength"),
    airglow: mixColour("airglow"),
    airglowStrength: mixNumber("airglowStrength"),
    lightsGain: mixNumber("lightsGain"),
    landGain: mixNumber("landGain"),
    landTint: mixColour("landTint"),
    starBrightness: mixNumber("starBrightness"),
  };
}

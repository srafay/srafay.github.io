/*
  The tricks the python does on a button. Each is a function of how far through it is (0 to 1): it takes the spine
  the python would have held and returns the spine to draw, and may turn the head, set the tongue, swell the body or
  show something more (a sneeze, a shed skin, a bug). With reduced motion a trick is one pose held still, at stillAt.
  What happens off the canvas (a flash, a beat, a bubble to hide behind) is the page's, keyed by the trick's name.
*/
import type { HeadFrame, PythonModel } from "./model";
import { tieKnot, knotWeight } from "./knot";
import { add, boundsOf, lerpPoint, point, scale, type Point, type Spine } from "./spine";

export type TrickKey = "coil" | "knot" | "peekaboo" | "sneeze" | "dance" | "selfie" | "hiss" | "shed" | "eatBug";

/** What a trick knows about where it began. */
export type TrickStart = { spine: Spine; bodyLength: number; towardRoom: number };

export type TrickPlay = {
  /** How long it takes, in seconds. */
  seconds: number;
  /** The share of the trick shown, held still, under reduced motion. */
  stillAt: number;
  body(spine: Spine, share: number, start: TrickStart): Spine;
  head?(frame: HeadFrame, share: number, start: TrickStart): HeadFrame;
  /** How far the tongue is out, where the trick sets it. */
  tongue?(share: number): number | null;
  /** Something swallowed on its way down the body. */
  bulge?(share: number): { at: number; size: number } | null;
  /** What the trick shows besides the body: a sneeze, a shed skin, a bug. */
  extras?(model: PythonModel, share: number, start: TrickStart, frame: HeadFrame): void;
};

const smooth = (share: number) => {
  const clamped = Math.min(1, Math.max(0, share));
  return clamped * clamped * (3 - 2 * clamped);
};

/** In over the first part, held, out over the last part. */
const envelope = (share: number, into = 0.25, outOf = 0.75) =>
  share < into ? smooth(share / into) : share > outOf ? smooth((1 - share) / (1 - outOf)) : 1;

/** A spine moved by an offset, more toward the head when weighted. */
const shifted = (spine: Spine, offset: (index: number) => Point) => spine.map((each, index) => add(each, offset(index)));

/** Coil: winds up into a standing spring, bounces twice on it, and unwinds. */
const coil: TrickPlay = {
  seconds: 3.2,
  stillAt: 0.5,
  body(spine, share, { bodyLength }) {
    const weight = envelope(share, 0.22, 0.78);
    const bounds = boundsOf(spine);
    const centre = (bounds.left + bounds.right) / 2;
    const radius = bodyLength * 0.07;
    const helixPoints = 31;
    const turns = (bodyLength * 0.78) / (2 * Math.PI * radius);
    const bounce = share > 0.3 && share < 0.7 ? 1 - 0.32 * Math.abs(Math.sin(((share - 0.3) / 0.4) * Math.PI * 2)) : 1;
    const height = bodyLength * 0.3 * bounce;
    const link = bodyLength / (spine.length - 1);
    const target = spine.map((_, index) => {
      if (index <= helixPoints) {
        const along = index / helixPoints;
        const angle = along * turns * Math.PI * 2;
        return point(centre + Math.cos(angle) * radius, bounds.bottom + along * height, Math.sin(angle) * radius);
      }
      return point(centre + radius, bounds.bottom + height + (index - helixPoints) * link * 0.9, 20);
    });
    return spine.map((each, index) => lerpPoint(each, target[index], weight));
  },
};

const knot: TrickPlay = {
  seconds: 3.6,
  stillAt: 0.5,
  body: (spine, share, { bodyLength }) => tieKnot(spine, knotWeight(share), bodyLength),
};

/** Peekaboo: sinks behind its bubble (the page moves the bubble over its face), then its head peeks out at one side. */
const peekaboo: TrickPlay = {
  seconds: 2.8,
  stillAt: 0.7,
  body(spine, share, { bodyLength, towardRoom }) {
    const sink = envelope(share, 0.2, 0.85) * bodyLength * 0.06;
    const peek = share > 0.5 && share < 0.86 ? Math.sin(((share - 0.5) / 0.36) * Math.PI) : 0;
    return shifted(spine, (index) => {
      const neck = Math.max(0, (index - 26) / 13);
      return point(towardRoom * peek * bodyLength * 0.2 * neck * neck, -sink, 0);
    });
  },
};

/** Sneeze: the head draws back, snaps forward, and a burst of light cells sprays from the snout. */
const sneeze: TrickPlay = {
  seconds: 1.8,
  stillAt: 0.45,
  body: (spine) => spine,
  head(frame, share, { bodyLength }) {
    const back = share < 0.32 ? smooth(share / 0.32) : share < 0.4 ? 1 - smooth((share - 0.32) / 0.08) * 1.6 : -0.6 * (1 - smooth((share - 0.4) / 0.3));
    return { ...frame, centre: add(frame.centre, add(scale(frame.forward, -back * bodyLength * 0.05), scale(frame.up, back * bodyLength * 0.03))) };
  },
  tongue: () => 0,
  extras: (model, share) => model.setSneeze(share > 0.34 ? (share - 0.34) / 0.55 : null),
};

/** Dance: sways side to side on a beat, the sway growing toward the head, for two bars. */
const DANCE_BEATS = 8;
const dance: TrickPlay = {
  seconds: (DANCE_BEATS * 60) / 112,
  stillAt: 0.25,
  body(spine, share, { bodyLength }) {
    const strength = envelope(share, 0.08, 0.9) * bodyLength * 0.07;
    const beat = share * DANCE_BEATS;
    return shifted(spine, (index) => {
      const along = index / (spine.length - 1);
      const sway = Math.sin(beat * Math.PI + index * 0.22) * strength * Math.pow(along, 1.3);
      const bob = -Math.abs(Math.sin(beat * Math.PI)) * strength * 0.35 * along;
      return point(sway, bob, 0);
    });
  },
};

/** Selfie: a flash (the page's), then a pose with the head tilted and the tongue out. */
const selfie: TrickPlay = {
  seconds: 2.4,
  stillAt: 0.6,
  body: (spine) => spine,
  head(frame, share) {
    const tilt = envelope(share, 0.15, 0.85) * 0.38;
    const up = add(scale(frame.up, Math.cos(tilt)), scale(frame.side, Math.sin(tilt)));
    const side = add(scale(frame.side, Math.cos(tilt)), scale(frame.up, -Math.sin(tilt)));
    return { ...frame, up, side };
  },
  tongue: (share) => (share > 0.35 && share < 0.85 ? 1 : 0),
};

/** Hiss: rears back with its tongue flicking fast. The hiss itself is heard only with Sound on. */
const hiss: TrickPlay = {
  seconds: 1.6,
  stillAt: 0.5,
  body(spine, share, { bodyLength }) {
    const rear = envelope(share, 0.2, 0.75);
    return shifted(spine, (index) => {
      const neck = Math.max(0, (index - 24) / 15);
      return point(0, rear * neck * bodyLength * 0.07, -rear * neck * bodyLength * 0.12);
    });
  },
  tongue: (share) => (share > 0.1 && share < 0.85 ? Math.abs(Math.sin(share * 46)) : 0),
};

/** Shed: slides forward out of its skin; the old skin stays where it was and dissolves, cell by cell. */
const shed: TrickPlay = {
  seconds: 3.2,
  stillAt: 0.45,
  body(spine, share, { bodyLength, towardRoom }) {
    const away = (share < 0.55 ? smooth((share - 0.1) / 0.45) : 1 - smooth((share - 0.8) / 0.2)) * bodyLength * 0.16;
    return shifted(spine, () => point(towardRoom * away, 0, 6));
  },
  extras(model, share, start) {
    model.setShedSkin(start.spine, share < 0.15 ? 1 : Math.max(0, 1 - (share - 0.15) / 0.75));
  },
};

/** Eat a bug: a bug crawls in, the python strikes, and a bulge slides down its body. */
const eatBug: TrickPlay = {
  seconds: 3.6,
  stillAt: 0.6,
  body(spine, share, start) {
    const strike = share > 0.38 && share < 0.56 ? Math.sin(((share - 0.38) / 0.18) * Math.PI) : 0;
    if (!strike) return spine;
    const neckEnd = spine[spine.length - 1];
    const bug = bugPlace(start, share);
    return shifted(spine, (index) => {
      const weight = Math.pow(Math.max(0, (index - 28) / 11), 1.5) * strike;
      return point((bug.x - neckEnd.x) * weight * 0.8, (bug.y - neckEnd.y) * weight * 0.8, 0);
    });
  },
  bulge: (share) => (share > 0.5 ? { at: 1 - smooth((share - 0.5) / 0.48) * 0.8, size: 0.55 } : null),
  extras(model, share, start) {
    model.setBug(share < 0.47 ? bugPlace(start, share) : null, Math.sin(share * 30) * 0.25);
  },
};

/** Where the bug is: it walks in from beside the python's head toward it, then stops to be eaten. */
function bugPlace({ spine, bodyLength, towardRoom }: TrickStart, share: number): Point {
  const neck = spine[spine.length - 1];
  const along = smooth(Math.min(1, share / 0.38));
  return point(neck.x + towardRoom * bodyLength * (0.42 - 0.2 * along), neck.y - bodyLength * 0.04, 40);
}

export const tricks: Record<TrickKey, TrickPlay> = { coil, knot, peekaboo, sneeze, dance, selfie, hiss, shed, eatBug };

/** Takes away whatever a trick showed besides the body. */
export function clearExtras(model: PythonModel) {
  model.setSneeze(null);
  model.setShedSkin(null);
  model.setBug(null);
}

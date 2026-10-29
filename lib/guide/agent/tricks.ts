/*
  The tricks the agent does on a button: the tools of the assistant Syed Rafay built at Atelier, and one more. Each
  trick is a run of parts. A part that says a line lasts as long as the line takes to type, so the pose never ends
  while words are still coming; the other parts have their own length. Each trick lights its tool, and its pose is a
  function of the part and how far through it is: where its nodes go, what it attends to, and what it shows besides
  the graph (a message, the chart's bars, faint copies, personas, phantom tools). Under reduced motion a trick is one
  still pose, its lines shown whole in turn.
*/
import type * as THREE from "three";
import type { YearBar } from "./chart";
import { fanOffsets } from "./homes";
import { shape } from "./proportions";
import { NODE_COUNT, ROUTER, nodeOfTool, type ToolKey } from "./topology";
import { add, lerp, lerpPoint, point, scale, turnedInPlane, type Point } from "./vectors";

export type TrickKey = ToolKey | "hallucinate";

/** The tool a trick shows off, or null for one that is no tool's (hallucinate). */
export const toolOfTrick = (key: TrickKey | null): ToolKey | null => (key && key !== "hallucinate" ? key : null);

/** A part of a trick: its name, the line it says (if any), and when it starts and how long it lasts, in seconds. */
export type Part = { name: string; say?: string; start: number; seconds: number };

/** Where the chart stands: its baseline's left end, the step from bar to bar, how wide and tall the bars get. */
export type ChartPlan = { left: number; baseline: number; step: number; barWidth: number; tallest: number; bars: YearBar[] };

/** What a trick knows about where it began. */
export type TrickContext = {
  router: Point;
  radius: number;
  folded: number;
  /** How far the fan is turned round the router, in radians counterclockwise: a quarter turn in the den. */
  turn: number;
  /** +1 when there is more room to the right of the router, -1 to its left. */
  towardRoom: number;
  /** Where the chart stands, for the chart. */
  chart: ChartPlan | null;
  /** Whether a route goes up the page (back to the start). */
  routeUp: boolean;
};

export type BarLay = { centre: Point; width: number; height: number; tallest: boolean };
export type CopyLay = { transform: THREE.Matrix4; presence: number };
export type PersonaLay = { place: Point; radius: number; lit: boolean };
export type PhantomLay = { place: Point; size: number; bow: Point };

/** What a trick shows at a moment. Left out means none. */
export type TrickPose = {
  /** How strongly the nodes follow the trick's places, from 0 to 1. */
  weight: number;
  /** A place for each node (the router first), or null to leave a node to the graph. */
  places: (Point | null)[];
  /** How big each tool is drawn, as a share (the router's entry is unused). */
  toolScales?: number[];
  /** What it attends to: a place, or nothing to say (leave it to the page). */
  look?: Point;
  /** The lit tool. */
  lit: ToolKey | null;
  message?: { from: Point; to: Point; share: number };
  bars?: BarLay[];
  /** Copies as a share out (0 to 1) and their transforms, built by the view. */
  copiesOut?: number;
  personas?: PersonaLay[];
  phantoms?: PhantomLay[];
  phantomPresence?: number;
};

/** A moment in a trick: the part, how far through it (0 to 1), and the seconds since the trick began. */
export type Moment = { part: string; share: number; seconds: number };

export type TrickPlay = {
  /** The parts in order, each with its line where it says one, in seconds of its own (lines filled in later). */
  parts(lines: string[]): { name: string; say?: string; seconds?: number }[];
  /** The still pose under reduced motion: the part and how far through it. */
  still: { part: string; share: number };
  pose(moment: Moment, context: TrickContext): TrickPose;
};

const smooth = (share: number) => {
  const clamped = Math.min(1, Math.max(0, share));
  return clamped * clamped * (3 - 2 * clamped);
};

/** In over the first part of a span, held, out over the last part. */
const envelope = (share: number, into = 0.2, outOf = 0.8) =>
  share < into ? smooth(share / into) : share > outOf ? smooth((1 - share) / (1 - outOf)) : 1;

const noPlaces = (): (Point | null)[] => Array.from({ length: NODE_COUNT }, () => null);
const fullScales = () => Array.from({ length: NODE_COUNT }, () => 1);

/** A tool's place in the fan as the trick began, from the router. */
const restPlace = (context: TrickContext, tool: ToolKey) =>
  add(context.router, fanOffsets(context.radius, context.folded, context.turn)[nodeOfTool(tool) - 1]);

/** A place round the router at an angle from straight down (turned with the fan), at a reach, at a depth. */
const aroundRouter = (context: TrickContext, radians: number, reach: number, depth = 0) =>
  add(context.router, turnedInPlane(point(Math.sin(radians) * reach, -Math.cos(radians) * reach, depth), context.turn));

/** Web search: the ring swings out on its link and sweeps across, side to side and back, the graph turning to follow. */
const search: TrickPlay = {
  parts: ([line]) => [{ name: "sweep", say: line }],
  still: { part: "sweep", share: 0.3 },
  pose({ seconds }, context) {
    const { router, radius, folded } = context;
    const sweep = Math.min(1, seconds / 2.8);
    const weight = envelope(sweep, 0.15, 0.85);
    const reach = lerp(2.6, 3.4, Math.sin(sweep * Math.PI)) * radius * lerp(1, 0.55, folded);
    // From its own end of the fan across to the other end and back, passing in front of the other tools.
    const startDegrees = -lerp(shape.openSpread, shape.foldedSpread, folded) / 2;
    const angle = ((startDegrees - 2 * startDegrees * Math.sin(sweep * Math.PI)) * Math.PI) / 180;
    const ring = aroundRouter(context, angle, reach, radius * 1.1);
    const places = noPlaces();
    places[nodeOfTool("search")] = ring;
    const returning = Math.min(1, Math.max(0, (seconds - 2.8) / 0.5));
    return {
      weight,
      places,
      look: ring,
      lit: "search",
      message: returning > 0 && returning < 1 ? { from: restPlace(context, "search"), to: router, share: returning } : undefined,
    };
  },
};

/** Deep research: the tools orbit the router on a tilted ring while it thinks, cells running in, then it reports. */
const research: TrickPlay = {
  parts: ([thinking, report]) => [
    { name: "think", say: thinking },
    { name: "report", say: report },
  ],
  still: { part: "think", share: 0.5 },
  pose({ part, share, seconds }, context) {
    const { router, radius } = context;
    const orbit = lerp(2.1, 1.5, context.folded) * radius;
    const weight = part === "think" ? smooth(seconds / 0.6) : 1 - smooth(share / 0.35);
    const turn = seconds * 1.7;
    const places = noPlaces();
    for (let node = 1; node < NODE_COUNT; node++) {
      const angle = turn + ((node - 1) / (NODE_COUNT - 1)) * Math.PI * 2;
      places[node] = add(router, point(Math.cos(angle) * orbit, Math.sin(angle) * orbit * 0.32 - radius * 0.35, Math.sin(angle) * orbit));
    }
    const researchNode = places[nodeOfTool("research")] as Point;
    const pulse = (seconds % 0.9) / 0.9;
    return {
      weight,
      places,
      lit: "research",
      message: part === "think" && seconds > 0.6 ? { from: researchNode, to: router, share: pulse } : undefined,
    };
  },
};

/** Which of the thirteen bars each tool becomes, spread along the chart. */
const BAR_OF_TOOL = [0, 2, 5, 7, 10, 12];

/** Make a chart: the tools fly to a baseline and become six of the bars, the rest grow between them, then fold back. */
const chart: TrickPlay = {
  parts: ([line]) => [{ name: "build", seconds: 1.6 }, { name: "show", say: line }, { name: "fold", seconds: 0.9 }],
  still: { part: "show", share: 0.5 },
  pose({ part, share }, context) {
    const plan = context.chart;
    if (!plan) return { weight: 0, places: noPlaces(), lit: "chart" };
    // How far the chart has risen: up in build, standing in show, down in fold.
    const risen = part === "build" ? share : part === "show" ? 1 : 1 - share;
    const flown = smooth(risen / 0.35);
    const places = noPlaces();
    const toolScales = fullScales();
    for (let node = 1; node < NODE_COUNT; node++) {
      const slot = BAR_OF_TOOL[node - 1];
      places[node] = point(plan.left + (slot + 0.5) * plan.step, plan.baseline + plan.barWidth * 0.6, 0);
      toolScales[node] = lerp(1, 0.55, flown) * (1 - smooth((risen - 0.3) / 0.15));
    }
    const chartMiddle = plan.left + (plan.bars.length * plan.step) / 2;
    if (!context.folded) {
      const above = plan.baseline + plan.tallest + context.radius * 1.4;
      places[ROUTER] = point(Math.min(Math.max(context.router.x, plan.left + context.radius), plan.left + plan.bars.length * plan.step - context.radius), above, 0);
    }
    const tallest = Math.max(...plan.bars.map((bar) => bar.count));
    const bars = plan.bars.map((bar, index): BarLay => {
      const grown = smooth((risen - 0.32 - index * 0.025) / 0.3);
      return {
        centre: point(plan.left + (index + 0.5) * plan.step, plan.baseline, 0),
        width: plan.barWidth,
        height: (bar.count / tallest) * plan.tallest * grown,
        tallest: bar.count === tallest,
      };
    });
    return {
      weight: flown,
      places,
      toolScales,
      look: point(chartMiddle, plan.baseline + plan.tallest * 0.5, 0),
      lit: "chart",
      bars,
    };
  },
};

/** Find similar images: three faint copies fan out beside it, each a little smaller and turned, then fold back in. */
const similar: TrickPlay = {
  parts: ([line]) => [
    { name: "out", seconds: 0.5 },
    { name: "copies", say: line, seconds: 3 },
    { name: "in", seconds: 0.5 },
  ],
  still: { part: "copies", share: 0.5 },
  pose({ part, share }, context) {
    return {
      weight: 0,
      places: noPlaces(),
      lit: "similar",
      copiesOut: part === "out" ? smooth(share) : part === "in" ? 1 - smooth(share) : 1,
      look: add(context.router, point(context.towardRoom * context.radius * 3, context.radius * 0.6, 0)),
    };
  },
};

/** The persona nodes' angles below the router, in degrees from straight down. */
const PERSONA_ANGLES = [-52, 0, 52];

/** Focus group: the tools draw in, and three persona nodes grow where the fan was; each lights while it speaks. */
const focusGroup: TrickPlay = {
  parts: ([intro, first, second, third]) => [
    { name: "split", seconds: 0.8 },
    { name: "intro", say: intro },
    { name: "persona0", say: first },
    { name: "persona1", say: second },
    { name: "persona2", say: third },
    { name: "rejoin", seconds: 0.8 },
  ],
  still: { part: "intro", share: 0.5 },
  pose({ part, share }, context) {
    const { router, radius, folded } = context;
    const out = part === "split" ? smooth(share) : part === "rejoin" ? 1 - smooth(share) : 1;
    const from = restPlace(context, "focusGroup");
    const length = lerp(shape.openLinkLength, shape.foldedLinkLength, folded) * radius;
    const speaking = part.startsWith("persona") ? Number(part.slice(-1)) : -1;
    const personas = PERSONA_ANGLES.map((degrees, index): PersonaLay => {
      const place = aroundRouter(context, (degrees * Math.PI) / 180, length, index === 1 ? radius * 0.4 : 0);
      return { place: lerpPoint(from, place, out), radius: lerp(0.15, 0.5, out) * radius, lit: index === speaking };
    });
    // The tools draw in close round the router, small, to make room for the personas.
    const places = noPlaces();
    const toolScales = fullScales();
    const tucked = fanOffsets(radius * 0.5, 1, context.turn);
    for (let node = 1; node < NODE_COUNT; node++) {
      places[node] = add(router, point(tucked[node - 1].x, tucked[node - 1].y + radius * 0.2, -radius * 0.9));
      toolScales[node] = lerp(1, 0.5, out);
    }
    return { weight: out, places, toolScales, personas, lit: speaking < 0 ? "focusGroup" : null, look: speaking < 0 ? undefined : personas[speaking].place };
  },
};

/** Route: the cone points the way, a cell runs out along its link, and the page goes there. */
const route: TrickPlay = {
  parts: ([line]) => [{ name: "point", say: line, seconds: 2.6 }],
  still: { part: "point", share: 0.5 },
  pose({ share, seconds }, context) {
    const { router, radius, folded, towardRoom } = context;
    const vertical = context.routeUp ? 1 : -1;
    const direction = folded ? { x: towardRoom * 0.75, y: vertical * 0.66 } : { x: towardRoom * 0.3, y: vertical };
    const across = Math.hypot(direction.x, direction.y);
    const reach = lerp(3.1, 2.2, folded) * radius;
    const cone = add(router, point((direction.x / across) * reach, (direction.y / across) * reach, radius * 0.6));
    const places = noPlaces();
    places[nodeOfTool("route")] = cone;
    const running = Math.min(1, Math.max(0, (seconds - 0.25) / 0.45));
    return {
      weight: envelope(share, 0.12, 0.85),
      places,
      lit: "route",
      look: add(router, scale(point(direction.x, direction.y, 0), radius * 6)),
      message: running > 0 && running < 1 ? { from: router, to: cone, share: running } : undefined,
    };
  },
};

/** The phantoms' angles below the router, between and beyond the real tools, in degrees from straight down. */
const PHANTOM_ANGLES = [-98, -30, 0, 30, 98];

/** Hallucinate: five faint tools bloom on wobbling links among the six real ones, then dissolve. */
const hallucinate: TrickPlay = {
  parts: ([claim, retraction]) => [
    { name: "bloom", seconds: 0.8 },
    { name: "claim", say: claim },
    { name: "retract", say: retraction },
  ],
  still: { part: "claim", share: 0.5 },
  pose({ part, share, seconds }, context) {
    const { radius, folded } = context;
    const grown = part === "bloom" ? smooth(share) : 1;
    const presence = part === "retract" ? 0.72 * (1 - smooth(share / 0.25)) : 0.72;
    const length = lerp(shape.openLinkLength, shape.foldedLinkLength, folded) * radius * 1.12;
    const spread = lerp(1, 0.7, folded);
    const phantoms = PHANTOM_ANGLES.map((degrees, index): PhantomLay => {
      const angle = ((degrees * spread + Math.sin(seconds * 3 + index) * 6) * Math.PI) / 180;
      const wobble = Math.sin(seconds * 5 + index * 1.7) * radius * 0.3;
      return {
        place: aroundRouter(context, angle, length * grown, (index % 2 ? -1 : 1) * radius * 0.8),
        size: shape.toolSize * radius * 0.9 * grown,
        bow: point(wobble, wobble * 0.5, 0),
      };
    });
    return { weight: 0, places: noPlaces(), lit: null, phantoms, phantomPresence: presence };
  },
};

export const tricks: Record<TrickKey, TrickPlay> = { search, research, chart, similar, focusGroup, route, hallucinate };

/** The order the tricks are offered in: the six tools, then the one that is not. */
export const TRICK_ORDER: TrickKey[] = ["search", "research", "chart", "similar", "focusGroup", "route", "hallucinate"];

/**
 * A trick's parts laid out in time. A part with a line lasts its line's time to say and a hold after, or its own
 * length if longer; under reduced motion a line part lasts the bubble's least stay and a part with no line passes at once.
 */
export function timeline(play: TrickPlay, lines: string[], secondsToSay: (line: string) => number, reducedMotion: boolean): { parts: Part[]; seconds: number } {
  let start = 0;
  const parts = play.parts(lines).map((each) => {
    const seconds = reducedMotion
      ? each.say
        ? 2.6
        : 0
      : Math.max(each.seconds ?? 0, each.say ? secondsToSay(each.say) + 0.9 : 0);
    const part: Part = { name: each.name, say: each.say, start, seconds };
    start += seconds;
    return part;
  });
  return { parts, seconds: Math.max(reducedMotion ? 1.5 : 0, start) };
}

/** Which part is playing at a time, and how far through it. */
export function momentAt(parts: Part[], seconds: number): Moment {
  for (const part of parts)
    if (seconds < part.start + part.seconds || part === parts[parts.length - 1])
      return { part: part.name, share: part.seconds ? Math.min(1, Math.max(0, (seconds - part.start) / part.seconds)) : 1, seconds };
  return { part: "", share: 1, seconds };
}

/*
  How the agent is shaped, as shares of its router's radius, so a phone's agent and a computer's are the same graph at
  two sizes. Each size and each share is one function or one number here, so changing one changes nothing else.
*/

/** The graph's shape, each a share of the router's radius. */
export const shape = {
  /** From the router's centre to a tool's centre, when the fan is open. */
  openLinkLength: 2.35,
  /** The same, folded compact in the den or a narrow margin. */
  foldedLinkLength: 1.95,
  /** A tool node's half size: its shape fits in a ball about this big. */
  toolSize: 0.58,
  /** A link's thickness, from side to side. */
  linkThickness: 0.16,
  /** How far apart, in degrees, the first and last tools sit round the bottom of the router: past level at each end. */
  openSpread: 180,
  foldedSpread: 124,
  /** The route's cone sits over the router on a short link, to aim: it stays within the bubble's keep-clear reach. */
  coneLinkLength: 1.5,
  /** How much longer and shorter the links are, alternately, so the tools sit in a staggered arc, not a row of feet. */
  linkStagger: 0.12,
  /** How far each tool sits in front of or behind the router, alternately, so the graph is a real solid. */
  openDepth: 0.55,
  foldedDepth: 0.3,
  /** How big the tools are drawn when the fan is folded, as a share of their open size, so they never crowd. */
  foldedToolScale: 0.72,
};

/** The fan's width, open and folded, from its outer tools' far edges, as shares of the radius: for fitting a margin. */
export const openWidthShare = () =>
  2 * (shape.openLinkLength * Math.sin(((shape.openSpread / 2) * Math.PI) / 180) + shape.toolSize);
export const foldedWidthShare = () =>
  2 * (shape.foldedLinkLength * Math.sin(((shape.foldedSpread / 2) * Math.PI) / 180) + shape.toolSize * shape.foldedToolScale);


/** The router's radius on a phone's first screen: about an eighth of the width, so the graph is never modest. */
export function helloRadiusOnPhone(viewportWidth: number) {
  return Math.min(52, Math.max(40, viewportWidth * 0.117));
}

/** The router's radius on a computer's first screen. */
export function helloRadiusOnComputer(viewportWidth: number) {
  return Math.min(72, Math.max(52, viewportWidth * 0.0445));
}

/**
 * The router's radius in the den, where the folded fan lies on its side: small enough that its height, the fan's
 * reach above and below the router, stands inside the strip.
 */
export function denRadius(denTop: number, denFloor: number) {
  const halfHeight = shape.foldedLinkLength * (1 + shape.linkStagger) * Math.sin(((shape.foldedSpread / 2) * Math.PI) / 180) + shape.toolSize * shape.foldedToolScale;
  return Math.min(22, (denTop - denFloor - 8) / (2 * halfHeight));
}

/** The side margin a section leaves on a computer, from the tour's 760 px column. */
export const sideMargin = (viewportWidth: number) => Math.max(64, (viewportWidth - 760) / 2);

/**
 * The router's radius in a computer's side margin, and whether the fan has to fold to fit: open when the margin
 * holds an open fan at least 30 px in radius, folded otherwise.
 */
export function marginFit(viewportWidth: number) {
  const room = sideMargin(viewportWidth) - 32;
  const open = Math.min(46, room / openWidthShare());
  if (open >= 30) return { radius: open, folded: false };
  return { radius: Math.max(18, Math.min(46, room / foldedWidthShare())), folded: true };
}

/** The canvas's side in CSS pixels: the largest graph with its widest trick round it. */
export const canvasSideFor = (largestRadius: number) => largestRadius * 9.6 + 24;

/**
 * How big a message is, in dither cells: four on the first screen's agent, scaled with a smaller agent, never under
 * two (one cell would be under 2 CSS pixels on a phone, too small to see).
 */
export const messageSizeInCells = (sizeShare: number) => Math.max(2, Math.round(4 * sizeShare));

/*
  Every icon the page draws, defined once. The scene's atlas draws a glyph into the same bitmap as its word. The HTML
  (the switches, the cards, the skills sheet, the controls, the links) builds inline SVG from the same paths.

  Line glyphs come from lucide (ISC), turned from its shapes into path data and stroked. Technology marks come from
  Simple Icons (CC0) and are filled. Both are named imports, so the bundle carries only these glyphs and a renamed
  icon breaks the build. Every glyph is drawn in its word's own colour: no brand colours.
*/
import {
  BookOpen,
  Bot,
  BrainCircuit,
  Brain,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CodeXml,
  Container,
  Database,
  FlaskConical,
  FolderCode,
  GitBranch,
  Globe,
  GraduationCap,
  Heart,
  Link,
  MapPin,
  MessagesSquare,
  Microscope,
  Moon,
  Package,
  ScrollText,
  Search,
  Server,
  Shapes,
  ShieldCheck,
  Tags,
  Users,
  Wrench,
  X,
  AppWindow,
  Minus,
  Plus,
  RotateCcw,
  type IconNode,
} from "lucide";
import { siDota2, siGithub, siPython, siStackoverflow } from "simple-icons";

/** A glyph on a 24 unit grid: lucide's are stroked lines, Simple Icons' are filled shapes. */
export type Glyph = {
  name: string;
  drawing: "stroke" | "fill";
  paths: string[];
};

/** A Simple Icons entry, as far as this page reads it. */
export type SimpleIcon = { title: string; slug: string; path: string };

/** How wide a lucide line is drawn on its 24 grid: the site's own line icons are 1.25 on a 16 grid. */
export const LINE_WEIGHT = 1.875;

const numbers = (
  attributes: Record<string, string | number | undefined>,
  ...names: string[]
) => names.map((name) => Number(attributes[name] ?? 0));

/** A rectangle, its corners rounded where lucide rounds them, as path data. */
function rectanglePath(
  attributes: Record<string, string | number | undefined>,
) {
  const [x, y, width, height] = numbers(
    attributes,
    "x",
    "y",
    "width",
    "height",
  );
  const roundAcross = Math.min(
    Number(attributes.rx ?? attributes.ry ?? 0),
    width / 2,
  );
  const roundUp = Math.min(
    Number(attributes.ry ?? attributes.rx ?? 0),
    height / 2,
  );
  if (!roundAcross && !roundUp)
    return `M${x} ${y}h${width}v${height}h${-width}z`;
  return [
    `M${x + roundAcross} ${y}`,
    `h${width - 2 * roundAcross}`,
    `a${roundAcross} ${roundUp} 0 0 1 ${roundAcross} ${roundUp}`,
    `v${height - 2 * roundUp}`,
    `a${roundAcross} ${roundUp} 0 0 1 ${-roundAcross} ${roundUp}`,
    `h${-(width - 2 * roundAcross)}`,
    `a${roundAcross} ${roundUp} 0 0 1 ${-roundAcross} ${-roundUp}`,
    `v${-(height - 2 * roundUp)}`,
    `a${roundAcross} ${roundUp} 0 0 1 ${roundAcross} ${-roundUp}z`,
  ].join("");
}

/** An ellipse (a circle when both radii match) as two arcs. */
function ellipsePath(
  centreAcross: number,
  centreUp: number,
  radiusAcross: number,
  radiusUp: number,
) {
  return `M${centreAcross - radiusAcross} ${centreUp}a${radiusAcross} ${radiusUp} 0 1 0 ${2 * radiusAcross} 0a${radiusAcross} ${radiusUp} 0 1 0 ${-2 * radiusAcross} 0`;
}

const pointsPath = (points: string, closed: boolean) => {
  const pairs = points
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  let path = "";
  for (let index = 0; index < pairs.length; index += 2)
    path += `${index ? "L" : "M"}${pairs[index]} ${pairs[index + 1]}`;
  return closed ? `${path}z` : path;
};

/** One lucide shape as path data. */
function shapePath([tag, attributes]: IconNode[number]) {
  const values = attributes as Record<string, string | number | undefined>;
  if (tag === "path") return String(values.d);
  if (tag === "circle") {
    const [centreAcross, centreUp, radius] = numbers(values, "cx", "cy", "r");
    return ellipsePath(centreAcross, centreUp, radius, radius);
  }
  if (tag === "ellipse") {
    const [centreAcross, centreUp, radiusAcross, radiusUp] = numbers(
      values,
      "cx",
      "cy",
      "rx",
      "ry",
    );
    return ellipsePath(centreAcross, centreUp, radiusAcross, radiusUp);
  }
  if (tag === "rect") return rectanglePath(values);
  if (tag === "line") {
    const [fromAcross, fromUp, toAcross, toUp] = numbers(
      values,
      "x1",
      "y1",
      "x2",
      "y2",
    );
    return `M${fromAcross} ${fromUp}L${toAcross} ${toUp}`;
  }
  if (tag === "polyline") return pointsPath(String(values.points), false);
  if (tag === "polygon") return pointsPath(String(values.points), true);
  throw new Error(`A lucide icon uses a shape this page cannot draw: ${tag}`);
}

export const lineGlyph = (name: string, node: IconNode): Glyph => ({
  name,
  drawing: "stroke",
  paths: node.map(shapePath),
});

export const markGlyph = (icon: SimpleIcon): Glyph => ({
  name: icon.slug,
  drawing: "fill",
  paths: [icon.path],
});

/** The five worlds. */
export const worldGlyphs = {
  work: lineGlyph("briefcase", Briefcase),
  study: lineGlyph("graduation-cap", GraduationCap),
  projects: lineGlyph("folder-code", FolderCode),
  courses: lineGlyph("book-open", BookOpen),
  offTheClock: lineGlyph("moon", Moon),
};

/** What kind of thing an event is, when that differs from its world. */
export const typeGlyphs = {
  role: worldGlyphs.work,
  internship: lineGlyph("microscope", Microscope),
  degree: worldGlyphs.study,
  thesis: lineGlyph("scroll-text", ScrollText),
  project: worldGlyphs.projects,
  course: worldGlyphs.courses,
  activity: lineGlyph("users", Users),
  pastime: lineGlyph("heart", Heart),
};

/** The marks of the pastimes that have an exact one. */
export const pastimeMarks: Record<string, Glyph> = {
  "Dota 2": markGlyph(siDota2),
  Python: markGlyph(siPython),
};

export const placeGlyph = lineGlyph("map-pin", MapPin);

export const controlGlyphs = {
  skills: lineGlyph("tags", Tags),
  findMe: lineGlyph("link", Link),
  zoomIn: lineGlyph("plus", Plus),
  zoomOut: lineGlyph("minus", Minus),
  resetView: lineGlyph("rotate-ccw", RotateCcw),
  previous: lineGlyph("chevron-left", ChevronLeft),
  next: lineGlyph("chevron-right", ChevronRight),
  close: lineGlyph("x", X),
  search: lineGlyph("search", Search),
};

/** The profiles under Find me, by their marks. Simple Icons has no LinkedIn mark, so LinkedIn goes by its name alone. */
export const linkGlyphs: Record<string, Glyph> = {
  GitHub: markGlyph(siGithub),
  "Stack Overflow": markGlyph(siStackoverflow),
};

/** One line glyph for each CV skill group, for the skills Simple Icons has no exact mark for. */
export const groupGlyphs: Record<string, Glyph> = {
  "Front-end": lineGlyph("app-window", AppWindow),
  "Back-end": lineGlyph("server", Server),
  AWS: lineGlyph("cloud", Cloud),
  "GenAI and LLM engineering": lineGlyph("brain-circuit", BrainCircuit),
  "AI coding tools, frameworks and services": lineGlyph("bot", Bot),
  "Databases and DBMS": lineGlyph("database", Database),
  "IDEs, editors and GUIs": lineGlyph("code-xml", CodeXml),
  "Version control": lineGlyph("git-branch", GitBranch),
  "Project management and communication": lineGlyph(
    "messages-square",
    MessagesSquare,
  ),
  "Machine learning frameworks and models": lineGlyph("brain", Brain),
  "Cloud and online services": lineGlyph("globe", Globe),
  "Operating systems and containers": lineGlyph("container", Container),
  "Loggers and ORMs": lineGlyph("scroll-text", ScrollText),
  "Design patterns": lineGlyph("shapes", Shapes),
  Testing: lineGlyph("flask-conical", FlaskConical),
  "Security and DevSecOps": lineGlyph("shield-check", ShieldCheck),
  "Packages and frameworks": lineGlyph("package", Package),
  Others: lineGlyph("wrench", Wrench),
  "Named for the current role": lineGlyph("briefcase", Briefcase),
};

/** A glyph as inline SVG for the HTML, drawn in the text's own colour at the text's size. */
export function glyphElement(glyph: Glyph, className = "lines-icon") {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const data of glyph.paths) {
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", data);
    if (glyph.drawing === "stroke") {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", String(LINE_WEIGHT));
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    } else path.setAttribute("fill", "currentColor");
    svg.append(path);
  }
  return svg;
}

/** Throws when a glyph has no drawing: a renamed or emptied icon fails the build instead of vanishing. */
export function checkGlyph(glyph: Glyph | undefined, where: string) {
  if (
    !glyph ||
    !glyph.paths.length ||
    glyph.paths.some((path) => !path || path === "undefined")
  )
    throw new Error(`No drawing for the glyph of ${where}`);
}

/** Checks every fixed glyph table: the worlds, the kinds, the pastimes, the place, the controls, the links, the groups. */
export function checkGlyphTables() {
  const tables: Record<string, Record<string, Glyph>> = {
    world: worldGlyphs,
    kind: typeGlyphs,
    pastime: pastimeMarks,
    place: { place: placeGlyph },
    control: controlGlyphs,
    link: linkGlyphs,
    group: groupGlyphs,
  };
  for (const [table, glyphs] of Object.entries(tables))
    for (const [name, glyph] of Object.entries(glyphs))
      checkGlyph(glyph, `${table} ${name}`);
}

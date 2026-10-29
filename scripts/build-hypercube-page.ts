/*
  Builds version 5 of the About page, "Hypercube", as a page of its own outside Next, once for every page that shows it:
  - public/hypercube/ holds the scene's one build: hypercube.js, hypercube.css and the Blender share image from
    lib/hypercube/art/, each asked for with a hash of its contents. It is served at /hypercube/, under neither page, so
    taking one page away never takes the scene from the other.
  - public/about/v5/index.html is the prototype's page, from lib/hypercube/page.html. It stays out of search engines.
  - lib/hypercube/built/home.html is the homepage: the same page with a homepage's head
    (scripts/hypercube-home-head.ts). app/route.ts serves it at / (lib/hypercube/home-page.ts).
  Each folder is made here every time, so none is committed. next build copies public/ into out/.
*/
import fs from "node:fs";
import path from "node:path";
import { bio } from "@/content/about/profile";
import { checkGlyphTables } from "@/lib/about-cv/icons";
import { allEvents } from "@/lib/about-cv/events";
import { checkSkillMarks } from "@/lib/about-cv/skill-marks";
import { checkThreads, skillWords } from "@/lib/about-cv/skills";
import { artFiles, shareImage } from "@/lib/hypercube/art/manifest";
import { BUILT_HOME_PAGE } from "@/lib/hypercube/home-page";
import { checkHypercubeGlyphs } from "@/lib/hypercube/icons";
import { presentTime } from "@/lib/about-cv/time";
import { fontFaceCss } from "@/lib/fonts";
import { site } from "@/lib/site";
import { HOME_ADDRESS, HOME_DESCRIPTION, HOME_ROBOTS, HOME_TITLE, homePageMeta } from "./hypercube-home-head";
import {
  type ArtAddresses,
  bundleScript,
  copyArt,
  escapeHtml,
  fillTemplate,
  fontPreloads,
  hashOf,
  shareMeta,
} from "./standalone-page";

const SOURCE = path.join("lib", "hypercube");
const SHARED_FOLDER = path.join("public", "hypercube");
const SHARED_ADDRESS = "/hypercube/";
const SCRIPT_FILE = "hypercube.js";
const STYLESHEET_FILE = "hypercube.css";
const PROTOTYPE_FOLDER = path.join("public", "about", "v5");
const PROTOTYPE_ADDRESS = "/about/v5/";
const PROTOTYPE_TITLE = "About me · Syed Rafay";
const PROTOTYPE_DESCRIPTION =
  "Syed Rafay, senior software engineer at Twin Technology: every role, degree, project, course and skill, as one object in four dimensions.";
const PROTOTYPE_ROBOTS = "noindex, nofollow";

/** What the head of a page says about it. Below the head every page that shows the scene is the same. */
type PageHead = { robots: string; title: string; description: string; pageMeta: string };

/** The scene's one build, and the addresses every page asks for its files at. */
type SharedBuild = { scriptAddress: string; stylesheetAddress: string; art: ArtAddresses };

/** A folder made new, so a file this build no longer writes is not left behind. */
function makeFolderNew(folder: string) {
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });
}

const addressWithHash = (file: string, contents: string) => `${SHARED_ADDRESS}${file}?v=${hashOf(contents)}`;

async function buildSharedFiles(): Promise<SharedBuild> {
  const script = await bundleScript(path.join(SOURCE, "scene", "main.ts"), "Hypercube");
  const style = fs.readFileSync(path.join(SOURCE, "styles.css"), "utf8");
  makeFolderNew(SHARED_FOLDER);
  fs.writeFileSync(path.join(SHARED_FOLDER, SCRIPT_FILE), script);
  fs.writeFileSync(path.join(SHARED_FOLDER, STYLESHEET_FILE), style);
  const art = copyArt(path.join(SOURCE, "art"), artFiles(), SHARED_FOLDER, SHARED_ADDRESS);
  console.log(`${SHARED_FOLDER}: ${SCRIPT_FILE} (${script.length} bytes), ${STYLESHEET_FILE}, ${[...art.keys()].join(", ")}`);
  return {
    scriptAddress: addressWithHash(SCRIPT_FILE, script),
    stylesheetAddress: addressWithHash(STYLESHEET_FILE, style),
    art,
  };
}

/** The page's template, with this build's files and the head of the page it is for. */
function fillPage(shared: SharedBuild, head: PageHead) {
  return fillTemplate(fs.readFileSync(path.join(SOURCE, "page.html"), "utf8"), {
    robots: head.robots,
    title: escapeHtml(head.title),
    description: escapeHtml(head.description),
    pageMeta: head.pageMeta,
    fontPreloads: fontPreloads(),
    fontFaces: fontFaceCss,
    stylesheetAddress: shared.stylesheetAddress,
    scriptAddress: shared.scriptAddress,
    name: escapeHtml(site.name),
    bio: escapeHtml(bio),
  });
}

function writePage(file: string, page: string) {
  makeFolderNew(path.dirname(file));
  fs.writeFileSync(file, page);
  console.log(file);
}

function writePrototypePage(shared: SharedBuild) {
  const shareCard = shareMeta(shared.art, shareImage, PROTOTYPE_ADDRESS, PROTOTYPE_TITLE, PROTOTYPE_DESCRIPTION);
  const page = fillPage(shared, {
    robots: PROTOTYPE_ROBOTS,
    title: PROTOTYPE_TITLE,
    description: PROTOTYPE_DESCRIPTION,
    pageMeta: shareCard,
  });
  writePage(path.join(PROTOTYPE_FOLDER, "index.html"), page);
}

function writeHomePage(shared: SharedBuild) {
  const shareCard = shareMeta(shared.art, shareImage, HOME_ADDRESS, HOME_TITLE, HOME_DESCRIPTION);
  const page = fillPage(shared, {
    robots: HOME_ROBOTS,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    pageMeta: homePageMeta(shareCard),
  });
  writePage(BUILT_HOME_PAGE, page);
}

export async function buildHypercubePage() {
  // A skill named by an event must float somewhere, and every glyph must have a drawing: fail the build otherwise.
  const events = allEvents(presentTime());
  checkThreads(events);
  checkGlyphTables();
  checkSkillMarks(skillWords(events));
  checkHypercubeGlyphs();
  const shared = await buildSharedFiles();
  writePrototypePage(shared);
  writeHomePage(shared);
}

/*
  Builds the homepage, "Hypercube" (version 5 of the About page), as a page of its own outside Next:
  - public/hypercube/ holds the scene's build: hypercube.js, hypercube.css and the Blender share image from
    lib/hypercube/art/, each asked for with a hash of its contents.
  - lib/hypercube/built/home.html is the page itself, from lib/hypercube/page.html with a homepage's head
    (scripts/hypercube-home-head.ts). app/route.ts serves it at / (lib/hypercube/home-page.ts).
  Run before `next build` and `next dev`, like scripts/build-site-menu.ts. Each is made here every time, so neither is
  committed. next build copies public/ into out/.
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

/** The scene's build, and the addresses the page asks for its files at. */
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

/** The page's template, with this build's files and the homepage's head. */
function homePageFrom(shared: SharedBuild) {
  const shareCard = shareMeta(shared.art, shareImage, HOME_ADDRESS, HOME_TITLE, HOME_DESCRIPTION);
  return fillTemplate(fs.readFileSync(path.join(SOURCE, "page.html"), "utf8"), {
    robots: HOME_ROBOTS,
    title: escapeHtml(HOME_TITLE),
    description: escapeHtml(HOME_DESCRIPTION),
    pageMeta: homePageMeta(shareCard),
    fontPreloads: fontPreloads(),
    fontFaces: fontFaceCss,
    stylesheetAddress: shared.stylesheetAddress,
    scriptAddress: shared.scriptAddress,
    name: escapeHtml(site.name),
    bio: escapeHtml(bio),
  });
}

function writeHomePage(page: string) {
  makeFolderNew(path.dirname(BUILT_HOME_PAGE));
  fs.writeFileSync(BUILT_HOME_PAGE, page);
  console.log(BUILT_HOME_PAGE);
}

async function buildHypercubePage() {
  // A skill named by an event must float somewhere, and every glyph must have a drawing: fail the build otherwise.
  const events = allEvents(presentTime());
  checkThreads(events);
  checkGlyphTables();
  checkSkillMarks(skillWords(events));
  checkHypercubeGlyphs();
  writeHomePage(homePageFrom(await buildSharedFiles()));
}

await buildHypercubePage();

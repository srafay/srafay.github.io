/*
  Builds version 5 of the About page, "Hypercube", as a page of its own outside Next. It writes
  public/about/v5/index.html from lib/hypercube/page.html, with hypercube.css and hypercube.js beside it, each asked
  for with a hash of its contents, and the Blender share image from lib/hypercube/art/ with its meta tags. The folder
  is made here every time, so it is not committed. next build copies public/ into out/.
*/
import fs from "node:fs";
import path from "node:path";
import { bio } from "@/content/about/profile";
import { checkGlyphTables } from "@/lib/about-cv/icons";
import { allEvents } from "@/lib/about-cv/events";
import { checkSkillMarks } from "@/lib/about-cv/skill-marks";
import { checkThreads, skillWords } from "@/lib/about-cv/skills";
import { artFiles, shareImage } from "@/lib/hypercube/art/manifest";
import { checkHypercubeGlyphs } from "@/lib/hypercube/icons";
import { presentTime } from "@/lib/about-cv/time";
import { fontFaceCss } from "@/lib/fonts";
import { site } from "@/lib/site";
import { bundleScript, copyArt, escapeHtml, fillTemplate, fontPreloads, hashOf, shareMeta } from "./standalone-page";

const SOURCE = path.join("lib", "hypercube");
const OUTPUT = path.join("public", "about", "v5");
const PAGE_ADDRESS = "/about/v5/";
const TITLE = "About me · Syed Rafay";
const DESCRIPTION =
  "Syed Rafay, senior software engineer at Twin Technology: every role, degree, project, course and skill, as one object in four dimensions.";

export async function buildHypercubePage() {
  // A skill named by an event must float somewhere, and every glyph must have a drawing: fail the build otherwise.
  const events = allEvents(presentTime());
  checkThreads(events);
  checkGlyphTables();
  checkSkillMarks(skillWords(events));
  checkHypercubeGlyphs();
  const script = await bundleScript(path.join(SOURCE, "scene", "main.ts"), "Hypercube");
  const style = fs.readFileSync(path.join(SOURCE, "styles.css"), "utf8");
  fs.mkdirSync(OUTPUT, { recursive: true });
  const art = copyArt(path.join(SOURCE, "art"), artFiles(), OUTPUT, PAGE_ADDRESS);
  const page = fillTemplate(fs.readFileSync(path.join(SOURCE, "page.html"), "utf8"), {
    title: escapeHtml(TITLE),
    description: escapeHtml(DESCRIPTION),
    shareMeta: shareMeta(art, shareImage, PAGE_ADDRESS, TITLE, DESCRIPTION),
    fontPreloads: fontPreloads(),
    fontFaces: fontFaceCss,
    styleHash: hashOf(style),
    scriptHash: hashOf(script),
    name: escapeHtml(site.name),
    bio: escapeHtml(bio),
  });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, "hypercube.js"), script);
  fs.writeFileSync(path.join(OUTPUT, "hypercube.css"), style);
  fs.writeFileSync(path.join(OUTPUT, "index.html"), page);
  console.log(`${OUTPUT}: index.html, hypercube.css, hypercube.js (${script.length} bytes)`);
}

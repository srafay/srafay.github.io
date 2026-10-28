/*
  Builds version 4 of the About page, "World lines", as a page of its own outside Next. It writes
  public/about/v4/index.html from lib/world-lines/page.html, with world-lines.css and world-lines.js beside it. The
  page asks for both with a hash of their contents in the address. So a phone that cached an older build fetches the
  new one. The folder is made here every time, so it is not committed. next build copies public/ into out/. What every
  such page shares (the bundle, the template, the fonts, the hashes) is in scripts/standalone-page.ts.
*/
import fs from "node:fs";
import path from "node:path";
import { bio } from "@/content/about/profile";
import { fontFaceCss } from "@/lib/fonts";
import { site } from "@/lib/site";
import { allEvents } from "@/lib/about-cv/events";
import { checkGlyphTables } from "@/lib/about-cv/icons";
import { checkSkillMarks } from "@/lib/about-cv/skill-marks";
import { checkThreads, skillWords } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import {
  copyArt,
  hazeMarkup,
  shareMeta,
  stageArtAttributes,
  stillMarkup,
} from "./world-lines-art";
import { bundleScript, escapeHtml, fillTemplate, fontPreloads, hashOf } from "./standalone-page";

const SOURCE = path.join("lib", "world-lines");
const OUTPUT = path.join("public", "about", "v4");
const DESCRIPTION =
  "Syed Rafay, senior software engineer at Twin Technology: every role, degree, project, course and skill, drawn as lines through the years.";
const TITLE = "About me · Syed Rafay";

export async function buildWorldLinesPage() {
  // A thread to a skill that floats nowhere would lead nowhere: fail the build instead.
  const events = allEvents(presentTime());
  checkThreads(events);
  // A renamed or missing icon fails here too, and the coverage printed is the one the build computed.
  checkGlyphTables();
  const coverage = checkSkillMarks(skillWords(events));
  console.log(
    `World lines skills: ${coverage.skills} words, ${coverage.marks} with a technology mark, ${coverage.groupGlyphs} with their group's glyph, ${coverage.none} with none`,
  );
  const script = await bundleScript(path.join(SOURCE, "scene", "main.ts"), "World lines");
  const style = fs.readFileSync(path.join(SOURCE, "styles.css"), "utf8");
  fs.mkdirSync(OUTPUT, { recursive: true });
  // The Blender art: copied beside the page with hashed addresses, and the markup that shows it.
  const art = copyArt(OUTPUT);
  const page = fillTemplate(
    fs.readFileSync(path.join(SOURCE, "page.html"), "utf8"),
    {
      title: escapeHtml(TITLE),
      description: escapeHtml(DESCRIPTION),
      shareMeta: shareMeta(art, TITLE, DESCRIPTION),
      stageArt: stageArtAttributes(art),
      haze: hazeMarkup(art),
      still: stillMarkup(art),
      fontPreloads: fontPreloads(),
      fontFaces: fontFaceCss,
      styleHash: hashOf(style),
      scriptHash: hashOf(script),
      name: escapeHtml(site.name),
      bio: escapeHtml(bio),
    },
  );
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, "world-lines.js"), script);
  fs.writeFileSync(path.join(OUTPUT, "world-lines.css"), style);
  fs.writeFileSync(path.join(OUTPUT, "index.html"), page);
  console.log(
    `${OUTPUT}: index.html, world-lines.css, world-lines.js (${script.length} bytes)`,
  );
}

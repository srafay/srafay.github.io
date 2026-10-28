/*
  Builds version 7 of the About page, "Letters", as a page of its own outside Next. It writes
  public/about/v7/index.html from lib/letters/page.html, with letters.css and letters.js beside it, each asked for with
  a hash of its contents. The folder is made here every time, so it is not committed. next build copies public/ into
  out/.
*/
import fs from "node:fs";
import path from "node:path";
import { bio } from "@/content/about/profile";
import { checkGlyphTables } from "@/lib/about-cv/icons";
import { allEvents } from "@/lib/about-cv/events";
import { checkSkillMarks } from "@/lib/about-cv/skill-marks";
import { checkThreads, skillWords } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import { fontFaceCss } from "@/lib/fonts";
import { bioWithBlocks } from "@/lib/letters/bio";
import { buildLand } from "@/lib/letters/land/land";
import { FULL_NAME, PAGE_TITLE } from "@/lib/letters/names";
import { checkPalette, field } from "@/lib/letters/palette";
import { bundleScript, escapeHtml, fillTemplate, fontPreloads, hashOf } from "./standalone-page";

const SOURCE = path.join("lib", "letters");
const OUTPUT = path.join("public", "about", "v7");
const DESCRIPTION =
  "Syed Rafay, senior software engineer at Twin Technology: his whole CV drawn as a landscape of its own letters.";

/** The name in two spans, so a phone sets it on two lines and a computer on one. */
const nameLines = () =>
  FULL_NAME.split(" ")
    .map((word) => `<span>${escapeHtml(word)}</span>`)
    .join(" ");

/** Every event must stand on the land with at least one cell, or a card could never be reached by a tap. */
function checkLand() {
  const present = presentTime();
  const land = buildLand(allEvents(present), present);
  const bare = land.events.filter((item) => item.cellCount === 0);
  if (bare.length) throw new Error(`Version 7: no cells for ${bare.map((item) => item.event.id).join(", ")}`);
  return land;
}

export async function buildLettersPage() {
  const events = allEvents(presentTime());
  checkThreads(events);
  checkGlyphTables();
  checkSkillMarks(skillWords(events));
  checkPalette();
  const land = checkLand();
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  const script = await bundleScript(path.join(SOURCE, "scene", "main.ts"), "Letters");
  const style = fs.readFileSync(path.join(SOURCE, "styles.css"), "utf8");
  const page = fillTemplate(fs.readFileSync(path.join(SOURCE, "page.html"), "utf8"), {
    title: escapeHtml(PAGE_TITLE),
    description: escapeHtml(DESCRIPTION),
    field,
    fontPreloads: fontPreloads(),
    fontFaces: fontFaceCss,
    styleHash: hashOf(style),
    scriptHash: hashOf(script),
    nameLines: nameLines(),
    bio: bioWithBlocks(bio),
  });
  fs.writeFileSync(path.join(OUTPUT, "letters.js"), script);
  fs.writeFileSync(path.join(OUTPUT, "letters.css"), style);
  fs.writeFileSync(path.join(OUTPUT, "index.html"), page);
  console.log(
    `${OUTPUT}: index.html, letters.css, letters.js (${script.length} bytes); land ${land.letterCount} letters and ${land.dotCount} dots`,
  );
}

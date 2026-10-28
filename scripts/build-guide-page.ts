/*
  Builds version 6 of the About page, "Guide", as a page of its own outside Next. It writes public/about/v6/index.html
  from lib/guide/page.html, with guide.css and guide.js beside it, each asked for with a hash of its contents. The
  folder is made here every time, so it is not committed. next build copies public/ into out/.
*/
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { bio } from "@/content/about/profile";
import { checkGlyphTables } from "@/lib/about-cv/icons";
import { allEvents } from "@/lib/about-cv/events";
import { checkSkillMarks } from "@/lib/about-cv/skill-marks";
import { checkThreads, skillWords } from "@/lib/about-cv/skills";
import { presentTime } from "@/lib/about-cv/time";
import { checkGuideGlyphs } from "@/lib/guide/icons";
import { checkPalette, fieldColours } from "@/lib/guide/palette";
import { checkTour } from "@/lib/guide/tour";
import { fontFaceCss } from "@/lib/fonts";
import { site } from "@/lib/site";
import { bundleScript, escapeHtml, fillTemplate, fontPreloads, hashOf } from "./standalone-page";

const SOURCE = path.join("lib", "guide");
const OUTPUT = path.join("public", "about", "v6");
const TITLE = "About me · Syed Rafay";
const DESCRIPTION =
  "Syed Rafay, senior software engineer at Twin Technology: his whole CV, toured by a python. The reptile, not the language.";

/** Each field's colours as custom properties, and the bars' words over each, from lib/guide/palette.ts. */
function fieldStyles() {
  const rules = [`:root{--guide-hello-field:${fieldColours.hello.field}}`];
  for (const [key, colours] of Object.entries(fieldColours)) {
    rules.push(`.guide-field-${key}{--field:${colours.field};--words:${colours.words};--deep:${colours.deep}}`);
    rules.push(`[data-under-top="${key}"] .guide-top{--bar-top-words:${colours.words};--bar-top-field:${colours.field};--bar-pressed-words:${colours.deep}}`);
    rules.push(`[data-under-bottom="${key}"] .guide-bottom{--bar-bottom-words:${colours.words};--bar-bottom-field:${colours.field};--bar-pressed-words:${colours.deep}}`);
    rules.push(`[data-under-python="${key}"] .guide-say{--say-words:${colours.deep}}`);
  }
  return rules.join("\n");
}

/** The mockups' captures (lib/guide/art/), copied beside the page with a hash of their contents in each name. */
function copyArt() {
  const named = (file: string) => {
    const bytes = fs.readFileSync(path.join(SOURCE, "art", file));
    const hashed = file.replace(/\.webp$/,`.${createHash("sha256").update(bytes).digest("hex").slice(0, 10)}.webp`);
    fs.writeFileSync(path.join(OUTPUT, hashed), bytes);
    return `/about/v6/${hashed}`;
  };
  return { homepage: named("homepage-computer.webp"), earthPost: named("earth-post-phone.webp") };
}

/** The name in two spans, so a phone sets it on two lines and a computer on one. */
const nameLines = () =>
  site.name
    .split(" ")
    .map((word) => `<span>${escapeHtml(word)}</span>`)
    .join(" ");

export async function buildGuidePage() {
  // Every word readable, every glyph drawn, every skill threaded, every CV item on the tour: or the build fails.
  const events = allEvents(presentTime());
  checkThreads(events);
  checkGlyphTables();
  checkSkillMarks(skillWords(events));
  checkGuideGlyphs();
  checkPalette();
  checkTour(events);
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  const art = copyArt();
  const script = await bundleScript(path.join(SOURCE, "main.ts"), "Guide");
  const style = fs.readFileSync(path.join(SOURCE, "styles.css"), "utf8");
  const page = fillTemplate(fs.readFileSync(path.join(SOURCE, "page.html"), "utf8"), {
    title: escapeHtml(TITLE),
    description: escapeHtml(DESCRIPTION),
    fontPreloads: fontPreloads(),
    fontFaces: fontFaceCss,
    fieldStyles: fieldStyles(),
    helloField: fieldColours.hello.field,
    styleHash: hashOf(style),
    scriptHash: hashOf(script),
    nameLines: nameLines(),
    bio: escapeHtml(bio),
    art: escapeHtml(JSON.stringify(art)),
  });
  fs.writeFileSync(path.join(OUTPUT, "guide.js"), script);
  fs.writeFileSync(path.join(OUTPUT, "guide.css"), style);
  fs.writeFileSync(path.join(OUTPUT, "index.html"), page);
  console.log(`${OUTPUT}: index.html, guide.css, guide.js (${script.length} bytes)`);
}

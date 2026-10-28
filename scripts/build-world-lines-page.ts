/*
  Builds version 4 of the About page, "World lines", as a page of its own outside Next. It writes
  public/about/v4/index.html from lib/world-lines/page.html, with world-lines.css and world-lines.js beside it. The
  page asks for both with a hash of their contents in the address. So a phone that cached an older build fetches the
  new one. The folder is made here every time, so it is not committed. next build copies public/ into out/.

  The site's typecheck has no Bun types (Next builds under Node), so the one call made to Bun here is typed by hand.
*/
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { bio } from "@/content/about/profile";
import { fontFaceCss, preloadedFonts } from "@/lib/fonts";
import { site } from "@/lib/site";
import { allEvents } from "@/lib/world-lines/events";
import { checkGlyphTables } from "@/lib/world-lines/icons";
import { checkSkillMarks } from "@/lib/world-lines/skill-marks";
import { checkThreads, skillWords } from "@/lib/world-lines/skills";
import { presentTime } from "@/lib/world-lines/time";

type Bundler = {
  build(options: {
    entrypoints: string[];
    target: "browser";
    format: "iife";
    minify: boolean;
  }): Promise<{ success: boolean; logs: unknown[]; outputs: Blob[] }>;
};
const { Bun } = globalThis as unknown as { Bun: Bundler };

const SOURCE = path.join("lib", "world-lines");
const OUTPUT = path.join("public", "about", "v4");
const DESCRIPTION =
  "Syed Rafay, senior software engineer at Twin Technology: every role, degree, project, course and skill, drawn as lines through the years.";

const hashOf = (contents: string) =>
  createHash("sha256").update(contents).digest("hex").slice(0, 10);

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

async function bundleScene() {
  const result = await Bun.build({
    entrypoints: [path.join(SOURCE, "scene", "main.ts")],
    target: "browser",
    format: "iife",
    minify: true,
  });
  if (!result.success)
    throw new AggregateError(
      result.logs,
      "Could not build the World lines scene",
    );
  return result.outputs[0].text();
}

const fontPreloads = () =>
  preloadedFonts
    .map(
      (href) =>
        `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`,
    )
    .join("\n");

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`page.html asks for {{${key}}}`);
    return values[key];
  });
}

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
  const script = await bundleScene();
  const style = fs.readFileSync(path.join(SOURCE, "styles.css"), "utf8");
  const standIn = fs.existsSync(path.join(SOURCE, "stand-in.html"))
    ? fs.readFileSync(path.join(SOURCE, "stand-in.html"), "utf8")
    : "";
  const page = fillTemplate(
    fs.readFileSync(path.join(SOURCE, "page.html"), "utf8"),
    {
      description: escapeHtml(DESCRIPTION),
      fontPreloads: fontPreloads(),
      fontFaces: fontFaceCss,
      styleHash: hashOf(style),
      scriptHash: hashOf(script),
      standIn,
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

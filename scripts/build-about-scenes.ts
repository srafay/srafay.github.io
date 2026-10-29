/*
  Builds the scripts the About page and the homepage draw with. The About page's script is bundled from its entry file
  into public/about.js, which the page adds with a hash of its contents in the address (lib/content-hash.ts). The
  homepage is built whole by scripts/build-hypercube-page.ts. Run before `next build` and `next dev`, like
  scripts/build-site-menu.ts. The files are made here every time, so they are not committed.

  The site's typecheck has no Bun types (Next builds under Node), so the one call made to Bun here is typed by hand.
*/
import fs from "node:fs";
import path from "node:path";
import { buildHypercubePage } from "./build-hypercube-page";

type Bundler = {
  build(options: {
    entrypoints: string[];
    target: "browser";
    format: "iife";
    minify: boolean;
  }): Promise<{ success: boolean; logs: unknown[]; outputs: Blob[] }>;
};
const { Bun } = globalThis as unknown as { Bun: Bundler };

// The About page itself: a pressed skill lights its roles, the ruler, the calendar's days, the time in Sydney.
const ABOUT_SCRIPT = {
  entry: path.join("lib", "about", "script", "main.ts"),
  output: path.join("public", "about.js"),
};

async function buildAboutScript({ entry, output }: typeof ABOUT_SCRIPT) {
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "iife",
    minify: true,
  });
  if (!result.success)
    throw new AggregateError(result.logs, `Could not build ${entry}`);
  fs.writeFileSync(output, await result.outputs[0].text());
  console.log(`${output}: ${fs.statSync(output).size} bytes`);
}

await buildAboutScript(ABOUT_SCRIPT);

// The homepage, "Hypercube" (version 5 of the About page): the life as one object in four dimensions.
await buildHypercubePage();

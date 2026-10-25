/*
  Builds the site's menu (lib/site-menu/menu.ts and the files it imports) into public/site-menu.js, the small script a
  page adds once it has loaded (lib/site-menu/start-script.ts). Run before `next build` and `next dev`; the file is
  made here every time, so it is not committed.

  The site's typecheck has no Bun types (Next builds under Node), so the one call made to Bun here is typed by hand.
*/
import fs from "node:fs";
import path from "node:path";

type Bundler = {
  build(options: {
    entrypoints: string[];
    target: "browser";
    format: "iife";
    minify: boolean;
  }): Promise<{ success: boolean; logs: unknown[]; outputs: Blob[] }>;
};
const { Bun } = globalThis as unknown as { Bun: Bundler };

const ENTRY = path.join("lib", "site-menu", "menu.ts");
const OUTPUT = path.join("public", "site-menu.js");

const result = await Bun.build({
  entrypoints: [ENTRY],
  target: "browser",
  format: "iife",
  minify: true,
});
if (!result.success)
  throw new AggregateError(result.logs, `Could not build ${ENTRY}`);
fs.writeFileSync(OUTPUT, await result.outputs[0].text());
console.log(`${OUTPUT}: ${fs.statSync(OUTPUT).size} bytes`);

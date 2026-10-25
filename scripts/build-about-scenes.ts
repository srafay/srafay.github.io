/*
  Builds the scripts the About page's versions draw their scenes with, each from its entry file into public/, where
  its page adds it with a hash of its contents in the address (lib/content-hash.ts). Run before `next build` and
  `next dev`, like scripts/build-site-menu.ts. The files are made here every time, so they are not committed.
  A new version with a script of its own adds one line to SCENES.

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

type Scene = { entry: string; output: string };

const SCENES: Scene[] = [
  // Version 2, "A year of nights": the contribution year as a night sky.
  {
    entry: path.join("lib", "year-of-nights", "scene", "main.ts"),
    output: path.join("public", "about-v2.js"),
  },
  // Version 3, "Flight": the real Earth at night, flown from Karachi to Darwin to Sydney (three.js).
  {
    entry: path.join("lib", "flight", "main.ts"),
    output: path.join("public", "about-v3.js"),
  },
];

async function buildScene({ entry, output }: Scene) {
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

for (const scene of SCENES) await buildScene(scene);

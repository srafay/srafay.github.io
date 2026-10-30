import fs from "node:fs";
import path from "node:path";

/*
  The homepage: version 5 of the About page, "Hypercube", at /. It is lib/hypercube/page.html with the head of a
  homepage (scripts/hypercube-home-head.ts). The build (scripts/build-hypercube-page.ts) makes it whole, beside the
  scene's build in public/hypercube/ that it asks for, and app/route.ts serves it from here. It is plain HTML, not a
  React page: the scene's script adds its controls and cards to the document, and React would discard them as the
  page hydrates.
*/
export const BUILT_HOME_PAGE = path.join("lib", "hypercube", "built", "home.html");

export function homePage() {
  const file = path.join(process.cwd(), BUILT_HOME_PAGE);
  if (!fs.existsSync(file))
    throw new Error(`The homepage is not built yet (${BUILT_HOME_PAGE}). Run: bun scripts/build-hypercube-page.ts`);
  return fs.readFileSync(file, "utf8");
}

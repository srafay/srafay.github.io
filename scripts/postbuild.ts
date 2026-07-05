/*
  The homepage is a route handler (app/route.ts), which the static export writes to out/index with no extension.
  GitHub Pages serves / from index.html, so it is renamed.
*/
import { renameSync } from "node:fs";

renameSync("out/index", "out/index.html");

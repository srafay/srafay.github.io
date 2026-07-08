/*
  Route handlers are written by the static export to files with no extension. Two are pages:
  - the homepage (app/route.ts) is written to out/index; GitHub Pages serves / from index.html.
  - the 404 page (app/lost/route.ts) is written to out/lost; GitHub Pages serves 404.html for any missing address.
    It replaces the 404.html Next renders from app/not-found.tsx.
*/
import { renameSync } from "node:fs";

renameSync("out/index", "out/index.html");
renameSync("out/lost", "out/404.html");

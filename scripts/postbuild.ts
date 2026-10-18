/*
  Route handlers are written by the static export to files with no extension. These are pages:
  - the homepage (app/route.ts) is written to out/index; GitHub Pages serves / from index.html.
  - the 404 page (app/lost/route.ts) is written to out/lost; GitHub Pages serves 404.html for any missing address.
    It replaces the 404.html Next renders from app/not-found.tsx.
  - the sky page (app/sky/route.ts) is written to out/sky; it moves to out/sky/index.html, served at /sky/.
  - a post that is a page of its own (app/posts/<slug>/route.ts, see lib/own-page.ts) is written to out/posts/<slug>.
    A published one moves to out/posts/<slug>/index.html, where GitHub Pages serves /posts/<slug>/. A draft's route
    answers "Not found", and that file is deleted, so a draft never reaches the live site.
*/
import fs from "node:fs";
import path from "node:path";

const POSTS = path.join("out", "posts");

fs.renameSync("out/index", "out/index.html");
fs.renameSync("out/lost", "out/404.html");

/** Moves a route's file to <name>/index.html, where GitHub Pages serves /<name>/. */
function moveIntoFolder(file: string) {
  const page = fs.readFileSync(file);
  fs.rmSync(file);
  fs.mkdirSync(file, { recursive: true });
  fs.writeFileSync(path.join(file, "index.html"), page);
}

moveIntoFolder("out/sky");

const isPage = (file: string) =>
  fs
    .readFileSync(file, "utf8")
    .trimStart()
    .toLowerCase()
    .startsWith("<!doctype html");

/** The files Next wrote for posts that are pages of their own: files in out/posts/ with no extension. */
const ownPageFiles = () =>
  fs
    .readdirSync(POSTS, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name) === "")
    .map((entry) => path.join(POSTS, entry.name));

for (const file of ownPageFiles()) {
  if (!isPage(file)) {
    fs.rmSync(file);
    console.log(`left out ${file}: a draft`);
    continue;
  }
  moveIntoFolder(file);
  console.log(`${file}/index.html`);
}

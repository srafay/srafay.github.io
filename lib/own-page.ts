import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { getPost } from "@/lib/posts";

/*
  A post that is a page of its own (see ownPage in lib/posts.ts). Its finished page is built by the cosmos repo into
  content/posts/<slug>/page.html, with its script and figure styles at /cosmos/<body>.js and .css; this serves it
  whole, as the homepage is served. Those files' addresses get a content hash, so a new build is never served from
  cache. While the cosmos source's dev build is running (bun run dev in cosmos/), `next dev` takes the page and its
  files from it instead, all readable. The page must come from the same build as its styles: the built page's class
  names are renamed, the dev server's are not.
*/
const COSMOS_DEV = "http://localhost:4173";
const BUILT_FILE = /(src|href)="\/cosmos\/([\w-]+\.(?:js|css))"/g;

const cosmosDevIsUp = () =>
  fetch(`${COSMOS_DEV}/`, {
    method: "HEAD",
    signal: AbortSignal.timeout(300),
  }).then(
    (response) => response.ok,
    () => false,
  );

/** A built file's address: the readable dev build's, or the committed file's with its content hash. */
function builtFileAddress(name: string, fromCosmosDev: boolean) {
  if (fromCosmosDev) return `${COSMOS_DEV}/${name}`;
  const built = fs.readFileSync(
    path.join(process.cwd(), "public", "cosmos", name),
  );
  return `/cosmos/${name}?v=${createHash("sha256").update(built).digest("hex").slice(0, 10)}`;
}

/** The page's HTML: from the cosmos dev server while it runs, or the committed build. */
async function pageHtml(slug: string, fromCosmosDev: boolean) {
  if (fromCosmosDev) {
    const response = await fetch(`${COSMOS_DEV}/posts/${slug}.html`);
    if (response.ok) return response.text();
  }
  return fs.readFileSync(
    path.join(process.cwd(), "content", "posts", slug, "page.html"),
    "utf8",
  );
}

/*
  GitHub Pages sends the page compressed. `next dev` sends a route's response as it is, so there the page is compressed
  here, and a speed test on the dev server sees it at the size the live site sends. The exported file stays plain.
*/
function sentLikeGitHubPages(page: string) {
  if (process.env.NODE_ENV !== "development")
    return { body: page, encoding: {} as Record<string, string> };
  return {
    body: new Uint8Array(gzipSync(page)),
    encoding: { "Content-Encoding": "gzip" },
  };
}

/** The post's own page. A draft has none outside `next dev`, so a draft never reaches the live site. */
export async function ownPageResponse(slug: string): Promise<Response> {
  const post = await getPost(slug);
  if (post.draft && process.env.NODE_ENV !== "development")
    return new Response("Not found", { status: 404 });
  const fromCosmosDev =
    process.env.NODE_ENV === "development" && (await cosmosDevIsUp());
  const page = (await pageHtml(slug, fromCosmosDev)).replace(
    BUILT_FILE,
    (_match, attribute: string, name: string) =>
      `${attribute}="${builtFileAddress(name, fromCosmosDev)}"`,
  );
  const { body, encoding } = sentLikeGitHubPages(page);
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...encoding },
  });
}

/*
  The cosmos pages: a black hole with the real Solar System and each post's star system orbiting it. Three pages use
  it: the homepage; the 404 page, where the sky fills the screen; and the sky page (/sky/), the sky alone, which posts
  show behind themselves in a frame (see backdropScriptAddress).

  They are plain HTML, not React pages. The cosmos script takes over the whole document (it splits the name into letters,
  moves every piece of the page into orbit, and drives the address bar as posts open and close), so nothing else
  may render into it. Everything people and search engines read is here, rendered from the posts at build time; the
  script and its stylesheet, public/cosmos/cosmos.js and cosmos.css, only draw and animate it. Each post's text stays
  on its own page, and the script fetches it from there when the post is opened.
*/
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fontFaceCss, preloadedFonts } from "@/lib/fonts";
import { formatDate, getPosts, type Post } from "@/lib/posts";
import { site } from "@/lib/site";
import { visitCounterScript } from "@/lib/visit-counter";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const postUrl = (post: Post) => `${site.url}/posts/${post.slug}/`;

const built = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), "public", "cosmos", name));
/** A committed script, with a content hash so a new build is never served from cache. */
const builtScript = (name: string) =>
  `/cosmos/${name}?v=${createHash("sha256").update(built(name)).digest("hex").slice(0, 10)}`;

/*
  Nothing blocks the first paint: the stylesheet is inlined (it's small and only this page uses it), the fonts are
  self-hosted and preloaded, and the script is deferred. The script hands the planets' surfaces to a worker
  (surfaces.js, named on its tag), so painting them never blocks the page either.
  While the cosmos source's dev build is running (bun run dev in cosmos/), `next dev` loads that instead.
*/
const COSMOS_DEV = "http://localhost:4173";
async function assets() {
  if (process.env.NODE_ENV === "development") {
    const up = await fetch(`${COSMOS_DEV}/`, {
      method: "HEAD",
      signal: AbortSignal.timeout(300),
    }).then(
      (r) => r.ok,
      () => false,
    );
    if (up)
      return {
        styles: `<link rel="stylesheet" href="${COSMOS_DEV}/cosmos.css">`,
        js: `${COSMOS_DEV}/cosmos.js`,
        worker: `${COSMOS_DEV}/surfaces.js`,
      };
  }
  return {
    styles: `<style>${built("cosmos.css").toString("utf8").trim()}</style>`,
    js: builtScript("cosmos.js"),
    worker: builtScript("surfaces.js"),
  };
}

function homeHead(posts: Post[]) {
  const t = esc(site.name),
    d = esc(site.description),
    u = esc(`${site.url}/`);
  const person = { "@id": `${site.url}/#person` };
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        ...person,
        name: site.name,
        url: `${site.url}/`,
        sameAs: site.links.map((l) => l.href),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: `${site.url}/`,
        name: site.name,
        description: site.description,
        author: person,
      },
      {
        "@type": "Blog",
        "@id": `${site.url}/#blog`,
        url: `${site.url}/`,
        name: `${site.name}: notes`,
        author: person,
        blogPost: posts.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          description: p.summary,
          datePublished: p.date,
          url: postUrl(p),
          author: person,
        })),
      },
    ],
  };
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}">`,
    `<link rel="canonical" href="${u}">`,
    `<meta name="robots" content="index, follow">`,
    `<meta name="author" content="${t}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${t}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:url" content="${u}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    `<meta name="theme-color" content="#07060b" media="(prefers-color-scheme: dark)">`,
    `<meta name="theme-color" content="#e5e5df" media="(prefers-color-scheme: light)">`,
    `<link rel="icon" href="/favicon.ico" sizes="any">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    `<link rel="alternate" type="application/rss+xml" title="${t}" href="${site.rss}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n");
}

/** The writing list: real links to each post's own page. The script adds the planets and opens them in place. */
const list = (posts: Post[]) =>
  posts
    .map(
      (
        p,
      ) => `<li data-slug="${p.slug}" data-planet="${esc(p.planet)}" data-iso="${p.date}"${p.ownPage ? ' data-page="own"' : ""}><canvas class="globe" aria-hidden="true"></canvas><div>
  <p class="meta"><b>${esc(p.planet)}</b><time datetime="${p.date}">${formatDate(p.date)}</time></p>
  <h3><a href="/posts/${p.slug}/">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p><p class="fact"></p></div></li>`,
    )
    .join("\n");

const footer = () =>
  [
    ...site.links.map(
      (l) => `<a href="${esc(l.href)}" rel="me">${esc(l.label)}</a>`,
    ),
    `<a href="${site.rss}">RSS</a>`,
  ].join("");

const nav = {
  // On the homepage the bar moves between its two sections; anywhere else it leads back to them.
  home: { mark: "#home", home: "#home", posts: "#posts" },
  away: { mark: "/", home: "/", posts: "/#posts" },
};

/** The name in the header, the same on every page, styled as on the daylight saving post. */
const BRAND = "srafay<span>.github.io</span>";

/** The light and dark switch. The homepage's own bar gives it an id; the reader's copy has none. */
const themeButton = (attributes: string) =>
  `<button class="flip"${attributes} type="button">
        <svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>
        <svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>
      </button>`;

/*
  How much of the page a cosmos page shows. "sky": the hero alone fills the screen (the 404 page). "backdrop": the sky
  alone, with no words at all (the sky page). Either way the posts list and footer stay in the page, hidden, because the
  script reads the posts from them, so their planets still orbit.
*/
type CosmosView = "sky" | "backdrop";

/** The theme the page starts in: the visitor's choice, or on the sky page, the theme its post asks for. */
function themeScript(view?: CosmosView) {
  const chosen =
    view === "backdrop"
      ? `new URLSearchParams(location.search).get("theme")`
      : `localStorage.getItem("theme")`;
  return `<script>try{const t=${chosen};if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}</script>`;
}

/** The fonts, preloaded. The sky page has no words, so it loads none. */
const fontsFor = (view?: CosmosView) =>
  view === "backdrop"
    ? ""
    : `${preloadedFonts.map((href) => `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`).join("\n")}
<style>${fontFaceCss}</style>`;

/** Counts the visit (lib/visit-counter.ts). The sky page is only seen in a post's frame, and the post counts it. */
const visitCounterFor = (view?: CosmosView) =>
  view === "backdrop" ? "" : `<script>${visitCounterScript}</script>\n`;

async function cosmosPage(o: {
  head: string;
  nav: keyof typeof nav;
  hero: string;
  posts: Post[];
  view?: CosmosView;
}) {
  const { styles, js, worker } = await assets();
  const n = nav[o.nav];
  const hidden = o.view ? " hidden" : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover">
${o.head}
${themeScript(o.view)}
${fontsFor(o.view)}
${styles}
<script src="${js}" data-surfaces="${worker}" defer></script>
</head>
<body${o.view ? ` data-view="${o.view}"` : ""}>

<div class="sky" aria-hidden="true">
  <canvas id="back"></canvas>
  <div class="hole-layer"><canvas id="hole"></canvas></div>
  <canvas id="front"></canvas>
</div>
<div id="tags"></div>

<div class="page" id="page">
  <header class="bar" id="bar">
    <a class="mark" href="${n.mark}">${BRAND}</a>
    <nav aria-label="Sections"><a href="${n.home}"${o.nav === "home" ? ' aria-current="true"' : ""}>Home</a><a href="${n.posts}">Posts</a>
      ${themeButton(' id="flip"')}
    </nav>
  </header>
  <section class="hero" id="home" aria-label="Introduction">
    <div class="title">
${o.hero}
    </div>
  </section>

  <section class="writing" id="posts"${hidden}>
    <div class="col">
      <h2>Posts</h2>
      <ul class="readable" id="list">
${list(o.posts)}
      </ul>
    </div>
  </section>

  <footer${hidden}>${footer()}</footer>
</div>
<p class="hint" id="hint">Pick a named planet to read it.</p>
<div class="flash" id="flash"></div>
<div class="tunnel" id="tunnel"></div>
<canvas class="warp" id="warp" aria-hidden="true"></canvas>
<canvas id="cursor" aria-hidden="true"></canvas>

<div class="reader" id="reader" hidden role="dialog" aria-modal="true" aria-labelledby="rdTitle">
  <header class="bar reader-bar">
    <a class="mark" href="/" data-reader-leave="home">${BRAND}</a>
    <nav aria-label="Site"><a href="/" data-reader-leave="home">Home</a><a href="/#posts" data-reader-leave="posts">Posts</a>
      ${themeButton("")}
    </nav>
  </header>
  <article>
    <button class="back" id="rdBack" type="button">Back to the system</button>
    <p class="des" id="rdDes"></p>
    <h1 id="rdTitle"></h1>
    <div class="prose readable" id="rdBody"></div>
  </article>
</div>
${visitCounterFor(o.view)}</body>
</html>
`;
}

export async function homePage() {
  const posts = await getPosts();
  return cosmosPage({
    head: homeHead(posts),
    nav: "home",
    posts,
    hero: `      <h1 id="name" class="visually-hidden" aria-label="${esc(site.name)}">${esc(site.name)}</h1>
      <p>Most things fall in. A few notes made it back out.</p>
      <a class="down" href="#posts">Read the notes</a>`,
  });
}

/** GitHub Pages serves this for every address that doesn't exist (the build writes it to 404.html). */
export async function lostPage() {
  const title = `Lost in the dark · ${site.name}`;
  return cosmosPage({
    head: [
      `<title>${esc(title)}</title>`,
      `<meta name="robots" content="noindex">`,
      `<meta name="theme-color" content="#07060b" media="(prefers-color-scheme: dark)">`,
      `<meta name="theme-color" content="#e5e5df" media="(prefers-color-scheme: light)">`,
      `<link rel="icon" href="/favicon.ico" sizes="any">`,
      `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    ].join("\n"),
    nav: "away",
    posts: await getPosts(),
    view: "sky",
    hero: `      <h1 id="name" aria-label="Lost in the dark">Lost <i>in the dark</i></h1>
      <p>Error 404. Whatever was here fell in, or never existed.</p>
      <a class="down" href="/">Back to the system</a>`,
  });
}

/*
  The sky alone, as seen from a post's planet: a post shows it behind itself, in a frame. The post's planet arrives in
  the address (?planet=Earth) and is left out, and so does the theme to show. Search engines are kept away from it.
*/
export async function skyPage() {
  return cosmosPage({
    head: [
      `<title>Sky · ${esc(site.name)}</title>`,
      `<meta name="robots" content="noindex">`,
    ].join("\n"),
    nav: "away",
    posts: await getPosts(),
    view: "backdrop",
    hero: `      <h1 id="name">Sky</h1>`,
  });
}

/** The script a post includes to show the sky behind it (cosmos/src/backdrop/loader.js), with its content hash. */
export const backdropScriptAddress = () => builtScript("backdrop.js");

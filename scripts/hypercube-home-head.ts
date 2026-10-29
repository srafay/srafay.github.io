/*
  The head of the homepage, which is version 5 of the About page at /. Below the head the page is the same as
  /about/v5/. The head is what differs: the homepage may be indexed, it is the site's own address, it carries the site's
  icons and feed, it tells search engines who the site is about, and it counts the visit (lib/visit-counter.ts).

  Everything here says only what the page shows: the name, the bio, the life drawn as one object, and the profiles
  under Find me. The notes are not on the page, so their structured data is not either. The page is black in both
  themes, so its one theme colour is the template's (lib/hypercube/page.html), not the pair the sky had.
*/
import { site } from "@/lib/site";
import { visitCounterScript } from "@/lib/visit-counter";
import { escapeHtml } from "./standalone-page";

export const HOME_ADDRESS = "/";

/** The homepage is titled with the site's name. */
export const HOME_TITLE = site.name;

export const HOME_DESCRIPTION =
  "Syed Rafay is a senior software engineer at Twin Technology. This page draws every role, degree, project, course and skill as one object in four dimensions.";

/** Unlike the prototype it is made from, the homepage may be indexed and followed. */
export const HOME_ROBOTS = "index, follow";

const metaName = (name: string, content: string) => `<meta name="${name}" content="${escapeHtml(content)}">`;
const metaProperty = (property: string, content: string) => `<meta property="${property}" content="${escapeHtml(content)}">`;

const canonicalLink = () => `<link rel="canonical" href="${site.url}${HOME_ADDRESS}">`;

/** The names a link preview and a search result read, besides the share card's own tags. */
const nameTags = () =>
  [
    metaName("author", site.name),
    metaProperty("og:site_name", site.name),
    metaName("twitter:title", HOME_TITLE),
    metaName("twitter:description", HOME_DESCRIPTION),
  ].join("\n");

const iconLinks = () =>
  [
    `<link rel="icon" href="/favicon.ico" sizes="any">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
  ].join("\n");

const feedLink = () =>
  `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.name)}" href="${site.rss}">`;

/** The person and the website, by the ids the posts' own structured data points at. */
function structuredData() {
  const person = { "@id": `${site.url}/#person` };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        ...person,
        name: site.name,
        url: `${site.url}${HOME_ADDRESS}`,
        sameAs: site.links.map((link) => link.href),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: `${site.url}${HOME_ADDRESS}`,
        name: site.name,
        author: person,
      },
    ],
  };
}

const structuredDataScript = () =>
  `<script type="application/ld+json">${JSON.stringify(structuredData()).replace(/</g, "\\u003c")}</script>`;

const visitCounter = () => `<script>${visitCounterScript}</script>`;

/** The tags that follow the title. The share card's tags come from the build, since they name the card's image file. */
export function homePageMeta(shareCardTags: string) {
  return [canonicalLink(), shareCardTags, nameTags(), iconLinks(), feedLink(), structuredDataScript(), visitCounter()].join("\n");
}

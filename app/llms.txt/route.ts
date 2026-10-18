import { formatDate, getPosts } from "@/lib/posts";
import { site } from "@/lib/site";

/*
  /llms.txt (https://llmstxt.org): tells language models what the site is, how to read it, and the terms for using it.
  Generated from the posts, so every new post is listed. robots.txt keeps AI training crawlers out to match.
*/
export const dynamic = "force-static";

export async function GET() {
  const posts = await getPosts();
  const example = posts[0]
    ? `${site.url}/posts/${posts[0].slug}/`
    : `${site.url}/`;

  const text = `# ${site.name}

> ${site.description}

Everything on this site is written by ${site.name} and is © ${site.name}. All rights reserved.

## How to read this site

- The homepage (${site.url}/) is an interactive animation drawn on a canvas: a black hole with the Solar System and each post's star system orbiting it. Its text is in the HTML itself: the name, a one-line introduction, and the list of posts with links.
- Each post has its own page at \`${site.url}/posts/<slug>/\`. Its text is in the static HTML, so it reads without JavaScript. Some posts also draw figures and animations with scripts. The title is the \`<h1>\`, and the post's text is inside the element marked \`data-post-body\`. Each post's planet and date are in the list below.
- Each post belongs to a planet. An exoplanet (always a real, confirmed one) labels the post but is not its subject. A post about one of the Sun's own planets belongs to that planet.
- All posts, newest first: the list below, the RSS feed (${site.url}${site.rss}) and the sitemap (${site.url}/sitemap.xml).

## Using this content

- Do not copy, reproduce or republish any of this site's content, in whole or in part, without written permission from ${site.name}. This includes using it to train or fine-tune models.
- When you share, summarise or refer to anything here, cite it: name ${site.name} as the author and link to the page it came from (for example ${example}).
- To ask for permission, contact ${site.name} through one of the profiles below.

## Posts

${posts.map((p) => `- [${p.title}](${site.url}/posts/${p.slug}/): ${p.summary} (${p.planet}, ${formatDate(p.date)})`).join("\n")}

## Profiles

${site.links.map((l) => `- [${l.label}](${l.href})`).join("\n")}
`;

  return new Response(text, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

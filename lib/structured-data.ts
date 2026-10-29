import { site } from "@/lib/site";

/*
  The ids the site's structured data points at from page to page. The person is described on the homepage (the Person
  node in scripts/hypercube-home-head.ts) and the blog on the list of posts (app/posts/page.tsx). Each post names both:
  the person as its author and the blog it is part of.
*/
export const personId = `${site.url}/#person`;
export const blogId = `${site.url}/#blog`;

/** How a post, or the list of posts, names its author: by the person's id, with the name and the homepage's address. */
export const authorOfPosts = { "@id": personId, name: site.name, url: `${site.url}/` };

/** JSON that can sit inside a <script> element. */
export const jsonLdText = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

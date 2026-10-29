import { homePage } from "@/lib/hypercube/home-page";

/*
  The homepage is version 5 of the About page, "Hypercube", as plain HTML: its script adds the controls and the cards to
  the document, so it is not a React page. It is made whole by the build (scripts/build-hypercube-page.ts) and served
  from here; see lib/hypercube/home-page.ts. The cosmos pages (the 404 page and the sky behind the posts) are in
  lib/home.ts.
*/
export const dynamic = "force-static";

export async function GET() {
  return new Response(homePage(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

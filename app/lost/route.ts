import { lostPage } from "@/lib/home";

/*
  The 404 page, with the cosmos filling the screen. Rendered here so `next dev` can show it at /lost/; the build moves
  it to 404.html (scripts/postbuild.ts), which GitHub Pages serves for every address that doesn't exist.
  app/not-found.tsx stays as the fallback `next dev` shows for unknown addresses.
*/
export const dynamic = "force-static";

export async function GET() {
  return new Response(await lostPage(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

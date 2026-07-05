import { homePage } from "@/lib/home";

// The homepage is plain HTML rendered at build time; see lib/home.ts for why it isn't a React page.
export const dynamic = "force-static";

export async function GET() {
  return new Response(await homePage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

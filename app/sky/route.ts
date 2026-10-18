import { skyPage } from "@/lib/home";

/*
  The sky alone, which posts show behind themselves in a frame (see skyPage in lib/home.ts). The build moves it to
  sky/index.html (scripts/postbuild.ts), where GitHub Pages serves /sky/.
*/
export const dynamic = "force-static";

export async function GET() {
  return new Response(await skyPage(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

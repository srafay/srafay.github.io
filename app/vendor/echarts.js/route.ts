import fs from "node:fs";
import path from "node:path";

/*
  Apache ECharts, served from this site instead of a third-party CDN. Posts load it only when a chart is about to
  come into view (see public/post-scripts/daylight-saving.js). The file comes from the installed package, so
  updating the dependency updates what is served.
*/
export const dynamic = "force-static";

export async function GET() {
  const library = fs.readFileSync(
    path.join(
      process.cwd(),
      "node_modules",
      "echarts",
      "dist",
      "echarts.min.js",
    ),
  );
  return new Response(library, {
    headers: { "Content-Type": "text/javascript; charset=utf-8" },
  });
}

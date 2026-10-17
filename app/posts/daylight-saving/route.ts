import { ownPageResponse } from "@/lib/own-page";

// The daylight saving post is a page of its own, told around a globe of Earth; see lib/own-page.ts.
export const dynamic = "force-static";

export function GET() {
  return ownPageResponse("daylight-saving");
}

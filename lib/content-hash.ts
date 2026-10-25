import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** A file in public/, addressed with a hash of its contents, so a new build of it is never served from a cache. */
export function addressWithContentHash(pathInPublic: string) {
  const contents = fs.readFileSync(
    path.join(process.cwd(), "public", pathInPublic),
  );
  const hash = createHash("sha256").update(contents).digest("hex");
  return `/${pathInPublic}?v=${hash.slice(0, 10)}`;
}

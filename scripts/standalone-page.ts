/*
  What every version of the About page built as a page of its own shares, outside Next: its script bundled by Bun, its
  template filled in, the site's fonts preloaded, and a hash of each file's contents for its address. So a phone that
  cached an older build fetches the new one.

  The site's typecheck has no Bun types (Next builds under Node), so the one call made to Bun here is typed by hand.
*/
import { createHash } from "node:crypto";
import { preloadedFonts } from "@/lib/fonts";

type Bundler = {
  build(options: {
    entrypoints: string[];
    target: "browser";
    format: "iife";
    minify: boolean;
  }): Promise<{ success: boolean; logs: unknown[]; outputs: Blob[] }>;
};
const { Bun } = globalThis as unknown as { Bun: Bundler };

/** The first ten hex digits of a file's SHA-256, for its address. */
export const hashOf = (contents: string) =>
  createHash("sha256").update(contents).digest("hex").slice(0, 10);

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** The page's script, bundled and minified from its entry file. */
export async function bundleScript(entry: string, name: string) {
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "iife",
    minify: true,
  });
  if (!result.success)
    throw new AggregateError(result.logs, `Could not build the ${name} scene`);
  return result.outputs[0].text();
}

/** The site's fonts, asked for before the stylesheet asks. */
export const fontPreloads = () =>
  preloadedFonts
    .map(
      (href) =>
        `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`,
    )
    .join("\n");

/** Fills each {{key}} in a page template. A key the values lack fails the build. */
export function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`page.html asks for {{${key}}}`);
    return values[key];
  });
}

/*
  What every version of the About page built as a page of its own shares, outside Next: its script bundled by Bun, its
  template filled in, the site's fonts preloaded, and a hash of each file's contents for its address. So a phone that
  cached an older build fetches the new one.

  The site's typecheck has no Bun types (Next builds under Node), so the one call made to Bun here is typed by hand.
*/
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { preloadedFonts } from "@/lib/fonts";
import { site } from "@/lib/site";

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

/** Each art file's address on the page, with a hash of its contents. */
export type ArtAddresses = Map<string, string>;

/**
  Copies a page's art files from their source folder into its built folder. The answer is each file's address, its
  page's own address and the file's name, with a hash of its contents so a phone that cached an older one fetches anew.
*/
export function copyArt(sourceFolder: string, files: string[], outputFolder: string, pageAddress: string): ArtAddresses {
  const addresses: ArtAddresses = new Map();
  for (const file of files) {
    const contents = fs.readFileSync(path.join(sourceFolder, file));
    fs.writeFileSync(path.join(outputFolder, file), contents);
    const hash = createHash("sha256").update(contents).digest("hex").slice(0, 10);
    addresses.set(file, `${pageAddress}${file}?v=${hash}`);
  }
  return addresses;
}

/** The image a link to a page shows when it is posted: its file, its size and the words for it. */
export type ShareImage = { file: string; width: number; height: number; alt: string };

/** The meta tags that show a share image, every address absolute on the live site. */
export function shareMeta(addresses: ArtAddresses, image: ShareImage, pageAddress: string, title: string, description: string) {
  const address = `${site.url}${addresses.get(image.file)}`;
  return [
    `<meta property="og:type" content="profile">`,
    `<meta property="og:url" content="${site.url}${pageAddress}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:image" content="${address}">`,
    `<meta property="og:image:width" content="${image.width}">`,
    `<meta property="og:image:height" content="${image.height}">`,
    `<meta property="og:image:alt" content="${escapeHtml(image.alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${address}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(image.alt)}">`,
  ].join("\n");
}

/** Fills each {{key}} in a page template. A key the values lack fails the build. */
export function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`page.html asks for {{${key}}}`);
    return values[key];
  });
}

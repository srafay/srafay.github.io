import fs from "node:fs";
import path from "node:path";

/** CSS custom properties, e.g. `{ "--signal": "#e5484d" }`. */
type TokenOverrides = Record<`--${string}`, string>;

export type PostMetadata = {
  title: string;
  /** ISO date, e.g. "2026-10-10". */
  date: string;
  /**
   * The real, confirmed exoplanet this post is named after and drawn as, written exactly as catalogued,
   * e.g. "Proxima Cen b". See "Posts are exoplanets" in AGENTS.md.
   */
  planet: string;
  summary: string;
  draft?: boolean;
  /** Per-post theme: overrides site tokens on this post's page only. */
  theme?: { light?: TokenOverrides; dark?: TokenOverrides };
  /** Extra CSS loaded on this post's page only. */
  css?: string;
};

export type Post = PostMetadata & { slug: string; readingMinutes: number };

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export function getPostSlugs(): string[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

function readingMinutes(slug: string): number {
  const source = fs.readFileSync(path.join(POSTS_DIR, `${slug}.mdx`), "utf8");
  const words = source
    .replace(/^export const metadata[\s\S]*?\n};?\n/m, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export async function getPost(slug: string): Promise<Post> {
  const { metadata } = (await import(`@/content/posts/${slug}.mdx`)) as {
    metadata: PostMetadata;
  };
  return { ...metadata, slug, readingMinutes: readingMinutes(slug) };
}

/** Published posts, newest first. Drafts show only in `next dev`. */
export async function getPosts(): Promise<Post[]> {
  const posts = await Promise.all(getPostSlugs().map(getPost));
  return posts
    .filter((post) => !post.draft || process.env.NODE_ENV === "development")
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

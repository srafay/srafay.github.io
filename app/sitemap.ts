import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  return [
    { url: `${site.url}/` },
    { url: `${site.url}/posts/` },
    { url: `${site.url}${site.about}` },
    ...posts.map((post) => ({
      url: `${site.url}/posts/${post.slug}/`,
      lastModified: post.date,
    })),
  ];
}

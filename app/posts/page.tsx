import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, getPosts, type Post } from "@/lib/posts";
import { site } from "@/lib/site";
import { authorOfPosts, blogId, jsonLdText } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Posts",
  description: "Everything written so far, newest first.",
  alternates: { canonical: "/posts/" },
};

/** What search engines read about the list: the blog, by the id every post's own page says it is part of, and its posts. */
function structuredData(posts: Post[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": blogId,
    url: `${site.url}/posts/`,
    name: `${site.name}: notes`,
    author: authorOfPosts,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.summary,
      datePublished: post.date,
      url: `${site.url}/posts/${post.slug}/`,
      author: authorOfPosts,
    })),
  };
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(structuredData(posts)) }}
      />
      <section className="page-intro">
        <h1>Posts</h1>
        <p>
          Everything written so far, newest first. Each note is a real planet.
        </p>
      </section>
      <ul className="entries">
        {posts.map((post) => (
          <li key={post.slug}>
            <p className="meta">
              <b>{post.planet}</b>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </p>
            <h2>
              <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
              {post.draft && (
                <span className="ml-2 text-sm text-muted-foreground">
                  (draft)
                </span>
              )}
            </h2>
            <p>{post.summary}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

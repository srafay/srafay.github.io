import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, getPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Everything written so far, newest first.",
  alternates: { canonical: "/posts/" },
};

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <>
      <section className="page-intro">
        <h1>Writing</h1>
        <p>
          Everything written so far, newest first. Each note is a real
          exoplanet.
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

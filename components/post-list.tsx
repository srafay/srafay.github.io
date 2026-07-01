import Link from "next/link";
import { formatDate, type Post } from "@/lib/posts";

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="text-muted-foreground">No posts yet. The first one is on its way.</p>;
  }

  return (
    <ul className="divide-y border-y">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            href={`/posts/${post.slug}/`}
            className="group grid gap-1 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6"
          >
            <time dateTime={post.date} className="pt-1 text-sm text-muted-foreground tabular-nums">
              {formatDate(post.date)}
            </time>
            <span>
              <span className="text-xl font-semibold tracking-tight decoration-signal decoration-2 underline-offset-4 group-hover:underline">
                {post.title}
                {post.draft && <span className="ml-2 text-sm font-normal text-muted-foreground">(draft)</span>}
              </span>
              <span className="mt-1 block max-w-[60ch] font-serif text-muted-foreground">
                {post.summary}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

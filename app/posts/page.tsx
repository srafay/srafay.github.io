import type { Metadata } from "next";
import { PostList } from "@/components/post-list";
import { getPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Everything written so far, newest first.",
};

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <section className="pt-14 pb-16 sm:pt-20">
      <h1 className="font-display text-6xl sm:text-8xl">Writing</h1>
      <p className="mt-4 mb-12 max-w-[50ch] text-lg text-muted-foreground italic">
        Everything written so far, newest first.
      </p>
      <PostList posts={posts} />
    </section>
  );
}

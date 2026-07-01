import type { Metadata } from "next";
import { PostList } from "@/components/post-list";
import { getPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes on software, systems and the occasional tangent.",
};

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <section className="pt-14 pb-16 sm:pt-20">
      <h1 className="text-5xl font-extrabold tracking-[-0.04em] sm:text-7xl">Writing</h1>
      <p className="mt-4 mb-12 max-w-[50ch] font-serif text-lg text-muted-foreground">
        Notes on software, systems and the occasional tangent.
      </p>
      <PostList posts={posts} />
    </section>
  );
}

import Link from "next/link";
import { Lantern } from "@/components/lantern";
import { PostList } from "@/components/post-list";
import { getPosts } from "@/lib/posts";

export default async function Home() {
  const posts = (await getPosts()).slice(0, 5);

  return (
    <>
      <section className="pt-16 pb-20 sm:pt-28 sm:pb-32">
        <h1 className="font-display text-[clamp(3.5rem,14vw,10rem)] leading-[0.9] tracking-[-0.02em]">
          <Lantern>Syed Rafay</Lantern>
        </h1>
        <p className="mt-8 max-w-[44ch] text-xl leading-snug text-muted-foreground italic sm:text-2xl">
          A few notes, kept in the dark until they&apos;re ready.
        </p>
      </section>

      <section className="grid gap-6 border-t py-16 sm:grid-cols-[9rem_1fr]">
        <h2 className="font-display text-3xl">Writing</h2>
        <div>
          <PostList posts={posts} />
          <Link
            href="/posts/"
            className="mt-6 inline-block text-link underline underline-offset-4"
          >
            All writing
          </Link>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { PostList } from "@/components/post-list";
import { RequestTrace } from "@/components/request-trace";
import { getPosts } from "@/lib/posts";

export default async function Home() {
  const posts = (await getPosts()).slice(0, 5);

  return (
    <>
      <section className="pt-14 pb-20 sm:pt-24 sm:pb-28">
        <h1 className="text-[clamp(3.25rem,12vw,8.5rem)] leading-[0.92] font-extrabold tracking-[-0.03em] [font-variation-settings:'wdth'_88]">
          Syed Rafay
        </h1>
        <p className="mt-6 max-w-[42ch] font-serif text-xl leading-snug text-muted-foreground sm:text-2xl">
          Senior software engineer. I build systems that stay boring in production, from the
          database to the button you click.
        </p>
        <RequestTrace />
      </section>

      <section className="grid gap-6 border-t py-16 sm:grid-cols-[9rem_1fr]">
        <h2 className="text-2xl font-bold tracking-tight">About</h2>
        <div className="prose">
          <p>
            I work mostly in Python, AWS and serverless, with GraphQL and React on top. I care
            about leverage: clean systems, unblocked teams, and code that keeps paying off long
            after it ships.
          </p>
          <p>
            I like tight feedback loops, sharp abstractions and reliability nobody has to think
            about. Ask me about distributed systems, pragmatic infrastructure as code, or cricket.
          </p>
          <p>When I&apos;m not shipping, I&apos;m probably in a Dota 2 lobby.</p>
        </div>
      </section>

      <section className="grid gap-6 border-t py-16 sm:grid-cols-[9rem_1fr]">
        <h2 className="text-2xl font-bold tracking-tight">Writing</h2>
        <div>
          <PostList posts={posts} />
          <Link
            href="/posts/"
            className="mt-6 inline-block text-sm font-medium text-link underline underline-offset-4"
          >
            All writing
          </Link>
        </div>
      </section>
    </>
  );
}

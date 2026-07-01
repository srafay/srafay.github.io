import type { Metadata } from "next";
import Link from "next/link";
import { PostTheme } from "@/components/post-theme";
import { formatDate, getPost, getPosts } from "@/lib/posts";

export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return {
    title: post.title,
    description: post.summary,
    openGraph: { type: "article", title: post.title, description: post.summary, publishedTime: post.date },
  };
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  const { default: Content } = await import(`@/content/posts/${slug}.mdx`);

  return (
    <article data-post={slug} className="pt-14 pb-16 sm:pt-20">
      <PostTheme theme={post.theme} css={post.css} />
      <Link href="/posts/" className="text-sm text-muted-foreground hover:text-foreground">
        All writing
      </Link>
      <header className="mt-8 mb-12 max-w-4xl">
        <h1 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl">
          {post.title}
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">
          <time dateTime={post.date}>{formatDate(post.date)}</time>, {post.readingMinutes} min read
        </p>
      </header>
      <div className="prose">
        <Content />
      </div>
    </article>
  );
}

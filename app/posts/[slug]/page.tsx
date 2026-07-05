import type { Metadata } from "next";
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
    alternates: { canonical: `/posts/${slug}/` },
    openGraph: { type: "article", title: post.title, description: post.summary, publishedTime: post.date },
  };
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  const { default: Content } = await import(`@/content/posts/${slug}.mdx`);

  return (
    <article data-post={slug} className="post">
      <PostTheme theme={post.theme} css={post.css} />
      <a href="/" className="back">
        Back to the system
      </a>
      <p className="des">
        {post.planet} <span>{formatDate(post.date)}, {post.readingMinutes} min read</span>
      </p>
      <h1>{post.title}</h1>
      {/* The homepage's reader fetches this page and shows what's inside data-post-body. */}
      <div className="prose" data-post-body="">
        <Content />
      </div>
    </article>
  );
}

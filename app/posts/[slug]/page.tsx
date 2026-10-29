import type { Metadata } from "next";
import { CosmosBackdrop } from "@/components/cosmos-backdrop";
import { PostTheme } from "@/components/post-theme";
import { backdropScriptAddress } from "@/lib/home";
import { formatDate, getPost, getPosts, type Post } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamicParams = false;

// Posts that are pages of their own are served by their own route (app/posts/<slug>/route.ts), not this one.
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts
    .filter((post) => !post.ownPage)
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/posts/${slug}/` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      publishedTime: post.date,
    },
    twitter: { card: "summary", title: post.title, description: post.summary },
  };
}

/** What search engines read about a post: a BlogPosting by the site's author. */
function structuredData(post: Post) {
  const url = `${site.url}/posts/${post.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    url,
    mainEntityOfPage: url,
    author: {
      "@id": `${site.url}/#person`,
      name: site.name,
      url: `${site.url}/`,
    },
    isPartOf: { "@id": `${site.url}/#blog` },
  };
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  const { default: Content } = await import(`@/content/posts/${slug}.mdx`);

  return (
    <article data-post={slug} className="post">
      <PostTheme theme={post.theme} css={post.css} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData(post)).replace(/</g, "\\u003c"),
        }}
      />
      <CosmosBackdrop
        planet={post.planet}
        scriptAddress={backdropScriptAddress()}
      />
      <a href="/" className="back">
        Back home
      </a>
      <p className="des">
        {post.planet}{" "}
        <span>
          {formatDate(post.date)}, {post.readingMinutes} min read
        </span>
      </p>
      <h1>{post.title}</h1>
      {/* The cosmos pages' reader fetches this page and shows what's inside data-post-body. */}
      <div className="prose" data-post-body="">
        <Content />
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { blogPosts, getBlogPost, type BlogBlock } from "@/lib/blogs";
import { SiteNav, SiteFooter } from "@/components/site-shell";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: "Blog Not Found | Crawler Que" };
  }

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      images: [post.heroImage],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [post.heroImage],
    },
  };
}

function BlogContentBlock({ block }: { block: BlogBlock }) {
  if (block.type === "heading") {
    if (block.level === 3) {
      return <h3 className="mt-8 text-xl font-bold text-white">{block.text}</h3>;
    }

    return <h2 className="mt-12 text-3xl font-extrabold tracking-tight text-white">{block.text}</h2>;
  }

  if (block.type === "paragraph") {
    return <p className="mt-5 text-lg leading-8 text-[var(--cq-text-2)]">{block.text}</p>;
  }

  if (block.type === "image") {
    return (
      <div className="relative my-10 h-[360px] overflow-hidden rounded-3xl border border-white/10 bg-black/20">
        <Image src={block.src} alt={block.alt} fill className="object-cover" sizes="100vw" />
      </div>
    );
  }

  return (
    <div className="my-8 overflow-x-auto rounded-2xl border border-white/10 bg-[var(--cq-surface)]">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex === 0 ? "bg-white/10 text-white" : "border-t border-white/10 text-[var(--cq-text-2)]"}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-4 align-top leading-6">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    image: post.heroImage,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Organization",
      name: "Crawler Que by Strat IQ Digital",
    },
    publisher: {
      "@type": "Organization",
      name: "Crawler Que by Strat IQ Digital",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://crawlerque.com/blog/${post.slug}`,
    },
  };

return (
  <div className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)] antialiased">
    <SiteNav />

    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <article className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/blog" className="mb-8 inline-flex text-sm font-semibold text-[var(--cq-signal)]">
          ← Back to blog
        </Link>

        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--cq-signal)]">
          {post.category}
        </p>

        <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">
          {post.title}
        </h1>

        <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--cq-text-3)]">
          <span>{post.publishedAt}</span>
          <span>•</span>
          <span>{post.readingTime}</span>
          <span>•</span>
          <span>{post.primaryKeyword}</span>
        </div>

        <p className="mt-6 text-xl leading-8 text-[var(--cq-text-2)]">{post.excerpt}</p>

        <div className="relative mt-10 h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          <Image src={post.heroImage} alt={post.heroAlt} fill priority className="object-cover" sizes="100vw" />
        </div>

        <div className="mt-12">
          {post.blocks.map((block, index) => (
            <BlogContentBlock key={index} block={block} />
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-[var(--cq-signal)]/30 bg-[var(--cq-surface)] p-8">
          <h2 className="text-2xl font-bold text-white">Want to audit your website?</h2>
          <p className="mt-3 text-[var(--cq-text-2)]">
            Run a Crawler Que audit to check SEO, Core Web Vitals, traffic signals, competitors,
            backlinks, recommendations, and AI search visibility.
          </p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-[var(--cq-signal)] px-6 py-3 font-bold text-[var(--cq-ink)] transition hover:bg-[var(--cq-signal-deep)]">
            Run website audit
          </Link>
        </div>
      </article>
    </main>

    <SiteFooter />
  </div>
);
}

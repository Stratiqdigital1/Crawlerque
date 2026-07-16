import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublishedBlogPosts,
  type PublicBlogPost,
} from "@/lib/blog-data";
import {
  SiteNav,
  SiteFooter,
} from "@/components/site-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "Crawler Que Blog | SEO, AI Visibility & Website Growth Guides",
  description:
    "Read Crawler Que guides on SEO audits, AI search visibility, competitor analysis, traffic growth, backlinks, Core Web Vitals, and GEO.",
};

function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
}

function BlogCardImage({
  post,
}: {
  post: PublicBlogPost;
}) {
  if (isRemoteImage(post.heroImage)) {
    return (
      <img
        src={post.heroImage}
        alt={post.heroAlt}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
    );
  }

  return (
    <Image
      src={post.heroImage}
      alt={post.heroAlt}
      fill
      className="object-cover transition duration-500 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  );
}

function formatPublishDate(
  publishedAt: string
) {
  return new Date(
    `${publishedAt}T00:00:00Z`
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogPage() {
  const sortedPosts =
    await getPublishedBlogPosts();

  return (
    <div className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)] antialiased">
      <SiteNav />

      <main>
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--cq-signal)]">
              Crawler Que Blog
            </p>

            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
              Website growth guides for SEO,
              AI search, and smarter audits.
            </h1>

            <p className="mt-5 text-lg leading-8 text-[var(--cq-text-2)]">
              Learn how to find technical SEO
              issues, traffic gaps, competitor
              opportunities, backlink signals,
              Core Web Vitals problems, and AI
              search visibility gaps before they
              cost you growth.
            </p>
          </div>

          {sortedPosts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[var(--cq-surface)] p-12 text-center">
              <h2 className="text-2xl font-bold text-white">
                New guides are coming soon
              </h2>

              <p className="mt-3 text-[var(--cq-text-2)]">
                Crawler Que website growth
                articles will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sortedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-[var(--cq-surface)] shadow-xl transition hover:-translate-y-1 hover:border-[var(--cq-signal)]"
                >
                  <div className="relative h-56 w-full overflow-hidden bg-black/20">
                    <BlogCardImage post={post} />
                  </div>

                  <div className="p-6">
                    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[var(--cq-text-3)]">
                      <span>{post.category}</span>

                      <span>
                        <time
                          dateTime={
                            post.publishedAt
                          }
                        >
                          {formatPublishDate(
                            post.publishedAt
                          )}
                        </time>

                        {" · "}
                        {post.readingTime}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold leading-snug text-white group-hover:text-[var(--cq-signal)]">
                      {post.title}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-[var(--cq-text-2)]">
                      {post.excerpt}
                    </p>

                    <span className="mt-5 inline-flex text-sm font-semibold text-[var(--cq-signal)]">
                      Read guide →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
import type {
  MetadataRoute,
} from "next";
import {
  getPublishedBlogPosts,
} from "@/lib/blog-data";

export const dynamic = "force-dynamic";

const BASE = "https://crawlerque.com";

export default async function sitemap(): Promise<
  MetadataRoute.Sitemap
> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap =
    [
      "",
      "/blog",
      "/ai-search-visibility",
      "/sample-report",
      "/for-agencies",
      "/for-seo-teams",
      "/for-consultants",
      "/testimonials",
      "/affiliate-program",
      "/contact",
      "/changelog",
      "/privacy-policy",
      "/return-policy",
    ].map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency:
        "weekly" as const,
      priority:
        path === "" ? 1 : 0.7,
    }));

  const posts =
    await getPublishedBlogPosts();

  const blogPages: MetadataRoute.Sitemap =
    posts.map((post) => {
      const publishedDate = new Date(
        `${post.publishedAt}T00:00:00Z`
      );

      const modifiedDate =
        post.updatedAt
          ? new Date(post.updatedAt)
          : publishedDate;

      return {
        url:
          `${BASE}/blog/${post.slug}`,
        lastModified:
          Number.isNaN(
            modifiedDate.getTime()
          )
            ? publishedDate
            : modifiedDate,
        changeFrequency:
          "monthly" as const,
        priority: 0.6,
      };
    });

  return [
    ...staticPages,
    ...blogPages,
  ];
}
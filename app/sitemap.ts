// app/sitemap.ts
// Native Next.js sitemap — auto-served at https://crawlerque.com/sitemap.xml
// Pulls blog URLs from your real blog registry: lib/blogs.ts (export: blogPosts)
import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blogs";

const BASE = "https://crawlerque.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",                       // homepage
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
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  // Only include posts whose publish date has arrived (keeps scheduled posts out).
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const blogPages = blogPosts
    .filter((p) => new Date(p.publishedAt + "T00:00:00") <= now)
    .map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt + "T00:00:00"),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...blogPages];
}
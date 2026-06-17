import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://crawlerque.com";
  const routes = [
    "", "/sample-report", "/ai-search-visibility", "/changelog",
    "/for-agencies", "/for-seo-teams", "/for-consultants",
    "/blog", "/contact", "/privacy-policy", "/return-policy",
    "/affiliate-program", "/login", "/signup",
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));
}
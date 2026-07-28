import type { Metadata } from "next";

const title = "AI Visibility Tool | Track ChatGPT, Claude & Gemini";
const description =
  "See whether ChatGPT, Claude, and Gemini mention, cite, or recommend your brand. Score AI visibility, competitor presence, and GEO readiness with Crawler Que.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/ai-search-visibility",
  },
  openGraph: {
    title,
    description,
    url: "/ai-search-visibility",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function AiSearchVisibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

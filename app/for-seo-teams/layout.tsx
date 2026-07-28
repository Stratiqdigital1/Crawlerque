import type { Metadata } from "next";

const title = "The One SEO Audit Tool Built for Your In-House SEO Team";
const description =
  "Bring SEO, technical performance, AI visibility, competitor intelligence, and executive-ready reporting into one audit workflow for in-house SEO teams.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/for-seo-teams",
  },
  openGraph: {
    title,
    description,
    url: "/for-seo-teams",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function ForSeoTeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

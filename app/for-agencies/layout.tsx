import type { Metadata } from "next";

const title = "White-Label SEO Audit Tool for Agencies | Crawler Que";
const description =
  "Win pitches with white-label SEO audit reports, AI visibility scoring, comparison reports, and 30/60/90 roadmaps. Get 40 audits and 3 seats for $99/month.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/for-agencies",
  },
  openGraph: {
    title,
    description,
    url: "/for-agencies",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function ForAgenciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

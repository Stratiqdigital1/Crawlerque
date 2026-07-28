import type { Metadata } from "next";

const title = "SEO Audit Report Example | View a Crawler Que Sample PDF";
const description =
  "See a real Crawler Que audit report before you subscribe. Review the executive snapshot, SEO findings, AI visibility, technical data, and action roadmap.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/sample-report",
  },
  openGraph: {
    title,
    description,
    url: "/sample-report",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function SampleReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

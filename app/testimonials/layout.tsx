import type { Metadata } from "next";

const title = "Crawler Que Reviews & Customer Testimonials | SEO Audits";
const description =
  "See how agencies, consultants, and SEO teams use Crawler Que for website audits and AI visibility reporting. Read customer feedback and results.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/testimonials",
  },
  openGraph: {
    title,
    description,
    url: "/testimonials",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function TestimonialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

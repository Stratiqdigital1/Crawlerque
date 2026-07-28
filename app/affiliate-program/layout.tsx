import type { Metadata } from "next";

const title = "SEO Affiliate Program | Earn 30% Recurring Commission";
const description =
  "Join the Crawler Que affiliate program and earn 30% recurring commission on referrals. Promote an AI website audit platform built for agencies and SEO teams.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/affiliate-program",
  },
  openGraph: {
    title,
    description,
    url: "/affiliate-program",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function AffiliateProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

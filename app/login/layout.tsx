import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In — Crawler Que",
  description: "Log in to your Crawler Que account to run SEO and AI visibility audits, view reports, and export white-label growth plans.",
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
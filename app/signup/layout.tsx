import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Your Account — Crawler Que",
  description: "Set up your Crawler Que account and start running AI-powered website audits with white-label PDF reporting.",
  robots: { index: false, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Crawler Que",
  description: "Run audits and view your website growth reports.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
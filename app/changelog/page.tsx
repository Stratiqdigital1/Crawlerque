// app/changelog/page.tsx
import { SiteNav, SiteFooter, PageHero, Section, CtaBand } from "@/components/site-shell";

export const metadata = { title: "Changelog — Crawler Que" };

// Keep this list updated — an active changelog is one of the strongest
// trust signals a SaaS can show. Newest entries first.
const ENTRIES: { date: string; tag: string; title: string; items: string[] }[] = [
  {
    date: "June 2026",
    tag: "Major",
    title: "Report Engine v2 + full product redesign",
    items: [
      "Completely redesigned PDF reports: cleaner layout, larger type, zero text overflow, and sections that flow naturally instead of one per page.",
      "Removed duplicate tables and internal module details from client reports.",
      "New site and dashboard design with improved readability throughout.",
      "Smarter number formatting across reports ($75.2K instead of raw decimals).",
    ],
  },
  {
    date: "May 2026",
    tag: "Feature",
    title: "Real-time audit progress",
    items: [
      "Live progress bar with per-module status while your audit runs.",
      "Audits are saved automatically — reload any report from History.",
    ],
  },
  {
    date: "April 2026",
    tag: "Feature",
    title: "White-label PDF branding",
    items: [
      "Agency and Enterprise plans can replace Crawler Que branding with their own logo, accent color, and footer text.",
      "Branding is configured once in Account Settings and applied to every export.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero eyebrow="Changelog" title="What's new in Crawler Que" sub="We ship improvements continuously. Here's what changed and when." />
      <Section>
        <div className="space-y-6">
          {ENTRIES.map(e => (
            <div key={e.title} className="cq-card p-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm text-[var(--cq-text-3)]">{e.date}</span>
                <span className="rounded-full border border-[var(--cq-signal)]/40 bg-[var(--cq-signal)]/10 px-3 py-0.5 font-mono text-xs text-[var(--cq-signal)]">{e.tag}</span>
              </div>
              <h2 className="mt-3 text-xl font-extrabold">{e.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {e.items.map(it => (
                  <li key={it} className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
                    <span className="mt-2.5 h-1 w-3 shrink-0 bg-[var(--cq-signal)]" />{it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
      <SiteFooter />
    </main>
  );
}
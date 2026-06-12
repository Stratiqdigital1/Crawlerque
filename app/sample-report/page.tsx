// app/sample-report/page.tsx
import { SiteNav, SiteFooter, PageHero, Section, CtaBand } from "@/components/site-shell";

export const metadata = { title: "Sample Report — Crawler Que" };

const SECTIONS = [
  ["Executive Snapshot", "Overall, SEO, performance, and AI visibility scores with benchmarks and the single biggest risk and opportunity."],
  ["Organic Traffic Intelligence", "Modelled monthly traffic, keyword footprint, and the top ranking keywords driving visibility."],
  ["AI Search Visibility", "Whether AI assistants like ChatGPT and Perplexity actually mention the brand, with a GEO readiness verdict."],
  ["Competitor Intelligence", "The ten domains capturing the client's organic visibility, with threat scores and shared keywords."],
  ["Technical & Performance", "Core Web Vitals on mobile and desktop, crawl results, broken links, and metadata gaps."],
  ["Recommendations & Roadmap", "Prioritised action cards with owner, impact, and timeline — plus a 30/60/90-day execution plan."],
];

export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero
        eyebrow="Sample report"
        title="See exactly what your clients receive."
        sub="A real Crawler Que report, exported from a live audit. This is the white-label PDF your clients open — judge it the way they will."
      />
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map(([t, d]) => (
              <div key={t} className="cq-card p-6">
                <h3 className="text-[16px] font-bold">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{d}</p>
              </div>
            ))}
          </div>
          <div className="cq-card cq-frame p-7">
            <p className="cq-eyebrow cq-eyebrow--signal">Download</p>
            <h2 className="mt-2 text-xl font-extrabold">Full sample PDF</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              18 pages. Real data from a live audit, with client details anonymised.
            </p>
            <a href="/sample-report.pdf" className="cq-btn cq-btn--primary mt-5 w-full" download>
              Download sample report (PDF)
            </a>
            <p className="mt-4 text-sm text-[var(--cq-text-3)]">
              On Agency and Enterprise plans, this same report carries your logo, colors, and footer — not ours.
            </p>
          </div>
        </div>
      </Section>
      <CtaBand title="Want this report for your own site?" sub="Run a free audit now — no signup — and see your scores in under two minutes." />
      <SiteFooter />
    </main>
  );
}
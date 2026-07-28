// app/sample-report/page.tsx
import {
  SiteNav,
  SiteFooter,
  PageHero,
  Section,
  CtaBand,
} from "@/components/site-shell";

export const metadata = {
  title: "SEO Audit Report Example | View a Crawler Que Sample PDF",
  description:
    "See a real Crawler Que audit report before you subscribe. Review the executive snapshot, SEO findings, AI visibility, technical data, and action roadmap.",
};

const SECTIONS = [
  [
    "Executive Snapshot",
    "Overall, SEO, performance, and AI visibility scores with benchmarks and the biggest available risks and opportunities.",
  ],
  [
    "Organic Traffic Intelligence",
    "Modelled traffic estimates, keyword footprint, confidence labels, and the ranking keywords contributing to visibility.",
  ],
  [
    "AI Search Visibility",
    "Whether ChatGPT, Claude, and Gemini recognize, mention, cite, or recommend the audited brand, with GEO readiness signals.",
  ],
  [
    "Competitor Intelligence",
    "Organic competitors, shared keywords, traffic comparisons, threat scores, and likely competitive advantages.",
  ],
  [
    "Technical & Performance",
    "Core Web Vitals on mobile and desktop, crawl results, broken links, response codes, and metadata gaps.",
  ],
  [
    "Recommendations & Roadmap",
    "Prioritized actions with owner, impact, and timeline, followed by a practical 30/60/90-day execution plan.",
  ],
];

export default function SampleReportPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />

      <PageHero
        eyebrow="Sample report"
        title="See exactly what your clients receive."
        sub="Review a client-ready Crawler Que report generated from live audit data before you choose a plan."
      />

      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map(([title, description]) => (
              <div key={title} className="cq-card p-6">
                <h3 className="text-[16px] font-bold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="cq-card cq-frame p-7">
            <p className="cq-eyebrow cq-eyebrow--signal">Download</p>
            <h2 className="mt-2 text-xl font-extrabold">Full sample PDF</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              A complete client-ready report generated from live audit data, with identifying details anonymized.
            </p>
            <a
              href="/sample-report.pdf"
              className="cq-btn cq-btn--primary mt-5 w-full"
              download
            >
              Download sample report (PDF)
            </a>
            <p className="mt-4 text-sm text-[var(--cq-text-3)]">
              Agency and Enterprise plans support branded delivery with your logo, colors, and report footer.
            </p>
            <a
              href="/for-agencies"
              className="mt-4 inline-flex text-sm font-semibold text-[var(--cq-signal)] hover:underline"
            >
              Explore white-label reports for agencies →
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)]/55 px-5 py-4">
          <a
            href="/blog/how-agencies-are-billing-300-per-audit-report-and-delivering-it-in-5-minutes"
            className="text-sm font-semibold text-[var(--cq-signal)] hover:underline"
          >
            See how agencies deliver these reports in 5 minutes →
          </a>
        </div>
      </Section>

      <CtaBand
        title="Want this report for your own website?"
        sub="Start a 7-day trial and run 3 complete audits with access to every Crawler Que growth module."
        primaryHref="/#pricing"
        primaryLabel="See plans →"
      />

      <SiteFooter />
    </main>
  );
}

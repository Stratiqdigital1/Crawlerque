// app/for-seo-teams/page.tsx
import { PersonaPage } from "@/components/site-shell";

export const metadata = {
  title: "The One SEO Audit Tool Built for Your In-House SEO Team",
  description:
    "Bring SEO, technical performance, AI visibility, competitor intelligence, and executive-ready reporting into one audit workflow for in-house SEO teams.",
};

export default function ForSeoTeamsPage() {
  return (
    <PersonaPage
      eyebrow="For SEO teams"
      title="One audit. Every signal your team works from."
      sub="Bring technical SEO, content, keywords, competitors, backlinks, performance, and AI search visibility into one website-audit workflow."
      introLinks={[
        {
          href: "/blog/what-is-an-ai-website-audit-tool-and-why-your-seo-stack-needs-one-in-2026",
          label: "What an AI website audit tool does",
        },
      ]}
      pains={[
        {
          t: "Signals scattered across tools",
          d: "Crawl data here, keywords there, and Core Web Vitals somewhere else. Assembling the picture becomes the job before the job.",
        },
        {
          t: "Stakeholders need translations",
          d: "Leadership does not want crawl logs. They want scores, trends, and priorities they can understand quickly.",
        },
        {
          t: "AI search is a blind spot",
          d: "Buyer journeys are expanding into AI-generated answers, while many teams still lack a clear visibility benchmark.",
          link: {
            href: "/ai-search-visibility",
            label: "Explore AI search analytics",
          },
        },
      ]}
      features={[
        {
          t: "Complete audit coverage, one workflow",
          d: "SEO foundation, technical crawl data, Core Web Vitals, traffic modelling, keywords, competitors, backlinks, content quality, and AI visibility in one report.",
        },
        {
          t: "Executive-ready exports",
          d: "Score gauges, benchmarks, and a prioritized roadmap designed to survive being forwarded to leadership.",
        },
        {
          t: "Honest confidence labels",
          d: "Traffic estimates include confidence tiers based on the available keyword footprint instead of presenting modelled data as exact analytics.",
        },
        {
          t: "Saved history and re-runs",
          d: "Store completed reports, run follow-up audits, and compare compatible reports for the same domain.",
        },
      ]}
      proof="Teams can use Crawler Que as a shared starting point: run the audit, assign actions by owner, and track movement across future audits. The 30/60/90 roadmap can also support sprint planning."
      cta={{
        title: "Bring your SEO audit workflow into one place.",
        sub: "Review every growth module, then start a 7-day trial with 3 complete audits.",
        primaryHref: "/#modules",
        primaryLabel: "Explore all audit modules →",
        secondaryHref: "/#pricing",
        secondaryLabel: "See plans",
      }}
    />
  );
}

// app/for-agencies/page.tsx
import { PersonaPage } from "@/components/site-shell";

export const metadata = {
  title: "White-Label SEO Audit Tool for Agencies | Crawler Que",
  description:
    "Win pitches with white-label SEO audit reports, AI visibility scoring, comparison reports, and 30/60/90 roadmaps. Get 40 audits and 3 seats for $99/month.",
};

export default function ForAgenciesPage() {
  return (
    <PersonaPage
      eyebrow="For agencies"
      title="The audit tool that makes your agency look bigger."
      sub="Win pitches with white-label intelligence reports, deliver recurring client reporting in minutes, and add AI visibility insights to your website-growth services."
      pains={[
        {
          t: "Reports eat billable hours",
          d: "Stitching tool exports into a client deck takes hours per client, every month.",
        },
        {
          t: "Clients don't read data dumps",
          d: "Forty pages of disconnected tables impress nobody. Clients want to know what to do next.",
        },
        {
          t: "Hard to stand out in pitches",
          d: "Every agency shows similar ranking screenshots. A clearer growth story makes the pitch easier to understand.",
        },
      ]}
      features={[
        {
          t: "White-label PDF in one click",
          d: "Your logo, your accent color, and your footer. Agency and Enterprise plans are built for branded client delivery.",
          link: {
            href: "/sample-report",
            label: "See a sample white-label report",
          },
        },
        {
          t: "Growth plan, not data dump",
          d: "Every report ends with prioritized action cards and a 30/60/90-day roadmap your client can actually follow.",
        },
        {
          t: "AI visibility scoring",
          d: "Show clients whether ChatGPT, Claude, and Gemini recognize, mention, cite, or recommend their brand.",
          link: {
            href: "/ai-search-visibility",
            label: "Explore AI visibility scoring",
          },
        },
        {
          t: "40 audits, 3 seats, $99",
          d: "Flat monthly pricing for recurring audits, prospect reviews, and multi-client reporting workflows.",
        },
      ]}
      proof="Typical agency math: at $300 per audit-backed report and 15 clients per month, the Agency plan can support more than $4,400 in monthly report revenue against a $99 software cost. Your actual results depend on pricing, demand, and delivery."
      proofLinks={[
        {
          href: "/blog/how-agencies-are-billing-300-per-audit-report-and-delivering-it-in-5-minutes",
          label: "How agencies bill $300 per report",
        },
        {
          href: "/blog/why-paying-229-month-for-semrush-makes-no-sense-for-most-agencies-anymore",
          label: "Compare the cost of larger SEO suites",
        },
      ]}
    />
  );
}

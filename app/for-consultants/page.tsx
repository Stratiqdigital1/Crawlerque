// app/for-consultants/page.tsx
import { PersonaPage } from "@/components/site-shell";

export const metadata = {
  title: "SEO Tools for Consultants & Freelancers | Plans From $30/mo",
  description:
    "Affordable AI SEO tools for independent consultants. Deliver branded audit reports, uncover growth priorities, and run 7 full audits monthly from $30/month.",
};

export default function ForConsultantsPage() {
  return (
    <PersonaPage
      eyebrow="For consultants & freelancers"
      title="Look enterprise-level. Pay freelancer prices."
      sub="Deliver branded website-growth reports that support premium consulting conversations, starting at $30/month for 7 full audits."
      introLinks={[
        {
          href: "/blog/the-freelance-seo-consultants-toolkit-enterprise-level-reports-on-a-solo-budget",
          label: "The freelance SEO consultant's toolkit",
        },
      ]}
      pains={[
        {
          t: "Big-tool prices, solo budget",
          d: "Large SEO suites can be difficult to justify when you manage a focused client portfolio.",
        },
        {
          t: "Deliverables decide your rate",
          d: "A polished, easy-to-understand report can strengthen how clients perceive and value your expertise.",
        },
        {
          t: "Every prospect wants proof",
          d: "Closing new clients means showing them something concrete about their site, quickly and clearly.",
        },
      ]}
      features={[
        {
          t: "Starter plan at $30",
          d: "Run 7 full audits per month with all growth modules, branded PDF exports, and saved report history.",
        },
        {
          t: "A stronger prospect-audit workflow",
          d: "Bring real website findings into prospect calls, demonstrate value, and turn the report into a clear consulting opportunity.",
        },
        {
          t: "Reports clients keep",
          d: "Deliver an executive snapshot, plain-language insights, and a prioritized roadmap clients can review and share.",
          link: {
            href: "/sample-report",
            label: "View a branded sample report",
          },
        },
        {
          t: "Grow into white-label",
          d: "When you scale, the Agency plan adds full white-label reporting, comparison reports, and three user seats.",
        },
      ]}
      proof="Consultant example: charging $150 for five audit-backed reports produces $750 in revenue before other business costs. The $30 Starter plan is designed to make professional reporting accessible to independent consultants."
      cta={{
        title: "Choose a plan built for independent consultants.",
        sub: "Start with a 7-day trial, run 3 complete audits, and review the full workflow before your first subscription charge.",
        primaryHref: "/#pricing",
        primaryLabel: "View plans from $30/mo →",
        secondaryHref: "/sample-report",
        secondaryLabel: "View sample report",
      }}
    />
  );
}

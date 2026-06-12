// app/for-agencies/page.tsx
import { PersonaPage } from "@/components/site-shell";

export const metadata = { title: "Crawler Que for Agencies" };

export default function ForAgenciesPage() {
  return (
    <PersonaPage
      eyebrow="For agencies"
      title="The audit tool that makes your agency look bigger."
      sub="Win pitches with white-label intelligence reports, deliver monthly client reporting in minutes, and add AI visibility — a service your competitors can't show."
      pains={[
        { t: "Reports eat billable hours", d: "Stitching tool exports into a client deck takes hours per client, every month." },
        { t: "Clients don't read data dumps", d: "Forty pages of keyword tables impress nobody. Clients want to know what to do next." },
        { t: "Hard to stand out in pitches", d: "Every agency shows the same ranking screenshots. Differentiating is getting harder." },
      ]}
      features={[
        { t: "White-label PDF in one click", d: "Your logo, your accent color, your footer. Clients never see our name — Agency plan and up." },
        { t: "Growth plan, not data dump", d: "Every report ends with prioritised action cards and a 30/60/90-day roadmap your client can actually follow." },
        { t: "AI visibility scoring", d: "Show clients whether ChatGPT recommends them. It's the strongest pitch-opener in 2026 — and only you have it." },
        { t: "40 audits, 3 seats, $99", d: "Flat pricing with no per-client fees. Audit every client and every prospect without watching a meter." },
      ]}
      proof="Typical agency math: at $300 per audit-backed report and 15 clients per month, the Agency plan returns over $4,400 in monthly revenue against a $99 cost. The PDF is the product — Crawler Que just makes it take five minutes instead of five hours."
    />
  );
}
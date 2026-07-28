// app/affiliate-program/page.tsx
import {
  SiteNav,
  SiteFooter,
  PageHero,
  Section,
  CtaBand,
} from "@/components/site-shell";

export const metadata = {
  title: "SEO Affiliate Program | Earn 30% Recurring Commission",
  description:
    "Join the Crawler Que affiliate program and earn 30% recurring commission on referrals. Promote an AI website audit platform built for agencies and SEO teams.",
};

export default function AffiliatePage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />

      <PageHero
        eyebrow="Affiliate program"
        title="Earn 30% recurring for every qualified referral."
        sub="Refer agencies, consultants, and SEO teams to Crawler Que and earn a recurring commission while their eligible subscription remains active."
      />

      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="cq-card p-6">
            <h3 className="text-[16px] font-bold">30% recurring</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              Earn on eligible subscription renewals. An Agency-plan referral at $99/month would pay $29.70 per eligible renewal.
            </p>
          </div>

          <div className="cq-card p-6">
            <h3 className="text-[16px] font-bold">90-day cookie</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              Your referral link can credit eligible signups completed within 90 days of the tracked click.
            </p>
          </div>

          <div className="cq-card p-6">
            <h3 className="text-[16px] font-bold">Made for a focused audience</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              Crawler Que is built for website-growth professionals who need audits, AI visibility intelligence, and client-ready reporting.
            </p>
            <a
              href="/for-agencies"
              className="mt-4 inline-flex text-sm font-semibold text-[var(--cq-signal)] hover:underline"
            >
              See why agencies are a strong fit →
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)]/55 px-5 py-4 text-center">
          <a
            href="/#pricing"
            className="font-semibold text-[var(--cq-signal)] hover:underline"
          >
            Review the plans your referrals will choose →
          </a>
        </div>

        <div className="cq-card cq-frame mt-8 p-8 text-center">
          <h2 className="text-xl font-extrabold">Apply to join</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-[var(--cq-text-2)]">
            Tell us about your audience and how you plan to promote Crawler Que. Applications are reviewed before approval.
          </p>
          <a
            href="mailto:info@crawlerque.com?subject=Affiliate%20application"
            className="cq-btn cq-btn--primary mt-5"
          >
            Apply via email →
          </a>
        </div>
      </Section>

      <CtaBand
        title="Understand the product before you promote it."
        sub="Review the pricing, sample report, and agency workflow so your referral content matches the product accurately."
        primaryHref="/#pricing"
        primaryLabel="View plans →"
        secondaryHref="/sample-report"
        secondaryLabel="View sample report"
      />

      <SiteFooter />
    </main>
  );
}

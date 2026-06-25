// app/affiliate-program/page.tsx
// Adjust the commission figure to what you actually offer, and connect the
// CTA to your affiliate platform (or keep the mailto until one is set up).
import { SiteNav, SiteFooter, PageHero, Section, CtaBand } from "@/components/site-shell";

export const metadata = {
  title: "Affiliate Program — Crawler Que",
  description: "Earn recurring commission by referring agencies and consultants to Crawler Que's AI-powered SEO audit platform.",
};

export default function AffiliatePage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero
        eyebrow="Affiliate program"
        title="Earn 30% recurring for every agency you refer."
        sub="Know agencies, consultants, or SEO teams who'd use Crawler Que? Refer them and earn 30% of their subscription, every month, for as long as they stay."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["30% recurring", "Not a one-time bounty. You earn on every renewal — an Agency-plan referral pays you $29.70/month, ongoing."],
            ["90-day cookie", "Your referral link credits you for signups within 90 days of the click."],
            ["Made for our audience", "Agencies talk to agencies. If your audience runs client websites, Crawler Que practically sells itself with the free audit."],
          ].map(([t, d]) => (
            <div key={t} className="cq-card p-6">
              <h3 className="text-[16px] font-bold">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{d}</p>
            </div>
          ))}
        </div>
        <div className="cq-card cq-frame mt-8 p-8 text-center">
          <h2 className="text-xl font-extrabold">Apply to join</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-[var(--cq-text-2)]">
            Tell us about your audience and how you'd promote Crawler Que. We approve applications within 2 business days.
          </p>
          <a href="mailto:hello@stratiqdigital.com?subject=Affiliate%20application" className="cq-btn cq-btn--primary mt-5">
            Apply via email →
          </a>
        </div>
      </Section>
      <CtaBand />
      <SiteFooter />
    </main>
  );
}
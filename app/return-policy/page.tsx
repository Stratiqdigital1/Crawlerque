// app/return-policy/page.tsx
// ⚠ TEMPLATE — adjust the refund terms to what you actually offer, replace
// [BRACKETED] items, and have it reviewed. Stripe requires a reachable
// refund/return policy. If you already have this page, merge.
import { SiteNav, SiteFooter, PageHero, Section } from "@/components/site-shell";

export const metadata = {
  title: "Return & Refund Policy — Crawler Que",
  description: "Crawler Que's refund and cancellation policy for subscription plans.",
};

const BLOCKS: [string, string][] = [
  ["Try before you buy", "Crawler Que offers a free audit with no signup, so you can evaluate the product before paying. We encourage every customer to run a free audit and review the sample report before subscribing."],
  ["7-day money-back guarantee", "If Crawler Que isn't right for you, email [SUPPORT EMAIL] within 7 days of your first payment and we will refund it in full — no questions, no forms. This applies to your first subscription payment only."],
  ["Renewals & cancellation", "Subscriptions renew automatically each month. Cancel any time from the dashboard's Subscription tab (via the Stripe billing portal); you keep access until the end of the paid period. Renewal payments are not refundable once the new period has begun, except where required by law."],
  ["Fair use", "Refunds may be declined where audit usage indicates the service was consumed in bulk before the refund request (for example, exhausting the full monthly audit allowance within the refund window). We apply this only to prevent abuse."],
  ["How refunds are paid", "Refunds are issued to the original payment method via Stripe and typically appear within 5–10 business days."],
  ["Contact", "Questions about billing or this policy: [SUPPORT EMAIL]."],
];

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero eyebrow="Legal" title="Return & Refund Policy" sub="Last updated: [DATE]" />
      <Section>
        <div className="mx-auto max-w-3xl space-y-8">
          {BLOCKS.map(([t, b]) => (
            <div key={t}>
              <h2 className="text-lg font-extrabold">{t}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{b}</p>
            </div>
          ))}
        </div>
      </Section>
      <SiteFooter />
    </main>
  );
}
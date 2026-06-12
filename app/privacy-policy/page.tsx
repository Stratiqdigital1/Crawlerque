// app/privacy-policy/page.tsx
// ⚠ TEMPLATE — replace every [BRACKETED] item, and have this reviewed by a
// legal professional for your jurisdiction before launch. Stripe requires a
// reachable privacy policy. If you already have a privacy-policy page, merge
// rather than overwrite.
import { SiteNav, SiteFooter, PageHero, Section } from "@/components/site-shell";

export const metadata = { title: "Privacy Policy — Crawler Que" };

const BLOCKS: [string, string][] = [
  ["Who we are", "Crawler Que is operated by [LEGAL COMPANY NAME] (\"we\", \"us\"), registered at [REGISTERED ADDRESS]. This policy explains what data we collect when you use crawlerque.com and why."],
  ["What we collect", "Account data: name, email, and a hashed password when you register. Billing data: handled entirely by Stripe — we never store card numbers; we store only your Stripe customer reference and subscription status. Usage data: the domains you audit, generated reports, and audit counts, so we can provide history and enforce plan limits. Technical data: IP address and basic request logs used for rate limiting and abuse prevention."],
  ["How we use it", "To run audits you request, store your report history, manage your subscription, send transactional emails (password resets, billing notices), and keep the service secure. We do not sell your data, and we do not use your audit data to market to the websites you audit."],
  ["Third-party processors", "Stripe (payments), Vercel (hosting), Neon (database), Resend (transactional email), DataForSEO and Google PageSpeed Insights (audit data sources). Each receives only the data needed to perform its function."],
  ["Cookies", "We use a single authentication cookie (stratiq_session) to keep you logged in. We do not use third-party advertising cookies."],
  ["Data retention", "Reports are retained per your plan's history window. Account data is kept while your account is active; request deletion at any time at [SUPPORT EMAIL] and we will remove your account and reports within 30 days, except records we must keep for tax or legal reasons."],
  ["Your rights", "You may request a copy, correction, or deletion of your personal data at [SUPPORT EMAIL]. If you are in the EU/UK, you have rights under GDPR including complaint to a supervisory authority."],
  ["Changes", "We will post any changes to this policy here and update the date below. Material changes will be announced by email."],
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero eyebrow="Legal" title="Privacy Policy" sub="Last updated: [DATE]" />
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
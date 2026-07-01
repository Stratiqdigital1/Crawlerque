// app/contact/page.tsx
// Replace the two PLACEHOLDER addresses below with your real contact details.
import { SiteNav, SiteFooter, PageHero, Section } from "@/components/site-shell";

export const metadata = {
  title: "Contact — Crawler Que",
  description: "Get in touch with the Crawler Que team for support, agency plans, or partnership enquiries.",
};

const SUPPORT_EMAIL = "info@crawlerque.com";   // ← replace if different
const SALES_EMAIL   = "info@crawlerque.com"; // ← replace if different

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero eyebrow="Contact" title="Talk to a human" sub="Questions about plans, white-labelling, or a specific audit? We reply within one business day." />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="cq-card cq-frame p-8">
            <p className="cq-eyebrow cq-eyebrow--signal">Support</p>
            <h2 className="mt-2 text-xl font-extrabold">Product & billing help</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              Account issues, audit questions, billing, and bug reports.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="cq-btn cq-btn--primary mt-5">{SUPPORT_EMAIL}</a>
          </div>
          <div className="cq-card p-8">
            <p className="cq-eyebrow">Sales & partnerships</p>
            <h2 className="mt-2 text-xl font-extrabold">Enterprise & white-label</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              Custom audit volumes, team onboarding, reseller and affiliate partnerships.
            </p>
            <a href={`mailto:${SALES_EMAIL}`} className="cq-btn cq-btn--ghost mt-5">{SALES_EMAIL}</a>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-[var(--cq-text-3)]">
          Crawler Que is built and operated by{" "}
          <a href="https://stratiqdigital.com" target="_blank" rel="noopener noreferrer" className="text-[var(--cq-signal)] hover:underline">Strat IQ Digital</a>.
        </p>
      </Section>
      <SiteFooter />
    </main>
  );
}
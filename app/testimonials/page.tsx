// app/testimonials/page.tsx
//
// ⚠ IMPORTANT — REPLACE BEFORE LAUNCH ⚠
// The quotes below are bracketed PLACEHOLDERS, not real testimonials.
// Publishing invented testimonials damages trust and is illegal in many
// jurisdictions (e.g. FTC rules in the US). Replace each placeholder with a
// real quote, with the client's written permission, before going live.
// Until you have 3+ real quotes, keep this page out of the nav/footer.
import { SiteNav, SiteFooter, PageHero, Section, CtaBand } from "@/components/site-shell";

export const metadata = { title: "Testimonials — Crawler Que" };

const QUOTES = [
  { q: "[Replace with a real client quote about time saved on reporting.]", name: "[Client name]", role: "[Role, Company]" },
  { q: "[Replace with a real client quote about winning a pitch using the report.]", name: "[Client name]", role: "[Role, Company]" },
  { q: "[Replace with a real client quote about the AI visibility module.]", name: "[Client name]", role: "[Role, Company]" },
  { q: "[Replace with a real client quote about white-label branding.]", name: "[Client name]", role: "[Role, Company]" },
  { q: "[Replace with a real client quote about value vs. bigger tools.]", name: "[Client name]", role: "[Role, Company]" },
  { q: "[Replace with a real client quote about client reactions to the PDF.]", name: "[Client name]", role: "[Role, Company]" },
];

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero
        eyebrow="Testimonials"
        title="What agencies say about Crawler Que"
        sub="Real teams, real reports, real client wins."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {QUOTES.map((t, i) => (
            <figure key={i} className="cq-card flex flex-col p-6">
              <span className="font-mono text-2xl text-[var(--cq-signal)]">"</span>
              <blockquote className="mt-1 flex-1 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{t.q}</blockquote>
              <figcaption className="mt-5 border-t border-[var(--cq-line-soft)] pt-4">
                <p className="text-[15px] font-bold">{t.name}</p>
                <p className="text-sm text-[var(--cq-text-3)]">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-[var(--cq-text-3)]">
          Using Crawler Que and want to be featured here? <a href="/contact" className="text-[var(--cq-signal)] hover:underline">Tell us your story →</a>
        </p>
      </Section>
      <CtaBand />
      <SiteFooter />
    </main>
  );
}
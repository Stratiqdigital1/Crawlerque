// app/testimonials/page.tsx
//
// ⚠ IMPORTANT — REPLACE BEFORE LAUNCH ⚠
// The quotes below are bracketed PLACEHOLDERS, not real testimonials.
// Publishing invented testimonials damages trust and is illegal in many
// jurisdictions (e.g. FTC rules in the US). Replace each placeholder with a
// real quote, with the client's written permission, before going live.
// Until you have 3+ real quotes, keep this page out of the nav/footer.
import { SiteNav, SiteFooter, PageHero, Section, CtaBand } from "@/components/site-shell";

export const metadata = {
  title: "Customer Testimonials — Crawler Que",
  description: "See how agencies, consultants, and SEO teams use Crawler Que to audit websites and deliver client-ready growth plans faster.",
};

const QUOTES = [
  { q: "[We used to spend half a day pulling reports together for each client. Now I run the audit, tweak a few things, and the PDF is basically done. It's given me my Fridays back.]", name: "[Sarah Whitfield]", role: "[Founder, Northlight SEO]" },
  { q: "[Honestly I was skeptical about the AI visibility part at first. But when I showed a client that ChatGPT wasn't mentioning them and their competitor was, that was the moment they signed. Sold me on the whole thing.]", name: "[Daniel Okafor,]", role: "[Digital Marketing Lead, Bright Harbor Media]" },
  { q: "[The reports actually make sense to my clients, which is the biggest thing for me. They don't want forty pages of keyword tables, they want to know what to fix and why. This gives them exactly that.]", name: "[Priya Nair,]", role: "[Freelance SEO Consultant]" },
  { q: "[Good tool for the price. The Core Web Vitals and technical checks caught a couple of issues our old setup missed. Interface took me a day or two to get comfortable with but no complaints now.]", name: "[Marcus Reilly,]", role: "[Head of Growth, Tenfold Commerce]" },
  { q: "[We audit a lot of sites every month and the white label reports have made client calls so much smoother. Everything is branded, everything is clear, and the roadmap gives us something concrete to talk through.]", name: "[Elena Vasquez,]", role: "[Account Director, Pivot Point Agency]" },
  { q: "[What I like is that it doesn't just dump data on you. It tells you what matters most and roughly what it's worth to fix. That prioritisation is the part I actually use.]", name: "[Tom Bradley,]", role: "[In House SEO Manager, Kestrel Software]" },
  { q: "[Started on the trial mostly to see the AI search visibility scoring and ended up keeping it for the whole audit suite. It has quietly become the first thing I run when I take on a new project.]", name: "[Aisha Rahman,]", role: "[SEO Strategist, Meridian Digital]" },
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
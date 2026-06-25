// app/blog/page.tsx
// Starter blog index. Replace the COMING_SOON entries with real posts as you
// publish them (each post can be its own page under app/blog/[slug]).
import { SiteNav, SiteFooter, PageHero, Section, CtaBand } from "@/components/site-shell";

export const metadata = {
  title: "Blog — SEO, AI Visibility & GEO Insights | Crawler Que",
  description: "Guides on AI search visibility, GEO, technical SEO, Core Web Vitals, and traffic estimation. Practical tactics for agencies and SEO teams.",
};

const COMING_SOON = [
  { tag: "AI Search", title: "GEO explained: how to get your clients recommended by ChatGPT", desc: "Entity signals, FAQ schema, third-party citations — the practical checklist for generative engine optimisation." },
  { tag: "Agency Growth", title: "The $300 audit: pricing intelligence reports clients happily pay for", desc: "How agencies package audit reports as a paid product and a retainer opener." },
  { tag: "Product", title: "How Crawler Que models traffic without analytics access", desc: "Ranked keywords, CTR curves, and confidence tiers — our estimation method, explained honestly." },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero eyebrow="Blog" title="Growth intelligence, written down" sub="Practical guides on SEO auditing, AI search visibility, and selling reports as an agency." />
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          {COMING_SOON.map(p => (
            <article key={p.title} className="cq-card flex flex-col p-6">
              <span className="self-start rounded-full border border-[var(--cq-signal)]/30 px-3 py-0.5 font-mono text-xs text-[var(--cq-signal)]">{p.tag}</span>
              <h2 className="mt-4 text-[17px] font-extrabold leading-snug">{p.title}</h2>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{p.desc}</p>
              <p className="mt-5 font-mono text-xs uppercase tracking-[0.08em] text-[var(--cq-text-3)]">Coming soon</p>
            </article>
          ))}
        </div>
      </Section>
      <CtaBand />
      <SiteFooter />
    </main>
  );
}
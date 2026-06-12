// app/ai-search-visibility/page.tsx
import { SiteNav, SiteFooter, PageHero, Section, CtaBand } from "@/components/site-shell";

export const metadata = { title: "AI Search Visibility — Crawler Que" };

export default function AiVisibilityPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero
        eyebrow="AI search visibility"
        title="Your clients are being searched on ChatGPT. Are they showing up?"
        sub="Search is moving from ten blue links to AI-generated answers. Crawler Que measures whether AI assistants actually recommend your client's brand — and tells you how to fix it when they don't."
      />
      <Section>
        <h2 className="text-2xl font-extrabold">What the AI Visibility module measures</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ["Brand mention testing", "We query multiple AI models with realistic buyer prompts for the client's niche and record whether the brand appears in the answers."],
            ["AI Visibility Score (0–100)", "A single score built from mention ratio and model coverage, with an honest confidence label — we never present a thin sample as certainty."],
            ["Share of voice", "How often the client appears versus competitors when AI is asked for recommendations in their category."],
            ["GEO readiness verdict", "Generative Engine Optimisation: the entity signals, schema, FAQs, and third-party citations the site needs so AI models can cite it confidently."],
          ].map(([t, d]) => (
            <div key={t} className="cq-card p-6">
              <h3 className="text-[16px] font-bold">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{d}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section alt>
        <h2 className="text-2xl font-extrabold">Why this sells audits for you</h2>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">
          Every business owner has heard that "AI is changing search" — almost none of them can see
          where they stand. Showing a client their AI Visibility Score next to their competitors' is
          the fastest trust-builder in your audit, because it answers a question no traditional SEO
          tool answers. SEMrush and Ahrefs report rankings; Crawler Que reports whether the machines
          that increasingly answer buyers' questions know your client exists.
        </p>
      </Section>
      <CtaBand title="Check any brand's AI visibility." sub="Run a free audit and add the AI Visibility module on any paid plan." />
      <SiteFooter />
    </main>
  );
}
// app/ai-search-visibility/page.tsx
import {
  SiteNav,
  SiteFooter,
  PageHero,
  Section,
  CtaBand,
} from "@/components/site-shell";

export const metadata = {
  title: "AI Visibility Tool | Track ChatGPT, Claude & Gemini",
  description:
    "See whether ChatGPT, Claude, and Gemini mention, cite, or recommend your brand. Score AI visibility, competitor presence, and GEO readiness with Crawler Que.",
};

const MEASURES = [
  {
    title: "Brand mention testing",
    description:
      "Crawler Que queries ChatGPT, Claude, and Gemini with realistic category and buyer-intent prompts, then records whether the audited brand appears.",
  },
  {
    title: "AI Visibility Score (0–100)",
    description:
      "A score built from model coverage, mentions, citations, and available prompt evidence, with a confidence label that reflects the sample depth.",
    link: {
      href: "/blog/how-to-measure-brand-visibility-in-chatgpt",
      label: "Measure brand visibility in ChatGPT",
    },
  },
  {
    title: "Share of voice",
    description:
      "See how often the audited brand appears compared with competitors when AI models are asked for recommendations in the same category.",
  },
  {
    title: "GEO readiness verdict",
    description:
      "Review entity signals, schema, FAQs, content clarity, and citation opportunities that can improve readiness for generative search experiences.",
  },
];

export default function AiVisibilityPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />

      <PageHero
        eyebrow="AI search visibility"
        title="See whether ChatGPT, Claude, and Gemini recommend your brand."
        sub="Crawler Que measures brand mentions, competitor visibility, cited pages, missed prompts, and GEO readiness across leading AI assistants."
      />

      <Section>
        <h2 className="text-2xl font-extrabold">
          What the AI Visibility module measures
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MEASURES.map((item) => (
            <div key={item.title} className="cq-card p-6">
              <h3 className="text-[16px] font-bold">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
                {item.description}
              </p>
              {item.link && (
                <a
                  href={item.link.href}
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--cq-signal)] hover:underline"
                >
                  {item.link.label} →
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)]/55 px-5 py-4">
          <a
            href="/blog/ai-search-visibility-explained-how-to-find-out-if-chatgpt-recommends-your-brand"
            className="font-semibold text-[var(--cq-signal)] hover:underline"
          >
            Learn how AI search visibility works →
          </a>
        </div>
      </Section>

      <Section alt>
        <h2 className="text-2xl font-extrabold">
          Why this strengthens agency and consulting audits
        </h2>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">
          Business owners increasingly want to know whether AI assistants recognize and recommend their brand. Adding model-by-model visibility, competitor mentions, and cited pages gives teams a clearer starting point for GEO planning and client conversations.
        </p>
        <a
          href="/for-agencies"
          className="mt-5 inline-flex text-sm font-semibold text-[var(--cq-signal)] hover:underline"
        >
          See how agencies use this to win pitches →
        </a>
      </Section>

      <section className="border-b border-[var(--cq-line-soft)] px-5 py-12 md:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--cq-line)] bg-[var(--cq-surface)]/55 p-6 text-center">
          <p className="cq-eyebrow cq-eyebrow--signal">Related guide</p>
          <h2 className="mt-3 text-xl font-extrabold">
            Check how brand visibility appears in ChatGPT-style answers.
          </h2>
          <a
            href="/blog/chatgpt-visibility-checker"
            className="cq-btn cq-btn--ghost mt-5"
          >
            Open the ChatGPT visibility checker guide →
          </a>
        </div>
      </section>

      <CtaBand
        title="Check any brand's AI visibility."
        sub="Start a 7-day trial and run 3 complete audits with access to AI Search Visibility and every Crawler Que growth module."
      />

      <SiteFooter />
    </main>
  );
}

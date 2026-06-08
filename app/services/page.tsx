import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Website Audit Services | SEO, GEO & AI Visibility Reporting",
  description:
    "Crawler Que by Strat IQ Digital helps agencies and consultants run AI-powered website audits, SEO audits, GEO audits, PageSpeed reports, keyword gap analysis, competitor intelligence, AI visibility tracking, and white-label PDF reports.",
};

export default function ServicesPage() {
  const services = [
    {
      title: "AI Website Audit",
      desc: "Run a complete website growth audit that checks SEO health, technical issues, speed, content quality, visibility signals, and client-ready improvement opportunities.",
    },
    {
      title: "SEO Audit & Technical SEO",
      desc: "Analyze title tags, meta descriptions, headings, crawlability, internal structure, image ALT issues, Core Web Vitals, PageSpeed, and technical SEO problems.",
    },
    {
      title: "GEO & AI Visibility Audit",
      desc: "Check how ready a website is for AI search engines, Gemini-style answers, AI Overviews, LLM recommendations, entity understanding, topical trust, and answer engine visibility.",
    },
    {
      title: "Keyword Gap Analysis",
      desc: "Find keywords competitors rank for but your website is missing, then turn those gaps into page, blog, content, and landing page opportunities.",
    },
    {
      title: "Competitor Intelligence",
      desc: "Discover organic competitors, shared keyword overlap, traffic signals, competitive risks, winning factors, and the areas where your client can gain market share.",
    },
    {
      title: "Traffic Intelligence",
      desc: "Estimate organic visibility using keyword ranking data, CTR modeling, traffic signals, and confidence scoring so agencies can explain growth potential clearly.",
    },
    {
      title: "Backlink Authority Audit",
      desc: "Review backlinks, referring domains, authority strength, trust signals, and link-building opportunities that support SEO and AI search visibility.",
    },
    {
      title: "White-Label PDF Reports",
      desc: "Generate professional branded audit reports that agencies can share with clients as sales assets, strategy documents, and monthly growth deliverables.",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Website Audit Services",
    provider: {
      "@type": "Organization",
      name: "Crawler Que by Strat IQ Digital",
    },
    serviceType:
      "AI Website Audit, SEO Audit, GEO Audit, AI Visibility Audit, Technical SEO Audit, Keyword Gap Analysis, Competitor Intelligence",
    description:
      "AI-powered website growth intelligence platform for agencies, consultants, and businesses that need SEO audits, GEO audits, AI visibility tracking, competitor analysis, keyword gaps, PageSpeed checks, and white-label PDF reports.",
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="relative overflow-hidden border-b border-[#222] px-6 py-24 md:px-12">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(#222_1px,transparent_1px),linear-gradient(90deg,#222_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="absolute -right-40 -top-40 h-[650px] w-[650px] rounded-full bg-[#C5FF3D]/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <a href="/" className="text-lg font-bold">
            Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
          </a>

          <p className="mt-16 font-mono text-xs uppercase tracking-[0.2em] text-[#C5FF3D]">
            AI Website Growth Intelligence Services
          </p>

          <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            SEO audits are changing.
            <br />
            <span className="text-[#C5FF3D]">
              AI visibility is the next growth layer.
            </span>
          </h1>

          <p className="mt-8 max-w-3xl text-lg leading-8 text-[#A0A0A0]">
            Crawler Que helps agencies, consultants, and businesses audit
            websites for traditional search engines and AI-powered search
            systems. The platform combines SEO auditing, GEO readiness,
            AI visibility, keyword gaps, competitor intelligence, PageSpeed,
            backlinks, and white-label reporting into one client-ready growth
            report.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            {[
              "SEO Audit",
              "GEO Audit",
              "AI Visibility",
              "PageSpeed",
              "Keyword Gaps",
              "Competitor Intelligence",
              "White-Label PDF",
            ].map((item) => (
              <span
                key={item}
                className="rounded border border-[#C5FF3D]/30 px-3 py-1 font-mono text-xs uppercase tracking-wider text-[#C5FF3D]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C5FF3D]">
            What The Tool Does
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
            A complete website audit system built for SEO, GEO, and AI search.
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#A0A0A0]">
            The platform does more than scan pages. It turns technical data into
            a clear business growth plan that helps clients understand what is
            broken, what is missing, what competitors are doing better, and what
            needs to be fixed first.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-2xl border border-[#222] bg-[#111] p-6"
              >
                <h3 className="text-2xl font-bold text-white">
                  {service.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#A0A0A0]">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#222] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C5FF3D]">
            Why GEO Matters
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
            Search is moving from links to answers.
          </h2>

          <p className="mt-5 max-w-4xl text-base leading-8 text-[#A0A0A0]">
            Generative Engine Optimization helps websites become easier for AI
            systems to understand, trust, and recommend. This means improving
            entity clarity, structured content, expert signals, schema,
            comparison pages, FAQs, topical authority, review signals, and
            third-party mentions. Crawler Que helps identify these gaps before your
            competitors become the default answer.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              "Make pages easier for AI systems to understand.",
              "Build stronger topical and entity authority.",
              "Create content that answers real buyer questions.",
              "Improve trust signals through reviews and mentions.",
              "Structure pages for featured answers and AI summaries.",
              "Turn audit data into client-ready action plans.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[#222] bg-[#181818] p-5 text-sm leading-7 text-[#CCCCCC]"
              >
                <span className="mr-2 text-[#C5FF3D]">•</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#222] px-6 py-24 text-center md:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Other tools give data.
            <br />
            <span className="text-[#C5FF3D]">
              Crawler Que gives a growth plan.
            </span>
          </h2>

          <p className="mt-6 text-base leading-8 text-[#A0A0A0]">
            Run a free audit to see the website’s SEO and technical foundation.
            Upgrade to unlock full AI visibility, keyword gaps, competitors,
            backlinks, traffic intelligence, and white-label PDF reporting.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <a
              href="/"
              className="rounded-xl bg-[#C5FF3D] px-7 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black"
            >
              Run Free Audit →
            </a>

            <a
              href="/login"
              className="rounded-xl border border-[#222] bg-[#111] px-7 py-4 font-mono text-sm font-bold uppercase tracking-wider text-white"
            >
              Login
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
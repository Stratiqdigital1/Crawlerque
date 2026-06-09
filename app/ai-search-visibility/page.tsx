// @ts-nocheck
"use client";

export default function AISearchVisibilityPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white antialiased">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" className="flex items-center gap-1.5">
            <span className="text-[17px] font-extrabold text-white">Crawler Que</span>
            <span className="text-[17px] font-extrabold text-[#C5FF3D]"> by Strat IQ Digital</span>
          </a>
          <a href="/#pricing" className="rounded-xl bg-[#C5FF3D] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-black">
            Get Started
          </a>
        </div>
      </nav>

      <section className="border-b border-white/5 px-5 pb-24 pt-20 md:px-8">
        <div className="pointer-events-none absolute -right-48 -top-48 h-[600px] w-[600px] rounded-full bg-[#C5FF3D]/5 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C5FF3D]/20 bg-[#C5FF3D]/8 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#C5FF3D]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5FF3D]" />
            AI Search Visibility Tool
          </div>
          <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">
            Is your brand visible<br />
            <span className="text-[#C5FF3D]">in AI search results?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/45">
            ChatGPT, Perplexity, Gemini, and AI Overviews are changing how people discover businesses. Crawler Que measures your brand&#39;s presence across AI-generated results and shows you exactly how to improve it.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href="/#pricing" className="rounded-xl bg-[#C5FF3D] px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white">
              Run AI Visibility Audit
            </a>
            <a href="/sample-report" className="rounded-xl border border-white/10 px-8 py-4 font-mono text-sm uppercase tracking-wider text-white/40 transition hover:text-white">
              View Sample Report
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; What We Measure</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">
            GEO — Generative Engine Optimisation
          </h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/40">
            Traditional SEO optimises for Google&#39;s blue links. GEO optimises for AI-generated answers. Crawler Que audits both.
          </p>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title:"Brand Mention Tracking",   desc:"We test whether your brand appears inside AI-generated responses across ChatGPT, Gemini, Perplexity, and other models." },
              { title:"AI Visibility Score",       desc:"A 0–100 score measuring how consistently your brand surfaces in AI discovery environments across different prompt types." },
              { title:"Model Coverage",            desc:"See which AI models mention your brand and which do not. Identify gaps and build coverage systematically." },
              { title:"Prompt-Level Testing",      desc:"We test real discovery prompts your potential clients actually ask AI systems when looking for services like yours." },
              { title:"Entity Signal Analysis",    desc:"Identify which entity signals, schema types, and content structures improve AI system recognition of your brand." },
              { title:"GEO Readiness Score",       desc:"A readiness assessment covering entity clarity, structured data, citation presence, and content authority signals." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/5 bg-[#0d0d0d] p-6 transition hover:border-[#C5FF3D]/15">
                <h3 className="text-[15px] font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/35">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; How to Improve</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">
            How to become visible<br className="hidden md:block" /> in AI search
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {[
              { n:"01", t:"Build entity signals",       d:"Add clear company information, service descriptions, location data, and structured markup so AI systems understand who you are and what you do." },
              { n:"02", t:"Create FAQ content",          d:"AI systems love clear question-and-answer content. FAQ pages that directly answer industry questions significantly increase AI citation probability." },
              { n:"03", t:"Earn third-party citations",  d:"AI systems prefer brands that appear in multiple trusted sources. Press coverage, directory listings, and industry mentions all improve AI visibility." },
              { n:"04", t:"Add structured data",         d:"Schema markup for Organization, Service, FAQ, and LocalBusiness helps AI systems extract and present your information in generated results." },
              { n:"05", t:"Build topical authority",     d:"AI systems favour sites with deep, consistent coverage of a specific topic. Publishing comprehensive content clusters increases AI discovery likelihood." },
              { n:"06", t:"Monitor and iterate",         d:"Run regular AI visibility audits to track progress. Crawler Que measures visibility across models so you can see what is working and what is not." },
            ].map((item) => (
              <div key={item.n} className="flex gap-5 rounded-xl border border-white/5 bg-[#0d0d0d] p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C5FF3D]/15 bg-[#C5FF3D]/8">
                  <span className="font-mono text-xs font-bold text-[#C5FF3D]">{item.n}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white">{item.t}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/35">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-24 text-center md:px-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#C5FF3D]/5 blur-[100px]" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-[clamp(2rem,5vw,3rem)] font-extrabold leading-tight tracking-tight">
            Measure your AI visibility<br />
            <span className="text-[#C5FF3D]">before your competitors do.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/40">
            AI search is not the future. It is already here. The brands that get audited and optimised now will own the AI results page.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="/#pricing" className="rounded-xl bg-[#C5FF3D] px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white">
              Run AI Visibility Audit &#8594;
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-5 py-8 text-center md:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/20">
          &#169; 2026 Crawler Que by Strat IQ Digital &#183;{" "}
          <a href="/" className="hover:text-white/40">Home</a> &#183;{" "}
          <a href="/#pricing" className="hover:text-white/40">Pricing</a> &#183;{" "}
          <a href="/sample-report" className="hover:text-white/40">Sample Report</a>
        </p>
      </footer>
    </main>
  );
}
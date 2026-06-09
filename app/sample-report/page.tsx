// @ts-nocheck
"use client";

export default function SampleReportPage() {
  const scores = [
    { label:"Overall Score",   value:72, color:"#C5FF3D" },
    { label:"SEO Foundation",  value:68, color:"#C5FF3D" },
    { label:"Performance",     value:61, color:"#FEBC2E" },
    { label:"AI Visibility",   value:44, color:"#EF4444" },
  ];

  const keywords = [
    { keyword:"seo agency london",         position:4,  volume:"2,400", traffic:"197" },
    { keyword:"website audit tool",        position:7,  volume:"1,300", traffic:"53" },
    { keyword:"technical seo audit",       position:12, volume:"3,600", traffic:"29" },
    { keyword:"ai visibility seo",         position:6,  volume:"880",   traffic:"46" },
    { keyword:"white label seo reports",   position:9,  volume:"590",   traffic:"19" },
  ];

  const issues = [
    { title:"Missing H1 on 4 landing pages",           impact:"High",   fix:"Add a clear H1 tag to each page defining the primary topic" },
    { title:"Mobile LCP exceeds 2.5s",                 impact:"High",   fix:"Compress hero images and defer non-critical JavaScript" },
    { title:"12 images missing ALT text",              impact:"Medium", fix:"Add descriptive ALT text to all product and blog images" },
    { title:"Meta descriptions missing on 7 pages",    impact:"Medium", fix:"Write unique 140–160 character descriptions for each page" },
    { title:"No AI visibility detected",               impact:"High",   fix:"Add entity signals, FAQ schema, and third-party brand citations" },
  ];

  return (
    <main className="min-h-screen bg-[#080808] text-white antialiased">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" className="flex items-center gap-1.5">
            <span className="text-[17px] font-extrabold text-white">Crawler Que</span>
            <span className="text-[17px] font-extrabold text-[#C5FF3D]"> by Strat IQ Digital</span>
          </a>
          <a href="#pricing" className="rounded-xl bg-[#C5FF3D] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-black transition hover:bg-white">
            Get Started
          </a>
        </div>
      </nav>

      {/* HEADER */}
      <section className="border-b border-white/5 px-5 py-16 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C5FF3D]/20 bg-[#C5FF3D]/8 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5FF3D]" />
            Interactive Sample Report
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-tight tracking-tight">
            This is what your<br />
            <span className="text-[#C5FF3D]">client receives.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/40">
            A real sample audit for a fictional agency domain. This is exactly what the Agency plan produces — white-label ready, client-facing, and export-ready as a PDF.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-2 font-mono text-xs text-white/40">
              Domain: example-agency.com
            </div>
            <div className="rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-2 font-mono text-xs text-white/40">
              Modules: All 8
            </div>
            <div className="rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-2 font-mono text-xs text-white/40">
              Generated: June 2026
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-5 py-16 md:px-8">

        {/* SCORES */}
        <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-8">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">01 — Score Overview</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {scores.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/5 bg-[#080808] p-5 text-center">
                <div className="text-4xl font-extrabold" style={{ color:s.color }}>{s.value}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/25">/100</div>
                <div className="mt-2 text-xs text-white/40">{s.label}</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full transition-all" style={{ width:`${s.value}%`, backgroundColor:s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EXECUTIVE INSIGHTS */}
        <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-8">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">02 — Executive Insights</div>
          <div className="space-y-4">
            {[
              { type:"risk",  label:"Biggest Risk",        color:"#EF4444", text:"AI visibility is critically low at 44/100. The brand is largely absent from AI-generated recommendations, representing a growing risk as AI search adoption increases." },
              { type:"opp",   label:"Biggest Opportunity", color:"#C5FF3D", text:"12 high-volume commercial keywords are within reach of page 1. Targeting these could deliver an estimated +3,200 monthly visits within 60–90 days." },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border p-5" style={{ borderColor:`${card.color}20`, backgroundColor:`${card.color}08` }}>
                <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color:card.color }}>{card.label}</div>
                <p className="text-sm leading-relaxed text-white/60">{card.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TRAFFIC */}
        <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-8">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">03 — Traffic Intelligence</div>
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              { label:"Est. Monthly Visits", value:"4,820",  sub:"Moderate confidence" },
              { label:"Daily Visits",         value:"161",    sub:"Monthly ÷ 30" },
              { label:"Keyword Footprint",    value:"847",    sub:"Ranked keywords" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-white/5 bg-[#080808] p-4">
                <div className="text-2xl font-extrabold text-[#C5FF3D]">{m.value}</div>
                <div className="mt-1 text-[11px] font-semibold text-white/50">{m.label}</div>
                <div className="font-mono text-[9px] text-white/20">{m.sub}</div>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-white/5">
            <table className="w-full">
              <thead className="bg-white/3">
                <tr>{["Keyword","Position","Volume","Est. Traffic"].map(h => <th key={h} className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-wider text-white/30">{h}</th>)}</tr>
              </thead>
              <tbody>
                {keywords.map((k,i) => (
                  <tr key={k.keyword} className={i%2===0?"bg-[#080808]":"bg-[#0a0a0a]"}>
                    <td className="px-4 py-3 text-sm text-white/70">{k.keyword}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-[#C5FF3D]">#{k.position}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/40">{k.volume}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/40">{k.traffic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PRIORITY ISSUES */}
        <div className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-8">
          <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">04 — Priority Issues</div>
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.title} className="rounded-xl border border-white/5 bg-[#080808] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{issue.title}</div>
                    <div className="mt-1 text-sm text-white/35">{issue.fix}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
                    issue.impact === "High"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {issue.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-[#C5FF3D]/15 bg-gradient-to-b from-[#0d1500] to-[#080808] p-10 text-center">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">This is just the preview</div>
          <h2 className="text-2xl font-extrabold text-white">The full report has 17 sections.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/40">
            Competitor intelligence, backlink authority, AI visibility details, keyword gaps, content analysis, and a complete 30/60/90 day action roadmap — all in one white-label PDF.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="/#pricing" className="rounded-xl bg-[#C5FF3D] px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white">
              Get Full Access &#8594;
            </a>
            <a href="/" className="rounded-xl border border-white/10 px-8 py-4 font-mono text-sm uppercase tracking-wider text-white/40 transition hover:text-white">
              Back to Homepage
            </a>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-5 py-8 text-center md:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/20">
          &#169; 2026 Crawler Que by Strat IQ Digital
        </p>
      </footer>
    </main>
  );
}
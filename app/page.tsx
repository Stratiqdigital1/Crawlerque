// @ts-nocheck
"use client";

import { useState } from "react";

const NAV_LINKS = [
  ["#modules",       "Modules"],
  ["#pricing",       "Pricing"],
  ["/sample-report", "Sample Report"],
  ["/login",         "Login"],
];

const FOOTER_LINKS = [
  ["#modules",              "Modules"],
  ["#pricing",              "Pricing"],
  ["/sample-report",        "Sample Report"],
  ["/ai-search-visibility", "AI Visibility"],
  ["/login",                "Login"],
  ["/contact",              "Contact"],
  ["/privacy-policy",       "Privacy Policy"],
  ["/return-policy",        "Return Policy"],
];

const PLANS = [
  {
    name:    "Starter",
    price:   "$49",
    period:  "/mo",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
    desc:    "For freelancers auditing client sites.",
    features:["10 full audits / month","All 8 audit modules","Branded PDF export","30-day report history","1 user seat"],
    usage:   "Perfect for freelancers with up to 5 regular clients.",
    badge:   null,
  },
  {
    name:    "Agency",
    price:   "$99",
    period:  "/mo",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "",
    desc:    "For agencies producing client deliverables.",
    features:["40 full audits / month","White-label PDF reports","Comparison reports","90-day report history","3 user seats"],
    usage:   "40 audits covers 20+ recurring client reports monthly. Every PDF carries your brand.",
    badge:   "Most Popular",
  },
  {
    name:    "Enterprise",
    price:   "$299",
    period:  "/mo",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
    desc:    "For high-volume agencies and consultancies.",
    features:["150 full audits / month","White-label PDF reports","Priority support","Unlimited report history","10 user seats"],
    usage:   "Scale to 50+ clients with 150 audits per month and dedicated priority support.",
    badge:   null,
  },
];

const MODULES = [
  { tag:"SEO",     name:"SEO Intelligence",    desc:"Title, H1, meta, crawlability, keyword density and structured data signals.",                        pills:["ON-PAGE","TECHNICAL"] },
  { tag:"TRAFFIC", name:"Traffic Modelling",    desc:"CTR-curve traffic estimation across all ranked keywords with confidence scoring.",                    pills:["CTR-CURVE","KEYWORDS"] },
  { tag:"SPEED",   name:"Core Web Vitals",      desc:"Google PageSpeed mobile and desktop scores with prioritised fix recommendations.",                    pills:["LCP","CLS","FCP"] },
  { tag:"AI",      name:"AI Search Visibility", desc:"Track how your client's brand appears in AI-generated search results across ChatGPT and Gemini.",     pills:["LLM RANK","GEO"] },
  { tag:"COMPETE", name:"Competitor Intel",     desc:"Benchmark against organic competitors and surface the keyword gaps worth closing.",                   pills:["GAP ANALYSIS","THREATS"] },
  { tag:"LINKS",   name:"Backlink Authority",   desc:"Backlink profile, referring domains, and authority gap signals with trust scoring.",                  pills:["BACKLINKS","TRUST"] },
];

export default function HomePage() {
  const [url,             setUrl]             = useState("");
  const [result,          setResult]          = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError,   setCheckoutError]   = useState("");
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [hoveredPlan,     setHoveredPlan]     = useState(null);

  const handleAudit = async () => {
    if (!url.trim()) return;
    let u = url.trim();
    if (!u.startsWith("http://") && !u.startsWith("https://")) { u = `https://${u}`; setUrl(u); }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/audit", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ url: u, reportTypes:["seo","technical"], auditMode:"free" }) });
      setResult(await res.json());
    } catch { setResult({ success:false, error:"Something went wrong. Please try again." }); }
    finally { setLoading(false); }
  };

  const handleChoosePlan = async (priceId, planName) => {
    if (!priceId) { setCheckoutError("Plan not configured. Please contact support."); return; }
    setCheckoutLoading(planName); setCheckoutError("");
    try {
      const res  = await fetch("/api/stripe/checkout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ priceId, packageName: planName }) });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setCheckoutError(json.error || "Failed to start checkout.");
    } catch { setCheckoutError("Something went wrong. Please try again."); }
    finally { setCheckoutLoading(null); }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white antialiased selection:bg-[#C5FF3D] selection:text-black">

      {/* ANNOUNCEMENT */}
      <div className="flex items-center justify-center gap-3 bg-[#C5FF3D] px-4 py-2 text-center">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black">
          Agency-first audit platform &nbsp;&#183;&nbsp; AI visibility &nbsp;&#183;&nbsp; White-label PDF
        </span>
        <a href="#pricing" className="ml-1 rounded bg-black px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#C5FF3D] transition-all duration-200 hover:bg-[#111] hover:scale-105">
          View Plans
        </a>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070707]/96 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C5FF3D] transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_16px_rgba(197,255,61,0.5)]">
              <span className="font-mono text-[11px] font-black text-black">CQ</span>
            </div>
            <span className="text-[15px] font-extrabold tracking-tight text-white">
              Crawler Que
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <a key={label} href={href} className="rounded-lg px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white/40 transition-all duration-200 hover:bg-white/6 hover:text-white">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a href="#pricing" className="hidden rounded-xl bg-[#C5FF3D] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_20px_rgba(197,255,61,0.4)] md:block">
              Get Started
            </a>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white md:hidden">
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/5 bg-[#0a0a0a] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map(([href, label]) => (
                <a key={label} href={href} onClick={() => setMobileOpen(false)} className="rounded-lg px-4 py-3 font-mono text-sm uppercase tracking-wider text-white/50 transition-all duration-200 hover:bg-white/5 hover:text-white">
                  {label}
                </a>
              ))}
              <a href="#pricing" className="mt-3 rounded-xl bg-[#C5FF3D] px-5 py-3.5 text-center font-mono text-sm font-bold uppercase tracking-wider text-black transition-all duration-200 hover:bg-white">
                Get Started
              </a>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pb-28 pt-20 md:px-8 md:pt-28">
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="pointer-events-none absolute -right-64 -top-64 h-[900px] w-[900px] rounded-full bg-[#C5FF3D]/5 blur-[160px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#C5FF3D]/3 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1fr_460px]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#C5FF3D]/20 bg-[#C5FF3D]/6 px-4 py-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5FF3D]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#C5FF3D]">AI Website Growth Intelligence Platform</span>
            </div>
            <h1 className="text-[clamp(2.6rem,6.5vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">
              Other tools give<br />you data.
              <br />
              <span className="bg-gradient-to-r from-[#C5FF3D] to-[#9dcc28] bg-clip-text text-transparent">We give a growth plan.</span>
            </h1>
            <p className="mt-7 max-w-lg text-[17px] leading-[1.8] text-white/40">
              Built for agencies producing client deliverables. Run audits across 8 intelligence modules, export white-label PDFs, and show clients exactly what to fix and why.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["White-Label PDF","AI Visibility","8 Modules","Competitor Intel","Keyword Gaps"].map(tag => (
                <span key={tag} className="rounded-full border border-white/8 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">{tag}</span>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#pricing" className="rounded-xl bg-[#C5FF3D] px-7 py-3.5 font-mono text-[12px] font-bold uppercase tracking-wider text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_28px_rgba(197,255,61,0.4)]">
                Start Free Trial
              </a>
              <a href="/sample-report" className="rounded-xl border border-white/10 px-7 py-3.5 font-mono text-[12px] uppercase tracking-wider text-white/45 transition-all duration-200 hover:border-white/20 hover:bg-white/4 hover:text-white">
                View Sample Report
              </a>
            </div>
<div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/5 pt-10">
              {[
                { v:"14K+", l:"Keywords Tracked",   color:"#C5FF3D" },
                { v:"8+",   l:"Audit Modules",       color:"#C5FF3D" },
                { v:"3×",   l:"Faster Reports",      color:"#C5FF3D" },
              ].map(({v,l,color}) => (
                <div key={l} className="group">
                  <div
                    className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold transition-all duration-500 group-hover:scale-110"
                    style={{ color }}
                  >
                    {v}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/22">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C5FF3D] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C5FF3D]" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                Live audits running &nbsp;&#183;&nbsp; Data updated in real-time
              </span>
            </div>
          </div>

          {/* AUDIT WIDGET */}
          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#C5FF3D]/14 via-[#C5FF3D]/4 to-transparent" />
            <div className="relative overflow-hidden rounded-2xl bg-[#0c0c0c] shadow-2xl ring-1 ring-white/6">
              <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-5 py-3.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-white/22">free-audit.crawlerque.com</span>
              </div>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C5FF3D]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">Free Audit · No Signup Required</span>
                </div>
                <h2 className="text-lg font-bold text-white">Run a free audit</h2>
                <p className="mt-1 text-sm text-white/30">Enter any URL to get your growth intelligence snapshot.</p>
                <div className="mt-5 space-y-2.5">
                  <input
                    type="text" placeholder="https://yourclient.com" value={url}
                    onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAudit()}
                    className="w-full rounded-xl border border-white/8 bg-[#070707] px-4 py-3.5 font-mono text-sm text-white outline-none placeholder:text-white/15 transition-all duration-200 focus:border-[#C5FF3D]/35 focus:ring-1 focus:ring-[#C5FF3D]/12"
                  />
                  <button
                    onClick={handleAudit} disabled={loading}
                    className="w-full rounded-xl bg-[#C5FF3D] px-5 py-3.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_20px_rgba(197,255,61,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? "Analysing..." : "Run Free Audit →"}
                  </button>
                  {loading && <div className="h-px animate-pulse rounded-full bg-gradient-to-r from-[#C5FF3D] to-transparent" />}
                </div>
                {result && (
                  <div className="mt-4">
                    {result.success ? (
                      <>
                        <div className="overflow-hidden rounded-xl border border-white/6 bg-[#070707]">
                          <div className="border-b border-white/5 bg-white/[0.02] px-4 py-2">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-white/22">audit.result</span>
                          </div>
                          <div className="p-4">
                            {[["Overall Score",result.report?.overallScore??"—"],["SEO Score",result.report?.seoScore??"—"],["Mobile Perf",result.report?.mobilePerformance??"—"],["Desktop Perf",result.report?.desktopPerformance??"—"],["Traffic Est.",result.report?.traffic?.monthly?`${Number(result.report.traffic.monthly).toLocaleString()}/mo`:"—"]].map(([l,v]) => (
                              <div key={l} className="flex items-center justify-between border-b border-white/4 py-2.5 last:border-0">
                                <span className="font-mono text-[10px] uppercase tracking-wider text-white/28">{l}</span>
                                <span className="font-bold text-white">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3 rounded-xl border border-[#C5FF3D]/10 bg-[#C5FF3D]/4 p-4">
                          <p className="text-sm font-semibold text-white">Want the full 8-module report?</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/30">AI visibility, competitor intel, keyword gaps, backlinks, and a white-label PDF.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a href="/sample-report" className="inline-block rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/45 transition-all duration-200 hover:border-white/20 hover:text-white">Sample Report</a>
                            <a href="#pricing" className="inline-block rounded-lg bg-[#C5FF3D] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black transition-all duration-200 hover:bg-white">View Plans →</a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-red-500/15 bg-red-500/6 px-4 py-3 text-sm text-red-400">{result.error}</div>
                    )}
                  </div>
                )}
                <div className="mt-5 border-t border-white/5 pt-4">
                  <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/18">Free audit includes</p>
                  {["Technical SEO scan","Core Web Vitals check","On-page SEO signals"].map(item => (
                    <div key={item} className="flex items-center gap-2.5 py-1 text-sm text-white/30">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[#C5FF3D]" />{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="border-y border-white/5 bg-white/[0.015] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 md:justify-between">
          {[["14,000+","Keywords Analysed"],["8","Audit Modules"],["3×","Faster Reporting"],["100%","White-Labelable"],["AI-Powered","Visibility Scoring"]].map(([v,l]) => (
            <div key={l} className="flex items-center gap-2.5">
              <span className="text-base font-extrabold text-[#C5FF3D]">{v}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/22">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* WHO IS IT FOR */}
      <section className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; Who It&#39;s For</div>
          <h2 className="max-w-2xl text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">Built for the people who deliver results.</h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/38">Whether you run a full-service agency or freelance for three clients, Crawler Que is built around your workflow.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { title:"SEO Agencies",         desc:"Run modular audits for every client. Export white-label PDFs. Save hours per report.", badge:"Most Common" },
              { title:"Web Design Agencies",   desc:"Add SEO intelligence to every website handover. Show clients their growth baseline.", badge:"" },
              { title:"Marketing Consultants", desc:"Back every recommendation with data. Export executive reports clients actually read.", badge:"" },
              { title:"Freelancers",           desc:"Look enterprise-level with branded PDF deliverables. Starter plan keeps costs low.", badge:"" },
              { title:"White-Label Providers", desc:"Resell audits under your own brand. Agency and Enterprise plans fully white-labelable.", badge:"Popular" },
            ].map(card => (
              <div key={card.title} className="group relative rounded-xl border border-white/5 bg-[#0c0c0c] p-6 transition-all duration-300 hover:border-[#C5FF3D]/20 hover:bg-[#0f0f0f] hover:shadow-[0_0_24px_rgba(197,255,61,0.06)]">
                {card.badge && (
                  <div className="absolute -top-3 left-4 rounded-full bg-[#C5FF3D] px-3 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-black shadow-[0_0_10px_rgba(197,255,61,0.4)]">{card.badge}</div>
                )}
                <h3 className="text-[14px] font-bold text-white">{card.title}</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-white/32">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DATA SOURCES */}
      <div className="border-b border-white/5 bg-[#090909] px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-white/18">Intelligence powered by</p>
          <div className="flex flex-wrap items-center justify-center gap-10">
            {[{name:"Google PageSpeed Insights",desc:"Core Web Vitals"},{name:"DataForSEO",desc:"Keywords, Traffic & Backlinks"},{name:"Proprietary AI Engine",desc:"Recommendations & Scoring"},{name:"Google Search Console",desc:"SERP Intelligence"}].map(src => (
              <div key={src.name} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/3">
                  <span className="font-mono text-[9px] font-bold text-[#C5FF3D]">&#9632;</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/60">{src.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-white/22">{src.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; How It Works</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">Audit. Analyse. Deliver.</h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/38">From URL to white-label client PDF in minutes.</p>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {n:"01",t:"Enter any URL",          d:"Paste a client domain. Crawler Que runs all selected modules simultaneously against live data — no install needed."},
              {n:"02",t:"AI analyses everything",  d:"SEO, speed, traffic, AI visibility, competitors, backlinks, keywords — processed, scored, and ranked by impact."},
              {n:"03",t:"Export white-label PDF",  d:"Download a branded PDF with scores, insights, and a 90-day action roadmap ready to share with clients."},
            ].map(s => (
              <div key={s.n} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0c0c0c] p-8 transition-all duration-300 hover:border-[#C5FF3D]/15 hover:shadow-[0_0_30px_rgba(197,255,61,0.05)]">
                <div className="absolute right-5 top-4 font-mono text-[4.5rem] font-extrabold leading-none text-white/[0.025] transition-all duration-500 group-hover:text-[#C5FF3D]/7">{s.n}</div>
                <div className="relative">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-[#C5FF3D]/18 bg-[#C5FF3D]/6 transition-all duration-200 group-hover:border-[#C5FF3D]/35 group-hover:bg-[#C5FF3D]/12">
                    <span className="font-mono text-xs font-bold text-[#C5FF3D]">{s.n}</span>
                  </div>
                  <h3 className="text-[15px] font-bold text-white">{s.t}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-white/32">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; Audit Modules</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">Every intelligence layer<br className="hidden md:block" /> your client needs.</h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/38">Modular by design. Run a full audit or go deep on a single signal.</p>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(mod => (
              <div key={mod.name} className="group rounded-xl border border-white/5 bg-[#0c0c0c] p-6 transition-all duration-300 hover:border-[#C5FF3D]/18 hover:bg-[#0f0f0f] hover:shadow-[0_0_24px_rgba(197,255,61,0.05)]">
                <div className="mb-3 inline-block rounded border border-[#C5FF3D]/12 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#C5FF3D]/55 transition-colors duration-200 group-hover:border-[#C5FF3D]/28 group-hover:text-[#C5FF3D]/80">{mod.tag}</div>
                <h3 className="text-[14px] font-bold text-white">{mod.name}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/32">{mod.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {mod.pills.map(pill => (
                    <span key={pill} className="rounded border border-white/6 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/18">{pill}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; How We Compare</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">Built differently.<br className="hidden md:block" /> For a different workflow.</h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/38">Traditional SEO tools are built for data analysts. Crawler Que is built for agencies producing client deliverables.</p>
          <div className="mt-14 overflow-x-auto rounded-xl border border-white/6">
            <table className="w-full min-w-[580px] border-collapse">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="bg-[#0c0c0c] px-5 py-4 text-left font-mono text-[10px] uppercase tracking-wider text-white/35">Feature</th>
                  {[{name:"Crawler Que",hl:true},{name:"SEMrush",hl:false},{name:"Ahrefs",hl:false}].map(col => (
                    <th key={col.name} className={`px-5 py-4 font-mono text-[11px] uppercase tracking-wider ${col.hl ? "bg-[#0c1800] text-[#C5FF3D]" : "bg-[#0c0c0c] text-white/35"}`}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[["White-Label PDF Reports","✅","Partial","❌"],["AI Search Visibility","✅","❌","❌"],["Agency Workflow Focus","✅","❌","❌"],["Client-Ready Deliverables","✅","Limited","Limited"],["Keyword Gap Intelligence","✅","✅","✅"],["Core Web Vitals Audit","✅","✅","✅"],["GEO / AI Visibility Score","✅","❌","❌"],["Modular Report Selection","✅","❌","❌"],["Price (Agency-tier)","$99/mo","$229/mo","$199/mo"]].map(([feat,cq,sem,ah],i) => (
                  <tr key={String(feat)} className={i%2===0 ? "bg-[#070707]" : "bg-[#090909]"}>
                    <td className="border-t border-white/4 px-5 py-3.5 text-sm text-white/55">{feat}</td>
                    <td className="border-t border-[#C5FF3D]/8 bg-[#0c1800]/50 px-5 py-3.5 text-center font-bold text-[#C5FF3D]">{cq}</td>
                    <td className="border-t border-white/4 px-5 py-3.5 text-center text-sm text-white/28">{sem}</td>
                    <td className="border-t border-white/4 px-5 py-3.5 text-center text-sm text-white/28">{ah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; Pricing</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">The PDF is the product.</h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/38">Agency-first pricing. Pick the audit volume that matches your client workload.</p>

          {checkoutError && (
            <div className="mt-6 rounded-xl border border-red-500/15 bg-red-500/6 px-5 py-4 text-sm text-red-400">{checkoutError}</div>
          )}

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PLANS.map(plan => {
              const isHovered = hoveredPlan === plan.name;
              const isLoading = checkoutLoading === plan.name;
              return (
                <div
                  key={plan.name}
                  onMouseEnter={() => setHoveredPlan(plan.name)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className="relative flex flex-col rounded-2xl bg-[#0c0c0c] transition-all duration-300 cursor-default"
                  style={{
                    border:    `1px solid ${isHovered ? "rgba(197,255,61,0.38)" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: isHovered ? "0 0 55px rgba(197,255,61,0.11), 0 0 110px rgba(197,255,61,0.05)" : "none",
                    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                  }}
                >
                  {/* Top line — always present, glows on hover */}
                  <div
                    className="absolute left-0 right-0 top-0 h-px rounded-t-2xl transition-all duration-300"
                    style={{ background:"linear-gradient(90deg,transparent,#C5FF3D,transparent)", opacity: isHovered ? 1 : plan.badge ? 0.45 : 0.15 }}
                  />

                  <div className="p-8">
                    {plan.badge && (
                      <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#C5FF3D]/22 bg-[#C5FF3D]/8 px-3.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#C5FF3D]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#C5FF3D]" />
                        {plan.badge}
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-1.5 text-sm text-white/35">{plan.desc}</p>

                    <div className="mt-6 flex items-end gap-1.5">
                      <span
                        className="text-[3.2rem] font-extrabold leading-none transition-colors duration-300"
                        style={{ color: isHovered ? "#C5FF3D" : "#ffffff" }}
                      >
                        {plan.price}
                      </span>
                      <span className="mb-1.5 font-mono text-xs text-white/25">{plan.period}</span>
                    </div>

                    <ul className="mt-7 space-y-2.5">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-3 text-sm text-white/50">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5FF3D]" style={{ opacity: isHovered ? 1 : 0.65 }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div
                      className="mt-6 rounded-xl px-4 py-3 transition-all duration-300"
                      style={{ border:`1px solid ${isHovered ? "rgba(197,255,61,0.14)" : "rgba(255,255,255,0.05)"}`, backgroundColor: isHovered ? "rgba(197,255,61,0.04)" : "rgba(255,255,255,0.02)" }}
                    >
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/18">What this means</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/32">{plan.usage}</p>
                    </div>
                  </div>

                  <div className="mt-auto px-8 pb-8">
                    <button
                      onClick={() => handleChoosePlan(plan.priceId, plan.name)}
                      disabled={isLoading}
                      className="w-full rounded-xl px-5 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: isHovered ? "#C5FF3D"                     : "transparent",
                        color:           isHovered ? "#000000"                     : "rgba(255,255,255,0.65)",
                        border:          isHovered ? "1px solid #C5FF3D"           : "1px solid rgba(255,255,255,0.12)",
                        boxShadow:       isHovered ? "0 0 22px rgba(197,255,61,0.3)" : "none",
                      }}
                    >
                      {isLoading ? "Redirecting..." : `Start with ${plan.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/18">
            Cancel any time &#183; Secure payment via Stripe
          </p>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; ROI Calculator</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">What does $99/month<br className="hidden md:block" /> actually cost you?</h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/38">The Agency plan pays for itself with a single client report. Here is the math.</p>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {[{plan:"Starter",price:"$49",charge:150,clients:5},{plan:"Agency",price:"$99",charge:300,clients:15},{plan:"Enterprise",price:"$299",charge:500,clients:40}].map(row => {
              const revenue = row.charge * row.clients;
              const profit  = revenue - parseInt(row.price.replace("$",""));
              return (
                <div key={row.plan} className="group rounded-2xl border border-white/6 bg-[#0c0c0c] p-7 transition-all duration-300 hover:border-[#C5FF3D]/18 hover:shadow-[0_0_30px_rgba(197,255,61,0.05)]">
                  <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/55">{row.plan} Plan — {row.price}/mo</div>
                  <div className="space-y-3 text-sm">
                    {[["Charge per audit",`$${row.charge}`,"white"],["Clients per month",`${row.clients} clients`,"white"],["Revenue generated",`$${revenue.toLocaleString()}`,"white"],["Platform cost",row.price,"red"]].map(([l,v,c]) => (
                      <div key={l} className="flex justify-between border-b border-white/5 pb-3">
                        <span className="text-white/38">{l}</span>
                        <span className={`font-bold ${c==="red"?"text-red-400":"text-white"}`}>{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1">
                      <span className="font-semibold text-white">Net profit</span>
                      <span className="text-xl font-extrabold text-[#C5FF3D]">${profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/18">Based on typical agency audit pricing. Your rates may vary.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-5 py-28 text-center md:px-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[700px] -translate-x-1/2 rounded-full bg-[#C5FF3D]/5 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; Get Started Today</div>
          <h2 className="text-[clamp(2.2rem,5.5vw,4rem)] font-extrabold leading-[0.95] tracking-tight">
            Stop explaining SEO.
            <br />
            <span className="bg-gradient-to-r from-[#C5FF3D] to-[#9dcc28] bg-clip-text text-transparent">Start showing results.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/38">
            Run your first audit free. No signup needed. When you are ready to deliver it to a client, pick a plan.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}
              className="rounded-xl bg-[#C5FF3D] px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(197,255,61,0.4)]"
            >
              Run a Free Audit →
            </button>
            <a
              href="#pricing"
              className="rounded-xl border border-white/10 px-8 py-4 font-mono text-sm uppercase tracking-wider text-white/40 transition-all duration-200 hover:border-white/22 hover:bg-white/4 hover:text-white"
            >
              See Plans
            </a>
          </div>
        </div>
      </section>

{/* FOOTER */}
      <footer className="border-t border-white/5 px-5 py-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <a href="/" className="group flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C5FF3D] transition-all duration-200 group-hover:shadow-[0_0_12px_rgba(197,255,61,0.4)]">
                <span className="text-[10px] font-black text-black">CQ</span>
              </div>
              <span className="text-sm font-bold text-white">Crawler Que</span>
            </a>

            <div className="flex flex-wrap justify-center gap-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
              {FOOTER_LINKS.map(([href,label]) => (
                <a key={label} href={href} className="transition-colors duration-200 hover:text-white">{label}</a>
              ))}
            </div>

            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/14">
              &#169; 2026 Crawler Que
            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-5 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
              Powered by <span className="text-white/35">Strat IQ Digital</span>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

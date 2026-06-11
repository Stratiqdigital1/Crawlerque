// @ts-nocheck
"use client";

import { useState } from "react";
import Image from "next/image";

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
  { tag:"SEO",     name:"SEO Intelligence",    desc:"Title, H1, meta, crawlability, keyword density and structured data signals.",                        pills:["On-page","Technical"] },
  { tag:"TRAFFIC", name:"Traffic Modelling",    desc:"CTR-curve traffic estimation across all ranked keywords with confidence scoring.",                    pills:["CTR-curve","Keywords"] },
  { tag:"SPEED",   name:"Core Web Vitals",      desc:"Google PageSpeed mobile and desktop scores with prioritised fix recommendations.",                    pills:["LCP","CLS","FCP"] },
  { tag:"AI",      name:"AI Search Visibility", desc:"Track how your client's brand appears in AI-generated search results across ChatGPT and Gemini.",     pills:["LLM rank","GEO"] },
  { tag:"COMPETE", name:"Competitor Intel",     desc:"Benchmark against organic competitors and surface the keyword gaps worth closing.",                   pills:["Gap analysis","Threats"] },
  { tag:"LINKS",   name:"Backlink Authority",   desc:"Backlink profile, referring domains, and authority gap signals with trust scoring.",                  pills:["Backlinks","Trust"] },
];

const SCREENSHOTS = [
  { key:"overview",        label:"Overview",        src:"/screenshots/dashboard-overview.png",        caption:"Every score, issue, and opportunity for a domain — on one screen." },
  { key:"ai",              label:"AI Visibility",   src:"/screenshots/dashboard-ai-visibility.png",   caption:"See whether AI assistants like ChatGPT and Gemini actually mention your client's brand." },
  { key:"recommendations", label:"Recommendations", src:"/screenshots/dashboard-recommendations.png", caption:"AI-generated action cards with owner, timeline, and impact — ready for the client PDF." },
];

export default function HomePage() {
  const [url,             setUrl]             = useState("");
  const [activeShot,      setActiveShot]      = useState(SCREENSHOTS[0]);
  const [result,          setResult]          = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError,   setCheckoutError]   = useState("");
  const [mobileOpen,      setMobileOpen]      = useState(false);

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
    <div className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)] antialiased">

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-[var(--cq-line-soft)] bg-[var(--cq-ink)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" className="flex items-center gap-3">
            <span className="cq-frame flex h-8 w-8 items-center justify-center bg-[var(--cq-surface)]">
              <span className="font-mono text-[11px] font-bold text-[var(--cq-signal)]">CQ</span>
            </span>
            <span className="font-[var(--font-space)] text-[17px] font-bold tracking-tight">
              Crawler Que
            </span>
          </a>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <a key={label} href={href} className="rounded-lg px-4 py-2 text-[15px] font-medium text-[var(--cq-text-2)] transition-colors hover:bg-[var(--cq-surface)] hover:text-[var(--cq-text)]">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a href="#pricing" className="cq-btn cq-btn--primary hidden !py-2.5 md:inline-flex">
              Get started
            </a>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cq-line)] text-[var(--cq-text-2)] hover:text-[var(--cq-text)] md:hidden">
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-[var(--cq-line-soft)] bg-[var(--cq-surface)] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map(([href, label]) => (
                <a key={label} href={href} onClick={() => setMobileOpen(false)} className="rounded-lg px-4 py-3 text-[15px] font-medium text-[var(--cq-text-2)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-text)]">
                  {label}
                </a>
              ))}
              <a href="#pricing" className="cq-btn cq-btn--primary mt-3 w-full">Get started</a>
            </div>
          </div>
        )}
        {/* Signature: the crawl line, always alive under the nav */}
        <div className="cq-scanline" />
      </header>

      {/* HERO */}
      <section className="px-5 pb-24 pt-16 md:px-8 md:pt-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_480px]">
          <div>
            <p className="cq-eyebrow cq-eyebrow--signal">AI website growth intelligence</p>
            <h1 className="mt-5 font-[var(--font-space)] text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.02]">
              Other tools give you data.
              <br />
              We give you a <span className="text-[var(--cq-signal)]">growth plan.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-[1.75] text-[var(--cq-text-2)]">
              Built for agencies producing client deliverables. Run audits across
              8 intelligence modules, export white-label PDFs, and show clients
              exactly what to fix and why.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#pricing" className="cq-btn cq-btn--primary">Start free trial</a>
              <a href="/sample-report" className="cq-btn cq-btn--ghost">View a sample report</a>
            </div>

            {/* Proof strip — data set in real mono */}
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--cq-line-soft)] pt-8">
              {[
                { v:"14K+", l:"Keywords tracked" },
                { v:"8",    l:"Audit modules" },
                { v:"3×",   l:"Faster reports" },
              ].map(({ v, l }) => (
                <div key={l}>
                  <div className="font-mono text-3xl font-bold text-[var(--cq-signal)]">{v}</div>
                  <div className="mt-1 text-sm text-[var(--cq-text-3)]">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* THE AUDIT CONSOLE — hero centerpiece */}
          <div className="cq-card cq-frame overflow-hidden !rounded-none">
            <div className="flex items-center justify-between border-b border-[var(--cq-line)] bg-[var(--cq-surface-2)] px-5 py-3">
              <span className="font-mono text-xs text-[var(--cq-text-3)]">crawlerque.com/free-audit</span>
              <span className="flex items-center gap-2 font-mono text-xs text-[var(--cq-signal)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--cq-signal)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--cq-signal)]" />
                </span>
                LIVE
              </span>
            </div>
            <div className="p-6">
              <p className="cq-eyebrow cq-eyebrow--signal">Free audit · no signup</p>
              <h2 className="mt-2 text-xl font-bold">Point the crawler at a site</h2>
              <p className="mt-1.5 text-[15px] text-[var(--cq-text-2)]">
                Enter any URL to get a growth intelligence snapshot.
              </p>

              <div className="mt-5 space-y-3">
                <input
                  type="text" placeholder="https://yourclient.com" value={url}
                  onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAudit()}
                  className="cq-input font-mono !text-sm"
                />
                <button onClick={handleAudit} disabled={loading} className="cq-btn cq-btn--primary w-full">
                  {loading ? "Crawling…" : "Run free audit"}
                </button>
                {loading && <div className="cq-scanline" />}
              </div>

              {result && (
                <div className="mt-5">
                  {result.success ? (
                    <>
                      <div className="overflow-hidden border border-[var(--cq-line)]">
                        <div className="border-b border-[var(--cq-line)] bg-[var(--cq-surface-2)] px-4 py-2">
                          <span className="font-mono text-xs text-[var(--cq-text-3)]">audit.result</span>
                        </div>
                        <div className="px-4 py-1">
                          {[["Overall score",result.report?.overallScore??"—"],["SEO score",result.report?.seoScore??"—"],["Mobile perf",result.report?.mobilePerformance??"—"],["Desktop perf",result.report?.desktopPerformance??"—"],["Traffic est.",result.report?.traffic?.monthly?`${Number(result.report.traffic.monthly).toLocaleString()}/mo`:"—"]].map(([l,v]) => (
                            <div key={l} className="flex items-center justify-between border-b border-[var(--cq-line-soft)] py-2.5 last:border-0">
                              <span className="text-sm text-[var(--cq-text-2)]">{l}</span>
                              <span className="font-mono text-[15px] font-bold text-[var(--cq-text)]">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 border border-[var(--cq-signal)]/25 bg-[var(--cq-signal)]/6 p-4">
                        <p className="text-[15px] font-semibold">Want the full 8-module report?</p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--cq-text-2)]">AI visibility, competitor intel, keyword gaps, backlinks, and a white-label PDF.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a href="/sample-report" className="cq-btn cq-btn--ghost !px-4 !py-2 !text-sm">Sample report</a>
                          <a href="#pricing" className="cq-btn cq-btn--primary !px-4 !py-2 !text-sm">View plans →</a>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-[var(--cq-danger)]/30 bg-[var(--cq-danger)]/10 px-4 py-3 text-sm text-[var(--cq-danger)]">{result.error}</div>
                  )}
                </div>
              )}

              <div className="mt-6 border-t border-[var(--cq-line-soft)] pt-4">
                <p className="cq-eyebrow mb-2.5">Free audit includes</p>
                {["Technical SEO scan","Core Web Vitals check","On-page SEO signals"].map(item => (
                  <div key={item} className="flex items-center gap-2.5 py-1 text-[15px] text-[var(--cq-text-2)]">
                    <span className="h-1 w-3 shrink-0 bg-[var(--cq-signal)]" />{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="border-y border-[var(--cq-line-soft)] bg-[var(--cq-surface)] px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 md:justify-between">
          {[["14,000+","Keywords analysed"],["8","Audit modules"],["3×","Faster reporting"],["100%","White-labelable"],["AI","Visibility scoring"]].map(([v,l]) => (
            <div key={l} className="flex items-baseline gap-2.5">
              <span className="font-mono text-lg font-bold text-[var(--cq-signal)]">{v}</span>
              <span className="text-sm text-[var(--cq-text-2)]">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* WHO IT'S FOR */}
      <section className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Who it's for</p>
          <h2 className="mt-3 max-w-2xl font-[var(--font-space)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Built for the people who deliver results.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Whether you run a full-service agency or freelance for three clients, Crawler Que is built around your workflow.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { title:"SEO Agencies",          desc:"Run modular audits for every client. Export white-label PDFs. Save hours per report.", badge:"Most common" },
              { title:"Web Design Agencies",   desc:"Add SEO intelligence to every website handover. Show clients their growth baseline.", badge:"" },
              { title:"Marketing Consultants", desc:"Back every recommendation with data. Export executive reports clients actually read.", badge:"" },
              { title:"Freelancers",           desc:"Look enterprise-level with branded PDF deliverables. Starter plan keeps costs low.", badge:"" },
              { title:"White-Label Providers", desc:"Resell audits under your own brand. Agency and Enterprise plans fully white-labelable.", badge:"Popular" },
            ].map(card => (
              <div key={card.title} className="cq-card relative p-6 transition-colors hover:border-[var(--cq-signal)]/40">
                {card.badge && (
                  <div className="absolute -top-3 left-4 bg-[var(--cq-signal)] px-2.5 py-0.5 font-mono text-xs font-bold text-[#0C0F08]">{card.badge}</div>
                )}
                <h3 className="text-[16px] font-bold">{card.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--cq-text-2)]">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DATA SOURCES */}
      <div className="border-b border-[var(--cq-line-soft)] bg-[var(--cq-surface)] px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow mb-6 text-center">Intelligence powered by</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
            {[{name:"Google PageSpeed Insights",desc:"Core Web Vitals"},{name:"DataForSEO",desc:"Keywords, traffic & backlinks"},{name:"Proprietary AI Engine",desc:"Recommendations & scoring"},{name:"Google Search Console",desc:"SERP intelligence"}].map(src => (
              <div key={src.name} className="flex items-center gap-3">
                <span className="h-3 w-3 border-l-2 border-t-2 border-[var(--cq-signal)]" />
                <div>
                  <div className="text-[15px] font-semibold">{src.name}</div>
                  <div className="text-sm text-[var(--cq-text-3)]">{src.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS — true sequence, so the numbers earn their place */}
      <section className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">How it works</p>
          <h2 className="mt-3 font-[var(--font-space)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Audit. Analyse. Deliver.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">From URL to white-label client PDF in minutes.</p>
          <div className="mt-12 grid gap-px overflow-hidden border border-[var(--cq-line)] bg-[var(--cq-line)] md:grid-cols-3">
            {[
              {n:"01",t:"Enter any URL",         d:"Paste a client domain. Crawler Que runs all selected modules simultaneously against live data — no install needed."},
              {n:"02",t:"AI analyses everything", d:"SEO, speed, traffic, AI visibility, competitors, backlinks, keywords — processed, scored, and ranked by impact."},
              {n:"03",t:"Export white-label PDF", d:"Download a branded PDF with scores, insights, and a 90-day action roadmap ready to share with clients."},
            ].map(s => (
              <div key={s.n} className="bg-[var(--cq-surface)] p-8">
                <div className="font-mono text-sm font-bold text-[var(--cq-signal)]">{s.n}</div>
                <h3 className="mt-4 text-[17px] font-bold">{s.t}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

{/* PRODUCT TOUR — dashboard screenshots */}
      <section className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Inside the platform</p>
          <h2 className="mt-3 font-[var(--font-space)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">See exactly what your clients will see.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">A real look at the dashboard — no mockups. Click through the views.</p>

          {/* Tab switcher */}
          <div className="mt-10 flex flex-wrap gap-2">
            {SCREENSHOTS.map(shot => (
              <button
                key={shot.key}
                onClick={() => setActiveShot(shot)}
                className={`border px-4 py-2 font-mono text-sm transition-colors ${
                  activeShot.key === shot.key
                    ? "border-[var(--cq-signal)] bg-[var(--cq-signal)]/10 text-[var(--cq-signal)]"
                    : "border-[var(--cq-line)] text-[var(--cq-text-2)] hover:border-[var(--cq-text-3)] hover:text-[var(--cq-text)]"
                }`}
              >
                {shot.label}
              </button>
            ))}
          </div>

          {/* Framed screenshot — same browser chrome as the hero console */}
          <div className="cq-card cq-frame mt-6 overflow-hidden !rounded-none">
            <div className="flex items-center justify-between border-b border-[var(--cq-line)] bg-[var(--cq-surface-2)] px-5 py-3">
              <span className="font-mono text-xs text-[var(--cq-text-3)]">crawlerque.com/dashboard</span>
              <span className="font-mono text-xs text-[var(--cq-signal)]">{activeShot.label}</span>
            </div>
            <div className="relative aspect-[16/9] w-full bg-[var(--cq-ink)]">
              <Image
                src={activeShot.src}
                alt={`Crawler Que dashboard — ${activeShot.label}`}
                fill
                sizes="(max-width: 1280px) 100vw, 1216px"
                className="object-cover object-top"
                priority={activeShot.key === "overview"}
              />
            </div>
            <div className="cq-scanline" />
            <p className="px-5 py-4 text-[15px] text-[var(--cq-text-2)]">{activeShot.caption}</p>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Audit modules</p>
          <h2 className="mt-3 font-[var(--font-space)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Every intelligence layer your client needs.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Modular by design. Run a full audit or go deep on a single signal.</p>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(mod => (
              <div key={mod.name} className="cq-card group p-6 transition-colors hover:border-[var(--cq-signal)]/40">
                <div className="mb-3 inline-block border border-[var(--cq-signal)]/25 px-2.5 py-1 font-mono text-xs text-[var(--cq-signal)]">{mod.tag}</div>
                <h3 className="text-[16px] font-bold">{mod.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{mod.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {mod.pills.map(pill => (
                    <span key={pill} className="border border-[var(--cq-line)] px-2 py-0.5 font-mono text-xs text-[var(--cq-text-3)]">{pill}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">How we compare</p>
          <h2 className="mt-3 font-[var(--font-space)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Built differently. For a different workflow.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Traditional SEO tools are built for data analysts. Crawler Que is built for agencies producing client deliverables.</p>
          <div className="mt-12 overflow-x-auto border border-[var(--cq-line)]">
            <table className="w-full min-w-[580px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--cq-line)]">
                  <th className="bg-[var(--cq-surface)] px-5 py-4 text-left font-mono text-sm font-medium text-[var(--cq-text-2)]">Feature</th>
                  {[{name:"Crawler Que",hl:true},{name:"SEMrush",hl:false},{name:"Ahrefs",hl:false}].map(col => (
                    <th key={col.name} className={`px-5 py-4 font-mono text-sm font-medium ${col.hl ? "bg-[var(--cq-signal)] text-[#0C0F08]" : "bg-[var(--cq-surface)] text-[var(--cq-text-2)]"}`}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[["White-Label PDF Reports","✅","Partial","❌"],["AI Search Visibility","✅","❌","❌"],["Agency Workflow Focus","✅","❌","❌"],["Client-Ready Deliverables","✅","Limited","Limited"],["Keyword Gap Intelligence","✅","✅","✅"],["Core Web Vitals Audit","✅","✅","✅"],["GEO / AI Visibility Score","✅","❌","❌"],["Modular Report Selection","✅","❌","❌"],["Price (Agency-tier)","$99/mo","$229/mo","$199/mo"]].map(([feat,cq,sem,ah],i) => (
                  <tr key={String(feat)} className={i%2===0 ? "bg-[var(--cq-ink)]" : "bg-[var(--cq-surface)]"}>
                    <td className="border-t border-[var(--cq-line-soft)] px-5 py-3.5 text-[15px] text-[var(--cq-text-2)]">{feat}</td>
                    <td className="border-t border-[var(--cq-signal)]/15 bg-[var(--cq-signal)]/8 px-5 py-3.5 text-center text-[15px] font-bold text-[var(--cq-signal)]">{cq}</td>
                    <td className="border-t border-[var(--cq-line-soft)] px-5 py-3.5 text-center text-[15px] text-[var(--cq-text-3)]">{sem}</td>
                    <td className="border-t border-[var(--cq-line-soft)] px-5 py-3.5 text-center text-[15px] text-[var(--cq-text-3)]">{ah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Pricing</p>
          <h2 className="mt-3 font-[var(--font-space)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">The PDF is the product.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Agency-first pricing. Pick the audit volume that matches your client workload.</p>

          {checkoutError && (
            <div className="mt-6 rounded-lg border border-[var(--cq-danger)]/30 bg-[var(--cq-danger)]/10 px-5 py-4 text-[15px] text-[var(--cq-danger)]">{checkoutError}</div>
          )}

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map(plan => {
              const isLoading  = checkoutLoading === plan.name;
              const isFeatured = Boolean(plan.badge);
              return (
                <div
                  key={plan.name}
                  className={`cq-card relative flex flex-col transition-colors ${isFeatured ? "cq-frame !rounded-none border-[var(--cq-signal)]/50" : "hover:border-[var(--cq-signal)]/35"}`}
                >
                  <div className="p-8">
                    {plan.badge && (
                      <div className="mb-5 inline-block bg-[var(--cq-signal)] px-3 py-1 font-mono text-xs font-bold text-[#0C0F08]">
                        {plan.badge}
                      </div>
                    )}

                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="mt-1.5 text-[15px] text-[var(--cq-text-2)]">{plan.desc}</p>

                    <div className="mt-6 flex items-end gap-1.5">
                      <span className={`font-mono text-5xl font-bold leading-none ${isFeatured ? "text-[var(--cq-signal)]" : "text-[var(--cq-text)]"}`}>
                        {plan.price}
                      </span>
                      <span className="mb-1 font-mono text-sm text-[var(--cq-text-3)]">{plan.period}</span>
                    </div>

                    <ul className="mt-7 space-y-3">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-3 text-[15px] text-[var(--cq-text-2)]">
                          <span className="mt-2.5 h-1 w-3 shrink-0 bg-[var(--cq-signal)]" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 border border-[var(--cq-line)] bg-[var(--cq-surface-2)] px-4 py-3">
                      <p className="cq-eyebrow">What this means</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--cq-text-2)]">{plan.usage}</p>
                    </div>
                  </div>

                  <div className="mt-auto px-8 pb-8">
                    <button
                      onClick={() => handleChoosePlan(plan.priceId, plan.name)}
                      disabled={isLoading}
                      className={`cq-btn w-full ${isFeatured ? "cq-btn--primary" : "cq-btn--ghost"}`}
                    >
                      {isLoading ? "Redirecting…" : `Start with ${plan.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-[var(--cq-text-3)]">
            Cancel any time · Secure payment via Stripe
          </p>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">ROI calculator</p>
          <h2 className="mt-3 font-[var(--font-space)] text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">What does $99/month actually cost you?</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">The Agency plan pays for itself with a single client report. Here is the math.</p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[{plan:"Starter",price:"$49",charge:150,clients:5},{plan:"Agency",price:"$99",charge:300,clients:15},{plan:"Enterprise",price:"$299",charge:500,clients:40}].map(row => {
              const revenue = row.charge * row.clients;
              const profit  = revenue - parseInt(row.price.replace("$",""));
              return (
                <div key={row.plan} className="cq-card p-7 transition-colors hover:border-[var(--cq-signal)]/35">
                  <div className="cq-eyebrow cq-eyebrow--signal mb-5">{row.plan} plan — {row.price}/mo</div>
                  <div className="space-y-3">
                    {[["Charge per audit",`$${row.charge}`],["Clients per month",`${row.clients} clients`],["Revenue generated",`$${revenue.toLocaleString()}`],["Platform cost",`−${row.price}`]].map(([l,v]) => (
                      <div key={l} className="flex justify-between border-b border-[var(--cq-line-soft)] pb-3 text-[15px]">
                        <span className="text-[var(--cq-text-2)]">{l}</span>
                        <span className="font-mono font-semibold">{v}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[15px] font-semibold">Net profit</span>
                      <span className="font-mono text-2xl font-bold text-[var(--cq-signal)]">${profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-[var(--cq-text-3)]">Based on typical agency audit pricing. Your rates may vary.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-28 text-center md:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Get started today</p>
          <h2 className="mt-4 font-[var(--font-space)] text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold leading-[1.05]">
            Stop explaining SEO.
            <br />
            <span className="text-[var(--cq-signal)]">Start showing results.</span>
          </h2>
          <div className="cq-scanline mx-auto mt-8 max-w-xs" />
          <p className="mx-auto mt-8 max-w-md text-[16px] leading-relaxed text-[var(--cq-text-2)]">
            Run your first audit free. No signup needed. When you are ready to deliver it to a client, pick a plan.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}
              className="cq-btn cq-btn--primary !px-8 !py-4"
            >
              Run a free audit →
            </button>
            <a href="#pricing" className="cq-btn cq-btn--ghost !px-8 !py-4">
              See plans
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--cq-line-soft)] px-5 py-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {FOOTER_LINKS.map(([href,label]) => (
              <a key={label} href={href} className="text-sm text-[var(--cq-text-3)] transition-colors hover:text-[var(--cq-text)]">{label}</a>
            ))}
          </div>

          <div className="cq-scanline mt-8" />

          <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.08em] text-[var(--cq-text-3)]">
            Powered By Strat IQ Digital
          </p>
        </div>
      </footer>

    </div>
  );
}
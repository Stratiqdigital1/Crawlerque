// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { SiteFooter } from "@/components/site-shell";
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

// Annual price = 10x monthly (2 months free). priceIdAnnual needs a
// separate Stripe Price object created in your dashboard (see note below).
// The single entry point for new users. Card required, 7-day trial,
// 3 audits, full module access. After 7 days, the user picks a plan
// from the dashboard's trial banner.
const TRIAL_PLAN = {
  name: "Trial",
  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TRIAL || "",
};

const PLANS = [
  {
    name:    "Starter",
    priceMonthly: 30,
    priceAnnual:  300, // 10 x 30
    priceId:        process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
    priceIdAnnual:  process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || "",
    desc:    "For freelancers auditing client sites.",
    features:["7 full audits / month","All 8 audit modules","Branded PDF export","30-day report history","1 user seat"],
    usage:   "Perfect for freelancers with up to 3-4 regular clients.",
    badge:   null,
  },
  {
    name:    "Agency",
    priceMonthly: 99,
    priceAnnual:  990, // 10 x 99
    priceId:        process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "",
    priceIdAnnual:  process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL || "",
    desc:    "For agencies producing client deliverables.",
    features:["40 full audits / month","White-label PDF reports","Comparison reports","90-day report history","3 user seats"],
    usage:   "40 audits covers 20+ recurring client reports monthly. Every PDF carries your brand.",
    badge:   "Most Popular",
  },
  {
    name:    "Enterprise",
    priceMonthly: 299,
    priceAnnual:  2990, // 10 x 299
    priceId:        process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
    priceIdAnnual:  process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || "",
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
  { tag:"AI",      name:"AI Search Visibility", desc:"Track how a brand appears in AI-generated search results across ChatGPT and Gemini.",     pills:["LLM rank","GEO"] },
  { tag:"COMPETE", name:"Competitor Intel",     desc:"Benchmark against organic competitors and surface the keyword gaps worth closing.",                   pills:["Gap analysis","Threats"] },
  { tag:"LINKS",   name:"Backlink Authority",   desc:"Backlink profile, referring domains, and authority gap signals with trust scoring.",                  pills:["Backlinks","Trust"] },
];

// Add a new line here whenever you drop a new screenshot into
// public/screenshots/ — that's the only manual step.
const SCREENSHOTS = [
  { src: "/screenshots/dashboard-1.png", caption: "Every score, issue, and opportunity for a domain — on one screen." },
  { src: "/screenshots/dashboard-2.png", caption: "See whether AI assistants like ChatGPT and Perplexity actually mention your client's brand." },
  { src: "/screenshots/dashboard-3.png", caption: "Full technical audit — Core Web Vitals, crawl results, and on-page issues for every page." },
  { src: "/screenshots/dashboard-4.png", caption: "AI-generated action cards with owner, timeline, and impact — ready for the client PDF." },
  // { src: "/screenshots/dashboard-5.png", caption: "..." },  ← naya screenshot yahan add karo
];

const SLIDE_DURATION = 4500; // ms — har slide kitni der dikhega

export default function HomePage() {
  const [url,             setUrl]             = useState("");
  const [activeIndex,     setActiveIndex]     = useState(0);
  const [paused,          setPaused]          = useState(false);
  const [billing,         setBilling]         = useState<"monthly"|"annual">("monthly");
  const activeShot = SCREENSHOTS[activeIndex];

  // Auto-advance, pauses on hover/touch
  useEffect(() => {
    if (paused || SCREENSHOTS.length <= 1) return;
    const t = setInterval(() => {
      setActiveIndex(i => (i + 1) % SCREENSHOTS.length);
    }, SLIDE_DURATION);
    return () => clearInterval(t);
  }, [paused]);
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

const handleStartTrial = async () => {
    if (!TRIAL_PLAN.priceId) { setCheckoutError("Trial is not configured. Please contact support."); return; }
    setCheckoutLoading("Trial"); setCheckoutError("");
    try {
      const res  = await fetch("/api/stripe/checkout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ priceId: TRIAL_PLAN.priceId, packageName: TRIAL_PLAN.name }) });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setCheckoutError(json.error || "Failed to start checkout.");
    } catch { setCheckoutError("Something went wrong. Please try again."); }
    finally { setCheckoutLoading(null); }
  };

  // Direct plan purchase — no trial, straight to checkout for the chosen
  // plan. Available to anyone, anytime, regardless of trial history.
  const handleChoosePlan = async (plan: typeof PLANS[number]) => {
    const priceId = billing === "annual" ? plan.priceIdAnnual : plan.priceId;
    if (!priceId) { setCheckoutError("Plan not configured. Please contact support."); return; }
    setCheckoutLoading(plan.name); setCheckoutError("");
    try {
      const res  = await fetch("/api/stripe/checkout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ priceId, packageName: plan.name }) });
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
            <img src="/logo-full.png" alt="Crawler Que" className="h-7 w-auto" />
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
            <h1 className="mt-5  text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.02]">
              Audit your website.
<br />
Find the path to <span className="text-[var(--cq-signal)]">better growth.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-[1.75] text-[var(--cq-text-2)]">
Run a complete website audit in minutes. Crawler Que checks SEO,
technical performance, traffic signals, keywords, competitors,
backlinks, AI search visibility, and gives you a clear growth plan.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#pricing" className="cq-btn cq-btn--primary">Run free audit</a>
              <a href="/sample-report" className="cq-btn cq-btn--ghost">View sample audit</a>
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
              <h2 className="mt-2 text-xl font-bold">Check your website growth signals</h2>
              <p className="mt-1.5 text-[15px] text-[var(--cq-text-2)]">
                Enter your website URL to check SEO, technical performance, and on-page signals.
              </p>

              <div className="mt-5 space-y-3">
                <input
                  type="text" placeholder="https://yourwebsite.com" value={url}
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
                      <div className="mt-3 border border-[var(--cq-signal)]/25 bg-[var(--cq-signal)]/8 p-4">
                        <p className="text-[15px] font-semibold">Want the complete website growth audit?</p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--cq-text-2)]">Unlock AI visibility, competitor intelligence, keyword gaps, backlinks, traffic insights, recommendations, and export-ready reporting.</p>
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
          {[["14,000+","Keywords analysed"],["8","Audit modules"],["3×","Faster reporting"],["90-day","Action roadmap"],["AI","Visibility scoring"]].map(([v,l]) => (
            <div key={l} className="flex items-baseline gap-2.5">
              <span className="font-mono text-lg font-bold text-[var(--cq-signal)]">{v}</span>
              <span className="text-sm text-[var(--cq-text-2)]">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Who can use it */}
      <section className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Who can use it</p>
          <h2 className="mt-3 max-w-2xl  text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Built for anyone who wants better website growth.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Whether you own a business, manage a website, run marketing, or handle SEO for others, Crawler Que helps you understand what is holding the website back.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
  { title:"Business Owners",       desc:"Understand what is stopping your website from ranking, loading faster, and getting more traffic.", badge:"Best start" },
  { title:"Marketing Teams",       desc:"Audit SEO, performance, AI visibility, competitors, keywords, and backlinks from one dashboard.", badge:"" },
  { title:"SEO Teams",             desc:"Find technical issues, keyword gaps, traffic opportunities, and priority fixes faster.", badge:"" },
  { title:"Agencies",              desc:"Manage multiple website audits, track opportunities, and export branded reports when needed.", badge:"Popular" },
  { title:"Consultants",           desc:"Turn website audit data into a clear action plan with impact, timeline, and recommended owner.", badge:"" },
].map(card => (
              <div key={card.title} className="cq-card relative p-6 transition-colors hover:border-[var(--cq-signal)]/40">
                {card.badge && (
                  <div className="absolute -top-3 left-4 bg-[var(--cq-signal)] px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--cq-on-signal)]">{card.badge}</div>
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
            {[{name:"Google PageSpeed Insights",desc:"Core Web Vitals"},{name:"DataForSEO",desc:"Keywords, traffic & backlinks"},{name:"Proprietary AI Engine",desc:"Recommendations & scoring"},{name:"SERP Data",desc:"Rank position intelligence"}].map(src => (
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
          <h2 className="mt-3  text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Audit. Analyse. Deliver.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">From website URL to clear SEO, performance, traffic, competitor, backlink, AI visibility, and recommendation insights in minutes.</p>
          <div className="mt-12 grid gap-px overflow-hidden border border-[var(--cq-line)] bg-[var(--cq-line)] md:grid-cols-3">
            {[
              {n:"01",t:"Enter any URL",         d:"Paste any website URL. Crawler Que runs selected audit modules against live data with no install needed."},
              {n:"02",t:"AI analyses everything", d:"SEO, speed, traffic, AI visibility, competitors, backlinks, keywords — processed, scored, and ranked by impact."},
              {n:"03",t:"Use the growth report", d:"Review the dashboard, prioritize fixes, track opportunities, and export a report when you need to share the results."},
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
          <h2 className="mt-3  text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">See exactly what your website audit includes.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">A real look at the dashboard — no mockups. Click through the views.</p>

{/* Auto-rotating screenshot slideshow */}
          <div
            className="cq-card cq-frame mt-10 overflow-hidden !rounded-none"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex items-center justify-between border-b border-[var(--cq-line)] bg-[var(--cq-surface-2)] px-5 py-3">
              <span className="font-mono text-xs text-[var(--cq-text-3)]">crawlerque.com/dashboard</span>
              <span className="font-mono text-xs text-[var(--cq-signal)]">
                {activeIndex + 1} / {SCREENSHOTS.length}
              </span>
            </div>

<div className="relative aspect-[16/10] w-full bg-[var(--cq-surface)]">
              {SCREENSHOTS.map((shot, i) => (
                <Image
                  key={shot.src}
                  src={shot.src}
                  alt={`Crawler Que dashboard screenshot ${i + 1}`}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1216px"
                  className={`object-contain transition-opacity duration-700 ${
                    i === activeIndex ? "opacity-100" : "opacity-0"
                  }`}
                  priority={i === 0}
                />
              ))}
            </div>

            <div className="cq-scanline" />

            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-[15px] text-[var(--cq-text-2)]">{activeShot.caption}</p>
              <div className="flex shrink-0 gap-1.5">
                {SCREENSHOTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeIndex ? "w-6 bg-[var(--cq-signal)]" : "w-1.5 bg-[var(--cq-line)] hover:bg-[var(--cq-text-3)]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Audit modules</p>
          <h2 className="mt-3  text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Every intelligence layer your website needs.</h2>
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
          <h2 className="mt-3  text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Built for clearer website decisions.</h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Traditional SEO tools can be complex and data-heavy. Crawler Que turns website audit data into clear priorities, insights, and action steps.</p>
          <div className="mt-12 overflow-x-auto border border-[var(--cq-line)]">
            <table className="w-full min-w-[580px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--cq-line)]">
                  <th className="bg-[var(--cq-surface)] px-5 py-4 text-left font-mono text-sm font-medium text-[var(--cq-text-2)]">Feature</th>
                  {[{name:"Crawler Que",hl:true},{name:"SEMrush",hl:false},{name:"Ahrefs",hl:false}].map(col => (
                    <th key={col.name} className={`px-5 py-4 font-mono text-sm font-medium ${col.hl ? "bg-[var(--cq-signal)] text-[var(--cq-on-signal)]" : "bg-[var(--cq-surface)] text-[var(--cq-text-2)]"}`}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[["White-Label Reporting","✅","Partial","❌"],["AI Search Visibility","✅","❌","❌"],["Clear Growth Workflow","✅","Partial","Partial"],["Action Plan Recommendations","✅","Limited","Limited"],["Keyword Gap Intelligence","✅","✅","✅"],["Core Web Vitals Audit","✅","✅","✅"],["GEO / AI Visibility Score","✅","❌","❌"],["Modular Report Selection","✅","❌","❌"],["Price (Agency-tier)","$99/mo","$229/mo","$199/mo"]].map(([feat,cq,sem,ah],i) => (
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
          <h2 className="mt-3  text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">Website growth intelligence for every stage.</h2>
<p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Choose the plan that matches how many websites you want to audit each month.</p>

{/* Single entry point — trial */}
          <div className="cq-card cq-frame mt-8 max-w-xl !rounded-none p-6">
            <p className="cq-eyebrow cq-eyebrow--signal">Start here</p>
            <h3 className="mt-2 text-xl font-bold">Try every plan's features free for 7 days</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
              All 8 audit modules, 3 full audits included. Card required — after 7 days, pick the plan below that fits your workflow.
            </p>
            <button
              onClick={handleStartTrial}
              disabled={checkoutLoading === "Trial"}
              className="cq-btn cq-btn--primary mt-5 w-full sm:w-auto sm:px-10"
            >
              {checkoutLoading === "Trial" ? "Redirecting…" : "Start 7-day free trial"}
            </button>
            <p className="mt-2 text-xs text-[var(--cq-text-3)]">
              Cancel anytime during your trial — you won't be charged.
            </p>
          </div>

          {/* Monthly / Annual toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-[var(--cq-line)] bg-[var(--cq-surface)] p-1">
            {(["monthly","annual"] as const).map(cycle => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  billing === cycle
                    ? "bg-[var(--cq-signal)] text-[var(--cq-on-signal)]"
                    : "text-[var(--cq-text-2)] hover:text-[var(--cq-text)]"
                }`}
              >
                {cycle === "monthly" ? "Monthly" : "Annual"}
                {cycle === "annual" && (
                  <span className="ml-2 rounded-full bg-[var(--cq-on-signal)]/15 px-2 py-0.5 text-xs">2 months free</span>
                )}
              </button>
            ))}
          </div>

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
                      <div className="mb-5 inline-block bg-[var(--cq-signal)] px-3 py-1 font-mono text-xs font-bold text-[var(--cq-on-signal)]">
                        {plan.badge}
                      </div>
                    )}

                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="mt-1.5 text-[15px] text-[var(--cq-text-2)]">{plan.desc}</p>

<div className="mt-6 flex items-end gap-1.5">
                      <span className={`font-mono text-5xl font-bold leading-none ${isFeatured ? "text-[var(--cq-signal)]" : "text-[var(--cq-text)]"}`}>
                        ${billing === "annual" ? Math.round(plan.priceAnnual / 12) : plan.priceMonthly}
                      </span>
                      <span className="mb-1 font-mono text-sm text-[var(--cq-text-3)]">/mo</span>
                    </div>
                    {billing === "annual" && (
                      <p className="mt-1 font-mono text-xs text-[var(--cq-text-3)]">
                        Billed ${plan.priceAnnual}/year — 2 months free
                      </p>
                    )}

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
                      onClick={() => handleChoosePlan(plan)}
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
          <p className="cq-eyebrow cq-eyebrow--signal">Website audit value</p>
<h2 className="mt-3  text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-tight">What can one missed website issue cost you?</h2>
<p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--cq-text-2)]">Crawler Que helps you find SEO, speed, traffic, AI visibility, keyword, competitor, and backlink issues before they keep costing you traffic and leads.</p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[{plan:"SEO Issues",price:"Fix ranking blockers",charge:150,clients:5},{plan:"Speed Issues",price:"Improve user experience",charge:300,clients:15},{plan:"Competitor Gaps",price:"Find missed opportunities",charge:500,clients:40}].map(row => {
              const revenue = row.charge * row.clients;
const profit  = revenue;
              return (
                <div key={row.plan} className="cq-card p-7 transition-colors hover:border-[var(--cq-signal)]/35">
                  <div className="cq-eyebrow cq-eyebrow--signal mb-5">{row.plan}</div>
                  <div className="space-y-3">
                    {[["What it helps with",row.price],["Signals checked",`${row.clients}+ checks`],["Estimated opportunity impact",`$${revenue.toLocaleString()}`],["Action priority","High"]].map(([l,v]) => (
                      <div key={l} className="flex justify-between border-b border-[var(--cq-line-soft)] pb-3 text-[15px]">
                        <span className="text-[var(--cq-text-2)]">{l}</span>
                        <span className="font-mono font-semibold">{v}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[15px] font-semibold">Potential value</span>
                      <span className="font-mono text-2xl font-bold text-[var(--cq-signal)]">${profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-[var(--cq-text-3)]">These are example opportunity values. Actual results depend on the website, market, traffic, and execution quality.</p>
        </div>
      </section>

{/* FAQ */}
      <section className="border-b border-[var(--cq-line-soft)] px-5 py-24 md:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="cq-eyebrow cq-eyebrow--signal">FAQ</p>
          <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold leading-tight">Questions, answered.</h2>
          <div className="mt-10 space-y-3">
            {[
              ["Do I need to create an account to run a free audit?", "No. Paste any URL on the homepage and you'll get SEO and performance scores instantly — no signup, no card."],
              ["What is AI search visibility scoring?", "We test whether AI assistants like ChatGPT actually mention your brand when asked for recommendations in your niche, then score it 0–100 with an honest confidence label."],
              ["Can I remove Crawler Que branding from reports?", "Yes — the Agency and Enterprise plans include full white-labelling: your logo, your accent color, your footer text on every PDF."],
              ["How is Crawler Que different from SEMrush or Ahrefs?", "Those are research tools for analysts. Crawler Que is a deliverable tool for agencies: it turns one URL into a client-ready growth plan PDF, and it measures AI visibility, which they don't."],
              ["Can I cancel anytime?", "Yes. Cancel from the dashboard's Subscription tab via the Stripe billing portal — you keep access until the end of the paid period."],
            ].map(([q, a]) => (
              <details key={q} className="cq-card group p-5">
                <summary className="cursor-pointer list-none text-[16px] font-bold marker:hidden">
                  <span className="mr-3 font-mono text-[var(--cq-signal)] group-open:hidden">+</span>
                  <span className="mr-3 hidden font-mono text-[var(--cq-signal)] group-open:inline">−</span>
                  {q}
                </summary>
                <p className="mt-3 pl-7 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-28 text-center md:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="cq-eyebrow cq-eyebrow--signal">Get started today</p>
          <h2 className="mt-4  text-[clamp(2.2rem,5.5vw,3.6rem)] font-bold leading-[1.05]">
Find what is holding your website back.
<br />
<span className="text-[var(--cq-signal)]">Start with a free audit.</span>
          </h2>
          <div className="cq-scanline mx-auto mt-8 max-w-xs" />
          <p className="mx-auto mt-8 max-w-md text-[16px] leading-relaxed text-[var(--cq-text-2)]">
            Run your first website audit free. No signup needed. Upgrade when you want deeper traffic, AI visibility, competitor, keyword, backlink, and reporting intelligence.
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
      <SiteFooter />

    </div>
  );
}
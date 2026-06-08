// @ts-nocheck
"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/mo",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
      description: "For freelancers auditing client sites.",
      features: ["10 audits / month","All 8 audit modules","Branded PDF export","30-day history","1 seat"],
      popular: false,
      cta: "Get Started",
    },
    {
      name: "Agency",
      price: "$99",
      period: "/mo",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "",
      description: "For agencies producing client deliverables.",
      features: ["40 audits / month","White-label PDF reports","Comparison reports","90-day history","3 seats"],
      popular: true,
      cta: "Get Started",
    },
    {
      name: "Enterprise",
      price: "$299",
      period: "/mo",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
      description: "For high-volume agencies and consultancies.",
      features: ["150 audits / month","White-label PDF reports","Priority support","Unlimited history","10 seats"],
      popular: false,
      cta: "Get Started",
    },
  ];

  const handleAudit = async () => {
    if (!url.trim()) return;
    let auditUrl = url.trim();
    if (!auditUrl.startsWith("http://") && !auditUrl.startsWith("https://")) {
      auditUrl = `https://${auditUrl}`;
      setUrl(auditUrl);
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditUrl, reportTypes: ["seo", "technical"], auditMode: "free" }),
      });
      setResult(await res.json());
    } catch {
      setResult({ success: false, error: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlan = async (priceId, planName) => {
    if (!priceId) {
      setCheckoutError("Plan not configured yet. Please contact support.");
      return;
    }
    setCheckoutLoading(planName);
    setCheckoutError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, packageName: planName }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setCheckoutError(json.error || "Failed to start checkout.");
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const modules = [
    { tag: "SEO", name: "SEO Intelligence", desc: "Title, H1, meta, crawlability, keyword density and structured data signals.", pills: ["ON-PAGE", "TECHNICAL"] },
    { tag: "TRAFFIC", name: "Traffic Modelling", desc: "CTR-curve traffic estimation across all ranked keywords with confidence scoring.", pills: ["CTR-CURVE", "KEYWORDS"] },
    { tag: "SPEED", name: "Core Web Vitals", desc: "Google PageSpeed mobile and desktop scores with prioritised fix recommendations.", pills: ["LCP", "CLS", "FCP"] },
    { tag: "AI", name: "AI Search Visibility", desc: "Track how your client's brand appears in AI-generated search results.", pills: ["LLM RANK", "GEO"] },
    { tag: "COMPETE", name: "Competitor Intel", desc: "Benchmark against organic competitors and surface keyword gaps worth closing.", pills: ["GAP ANALYSIS", "THREATS"] },
    { tag: "LINKS", name: "Backlink Authority", desc: "Backlink profile, referring domains, and authority gap signals with trust scoring.", pills: ["BACKLINKS", "TRUST"] },
  ];

  return (
    <main className="min-h-screen bg-[#080808] text-white antialiased selection:bg-[#C5FF3D] selection:text-black">

      {/* ANNOUNCEMENT */}
      <div className="flex items-center justify-center gap-3 bg-[#C5FF3D] px-4 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
        Agency-first audit platform &nbsp;&#183;&nbsp; AI visibility &nbsp;&#183;&nbsp; White-label PDF
        <a href="#pricing" className="ml-2 rounded bg-black px-3 py-1 text-[10px] text-[#C5FF3D] transition hover:bg-[#111]">
          View Plans
        </a>
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C5FF3D]">
              <span className="text-xs font-black text-black">CQ</span>
            </div>
            <span className="font-extrabold tracking-tight text-white">
              Crawler Que
            </span>
            <span className="hidden rounded border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/30 sm:block">
              by Strat IQ
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {[["#modules", "Modules"], ["#pricing", "Pricing"], ["/login", "Login"]].map(([href, label]) => (
              <a key={label} href={href} className="font-mono text-[11px] uppercase tracking-wider text-white/40 transition hover:text-white">
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a href="#pricing" className="hidden rounded-xl bg-[#C5FF3D] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-black transition hover:bg-white md:block">
              Get Started
            </a>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 md:hidden">
              <span className="text-white/60">{mobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/5 bg-[#080808] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {[["#modules", "Modules"], ["#pricing", "Pricing"], ["/login", "Login"]].map(([href, label]) => (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="font-mono text-sm uppercase tracking-wider text-white/50 transition hover:text-white">
                  {label}
                </a>
              ))}
              <a href="#pricing" className="mt-2 rounded-xl bg-[#C5FF3D] px-5 py-3 text-center font-mono text-sm font-bold uppercase tracking-wider text-black">
                Get Started
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pb-28 pt-20 md:px-8 md:pt-28">
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute -right-48 -top-48 h-[800px] w-[800px] rounded-full bg-[#C5FF3D]/6 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-[500px] w-[500px] rounded-full bg-[#C5FF3D]/4 blur-[100px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1fr_460px]">
          {/* LEFT */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C5FF3D]/20 bg-[#C5FF3D]/8 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#C5FF3D]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5FF3D]" />
              AI Website Growth Intelligence Platform
            </div>

            <h1 className="text-[clamp(2.6rem,6.5vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">
              Other tools give<br />you data.
              <br />
              <span className="bg-gradient-to-r from-[#C5FF3D] to-[#a8e832] bg-clip-text text-transparent">
                We give a growth plan.
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-[17px] leading-[1.75] text-white/45">
              Built for agencies producing client deliverables. Run audits across 8 intelligence modules, export white-label PDFs, and show clients exactly what to fix and why.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {["White-Label PDF", "AI Visibility", "8 Modules", "Competitor Intel", "Keyword Gaps"].map((tag) => (
                <span key={tag} className="rounded-full border border-white/8 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/5 pt-10">
              {[["14K+", "Keywords Tracked"], ["8+", "Audit Modules"], ["3×", "Faster Reports"]].map(([val, lbl]) => (
                <div key={lbl}>
                  <div className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold text-white">{val}</div>
                  <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — AUDIT WIDGET */}
          <div className="relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#C5FF3D]/15 via-[#C5FF3D]/5 to-transparent" />
            <div className="relative overflow-hidden rounded-2xl bg-[#0d0d0d] ring-1 ring-white/8 shadow-2xl">
              {/* Widget header */}
              <div className="flex items-center gap-2 border-b border-white/5 bg-white/2 px-5 py-4">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-white/25">free-audit.crawlerque.com</span>
              </div>

              <div className="p-7">
                <div className="mb-5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C5FF3D]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">Free Audit · No Signup Required</span>
                </div>

                <h2 className="text-xl font-bold text-white">Run a free audit</h2>
                <p className="mt-1.5 text-sm text-white/35">Enter any URL to get your growth intelligence snapshot instantly.</p>

                <div className="mt-5 space-y-3">
                  <input
                    type="text"
                    placeholder="https://yourclient.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAudit()}
                    className="w-full rounded-xl border border-white/8 bg-[#080808] px-4 py-3.5 font-mono text-sm text-white outline-none placeholder:text-white/15 transition focus:border-[#C5FF3D]/40 focus:ring-1 focus:ring-[#C5FF3D]/15"
                  />
                  <button
                    onClick={handleAudit}
                    disabled={loading}
                    className="w-full rounded-xl bg-[#C5FF3D] px-5 py-3.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-black transition hover:bg-white disabled:opacity-40"
                  >
                    {loading ? "Analysing..." : "Run Free Audit"}
                  </button>
                  {loading && <div className="h-0.5 animate-pulse rounded-full bg-gradient-to-r from-[#C5FF3D] to-transparent" />}
                </div>

                {result && (
                  <div className="mt-5">
                    {result.success ? (
                      <>
                        <div className="overflow-hidden rounded-xl border border-white/6 bg-[#080808]">
                          <div className="border-b border-white/5 bg-white/2 px-4 py-2.5">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-white/25">audit.result</span>
                          </div>
                          <div className="p-4">
                            {[
                              ["Overall Score", result.report?.overallScore ?? "—"],
                              ["SEO Score", result.report?.seoScore ?? "—"],
                              ["Mobile Perf", result.report?.mobilePerformance ?? "—"],
                              ["Desktop Perf", result.report?.desktopPerformance ?? "—"],
                              ["Traffic Est.", result.report?.traffic?.monthly ? `${Number(result.report.traffic.monthly).toLocaleString()}/mo` : "—"],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between border-b border-white/4 py-2.5 last:border-0">
                                <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">{label}</span>
                                <span className="font-bold text-white">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-[#C5FF3D]/12 bg-[#C5FF3D]/5 p-4">
                          <p className="text-sm font-semibold text-white">Want the full 8-module report?</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/35">Includes AI visibility, competitor intel, keyword gaps, backlinks, and a white-label PDF.</p>
                          <a href="#pricing" className="mt-3 inline-block rounded-lg bg-[#C5FF3D] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-black transition hover:bg-white">
                            View Plans &#8594;
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-red-500/15 bg-red-500/8 px-4 py-3 text-sm text-red-400">
                        {result.error}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 border-t border-white/5 pt-5">
                  <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">Free audit covers</p>
                  <div className="space-y-2">
                    {["Technical SEO scan", "Core Web Vitals check", "On-page SEO signals"].map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-sm text-white/35">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#C5FF3D]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-white/5 bg-white/[0.02] px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 md:justify-between">
          {[
            ["14,000+", "Keywords Analysed"],
            ["8", "Audit Modules"],
            ["3×", "Faster Reporting"],
            ["100%", "White-Labelable"],
            ["AI-Powered", "Visibility Scoring"],
          ].map(([val, lbl]) => (
            <div key={lbl} className="flex items-center gap-3">
              <span className="text-lg font-extrabold text-[#C5FF3D]">{val}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">{lbl}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; How It Works</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">
            Audit. Analyse. Deliver.
          </h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/40">From URL to white-label client PDF in minutes.</p>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Enter any URL", d: "Paste a client domain. Crawler Que runs all selected modules simultaneously against live data — no install needed." },
              { n: "02", t: "AI analyses everything", d: "SEO, speed, traffic, AI visibility, competitors, backlinks, keywords — processed, scored, and ranked by impact." },
              { n: "03", t: "Export white-label PDF", d: "Download a branded PDF with scores, insights, and a 90-day action roadmap ready to share with clients." },
            ].map((s) => (
              <div key={s.n} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d0d] p-8 transition hover:border-[#C5FF3D]/15">
                <div className="absolute right-5 top-4 font-mono text-[4rem] font-extrabold leading-none text-white/3 transition group-hover:text-[#C5FF3D]/8">
                  {s.n}
                </div>
                <div className="relative">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#C5FF3D]/20 bg-[#C5FF3D]/8">
                    <span className="font-mono text-xs font-bold text-[#C5FF3D]">{s.n}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{s.t}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-white/35">{s.d}</p>
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
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">
            Every intelligence layer<br className="hidden md:block" /> your client needs.
          </h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/40">
            Modular by design. Run a full audit or go deep on a single signal.
          </p>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div key={mod.name} className="group rounded-xl border border-white/5 bg-[#0d0d0d] p-6 transition hover:border-[#C5FF3D]/15 hover:bg-[#0f0f0f]">
                <div className="mb-3 inline-block rounded border border-[#C5FF3D]/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">
                  {mod.tag}
                </div>
                <h3 className="text-[15px] font-bold text-white">{mod.name}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/35">{mod.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {mod.pills.map((pill) => (
                    <span key={pill} className="rounded border border-white/6 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/20">
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-b border-white/5 px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; Pricing</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">
            The PDF is the product.
          </h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/40">
            Agency-first pricing built around white-label deliverables. Pick the volume that fits your workflow.
          </p>

          {checkoutError && (
            <div className="mt-6 rounded-xl border border-red-500/15 bg-red-500/8 px-5 py-4 text-sm text-red-400">
              {checkoutError}
            </div>
          )}

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col overflow-hidden rounded-2xl transition ${
                  plan.popular
                    ? "border border-[#C5FF3D]/25 bg-gradient-to-b from-[#0d1500] to-[#080808] shadow-[0_0_80px_rgba(197,255,61,0.05)]"
                    : "border border-white/5 bg-[#0d0d0d] hover:border-white/8"
                }`}
              >
                {plan.popular && (
                  <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C5FF3D]/50 to-transparent" />
                )}

                <div className="p-8">
                  {plan.popular && (
                    <div className="mb-5 inline-flex rounded-full bg-[#C5FF3D]/10 px-3.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#C5FF3D]">
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-2 text-sm text-white/35">{plan.description}</p>

                  <div className="mt-7 flex items-end gap-1.5">
                    <span className={`text-[3.5rem] font-extrabold leading-none ${plan.popular ? "text-[#C5FF3D]" : "text-white"}`}>
                      {plan.price}
                    </span>
                    <span className="mb-2 font-mono text-xs text-white/25">{plan.period}</span>
                  </div>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-white/50">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5FF3D]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto px-8 pb-8">
                  <button
                    onClick={() => handleChoosePlan(plan.priceId, plan.name)}
                    disabled={checkoutLoading === plan.name}
                    className={`w-full rounded-xl px-5 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition disabled:opacity-50 ${
                      plan.popular
                        ? "bg-[#C5FF3D] text-black hover:bg-white"
                        : "border border-white/10 text-white hover:border-white/20 hover:bg-white/4"
                    }`}
                  >
                    {checkoutLoading === plan.name ? "Redirecting..." : plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/20">
            All plans include a 7-day free trial &#183; Cancel any time &#183; Secure payment via Stripe
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-5 py-28 text-center md:px-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[#C5FF3D]/5 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[#C5FF3D]">&#9646; Get Started Today</div>
          <h2 className="text-[clamp(2.2rem,5.5vw,4rem)] font-extrabold leading-[0.95] tracking-tight">
            Stop explaining SEO.
            <br />
            <span className="bg-gradient-to-r from-[#C5FF3D] to-[#a8e832] bg-clip-text text-transparent">
              Start showing results.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/40">
            Run your first audit free. No signup needed. When you are ready to deliver it to a client, pick a plan.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="rounded-xl bg-[#C5FF3D] px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white"
            >
              Run a Free Audit
            </button>
            
              <a href="#pricing"
              className="rounded-xl border border-white/10 px-8 py-4 font-mono text-sm uppercase tracking-wider text-white/40 transition hover:border-white/20 hover:text-white"
            >
              See Plans
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C5FF3D]">
              <span className="text-[10px] font-black text-black">CQ</span>
            </div>
            <span className="text-sm font-bold text-white">
              Crawler Que <span className="text-[#C5FF3D]">by Strat IQ Digital</span>
            </span>
          </a>

          <div className="flex flex-wrap justify-center gap-7 font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
            {[["#modules", "Modules"], ["#pricing", "Pricing"], ["/login", "Login"], ["/dashboard", "Dashboard"]].map(([href, label]) => (
              <a key={label} href={href} className="transition hover:text-white">{label}</a>
            ))}
          </div>

          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/15">
            &#169; 2026 Crawler Que &#183; Strat IQ Digital
          </div>
        </div>
      </footer>
    </main>
  );
}
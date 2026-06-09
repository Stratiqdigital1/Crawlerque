// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";

/* ─── Magnetic button hook ─── */
function useMagnetic(strength = 0.35) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    };
    const onLeave = () => { el.style.transform = "translate(0,0)"; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [strength]);
  return ref;
}

/* ─── Custom cursor ─── */
function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    let raf: number;
    let mx = -200, my = -200, rx = -200, ry = -200;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);
    const loop = () => {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (dot.current) { dot.current.style.transform = `translate(${mx - 4}px,${my - 4}px)`; }
      if (ring.current) { ring.current.style.transform = `translate(${rx - 20}px,${ry - 20}px)`; }
      raf = requestAnimationFrame(loop);
    };
    loop();

    const hover = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const cta = t.closest("[data-cursor]") as HTMLElement | null;
      const lbl = cta?.dataset.cursor ?? "";
      setLabel(lbl);
      if (ring.current) {
        ring.current.style.width = lbl ? "72px" : "40px";
        ring.current.style.height = lbl ? "72px" : "40px";
        ring.current.style.background = lbl ? "rgba(197,255,61,0.12)" : "transparent";
        ring.current.style.borderColor = lbl ? "#C5FF3D" : "rgba(197,255,61,0.5)";
      }
    };
    window.addEventListener("mouseover", hover);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", hover);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dot} style={{position:"fixed",top:0,left:0,width:8,height:8,borderRadius:"50%",background:"#C5FF3D",pointerEvents:"none",zIndex:9999,transition:"transform 0.05s linear"}} />
      <div ref={ring} style={{position:"fixed",top:0,left:0,width:40,height:40,borderRadius:"50%",border:"1px solid rgba(197,255,61,0.5)",pointerEvents:"none",zIndex:9998,transition:"transform 0.1s linear, width 0.25s ease, height 0.25s ease, background 0.2s, border-color 0.2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {label && <span style={{fontSize:9,fontFamily:"monospace",color:"#C5FF3D",letterSpacing:"0.08em",textTransform:"uppercase",userSelect:"none"}}>{label}</span>}
      </div>
    </>
  );
}

/* ─── Noise texture SVG ─── */
const noiseSVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const ctaRef = useMagnetic(0.25);
  const navCtaRef = useMagnetic(0.3);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const plans = [
    { name: "Starter", price: "$49", period: "/mo", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "", description: "For freelancers auditing client sites.", features: ["10 audits / month","All 8 audit modules","Branded PDF export","30-day history","1 seat"], popular: false, cta: "Get Started" },
    { name: "Agency", price: "$99", period: "/mo", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "", description: "For agencies producing client deliverables.", features: ["40 audits / month","White-label PDF reports","Comparison reports","90-day history","3 seats"], popular: true, cta: "Get Started" },
    { name: "Enterprise", price: "$299", period: "/mo", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "", description: "For high-volume agencies and consultancies.", features: ["150 audits / month","White-label PDF reports","Priority support","Unlimited history","10 seats"], popular: false, cta: "Get Started" },
  ];

  const handleAudit = async () => {
    if (!url.trim()) return;
    let auditUrl = url.trim();
    if (!auditUrl.startsWith("http://") && !auditUrl.startsWith("https://")) { auditUrl = `https://${auditUrl}`; setUrl(auditUrl); }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: auditUrl, reportTypes: ["seo","technical"], auditMode: "free" }) });
      setResult(await res.json());
    } catch { setResult({ success: false, error: "Something went wrong. Please try again." }); }
    finally { setLoading(false); }
  };

  const handleChoosePlan = async (priceId: string, planName: string) => {
    if (!priceId) { setCheckoutError("Plan not configured yet. Please contact support."); return; }
    setCheckoutLoading(planName); setCheckoutError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceId, packageName: planName }) });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setCheckoutError(json.error || "Failed to start checkout.");
    } catch { setCheckoutError("Something went wrong. Please try again."); }
    finally { setCheckoutLoading(null); }
  };

  const modules = [
    { tag: "SEO", name: "SEO Intelligence", desc: "Title, H1, meta, crawlability, keyword density and structured data signals audited against current best practices.", pills: ["ON-PAGE", "TECHNICAL"] },
    { tag: "TRAFFIC", name: "Traffic Modelling", desc: "CTR-curve traffic estimation across all ranked keywords with confidence scoring and month-over-month deltas.", pills: ["CTR-CURVE", "KEYWORDS"] },
    { tag: "SPEED", name: "Core Web Vitals", desc: "Google PageSpeed mobile and desktop scores with prioritised fix recommendations ranked by impact.", pills: ["LCP", "CLS", "FCP"] },
    { tag: "AI", name: "AI Search Visibility", desc: "Track how your client's brand appears in AI-generated search results across GPT, Gemini, and Perplexity.", pills: ["LLM RANK", "GEO"] },
    { tag: "COMPETE", name: "Competitor Intel", desc: "Benchmark against organic competitors and surface keyword gaps worth closing with effort-to-impact scoring.", pills: ["GAP ANALYSIS", "THREATS"] },
    { tag: "LINKS", name: "Backlink Authority", desc: "Backlink profile, referring domains, and authority gap signals with trust scoring and toxic link detection.", pills: ["BACKLINKS", "TRUST"] },
  ];

  const navLinks = [["#modules","Modules"],["#pricing","Pricing"],["/sample-report","Sample Report"],["/brand","Brand"],["/dashboard","Dashboard"],["/login","Login"]];

  return (
    <main style={{minHeight:"100vh",background:"#060606",color:"white",overflowX:"hidden",cursor:"none"}}
      className="antialiased selection:bg-[#C5FF3D] selection:text-black">

      <Cursor />

      {/* ── ANNOUNCEMENT BAR ── */}
      <div style={{background:"#C5FF3D",display:"flex",alignItems:"center",justifyContent:"center",gap:12,padding:"10px 16px",fontFamily:"monospace",fontSize:10,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:"#000"}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:"#000",animation:"pulse 2s infinite"}} />
        Agency-first audit platform &nbsp;·&nbsp; AI visibility &nbsp;·&nbsp; White-label PDF
        <a href="#pricing" data-cursor="plans" style={{marginLeft:8,background:"#000",color:"#C5FF3D",padding:"4px 12px",borderRadius:4,fontSize:9,cursor:"none",transition:"background 0.2s"}}
          onMouseEnter={e=>(e.currentTarget.style.background="#1a1a1a")} onMouseLeave={e=>(e.currentTarget.style.background="#000")}>
          View Plans
        </a>
      </div>

      {/* ── NAV ── */}
      <nav style={{position:"sticky",top:0,zIndex:50,borderBottom:`1px solid ${scrolled?"rgba(255,255,255,0.06)":"transparent"}`,background:scrolled?"rgba(6,6,6,0.92)":"transparent",backdropFilter:scrolled?"blur(20px)":"none",transition:"all 0.4s ease"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",height:68}}>
          <a href="/" style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none",cursor:"none"}}>
            <div style={{width:30,height:30,background:"#C5FF3D",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3v10" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/><circle cx="8" cy="8" r="3" stroke="#000" strokeWidth="1.5"/></svg>
            </div>
            <span style={{fontSize:15,fontWeight:800,letterSpacing:"-0.02em",color:"white"}}>Crawler Que</span>
            <span style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.3)",letterSpacing:"0.04em"}}>by Strat IQ</span>
          </a>

          <div className="hidden md:flex" style={{alignItems:"center",gap:36}}>
            {navLinks.map(([href, label]) => (
              <a key={label} href={href} data-cursor={label} style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(255,255,255,0.35)",textDecoration:"none",transition:"color 0.2s",cursor:"none"}}
                onMouseEnter={e=>(e.currentTarget.style.color="white")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.35)")}>
                {label}
              </a>
            ))}
          </div>

          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <a href="#pricing" ref={navCtaRef as any} data-cursor="start" className="hidden md:block"
              style={{background:"#C5FF3D",color:"#000",padding:"10px 22px",borderRadius:8,fontFamily:"monospace",fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",textDecoration:"none",transition:"background 0.2s, transform 0.3s ease",display:"inline-block",cursor:"none"}}
              onMouseEnter={e=>{e.currentTarget.style.background="white"}} onMouseLeave={e=>{e.currentTarget.style.background="#C5FF3D"}}>
              Get Started
            </a>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden"
              style={{width:38,height:38,borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.6)",fontSize:16,cursor:"none"}}>
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",background:"#060606",padding:"16px 24px"}}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {navLinks.map(([href, label]) => (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                  style={{fontFamily:"monospace",fontSize:13,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.45)",textDecoration:"none"}}>
                  {label}
                </a>
              ))}
              <a href="#pricing" style={{marginTop:8,background:"#C5FF3D",color:"#000",padding:"12px",borderRadius:8,textAlign:"center",fontFamily:"monospace",fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.12em",textDecoration:"none"}}>Get Started</a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{position:"relative",overflow:"hidden",padding:"100px 32px 120px",minHeight:"90vh",display:"flex",alignItems:"center"}}>
        {/* Crosshatch grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}} />
        {/* Gradient orbs */}
        <div style={{position:"absolute",right:"-15%",top:"-10%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(197,255,61,0.07) 0%,transparent 70%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",left:"-10%",bottom:"-15%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(197,255,61,0.04) 0%,transparent 70%)",pointerEvents:"none"}} />
        {/* Noise */}
        <div style={{position:"absolute",inset:0,backgroundImage:noiseSVG,backgroundRepeat:"repeat",opacity:0.6,pointerEvents:"none"}} />

        <div style={{maxWidth:1280,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 440px",gap:80,alignItems:"center",position:"relative",zIndex:1,width:"100%"}} className="lg:grid-cols-[1fr_440px] grid-cols-1">
          {/* LEFT */}
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,border:"1px solid rgba(197,255,61,0.2)",borderRadius:40,padding:"7px 16px",fontFamily:"monospace",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#C5FF3D",marginBottom:28,background:"rgba(197,255,61,0.05)"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#C5FF3D",display:"block",animation:"pulse 1.8s infinite"}} />
              AI Website Growth Intelligence
            </div>

            <h1 style={{fontSize:"clamp(3rem,6vw,5.5rem)",fontWeight:900,lineHeight:0.9,letterSpacing:"-0.045em",marginBottom:28}}>
              <span style={{display:"block",color:"rgba(255,255,255,0.9)"}}>Other tools</span>
              <span style={{display:"block",color:"rgba(255,255,255,0.9)"}}>give you data.</span>
              <span style={{display:"block",background:"linear-gradient(135deg,#C5FF3D 0%,#a8e832 60%,#d4ff7a 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                We give a plan.
              </span>
            </h1>

            <p style={{fontSize:17,lineHeight:1.75,color:"rgba(255,255,255,0.42)",maxWidth:500,marginBottom:32}}>
              Built for agencies producing client deliverables. Run audits across 8 intelligence modules, export white-label PDFs, and show clients exactly what to fix—and why it matters.
            </p>

            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:48}}>
              {["White-Label PDF","AI Visibility","8 Modules","Competitor Intel","Keyword Gaps"].map(tag => (
                <span key={tag} style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:40,padding:"5px 14px",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(255,255,255,0.28)"}}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
              <button ref={ctaRef as any} onClick={() => window.scrollTo({top:0,behavior:"smooth"})} data-cursor="audit"
                style={{background:"#C5FF3D",color:"#000",padding:"14px 32px",borderRadius:10,fontFamily:"monospace",fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",border:"none",cursor:"none",transition:"background 0.2s, transform 0.3s ease"}}
                onMouseEnter={e=>{e.currentTarget.style.background="white"}} onMouseLeave={e=>{e.currentTarget.style.background="#C5FF3D"}}>
                Run Free Audit
              </button>
              <a href="#modules" data-cursor="explore" style={{color:"rgba(255,255,255,0.35)",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",textDecoration:"none",display:"flex",alignItems:"center",gap:8,cursor:"none",transition:"color 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="white"}} onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.35)"}}>
                See Modules
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:36,marginTop:48}}>
              {[["14K+","Keywords tracked"],["8","Audit modules"],["3×","Faster reports"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{fontSize:"clamp(2rem,3vw,2.8rem)",fontWeight:900,letterSpacing:"-0.04em",color:"white",lineHeight:1}}>{v}</div>
                  <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.22)",marginTop:6}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — AUDIT WIDGET */}
          <div style={{position:"relative"}} className="hidden lg:block">
            {/* Glow ring */}
            <div style={{position:"absolute",inset:-1,borderRadius:20,background:"linear-gradient(135deg,rgba(197,255,61,0.18),rgba(197,255,61,0.04),transparent)",pointerEvents:"none"}} />
            <div style={{position:"relative",borderRadius:20,background:"#0c0c0c",border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,0.6)"}}>
              {/* Terminal dots */}
              <div style={{display:"flex",alignItems:"center",gap:7,padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.015)"}}>
                <span style={{width:11,height:11,borderRadius:"50%",background:"#FF5F57"}} />
                <span style={{width:11,height:11,borderRadius:"50%",background:"#FEBC2E"}} />
                <span style={{width:11,height:11,borderRadius:"50%",background:"#28C840"}} />
                <span style={{marginLeft:12,fontFamily:"monospace",fontSize:9,letterSpacing:"0.16em",color:"rgba(255,255,255,0.2)",textTransform:"uppercase"}}>crawlerque.com / audit</span>
              </div>

              <div style={{padding:28}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:18}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#C5FF3D"}} />
                  <span style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.2em",color:"#C5FF3D"}}>Free · No Signup Required</span>
                </div>

                <h2 style={{fontSize:19,fontWeight:800,letterSpacing:"-0.02em",marginBottom:6,color:"white"}}>Run a free audit</h2>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.3)",lineHeight:1.6,marginBottom:20}}>Enter any URL to get your growth intelligence snapshot.</p>

                <div style={{position:"relative",marginBottom:12}}>
                  <input type="text" placeholder="https://yourclient.com" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAudit()}
                    style={{width:"100%",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"#060606",padding:"13px 16px",fontFamily:"monospace",fontSize:12,color:"white",outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
                    onFocus={e=>(e.currentTarget.style.borderColor="rgba(197,255,61,0.35)")} onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.08)")} />
                </div>
                <button onClick={handleAudit} disabled={loading} data-cursor=""
                  style={{width:"100%",background:loading?"rgba(197,255,61,0.7)":"#C5FF3D",color:"#000",borderRadius:10,padding:"13px",fontFamily:"monospace",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.12em",border:"none",cursor:"none",transition:"background 0.2s"}}
                  onMouseEnter={e=>{if(!loading)e.currentTarget.style.background="white"}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.background="#C5FF3D"}}>
                  {loading ? "Analysing…" : "Run Free Audit →"}
                </button>

                {loading && (
                  <div style={{height:2,borderRadius:2,background:"rgba(255,255,255,0.05)",marginTop:12,overflow:"hidden"}}>
                    <div style={{height:"100%",background:"linear-gradient(90deg,#C5FF3D,transparent)",animation:"scan 1.5s linear infinite"}} />
                  </div>
                )}

                {result && result.success && (
                  <div style={{marginTop:16,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{padding:"10px 14px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <span style={{fontFamily:"monospace",fontSize:8,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.2)"}}>audit.result</span>
                    </div>
                    <div style={{padding:"4px 14px 12px"}}>
                      {[["Overall Score",result.report?.overallScore],["SEO Score",result.report?.seoScore],["Mobile Perf",result.report?.mobilePerformance],["Desktop Perf",result.report?.desktopPerformance],["Traffic Est.",result.report?.traffic?.monthly?`${Number(result.report.traffic.monthly).toLocaleString()}/mo`:"—"]].map(([lbl,val])=>(
                        <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.28)"}}>{lbl}</span>
                          <span style={{fontWeight:700,fontSize:13,color:"white"}}>{val ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{margin:"0 14px 14px",padding:14,borderRadius:8,border:"1px solid rgba(197,255,61,0.1)",background:"rgba(197,255,61,0.04)"}}>
                      <p style={{fontWeight:700,fontSize:13,marginBottom:4,color:"white"}}>Want the full 8-module report?</p>
                      <p style={{fontSize:11,color:"rgba(255,255,255,0.3)",lineHeight:1.6,marginBottom:12}}>AI visibility, competitor intel, keyword gaps, backlinks + white-label PDF.</p>
                      <div style={{display:"flex",gap:8}}>
                        <a href="/sample-report" style={{padding:"7px 14px",borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.4)",textDecoration:"none",cursor:"none"}}>Sample</a>
                        <a href="#pricing" style={{padding:"7px 14px",borderRadius:7,background:"#C5FF3D",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"#000",fontWeight:800,textDecoration:"none",cursor:"none"}}>View Plans →</a>
                      </div>
                    </div>
                  </div>
                )}

                {result && !result.success && (
                  <div style={{marginTop:12,padding:"12px 14px",borderRadius:10,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.07)",fontSize:12,color:"rgb(252,165,165)"}}>
                    {result.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid rgba(255,255,255,0.05)",overflow:"hidden",padding:"14px 0",background:"rgba(197,255,61,0.02)"}}>
        <div style={{display:"flex",gap:0,animation:"marquee 30s linear infinite",whiteSpace:"nowrap"}}>
          {[...Array(3)].map((_,i) => (
            <div key={i} style={{display:"flex",gap:0}}>
              {["SEO Intelligence","Traffic Modelling","Core Web Vitals","AI Visibility","Competitor Intel","Backlink Authority","White-label PDF","Keyword Gaps"].map(item => (
                <span key={item} style={{display:"inline-flex",alignItems:"center",gap:20,padding:"0 36px",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.18)"}}>
                  <span style={{width:4,height:4,borderRadius:"50%",background:"#C5FF3D",display:"block",flexShrink:0}} />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── MODULES ── */}
      <section id="modules" style={{padding:"100px 32px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:12}}>▮ Audit Modules</div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:20,marginBottom:56}}>
            <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white"}}>
              Every intelligence layer<br />your client needs.
            </h2>
            <p style={{maxWidth:380,fontSize:14,lineHeight:1.75,color:"rgba(255,255,255,0.35)"}}>Modular by design. Run a full audit or go deep on a single signal. Each module produces a standalone section in your white-label PDF.</p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,0.05)",borderRadius:16,overflow:"hidden"}} className="md:grid-cols-3 grid-cols-1">
            {modules.map((mod, i) => (
              <div key={mod.name} data-cursor="view"
                style={{background:activeModule===i?"#0e1200":"#080808",padding:"32px 28px",cursor:"none",transition:"background 0.25s",position:"relative",overflow:"hidden"}}
                onMouseEnter={()=>setActiveModule(i)} onMouseLeave={()=>setActiveModule(-1)}>
                {activeModule===i && <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,#C5FF3D,transparent)"}} />}
                <div style={{display:"inline-block",border:"1px solid rgba(197,255,61,0.15)",borderRadius:4,padding:"4px 10px",fontFamily:"monospace",fontSize:8,textTransform:"uppercase",letterSpacing:"0.2em",color:"rgba(197,255,61,0.55)",marginBottom:14}}>
                  {mod.tag}
                </div>
                <h3 style={{fontSize:15,fontWeight:800,letterSpacing:"-0.02em",color:"white",marginBottom:10}}>{mod.name}</h3>
                <p style={{fontSize:12,lineHeight:1.7,color:"rgba(255,255,255,0.3)",marginBottom:18}}>{mod.desc}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {mod.pills.map(pill => (
                    <span key={pill} style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:3,padding:"3px 8px",fontFamily:"monospace",fontSize:8,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.18)"}}>
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section style={{padding:"100px 32px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:12}}>▮ How We Compare</div>
          <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white",marginBottom:14}}>
            Built differently.<br />For a different workflow.
          </h2>
          <p style={{maxWidth:480,fontSize:14,lineHeight:1.75,color:"rgba(255,255,255,0.35)",marginBottom:56}}>Traditional SEO tools are built for data analysts. Crawler Que is built for agencies producing client deliverables.</p>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",minWidth:600,borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",padding:"14px 20px",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(255,255,255,0.3)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>Feature</th>
                  {[{name:"Crawler Que",highlight:true},{name:"SEMrush",highlight:false},{name:"Ahrefs",highlight:false}].map(col=>(
                    <th key={col.name} style={{padding:"14px 20px",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:col.highlight?"#C5FF3D":"rgba(255,255,255,0.3)",borderBottom:col.highlight?"1px solid rgba(197,255,61,0.2)":"1px solid rgba(255,255,255,0.06)",background:col.highlight?"rgba(197,255,61,0.03)":"transparent",textAlign:"center"}}>
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[["White-Label PDF Reports","✓","Partial","✗"],["AI Search Visibility","✓","✗","✗"],["Agency Workflow Focus","✓","✗","✗"],["Client-Ready Deliverables","✓","Limited","Limited"],["Keyword Gap Intelligence","✓","✓","✓"],["Competitor Threat Scoring","✓","Partial","Partial"],["Core Web Vitals Audit","✓","✓","✓"],["Modular Report Selection","✓","✗","✗"],["GEO / AI Visibility Scoring","✓","✗","✗"],["Price (Agency-tier)","$99/mo","$229/mo","$199/mo"]].map(([feature,cq,sem,ah],i)=>(
                  <tr key={String(feature)} style={{background:i%2===0?"#080808":"#060606"}}>
                    <td style={{padding:"13px 20px",fontSize:13,color:"rgba(255,255,255,0.5)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{feature}</td>
                    <td style={{padding:"13px 20px",textAlign:"center",fontWeight:800,fontSize:13,color:"#C5FF3D",borderBottom:"1px solid rgba(197,255,61,0.08)",background:"rgba(197,255,61,0.025)"}}>{cq}</td>
                    <td style={{padding:"13px 20px",textAlign:"center",fontSize:12,color:"rgba(255,255,255,0.25)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{sem}</td>
                    <td style={{padding:"13px 20px",textAlign:"center",fontSize:12,color:"rgba(255,255,255,0.25)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{ah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{padding:"100px 32px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:12}}>▮ Pricing</div>
          <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white",marginBottom:14}}>The PDF is the product.</h2>
          <p style={{maxWidth:480,fontSize:14,lineHeight:1.75,color:"rgba(255,255,255,0.35)",marginBottom:56}}>Agency-first pricing built around white-label deliverables. Every plan includes a 7-day free trial.</p>

          {checkoutError && (
            <div style={{marginBottom:24,padding:"14px 18px",borderRadius:10,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.07)",fontSize:13,color:"rgb(252,165,165)"}}>
              {checkoutError}
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,0.05)",borderRadius:20,overflow:"hidden"}} className="md:grid-cols-3 grid-cols-1">
            {plans.map(plan => (
              <div key={plan.name} style={{position:"relative",display:"flex",flexDirection:"column",background:plan.popular?"#0d1300":"#080808",overflow:"hidden"}}>
                {plan.popular && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent 0%,#C5FF3D 50%,transparent 100%)"}} />}
                <div style={{padding:"36px 32px",flex:1}}>
                  {plan.popular && (
                    <div style={{display:"inline-flex",marginBottom:16,background:"rgba(197,255,61,0.1)",borderRadius:40,padding:"4px 14px",fontFamily:"monospace",fontSize:8,textTransform:"uppercase",letterSpacing:"0.18em",color:"#C5FF3D",fontWeight:700}}>
                      Most Popular
                    </div>
                  )}
                  <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(255,255,255,0.3)",marginBottom:8}}>{plan.name}</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:8}}>
                    <span style={{fontSize:"clamp(3rem,5vw,4rem)",fontWeight:900,letterSpacing:"-0.05em",color:plan.popular?"#C5FF3D":"white",lineHeight:1}}>
                      {plan.price}
                    </span>
                    <span style={{fontFamily:"monospace",fontSize:11,color:"rgba(255,255,255,0.2)"}}>{plan.period}</span>
                  </div>
                  <p style={{fontSize:13,color:"rgba(255,255,255,0.3)",lineHeight:1.6,marginBottom:28}}>{plan.description}</p>

                  <ul style={{listStyle:"none",padding:0,margin:"0 0 24px",display:"flex",flexDirection:"column",gap:12}}>
                    {plan.features.map(f => (
                      <li key={f} style={{display:"flex",alignItems:"flex-start",gap:12,fontSize:13,color:"rgba(255,255,255,0.45)"}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:"#C5FF3D",flexShrink:0,marginTop:6}} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div style={{borderRadius:8,border:"1px solid rgba(255,255,255,0.04)",background:"rgba(255,255,255,0.015)",padding:"12px 14px"}}>
                    <p style={{fontFamily:"monospace",fontSize:8,textTransform:"uppercase",letterSpacing:"0.16em",color:"rgba(255,255,255,0.18)",marginBottom:4}}>What this means</p>
                    <p style={{fontSize:11,lineHeight:1.65,color:"rgba(255,255,255,0.3)"}}>
                      {plan.name==="Starter"&&"Run 10 complete audits per month. Perfect for freelancers with up to 5 regular clients."}
                      {plan.name==="Agency"&&"40 audits covers 20+ recurring client reports monthly. White-label PDF means every report carries your brand."}
                      {plan.name==="Enterprise"&&"150 audits per month for high-volume agencies. Scale to 50+ clients with priority support behind you."}
                    </p>
                  </div>
                </div>

                <div style={{padding:"0 32px 32px"}}>
                  <button onClick={() => handleChoosePlan(plan.priceId, plan.name)} disabled={checkoutLoading===plan.name} data-cursor={plan.popular?"go":""}
                    style={{width:"100%",borderRadius:10,padding:"14px",fontFamily:"monospace",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.12em",border:"none",cursor:"none",transition:"background 0.2s, border-color 0.2s",opacity:checkoutLoading===plan.name?0.5:1,
                      background:plan.popular?"#C5FF3D":"transparent",color:plan.popular?"#000":"rgba(255,255,255,0.5)",
                      ...(plan.popular?{}:{border:"1px solid rgba(255,255,255,0.09)"})}}
                    onMouseEnter={e=>{e.currentTarget.style.background=plan.popular?"white":"rgba(255,255,255,0.04)"; if(!plan.popular)e.currentTarget.style.color="white";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=plan.popular?"#C5FF3D":"transparent"; if(!plan.popular)e.currentTarget.style.color="rgba(255,255,255,0.5)"}}>
                    {checkoutLoading===plan.name?"Redirecting…":plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p style={{marginTop:20,textAlign:"center",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.18)"}}>
            All plans include a 7-day free trial · Cancel any time · Secure payment via Stripe
          </p>
        </div>
      </section>

      {/* ── ROI CALCULATOR ── */}
      <section style={{padding:"100px 32px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:12}}>▮ ROI Calculator</div>
          <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white",marginBottom:14}}>
            What does $99/month<br />actually cost you?
          </h2>
          <p style={{maxWidth:480,fontSize:14,lineHeight:1.75,color:"rgba(255,255,255,0.35)",marginBottom:56}}>Agency Plan pays for itself with a single client report. Here's the math.</p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}} className="md:grid-cols-3 grid-cols-1">
            {[{plan:"Starter",price:49,audits:10,charge:150,clients:5},{plan:"Agency",price:99,audits:40,charge:300,clients:15},{plan:"Enterprise",price:299,audits:150,charge:500,clients:40}].map(row => {
              const revenue = row.charge * row.clients;
              const profit = revenue - row.price;
              return (
                <div key={row.plan} style={{borderRadius:16,border:"1px solid rgba(255,255,255,0.05)",background:"#0a0a0a",padding:28,transition:"border-color 0.25s"}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(197,255,61,0.12)")} onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.05)")}>
                  <div style={{fontFamily:"monospace",fontSize:8,textTransform:"uppercase",letterSpacing:"0.2em",color:"rgba(197,255,61,0.5)",marginBottom:20}}>{row.plan} Plan · ${row.price}/mo</div>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {[["Charge per audit",`$${row.charge}`],["Clients per month",`${row.clients}`],["Revenue generated",`$${revenue.toLocaleString()}`],["Platform cost",`-$${row.price}`]].map(([lbl,val],i)=>(
                      <div key={lbl} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                        <span style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>{lbl}</span>
                        <span style={{fontWeight:700,fontSize:13,color:i===3?"rgba(239,68,68,0.7)":"white"}}>{val}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:16,marginTop:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:"white"}}>Net profit</span>
                      <span style={{fontSize:22,fontWeight:900,letterSpacing:"-0.03em",color:"#C5FF3D"}}>${profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{marginTop:20,textAlign:"center",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.15)"}}>Based on typical agency pricing. Your rates may vary.</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{position:"relative",overflow:"hidden",padding:"120px 32px",textAlign:"center"}}>
        <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(197,255,61,0.06) 0%,transparent 70%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}} />
        <div style={{position:"relative",maxWidth:640,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:20}}>▮ Get Started Today</div>
          <h2 style={{fontSize:"clamp(2.4rem,5.5vw,4.5rem)",fontWeight:900,letterSpacing:"-0.045em",lineHeight:0.9,marginBottom:24,color:"white"}}>
            Stop explaining SEO.<br />
            <span style={{background:"linear-gradient(135deg,#C5FF3D 0%,#a8e832 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Start showing results.
            </span>
          </h2>
          <p style={{fontSize:15,lineHeight:1.75,color:"rgba(255,255,255,0.35)",maxWidth:420,margin:"0 auto 40px"}}>
            Run your first audit free. No signup needed. When you're ready to deliver it to a client, pick a plan.
          </p>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={() => window.scrollTo({top:0,behavior:"smooth"})} data-cursor="audit"
              style={{background:"#C5FF3D",color:"#000",padding:"16px 36px",borderRadius:12,fontFamily:"monospace",fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",border:"none",cursor:"none",transition:"background 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="white"}} onMouseLeave={e=>{e.currentTarget.style.background="#C5FF3D"}}>
              Run a Free Audit
            </button>
            <a href="#pricing" data-cursor="plans" style={{padding:"16px 36px",borderRadius:12,border:"1px solid rgba(255,255,255,0.09)",fontFamily:"monospace",fontSize:11,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.35)",textDecoration:"none",cursor:"none",transition:"border-color 0.2s,color 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"}} onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.35)";e.currentTarget.style.borderColor="rgba(255,255,255,0.09)"}}>
              See Plans
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"32px 32px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:24}}>
          <a href="/" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none",cursor:"none"}}>
            <div style={{width:28,height:28,background:"#C5FF3D",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:9,fontWeight:900,color:"#000"}}>CQ</span>
            </div>
            <span style={{fontSize:13,fontWeight:800,color:"white",letterSpacing:"-0.01em"}}>
              Crawler Que <span style={{color:"#C5FF3D",fontWeight:500}}>by Strat IQ Digital</span>
            </span>
          </a>

          <div style={{display:"flex",flexWrap:"wrap",gap:28}}>
            {navLinks.map(([href,label]) => (
              <a key={label} href={href} style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.16em",color:"rgba(255,255,255,0.22)",textDecoration:"none",transition:"color 0.2s",cursor:"none"}}
                onMouseEnter={e=>(e.currentTarget.style.color="white")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.22)")}>
                {label}
              </a>
            ))}
          </div>

          <div style={{fontFamily:"monospace",fontSize:8,textTransform:"uppercase",letterSpacing:"0.2em",color:"rgba(255,255,255,0.14)"}}>
            © 2026 Crawler Que · Strat IQ Digital
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes scan { from{transform:translateX(-100%)} to{transform:translateX(400%)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (prefers-reduced-motion: reduce) {
          *{animation:none!important;transition:none!important}
        }
      `}</style>
    </main>
  );
}

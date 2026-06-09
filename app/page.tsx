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
        {label && <span style={{fontSize:10,fontFamily:"monospace",color:"#C5FF3D",letterSpacing:"0.08em",textTransform:"uppercase",userSelect:"none"}}>{label}</span>}
      </div>
    </>
  );
}

const noiseSVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

/* ─────────────────────────────────────────────────────────────
   SHARED HEADER  — import this in every page via layout.tsx
   Shown here inline so this file is self-contained for review.
   Move <SiteHeader /> and <SiteFooter /> into app/layout.tsx
   and wrap children with them so every route gets them for free.
───────────────────────────────────────────────────────────── */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navCtaRef = useMagnetic(0.3);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // FIX: /brand removed from public nav — internal asset only
  // FIX: Login and Dashboard are distinct links
  // FIX: Get Started → /signup (checkout flow), not #pricing
  const navLinks = [
    ["#modules",       "Modules"],
    ["#pricing",       "Pricing"],
    ["/sample-report", "Sample Report"],
    ["/dashboard",     "Dashboard"],
    ["/login",         "Login"],
  ];

  const S = {
    nav: {
      position:"sticky" as const, top:0, zIndex:50,
      borderBottom:`1px solid ${scrolled ? "rgba(255,255,255,0.07)" : "transparent"}`,
      background: scrolled ? "rgba(6,6,6,0.94)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      transition:"all 0.4s ease",
    },
    inner: { maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 40px",height:72 },
    logoMark: { width:32,height:32,background:"#C5FF3D",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 },
    logoText: { fontSize:17,fontWeight:800,letterSpacing:"-0.025em",color:"white" },
    logoSub: { fontSize:12,fontFamily:"monospace",color:"rgba(255,255,255,0.3)",letterSpacing:"0.03em" },
    navLink: { fontFamily:"monospace",fontSize:11,textTransform:"uppercase" as const,letterSpacing:"0.14em",color:"rgba(255,255,255,0.38)",textDecoration:"none",transition:"color 0.2s",cursor:"none" },
    cta: { background:"#C5FF3D",color:"#000",padding:"11px 24px",borderRadius:9,fontFamily:"monospace",fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase" as const,textDecoration:"none",transition:"background 0.2s",cursor:"none",display:"inline-block" },
  };

  return (
    <nav style={S.nav}>
      <div style={S.inner}>
        {/* Logo */}
        <a href="/" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none",cursor:"none"}}>
          <div style={S.logoMark}>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <circle cx="8.5" cy="8.5" r="3.5" stroke="#000" strokeWidth="1.8"/>
              <path d="M8.5 2v2M8.5 13v2M2 8.5h2M13 8.5h2" stroke="#000" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={S.logoText}>Crawler Que</span>
          <span style={S.logoSub}>by Strat IQ</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex" style={{alignItems:"center",gap:38}}>
          {navLinks.map(([href, label]) => (
            <a key={label} href={href} data-cursor={label}
              style={S.navLink}
              onMouseEnter={e=>(e.currentTarget.style.color="white")}
              onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.38)")}>
              {label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs — FIX: Login and Get Started are separate */}
        <div className="hidden md:flex" style={{alignItems:"center",gap:10}}>
          <a href="/login"
            style={{padding:"11px 20px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",fontFamily:"monospace",fontSize:11,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.45)",textDecoration:"none",transition:"all 0.2s",cursor:"none"}}
            onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,0.25)"}}
            onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.45)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}}>
            Log in
          </a>
          {/* FIX: Get Started → /signup — distinct from Pricing */}
          <a href="/signup" ref={navCtaRef as any} data-cursor="sign up"
            style={S.cta}
            onMouseEnter={e=>{e.currentTarget.style.background="white"}}
            onMouseLeave={e=>{e.currentTarget.style.background="#C5FF3D"}}>
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden"
          aria-label="Toggle navigation"
          style={{width:40,height:40,borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.6)",fontSize:17,cursor:"none"}}>
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",background:"#060606",padding:"20px 28px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {navLinks.map(([href, label]) => (
              <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                style={{fontFamily:"monospace",fontSize:14,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.48)",textDecoration:"none"}}>
                {label}
              </a>
            ))}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <a href="/login" style={{flex:1,padding:"13px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",textAlign:"center",fontFamily:"monospace",fontSize:12,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.45)",textDecoration:"none"}}>Log in</a>
              <a href="/signup" style={{flex:1,background:"#C5FF3D",color:"#000",padding:"13px",borderRadius:8,textAlign:"center",fontFamily:"monospace",fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.12em",textDecoration:"none"}}>Get Started</a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── SHARED FOOTER ─── */
export function SiteFooter() {
  // FIX: /brand removed — internal doc, not user-facing
  const cols = {
    Product: [["#modules","Modules"],["#pricing","Pricing"],["/sample-report","Sample Report"]],
    Account:  [["/signup","Create account"],["/login","Log in"],["/dashboard","Dashboard"]],
    Support:  [["/docs","Documentation"],["/contact","Contact"],["/sample-report","See a sample report"]],
  };

  return (
    <footer style={{borderTop:"1px solid rgba(255,255,255,0.06)",background:"#060606",padding:"60px 40px 36px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:48,marginBottom:52}} className="md:grid-cols-[2fr_1fr_1fr_1fr] grid-cols-2">
          {/* Brand column */}
          <div>
            <a href="/" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none",cursor:"none",marginBottom:20}}>
              <div style={{width:30,height:30,background:"#C5FF3D",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="16" height="16" viewBox="0 0 17 17" fill="none">
                  <circle cx="8.5" cy="8.5" r="3.5" stroke="#000" strokeWidth="1.8"/>
                  <path d="M8.5 2v2M8.5 13v2M2 8.5h2M13 8.5h2" stroke="#000" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{fontSize:15,fontWeight:800,color:"white",letterSpacing:"-0.02em"}}>
                Crawler Que <span style={{color:"#C5FF3D",fontWeight:500}}>by Strat IQ</span>
              </span>
            </a>
            <p style={{fontSize:14,lineHeight:1.75,color:"rgba(255,255,255,0.32)",maxWidth:280}}>
              Website intelligence for agencies that bill on results, not hours. Run audits, export white-label PDFs, and show clients exactly where money is being left on the table.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(cols).map(([heading, links]) => (
            <div key={heading}>
              <p style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.22em",color:"rgba(255,255,255,0.25)",marginBottom:18}}>{heading}</p>
              <div style={{display:"flex",flexDirection:"column",gap:13}}>
                {links.map(([href, label]) => (
                  <a key={label} href={href} style={{fontSize:14,color:"rgba(255,255,255,0.38)",textDecoration:"none",transition:"color 0.2s",cursor:"none"}}
                    onMouseEnter={e=>(e.currentTarget.style.color="white")}
                    onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.38)")}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <span style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.16)"}}>
            © 2026 Crawler Que · Strat IQ Digital
          </span>
          <div style={{display:"flex",gap:24}}>
            {[["/privacy","Privacy"],["/terms","Terms"]].map(([href,label])=>(
              <a key={label} href={href} style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(255,255,255,0.2)",textDecoration:"none",transition:"color 0.2s",cursor:"none"}}
                onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,0.5)")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.2)")}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const [url, setUrl]               = useState("");
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError]     = useState("");
  const [activeModule, setActiveModule]       = useState(-1);
  const ctaRef = useMagnetic(0.25);

  const plans = [
    {
      name: "Starter", price: "$49", period: "/mo",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
      description: "For freelancers running audits for up to 5 retainer clients.",
      features: ["10 audits / month","All 8 audit modules","Branded PDF export","30-day history","1 seat"],
      popular: false, cta: "Start free trial",
    },
    {
      name: "Agency", price: "$99", period: "/mo",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "",
      description: "For agencies billing clients on monthly SEO deliverables.",
      features: ["40 audits / month","White-label PDF — your logo, your brand","Side-by-side comparison reports","90-day audit history","3 seats"],
      popular: true, cta: "Start free trial",
    },
    {
      name: "Enterprise", price: "$299", period: "/mo",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
      description: "For high-volume agencies managing 40+ active client accounts.",
      features: ["150 audits / month","White-label PDF reports","Priority Slack support","Unlimited history","10 seats"],
      popular: false, cta: "Start free trial",
    },
  ];

  const handleAudit = async () => {
    if (!url.trim()) return;
    let auditUrl = url.trim();
    if (!auditUrl.startsWith("http://") && !auditUrl.startsWith("https://")) {
      auditUrl = `https://${auditUrl}`; setUrl(auditUrl);
    }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditUrl, reportTypes: ["seo","technical"], auditMode: "free" }),
      });
      setResult(await res.json());
    } catch {
      setResult({ success: false, error: "Something went wrong. Please try again." });
    } finally { setLoading(false); }
  };

  const handleChoosePlan = async (priceId: string, planName: string) => {
    if (!priceId) { setCheckoutError("Plan not configured yet. Please contact support."); return; }
    setCheckoutLoading(planName); setCheckoutError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, packageName: planName }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setCheckoutError(json.error || "Failed to start checkout.");
    } catch { setCheckoutError("Something went wrong. Please try again."); }
    finally { setCheckoutLoading(null); }
  };

  // FIX: copy rewritten — concrete, specific, direct agency voice
  const modules = [
    {
      tag: "SEO", name: "On-Page & Technical SEO",
      desc: "Flags missing H1s, duplicate titles, broken canonical tags, and crawl blocks — the exact issues that cost rankings. Each finding is ranked by estimated traffic impact, not alphabetically.",
      pills: ["ON-PAGE","TECHNICAL","STRUCTURED DATA"],
    },
    {
      tag: "TRAFFIC", name: "Keyword Traffic Estimate",
      desc: "Takes every keyword the site ranks for, applies Google's actual CTR curve by position, and projects monthly organic visits with a confidence range. No vanity numbers — just what position change is worth in real traffic.",
      pills: ["CTR CURVE","POSITION DELTA","MoM TREND"],
    },
    {
      tag: "SPEED", name: "Core Web Vitals",
      desc: "Pulls live PageSpeed scores for mobile and desktop, then ranks every fix by the LCP or CLS delta it would recover. Your client sees a prioritised action list, not a wall of raw milliseconds.",
      pills: ["LCP","CLS","FCP","MOBILE + DESKTOP"],
    },
    {
      tag: "AI", name: "AI Search Visibility",
      desc: "Checks whether the site appears in ChatGPT, Gemini, and Perplexity answers for its target topics. The first tool built specifically for this — and the reason agencies are switching from Ahrefs.",
      pills: ["CHATGPT","GEMINI","PERPLEXITY","GEO SCORE"],
    },
    {
      tag: "COMPETE", name: "Competitor Gap Analysis",
      desc: "Finds keywords competitors rank for in positions 1–10 that your client doesn't touch. Sorted by search volume × attainability so you know exactly which gaps to close first.",
      pills: ["KEYWORD GAPS","THREAT SCORE","OPPORTUNITY RANK"],
    },
    {
      tag: "LINKS", name: "Backlink Authority",
      desc: "Maps the full backlink profile: referring domains, DR distribution, anchor diversity, and toxic link signals. Includes a head-to-head authority gap versus the top three organic competitors.",
      pills: ["REFERRING DOMAINS","DR SCORE","TOXIC SIGNALS"],
    },
  ];

  const T = (s: object) => s; // pass-through for inline style typing

  return (
    <main style={{minHeight:"100vh",background:"#060606",color:"white",overflowX:"hidden",cursor:"none"}}
      className="antialiased selection:bg-[#C5FF3D] selection:text-black">

      <Cursor />

      {/* Announcement bar */}
      <div style={{background:"#C5FF3D",display:"flex",alignItems:"center",justifyContent:"center",gap:14,padding:"11px 20px",fontFamily:"monospace",fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:"#000"}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:"#000",animation:"pulse 2s infinite",flexShrink:0}} />
        <span>Agency audit platform · AI visibility · White-label PDF</span>
        {/* FIX: "View Plans" → #pricing (distinct from Get Started → /signup) */}
        <a href="#pricing" data-cursor="plans"
          style={{marginLeft:6,background:"#000",color:"#C5FF3D",padding:"5px 14px",borderRadius:5,fontSize:10,cursor:"none",transition:"background 0.2s",textDecoration:"none"}}
          onMouseEnter={e=>(e.currentTarget.style.background="#1a1a1a")}
          onMouseLeave={e=>(e.currentTarget.style.background="#000")}>
          View Plans
        </a>
      </div>

      {/* ── HEADER (shared — in production, this lives in app/layout.tsx) ── */}
      <SiteHeader />

      {/* ════════════════ HERO ════════════════ */}
      <section style={{position:"relative",overflow:"hidden",padding:"96px 40px 120px",minHeight:"88vh",display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",backgroundSize:"64px 64px",pointerEvents:"none"}} />
        <div style={{position:"absolute",right:"-12%",top:"-8%",width:720,height:720,borderRadius:"50%",background:"radial-gradient(circle,rgba(197,255,61,0.07) 0%,transparent 68%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",left:"-8%",bottom:"-12%",width:520,height:520,borderRadius:"50%",background:"radial-gradient(circle,rgba(197,255,61,0.04) 0%,transparent 68%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",inset:0,backgroundImage:noiseSVG,backgroundRepeat:"repeat",opacity:0.5,pointerEvents:"none"}} />

        <div style={{maxWidth:1280,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 460px",gap:80,alignItems:"center",position:"relative",zIndex:1,width:"100%"}} className="lg:grid-cols-[1fr_460px] grid-cols-1">
          {/* Left */}
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,border:"1px solid rgba(197,255,61,0.22)",borderRadius:40,padding:"8px 18px",fontFamily:"monospace",fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:"#C5FF3D",marginBottom:30,background:"rgba(197,255,61,0.05)"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#C5FF3D",display:"block",animation:"pulse 1.8s infinite"}} />
              Agency Website Intelligence
            </div>

            {/* FIX: headline rewritten — direct, concrete, no AI-speak */}
            <h1 style={{fontSize:"clamp(3rem,6vw,5.5rem)",fontWeight:900,lineHeight:0.92,letterSpacing:"-0.045em",marginBottom:30}}>
              <span style={{display:"block",color:"rgba(255,255,255,0.92)"}}>Your clients don't</span>
              <span style={{display:"block",color:"rgba(255,255,255,0.92)"}}>read 47-page reports.</span>
              <span style={{display:"block",background:"linear-gradient(135deg,#C5FF3D 0%,#a8e832 65%,#d4ff7a 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                Ours fit on two.
              </span>
            </h1>

            {/* FIX: subtext rewritten — specific, no filler */}
            <p style={{fontSize:18,lineHeight:1.72,color:"rgba(255,255,255,0.44)",maxWidth:520,marginBottom:36}}>
              Crawler Que runs a full site audit across 8 modules and exports a clean, white-label PDF under your agency's name in under 90 seconds. No raw data dumps. No "here's your score." Just a report your client can act on by Monday.
            </p>

            <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:50}}>
              {["White-Label PDF","AI Visibility Scoring","Competitor Gap Analysis","Core Web Vitals","Keyword Rank Tracking"].map(tag => (
                <span key={tag} style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:40,padding:"6px 16px",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.13em",color:"rgba(255,255,255,0.28)"}}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
              <button ref={ctaRef as any} onClick={() => document.getElementById("audit-widget")?.scrollIntoView({behavior:"smooth"})}
                data-cursor="audit"
                style={{background:"#C5FF3D",color:"#000",padding:"15px 34px",borderRadius:10,fontFamily:"monospace",fontSize:12,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",border:"none",cursor:"none",transition:"background 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="white"}}
                onMouseLeave={e=>{e.currentTarget.style.background="#C5FF3D"}}>
                Run Free Audit
              </button>
              {/* FIX: "See Pricing" → /pricing (dedicated page), not just anchor */}
              <a href="/pricing" data-cursor="pricing"
                style={{color:"rgba(255,255,255,0.36)",fontFamily:"monospace",fontSize:11,textTransform:"uppercase",letterSpacing:"0.14em",textDecoration:"none",display:"flex",alignItems:"center",gap:8,cursor:"none",transition:"color 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.color="white"}}
                onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.36)"}}>
                See Pricing
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:28,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:40,marginTop:52}}>
              {[["90s","Average audit time"],["8","Intelligence modules"],["Zero","Manual effort per report"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{fontSize:"clamp(2rem,3vw,2.8rem)",fontWeight:900,letterSpacing:"-0.04em",color:"white",lineHeight:1}}>{v}</div>
                  <div style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.16em",color:"rgba(255,255,255,0.24)",marginTop:7,lineHeight:1.5}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Audit Widget */}
          <div id="audit-widget" style={{position:"relative"}} className="hidden lg:block">
            <div style={{position:"absolute",inset:-1,borderRadius:22,background:"linear-gradient(135deg,rgba(197,255,61,0.18),rgba(197,255,61,0.04),transparent)",pointerEvents:"none"}} />
            <div style={{position:"relative",borderRadius:20,background:"#0c0c0c",border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,0.55)"}}>
              {/* Terminal bar */}
              <div style={{display:"flex",alignItems:"center",gap:7,padding:"15px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.015)"}}>
                <span style={{width:12,height:12,borderRadius:"50%",background:"#FF5F57"}} />
                <span style={{width:12,height:12,borderRadius:"50%",background:"#FEBC2E"}} />
                <span style={{width:12,height:12,borderRadius:"50%",background:"#28C840"}} />
                <span style={{marginLeft:14,fontFamily:"monospace",fontSize:10,letterSpacing:"0.14em",color:"rgba(255,255,255,0.2)",textTransform:"uppercase"}}>crawlerque.com / audit</span>
              </div>

              <div style={{padding:30}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:20}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#C5FF3D"}} />
                  <span style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.18em",color:"#C5FF3D"}}>Free · No Signup Required</span>
                </div>

                <h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.025em",marginBottom:7,color:"white"}}>Audit any site now</h2>
                <p style={{fontSize:14,color:"rgba(255,255,255,0.32)",lineHeight:1.65,marginBottom:22}}>
                  Paste a URL. Get SEO score, Core Web Vitals, and a traffic estimate in about 90 seconds.
                </p>

                <div style={{marginBottom:12}}>
                  <input type="text" placeholder="https://yourclient.com" value={url}
                    onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAudit()}
                    style={{width:"100%",borderRadius:10,border:"1px solid rgba(255,255,255,0.09)",background:"#060606",padding:"14px 18px",fontFamily:"monospace",fontSize:13,color:"white",outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
                    onFocus={e=>(e.currentTarget.style.borderColor="rgba(197,255,61,0.38)")}
                    onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.09)")} />
                </div>
                <button onClick={handleAudit} disabled={loading} data-cursor=""
                  style={{width:"100%",background:loading?"rgba(197,255,61,0.65)":"#C5FF3D",color:"#000",borderRadius:10,padding:"14px",fontFamily:"monospace",fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.12em",border:"none",cursor:"none",transition:"background 0.2s"}}
                  onMouseEnter={e=>{if(!loading)e.currentTarget.style.background="white"}}
                  onMouseLeave={e=>{if(!loading)e.currentTarget.style.background="#C5FF3D"}}>
                  {loading ? "Running audit…" : "Run Free Audit →"}
                </button>

                {loading && (
                  <div style={{height:2,borderRadius:2,background:"rgba(255,255,255,0.05)",marginTop:14,overflow:"hidden"}}>
                    <div style={{height:"100%",background:"linear-gradient(90deg,#C5FF3D,transparent)",animation:"scan 1.5s linear infinite"}} />
                  </div>
                )}

                {result?.success && (
                  <div style={{marginTop:18,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{padding:"10px 16px",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <span style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.2)"}}>audit.result</span>
                    </div>
                    <div style={{padding:"4px 16px 14px"}}>
                      {[
                        ["Overall Score",  result.report?.overallScore],
                        ["SEO Score",      result.report?.seoScore],
                        ["Mobile Perf",    result.report?.mobilePerformance],
                        ["Desktop Perf",   result.report?.desktopPerformance],
                        ["Traffic Est.",   result.report?.traffic?.monthly ? `${Number(result.report.traffic.monthly).toLocaleString()}/mo` : "—"],
                      ].map(([lbl,val])=>(
                        <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.3)"}}>{lbl}</span>
                          <span style={{fontWeight:700,fontSize:14,color:"white"}}>{val ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{margin:"0 16px 16px",padding:16,borderRadius:9,border:"1px solid rgba(197,255,61,0.1)",background:"rgba(197,255,61,0.04)"}}>
                      <p style={{fontWeight:700,fontSize:14,marginBottom:5,color:"white"}}>Want the full 8-module report?</p>
                      <p style={{fontSize:12,color:"rgba(255,255,255,0.32)",lineHeight:1.65,marginBottom:14}}>Includes AI visibility, competitor gaps, backlink authority, and a client-ready white-label PDF.</p>
                      <div style={{display:"flex",gap:9}}>
                        <a href="/sample-report" style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.42)",textDecoration:"none",cursor:"none"}}>Sample report</a>
                        <a href="#pricing" style={{padding:"8px 16px",borderRadius:8,background:"#C5FF3D",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#000",fontWeight:800,textDecoration:"none",cursor:"none"}}>See plans →</a>
                      </div>
                    </div>
                  </div>
                )}

                {result && !result.success && (
                  <div style={{marginTop:14,padding:"13px 16px",borderRadius:10,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.07)",fontSize:13,color:"rgb(252,165,165)"}}>
                    {result.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee strip */}
      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid rgba(255,255,255,0.05)",overflow:"hidden",padding:"15px 0",background:"rgba(197,255,61,0.015)"}}>
        <div style={{display:"flex",gap:0,animation:"marquee 30s linear infinite",whiteSpace:"nowrap"}}>
          {[...Array(3)].map((_,i) => (
            <div key={i} style={{display:"flex",gap:0}}>
              {["SEO Intelligence","Traffic Modelling","Core Web Vitals","AI Visibility","Competitor Intel","Backlink Authority","White-label PDF","Keyword Gaps"].map(item => (
                <span key={item} style={{display:"inline-flex",alignItems:"center",gap:20,padding:"0 38px",fontFamily:"monospace",fontSize:11,textTransform:"uppercase",letterSpacing:"0.16em",color:"rgba(255,255,255,0.18)"}}>
                  <span style={{width:4,height:4,borderRadius:"50%",background:"#C5FF3D",display:"block",flexShrink:0}} />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════ MODULES ════════════════ */}
      <section id="modules" style={{padding:"100px 40px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:14}}>▮ Audit Modules</div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:24,marginBottom:56}}>
            {/* FIX: headline rewritten — no generic phrasing */}
            <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white"}}>
              Eight signals. One PDF.<br />Zero assembly required.
            </h2>
            <p style={{maxWidth:400,fontSize:15,lineHeight:1.75,color:"rgba(255,255,255,0.36)"}}>
              Each module runs independently and combines into a single branded report. Pick and choose which sections your client sees, or deliver all eight.
            </p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,0.05)",borderRadius:16,overflow:"hidden"}} className="md:grid-cols-3 grid-cols-1">
            {modules.map((mod, i) => (
              <div key={mod.name} data-cursor="view"
                style={{background:activeModule===i?"#0e1200":"#080808",padding:"34px 30px",cursor:"none",transition:"background 0.22s",position:"relative",overflow:"hidden"}}
                onMouseEnter={()=>setActiveModule(i)} onMouseLeave={()=>setActiveModule(-1)}>
                {activeModule===i && <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,#C5FF3D,transparent)"}} />}
                <div style={{display:"inline-block",border:"1px solid rgba(197,255,61,0.16)",borderRadius:4,padding:"4px 10px",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.2em",color:"rgba(197,255,61,0.55)",marginBottom:16}}>
                  {mod.tag}
                </div>
                <h3 style={{fontSize:16,fontWeight:800,letterSpacing:"-0.02em",color:"white",marginBottom:11,lineHeight:1.2}}>{mod.name}</h3>
                {/* FIX: module descriptions rewritten above — specific, not generic */}
                <p style={{fontSize:13,lineHeight:1.75,color:"rgba(255,255,255,0.32)",marginBottom:20}}>{mod.desc}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {mod.pills.map(pill => (
                    <span key={pill} style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:"3px 9px",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.2)"}}>
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ COMPARISON TABLE ════════════════ */}
      <section style={{padding:"100px 40px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:14}}>▮ How We Compare</div>
          {/* FIX: headline is concrete, not filler */}
          <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white",marginBottom:16}}>
            Same budget.<br />Half the price. One feature<br />nobody else has.
          </h2>
          <p style={{maxWidth:500,fontSize:15,lineHeight:1.75,color:"rgba(255,255,255,0.36)",marginBottom:56}}>
            SEMrush and Ahrefs are great at data. Neither exports a white-label PDF your client can read, and neither checks AI search visibility. Crawler Que does both — at $99/month instead of $229.
          </p>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",minWidth:600,borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",padding:"15px 22px",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(255,255,255,0.3)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>Feature</th>
                  {[{name:"Crawler Que",hi:true},{name:"SEMrush",hi:false},{name:"Ahrefs",hi:false}].map(col=>(
                    <th key={col.name} style={{padding:"15px 22px",fontFamily:"monospace",fontSize:11,textTransform:"uppercase",letterSpacing:"0.12em",color:col.hi?"#C5FF3D":"rgba(255,255,255,0.3)",borderBottom:col.hi?"1px solid rgba(197,255,61,0.2)":"1px solid rgba(255,255,255,0.06)",background:col.hi?"rgba(197,255,61,0.03)":"transparent",textAlign:"center"}}>
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["White-label PDF (your logo, your brand)","✓","Partial — export only","✗"],
                  ["AI search visibility (ChatGPT, Gemini, Perplexity)","✓","✗","✗"],
                  ["Client-ready report in under 90 seconds","✓","✗","✗"],
                  ["Modular — only show what's relevant","✓","✗","✗"],
                  ["Core Web Vitals + prioritised fixes","✓","✓","✓"],
                  ["Keyword gap analysis","✓","✓","✓"],
                  ["Competitor threat scoring","✓","Partial","Partial"],
                  ["Backlink authority audit","✓","✓","✓"],
                  ["Agency-tier price","$99/mo","$229/mo","$199/mo"],
                ].map(([feature,cq,sem,ah],i)=>(
                  <tr key={String(feature)} style={{background:i%2===0?"#080808":"#060606"}}>
                    <td style={{padding:"14px 22px",fontSize:14,color:"rgba(255,255,255,0.52)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{feature}</td>
                    <td style={{padding:"14px 22px",textAlign:"center",fontWeight:800,fontSize:14,color:"#C5FF3D",borderBottom:"1px solid rgba(197,255,61,0.08)",background:"rgba(197,255,61,0.025)"}}>{cq}</td>
                    <td style={{padding:"14px 22px",textAlign:"center",fontSize:13,color:"rgba(255,255,255,0.26)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{sem}</td>
                    <td style={{padding:"14px 22px",textAlign:"center",fontSize:13,color:"rgba(255,255,255,0.26)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{ah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ════════════════ PRICING ════════════════ */}
      {/* FIX: this section is also linked from /pricing (dedicated page) */}
      <section id="pricing" style={{padding:"100px 40px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:14}}>▮ Pricing</div>
          <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white",marginBottom:16}}>The PDF is the product.</h2>
          <p style={{maxWidth:500,fontSize:15,lineHeight:1.75,color:"rgba(255,255,255,0.36)",marginBottom:56}}>
            Every plan includes a 7-day free trial. No credit card required to start — pay only when you're ready to deliver your first client report.
          </p>

          {checkoutError && (
            <div style={{marginBottom:28,padding:"15px 20px",borderRadius:10,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.07)",fontSize:14,color:"rgb(252,165,165)"}}>
              {checkoutError}
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,0.05)",borderRadius:20,overflow:"hidden"}} className="md:grid-cols-3 grid-cols-1">
            {plans.map(plan => (
              <div key={plan.name} style={{position:"relative",display:"flex",flexDirection:"column",background:plan.popular?"#0d1300":"#080808",overflow:"hidden"}}>
                {plan.popular && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent 0%,#C5FF3D 50%,transparent 100%)"}} />}
                <div style={{padding:"38px 34px",flex:1}}>
                  {plan.popular && (
                    <div style={{display:"inline-flex",marginBottom:18,background:"rgba(197,255,61,0.1)",borderRadius:40,padding:"5px 15px",fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"#C5FF3D",fontWeight:700}}>
                      Most Popular
                    </div>
                  )}
                  <div style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",color:"rgba(255,255,255,0.3)",marginBottom:10}}>{plan.name}</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:10}}>
                    <span style={{fontSize:"clamp(3rem,5vw,4rem)",fontWeight:900,letterSpacing:"-0.05em",color:plan.popular?"#C5FF3D":"white",lineHeight:1}}>
                      {plan.price}
                    </span>
                    <span style={{fontFamily:"monospace",fontSize:12,color:"rgba(255,255,255,0.22)"}}>{plan.period}</span>
                  </div>
                  <p style={{fontSize:14,color:"rgba(255,255,255,0.33)",lineHeight:1.65,marginBottom:30}}>{plan.description}</p>

                  <ul style={{listStyle:"none",padding:0,margin:"0 0 26px",display:"flex",flexDirection:"column",gap:14}}>
                    {plan.features.map(f => (
                      <li key={f} style={{display:"flex",alignItems:"flex-start",gap:12,fontSize:14,color:"rgba(255,255,255,0.48)"}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:"#C5FF3D",flexShrink:0,marginTop:7}} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div style={{borderRadius:9,border:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.015)",padding:"14px 16px"}}>
                    <p style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.16em",color:"rgba(255,255,255,0.2)",marginBottom:6}}>What this means</p>
                    <p style={{fontSize:12,lineHeight:1.7,color:"rgba(255,255,255,0.32)"}}>
                      {plan.name==="Starter"     && "Covers 5 monthly retainer clients with 2 audits each. Enough to run a full SEO check every time you write their content calendar."}
                      {plan.name==="Agency"      && "40 audits: run two full 8-module reports per client for 20 active accounts. White-label means every PDF shows your agency name, not ours."}
                      {plan.name==="Enterprise"  && "150 audits for agencies billing at scale. Priority support means a real person responds within 4 hours, not a bot."}
                    </p>
                  </div>
                </div>

                <div style={{padding:"0 34px 34px"}}>
                  {/* FIX: plan CTAs → handleChoosePlan (checkout flow), not anchor links */}
                  <button onClick={() => handleChoosePlan(plan.priceId, plan.name)}
                    disabled={checkoutLoading===plan.name}
                    data-cursor={plan.popular?"start":""}
                    style={{width:"100%",borderRadius:10,padding:"15px",fontFamily:"monospace",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.12em",border:plan.popular?"none":"1px solid rgba(255,255,255,0.1)",cursor:"none",transition:"background 0.2s, border-color 0.2s, color 0.2s",opacity:checkoutLoading===plan.name?0.5:1,
                      background:plan.popular?"#C5FF3D":"transparent",
                      color:plan.popular?"#000":"rgba(255,255,255,0.48)"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=plan.popular?"white":"rgba(255,255,255,0.05)"; if(!plan.popular)(e.currentTarget.style.color="white");}}
                    onMouseLeave={e=>{e.currentTarget.style.background=plan.popular?"#C5FF3D":"transparent"; if(!plan.popular)(e.currentTarget.style.color="rgba(255,255,255,0.48)");}}>
                    {checkoutLoading===plan.name ? "Redirecting…" : plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p style={{marginTop:22,textAlign:"center",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.18)"}}>
            7-day free trial · Cancel any time · Payments via Stripe
          </p>
        </div>
      </section>

      {/* ════════════════ ROI CALCULATOR ════════════════ */}
      <section style={{padding:"100px 40px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:14}}>▮ ROI Calculator</div>
          {/* FIX: headline rewritten — direct question with real numbers */}
          <h2 style={{fontSize:"clamp(2rem,4vw,3.2rem)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:0.95,color:"white",marginBottom:16}}>
            One client report<br />pays for the whole month.
          </h2>
          <p style={{maxWidth:500,fontSize:15,lineHeight:1.75,color:"rgba(255,255,255,0.36)",marginBottom:56}}>
            Most agencies charge $150–$500 for a site audit. At that rate, Crawler Que pays for itself on the first report of the month — every month.
          </p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}} className="md:grid-cols-3 grid-cols-1">
            {[
              {plan:"Starter",   price:49,  charge:150, clients:5},
              {plan:"Agency",    price:99,  charge:300, clients:15},
              {plan:"Enterprise",price:299, charge:500, clients:40},
            ].map(row => {
              const revenue = row.charge * row.clients;
              const profit  = revenue - row.price;
              return (
                <div key={row.plan}
                  style={{borderRadius:16,border:"1px solid rgba(255,255,255,0.06)",background:"#0a0a0a",padding:30,transition:"border-color 0.25s"}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(197,255,61,0.14)")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.06)")}>
                  <div style={{fontFamily:"monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.2em",color:"rgba(197,255,61,0.5)",marginBottom:22}}>{row.plan} · ${row.price}/mo</div>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {[
                      ["Charge per audit",    `$${row.charge}`],
                      ["Clients this month",  `${row.clients}`],
                      ["Revenue generated",   `$${revenue.toLocaleString()}`],
                      ["Platform cost",       `-$${row.price}`],
                    ].map(([lbl,val],i)=>(
                      <div key={lbl} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        <span style={{fontSize:13,color:"rgba(255,255,255,0.36)"}}>{lbl}</span>
                        <span style={{fontWeight:700,fontSize:14,color:i===3?"rgba(239,68,68,0.68)":"white"}}>{val}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:18,marginTop:4}}>
                      <span style={{fontSize:14,fontWeight:700,color:"white"}}>Net profit</span>
                      <span style={{fontSize:24,fontWeight:900,letterSpacing:"-0.04em",color:"#C5FF3D"}}>${profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{marginTop:22,textAlign:"center",fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(255,255,255,0.16)"}}>Based on typical agency pricing. Your rates may vary.</p>
        </div>
      </section>

      {/* ════════════════ CTA ════════════════ */}
      <section style={{position:"relative",overflow:"hidden",padding:"120px 40px",textAlign:"center"}}>
        <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:640,height:640,borderRadius:"50%",background:"radial-gradient(circle,rgba(197,255,61,0.06) 0%,transparent 70%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)",backgroundSize:"64px 64px",pointerEvents:"none"}} />
        <div style={{position:"relative",maxWidth:640,margin:"0 auto"}}>
          <div style={{fontFamily:"monospace",fontSize:10,textTransform:"uppercase",letterSpacing:"0.28em",color:"#C5FF3D",marginBottom:22}}>▮ Get Started Today</div>
          {/* FIX: CTA copy — specific promise, not platitude */}
          <h2 style={{fontSize:"clamp(2.4rem,5.5vw,4.5rem)",fontWeight:900,letterSpacing:"-0.045em",lineHeight:0.92,marginBottom:26,color:"white"}}>
            Your next client report<br />
            <span style={{background:"linear-gradient(135deg,#C5FF3D 0%,#a8e832 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              takes 90 seconds.
            </span>
          </h2>
          <p style={{fontSize:16,lineHeight:1.75,color:"rgba(255,255,255,0.36)",maxWidth:440,margin:"0 auto 44px"}}>
            Paste a URL. Get a full audit. Export a white-label PDF with your agency logo. No exports to clean up, no spreadsheets to format. First audit is free — no account needed.
          </p>
          <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            {/* FIX: "Run a Free Audit" scrolls to widget / runs audit */}
            <button onClick={() => document.getElementById("audit-widget")?.scrollIntoView({behavior:"smooth"})}
              data-cursor="audit"
              style={{background:"#C5FF3D",color:"#000",padding:"17px 38px",borderRadius:12,fontFamily:"monospace",fontSize:12,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",border:"none",cursor:"none",transition:"background 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="white"}}
              onMouseLeave={e=>{e.currentTarget.style.background="#C5FF3D"}}>
              Run a Free Audit
            </button>
            {/* FIX: "See Plans" → #pricing (on-page anchor, visually distinct from Get Started → /signup) */}
            <a href="#pricing" data-cursor="plans"
              style={{padding:"17px 38px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",fontFamily:"monospace",fontSize:12,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.36)",textDecoration:"none",cursor:"none",transition:"border-color 0.2s, color 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,0.22)"}}
              onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.36)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}}>
              See Plans
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER (shared — in production, lives in app/layout.tsx) ── */}
      <SiteFooter />

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes marquee{ from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes scan   { from{transform:translateX(-100%)} to{transform:translateX(400%)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        @media (prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} }
      `}</style>
    </main>
  );
}

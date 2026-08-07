// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Braces,
  Check,
  ChevronDown,
  FileChartColumnIncreasing,
  FileSearch,
  Gauge,
  Globe2,
  KeyRound,
  Layers3,
  Link2,
  ListChecks,
  Radar,
  Rocket,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/site-shell";
import { APPROVED_TESTIMONIALS } from "@/lib/testimonials";
import { Testimonials3DCarousel } from "@/components/testimonials-3d-carousel";

const TRIAL_PLAN = {
  name: "Trial",
  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TRIAL || "",
};

const PLANS = [
  {
    name: "Starter",
    priceMonthly: 30,
    priceAnnual: 300,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || "",
    desc: "For freelancers, consultants, and growing websites.",
    features: [
      "7 full audits per month",
      "All 12 growth modules",
      "Branded PDF export",
      "30-day report history",
      "1 user seat",
    ],
    usage: "A focused plan for regular website reviews and client-ready recommendations.",
    badge: null,
  },
  {
    name: "Agency",
    priceMonthly: 99,
    priceAnnual: 990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "",
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL || "",
    desc: "For agencies managing multiple websites and client reports.",
    features: [
      "40 full audits per month",
      "All 12 growth modules",
      "White-label PDF reports",
      "Comparison reports",
      "90-day report history",
      "3 user seats",
    ],
    usage: "Built for recurring audits, stronger client conversations, and branded delivery.",
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    priceMonthly: 299,
    priceAnnual: 2990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || "",
    desc: "For high-volume teams, consultancies, and custom workflows.",
    features: [
      "150 full audits per month",
      "All 12 growth modules",
      "White-label PDF reports",
      "Priority support",
      "Unlimited report history",
      "10 user seats",
    ],
    usage: "A scalable option for large client portfolios and advanced reporting operations.",
    badge: null,
  },
];

const MODULES = [
  {
    id: "seo-intelligence",
    number: "01",
    name: "SEO Intelligence",
    Icon: Search,
    short: "Understand the core SEO signals that help search engines discover, interpret, and rank a website.",
    hover: ["Titles and metadata", "Heading structure", "Crawlability and indexing"],
    checks: [
      "Page title quality, uniqueness, and keyword relevance",
      "Meta description quality and missing metadata",
      "Heading structure from H1 through H6",
      "Image ALT text coverage",
      "Crawlability and indexing signals",
      "Structured-data and schema signals",
    ],
    output: "A clear SEO foundation score with prioritized issues and recommended fixes.",
    learnMore: {
      href: "/blog/what-is-an-ai-website-audit-tool-and-why-your-seo-stack-needs-one-in-2026",
      label: "What is an AI website audit tool?",
    },
    badge: "Best starting point",
  },
  {
    id: "technical-seo",
    number: "02",
    name: "Technical SEO Audit",
    Icon: FileSearch,
    short: "Find site-health problems that can block crawling, indexing, rankings, and user experience.",
    hover: ["Broken links", "Response codes", "Duplicate technical signals"],
    checks: [
      "Broken internal and external links",
      "HTTP response codes and redirect issues",
      "Duplicate titles and canonical conflicts",
      "Crawl depth and orphan-page signals",
      "Missing or duplicate metadata",
      "Page-level technical problems",
    ],
    output: "A technical issue inventory ranked by severity, impact, and the team that should resolve it.",
    learnMore: {
      href: "/blog/the-2026-technical-seo-audit-checklist-25-checks-every-website-needs-before-it-can-rank",
      label: "See the full 2026 technical SEO audit checklist",
    },
    badge: "Best for deep audits",
  },
  {
    id: "on-page-signals",
    number: "03",
    name: "On-Page Signals",
    Icon: Braces,
    short: "Evaluate the elements on each page that influence relevance, visibility, and click-through performance.",
    hover: ["Content structure", "Page relevance", "Search presentation"],
    checks: [
      "Title, description, and heading alignment",
      "Keyword use and topical relevance",
      "Internal-linking signals",
      "Image accessibility signals",
      "Page content structure",
      "Search-result presentation opportunities",
    ],
    output: "A page-level view of what is helping or weakening organic visibility.",
  },
  {
    id: "core-web-vitals",
    number: "04",
    name: "Core Web Vitals Checker",
    Icon: Gauge,
    short: "Measure mobile and desktop speed, stability, and responsiveness using user-experience metrics.",
    hover: ["LCP", "CLS", "FCP, TBT and Speed Index"],
    checks: [
      "Mobile and desktop PageSpeed scores",
      "Largest Contentful Paint",
      "Cumulative Layout Shift",
      "First Contentful Paint",
      "Total Blocking Time",
      "Speed Index and performance opportunities",
    ],
    output: "A performance score with the fixes most likely to improve UX, rankings, and conversion readiness.",
    learnMore: {
      href: "/blog/core-web-vitals-in-2026-what-they-are-why-they-still-matter-and-how-to-fix-them-fast",
      label: "How to fix Core Web Vitals in 2026",
    },
  },
  {
    id: "traffic-intelligence",
    number: "05",
    name: "Traffic Intelligence",
    Icon: TrendingUp,
    short: "Estimate organic visibility from ranked keywords, search demand, and position-based CTR modelling.",
    hover: ["Estimated visits", "Keyword footprint", "Confidence scoring"],
    checks: [
      "Estimated monthly organic visits",
      "Estimated daily organic visits",
      "Ranked keyword footprint",
      "Top traffic-driving keywords",
      "Top organic landing pages",
      "Confidence label based on available data",
    ],
    output: "Directional traffic intelligence with transparent confidence labels, not a replacement for analytics data.",
    learnMore: {
      href: "/blog/how-to-estimate-your-websites-organic-traffic-without-google-analytics-access",
      label: "How we estimate organic traffic",
    },
  },
  {
    id: "keyword-opportunities",
    number: "06",
    name: "Keyword Opportunities",
    Icon: KeyRound,
    short: "Find high-value keywords, missing topics, and content opportunities that can expand organic reach.",
    hover: ["Search volume", "Intent and CPC", "Missing keyword gaps"],
    checks: [
      "Current ranking keywords",
      "Search volume and CPC signals",
      "Commercial and informational intent",
      "Keyword difficulty and opportunity scoring",
      "Competitor keyword gaps",
      "Recommended page types and content clusters",
    ],
    output: "A prioritized keyword opportunity list that connects search demand to practical page and content ideas.",
  },
  {
    id: "serp-rankings",
    number: "07",
    name: "SERP Rank Tracker",
    Icon: BarChart3,
    short: "Track live ranking positions and understand where important keywords appear in search results.",
    hover: ["Current position", "Ranking URL", "Found vs. not found"],
    checks: [
      "Live Google ranking position",
      "Ranking URL for each keyword",
      "Keywords found and not found",
      "Average ranking position",
      "Position-change monitoring",
      "SERP visibility by tracked keyword",
    ],
    output: "A clean ranking view for monitoring movement and identifying pages that need support.",
  },
  {
    id: "competitor-intelligence",
    number: "08",
    name: "Competitor Intelligence",
    Icon: Swords,
    short: "See which competitors capture the same audience and why they may be outperforming the audited website.",
    hover: ["Shared keywords", "Threat score", "Winning factors"],
    checks: [
      "Organic competitor discovery",
      "Shared keyword overlap",
      "Estimated competitor traffic",
      "Competitive threat score",
      "Likely winning factors",
      "Content and authority gaps",
    ],
    output: "A competitor benchmark that turns market overlap into clear opportunities and defensive priorities.",
    learnMore: {
      href: "/blog/ai-competitor-visibility-analysis",
      label: "See how AI competitor visibility analysis works",
    },
  },
  {
    id: "backlink-authority",
    number: "09",
    name: "Backlink Checker",
    Icon: Link2,
    short: "Evaluate domain authority, referring sources, and backlink quality signals that support trust and rankings.",
    hover: ["Referring domains", "Top backlinks", "Authority signals"],
    checks: [
      "Total backlinks",
      "Referring domains and referring pages",
      "Backlink rank and authority signals",
      "Top link sources",
      "Anchor-text samples",
      "Authority gap opportunities",
    ],
    output: "A practical authority snapshot showing where trust is strong and where link acquisition is needed.",
  },
  {
    id: "content-quality",
    number: "10",
    name: "Content Quality",
    Icon: FileChartColumnIncreasing,
    short: "Assess content depth, relevance, topic coverage, and the pages that need stronger search and user value.",
    hover: ["Content depth", "Topic relevance", "Content opportunities"],
    checks: [
      "Content length and depth",
      "Main-topic relevance",
      "Metadata alignment",
      "Content opportunity gaps",
      "Supporting-page opportunities",
      "Engagement and readability signals",
    ],
    output: "A content-quality view that connects weak pages with specific improvement opportunities.",
  },
  {
    id: "ai-search-visibility",
    number: "11",
    name: "AI Search Visibility",
    Icon: Bot,
    short: "See whether ChatGPT, Claude, and Gemini know, mention, cite, and recommend a brand.",
    hover: ["Brand mentions", "Cited pages", "Missed prompts and GEO readiness"],
    checks: [
      "Brand recognition by model",
      "Buyer-intent prompt visibility",
      "Brand and competitor mentions",
      "Cited website pages",
      "Missed prompt opportunities",
      "GEO and AI citation readiness",
    ],
    output: "A model-by-model AI visibility score with brand, competitor, citation, and missed-opportunity insights.",
    learnMore: {
      href: "/blog/ai-search-visibility-explained-how-to-find-out-if-chatgpt-recommends-your-brand",
      label: "Learn how AI search visibility works",
    },
  },
  {
    id: "recommendations-roadmap",
    number: "12",
    name: "Recommendations & Roadmap",
    Icon: Route,
    short: "Turn every finding into a prioritized action plan with impact, owner, timing, and next steps.",
    hover: ["Quick wins", "Recommended owner", "30/60/90-day roadmap"],
    checks: [
      "High-impact recommendations",
      "Quick wins and longer-term priorities",
      "Recommended action owner",
      "Suggested completion timeline",
      "Impact and effort context",
      "30/60/90-day execution roadmap",
    ],
    output: "A clear growth plan designed for business owners, marketers, SEO teams, consultants, and agencies.",
  },
];

const MODULE_VISUALS = {
  "seo-intelligence": { accent: "#18E3D0", glow: "24,227,208" },
  "technical-seo": { accent: "#18E3D0", glow: "24,227,208" },
  "on-page-signals": { accent: "#18E3D0", glow: "24,227,208" },
  "core-web-vitals": { accent: "#18E3D0", glow: "24,227,208" },
  "traffic-intelligence": { accent: "#18E3D0", glow: "24,227,208" },
  "keyword-opportunities": { accent: "#18E3D0", glow: "24,227,208" },
  "serp-rankings": { accent: "#18E3D0", glow: "24,227,208" },
  "competitor-intelligence": { accent: "#18E3D0", glow: "24,227,208" },
  "backlink-authority": { accent: "#18E3D0", glow: "24,227,208" },
  "content-quality": { accent: "#18E3D0", glow: "24,227,208" },
  "ai-search-visibility": { accent: "#18E3D0", glow: "24,227,208" },
  "recommendations-roadmap": { accent: "#18E3D0", glow: "24,227,208" },
};

const DELIVERABLES = [
  {
    Icon: Radar,
    title: "Insight",
    text: "Clear findings that explain what is happening and why it matters.",
  },
  {
    Icon: Target,
    title: "Score",
    text: "A measurable benchmark for tracking health and improvement over time.",
  },
  {
    Icon: Layers3,
    title: "Priority",
    text: "High, medium, and low priorities based on likely business impact.",
  },
  {
    Icon: Zap,
    title: "Next Action",
    text: "Specific steps that tell the right person what should happen next.",
  },
];

const SCREENSHOTS = [
  {
    src: "/screenshots/dashboard-1.png",
    caption: "See scores, issues, opportunities, and priorities in one dashboard.",
  },
  {
    src: "/screenshots/dashboard-2.png",
    caption: "Review brand visibility across AI search experiences.",
  },
  {
    src: "/screenshots/dashboard-3.png",
    caption: "Inspect technical SEO, crawl findings, and Core Web Vitals.",
  },
  {
    src: "/screenshots/dashboard-4.png",
    caption: "Turn findings into action cards with owner, impact, and timeline.",
  },
];

function HeroDashboardPreview() {
  const sidebarItems = [
    ["Overview", BarChart3],
    ["AI Modules", Bot],
    ["SEO Intelligence", Search],
    ["SERP Rankings", TrendingUp],
    ["Organic Intelligence", Radar],
    ["Backlink Authority", Link2],
    ["Technical SEO Audit", FileSearch],
    ["Content Quality", FileChartColumnIncreasing],
  ];

  return (
    <div className="cq-reference-dashboard-stage relative">
      <div className="cq-reference-dashboard-shell relative overflow-hidden rounded-[24px] border border-cyan-300/45 bg-[#071625] p-3 shadow-[0_35px_100px_rgba(0,0,0,.52),0_0_55px_rgba(24,227,208,.14)] md:p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,rgba(24,227,208,.10),transparent_32%),linear-gradient(145deg,rgba(12,34,56,.98),rgba(7,22,37,.99))]" />
        <div className="absolute inset-x-14 bottom-0 h-16 bg-cyan-400/10 blur-3xl" />

        <div className="relative flex items-center justify-between border-b border-white/8 px-1 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/90" />
          </div>
          <span className="font-mono text-[9px] text-slate-500">crawlerque.com/dashboard</span>
          <span className="font-mono text-[9px] font-semibold tracking-[0.08em] text-cyan-300">LIVE AUDIT VIEW</span>
        </div>

        <div className="relative mt-3 grid min-h-[430px] overflow-hidden rounded-2xl border border-white/8 bg-[#061321]/94 lg:grid-cols-[132px_1fr]">
          <aside className="hidden border-r border-white/8 bg-[#06111f]/88 p-3 lg:block">
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/8 bg-[#0c2238] px-2 py-2">
              <img src="/logo-icon.png" alt="" className="h-5 w-5 object-contain" />
              <span className="text-[9px] font-bold text-white">Crawler Que</span>
            </div>
            <div className="space-y-1">
              {sidebarItems.map(([label, Icon], index) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-md px-2 py-[7px] text-[8px] ${
                    index === 0
                      ? "bg-cyan-400/12 text-cyan-300"
                      : "text-slate-500"
                  }`}
                >
                  <Icon className="h-3 w-3" strokeWidth={2} />
                  {label}
                </div>
              ))}
            </div>
          </aside>

          <div className="p-3 md:p-4">
            <div className="grid gap-3 md:grid-cols-[.86fr_1.14fr]">
              <div className="rounded-xl border border-white/8 bg-[#0c2238]/92 p-4">
                <p className="font-mono text-[8px] uppercase tracking-[0.07em] text-slate-500">Overall Growth Score</p>
                <div className="mt-4 flex justify-center">
                  <div
                    className="grid h-28 w-28 place-items-center rounded-full p-[8px] shadow-[0_0_28px_rgba(0,220,210,.18)]"
                    style={{
                      background: "conic-gradient(#13e0d0 0deg 309deg, rgba(255,255,255,.07) 309deg 360deg)",
                    }}
                  >
                    <div className="grid h-full w-full place-items-center rounded-full bg-[#0b2036] text-center">
                      <div>
                        <span className="text-[34px] font-extrabold text-white">86</span>
                        <span className="text-[9px] text-slate-500">/100</span>
                        <p className="mt-1 text-[9px] font-semibold text-cyan-300">Excellent</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-center font-mono text-[8px] text-cyan-300">+24% vs last 30 days</p>
              </div>

              <div className="rounded-xl border border-white/8 bg-[#0c2238]/92 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[8px] uppercase tracking-[0.07em] text-slate-500">Top Priorities</p>
                  <span className="rounded-full bg-cyan-300/10 px-2 py-1 font-mono text-[7px] text-cyan-300">4 OPEN</span>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    ["Fix 404 pages", "High", "text-red-300"],
                    ["Improve LCP", "High", "text-red-300"],
                    ["Optimize meta titles", "Medium", "text-amber-300"],
                    ["Build topical authority", "Medium", "text-amber-300"],
                  ].map(([label, priority, color], index) => (
                    <div key={label} className="flex items-center justify-between border-b border-white/6 pb-2 text-[8px] last:border-0">
                      <span className="text-slate-300">{index + 1}. {label}</span>
                      <span className={`font-semibold ${color}`}>{priority}</span>
                    </div>
                  ))}
                </div>
                <button type="button" className="mt-3 w-full rounded-md border border-white/8 bg-[#071625] py-2 text-[8px] font-semibold text-slate-300">
                  View roadmap
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                ["Total Issues", "12,842", "-18.7%"],
                ["Fixed Issues", "1,248", "+24.5%"],
                ["New Issues", "643", "-8.1%"],
                ["Traffic Potential", "+38%", "High"],
              ].map(([label, value, sub]) => (
                <div key={label} className="rounded-lg border border-white/8 bg-[#0c2238]/92 p-3">
                  <p className="font-mono text-[6.5px] uppercase tracking-[0.05em] text-slate-500">{label}</p>
                  <p className="mt-1 text-[15px] font-extrabold text-white">{value}</p>
                  <p className="mt-1 text-[7px] font-semibold text-cyan-300">{sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-white/8 bg-[#0c2238]/92 p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[8px] uppercase tracking-[0.07em] text-slate-500">Visibility Trend</p>
                <span className="rounded-md border border-white/8 px-2 py-1 text-[7px] text-slate-500">Last 6 months</span>
              </div>
              <div className="relative mt-4 h-24 overflow-hidden rounded-lg bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:34px_24px]">
                <svg viewBox="0 0 500 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cqHeroArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#18e3d0" stopOpacity=".26" />
                      <stop offset="100%" stopColor="#18e3d0" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,82 C55,78 78,65 118,70 C164,76 184,48 226,56 C270,64 292,36 338,44 C387,53 414,26 500,18 L500,100 L0,100 Z" fill="url(#cqHeroArea)" />
                  <path className="cq-dashboard-line" d="M0,82 C55,78 78,65 118,70 C164,76 184,48 226,56 C270,64 292,36 338,44 C387,53 414,26 500,18" fill="none" stroke="#19e2d0" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="cq-reference-dashboard-pedestal mx-auto h-9 w-[88%] rounded-b-[55%] border-x border-b border-cyan-300/45 bg-[linear-gradient(180deg,rgba(24,227,208,.16),rgba(24,227,208,.04))] shadow-[0_16px_35px_rgba(24,227,208,.14),0_0_30px_rgba(24,227,208,.16)]" />
    </div>
  );
}

function ModuleExplorer({ module, open, onToggle }) {
  const Icon = module.Icon;
  const visual = MODULE_VISUALS[module.id] || MODULE_VISUALS["seo-intelligence"];
const [hovered, setHovered] = useState(false);

const previewVisible =
  hovered && !open;

const handlePointerEnter = (event) => {
  if (event.pointerType === "mouse") {
    setHovered(true);
  }
};

const handlePointerLeave = () => {
  setHovered(false);
};

  return (
    <article
      className={`cq-reference-module relative overflow-hidden rounded-2xl border bg-[#0c2238]/92 transition-all duration-300 ${
        open || hovered
          ? "-translate-y-1 border-[var(--module-accent)] shadow-[0_24px_80px_rgba(var(--module-glow),.17),0_0_30px_rgba(var(--module-glow),.1)]"
          : "border-white/8 hover:border-white/14"
      }`}
      style={{
        "--module-accent": visual.accent,
        "--module-glow": visual.glow,
      }}
onPointerEnter={handlePointerEnter}
onPointerLeave={handlePointerLeave}
data-module-id={module.id}
data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        onClick={() => {
  setHovered(false);
  onToggle();
}}
        aria-expanded={open}
        aria-controls={`module-details-${module.id}`}
        className="w-full p-4 text-left md:p-5"
      >
        <div className="flex items-start gap-4">
          <div className="cq-reference-module-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-[var(--module-accent)]">
            <Icon className="h-6 w-6" strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-[var(--module-accent)]">{module.number}</span>
              <h3 className="text-[16px] font-extrabold text-white">{module.name}</h3>
            </div>
            <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-slate-400">{module.short}</p>
          </div>

          <span className="hidden shrink-0 items-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:border-[var(--module-accent)] hover:text-[var(--module-accent)] sm:inline-flex">
            {open ? "Close details" : "Explore module"}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </div>

        {module.badge && (
          <div className="mt-3 inline-flex rounded-md border border-[var(--module-accent)]/25 bg-[color-mix(in_srgb,var(--module-accent)_12%,transparent)] px-3 py-1 font-mono text-[10px] font-semibold text-[var(--module-accent)]">
            {module.badge} →
          </div>
        )}
      </button>

      <div
  aria-hidden={!previewVisible}
  className={`grid transition-[grid-template-rows,opacity] duration-[350ms] ease-out ${
    previewVisible
      ? "grid-rows-[1fr] opacity-100"
      : "pointer-events-none grid-rows-[0fr] opacity-0"
  }`}
>
        <div className="overflow-hidden">
          <div className="mx-4 mb-4 grid gap-4 rounded-xl border border-white/8 bg-[#071625]/88 p-4 md:mx-5 md:grid-cols-[1fr_150px]">
            <div>
              <p className="text-[12px] font-semibold text-white">{module.name} checks:</p>
              <div className="mt-3 space-y-2">
                {module.hover.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[12px] text-slate-300">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--module-accent)] text-[#05121e] shadow-[0_0_12px_rgba(var(--module-glow),.48)]">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[9px] text-slate-500">Click the card to reveal every check and the final output.</p>
            </div>

            <div className="cq-reference-module-visual relative hidden min-h-[120px] place-items-center md:grid">
              <div className="absolute bottom-3 h-5 w-28 rounded-[50%] bg-[var(--module-accent)]/24 blur-xl" />
              <div className="relative grid h-20 w-24 place-items-center rounded-xl border border-[var(--module-accent)]/40 bg-[linear-gradient(145deg,rgba(22,54,91,.98),rgba(6,19,33,.98))] shadow-[0_18px_38px_rgba(var(--module-glow),.22),0_0_24px_rgba(var(--module-glow),.12)]">
                <Icon className="h-9 w-9 text-[var(--module-accent)] drop-shadow-[0_0_12px_rgba(var(--module-glow),.7)]" strokeWidth={1.8} />
              </div>
              <div className="absolute bottom-1 h-3 w-28 rounded-[50%] border border-[var(--module-accent)]/30 bg-[var(--module-accent)]/8" />
            </div>
          </div>
        </div>
      </div>

<div
  id={`module-details-${module.id}`}
  aria-hidden={!open}
  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
    open
      ? "grid-rows-[1fr] opacity-100"
      : "pointer-events-none grid-rows-[0fr] opacity-0"
  }`}
>
        <div className="overflow-hidden">
          <div className="border-t border-white/8 bg-[#071625]/92 px-4 pb-5 pt-5 md:px-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_.72fr]">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--module-accent)]">What this module audits</p>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {module.checks.map((check) => (
                    <div key={check} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--module-accent)] text-[#05121e] shadow-[0_0_12px_rgba(var(--module-glow),.35)]">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      <span className="text-[12px] leading-5 text-slate-300">{check}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--module-accent)]/20 bg-[#0c2238]/88 p-4">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--module-accent)]">
                  What you receive
                </p>

                {module.id === "recommendations-roadmap" ? (
                  <p className="mt-3 text-[13px] leading-6 text-slate-200">
                    A clear growth plan designed for business owners, marketers, {" "}
                    <Link href="/for-seo-teams" className="font-semibold text-[var(--module-accent)] hover:underline">
                      SEO teams
                    </Link>
                    , {" "}
                    <Link href="/for-consultants" className="font-semibold text-[var(--module-accent)] hover:underline">
                      consultants
                    </Link>
                    , and {" "}
                    <Link href="/for-agencies" className="font-semibold text-[var(--module-accent)] hover:underline">
                      agencies
                    </Link>
                    .
                  </p>
                ) : (
                  <p className="mt-3 text-[13px] leading-6 text-slate-200">
                    {module.output}
                  </p>
                )}

                {module.learnMore && (
                  <Link
                    href={module.learnMore.href}
                    className="mt-4 inline-flex text-[11px] font-semibold text-[var(--module-accent)] hover:underline"
                  >
                    {module.learnMore.label} →
                  </Link>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/sample-report" className="cq-btn cq-btn--ghost !px-4 !py-2 !text-xs">
                    View sample report
                  </Link>
                  <a href="#pricing" className="cq-btn cq-btn--primary !px-4 !py-2 !text-xs">
                    Start trial
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [billing, setBilling] = useState("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [openModule, setOpenModule] = useState("");
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [paused, setPaused] = useState(false);
  const modulesSectionRef = useRef(null);
  const featuredTestimonials = APPROVED_TESTIMONIALS.slice(0, 3);

  const currentScreenshot = useMemo(
    () => SCREENSHOTS[activeScreenshot],
    [activeScreenshot]
  );

useEffect(() => {
  const closeOpenModule = (event) => {
    if (!openModule) return;

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const clickedModuleCard = target.closest(
      "[data-module-id]"
    );

    const clickedModuleId =
      clickedModuleCard?.getAttribute(
        "data-module-id"
      );

    if (clickedModuleId !== openModule) {
      setOpenModule("");
    }
  };

  const closeWithEscape = (event) => {
    if (event.key === "Escape") {
      setOpenModule("");
    }
  };

  document.addEventListener(
    "pointerdown",
    closeOpenModule
  );

  document.addEventListener(
    "keydown",
    closeWithEscape
  );

  return () => {
    document.removeEventListener(
      "pointerdown",
      closeOpenModule
    );

    document.removeEventListener(
      "keydown",
      closeWithEscape
    );
  };
}, [openModule]);

  useEffect(() => {
    if (paused || SCREENSHOTS.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveScreenshot((current) => (current + 1) % SCREENSHOTS.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [paused]);

  const handleStartTrial = async () => {
    if (!TRIAL_PLAN.priceId) {
      setCheckoutError("Trial is not configured. Please contact support.");
      return;
    }

    setCheckoutLoading("Trial");
    setCheckoutError("");

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: TRIAL_PLAN.priceId,
          packageName: TRIAL_PLAN.name,
        }),
      });

      const json = await response.json();

      if (json?.url) {
        window.location.href = json.url;
        return;
      }

      setCheckoutError(json?.error || "Failed to start checkout.");
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleChoosePlan = async (plan) => {
    const priceId = billing === "annual" ? plan.priceIdAnnual : plan.priceId;

    if (!priceId) {
      setCheckoutError("Plan is not configured. Please contact support.");
      return;
    }

    setCheckoutLoading(plan.name);
    setCheckoutError("");

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, packageName: plan.name }),
      });

      const json = await response.json();

      if (json?.url) {
        window.location.href = json.url;
        return;
      }

      setCheckoutError(json?.error || "Failed to start checkout.");
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <main className="cq-reference-home min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />

      <section className="cq-reference-hero relative overflow-hidden border-b border-white/6 px-4 pb-16 pt-12 md:px-6 md:pb-20 md:pt-16 xl:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_95%)]" />
          <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-cyan-400/8 blur-[120px]" />
          <div className="absolute right-0 top-0 h-[430px] w-[430px] rounded-full bg-cyan-300/[0.07] blur-[130px]" />
        </div>

        <div className="mx-auto grid w-full max-w-[1800px] items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-8">
          <div>
<div className="inline-flex items-center gap-2 rounded-lg border border-[#18E3D0]/30 bg-[#18E3D0]/[0.07] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#18E3D0]">
  <Sparkles className="h-3.5 w-3.5 text-[#18E3D0]" />
  AI-powered SEO audit and website growth intelligence
</div>

<h1 className="mt-6 max-w-[760px] text-[clamp(3rem,5.4vw,5.35rem)] font-extrabold leading-[.98] tracking-[-0.045em] text-white">
  SEO Audit Tool With
  <span className="mt-2 block text-[#18E3D0]">
    AI Visibility Built In.
  </span>
</h1>

            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-slate-300">
              Find technical SEO issues, Core Web Vitals, ranking opportunities, competitor gaps, backlinks, content weaknesses, and brand visibility across ChatGPT, Claude, and Gemini then turn every finding into a prioritized growth plan.
            </p>

            <div className="mt-10 grid max-w-2xl gap-0 sm:grid-cols-3">
              {[
  {
    Icon: Layers3,
    title: "Complete Audit Coverage",
    text: "See the search, technical, content, authority, and AI signals shaping growth.",
    accent: "#18E3D0",
    glow: "24,227,208",
  },
  {
    Icon: Target,
    title: "Actionable Insights",
    text: "Clear findings with priorities, ownership, and next steps.",
    accent: "#18E3D0",
    glow: "24,227,208",
  },
  {
    Icon: Zap,
    title: "Built for Results",
    text: "Move from audit data to a focused growth roadmap.",
    accent: "#18E3D0",
    glow: "24,227,208",
  },
].map(({ Icon, title, text, accent, glow }, index) => (
                <div key={title} className={`py-2 pr-5 ${index > 0 ? "border-l border-white/8 pl-5" : ""}`}>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg border"
                    style={{
                      color: accent,
                      borderColor: `rgba(${glow},.32)`,
                      background: `linear-gradient(145deg,rgba(${glow},.18),rgba(6,19,33,.96))`,
                      boxShadow: `0 0 24px rgba(${glow},.18)`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-[14px] font-extrabold text-white">{title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[960px] lg:ml-auto">
            <div className="absolute -inset-12 rounded-[60px] bg-[#18E3D0]/[0.06] blur-3xl" />
            <HeroDashboardPreview />
          </div>
        </div>
      </section>

      <section ref={modulesSectionRef} id="modules" className="cq-reference-modules border-b border-white/6 px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-[1800px]">
          <div className="flex flex-wrap items-end justify-between gap-5">
<div className="max-w-3xl">
  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-300">
    The 12 Growth Modules
  </p>

  <h2 className="mt-3 text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
    Explore what the website audit tool checks.
  </h2>

  <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-400">
    Hover over a module for a quick preview.
    Click it to reveal the complete checks,
    outputs, and value delivered by that
    intelligence layer.
  </p>
</div>
            <div className="flex items-center gap-3 text-[12px] text-slate-400">
              Hover for a preview · Click for full details
              <span className="text-cyan-300">→</span>
            </div>
          </div>

          <div className="mt-8 grid items-start gap-3 lg:grid-cols-2">
            {MODULES.map((module) => (
              <ModuleExplorer
                key={module.id}
                module={module}
                open={openModule === module.id}
                onToggle={() =>
                  setOpenModule((current) => (current === module.id ? "" : module.id))
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="cq-reference-deliverables border-b border-white/6 px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto w-full max-w-[1800px]">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <h2 className="text-[22px] font-extrabold text-white">What you receive from every module</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {DELIVERABLES.map(({ Icon, title, text }, index) => {
                  const accent = "#18E3D0";
const glow = "24,227,208";
                  return (
                    <div
  key={title}
  className="cq-home-hover-card rounded-xl border border-cyan-300/15 bg-[#0c2238]/92 p-4 text-center"
>
                      <div
                        className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ color: accent, background: `rgba(${glow},.12)`, boxShadow: `0 0 22px rgba(${glow},.16)` }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-3 text-[14px] font-extrabold text-white">{title}</h3>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">{text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cq-home-hover-card relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#0c2238]/92 p-6">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative grid items-center gap-5 sm:grid-cols-[1fr_150px]">
                <div>
                  <h3 className="text-[22px] font-extrabold leading-tight text-white">One Audit.<br />Complete Growth Clarity.</h3>
                  <div className="mt-5 space-y-3">
                    {[
                      "All 12 modules in every audit",
                      "Actionable insights, not just data",
                      "Prioritized roadmap to grow faster",
                      "Built for marketers, agencies, and teams",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-[12px] text-slate-300">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-300/12 text-cyan-300">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mx-auto grid h-36 w-36 place-items-center">
                  <div className="absolute inset-3 rounded-full border border-cyan-300/25 shadow-[0_0_36px_rgba(24,227,208,.16)]" />
                  <div className="absolute inset-7 rotate-45 rounded-2xl border border-cyan-300/35 bg-[linear-gradient(145deg,rgba(24,227,208,.18),rgba(8,34,52,.98))] shadow-[0_0_34px_rgba(24,227,208,.18)]" />
                  <ShieldCheck className="relative h-16 w-16 text-cyan-300 drop-shadow-[0_0_14px_rgba(24,227,208,.7)]" strokeWidth={1.7} />
                </div>
              </div>
            </div>
          </div>

          <div className="cq-home-hover-card mt-6 grid items-center gap-5 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(90deg,#0C2238,#091C2F)] p-6 md:grid-cols-[170px_1fr_auto]">
            <div className="relative hidden h-24 md:block">
              <div className="absolute bottom-2 left-7 h-8 w-24 rounded-[50%] bg-cyan-300/20 blur-xl" />
              <Rocket className="absolute bottom-2 left-10 h-20 w-20 -rotate-12 text-cyan-300 drop-shadow-[0_0_15px_rgba(24,227,208,.7)]" strokeWidth={1.6} />
            </div>
            <div>
              <p className="text-[12px] text-cyan-300">Ready to unlock your website&apos;s full potential?</p>
              <h3 className="mt-1 text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold text-white">Start Your 7-Day Trial</h3>
              <p className="mt-2 text-[14px] font-semibold text-cyan-300">3 full audits&nbsp;&nbsp;•&nbsp;&nbsp;All 12 modules</p>
            </div>
            <div className="md:text-right">
              <button type="button" onClick={handleStartTrial} disabled={checkoutLoading === "Trial"} className="cq-btn cq-btn--primary !px-8 !py-4">
                {checkoutLoading === "Trial" ? "Redirecting…" : "Start Your 7-Day Trial"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-[11px] text-slate-400">Card required during trial&nbsp;&nbsp;•&nbsp;&nbsp;Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

<section className="cq-reference-section cq-reference-section--ai relative border-y border-cyan-300/20 px-4 py-16 md:px-6 md:py-20 xl:px-8">
  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18E3D0]/70 to-transparent" />

  <div className="mx-auto grid w-full max-w-[1800px] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="cq-eyebrow cq-eyebrow--signal">AI search visibility</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.08]">
              See whether AI knows, cites, and recommends your brand.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-[var(--cq-text-2)]">
              Crawler Que tests real category and buyer-intent prompts across
              ChatGPT, Claude, and Gemini, then explains where your brand appears,
              which competitors appear instead, and what can improve GEO readiness.
            </p>
            <div className="mt-7 space-y-3">
              {[
                "Brand recognition and model-by-model visibility",
                "Competitor mentions and AI share of voice",
                "Cited pages and missed prompt opportunities",
                "GEO readiness and AI citation signals",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[var(--cq-text-2)]">
                  <Check className="h-4 w-4 text-[var(--cq-signal)]" />
                  {item}
                </div>
              ))}
            </div>
            <a href="/ai-search-visibility" className="cq-btn cq-btn--primary mt-8 !px-6 !py-3">
              Explore AI Visibility
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="cq-reference-panel cq-ai-visibility-panel rounded-3xl border border-cyan-300/25 p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">AI Visibility Overview</p>
                <p className="mt-1 text-xs text-[var(--cq-text-3)]">
                  Model-by-model brand visibility intelligence
                </p>
              </div>
              <span className="rounded-full bg-[var(--cq-signal)]/10 px-3 py-1 font-mono text-[10px] text-[var(--cq-signal)]">
                GEO READINESS: HIGH
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["ChatGPT", "82%", "Strong"],
                ["Claude", "74%", "Good"],
                ["Gemini", "68%", "Good"],
              ].map(([name, score, status]) => (
                <div
  key={name}
  className="cq-ai-model-card rounded-2xl border border-cyan-300/20 bg-[#071a2c] p-5 text-center"
>
                  <Bot className="mx-auto h-5 w-5 text-[var(--cq-signal)]" />
                  <p className="mt-3 text-sm font-semibold">{name}</p>
                  <p className="mt-3 text-3xl font-extrabold">{score}</p>
<div className="mt-4 h-2 overflow-hidden rounded-full border border-cyan-300/15 bg-[#04111f]">
  <div className="h-full w-4/5 rounded-full bg-[#18E3D0] shadow-[0_0_12px_rgba(24,227,208,.45)]" />
</div>
                  <p className="mt-2 font-mono text-[10px] text-[var(--cq-signal)]">{status}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Brand mentions", "123"],
                ["Competitor mentions", "98"],
                ["Cited pages", "12"],
                ["Missed prompts", "36"],
              ].map(([label, value]) => (
                <div
  key={label}
  className="cq-ai-metric-card flex items-center justify-between rounded-xl border border-cyan-300/15 bg-[#071a2c] px-4 py-3"
>
                  <span className="text-xs text-[var(--cq-text-3)]">{label}</span>
                  <span className="font-mono text-sm font-bold text-[var(--cq-text)]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#18E3D0]/70 to-transparent" />
      </section>

      <section className="cq-reference-section cq-reference-section--alt border-b border-white/6 px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1800px]">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="cq-eyebrow cq-eyebrow--signal">How it works</p>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold">
                Audit. Analyse. Act.
              </h2>
              <div className="mt-9 space-y-4">
                {[
                  ["01", "Enter any URL", "Add the website and choose the intelligence modules you want to run."],
                  ["02", "Analyse all growth signals", "Crawler Que processes technical, search, market, authority, content, and AI visibility data."],
                  ["03", "Act on the roadmap", "Use prioritized recommendations, ownership, timing, reports, and saved history to move forward."],
                ].map(([number, title, text]) => (
                  <div key={number} className="cq-reference-panel flex gap-4 rounded-2xl p-5">
                    <span className="font-mono text-sm font-bold text-[var(--cq-signal)]">{number}</span>
                    <div>
                      <h3 className="font-extrabold">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--cq-text-2)]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="cq-reference-panel cq-frame overflow-hidden !rounded-none"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="flex items-center justify-between border-b border-[var(--cq-line)] bg-[var(--cq-surface-2)] px-5 py-3">
                <div>
                  <p className="font-semibold">Inside the Crawler Que dashboard</p>
                  <p className="mt-1 text-xs text-[var(--cq-text-3)]">Real product screenshots</p>
                </div>
                <span className="font-mono text-xs text-[var(--cq-signal)]">
                  {activeScreenshot + 1} / {SCREENSHOTS.length}
                </span>
              </div>

              <div className="relative aspect-[16/10] bg-[var(--cq-ink)]">
                {SCREENSHOTS.map((shot, index) => (
                  <Image
                    key={shot.src}
                    src={shot.src}
                    alt={`Crawler Que dashboard screenshot ${index + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 760px"
                    className={`object-contain transition-opacity duration-700 ${
                      activeScreenshot === index ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-[var(--cq-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--cq-text-2)]">{currentScreenshot.caption}</p>
                <div className="flex shrink-0 gap-2">
                  {SCREENSHOTS.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveScreenshot(index)}
                      aria-label={`Show product screenshot ${index + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        activeScreenshot === index
                          ? "w-7 bg-[var(--cq-signal)]"
                          : "w-2 bg-[var(--cq-text-3)]/40 hover:bg-[var(--cq-text-2)]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
     </section>

{featuredTestimonials.length > 0 && (
  <section
    id="testimonials"
    className="cq-reference-section relative overflow-hidden border-b border-white/6 px-4 py-16 md:px-6 md:py-20 xl:px-8"
  >
    <div className="mx-auto w-full max-w-[1800px]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <p className="cq-eyebrow cq-eyebrow--signal">
            Customer stories
          </p>

          <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.08] text-white">
            What customers say about Crawler Que.
          </h2>

          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--cq-text-2)]">
            Genuine feedback from professionals using Crawler Que for
            website audits, AI visibility analysis, client reporting,
            and growth planning.
          </p>
        </div>

        <Link
          href="/testimonials"
          className="cq-btn cq-btn--ghost !px-5 !py-3"
        >
          View all customer stories
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4">
        <Testimonials3DCarousel
          testimonials={featuredTestimonials}
        />
      </div>
    </div>
  </section>
)}

      <section id="pricing" className="cq-reference-section border-b border-white/6 px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-[1800px]">
          <div className="text-center">
            <p className="cq-eyebrow cq-eyebrow--signal">Pricing</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2rem,5vw,3.6rem)] font-extrabold leading-tight">
              Choose the plan that grows with you.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-[var(--cq-text-2)]">
              Start with a 7-day trial that includes 3 full audits and all 12 modules.
            </p>
          </div>

          <div className="cq-reference-trial-banner mx-auto mt-9 max-w-3xl rounded-2xl p-6 text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cq-signal)]">
              Start with complete access
            </p>
            <h3 className="mt-3 text-2xl font-extrabold">7-day trial · 3 full audits · all 12 modules</h3>
            <p className="mt-3 text-sm text-[var(--cq-text-2)]">
              Card required. Cancel during the trial to avoid being charged.
            </p>
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={checkoutLoading === "Trial"}
              className="cq-btn cq-btn--primary mt-5 !px-8 !py-3"
            >
              {checkoutLoading === "Trial" ? "Redirecting…" : "Start Your 7-Day Trial"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--cq-line)] bg-[var(--cq-surface)] p-1">
              {["monthly", "annual"].map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBilling(cycle)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    billing === cycle
                      ? "bg-[var(--cq-signal)] text-[var(--cq-on-signal)]"
                      : "text-[var(--cq-text-2)] hover:text-[var(--cq-text)]"
                  }`}
                >
                  {cycle === "monthly" ? "Monthly" : "Annual · 2 months free"}
                </button>
              ))}
            </div>
          </div>

          {checkoutError && (
            <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-[var(--cq-danger)]/30 bg-[var(--cq-danger)]/10 px-5 py-4 text-center text-sm text-[var(--cq-danger)]">
              {checkoutError}
            </div>
          )}

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const featured = Boolean(plan.badge);
              const isLoading = checkoutLoading === plan.name;
              const monthlyPrice =
                billing === "annual"
                  ? Math.round(plan.priceAnnual / 12)
                  : plan.priceMonthly;

              return (
                <article
                  key={plan.name}
                  className={`cq-reference-panel relative flex flex-col rounded-3xl p-7 transition hover:-translate-y-1 hover:border-[var(--cq-signal)]/55 ${
                    featured
                      ? "border-[var(--cq-signal)]/55 shadow-[0_25px_80px_rgba(0,212,170,0.12)]"
                      : ""
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute right-5 top-5 rounded-full bg-[var(--cq-signal)] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--cq-on-signal)]">
                      {plan.badge}
                    </div>
                  )}

                  <h3 className="text-xl font-extrabold">{plan.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--cq-text-2)]">{plan.desc}</p>

                  <div className="mt-7 flex items-end gap-2">
                    <span className={`font-mono text-5xl font-bold ${featured ? "text-[var(--cq-signal)]" : ""}`}>
                      ${monthlyPrice}
                    </span>
                    <span className="mb-1 text-sm text-[var(--cq-text-3)]">/month</span>
                  </div>

                  {billing === "annual" && (
                    <p className="mt-2 font-mono text-xs text-[var(--cq-text-3)]">
                      Billed ${plan.priceAnnual} yearly
                    </p>
                  )}

                  <div className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-[var(--cq-text-2)]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cq-signal)]" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface-2)]/55 p-4">
                    <p className="cq-eyebrow">What this means</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--cq-text-2)]">{plan.usage}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleChoosePlan(plan)}
                    disabled={isLoading}
                    className={`cq-btn mt-7 w-full ${featured ? "cq-btn--primary" : "cq-btn--ghost"}`}
                  >
                    {isLoading ? "Redirecting…" : `Start with ${plan.name}`}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cq-reference-section cq-reference-section--alt border-b border-white/6 px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="cq-eyebrow cq-eyebrow--signal">FAQ</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold">Questions, answered.</h2>
          </div>

          <div className="mt-10 space-y-3">
            {[
              [
                "What does Crawler Que audit?",
                "Crawler Que brings together 12 website-growth modules covering SEO intelligence, technical SEO, on-page signals, Core Web Vitals, traffic, keywords, rankings, competitors, backlinks, content quality, AI search visibility, and prioritized recommendations.",
              ],
              [
                "What is included in the 7-day trial?",
                "The trial includes 3 full audits and access to all 12 growth modules. A card is required, and you can cancel during the trial to avoid being charged.",
              ],
              [
                "How does AI search visibility work?",
                "Crawler Que tests brand visibility across ChatGPT, Claude, and Gemini, then reports brand recognition, mentions, competitor visibility, cited pages, missed prompts, and GEO readiness.",
              ],
              [
                "Are traffic figures exact analytics data?",
                "No. Traffic intelligence is directional and uses ranked keywords, search demand, available traffic signals, and position-based CTR modelling. Every estimate includes a confidence label.",
              ],
              [
                "Can agencies use their own branding?",
                "Agency and Enterprise workflows support white-label reporting, including agency identity, report branding, saved history, and comparison reporting where enabled by the selected plan.",
              ],
              [
                "What is the best AI SEO audit tool?",
                "Crawler Que combines website auditing, AI visibility scoring, prioritized recommendations, and client-ready reporting in one focused workflow. The best choice depends on your team, required data depth, and reporting needs.",
              ],
              [
                "Is there a tool that checks my brand in ChatGPT, Claude, and Gemini?",
                "Yes. Crawler Que's AI Search Visibility module tests your brand across ChatGPT, Claude, and Gemini and scores your GEO readiness. It shows where competitors appear instead of you.",
              ],
              [
                "How do I audit my website for AI search visibility?",
                "Start a 7-day Crawler Que trial and include the AI Search Visibility module in your audit. It reports brand mentions, cited pages, missed prompts, competitor visibility, and a model-by-model visibility score.",
              ],
            ].map(([question, answer]) => (
              <details key={question} className="cq-reference-panel group rounded-2xl p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold marker:hidden">
                  {question}
                  <ChevronDown className="h-5 w-5 shrink-0 text-[var(--cq-signal)] transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 pr-8 text-[14px] leading-7 text-[var(--cq-text-2)]">{answer}</p>
              </details>
            ))}

            <details className="cq-reference-panel group rounded-2xl p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold marker:hidden">
                How is Crawler Que different from SEMrush and Ahrefs?
                <ChevronDown className="h-5 w-5 shrink-0 text-[var(--cq-signal)] transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-4 pr-8 text-[14px] leading-7 text-[var(--cq-text-2)]">
                Crawler Que focuses on bringing website audits, AI visibility, prioritized recommendations, report history, and client-ready delivery into one workflow. {" "}
                <Link
                  href="/blog/crawler-que-vs-semrush-vs-ahrefs-which-seo-audit-tool-is-actually-worth-it-in-2026"
                  className="font-semibold text-[var(--cq-signal)] hover:underline"
                >
                  Read the detailed Crawler Que, SEMrush, and Ahrefs comparison
                </Link>
                .
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="cq-reference-section px-5 py-16 md:px-8 md:py-20">
        <div className="cq-reference-cta mx-auto w-full max-w-[1800px] overflow-hidden rounded-3xl p-8 md:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="cq-eyebrow cq-eyebrow--signal">Ready to unlock your website's full potential?</p>
              <h2 className="mt-4 max-w-3xl text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[1.05]">
                Turn website data into a clear growth plan.
              </h2>
              <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[var(--cq-text-2)]">
                Start your 7-day trial with 3 full audits and every Crawler Que growth module.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-[var(--cq-text-3)]">
                <span>3 full audits</span>
                <span>•</span>
                <span>All 12 modules</span>
                <span>•</span>
                <span>Card required · Cancel during trial</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartTrial}
              disabled={checkoutLoading === "Trial"}
              className="cq-btn cq-btn--primary !px-8 !py-4"
            >
              {checkoutLoading === "Trial" ? "Redirecting…" : "Start Your 7-Day Trial"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

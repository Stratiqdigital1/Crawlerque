// components/site-shell.tsx
// Shared navigation, footer, and page primitives for all marketing pages.
"use client";

import { useState } from "react";
import {
  Search, Sparkles, FileText, FileSearch, KeyRound, TrendingUp,
  Swords, Link2, Lightbulb, ScanLine, Globe, BarChart3, MapPin, Bot,
} from "lucide-react";

/* ── MODULE DATA ─────────────────────────────────────────────────────── */
/* 3 flagship modules ("famous for") + 9 supporting modules */
const FAMOUS_FOR: { t: string; d: string; href: string; Icon: any }[] = [
  { t: "SEO Audit", d: "Our flagship modular website audit", href: "/#modules", Icon: Search },
  { t: "AI Search Visibility", d: "See if ChatGPT, Claude & Gemini recommend you", href: "/ai-search-visibility", Icon: Sparkles },
  { t: "White-label Reports", d: "Branded PDF growth plans for clients", href: "/for-agencies", Icon: FileText },
];
const ALSO_GREAT: { t: string; href: string; Icon: any }[] = [
  { t: "Technical SEO", href: "/#modules", Icon: FileSearch },
  { t: "Keyword Research", href: "/#modules", Icon: KeyRound },
  { t: "Traffic Estimation", href: "/#modules", Icon: TrendingUp },
  { t: "Competitor Analysis", href: "/#modules", Icon: Swords },
  { t: "Backlink Audit", href: "/#modules", Icon: Link2 },
  { t: "AI Recommendations", href: "/#modules", Icon: Lightbulb },
  { t: "On-page Signals", href: "/#modules", Icon: ScanLine },
  { t: "GEO Readiness", href: "/ai-search-visibility", Icon: Globe },
  { t: "AI Ranking", href: "/ai-search-visibility", Icon: BarChart3 },
  { t: "AI Prompt Tracking", href: "/ai-search-visibility", Icon: Bot },
  { t: "SERP Ranking", href: "/#modules", Icon: Search },
  { t: "Local SEO", href: "/#modules", Icon: MapPin },
];

/* ── NAV ─────────────────────────────────────────────────────────────── */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [feat, setFeat] = useState(false);
const links: [string, string][] = [
  ["/#pricing", "Pricing"],
  ["/sample-report", "Sample report"],
  ["/blog", "Blog"],
  ["/login", "Login"],
];
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--cq-line-soft)] bg-[var(--cq-ink)]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo-full.png" alt="Crawler Que" className="h-7 w-auto" />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {/* Features mega-menu */}
          <div className="relative" onMouseEnter={() => setFeat(true)} onMouseLeave={() => setFeat(false)}>
            <button className="flex items-center gap-1 rounded-lg px-4 py-2 text-[15px] font-medium text-[var(--cq-text-2)] transition-colors hover:bg-[var(--cq-surface)] hover:text-[var(--cq-text)]">
              Features <span className={`text-xs transition-transform ${feat ? "rotate-180" : ""}`}>▾</span>
            </button>
            {feat && (
              <div className="absolute left-1/2 top-full w-[720px] -translate-x-1/2 pt-3">
                <div className="cq-card cq-frame overflow-hidden !rounded-none p-6 shadow-2xl">
                  <p className="cq-eyebrow cq-eyebrow--signal mb-3">We&apos;re famous for</p>
                  <div className="grid grid-cols-3 gap-3">
                    {FAMOUS_FOR.map(({ t, d, href, Icon }) => (
                      <a key={t} href={href} className="group rounded-lg border border-[var(--cq-line)] p-4 transition-colors hover:border-[var(--cq-signal)]/50 hover:bg-[var(--cq-surface)]">
                        <Icon className="h-5 w-5 text-[var(--cq-signal)]" strokeWidth={2} />
                        <p className="mt-2.5 text-[15px] font-bold text-[var(--cq-text)] group-hover:text-[var(--cq-signal)]">{t}</p>
                        <p className="mt-1 text-[13px] leading-snug text-[var(--cq-text-3)]">{d}</p>
                      </a>
                    ))}
                  </div>
                  <p className="cq-eyebrow mb-3 mt-6">But we&apos;re also great at</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ALSO_GREAT.map(({ t, href, Icon }) => (
                      <a key={t} href={href} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-[var(--cq-text-2)] transition-colors hover:bg-[var(--cq-surface)] hover:text-[var(--cq-signal)]">
                        <Icon className="h-4 w-4 shrink-0 text-[var(--cq-text-3)]" strokeWidth={2} />
                        {t}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {links.map(([href, label]) => (
            <a key={label} href={href} className="rounded-lg px-4 py-2 text-[15px] font-medium text-[var(--cq-text-2)] transition-colors hover:bg-[var(--cq-surface)] hover:text-[var(--cq-text)]">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href="/#pricing" className="cq-btn cq-btn--primary hidden !py-2.5 md:inline-flex">Get started</a>
          <button onClick={() => setOpen(!open)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cq-line)] text-[var(--cq-text-2)] md:hidden">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-[80vh] overflow-y-auto border-t border-[var(--cq-line-soft)] bg-[var(--cq-surface)] px-5 py-5 md:hidden">
          <p className="cq-eyebrow cq-eyebrow--signal mb-2">Features</p>
          {FAMOUS_FOR.map(({ t, href, Icon }) => (
            <a key={t} href={href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[15px] font-semibold text-[var(--cq-text)] hover:text-[var(--cq-signal)]">
              <Icon className="h-4 w-4 text-[var(--cq-signal)]" /> {t}
            </a>
          ))}
          {ALSO_GREAT.map(({ t, href, Icon }) => (
            <a key={t} href={href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-4 py-2 text-[14px] text-[var(--cq-text-2)] hover:text-[var(--cq-signal)]">
              <Icon className="h-4 w-4 text-[var(--cq-text-3)]" /> {t}
            </a>
          ))}
          <div className="my-2 h-px bg-[var(--cq-line-soft)]" />
          {links.map(([href, label]) => (
            <a key={label} href={href} onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-[15px] font-medium text-[var(--cq-text-2)] hover:text-[var(--cq-text)]">
              {label}
            </a>
          ))}
          <a href="/#pricing" className="cq-btn cq-btn--primary mt-3 w-full">Get started</a>
        </div>
      )}
      <div className="cq-scanline" />
    </header>
  );
}

/* ── FOOTER ──────────────────────────────────────────────────────────── */
const FOOTER_COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [["/#modules", "Modules"], ["/#pricing", "Pricing"], ["/sample-report", "Sample report"], ["/ai-search-visibility", "AI visibility"], ["/changelog", "Changelog"]],
  },
  {
    title: "Solutions",
    links: [["/for-agencies", "For agencies"], ["/for-seo-teams", "For SEO teams"], ["/for-consultants", "For consultants"], ["/testimonials", "Testimonials"]],
  },
  {
    title: "Company",
    links: [["/blog", "Blog"], ["/contact", "Contact"], ["/affiliate-program", "Affiliate program"]],
  },
  {
    title: "Legal",
    links: [["/privacy-policy", "Privacy policy"], ["/return-policy", "Return policy"]],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--cq-line-soft)] bg-[var(--cq-footer)] px-5 py-14 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <a href="/" className="flex items-center gap-3">
              <img src="/logo-full.png" alt="Crawler Que" className="h-7 w-auto" />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-[var(--cq-text-3)]">
              AI website growth intelligence for agencies, consultants, and SEO teams.
            </p>
          </div>
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-[var(--cq-text)]">{col.title}</p>
              <div className="mt-4 space-y-2.5">
                {col.links.map(([href, label]) => (
                  <a key={label} href={href} className="block text-sm text-[var(--cq-text-3)] transition-colors hover:text-[var(--cq-signal)]">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="cq-scanline mt-12" />
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.08em] text-[var(--cq-text-3)]">
          Powered By{" "}
          <a href="https://stratiqdigital.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--cq-signal)]">
            Strat IQ Digital
          </a>
        </p>
      </div>
    </footer>
  );
}

/* ── PAGE PRIMITIVES ─────────────────────────────────────────────────── */
export function PageHero({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <section className="border-b border-[var(--cq-line-soft)] px-5 pb-16 pt-20 md:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <p className="cq-eyebrow cq-eyebrow--signal">{eyebrow}</p>
        <h1 className="mt-4 text-[clamp(2.2rem,5.5vw,3.6rem)] font-extrabold leading-[1.06]">{title}</h1>
        {sub && <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-[var(--cq-text-2)]">{sub}</p>}
      </div>
    </section>
  );
}

export function Section({ children, alt = false }: { children: React.ReactNode; alt?: boolean }) {
  return (
    <section className={`border-b border-[var(--cq-line-soft)] px-5 py-16 md:px-8 ${alt ? "bg-[var(--cq-surface)]/40" : ""}`}>
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

export function CtaBand({ title = "Run your first audit free.", sub = "No signup needed. See what Crawler Que finds on any site in under two minutes." }) {
  return (
    <section className="px-5 py-20 text-center md:px-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-tight">{title}</h2>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-[var(--cq-text-2)]">{sub}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href="/" className="cq-btn cq-btn--primary !px-8 !py-4">Run a free audit →</a>
          <a href="/#pricing" className="cq-btn cq-btn--ghost !px-8 !py-4">See plans</a>
        </div>
      </div>
    </section>
  );
}

/* ── PERSONA PAGE TEMPLATE (for-agencies / for-seo-teams / for-consultants) */
export function PersonaPage({ eyebrow, title, sub, pains, features, proof }: {
  eyebrow: string; title: string; sub: string;
  pains: { t: string; d: string }[];
  features: { t: string; d: string }[];
  proof: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero eyebrow={eyebrow} title={title} sub={sub} />
      <Section>
        <h2 className="text-2xl font-extrabold">Sound familiar?</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {pains.map(p => (
            <div key={p.t} className="cq-card p-6">
              <h3 className="text-[16px] font-bold">{p.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{p.d}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section alt>
        <h2 className="text-2xl font-extrabold">How Crawler Que fixes it</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map(f => (
            <div key={f.t} className="cq-card flex gap-4 p-6">
              <span className="mt-1.5 h-1 w-4 shrink-0 bg-[var(--cq-signal)]" />
              <div>
                <h3 className="text-[16px] font-bold">{f.t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--cq-text-2)]">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="cq-card cq-frame mt-8 p-6">
          <p className="text-[16px] leading-relaxed text-[var(--cq-text-2)]">{proof}</p>
        </div>
      </Section>
      <CtaBand />
      <SiteFooter />
    </main>
  );
}
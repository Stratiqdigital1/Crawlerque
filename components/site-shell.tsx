// components/site-shell.tsx
// Shared navigation, footer, and page primitives for all marketing pages.
"use client";

import { useState } from "react";

/* ── NAV ─────────────────────────────────────────────────────────────── */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const links: [string, string][] = [
    ["/#modules", "Modules"],
    ["/#pricing", "Pricing"],
    ["/sample-report", "Sample report"],
    ["/ai-search-visibility", "AI visibility"],
    ["/login", "Login"],
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--cq-line-soft)] bg-[var(--cq-ink)]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <a href="/" className="flex items-center gap-3">
          <span className="cq-frame flex h-8 w-8 items-center justify-center bg-[var(--cq-surface)]">
            <span className="font-mono text-[11px] font-bold text-[var(--cq-signal)]">CQ</span>
          </span>
          <span className="text-[17px] font-extrabold tracking-tight">Crawler Que</span>
        </a>
        <nav className="hidden items-center gap-2 md:flex">
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
        <div className="border-t border-[var(--cq-line-soft)] bg-[var(--cq-surface)] px-5 py-5 md:hidden">
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
              <span className="cq-frame flex h-8 w-8 items-center justify-center bg-[var(--cq-surface)]">
                <span className="font-mono text-[11px] font-bold text-[var(--cq-signal)]">CQ</span>
              </span>
              <span className="text-[16px] font-extrabold tracking-tight">Crawler Que</span>
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
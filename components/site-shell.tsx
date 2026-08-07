// components/site-shell.tsx
// Shared navigation, footer, and page primitives for all marketing pages.
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Sparkles, FileText, FileSearch, KeyRound, TrendingUp,
  Swords, Link2, Lightbulb, ScanLine, Globe, BarChart3, MapPin, Bot,
} from "lucide-react";

/* ── MODULE DATA ─────────────────────────────────────────────────────── */
/* 3 flagship capabilities plus supporting audit capabilities. */
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
  ["/testimonials", "Reviews"],
  ["/blog", "Blog"],
  ["/login", "Login"],
];
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--cq-line-soft)] bg-[var(--cq-ink)]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
  href="/"
  className="flex items-center gap-3"
>
  <img
    src="/logo-full.png"
    alt="Crawler Que"
    className="h-7 w-auto"
  />
</Link>

        <nav className="hidden items-center gap-1 md:flex">
          {/* Features mega-menu */}
          <div
            className="relative"
            onMouseEnter={() => setFeat(true)}
            onMouseLeave={() => setFeat(false)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setFeat(false);
              }
            }}
          >
            <button
              type="button"
              aria-expanded={feat}
              aria-haspopup="menu"
              aria-controls="crawler-que-features-menu"
              onClick={() => setFeat((value) => !value)}
              onFocus={() => setFeat(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setFeat(false);
                  event.currentTarget.focus();
                }
              }}
              className="flex items-center gap-1 rounded-lg px-4 py-2 text-[15px] font-medium text-[var(--cq-text-2)] transition-colors hover:bg-[var(--cq-surface)] hover:text-[var(--cq-text)]"
            >
              Features <span aria-hidden="true" className={`text-xs transition-transform ${feat ? "rotate-180" : ""}`}>▾</span>
            </button>
            {feat && (
              <div id="crawler-que-features-menu" role="menu" aria-label="Crawler Que features" className="absolute left-1/2 top-full w-[720px] -translate-x-1/2 pt-3">
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
          <Link
  href="/#pricing"
  className="cq-btn cq-btn--primary hidden !py-2.5 md:inline-flex"
>
  Get started
</Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="crawler-que-mobile-menu"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cq-line)] text-[var(--cq-text-2)] md:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div id="crawler-que-mobile-menu" className="max-h-[80vh] overflow-y-auto border-t border-[var(--cq-line-soft)] bg-[var(--cq-surface)] px-5 py-5 md:hidden">
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
          <Link
  href="/#pricing"
  onClick={() => setOpen(false)}
  className="cq-btn cq-btn--primary mt-3 w-full"
>
  Get started
</Link>
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
    links: [["/for-agencies", "For agencies"], ["/for-seo-teams", "For SEO teams"], ["/for-consultants", "For consultants"]],
  },
  {
    title: "Company",
    links: [
      ["/blog", "Blog"],
      ["/testimonials", "Testimonials"],
      ["/contact", "Contact"],
      ["/affiliate-program", "Affiliate program"],
    ],
  },
  {
    title: "Legal",
    links: [["/privacy-policy", "Privacy policy"], ["/return-policy", "Return policy"]],
  },
];

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/1RMgoKTtWS/",
    icon: "facebook",
    hoverClass:
      "hover:border-[#1877F2]/60 hover:bg-[#1877F2]/10 hover:text-[#1877F2]",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/crawlerque/",
    icon: "instagram",
    hoverClass:
      "hover:border-[#E4405F]/60 hover:bg-[#E4405F]/10 hover:text-[#E4405F]",
  },
  {
    name: "Reddit",
    href: "https://www.reddit.com/user/Crawlerque",
    icon: "reddit",
    hoverClass:
      "hover:border-[#FF4500]/60 hover:bg-[#FF4500]/10 hover:text-[#FF4500]",
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--cq-line-soft)] bg-[var(--cq-footer)] px-5 py-14 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link
  href="/"
  className="flex items-center gap-3"
>
  <img
    src="/logo-full.png"
    alt="Crawler Que"
    className="h-7 w-auto"
  />
</Link>
<p className="mt-4 text-sm leading-relaxed text-[var(--cq-text-3)]">
  AI website growth intelligence for agencies, consultants, and SEO teams.
</p>

<div className="mt-5 flex items-center gap-3">
  {SOCIAL_LINKS.map((social) => (
    <a
      key={social.name}
      href={social.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Follow Crawler Que on ${social.name}`}
      title={`Crawler Que on ${social.name}`}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)] text-[var(--cq-text-3)] shadow-[0_8px_24px_rgba(0,0,0,.18)] transition-all duration-300 hover:-translate-y-1 ${social.hoverClass}`}
    >
      {social.icon === "facebook" && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[18px] w-[18px] fill-current"
        >
          <path d="M13.5 22v-9h3l.45-3.5H13.5V7.25c0-1.01.28-1.7 1.74-1.7H17.1V2.42c-.32-.04-1.42-.14-2.7-.14-2.67 0-4.5 1.63-4.5 4.63V9.5H7v3.5h2.9v9h3.6Z" />
        </svg>
      )}

      {social.icon === "instagram" && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[19px] w-[19px] fill-none stroke-current"
          strokeWidth="1.8"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
          />
          <circle
            cx="17.4"
            cy="6.6"
            r="1"
            className="fill-current stroke-none"
          />
        </svg>
      )}

      {social.icon === "reddit" && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5 fill-current"
        >
          <path d="M20.32 12.16c.05-.24.08-.49.08-.75a2.55 2.55 0 0 0-4.35-1.8 10.8 10.8 0 0 0-3.42-1.08l.72-3.36 2.32.5a1.88 1.88 0 1 0 .18-.86l-2.75-.59a.45.45 0 0 0-.53.35l-.84 3.9A10.87 10.87 0 0 0 8 9.5a2.55 2.55 0 0 0-4.4 1.75c0 .3.05.58.14.85A3.25 3.25 0 0 0 3 14.13C3 17.45 7.03 20 12 20s9-2.55 9-5.87c0-.72-.24-1.4-.68-1.97ZM7.5 13a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm7.85 4.2c-.93.93-2.28 1.4-3.35 1.4s-2.42-.47-3.35-1.4a.44.44 0 0 1 .62-.62c.68.68 1.78 1.14 2.73 1.14s2.05-.46 2.73-1.14a.44.44 0 1 1 .62.62ZM16.5 15.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
      )}
    </a>
  ))}
</div>
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

type PageLink = {
  href: string;
  label: string;
};

type PersonaItem = {
  t: string;
  d: string;
  link?: PageLink;
};

export function CtaBand({
  title = "Start your 7-day trial.",
  sub = "Run 3 complete audits with access to every Crawler Que growth module. A card is required, and you can cancel during the trial.",
  primaryHref = "/#pricing",
  primaryLabel = "Start Your 7-Day Trial →",
  secondaryHref = "/sample-report",
  secondaryLabel = "View sample report",
}: {
  title?: string;
  sub?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="px-5 py-20 text-center md:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="cq-eyebrow cq-eyebrow--signal">
          Complete website growth intelligence
        </p>
        <h2 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-tight">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-[var(--cq-text-2)]">
          {sub}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href={primaryHref} className="cq-btn cq-btn--primary !px-8 !py-4">
            {primaryLabel}
          </a>
          <a href={secondaryHref} className="cq-btn cq-btn--ghost !px-8 !py-4">
            {secondaryLabel}
          </a>
        </div>
        <p className="mt-4 text-xs text-[var(--cq-text-3)]">
          3 full audits · All growth modules · Card required · Cancel during trial
        </p>
      </div>
    </section>
  );
}

/* ── PERSONA PAGE TEMPLATE (for-agencies / for-seo-teams / for-consultants) */
export function PersonaPage({
  eyebrow,
  title,
  sub,
  pains,
  features,
  proof,
  introLinks = [],
  proofLinks = [],
  cta,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  pains: PersonaItem[];
  features: PersonaItem[];
  proof: string;
  introLinks?: PageLink[];
  proofLinks?: PageLink[];
  cta?: {
    title?: string;
    sub?: string;
    primaryHref?: string;
    primaryLabel?: string;
    secondaryHref?: string;
    secondaryLabel?: string;
  };
}) {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <PageHero eyebrow={eyebrow} title={title} sub={sub} />
      <Section>
        {introLinks.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--cq-line)] bg-[var(--cq-surface)]/55 px-5 py-4 text-sm text-[var(--cq-text-2)]">
            <span className="font-semibold text-[var(--cq-text)]">Helpful resources:</span>
            {introLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-semibold text-[var(--cq-signal)] hover:underline"
              >
                {link.label} →
              </a>
            ))}
          </div>
        )}

        <h2 className="text-2xl font-extrabold">Sound familiar?</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {pains.map((pain) => (
            <div key={pain.t} className="cq-card p-6">
              <h3 className="text-[16px] font-bold">{pain.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
                {pain.d}
              </p>
              {pain.link && (
                <a
                  href={pain.link.href}
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--cq-signal)] hover:underline"
                >
                  {pain.link.label} →
                </a>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section alt>
        <h2 className="text-2xl font-extrabold">How Crawler Que fixes it</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.t} className="cq-card flex gap-4 p-6">
              <span className="mt-1.5 h-1 w-4 shrink-0 bg-[var(--cq-signal)]" />
              <div>
                <h3 className="text-[16px] font-bold">{feature.t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--cq-text-2)]">
                  {feature.d}
                </p>
                {feature.link && (
                  <a
                    href={feature.link.href}
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--cq-signal)] hover:underline"
                  >
                    {feature.link.label} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="cq-card cq-frame mt-8 p-6">
          <p className="text-[16px] leading-relaxed text-[var(--cq-text-2)]">
            {proof}
          </p>
          {proofLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-4">
              {proofLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold text-[var(--cq-signal)] hover:underline"
                >
                  {link.label} →
                </a>
              ))}
            </div>
          )}
        </div>
      </Section>

      <CtaBand {...cta} />
      <SiteFooter />
    </main>
  );
}

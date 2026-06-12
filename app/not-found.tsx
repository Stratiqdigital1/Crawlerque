// app/not-found.tsx — custom 404 (place directly in app/, not in a subfolder)
import { SiteNav, SiteFooter } from "@/components/site-shell";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <p className="font-mono text-sm text-[var(--cq-signal)]">404 — page not crawled</p>
        <h1 className="mt-4 text-4xl font-extrabold">This page doesn't exist.</h1>
        <p className="mt-3 max-w-md text-[16px] text-[var(--cq-text-2)]">
          The crawler came back empty. Try the homepage, or run a free audit while you're here.
        </p>
        <div className="mt-8 flex gap-4">
          <a href="/" className="cq-btn cq-btn--primary">Back to homepage</a>
          <a href="/contact" className="cq-btn cq-btn--ghost">Report a broken link</a>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
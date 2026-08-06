import Link from "next/link";
import {
  CtaBand,
  PageHero,
  SiteFooter,
  SiteNav,
} from "@/components/site-shell";
import { Testimonials3DCarousel } from "@/components/testimonials-3d-carousel";
import { APPROVED_TESTIMONIALS } from "@/lib/testimonials";

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-[var(--cq-ink)] text-[var(--cq-text)]">
      <SiteNav />

      <PageHero
        eyebrow="Customer Stories"
        title="What customers say about Crawler Que"
        sub="Customer feedback about website audits, AI visibility, reporting workflows, and actionable growth recommendations."
      />

      <section className="relative overflow-hidden border-b border-[var(--cq-line-soft)] px-4 pb-20 pt-6 md:px-8 md:pt-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="absolute left-0 top-1/4 h-80 w-80 rounded-full bg-cyan-400/6 blur-[120px]" />

          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-blue-600/7 blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <Testimonials3DCarousel
            testimonials={
              APPROVED_TESTIMONIALS
            }
          />

          <div className="mt-12 text-center">
            <p className="text-sm text-[var(--cq-text-3)]">
              Using Crawler Que and
              want to be featured?
            </p>

            <Link
              href="/contact"
              className="mt-2 inline-flex text-sm font-semibold text-[var(--cq-signal)] hover:underline"
            >
              Tell us your story →
            </Link>
          </div>
        </div>
      </section>

      <CtaBand
        title="See what Crawler Que finds on your website."
        sub="Start a 7-day trial with 3 complete audits and access to every Crawler Que growth module."
      />

      <SiteFooter />
    </main>
  );
}
// lib/geo-readiness.ts
//
// Scores individual crawled pages on how "AI-citation-ready" they are, and
// matches AI response snippets back to the most likely source page.
//
// ── INPUT SHAPE ─────────────────────────────────────────────────────────
// This expects an array of pages shaped like DataForSEO's OnPage API
// `items` results. If your OnPage route already normalizes pages into a
// different shape, adjust the field lookups in `scorePage()` below — the
// comments mark exactly which raw fields are read.
//
export interface CrawledPage {
  url: string;
  title?: string;
  meta_description?: string;
  h1?: string[] | string;
  plain_text_word_count?: number;
  content?: { plain_text_word_count?: number };
  // OnPage's checks object — booleans for common issues
  checks?: Record<string, boolean>;
  // Optional: structured data types found on the page, e.g. ["FAQPage","Article"]
  schema_types?: string[];
}

export interface PageGeoScore {
  url: string;
  title: string;
  score: number;            // 0-100
  grade: "Strong" | "Moderate" | "Needs Work";
  factors: { label: string; pass: boolean; weight: number }[];
  topIssue: string | null;  // single highest-weight missing factor, for action cards
}

const WORD_COUNT = (p: CrawledPage) =>
  p.plain_text_word_count ?? p.content?.plain_text_word_count ?? 0;

const HAS_H1 = (p: CrawledPage) => {
  const h1 = p.h1;
  if (Array.isArray(h1)) return h1.length > 0 && h1.some((h) => h?.trim());
  return !!String(h1 || "").trim();
};

const HAS_SCHEMA = (p: CrawledPage, type?: string) => {
  const types = p.schema_types || [];
  return type ? types.includes(type) : types.length > 0;
};

/**
 * Score a single page 0-100 on AI-citation readiness.
 * Weights sum to 100. Each factor is a binary pass/fail check derived
 * from data already present in an OnPage crawl — no extra API calls.
 */
export function scorePage(page: CrawledPage): PageGeoScore {
  const factors: { label: string; pass: boolean; weight: number }[] = [
    { label: "Has a single clear H1",        weight: 15, pass: HAS_H1(page) },
    { label: "Has a meta description",       weight: 10, pass: !!page.meta_description?.trim() },
    { label: "Content depth (300+ words)",   weight: 20, pass: WORD_COUNT(page) >= 300 },
    { label: "In-depth content (800+ words)",weight: 10, pass: WORD_COUNT(page) >= 800 },
    { label: "Has structured data (schema)", weight: 20, pass: HAS_SCHEMA(page) },
    { label: "Has FAQ schema (FAQPage)",     weight: 15, pass: HAS_SCHEMA(page, "FAQPage") },
    { label: "No broken/duplicate-title issues", weight: 10, pass: !page.checks?.duplicate_title && !page.checks?.no_title },
  ];

  const score = factors.reduce((sum, f) => sum + (f.pass ? f.weight : 0), 0);
  const grade: PageGeoScore["grade"] =
    score >= 75 ? "Strong" : score >= 45 ? "Moderate" : "Needs Work";

  const topIssue = factors
    .filter((f) => !f.pass)
    .sort((a, b) => b.weight - a.weight)[0]?.label ?? null;

  return {
    url: page.url,
    title: page.title || page.url,
    score,
    grade,
    factors,
    topIssue,
  };
}

/** Score every page and sort best → worst. */
export function scoreAllPages(pages: CrawledPage[]): PageGeoScore[] {
  return (pages || [])
    .filter((p) => p?.url)
    .map(scorePage)
    .sort((a, b) => b.score - a.score);
}

/**
 * Given an AI response snippet and a list of crawled pages, return the page
 * whose title/topic most closely matches the snippet's wording — a
 * best-effort "likely source" guess. Always label this as inferred in the UI.
 *
 * Simple approach: tokenize the page title into words >3 chars, count how
 * many appear in the snippet (case-insensitive). Highest overlap wins.
 * Returns null if no page scores at least 2 overlapping words.
 */
export function guessLikelySourcePage(
  snippet: string,
  pages: CrawledPage[]
): { url: string; title: string; overlap: number } | null {
  const text = String(snippet || "").toLowerCase();
  if (!text || !pages?.length) return null;

  let best: { url: string; title: string; overlap: number } | null = null;

  for (const p of pages) {
    const title = p.title || "";
    const words = title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3);

    const overlap = words.filter((w) => text.includes(w)).length;

    if (overlap >= 2 && (!best || overlap > best.overlap)) {
      best = { url: p.url, title, overlap };
    }
  }

  return best;
}

/** Convenience: top N pages by GEO score, for "performing best" lists. */
export function topGeoPages(scored: PageGeoScore[], n = 5) {
  return scored.slice(0, n);
}

/** Convenience: bottom N pages with their #1 fix, for "needs optimization" lists. */
export function pagesNeedingWork(scored: PageGeoScore[], n = 5) {
  return scored
    .filter((p) => p.score < 75)
    .slice(-n)
    .reverse();
}
// app/api/ai-visibility/prompts/route.ts
// ---------------------------------------------------------------------------
// Discovers up to 10 natural-question prompts for the audited niche using
// DataForSEO related_keywords. If DataForSEO is unavailable or empty, it
// falls back to 5 solid hardcoded prompts so the feature always works.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { getLocationCode } from "@/lib/dataforseo-config";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

// Turn a raw keyword into a natural question.
function toPrompt(keyword: string, industry: string): string {
  const k = String(keyword || "").toLowerCase();
  if (!k) return `What is the best ${industry}?`;
  if (k.startsWith("best ") || k.startsWith("top ")) return `What is the ${keyword}?`;
  if (k.includes(" vs ") || k.includes("alternative")) return `${keyword} — which is better?`;
  if (k.startsWith("how ") || k.startsWith("what ") || k.startsWith("which ")) {
    return keyword.endsWith("?") ? keyword : keyword + "?";
  }
  return `What is the best ${keyword}?`;
}

// Always-available fallback prompts.
function fallbackPrompts(industry: string): string[] {
  const i = industry || "this category";
  return [
    `What is the best ${i} for small businesses?`,
    `Which ${i} companies do startups use most?`,
    `What are the top alternatives in ${i}?`,
    `Which ${i} provider offers the best value?`,
    `What is the most recommended ${i} solution?`,
  ];
}

export async function discoverPrompts(
  domain: string,
  industry: string,
  competitors: string[] = []
): Promise<string[]> {
  const auth = getAuthHeader();
  if (!auth) return fallbackPrompts(industry);

  try {
    const res = await fetch(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live",
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            keyword: industry,
            location_code: getLocationCode(domain),
            language_code: "en",
            limit: 30,
          },
        ]),
        cache: "no-store",
      }
    );

    const json = await res.json();
    const items = json?.tasks?.[0]?.result?.[0]?.items || [];
    const keywords: string[] = items
      .map((it: any) => it?.keyword_data?.keyword || it?.keyword)
      .filter(Boolean);

    // Prefer keywords that match the category term or a known competitor.
    const firstWord = String(industry || "").toLowerCase().split(" ")[0];
    const filtered = keywords.filter((kw: string) => {
      const lk = kw.toLowerCase();
      return (
        (firstWord && lk.includes(firstWord)) ||
        competitors.some((c) =>
          lk.includes(String(c).toLowerCase().replace(/\.[a-z]+$/, ""))
        )
      );
    });

    const chosen = (filtered.length ? filtered : keywords).slice(0, 10);
    const prompts = chosen.map((kw) => toPrompt(kw, industry));
    return prompts.length ? prompts.slice(0, 10) : fallbackPrompts(industry);
  } catch {
    return fallbackPrompts(industry);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompts = await discoverPrompts(
      body?.domain || "",
      body?.industry || "business services",
      body?.competitors || []
    );
    return NextResponse.json({ success: true, prompts });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "failed", prompts: [] },
      { status: 500 }
    );
  }
}
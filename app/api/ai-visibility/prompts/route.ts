// app/api/ai-visibility/prompts/route.ts
// Prefers the domain's REAL ranked keywords (what it actually competes for) to
// build prompts — far more accurate than guessing a category from the name.
import { NextResponse } from "next/server";
import { getLocationCode } from "@/lib/dataforseo-config";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

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

function fallbackPrompts(industry: string): string[] {
  const i = industry || "this category";
  return [
    `What is the best ${i} company for small businesses?`,
    `Which ${i} brands do people recommend most?`,
    `What are the top alternatives for ${i}?`,
    `Which ${i} brand offers the best value?`,
    `What is the most recommended ${i}?`,
  ];
}

// Pull the domain's actual ranked keywords from DataForSEO Labs.
async function fetchRankedKeywords(domain: string): Promise<string[]> {
  const auth = getAuthHeader();
  if (!auth) return [];
  try {
    const res = await fetch(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live",
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            target: domain,
            location_code: getLocationCode(domain),
            language_code: "en",
            limit: 50,
            order_by: ["keyword_data.keyword_info.search_volume,desc"],
          },
        ]),
        cache: "no-store",
      }
    );
    const json = await res.json();
    const items = json?.tasks?.[0]?.result?.[0]?.items || [];
    return items
      .map((it: any) => it?.keyword_data?.keyword)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function discoverPrompts(
  domain: string,
  industry: string,
  competitors: string[] = [],
  brandName: string = ""
): Promise<string[]> {
  const brandToks = brandName.toLowerCase().split(/[\s.-]+/).filter((t) => t.length >= 3);
  const isBranded = (k: string) =>
    brandToks.length > 0 && brandToks.some((t) => k.toLowerCase().includes(t));

  // 1) BEST: real ranked keywords (non-branded, concise, commercial-ish).
  const ranked = (await fetchRankedKeywords(domain))
    .filter((k) => k && !isBranded(k))
    .filter((k) => k.split(" ").length >= 2 && k.split(" ").length <= 6);

  if (ranked.length >= 3) {
    const top = Array.from(new Set(ranked)).slice(0, 6);
    const prompts = Array.from(new Set(top.map((k) => toPrompt(k, industry))));
    if (prompts.length >= 3) {
      console.log("[ai-visibility] prompts from ranked keywords:", prompts);
      return prompts.slice(0, 5);
    }
  }

  // 2) FALLBACK: related_keywords for the category.
  const auth = getAuthHeader();
  if (auth) {
    try {
      const res = await fetch(
        "https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live",
        {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify([
            { keyword: industry, location_code: getLocationCode(domain), language_code: "en", limit: 30 },
          ]),
          cache: "no-store",
        }
      );
      const json = await res.json();
      const items = json?.tasks?.[0]?.result?.[0]?.items || [];
      const keywords: string[] = items
        .map((it: any) => it?.keyword_data?.keyword || it?.keyword)
        .filter(Boolean)
        .filter((k: string) => !isBranded(k));
      const firstWord = String(industry || "").toLowerCase().split(" ")[0];
      const filtered = keywords.filter((kw: string) => firstWord && kw.toLowerCase().includes(firstWord));
      const source = filtered.length >= 5 ? filtered : keywords;
      let prompts = Array.from(new Set(source.map((kw) => toPrompt(kw, industry))));
      if (prompts.length < 5) prompts = Array.from(new Set([...prompts, ...fallbackPrompts(industry)]));
      return prompts.slice(0, 5);
    } catch {
      /* fall through */
    }
  }

  // 3) LAST RESORT: hardcoded.
  return fallbackPrompts(industry);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompts = await discoverPrompts(
      body?.domain || "",
      body?.industry || "business services",
      body?.competitors || [],
      body?.brandName || ""
    );
    return NextResponse.json({ success: true, prompts });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "failed", prompts: [] },
      { status: 500 }
    );
  }
}
// app/api/ai-visibility/prompts/route.ts  (V2)
// Returns prompts AND ranked-page intel (which page ranks for which keyword)
// from a single DataForSEO ranked_keywords call. Location-aware.
import { NextResponse } from "next/server";
import { getLocationCode } from "@/lib/dataforseo-config";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

export interface RankedItem { keyword: string; url: string; volume: number; position: number; }
export interface RankedPage { url: string; path: string; keywords: { keyword: string; volume: number; position: number }[]; topKeyword: string; totalVolume: number; }

function toPrompt(keyword: string, country: string): string {
  const k = String(keyword || "").toLowerCase();
  const where = country && country.toLowerCase() !== "us" && country.toLowerCase() !== "united states" ? ` in ${country}` : "";
  if (!k) return `What is the best product${where}?`;
  if (k.startsWith("best ") || k.startsWith("top ")) return `What is the ${keyword}${where}?`;
  if (k.includes(" vs ") || k.includes("alternative")) return `${keyword} — which is better?`;
  if (k.startsWith("how ") || k.startsWith("what ") || k.startsWith("which ")) return keyword.endsWith("?") ? keyword : keyword + "?";
  return `What is the best ${keyword}${where}?`;
}
function fallbackPrompts(industry: string, country: string): string[] {
  const w = country && country.toLowerCase() !== "us" ? ` in ${country}` : "";
  const i = industry || "this category";
  return [
    `What is the best ${i} brand${w}?`,
    `Which ${i} brands do people recommend most${w}?`,
    `What are the top ${i} options${w}?`,
  ];
}

async function fetchRankedItems(domain: string, locationCode: number): Promise<RankedItem[]> {
  const auth = getAuthHeader();
  if (!auth) return [];
  try {
    const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([{
        target: domain, location_code: locationCode, language_code: "en", limit: 60,
        order_by: ["keyword_data.keyword_info.search_volume,desc"],
      }]),
      cache: "no-store",
    });
    const json = await res.json();
    const items = json?.tasks?.[0]?.result?.[0]?.items || [];
    return items.map((it: any) => ({
      keyword: it?.keyword_data?.keyword,
      url: it?.ranked_serp_element?.serp_item?.url || "",
      volume: it?.keyword_data?.keyword_info?.search_volume || 0,
      position: it?.ranked_serp_element?.serp_item?.rank_absolute || it?.ranked_serp_element?.serp_item?.rank_group || 0,
    })).filter((x: RankedItem) => x.keyword);
  } catch {
    return [];
  }
}

function buildRankedPages(items: RankedItem[]): RankedPage[] {
  const byUrl = new Map<string, RankedItem[]>();
  items.forEach((it) => {
    if (!it.url) return;
    if (!byUrl.has(it.url)) byUrl.set(it.url, []);
    byUrl.get(it.url)!.push(it);
  });
  const pages: RankedPage[] = Array.from(byUrl.entries()).map(([url, kws]) => {
    const sorted = kws.sort((a, b) => b.volume - a.volume);
    let path = url;
    try { path = new URL(url).pathname || "/"; } catch {}
    return {
      url, path,
      keywords: sorted.slice(0, 8).map((k) => ({ keyword: k.keyword, volume: k.volume, position: k.position })),
      topKeyword: sorted[0]?.keyword || "",
      totalVolume: kws.reduce((s, k) => s + (k.volume || 0), 0),
    };
  });
  return pages.sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 8);
}

// Main: returns prompts + ranked page intel from ONE ranked_keywords call.
export async function getKeywordIntel(
  domain: string, industry: string, brandName: string, locationCode: number, country: string
): Promise<{ prompts: string[]; rankedPages: RankedPage[] }> {
  const brandToks = brandName.toLowerCase().split(/[\s.-]+/).filter((t) => t.length >= 3);
  const isBranded = (k: string) => brandToks.length > 0 && brandToks.some((t) => k.toLowerCase().includes(t));

  const items = await fetchRankedItems(domain, locationCode);
  const rankedPages = buildRankedPages(items);

  const commercial = items
    .filter((it) => it.keyword && !isBranded(it.keyword))
    .filter((it) => { const w = it.keyword.split(" ").length; return w >= 2 && w <= 6; })
    .sort((a, b) => b.volume - a.volume);

  let prompts = Array.from(new Set(commercial.map((it) => toPrompt(it.keyword, country)))).slice(0, 4);
  if (prompts.length < 3) prompts = Array.from(new Set([...prompts, ...fallbackPrompts(industry, country)])).slice(0, 4);

  console.log("[ai-visibility] prompts:", prompts, "| ranked pages:", rankedPages.length, "| country:", country);
  return { prompts, rankedPages };
}

// Back-compat wrapper.
export async function discoverPrompts(domain: string, industry: string, competitors: string[] = [], brandName = ""): Promise<string[]> {
  const { prompts } = await getKeywordIntel(domain, industry, brandName, getLocationCode(domain), "US");
  return prompts;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompts, rankedPages } = await getKeywordIntel(
      body?.domain || "", body?.industry || "business services",
      body?.brandName || "", body?.locationCode || getLocationCode(body?.domain || ""), body?.country || "US"
    );
    return NextResponse.json({ success: true, prompts, rankedPages });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "failed", prompts: [], rankedPages: [] }, { status: 500 });
  }
}
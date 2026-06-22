// app/api/ai-visibility/prompts/route.ts  (V3)
// - Detects the REAL market from DataForSEO (data-driven, not a guess)
// - Builds CLEAN category prompts from real keywords via OpenAI (no junk prompts)
// - Returns ranked-page intel (which page ranks for which keyword)
import { NextResponse } from "next/server";
import { getLocationCode } from "@/lib/dataforseo-config";
import { queryOpenAI } from "../query/route";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

export interface RankedItem { keyword: string; url: string; volume: number; position: number; }
export interface RankedPage { url: string; path: string; keywords: { keyword: string; volume: number; position: number }[]; topKeyword: string; totalVolume: number; }

const PROBE_LOCATIONS = [
  { code: 2840, country: "US" }, { code: 2586, country: "Pakistan" }, { code: 2356, country: "India" },
  { code: 2784, country: "UAE" }, { code: 2826, country: "United Kingdom" },
];

async function rankedCount(domain: string, locationCode: number): Promise<number> {
  const auth = getAuthHeader();
  if (!auth) return 0;
  try {
    const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live", {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([{ target: domain, location_code: locationCode, language_code: "en", limit: 1 }]),
      cache: "no-store",
    });
    const json = await res.json();
    return json?.tasks?.[0]?.result?.[0]?.total_count || 0;
  } catch { return 0; }
}

// Find the country where the domain actually ranks the most.
export async function detectMarket(domain: string): Promise<{ locationCode: number; country: string }> {
  const tldCode = getLocationCode(domain);
  if (tldCode !== 2840) {
    const found = PROBE_LOCATIONS.find((p) => p.code === tldCode);
    return { locationCode: tldCode, country: found?.country || "US" };
  }
  // Ambiguous TLD (.com/.co/...) → probe candidate markets in parallel.
  const counts = await Promise.all(PROBE_LOCATIONS.map((p) => rankedCount(domain, p.code)));
  let best = { code: 2840, country: "US", count: -1 };
  PROBE_LOCATIONS.forEach((p, i) => { if (counts[i] > best.count) best = { code: p.code, country: p.country, count: counts[i] }; });
  return { locationCode: best.code, country: best.country };
}

async function fetchRankedItems(domain: string, locationCode: number): Promise<RankedItem[]> {
  const auth = getAuthHeader();
  if (!auth) return [];
  try {
    const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live", {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify([{ target: domain, location_code: locationCode, language_code: "en", limit: 60, order_by: ["keyword_data.keyword_info.search_volume,desc"] }]),
      cache: "no-store",
    });
    const json = await res.json();
    const items = json?.tasks?.[0]?.result?.[0]?.items || [];
    return items.map((it: any) => ({
      keyword: it?.keyword_data?.keyword, url: it?.ranked_serp_element?.serp_item?.url || "",
      volume: it?.keyword_data?.keyword_info?.search_volume || 0,
      position: it?.ranked_serp_element?.serp_item?.rank_absolute || it?.ranked_serp_element?.serp_item?.rank_group || 0,
    })).filter((x: RankedItem) => x.keyword);
  } catch { return []; }
}

function buildRankedPages(items: RankedItem[]): RankedPage[] {
  const byUrl = new Map<string, RankedItem[]>();
  items.forEach((it) => { if (!it.url) return; if (!byUrl.has(it.url)) byUrl.set(it.url, []); byUrl.get(it.url)!.push(it); });
  return Array.from(byUrl.entries()).map(([url, kws]) => {
    const sorted = kws.sort((a, b) => b.volume - a.volume);
    let path = url; try { path = new URL(url).pathname || "/"; } catch {}
    return { url, path, keywords: sorted.slice(0, 8).map((k) => ({ keyword: k.keyword, volume: k.volume, position: k.position })), topKeyword: sorted[0]?.keyword || "", totalVolume: kws.reduce((s, k) => s + (k.volume || 0), 0) };
  }).sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 8);
}

// Turn real keywords into 3 CLEAN buyer questions via OpenAI (no junk like "best glacier arcade").
async function buildCleanPrompts(keywords: string[], country: string, brandName = "", industry = ""): Promise<string[]> {
const top = keywords.slice(0, 20).join(", ");
  const where = country && country.toLowerCase() !== "us" ? ` Focus on the ${country} market.` : "";
  try {
const ai = await queryOpenAI(
      `A company called "${brandName}"${industry ? ` (industry: ${industry})` : ""} ranks in Google for these search terms: ${top}. ` +
      `IMPORTANT: some of these terms are UNRELATED topics the site only ranks for by accident (e.g. news, prayer times, or prices of products the company does NOT sell). ` +
      `Step 1: from the company name and the terms, work out the company's ACTUAL core products or services. ` +
      `Step 2: write exactly 5 natural questions a shopper would ask an AI assistant when looking to BUY or CHOOSE those core products/services.${where} ` +
      `Rules: ONLY cover the company's real core categories — discard every unrelated term. Do NOT mention "${brandName}" or any specific brand, store, or company name in the questions. Each question on its own line, no numbering, each ends with a question mark.`
    );
    const lines = (ai || "").split("\n").map((l) => l.replace(/^[\d.)\-\s]+/, "").trim()).filter((l) => l.length > 8 && l.includes("?"));
    if (lines.length >= 2) return lines.slice(0, 5);
  } catch { /* fall through */ }
  // Fallback: simple "best X" from top keywords.
  const w = country && country.toLowerCase() !== "us" ? ` in ${country}` : "";
  return keywords.slice(0, 5).map((k) => `What is the best ${k}${w}?`);
}

// Main: market + ranked pages + clean prompts (one place).
export async function getKeywordIntel(
  domain: string, industry: string, brandName: string
): Promise<{ prompts: string[]; rankedPages: RankedPage[]; country: string; locationCode: number }> {
  const { locationCode, country } = await detectMarket(domain);
  const items = await fetchRankedItems(domain, locationCode);
  const rankedPages = buildRankedPages(items);

  const brandToks = brandName.toLowerCase().split(/[\s.-]+/).filter((t) => t.length >= 3);
  const isBranded = (k: string) => brandToks.length > 0 && brandToks.some((t) => k.toLowerCase().includes(t));
  const cleanKw = Array.from(new Set(
    items.filter((it) => it.keyword && !isBranded(it.keyword))
      .filter((it) => { const w = it.keyword.split(" ").length; return w >= 2 && w <= 6; })
      .sort((a, b) => b.volume - a.volume).map((it) => it.keyword)
  ));

  const seedKw = cleanKw.length ? cleanKw : items.map((i) => i.keyword);
  const prompts = (await buildCleanPrompts(seedKw, country, brandName, industry)).slice(0, 5);

  console.log("[ai-visibility] market:", country, "| prompts:", prompts, "| pages:", rankedPages.length);
  return { prompts, rankedPages, country, locationCode };
}

// Back-compat
export async function discoverPrompts(domain: string, industry = "", competitors: string[] = [], brandName = ""): Promise<string[]> {
  const { prompts } = await getKeywordIntel(domain, industry, brandName);
  return prompts;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const intel = await getKeywordIntel(body?.domain || "", body?.industry || "business services", body?.brandName || "");
    return NextResponse.json({ success: true, ...intel });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "failed", prompts: [], rankedPages: [] }, { status: 500 });
  }
}
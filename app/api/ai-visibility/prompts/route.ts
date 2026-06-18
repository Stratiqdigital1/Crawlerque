// app/api/ai-visibility/prompts/route.ts  (UPDATED — guarantees 5+ varied prompts)
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
    `Which ${i} providers do startups use most?`,
    `What are the top alternatives for ${i}?`,
    `Which ${i} company offers the best value?`,
    `What is the most recommended ${i} agency?`,
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

    // Prefer filtered keywords, but only if we have a few; otherwise use all.
    const source = filtered.length >= 5 ? filtered : keywords;
    let prompts = Array.from(new Set(source.map((kw) => toPrompt(kw, industry))));

    // Always guarantee at least 5 varied prompts by topping up with fallbacks.
    if (prompts.length < 5) {
      prompts = Array.from(new Set([...prompts, ...fallbackPrompts(industry)]));
    }

    return prompts.slice(0, 10);
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
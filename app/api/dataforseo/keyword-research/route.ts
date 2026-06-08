import { NextResponse } from "next/server";
import { LOCATION_CODE, LANGUAGE_CODE } from "@/lib/dataforseo-config";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) return null;

  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dataForSeoPost(endpoint: string, payload: any[]) {
  const auth = getAuthHeader();

  if (!auth) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  }

  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.status_message || "DataForSEO Keyword Research failed");
  }

  return json;
}

function detectIntent(keyword: string) {
  const k = keyword.toLowerCase();

  if (
    k.includes("price") ||
    k.includes("cost") ||
    k.includes("buy") ||
    k.includes("near me") ||
    k.includes("discount") ||
    k.includes("coupon")
  ) {
    return "Commercial";
  }

  if (
    k.includes("best") ||
    k.includes("top") ||
    k.includes("review") ||
    k.includes("vs") ||
    k.includes("alternative")
  ) {
    return "Comparison";
  }

  if (
    k.includes("how") ||
    k.includes("what") ||
    k.includes("why") ||
    k.includes("guide")
  ) {
    return "Informational";
  }

  return "General";
}

function getOpportunity(volume: number, competition: number) {
  if (!volume) return 0;

  const comp = Number(competition || 0);
  const score = Math.round(volume / Math.max(1, comp * 100));

  return Math.min(100, Math.max(1, score));
}

export async function GET() {
  return runKeywordResearch({
    seedKeyword: "multifamily real estate los angeles",
    locationName: "United States",
    languageName: "English",
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const seedKeyword =
    body?.seedKeyword ||
    body?.keyword ||
    body?.brandName ||
    body?.domain ||
    "business services";

  return runKeywordResearch({
    seedKeyword,
    locationName: body?.locationName || "United States",
    languageName: body?.languageName || "English",
  });
}

async function runKeywordResearch({
  seedKeyword,
  locationName,
  languageName,
}: {
  seedKeyword: string;
  locationName: string;
  languageName: string;
}) {
  try {
    const res = await dataForSeoPost(
      "dataforseo_labs/google/keyword_suggestions/live",
      [
        {
          keyword: seedKeyword,
          location_code: LOCATION_CODE,
language_code: LANGUAGE_CODE,
          limit: 100,
        },
      ]
    );

    const items = res?.tasks?.[0]?.result?.[0]?.items || [];

    const suggestions = items
      .map((item: any) => {
        const keyword =
          item?.keyword ||
          item?.keyword_data?.keyword ||
          item?.keyword_data?.keyword_info?.keyword ||
          "";

        const volume =
          item?.keyword_info?.search_volume ||
          item?.keyword_data?.keyword_info?.search_volume ||
          0;

        const cpc =
          item?.keyword_info?.cpc ||
          item?.keyword_data?.keyword_info?.cpc ||
          0;

        const competition =
          item?.keyword_info?.competition ||
          item?.keyword_data?.keyword_info?.competition ||
          0;

        const difficulty =
          item?.keyword_properties?.keyword_difficulty ||
          item?.keyword_data?.keyword_properties?.keyword_difficulty ||
          null;

        const intent = detectIntent(keyword);

        return {
          keyword,
          volume,
          cpc,
          competition,
          difficulty,
          intent,
          opportunity: getOpportunity(Number(volume), Number(competition)),
        };
      })
      .filter((item: any) => {
        const keyword = String(item.keyword || "").toLowerCase();

        return (
          item.keyword &&
          item.keyword.length > 2 &&
          !keyword.includes("movie") &&
          !keyword.includes("song") &&
          !keyword.includes("lyrics") &&
          !keyword.includes("reddit") &&
          !keyword.includes("youtube") &&
          !keyword.includes("tiktok")
        );
      })
      .sort((a: any, b: any) => {
        if (b.opportunity !== a.opportunity) {
          return b.opportunity - a.opportunity;
        }

        return Number(b.volume || 0) - Number(a.volume || 0);
      })
      .slice(0, 30);

    return NextResponse.json({
      success: true,
      keywordResearch: {
        seedKeyword,
        location: locationName,
        suggestions,
        commercialKeywords: suggestions.filter(
          (k: any) => k.intent === "Commercial"
        ),
        comparisonKeywords: suggestions.filter(
          (k: any) => k.intent === "Comparison"
        ),
        informationalKeywords: suggestions.filter(
          (k: any) => k.intent === "Informational"
        ),
        source: "DataForSEO Keyword Suggestions API",
      },
    });
  } catch (error) {
    console.error("Keyword Research API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Keyword Research API failed",
      },
      { status: 500 }
    );
  }
}
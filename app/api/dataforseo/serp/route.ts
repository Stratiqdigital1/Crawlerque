import { NextResponse } from "next/server";

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
  }
}

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
    console.error("DataForSEO SERP failed:", json);
    throw new Error(json?.status_message || "DataForSEO SERP failed");
  }

  return json;
}

function extractRank(result: any, domain: string) {
  const items = result?.tasks?.[0]?.result?.[0]?.items || [];

  const match = items.find((item: any) => {
    const url = item?.url || item?.domain || "";
    return String(url).includes(domain);
  });

  return {
    found: !!match,
    rank: match?.rank_group || match?.rank_absolute || null,
    title: match?.title || "",
    url: match?.url || "",
  };
}

export async function GET() {
  return runSerp({
    url: "https://losangelesmultifamilyrealtor.com",
    keywords: [
      "los angeles multifamily realtor",
      "multifamily real estate los angeles",
      "apartment buildings for sale los angeles",
    ],
    locationName: "United States",
    locationCode: 2840,
    languageName: "English",
    languageCode: "en",
    device: "desktop",
    searchEngine: "google",
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return runSerp({
    url: body?.url || body?.domain,
    keywords: body?.keywords || [],
    locationName: body?.locationName || "United States",
    locationCode: Number(body?.locationCode || 2840),
    languageName: body?.languageName || "English",
    languageCode: body?.languageCode || "en",
    device: body?.device === "desktop" ? "desktop" : "mobile",
    searchEngine: String(body?.searchEngine || "google").toLowerCase(),
  });
}

async function runSerp({
  url,
  keywords,
  locationName,
  locationCode,
  languageName,
  languageCode,
  device,
  searchEngine,
}: {
  url: string;
  keywords: string[];
  locationName: string;
  locationCode: number;
  languageName: string;
  languageCode: string;
  device: "mobile" | "desktop";
  searchEngine: string;
}) {
  try {
    const domain = normalizeDomain(url);

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    if (searchEngine !== "google") {
      return NextResponse.json(
        {
          success: false,
          error: "Google is currently the supported search engine for complete audits.",
        },
        { status: 400 }
      );
    }

    const finalKeywords =
      keywords?.length > 0
        ? keywords.slice(0, 5)
        : [`${domain} services`, domain];

    const results = [];

    for (const keyword of finalKeywords) {
      const payload = [
        {
          keyword,
          location_code: locationCode,
          language_code: languageCode,
          device,
          os: device === "mobile" ? "android" : "windows",
          depth: 100,
        },
      ];

      const serp = await dataForSeoPost(
        "serp/google/organic/live/advanced",
        payload
      );
      const rankData = extractRank(serp, domain);

      results.push({
        keyword,
        ...rankData,
      });
    }

    const foundCount = results.filter((item) => item.found).length;
    const avgRankItems = results.filter((item) => item.rank);
    const avgRank =
      avgRankItems.length > 0
        ? Math.round(
            avgRankItems.reduce(
              (sum, item: any) => sum + Number(item.rank || 0),
              0
            ) / avgRankItems.length
          )
        : null;

    return NextResponse.json({
      success: true,
      serpData: {
        domain,
        country: locationName,
        locationCode,
        language: languageName,
        languageCode,
        device,
        searchEngine,
        checkedKeywords: results.length,
        foundCount,
        avgRank,
        results,
        source: "DataForSEO SERP API",
      },
    });
  } catch (error) {
    console.error("SERP route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "SERP route failed",
      },
      { status: 500 }
    );
  }
}

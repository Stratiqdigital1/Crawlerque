import { NextResponse } from "next/server";
import {
  LANGUAGE_CODE,
  getLocationCode,
} from "@/lib/dataforseo-config";

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .trim();
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

  const response = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`DataForSEO ${endpoint} request failed`);
  }

  return json;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Domain Analytics API working. Use POST with a domain.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputUrl = String(body?.url || body?.domain || "").trim();
    const domain = normalizeDomain(inputUrl);

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    const locationCode =
      Number(body?.locationCode || 0) ||
      getLocationCode(domain);

    const languageCode = String(body?.languageCode || LANGUAGE_CODE);

    const [rankResponse, similarwebResponse] = await Promise.all([
      dataForSeoPost("dataforseo_labs/google/domain_rank_overview/live", [
        {
          target: domain,
          location_code: locationCode,
          language_code: languageCode,
          include_clickstream_data: true,
        },
      ]),
      dataForSeoPost("domain_analytics/similarweb/live", [
        {
          target: domain,
        },
      ]).catch(() => null),
    ]);

    const rankItem =
      rankResponse?.tasks?.[0]?.result?.[0]?.items?.[0] ||
      rankResponse?.tasks?.[0]?.result?.[0] ||
      {};

    const similarwebItem =
      similarwebResponse?.tasks?.[0]?.result?.[0]?.items?.[0] ||
      similarwebResponse?.tasks?.[0]?.result?.[0] ||
      {};

    const organic = rankItem?.metrics?.organic || {};
    const paid = rankItem?.metrics?.paid || {};

    const organicTrafficSignal = Number(
      organic?.clickstream_etv ??
        organic?.etv ??
        0
    ) || 0;

    const similarwebVisitsSignal = Number(
      similarwebItem?.monthly_visits ||
        similarwebItem?.visits ||
        similarwebItem?.total_visits ||
        0
    ) || 0;

    return NextResponse.json({
      success: true,
      domainAnalytics: {
        domain,
        locationCode,
        languageCode,
        organicKeywords: Number(organic?.count || 0),
        organicTraffic: organicTrafficSignal,
        organicTrafficSignal,
        organicCost: Number(organic?.estimated_paid_traffic_cost || 0),
        paidKeywords: Number(paid?.count || 0),
        paidTraffic: Number(paid?.etv || 0),
        paidCost: Number(paid?.estimated_paid_traffic_cost || 0),
        similarwebVisits: similarwebVisitsSignal,
        similarwebVisitsSignal,
        rank: Number(rankItem?.rank || 0),
        source: "DataForSEO Domain Analytics",
        metricRole: "provider-signal-only",
        isCanonicalTraffic: false,
        note:
          "Provider signals are shown for context and are excluded from the executive Traffic Intelligence estimate.",
      },
    });
  } catch (error) {
    console.error("Domain Analytics failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Domain Analytics failed",
      },
      { status: 500 }
    );
  }
}

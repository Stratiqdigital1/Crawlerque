import { NextResponse } from "next/server";
import { LOCATION_CODE, LANGUAGE_CODE } from "@/lib/dataforseo-config";

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

  return res.json();
}

export async function GET() {
  return runDomainAnalytics("https://losangelesmultifamilyrealtor.com");
}

export async function POST(req: Request) {
  const body = await req.json();

  return runDomainAnalytics(body?.url || body?.domain);
}

async function runDomainAnalytics(inputUrl: string) {
  try {
    const domain = normalizeDomain(inputUrl);

    if (!domain) {
      return NextResponse.json(
        {
          success: false,
          error: "Domain is required",
        },
        { status: 400 }
      );
    }

const [response, similarwebResponse] = await Promise.all([
  dataForSeoPost(
    "dataforseo_labs/google/domain_rank_overview/live",
    [
      {
        target: domain,
        location_code: LOCATION_CODE,
language_code: LANGUAGE_CODE,
        include_clickstream_data: true,
      },
    ]
  ),

  dataForSeoPost(
    "domain_analytics/similarweb/live",
    [
      {
        target: domain,
      },
    ]
  ).catch(() => null),
]);

const item =
  response?.tasks?.[0]?.result?.[0]?.items?.[0] ||
  response?.tasks?.[0]?.result?.[0] ||
  {};

const similarwebItem =
  similarwebResponse?.tasks?.[0]?.result?.[0]?.items?.[0] ||
  similarwebResponse?.tasks?.[0]?.result?.[0] ||
  {};

    const organic =
      item?.metrics?.organic || {};

const paid =
  item?.metrics?.paid || {};

const similarwebVisits =
  Number(
    similarwebItem?.monthly_visits ||
    similarwebItem?.visits ||
    similarwebItem?.total_visits ||
    0
  ) || 0;

    return NextResponse.json({
      success: true,
      domainAnalytics: {
        domain,

        organicKeywords:
          organic?.count || 0,

organicTraffic:
  organic?.clickstream_etv ??
  organic?.etv ??
  0,

        organicCost:
          organic?.estimated_paid_traffic_cost || 0,

        paidKeywords:
          paid?.count || 0,

        paidTraffic:
          paid?.etv || 0,

paidCost:
  paid?.estimated_paid_traffic_cost || 0,

similarwebVisits,

rank:
  item?.rank || 0,

        source:
          "DataForSEO Domain Analytics",
      },
    });
  } catch (error) {
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
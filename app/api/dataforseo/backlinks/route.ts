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
    console.error("DataForSEO backlinks failed:", json);
    throw new Error(json?.status_message || "DataForSEO backlinks failed");
  }

  return json;
}

export async function GET() {
  return runBacklinks({
    url: "https://losangelesmultifamilyrealtor.com",
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return runBacklinks({
    url: body?.url || body?.domain,
  });
}

async function runBacklinks({ url }: { url: string }) {
  try {
    const domain = normalizeDomain(url);

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    const payload = [
      {
        target: domain,
        limit: 10,
      },
    ];

    const summary = await dataForSeoPost("backlinks/summary/live", payload);

    const item =
      summary?.tasks?.[0]?.result?.[0] ||
      summary?.tasks?.[0]?.result?.[0]?.items?.[0] ||
      {};

    const backlinks = item.backlinks || item.backlinks_count || 0;
    const referringDomains =
      item.referring_domains || item.referring_domains_count || 0;
    const referringPages =
      item.referring_pages || item.referring_pages_count || 0;

    const authorityScore = Math.min(
      100,
      Math.round(
        Math.log10(referringDomains + 1) * 22 +
          Math.log10(backlinks + 1) * 10
      )
    );

    return NextResponse.json({
      success: true,
      backlinksData: {
        domain,
        backlinks,
        referringDomains,
        referringPages,
        authorityScore,
        source: "DataForSEO Backlinks API",
        raw: summary,
      },
    });
  } catch (error) {
    console.error("Backlinks route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Backlinks route failed",
      },
      { status: 500 }
    );
  }
}
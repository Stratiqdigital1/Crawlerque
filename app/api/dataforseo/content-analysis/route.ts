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

  if (!auth) throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");

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
  return runContentAnalysis({
    url: "https://losangelesmultifamilyrealtor.com",
    keyword: "multifamily real estate los angeles",
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return runContentAnalysis({
    url: body?.url || body?.domain,
    keyword: body?.keyword || body?.seedKeyword || body?.domain || "business services",
  });
}

async function runContentAnalysis({
  url,
  keyword,
}: {
  url: string;
  keyword: string;
}) {
  try {
    const domain = normalizeDomain(url);

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    const res = await dataForSeoPost("content_analysis/search/live", [
      {
        keyword,
        search_mode: "as_is",
        limit: 20,
      },
    ]);

    const items = res?.tasks?.[0]?.result?.[0]?.items || [];

    return NextResponse.json({
      success: true,
      contentAnalysis: {
        domain,
        keyword,
        results: items.slice(0, 20).map((item: any) => ({
          url: item.url || "",
          domain: item.domain || "",
          title: item.title || "",
          mainTopic: item.main_topic || "",
          sentiment: item.sentiment_connotations || null,
          contentLength: item.content_info?.plain_text_size || null,
          mediaCount: item.content_info?.media_count || null,
        })),
        source: "DataForSEO Content Analysis API",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Content Analysis failed",
      },
      { status: 500 }
    );
  }
}
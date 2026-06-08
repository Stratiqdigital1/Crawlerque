import { NextResponse } from "next/server";

function normalizeUrl(input: string) {
  if (!input) return "";
  const trimmed = input.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

function getDomain(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  }

  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dataForSeoPost(endpoint: string, payload: any[]) {
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = normalizeUrl(body?.url || body?.domain);

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const taskRes = await dataForSeoPost("on_page/task_post", [
      {
        target: getDomain(url),
        start_url: url,
        max_crawl_pages: Number(body?.maxCrawlPages || 100),
        load_resources: true,
        enable_javascript: true,
        check_spell: false,
        tag: "website-audit-onpage-async",
      },
    ]);

    const taskId = taskRes?.tasks?.[0]?.id;

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: "OnPage task could not be created",
        raw: taskRes,
      });
    }

    return NextResponse.json({
      success: true,
      taskId,
      message: "OnPage crawl started",
      raw: taskRes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "OnPage start failed",
      },
      { status: 500 }
    );
  }
}
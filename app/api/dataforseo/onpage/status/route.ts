import { NextResponse } from "next/server";

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  }

  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dataForSeoGet(endpoint: string) {
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  return res.json();
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

function getResult(json: any) {
  return json?.tasks?.[0]?.result?.[0] || null;
}

function getItems(json: any) {
  return json?.tasks?.[0]?.result?.[0]?.items || [];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "taskId is required" },
        { status: 400 }
      );
    }

    const summaryRes = await dataForSeoGet(`on_page/summary/${taskId}`);

    const pagesRes = await dataForSeoPost("on_page/pages", [
      {
        id: taskId,
        limit: 100,
        offset: 0,
      },
    ]);

    const summary = getResult(summaryRes);
    const pages = getItems(pagesRes);

    const onPage = {
      taskId,

      crawlStatus:
        summary?.crawl_progress ||
        summary?.crawl_status ||
        summary?.status ||
        (pages.length > 0 ? "completed" : "pending"),

      crawledPages:
        pages.length ||
        Number(summary?.crawled_pages || summary?.pages_crawled || 0),

      internalLinks:
        summary?.internal_links_count ||
        summary?.internal_links ||
        0,

      externalLinks:
        summary?.external_links_count ||
        summary?.external_links ||
        0,

      brokenLinks:
        summary?.broken_links ||
        summary?.checks?.broken_links ||
        0,

      duplicateTitle:
        summary?.duplicate_title ||
        summary?.duplicate_titles ||
        0,

      duplicateDescription:
        summary?.duplicate_description ||
        summary?.duplicate_descriptions ||
        0,

      missingTitle:
        summary?.no_title ||
        summary?.missing_title ||
        0,

      missingDescription:
        summary?.no_description ||
        summary?.missing_description ||
        0,

      pages: pages.map((p: any) => ({
        url: p.url || "",
        statusCode: p.status_code || p.status || null,
        title: p.meta?.title || p.title || "",
        description: p.meta?.description || p.description || "",
        h1: p.meta?.htags?.h1 || p.htags?.h1 || [],
        size: p.size || p.page_size || 0,
        loadTime:
          p.page_timing?.time_to_interactive ||
          p.page_timing?.duration_time ||
          p.load_time ||
          0,
        checks: p.checks || {},
      })),

      rawSummary: summary,
      rawSummaryStatus:
        summaryRes?.tasks?.[0]?.status_message || summaryRes?.status_message,

      rawPagesStatus:
        pagesRes?.tasks?.[0]?.status_message || pagesRes?.status_message,
    };

    return NextResponse.json({
      success: true,
      onPage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "OnPage status failed",
      },
      { status: 500 }
    );
  }
}
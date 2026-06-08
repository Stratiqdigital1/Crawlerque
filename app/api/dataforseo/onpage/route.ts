import { NextResponse } from "next/server";

function normalizeUrl(input: string) {
  if (!input) return "";

  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
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
    console.error("DataForSEO OnPage API failed:", endpoint, json);
  }

  return json;
}
async function dataForSeoGet(endpoint: string) {
  const auth = getAuthHeader();

  if (!auth) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  }

  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
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

function getStatusMessage(json: any) {
  return json?.tasks?.[0]?.status_message || json?.status_message || "";
}

function isFinished(summary: any, pages: any[]) {
  const crawlProgress = summary?.crawl_progress;
  const crawlStatus = summary?.crawl_status || summary?.status;

  if (pages.length > 0 && summary?.pages_in_queue === 0) return true;

  if (typeof crawlProgress === "string") {
    const value = crawlProgress.toLowerCase();
    if (
      value.includes("finished") ||
      value.includes("completed") ||
      value.includes("done")
    ) {
      return true;
    }
  }

  if (typeof crawlStatus === "string") {
    const value = crawlStatus.toLowerCase();
    if (
      value.includes("finished") ||
      value.includes("completed") ||
      value.includes("done")
    ) {
      return true;
    }
  }

  if (typeof crawlProgress === "number" && crawlProgress >= 100) {
    return true;
  }

  return false;
}

export async function GET() {
  return runOnPageAudit({
    inputUrl: "https://losangelesmultifamilyrealtor.com",
    maxCrawlPages: 100,
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return runOnPageAudit({
    inputUrl: body?.url || body?.domain,
    maxCrawlPages: Number(body?.maxCrawlPages || 100),
  });
}

async function runOnPageAudit({
  inputUrl,
  maxCrawlPages,
}: {
  inputUrl: string;
  maxCrawlPages: number;
}) {
  try {
    const url = normalizeUrl(inputUrl);

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const taskRes = await dataForSeoPost("on_page/task_post", [
      {
        target: new URL(url).hostname.replace(/^www\./, ""),
start_url: url,
        max_crawl_pages: maxCrawlPages,
        load_resources: true,
        enable_javascript: true,
        check_spell: false,
        custom_js: "",
        tag: "website-audit-full-onpage",
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

    let summaryRes: any = null;
    let pagesRes: any = null;
    let summary: any = null;
    let pages: any[] = [];

    /*
      Full crawl wait:
      30 attempts x 10 sec = up to 5 minutes.
      Time issue nahi hai, isliye yeh complete crawl ka wait karega.
    */
    for (let attempt = 1; attempt <= 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      summaryRes = await dataForSeoGet(`on_page/summary/${taskId}`);

pagesRes = await dataForSeoPost("on_page/pages", [
  {
    id: taskId,
    limit: maxCrawlPages,
    offset: 0,
  },
]);

      summary = getResult(summaryRes);
      pages = getItems(pagesRes);

      console.log("ONPAGE CRAWL POLL", {
        attempt,
        taskId,
        summaryStatus: getStatusMessage(summaryRes),
        pagesStatus: getStatusMessage(pagesRes),
        pagesFound: pages.length,
        crawlProgress: summary?.crawl_progress,
        crawlStatus: summary?.crawl_status || summary?.status,
        pagesInQueue: summary?.pages_in_queue,
      });

      if (isFinished(summary, pages)) {
        break;
      }
    }

    const brokenLinks =
      summary?.broken_links ||
      summary?.checks?.broken_links ||
      summary?.checks?.is_broken ||
      0;

    const duplicateTitle =
      summary?.duplicate_title ||
      summary?.duplicate_titles ||
      summary?.checks?.duplicate_title ||
      0;

    const duplicateDescription =
      summary?.duplicate_description ||
      summary?.duplicate_descriptions ||
      summary?.checks?.duplicate_description ||
      0;

    const missingTitle =
      summary?.no_title ||
      summary?.missing_title ||
      summary?.checks?.no_title ||
      0;

    const missingDescription =
      summary?.no_description ||
      summary?.missing_description ||
      summary?.checks?.no_description ||
      0;

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

      brokenLinks,
      duplicateTitle,
      duplicateDescription,
      missingTitle,
      missingDescription,

      pages: pages.slice(0, maxCrawlPages).map((p: any) => ({
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
      rawSummaryStatus: getStatusMessage(summaryRes),
      rawPagesStatus: getStatusMessage(pagesRes),
    };

    return NextResponse.json({
      success: true,
      onPage,
    });
  } catch (error) {
    console.error("DataForSEO OnPage route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "DataForSEO OnPage failed",
      },
      { status: 500 }
    );
  }
}
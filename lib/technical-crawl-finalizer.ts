import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  commitAuditUsage,
  failAuditAndRestoreCredit,
} from "@/lib/audit-usage";
import { reconcileAuditReport } from "@/lib/audit-reconciliation";

export type TechnicalState =
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "timed_out";

type JsonRecord = Record<string, unknown>;

type PollTechnicalAuditInput = {
  jobId: string;
  userId?: string | null;
  expectedTaskId?: string | null;
  expectedInputHash?: string | null;
  expectedDomain?: string | null;
  finalAttempt?: boolean;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown, fallback = "") {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return fallback;
}

function readNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function firstDefined(...values: unknown[]) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function getFirstTask(value: unknown) {
  const tasks = asArray(asRecord(value).tasks);
  return asRecord(tasks[0]);
}

function getFirstResult(value: unknown) {
  const results = asArray(getFirstTask(value).result);
  return asRecord(results[0]);
}

function getItems(value: unknown) {
  return asArray(getFirstResult(value).items);
}

function toPrismaJsonObject(
  value: Prisma.JsonValue | null | undefined
): Prisma.JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Prisma.JsonObject;
  }
  return {};
}

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  }

  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  attempts = 3
): Promise<unknown> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      const json: unknown = await response.json();

      if (response.ok) return json;

      const status = response.status;
      const retryable = status === 408 || status === 429 || status >= 500;
      lastError = new Error(`${label} failed with HTTP ${status}`);

      if (!retryable || attempt === attempts) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
    }

    await sleep(500 * 2 ** (attempt - 1));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${label} failed`);
}

async function dataForSeoGet(endpoint: string) {
  return fetchWithRetry(
    `https://api.dataforseo.com/v3/${endpoint}`,
    {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
    "DataForSEO OnPage summary"
  );
}

async function dataForSeoPost(
  endpoint: string,
  payload: Array<Record<string, unknown>>
) {
  return fetchWithRetry(
    `https://api.dataforseo.com/v3/${endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "DataForSEO OnPage pages"
  );
}

function determineSourceState(
  summaryResponse: unknown,
  finalAttempt: boolean
): Exclude<TechnicalState, "partial"> {
  const summary = getFirstResult(summaryResponse);
  const task = getFirstTask(summaryResponse);
  const rawStatus = readString(
    firstDefined(
      summary.crawl_progress,
      summary.crawl_status,
      summary.status,
      task.status_message
    )
  )
    .trim()
    .toLowerCase();
  const progressNumber = readNumber(summary.crawl_progress, -1);

  if (
    progressNumber >= 100 ||
    ["completed", "complete", "finished", "done"].some((status) =>
      rawStatus.includes(status)
    )
  ) {
    return "completed";
  }

  if (
    ["failed", "error", "cancelled", "canceled"].some((status) =>
      rawStatus.includes(status)
    )
  ) {
    return "failed";
  }

  return finalAttempt ? "timed_out" : "running";
}

function buildOnPageResult(input: {
  taskId: string;
  summaryResponse: unknown;
  pagesResponse: unknown;
  sourceState: Exclude<TechnicalState, "partial">;
  pageLimit: number;
}) {
  const { taskId, summaryResponse, pagesResponse, sourceState, pageLimit } = input;
  const summary = getFirstResult(summaryResponse);
  const pages = getItems(pagesResponse);
  const checks = asRecord(summary.checks);
  const summaryTask = getFirstTask(summaryResponse);
  const pagesTask = getFirstTask(pagesResponse);

  const mappedPages = pages.map((rawPage) => {
    const page = asRecord(rawPage);
    const meta = asRecord(page.meta);
    const headingData = asRecord(firstDefined(meta.htags, page.htags));
    const pageTiming = asRecord(page.page_timing);

    return {
      url: readString(page.url),
      statusCode:
        firstDefined(page.status_code, page.status) ?? null,
      title: readString(firstDefined(meta.title, page.title)),
      description: readString(
        firstDefined(meta.description, page.description)
      ),
      h1: asArray(headingData.h1),
      size: readNumber(firstDefined(page.size, page.page_size)),
      loadTime: readNumber(
        firstDefined(
          pageTiming.time_to_interactive,
          pageTiming.duration_time,
          page.load_time
        )
      ),
      checks: asRecord(page.checks),
    };
  });

  const summaryCrawled = readNumber(
    firstDefined(summary.crawled_pages, summary.pages_crawled)
  );
  const crawledPages = Math.max(mappedPages.length, summaryCrawled);
  const discoveredPages =
    readNumber(
      firstDefined(
        summary.total_pages,
        summary.pages_found,
        summary.discovered_pages,
        summary.pages_in_queue
      )
    ) || crawledPages;

  const statusFailures = mappedPages.filter((page) => {
    const status = Number(page.statusCode);
    return Number.isFinite(status) && status >= 400;
  }).length;
  const failedPages = Math.max(
    statusFailures,
    readNumber(
      firstDefined(
        summary.failed_pages,
        summary.pages_failed,
        checks.failed_pages
      )
    )
  );
  const completedPages = Math.max(0, crawledPages - failedPages);
  const inScopePages = Math.min(
    Math.max(discoveredPages, crawledPages),
    pageLimit
  );
  const remainingPages = Math.max(
    0,
    inScopePages - completedPages - failedPages
  );
  const outsideLimitPages = Math.max(0, discoveredPages - pageLimit);
  const coveragePercent = inScopePages > 0
    ? Math.min(100, Math.round((crawledPages / inScopePages) * 100))
    : 0;
  const isPartial =
    sourceState !== "completed" ||
    remainingPages > 0 ||
    failedPages > 0 ||
    outsideLimitPages > 0;
  const finalState: TechnicalState =
    sourceState === "completed" && isPartial ? "partial" : sourceState;

  const limitationReasons = [
    outsideLimitPages > 0
      ? `${outsideLimitPages} discovered page(s) were outside the ${pageLimit}-page crawl limit.`
      : null,
    failedPages > 0 ? `${failedPages} page(s) returned failed responses.` : null,
    remainingPages > 0 ? `${remainingPages} in-scope page(s) were not completed.` : null,
    sourceState === "timed_out" ? "The crawl reached its safe finalization timeout." : null,
    sourceState === "failed" ? "The crawl provider returned a failed state." : null,
  ].filter(Boolean);

  const confidence =
    finalState === "completed"
      ? "high"
      : finalState === "partial" && coveragePercent >= 80
        ? "moderate"
        : crawledPages > 0
          ? "limited"
          : finalState === "running"
            ? "processing"
            : "unavailable";

  return {
    taskId,
    crawlStatus: finalState,
    sourceState,
    sourceStatus: readString(
      firstDefined(
        summary.crawl_progress,
        summary.crawl_status,
        summary.status
      ),
      "pending"
    ),
    isPartial,
    coverageStatus:
      finalState === "completed"
        ? "complete"
        : outsideLimitPages > 0
          ? "capped"
          : finalState,
    confidence,
    limitation: limitationReasons.length ? limitationReasons.join(" ") : null,
    crawledPages,
    pagesCrawled: crawledPages,
    discoveredPages,
    inScopePages,
    completedPages,
    failedPages,
    remainingPages,
    outsideLimitPages,
    coveragePercent,
    pageLimit,
    internalLinks: readNumber(
      firstDefined(summary.internal_links_count, summary.internal_links)
    ),
    externalLinks: readNumber(
      firstDefined(summary.external_links_count, summary.external_links)
    ),
    brokenLinks: readNumber(
      firstDefined(summary.broken_links, checks.broken_links)
    ),
    duplicateTitle: readNumber(
      firstDefined(summary.duplicate_title, summary.duplicate_titles)
    ),
    duplicateDescription: readNumber(
      firstDefined(
        summary.duplicate_description,
        summary.duplicate_descriptions
      )
    ),
    missingTitle: readNumber(
      firstDefined(summary.no_title, summary.missing_title)
    ),
    missingDescription: readNumber(
      firstDefined(summary.no_description, summary.missing_description)
    ),
    pages: mappedPages,
    rawSummary: summary,
    rawSummaryStatus:
      readString(
        firstDefined(
          summaryTask.status_message,
          asRecord(summaryResponse).status_message
        )
      ) || null,
    rawPagesStatus:
      readString(
        firstDefined(
          pagesTask.status_message,
          asRecord(pagesResponse).status_message
        )
      ) || null,
    testedAt: new Date().toISOString(),
  };
}

function storedTimeoutOnPage(
  baseReportData: Prisma.JsonObject,
  taskId: string,
  pageLimit: number,
  error: Error
) {
  const stored = asRecord(baseReportData.onPage);
  const pages = asArray(stored.pages);
  const crawledPages =
    readNumber(firstDefined(stored.crawledPages, stored.pagesCrawled)) ||
    pages.length;

  return {
    ...stored,
    taskId,
    pageLimit,
    crawlStatus: "timed_out",
    sourceState: "timed_out",
    isPartial: true,
    confidence: crawledPages > 0 ? "limited" : "unavailable",
    limitation:
      `The technical crawl could not be refreshed before the safe timeout. ` +
      `${crawledPages} stored page(s) remain available.`,
    crawledPages,
    pagesCrawled: crawledPages,
    discoveredPages:
      readNumber(stored.discoveredPages) || crawledPages,
    completedPages:
      readNumber(stored.completedPages) || crawledPages,
    failedPages: readNumber(stored.failedPages),
    remainingPages: readNumber(stored.remainingPages),
    coveragePercent: readNumber(stored.coveragePercent),
    lastProviderError: error.message,
    testedAt: new Date().toISOString(),
  };
}

async function persistRunningState(input: {
  job: any;
  savedReport: any | null;
  onPage: JsonRecord;
  moduleState: string;
}) {
  const currentJobData = toPrismaJsonObject(input.job.resultData);
  const baseReportData = input.savedReport
    ? toPrismaJsonObject(input.savedReport.reportData)
    : currentJobData;
  const moduleStatus = {
    ...toPrismaJsonObject(input.job.moduleStatus),
    technical: input.moduleState,
    onPage: input.moduleState,
  } as Prisma.InputJsonObject;
  const partialReport = reconcileAuditReport(
    {
      ...baseReportData,
      onPage: input.onPage,
      moduleStatus,
    },
    {
      renderReady: false,
      reportStatus: "processing_technical",
      completedAt: null,
    }
  ) as Prisma.InputJsonObject;

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.auditJob.update({
      where: { id: input.job.id },
      data: {
        status: "processing_technical",
        progress: Math.max(Number(input.job.progress || 0), 92),
        currentModule: "Waiting for technical crawl",
        moduleStatus,
        resultData: partialReport,
        renderReady: false,
      },
    }),
  ];

  if (input.savedReport) {
    operations.push(
      prisma.auditReport.update({
        where: { id: input.savedReport.id },
        data: {
          status: "processing_technical",
          renderReady: false,
          moduleStatus,
          reportData: partialReport,
          completedAt: null,
        },
      })
    );
  }

  await prisma.$transaction(operations);
  return partialReport;
}

async function finalizeState(input: {
  job: any;
  savedReport: any;
  onPage: JsonRecord;
  technicalState: TechnicalState;
}) {
  const moduleState =
    input.technicalState === "completed" ? "completed" : "partial";
  const nextModuleStatus = {
    ...toPrismaJsonObject(input.job.moduleStatus),
    technical: moduleState,
    onPage: moduleState,
  } as Prisma.InputJsonObject;
  const finalStatus =
    input.technicalState === "completed"
      ? "completed"
      : "completed_with_limitation";
  const completedAt = new Date();
  const baseReportData = toPrismaJsonObject(input.savedReport.reportData);
  const finalReportData = reconcileAuditReport(
    {
      ...baseReportData,
      auditJobId: input.job.id,
      inputHash: input.job.inputHash,
      normalizedDomain: input.job.normalizedDomain,
      onPage: input.onPage,
      moduleStatus: nextModuleStatus,
    },
    {
      renderReady: true,
      reportStatus: finalStatus,
      completedAt: completedAt.toISOString(),
    }
  ) as Prisma.InputJsonObject;
  const finalUserMessage =
    input.technicalState === "completed"
      ? "Audit completed successfully."
      : "The audit is ready with an honestly labelled technical crawl limitation.";

  await prisma.$transaction([
    prisma.auditReport.update({
      where: { id: input.savedReport.id },
      data: {
        status: finalStatus,
        renderReady: true,
        moduleStatus: finalReportData.moduleStatus as Prisma.InputJsonObject,
        completedAt,
        reportData: finalReportData,
        overallScore: Number(finalReportData.overallScore ?? 0),
        seoScore: Number(finalReportData.seoScore ?? 0),
        uxScore: Number(finalReportData.uxScore ?? 0),
        aiScore:
          finalReportData.aiScore === null ||
          finalReportData.aiScore === undefined
            ? null
            : Number(finalReportData.aiScore),
        estimatedTraffic:
          finalReportData.estimatedTraffic === null ||
          finalReportData.estimatedTraffic === undefined
            ? null
            : Number(finalReportData.estimatedTraffic),
        keywordCount:
          finalReportData.keywordCount === null ||
          finalReportData.keywordCount === undefined
            ? null
            : Number(finalReportData.keywordCount),
      },
    }),
    prisma.auditJob.update({
      where: { id: input.job.id },
      data: {
        status: finalStatus,
        progress: 100,
        currentModule:
          input.technicalState === "completed"
            ? "Completed"
            : "Completed with a technical limitation",
        moduleStatus: finalReportData.moduleStatus as Prisma.InputJsonObject,
        completedAt,
        resultReportId: input.savedReport.id,
        resultData: finalReportData,
        renderReady: true,
        error:
          input.technicalState === "completed"
            ? null
            : `Technical crawl ${input.technicalState}`,
        userMessage: finalUserMessage,
      },
    }),
  ]);

  await commitAuditUsage(input.job.id);

  return {
    success: true,
    finalized: true,
    renderReady: true,
    auditJobId: input.job.id,
    traceId: input.job.traceId,
    reportId: input.savedReport.id,
    technicalState: input.technicalState,
    status: finalStatus,
    usageState: "committed",
    report: finalReportData,
    onPage: input.onPage,
  };
}

export async function pollAndFinalizeTechnicalAuditJob(
  input: PollTechnicalAuditInput
) {
  const job = await prisma.auditJob.findUnique({
    where: { id: input.jobId },
  });

  if (!job) throw new Error("Audit job not found");
  if (input.userId && job.userId !== input.userId) {
    throw new Error("Audit job not found");
  }
  if (!job.technicalTaskId) {
    throw new Error("Technical task identity is missing");
  }

  const expectedDomain = String(input.expectedDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  const mismatch =
    (input.expectedTaskId && job.technicalTaskId !== input.expectedTaskId) ||
    (input.expectedInputHash && job.inputHash !== input.expectedInputHash) ||
    (expectedDomain && job.normalizedDomain !== expectedDomain);

  if (mismatch) throw new Error("Technical crawl identity mismatch");

  if (
    ["completed", "completed_with_limitation"].includes(job.status) &&
    job.renderReady
  ) {
    if (job.usageState === "reserved") await commitAuditUsage(job.id);
    const storedResult = toPrismaJsonObject(job.resultData);
    return {
      success: true,
      finalized: true,
      renderReady: true,
      auditJobId: job.id,
      reportId: job.resultReportId,
      report: storedResult,
      onPage: storedResult.onPage || null,
      technicalState:
        readString(asRecord(storedResult.onPage).crawlStatus) || "completed",
      usageState: job.usageState === "reserved" ? "committed" : job.usageState,
    };
  }

  const savedReport = job.resultReportId
    ? await prisma.auditReport.findUnique({ where: { id: job.resultReportId } })
    : await prisma.auditReport.findFirst({ where: { auditJobId: job.id } });

  if (!savedReport) {
    const userMessage =
      `The audit could not be finalized because its saved report was missing. ` +
      `Your audit credit was restored. Reference: ${job.traceId}`;
    await failAuditAndRestoreCredit({
      jobId: job.id,
      failureCode: "SAVED_REPORT_MISSING",
      internalError:
        "Saved audit report was not found during technical finalization.",
      userMessage,
      currentModule: "Technical finalization failed",
    });
    throw new Error(userMessage);
  }

  const baseReportData = toPrismaJsonObject(savedReport.reportData);
  const pageLimit = Math.min(
    100,
    Math.max(
      1,
      readNumber(asRecord(baseReportData.onPage).pageLimit, 100)
    )
  );

  let onPage: JsonRecord;
  let technicalState: TechnicalState;

  try {
    const summaryResponse = await dataForSeoGet(
      `on_page/summary/${encodeURIComponent(job.technicalTaskId)}`
    );
    let pagesResponse: unknown = { tasks: [{ result: [{ items: [] }] }] };

    try {
      pagesResponse = await dataForSeoPost("on_page/pages", [
        {
          id: job.technicalTaskId,
          limit: pageLimit,
          offset: 0,
        },
      ]);
    } catch (pagesError) {
      if (input.finalAttempt) throw pagesError;
    }

    const sourceState = determineSourceState(
      summaryResponse,
      input.finalAttempt === true
    );
    onPage = buildOnPageResult({
      taskId: job.technicalTaskId,
      summaryResponse,
      pagesResponse,
      sourceState,
      pageLimit,
    });
    technicalState = readString(onPage.crawlStatus) as TechnicalState;
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error("Technical crawl refresh failed");
    const permanentProviderFailure =
      /missing dataforseo|http 401|http 403|unauthorized|forbidden/i.test(
        normalizedError.message
      );

    if (permanentProviderFailure) {
      const userMessage =
        `The technical provider could not be authenticated, so the audit was not charged. ` +
        `Reference: ${job.traceId}`;

      await failAuditAndRestoreCredit({
        jobId: job.id,
        failureCode: "TECHNICAL_PROVIDER_AUTH_FAILED",
        internalError: normalizedError.message,
        userMessage,
        currentModule: "Technical provider authentication failed",
      });

      await prisma.auditReport.updateMany({
        where: { auditJobId: job.id },
        data: {
          status: "failed",
          renderReady: false,
          completedAt: null,
        },
      });

      throw new Error(userMessage);
    }

    if (!input.finalAttempt) throw normalizedError;

    onPage = storedTimeoutOnPage(
      baseReportData,
      job.technicalTaskId,
      pageLimit,
      normalizedError
    );
    technicalState = "timed_out";
  }

  if (technicalState === "running") {
    const partialReport = await persistRunningState({
      job,
      savedReport,
      onPage,
      moduleState: "running",
    });
    return {
      success: true,
      finalized: false,
      renderReady: false,
      auditJobId: job.id,
      reportId: savedReport.id,
      technicalState,
      onPage,
      report: partialReport,
    };
  }

  return finalizeState({
    job,
    savedReport,
    onPage,
    technicalState,
  });
}

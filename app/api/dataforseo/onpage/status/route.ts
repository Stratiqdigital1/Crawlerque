import {
  Prisma,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import {
  withSecurityHeaders,
} from "@/lib/security-headers";
import {
  commitAuditUsage,
  failAuditAndRestoreCredit,
} from "@/lib/audit-usage";
import { reconcileAuditReport } from "@/lib/audit-reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<
  string,
  unknown
>;

type TechnicalState =
  | "running"
  | "completed"
  | "failed"
  | "timed_out";

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asRecord(
  value: unknown
): JsonRecord {
  return isRecord(value)
    ? value
    : {};
}

function asArray(
  value: unknown
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function readString(
  value: unknown,
  fallback = ""
) {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return fallback;
}

function readNumber(
  value: unknown,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function firstDefined(
  ...values: unknown[]
) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function getFirstTask(
  value: unknown
) {
  const root = asRecord(value);
  const tasks = asArray(root.tasks);

  return asRecord(tasks[0]);
}

function getFirstResult(
  value: unknown
) {
  const task = getFirstTask(value);
  const results = asArray(
    task.result
  );

  return asRecord(results[0]);
}

function getItems(
  value: unknown
) {
  const result =
    getFirstResult(value);

  return asArray(result.items);
}

function toPrismaJsonObject(
  value:
    | Prisma.JsonValue
    | null
    | undefined
): Prisma.JsonObject {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Prisma.JsonObject;
  }

  return {};
}

function getAuthHeader() {
  const login =
    process.env.DATAFORSEO_LOGIN;

  const password =
    process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error(
      "Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD"
    );
  }

  return (
    "Basic " +
    Buffer.from(
      `${login}:${password}`
    ).toString("base64")
  );
}

async function dataForSeoGet(
  endpoint: string
): Promise<unknown> {
  const response = await fetch(
    `https://api.dataforseo.com/v3/${endpoint}`,
    {
      method: "GET",

      headers: {
        Authorization:
          getAuthHeader(),

        "Content-Type":
          "application/json",
      },

      cache: "no-store",
    }
  );

  const json: unknown =
    await response.json();

  if (!response.ok) {
    throw new Error(
      "DataForSEO OnPage summary request failed."
    );
  }

  return json;
}

async function dataForSeoPost(
  endpoint: string,
  payload: Array<
    Record<string, unknown>
  >
): Promise<unknown> {
  const response = await fetch(
    `https://api.dataforseo.com/v3/${endpoint}`,
    {
      method: "POST",

      headers: {
        Authorization:
          getAuthHeader(),

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        payload
      ),

      cache: "no-store",
    }
  );

  const json: unknown =
    await response.json();

  if (!response.ok) {
    throw new Error(
      "DataForSEO OnPage pages request failed."
    );
  }

  return json;
}

async function getUserFromCookie() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "stratiq_session"
    )?.value;

  if (!token) {
    return null;
  }

  try {
    const payload =
      await verifySessionToken(
        token
      );

    if (!payload?.userId) {
      return null;
    }

    return {
      id: String(
        payload.userId
      ),

      role: String(
        payload.role || "user"
      ),
    };
  } catch {
    return null;
  }
}

function buildOnPageResult(
  taskId: string,
  summaryResponse: unknown,
  pagesResponse: unknown,
  technicalState: TechnicalState
) {
  const summary =
    getFirstResult(
      summaryResponse
    );

  const pages =
    getItems(
      pagesResponse
    );

  const checks = asRecord(
    summary.checks
  );

  const summaryTask =
    getFirstTask(
      summaryResponse
    );

  const pagesTask =
    getFirstTask(
      pagesResponse
    );

  const crawledPages =
    pages.length ||
    readNumber(
      firstDefined(
        summary.crawled_pages,
        summary.pages_crawled
      )
    );

  const discoveredPages =
    readNumber(
      firstDefined(
        summary.total_pages,
        summary.pages_found,
        summary.discovered_pages,
        summary.pages_in_queue
      )
    ) || crawledPages;

  const failedPages = readNumber(
    firstDefined(
      summary.failed_pages,
      summary.pages_failed,
      checks.failed_pages
    )
  );

  const remainingPages = Math.max(
    0,
    discoveredPages - crawledPages - failedPages
  );

  return {
    taskId,

    crawlStatus:
      technicalState,

    sourceStatus:
      readString(
        firstDefined(
          summary.crawl_progress,
          summary.crawl_status,
          summary.status
        ),
        "pending"
      ),

    crawledPages,
    pagesCrawled: crawledPages,
    discoveredPages,
    completedPages: crawledPages,
    failedPages,
    remainingPages,
    pageLimit: 100,
    confidence:
      technicalState === "completed"
        ? "high"
        : crawledPages > 0
          ? "limited"
          : technicalState === "running"
            ? "processing"
            : "unavailable",

    internalLinks:
      readNumber(
        firstDefined(
          summary.internal_links_count,
          summary.internal_links
        )
      ),

    externalLinks:
      readNumber(
        firstDefined(
          summary.external_links_count,
          summary.external_links
        )
      ),

    brokenLinks:
      readNumber(
        firstDefined(
          summary.broken_links,
          checks.broken_links
        )
      ),

    duplicateTitle:
      readNumber(
        firstDefined(
          summary.duplicate_title,
          summary.duplicate_titles
        )
      ),

    duplicateDescription:
      readNumber(
        firstDefined(
          summary.duplicate_description,
          summary.duplicate_descriptions
        )
      ),

    missingTitle:
      readNumber(
        firstDefined(
          summary.no_title,
          summary.missing_title
        )
      ),

    missingDescription:
      readNumber(
        firstDefined(
          summary.no_description,
          summary.missing_description
        )
      ),

    pages: pages.map(
      (rawPage) => {
        const page =
          asRecord(rawPage);

        const meta =
          asRecord(page.meta);

        const headingData =
          asRecord(
            firstDefined(
              meta.htags,
              page.htags
            )
          );

        const pageTiming =
          asRecord(
            page.page_timing
          );

        return {
          url:
            readString(
              page.url
            ),

          statusCode:
            firstDefined(
              page.status_code,
              page.status
            ) ?? null,

          title:
            readString(
              firstDefined(
                meta.title,
                page.title
              )
            ),

          description:
            readString(
              firstDefined(
                meta.description,
                page.description
              )
            ),

          h1:
            asArray(
              headingData.h1
            ),

          size:
            readNumber(
              firstDefined(
                page.size,
                page.page_size
              )
            ),

          loadTime:
            readNumber(
              firstDefined(
                pageTiming.time_to_interactive,
                pageTiming.duration_time,
                page.load_time
              )
            ),

          checks:
            asRecord(
              page.checks
            ),
        };
      }
    ),

    rawSummary:
      summary,

    rawSummaryStatus:
      readString(
        firstDefined(
          summaryTask.status_message,
          asRecord(
            summaryResponse
          ).status_message
        )
      ) || null,

    rawPagesStatus:
      readString(
        firstDefined(
          pagesTask.status_message,
          asRecord(
            pagesResponse
          ).status_message
        )
      ) || null,

    testedAt:
      new Date().toISOString(),
  };
}

function determineTechnicalState(
  summaryResponse: unknown,
  finalAttempt: boolean
): TechnicalState {
  const summary =
    getFirstResult(
      summaryResponse
    );

  const task =
    getFirstTask(
      summaryResponse
    );

  const rawStatus =
    readString(
      firstDefined(
        summary.crawl_progress,
        summary.crawl_status,
        summary.status,
        task.status_message
      )
    )
      .trim()
      .toLowerCase();

  const progressNumber =
    readNumber(
      summary.crawl_progress,
      -1
    );

  if (
    progressNumber >= 100 ||
    [
      "completed",
      "complete",
      "finished",
      "done",
    ].some((status) =>
      rawStatus.includes(status)
    )
  ) {
    return "completed";
  }

  if (
    [
      "failed",
      "error",
      "cancelled",
      "canceled",
    ].some((status) =>
      rawStatus.includes(status)
    )
  ) {
    return "failed";
  }

  if (finalAttempt) {
    return "timed_out";
  }

  return "running";
}

export async function GET(
  req: Request
) {
  let finalAttemptForFailure =
    false;

  let auditJobIdForFailure =
    "";

  try {
    const user =
      await getUserFromCookie();

    if (!user) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Unauthorized",
          },
          {
            status: 401,
          }
        )
      );
    }

    const { searchParams } =
      new URL(req.url);

    const taskId =
      String(
        searchParams.get(
          "taskId"
        ) || ""
      ).trim();

    const auditJobId =
      String(
        searchParams.get(
          "auditJobId"
        ) || ""
      ).trim();

    const inputHash =
      String(
        searchParams.get(
          "inputHash"
        ) || ""
      ).trim();

    const normalizedDomain =
      String(
        searchParams.get(
          "normalizedDomain"
        ) || ""
      )
        .trim()
        .toLowerCase()
        .replace(/^www\./, "");

    const finalAttempt =
      searchParams.get(
        "finalAttempt"
      ) === "true";

    finalAttemptForFailure =
      finalAttempt;

    auditJobIdForFailure =
      auditJobId;

    if (
      !taskId ||
      !auditJobId ||
      !inputHash ||
      !normalizedDomain
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Complete audit identity is required.",
          },
          {
            status: 400,
          }
        )
      );
    }

    const job =
      await prisma.auditJob.findFirst({
        where: {
          id: auditJobId,
          userId: user.id,
        },
      });

    if (!job) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Audit job not found.",
          },
          {
            status: 404,
          }
        )
      );
    }

    const identityMismatch =
      job.technicalTaskId !==
        taskId ||
      job.inputHash !== inputHash ||
      job.normalizedDomain !==
        normalizedDomain;

    if (identityMismatch) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Technical crawl identity mismatch.",
          },
          {
            status: 409,
          }
        )
      );
    }

    /*
     * Already finalized jobs return their stored
     * report data without calling DataForSEO again.
     */
    if (
      [
        "completed",
        "completed_with_limitation",
      ].includes(job.status) &&
      job.renderReady
    ) {
      if (
        job.usageState ===
        "reserved"
      ) {
        await commitAuditUsage(
          job.id
        );
      }

      const storedResult =
        toPrismaJsonObject(
          job.resultData
        );

      return withSecurityHeaders(
        NextResponse.json({
          success: true,
          finalized: true,
          renderReady: true,
          auditJobId: job.id,
          reportId:
            job.resultReportId,
          report:
            storedResult,
          onPage:
            storedResult.onPage ||
            null,
          usageState:
            job.usageState ===
            "reserved"
              ? "committed"
              : job.usageState,
        })
      );
    }

    const summaryResponse =
      await dataForSeoGet(
        `on_page/summary/${encodeURIComponent(
          taskId
        )}`
      );

    const pagesResponse =
      await dataForSeoPost(
        "on_page/pages",
        [
          {
            id: taskId,
            limit: 100,
            offset: 0,
          },
        ]
      );

    const technicalState =
      determineTechnicalState(
        summaryResponse,
        finalAttempt
      );

    const onPage =
      buildOnPageResult(
        taskId,
        summaryResponse,
        pagesResponse,
        technicalState
      );

    const currentModuleStatus =
      toPrismaJsonObject(
        job.moduleStatus
      );

    const nextModuleStatus =
      {
        ...currentModuleStatus,

        technical:
          technicalState,

        onPage:
          technicalState,
      } as Prisma.InputJsonObject;

    if (
      technicalState === "running"
    ) {
      await prisma.auditJob.update({
        where: {
          id: job.id,
        },

        data: {
          status: "running",

          progress: Math.max(
            Number(
              job.progress || 0
            ),
            92
          ),

          currentModule:
            "Waiting for technical crawl",

          moduleStatus:
            nextModuleStatus,

          renderReady: false,
        },
      });

      return withSecurityHeaders(
        NextResponse.json({
          success: true,
          finalized: false,
          renderReady: false,
          auditJobId:
            job.id,
          reportId:
            job.resultReportId,
          technicalState,
          onPage,
        })
      );
    }

    /*
     * Completed, failed and timed-out modules are
     * all final states. The full report can now be
     * rendered with an honest module status.
     */
    const savedReport =
      job.resultReportId
        ? await prisma.auditReport.findFirst({
            where: {
              id:
                job.resultReportId,

              userId:
                user.id,
            },
          })
        : await prisma.auditReport.findFirst({
            where: {
              auditJobId:
                job.id,

              userId:
                user.id,
            },
          });

    if (!savedReport) {
      const userMessage =
        `The audit could not be finalized because its saved report was missing. Your audit credit was restored. Reference: ${job.traceId}`;

      await failAuditAndRestoreCredit({
        jobId: job.id,
        failureCode:
          "SAVED_REPORT_MISSING",
        internalError:
          "Saved audit report was not found during technical finalization.",
        userMessage,
        currentModule:
          "Technical finalization failed",
      });

      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              userMessage,
            traceId:
              job.traceId,
            creditRestored:
              true,
          },
          {
            status: 409,
          }
        )
      );
    }

    const baseReportData =
      toPrismaJsonObject(
        savedReport.reportData
      );

    const finalStatus =
      technicalState ===
      "completed"
        ? "completed"
        : "completed_with_limitation";

    const finalUserMessage =
      technicalState ===
      "completed"
        ? "Audit completed successfully."
        : technicalState ===
            "timed_out"
          ? "The audit is ready, but the technical crawl reached its safe timeout."
          : "The audit is ready, but the technical crawl ended with a limitation.";

    const completedAt =
      new Date();

    const finalReportData = reconcileAuditReport(
      {
        ...baseReportData,

        auditJobId:
          job.id,

        inputHash:
          job.inputHash,

        normalizedDomain:
          job.normalizedDomain,

        onPage,

        moduleStatus:
          nextModuleStatus,
      },
      {
        renderReady: true,
        reportStatus: finalStatus,
        completedAt:
          completedAt.toISOString(),
      }
    ) as Prisma.InputJsonObject;

    await prisma.$transaction([
      prisma.auditReport.update({
        where: {
          id:
            savedReport.id,
        },

        data: {
          status:
            finalStatus,

          renderReady:
            true,

          moduleStatus:
            finalReportData.moduleStatus as Prisma.InputJsonObject,

          completedAt,

          reportData:
            finalReportData,

          overallScore:
            Number(finalReportData.overallScore ?? 0),

          seoScore:
            Number(finalReportData.seoScore ?? 0),

          uxScore:
            Number(finalReportData.uxScore ?? 0),

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
        where: {
          id: job.id,
        },

        data: {
          status:
            finalStatus,

          progress:
            100,

          currentModule:
            technicalState ===
            "completed"
              ? "Completed"
              : "Completed with a technical limitation",

          moduleStatus:
            finalReportData.moduleStatus as Prisma.InputJsonObject,

          completedAt,

          resultReportId:
            savedReport.id,

          resultData:
            finalReportData,

          renderReady:
            true,

          error:
            technicalState ===
            "completed"
              ? null
              : `Technical crawl ${technicalState}`,

          userMessage:
            finalUserMessage,
        },
      }),
    ]);

    await commitAuditUsage(
      job.id
    );

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        finalized: true,
        renderReady: true,
        auditJobId:
          job.id,
        traceId:
          job.traceId,
        reportId:
          savedReport.id,
        technicalState,
        status:
          finalStatus,
        usageState:
          "committed",
        report:
          finalReportData,
        onPage,
      })
    );
  } catch (error) {
    console.error(
      "OnPage status route failed:",
      error
    );

    const internalError =
      error instanceof Error
        ? error.message
        : "OnPage status failed.";

    if (
      finalAttemptForFailure &&
      auditJobIdForFailure
    ) {
      try {
        const failedJob =
          await prisma.auditJob.findUnique({
            where: {
              id:
                auditJobIdForFailure,
            },
            select: {
              id: true,
              traceId: true,
            },
          });

        if (failedJob) {
          const userMessage =
            `The technical crawl could not be finalized safely. Your audit credit was restored. Reference: ${failedJob.traceId}`;

          await failAuditAndRestoreCredit({
            jobId:
              failedJob.id,
            failureCode:
              "TECHNICAL_FINALIZATION_FAILED",
            internalError,
            userMessage,
            currentModule:
              "Technical finalization failed",
          });

          await prisma.auditReport.updateMany({
            where: {
              auditJobId:
                failedJob.id,
            },
            data: {
              status:
                "failed",
              renderReady:
                false,
              completedAt:
                null,
            },
          });

          return withSecurityHeaders(
            NextResponse.json(
              {
                success: false,
                error:
                  userMessage,
                traceId:
                  failedJob.traceId,
                creditRestored:
                  true,
              },
              {
                status: 500,
              }
            )
          );
        }
      } catch (
        failureFinalizationError
      ) {
        console.error(
          "Technical failure finalization failed:",
          failureFinalizationError
        );
      }
    }

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "Technical crawl status could not be loaded. Please try again.",
        },
        {
          status: 500,
        }
      )
    );
  }
}

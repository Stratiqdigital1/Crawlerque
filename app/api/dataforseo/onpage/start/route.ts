import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";
import {
  AuditIdentityError,
  buildAuditIdentity,
} from "@/lib/audit-identity";
import {
  getAuditScopeKey,
  normalizeAuditScope,
} from "@/lib/audit-scope";

export const runtime = "nodejs";
export const maxDuration = 60;

type DataForSeoTaskResponse = {
  status_message?: string;
  tasks?: Array<{
    id?: string;
    status_message?: string;
  }>;
};

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dataForSeoPost(
  endpoint: string,
  payload: Array<Record<string, unknown>>
): Promise<unknown> {
  let lastResponse: unknown = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(
        `https://api.dataforseo.com/v3/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        }
      );

      const json: unknown = await response.json();
      lastResponse = json;

      if (response.ok) return json;

      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;

      if (!retryable || attempt === 3) {
        console.error("DataForSEO OnPage start failed:", json);
        return json;
      }
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
    }

    await sleep(500 * 2 ** (attempt - 1));
  }

  if (lastResponse) return lastResponse;

  throw lastError instanceof Error
    ? lastError
    : new Error("OnPage task could not be created after safe retries.");
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

async function getUserFromCookie() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    "stratiq_session"
  )?.value;

  if (!token) {
    return null;
  }

  try {
    const payload =
      await verifySessionToken(token);

    if (!payload?.userId) {
      return null;
    }

    return {
      id: String(payload.userId),
      role: String(
        payload.role || "user"
      ),
    };
  } catch {
    return null;
  }
}

export async function POST(
  req: Request
) {
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

    const body = await req.json();

    const auditJobId = String(
      body?.auditJobId || ""
    ).trim();

    const suppliedInputHash = String(
      body?.inputHash || ""
    ).trim();

    const suppliedDomain = String(
      body?.normalizedDomain || ""
    )
      .trim()
      .toLowerCase()
      .replace(/^www\./, "");

    if (
      !auditJobId ||
      !suppliedInputHash ||
      !suppliedDomain
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Audit job identity is required.",
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

    if (
      !job.inputHash ||
      !job.normalizedDomain
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "This audit job does not contain a valid identity.",
          },
          {
            status: 409,
          }
        )
      );
    }

    const jobReportTypes =
      Array.isArray(job.reportTypes)
        ? job.reportTypes
        : [];

    let identity;

    try {
      identity = buildAuditIdentity({
        userId: user.id,
        url: job.url,
        reportTypes:
          jobReportTypes,
        auditConfig:
          job.auditConfig ||
          body?.auditConfig ||
          body,
      });
    } catch (error) {
      if (
        error instanceof
        AuditIdentityError
      ) {
        return withSecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error: error.message,
            },
            {
              status: 400,
            }
          )
        );
      }

      throw error;
    }

    const identityMismatch =
      identity.inputHash !==
        job.inputHash ||
      identity.inputHash !==
        suppliedInputHash ||
      identity.normalizedDomain !==
        job.normalizedDomain ||
      identity.normalizedDomain !==
        suppliedDomain ||
      identity.normalizedUrl !==
        job.url ||
      getAuditScopeKey(
        identity.auditConfig,
        job.normalizedDomain
      ) !==
        getAuditScopeKey(
          job.auditConfig ||
            body?.auditConfig ||
            body,
          job.normalizedDomain
        );

    if (identityMismatch) {
      await prisma.auditJob.update({
        where: {
          id: job.id,
        },
        data: {
          moduleStatus: {
            ...asRecord(
              job.moduleStatus
            ),
            technical: "failed",
            onPage: "failed",
          },
          error:
            "Technical crawl identity validation failed.",
          renderReady: false,
        },
      });

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

    if (
      ![
        "pending",
        "running",
      ].includes(job.status)
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "This audit job is no longer active.",
          },
          {
            status: 409,
          }
        )
      );
    }

    if (job.technicalTaskId) {
      return withSecurityHeaders(
        NextResponse.json({
          success: true,
          reused: true,
          auditJobId: job.id,
          taskId:
            job.technicalTaskId,
          normalizedDomain:
            job.normalizedDomain,
          inputHash: job.inputHash,
          auditConfig:
            job.auditConfig ||
            identity.auditConfig,
          pageLimit:
            Number(
              asRecord(
                asRecord(job.resultData)
                  .technicalConfig
              ).pageLimit || 100
            ),
          message:
            "Existing OnPage crawl reused.",
        })
      );
    }

    const auditConfig =
      normalizeAuditScope(
        job.auditConfig ||
          body?.auditConfig ||
          body,
        job.normalizedDomain
      );

    const maxCrawlPages =
      auditConfig.maxCrawlPages;

    const rawTaskResponse =
      await dataForSeoPost(
        "on_page/task_post",
        [
          {
            target:
              job.normalizedDomain,

            start_url: job.url,

            max_crawl_pages:
              maxCrawlPages,

            load_resources: true,
            enable_javascript: true,
            check_spell: false,

            tag: `cq-${job.id}`,
          },
        ]
      );

    const taskResponse =
      rawTaskResponse as DataForSeoTaskResponse;

    const taskId =
      taskResponse?.tasks?.[0]?.id;

    if (!taskId) {
      await prisma.auditJob.update({
        where: {
          id: job.id,
        },
        data: {
          moduleStatus: {
            ...asRecord(
              job.moduleStatus
            ),
            technical: "failed",
            onPage: "failed",
          },
          error:
            taskResponse?.tasks?.[0]
              ?.status_message ||
            taskResponse?.status_message ||
            "OnPage task could not be created.",
          renderReady: false,
        },
      });

      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "OnPage task could not be created.",
          },
          {
            status: 502,
          }
        )
      );
    }

    await prisma.auditJob.update({
      where: {
        id: job.id,
      },
      data: {
        technicalTaskId: taskId,

        currentModule:
          "Technical crawl started",

        progress: Math.max(
          Number(job.progress || 0),
          40
        ),

        moduleStatus: {
          ...asRecord(
            job.moduleStatus
          ),
          technical: "running",
          onPage: "running",
        },

        renderReady: false,

        resultData: {
          ...asRecord(job.resultData),
          technicalConfig: {
            pageLimit: maxCrawlPages,
          },
        } as Prisma.InputJsonObject,
      },
    });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        reused: false,
        auditJobId: job.id,
        taskId,
        normalizedDomain:
          job.normalizedDomain,
        inputHash: job.inputHash,
        auditConfig,
        pageLimit: maxCrawlPages,
        message:
          "OnPage crawl started with safe retry protection.",
      })
    );
  } catch (error) {
    console.error(
      "OnPage start route failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "OnPage start failed.",
        },
        {
          status: 500,
        }
      )
    );
  }
}
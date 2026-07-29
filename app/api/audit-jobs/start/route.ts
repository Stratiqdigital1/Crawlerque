import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifySessionToken,
} from "@/lib/auth";
import {
  withSecurityHeaders,
} from "@/lib/security-headers";
import {
  getPromoAccessForSession,
  PROMO_REPORT_TYPES,
} from "@/lib/promo-access";
import {
  AuditIdentityError,
  buildAuditIdentity,
} from "@/lib/audit-identity";
import {
  getAuditScopeKey,
} from "@/lib/audit-scope";
import {
  AuditUsageLimitError,
  createAuditJobWithReservation,
  failAuditAndRestoreCredit,
} from "@/lib/audit-usage";

export const runtime = "nodejs";

async function getSessionFromCookie() {
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
      role: String(payload.role || "user"),
      promoAccessId:
        payload.promoAccessId
          ? String(payload.promoAccessId)
          : null,
    };
  } catch {
    return null;
  }
}

export async function POST(
  req: Request
) {
  try {
    const session =
      await getSessionFromCookie();

    if (!session) {
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

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.id,
        },
        include: {
          package: true,
        },
      });

    if (
      !user ||
      user.status === "suspended"
    ) {
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

    const promoAccess =
      session.promoAccessId
        ? await getPromoAccessForSession({
            userId: session.id,
            promoAccessId:
              session.promoAccessId,
          })
        : null;

    if (
      session.promoAccessId &&
      !promoAccess
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Promotional access is unavailable.",
          },
          {
            status: 403,
          }
        )
      );
    }

    const body = await req.json();

    const requestedReportTypes =
      promoAccess
        ? [...PROMO_REPORT_TYPES]
        : Array.isArray(
              body?.reportTypes
            )
          ? body.reportTypes.map(
              (type: unknown) =>
                String(type)
            )
          : [];

    const identity =
      buildAuditIdentity({
        userId: session.id,
        url: String(
          body?.url || ""
        ),
        reportTypes:
          requestedReportTypes,
        auditConfig:
          body?.auditConfig || body,
      });

    const retryOfJobId =
      body?.retryOfJobId
        ? String(
            body.retryOfJobId
          ).trim()
        : null;

    if (retryOfJobId) {
      const retrySource =
        await prisma.auditJob.findFirst({
          where: {
            id: retryOfJobId,
            userId: session.id,
            status: {
              in: [
                "failed",
                "cancelled",
              ],
            },
          },
          select: {
            id: true,
            normalizedDomain: true,
            auditConfig: true,
          },
        });

      if (!retrySource) {
        return withSecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error:
                "The audit selected for retry is unavailable.",
            },
            {
              status: 409,
            }
          )
        );
      }

      if (
        retrySource.normalizedDomain &&
        retrySource.normalizedDomain !==
          identity.normalizedDomain
      ) {
        return withSecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error:
                "A retry must use the same domain as the failed audit.",
            },
            {
              status: 409,
            }
          )
        );
      }

      if (
        retrySource.auditConfig &&
        getAuditScopeKey(
          retrySource.auditConfig,
          retrySource.normalizedDomain ||
            identity.normalizedDomain
        ) !==
          getAuditScopeKey(
            identity.auditConfig,
            identity.normalizedDomain
          )
      ) {
        return withSecurityHeaders(
          NextResponse.json(
            {
              success: false,
              error:
                "A retry must use the same country, language, device, search engine, and crawl scope as the failed audit.",
            },
            {
              status: 409,
            }
          )
        );
      }
    }

    /*
     * Prevent double reservations when the user
     * double-clicks Run Audit or the browser retries.
     */
    const activeJobThreshold =
      new Date(
        Date.now() -
          15 * 60 * 1000
      );

    const existingActiveJob =
      await prisma.auditJob.findFirst({
        where: {
          userId: session.id,
          inputHash:
            identity.inputHash,
          status: {
            in: [
              "pending",
              "running",
              "processing_technical",
            ],
          },
          createdAt: {
            gte:
              activeJobThreshold,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          traceId: true,
          status: true,
          progress: true,
          currentModule: true,
          normalizedDomain: true,
          inputHash: true,
          renderReady: true,
          usageState: true,
          usageSource: true,
          retryOfJobId: true,
          auditConfig: true,
        },
      });

    if (existingActiveJob) {
      return withSecurityHeaders(
        NextResponse.json({
          success: true,
          reused: true,
          job:
            existingActiveJob,
          auditJobId:
            existingActiveJob.id,
          traceId:
            existingActiveJob.traceId,
        })
      );
    }

    /*
     * Restore credits held by abandoned jobs before
     * reserving a new one. This is safe and idempotent.
     */
    const staleJobs =
      await prisma.auditJob.findMany({
        where: {
          userId: session.id,
          usageState: "reserved",
          status: {
            in: [
              "pending",
              "running",
              "processing_technical",
            ],
          },
          updatedAt: {
            lt:
              activeJobThreshold,
          },
        },
        select: {
          id: true,
        },
        take: 10,
      });

    for (
      const staleJob of staleJobs
    ) {
      try {
        await failAuditAndRestoreCredit({
          jobId: staleJob.id,
          failureCode:
            "ABANDONED_AUDIT",
          internalError:
            "The audit stopped updating for more than 15 minutes.",
          userMessage:
            "The previous audit expired before completion. Its audit credit was restored.",
          currentModule:
            "Audit expired",
        });
      } catch (cleanupError) {
        console.error(
          "Stale audit cleanup failed:",
          cleanupError
        );
      }
    }

    const monthlyLimit =
      user.package
        ?.monthlyAudits ||
      user.monthlyAudits ||
      0;

    const reservedJob =
      await createAuditJobWithReservation({
        userId: session.id,
        role: user.role,
        stripeStatus:
          user.stripeStatus,
        monthlyLimit,
        promoAccessId:
          promoAccess?.id || null,
        domain:
          identity.normalizedDomain,
        normalizedDomain:
          identity.normalizedDomain,
        url:
          identity.normalizedUrl,
        inputHash:
          identity.inputHash,
        reportTypes:
          identity.reportTypes,
        retryOfJobId,
      });

    const job =
      await prisma.auditJob.update({
        where: {
          id: reservedJob.id,
        },
        data: {
          auditConfig: {
            ...identity.auditConfig,
          },
        },
      });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        reused: false,
        job,
        auditJobId: job.id,
        traceId: job.traceId,
        auditConfig:
          identity.auditConfig,
      })
    );
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

    if (
      error instanceof
      AuditUsageLimitError
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code,
          },
          {
            status:
              error.status,
          }
        )
      );
    }

    console.error(
      "Audit job start failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "Failed to start audit job.",
        },
        {
          status: 500,
        }
      )
    );
  }
}

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

    if (
      promoAccess &&
      promoAccess.auditsUsed >=
        promoAccess.auditLimit
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "This promotional link has used all available audits.",
          },
          {
            status: 429,
          }
        )
      );
    }

    const body = await req.json();

    const requestedReportTypes =
      promoAccess
        ? [...PROMO_REPORT_TYPES]
        : Array.isArray(body?.reportTypes)
          ? body.reportTypes
          : [];

    const identity = buildAuditIdentity({
      userId: session.id,
      url: String(body?.url || ""),
      reportTypes: requestedReportTypes,
    });

    /*
     * Prevent accidental duplicate jobs when the user
     * double-clicks Run Audit or the browser retries.
     *
     * Only reuse jobs created during the last 15 minutes.
     */
    const activeJobThreshold = new Date(
      Date.now() - 15 * 60 * 1000
    );

    const existingActiveJob =
      await prisma.auditJob.findFirst({
        where: {
          userId: session.id,
          inputHash: identity.inputHash,
          status: {
            in: ["pending", "running"],
          },
          createdAt: {
            gte: activeJobThreshold,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          progress: true,
          currentModule: true,
          normalizedDomain: true,
          inputHash: true,
          renderReady: true,
        },
      });

    if (existingActiveJob) {
      return withSecurityHeaders(
        NextResponse.json({
          success: true,
          reused: true,
          job: existingActiveJob,
          auditJobId:
            existingActiveJob.id,
        })
      );
    }

    const job =
      await prisma.auditJob.create({
        data: {
          userId: session.id,

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

          status: "pending",
          progress: 1,
          currentModule:
            "Audit queued",

          moduleStatus: {},

          technicalTaskId: null,
          renderReady: false,
          usageCounted: false,
        },
        select: {
          id: true,
          status: true,
          progress: true,
          currentModule: true,
          normalizedDomain: true,
          inputHash: true,
          renderReady: true,
        },
      });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        reused: false,
        job,
        auditJobId: job.id,
      })
    );
  } catch (error) {
    if (
      error instanceof AuditIdentityError
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
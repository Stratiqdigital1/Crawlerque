import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withSecurityHeaders } from "@/lib/security-headers";
import { canReviewAuditReports } from "@/lib/permissions";
import { reconcileAuditReport } from "@/lib/audit-reconciliation";
import {
  applyApprovedReviewSnapshot,
  buildInitialReportReviewSnapshot,
  sanitizeReportReviewSnapshot,
} from "@/lib/report-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewAction =
  | "save"
  | "submit"
  | "approve"
  | "request_changes";

async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    "stratiq_session"
  )?.value;

  if (!token) return null;

  try {
    const payload =
      await verifySessionToken(token);

    if (!payload?.userId) {
      return null;
    }

    return prisma.user.findUnique({
      where: {
        id: String(payload.userId),
      },
      include: {
        package: true,
      },
    });
  } catch {
    return null;
  }
}

function getFinalReportData(
  report: {
    reportData: unknown;
    renderReady: boolean;
    status: string;
    completedAt: Date | null;
    updatedAt: Date;
  }
) {
  if (!report.renderReady) {
    return report.reportData;
  }

  return reconcileAuditReport(
    report.reportData,
    {
      renderReady: true,
      reportStatus: report.status,
      completedAt:
        report.completedAt?.toISOString() ||
        report.updatedAt.toISOString(),
    }
  );
}

function publicReviewSnapshot(
  value: any
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return value || null;
  }

  return {
    ...value,
    internalNote: "",
  };
}

function serializeReview(
  review: any,
  canEdit: boolean
) {
  if (!review) return null;

  const approvedBy = review.approvedBy
    ? {
        id: review.approvedBy.id,
        name: review.approvedBy.name,
        email: review.approvedBy.email,
      }
    : null;

  return {
    id: review.id,
    reportId: review.reportId,
    status: review.status,
    version: review.version,
    approvedVersion:
      review.approvedVersion,
    approvedAt: review.approvedAt,
    approvedBy,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    canEdit,
    draftData: canEdit
      ? review.draftData
      : null,
    approvedData: canEdit
      ? review.approvedData
      : publicReviewSnapshot(
          review.approvedData
        ),
    revisions: canEdit
      ? review.revisions || []
      : [],
  };
}

async function loadReport(
  reportId: string,
  user: any
) {
  return prisma.auditReport.findFirst({
    where:
      user.role === "admin"
        ? {
            id: reportId,
          }
        : {
            id: reportId,
            userId: user.id,
          },
    include: {
      review: {
        include: {
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          revisions: {
            orderBy: {
              version: "desc",
            },
            take: 20,
          },
        },
      },
    },
  });
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user =
      await getSessionUser();

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

    const { id } = await params;
    let report = await loadReport(
      id,
      user
    );

    if (!report) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Report not found",
          },
          {
            status: 404,
          }
        )
      );
    }

    const canEdit =
      canReviewAuditReports(user);

    const reportIsFinal =
      report.renderReady === true &&
      [
        "completed",
        "completed_with_limitation",
      ].includes(report.status);

    if (
      canEdit &&
      reportIsFinal &&
      !report.review
    ) {
      const finalReportData =
        getFinalReportData(report);

      const initialSnapshot =
        buildInitialReportReviewSnapshot(
          finalReportData
        );

      try {
        await prisma.auditReportReview.create({
          data: {
            reportId: report.id,
            status: "draft",
            version: 1,
            draftData:
              initialSnapshot as any,
            createdById: user.id,
            updatedById: user.id,
            revisions: {
              create: {
                version: 1,
                action: "initialized",
                status: "draft",
                snapshot:
                  initialSnapshot as any,
                actorId: user.id,
                actorName: user.name,
                actorEmail: user.email,
              },
            },
          },
        });
      } catch (createError) {
        // Another request may have initialized the same review.
        console.error(
          "Report review initialization notice:",
          createError
        );
      }

      report = await loadReport(
        id,
        user
      );

      if (!report) {
        throw new Error(
          "Report could not be reloaded."
        );
      }
    }

    const finalReportData =
      getFinalReportData(report);

    const clientReportData =
      report.review?.approvedData
        ? applyApprovedReviewSnapshot(
            finalReportData,
            report.review
              .approvedData,
            {
              status:
                report.review.status,
              version:
                report.review.version,
              approvedVersion:
                report.review
                  .approvedVersion,
              approvedAt:
                report.review.approvedAt,
              approvedBy:
                report.review
                  .approvedBy,
            }
          )
        : null;

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        canEdit,
        reportIsFinal,
        review: serializeReview(
          report.review,
          canEdit
        ),
        clientReportData,
      })
    );
  } catch (error) {
    console.error(
      "Report review fetch failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "Failed to load report review.",
        },
        {
          status: 500,
        }
      )
    );
  }
}

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user =
      await getSessionUser();

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

    if (
      !canReviewAuditReports(user)
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Report review editing is available on Agency and Enterprise access.",
          },
          {
            status: 403,
          }
        )
      );
    }

    const { id } = await params;
    const report = await loadReport(
      id,
      user
    );

    if (!report) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: "Report not found",
          },
          {
            status: 404,
          }
        )
      );
    }

    if (
      report.renderReady !== true ||
      ![
        "completed",
        "completed_with_limitation",
      ].includes(report.status)
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "The automated audit must be finalized before client review begins.",
          },
          {
            status: 409,
          }
        )
      );
    }

    const body = await req.json();
    const action = String(
      body?.action || "save"
    ) as ReviewAction;

    if (
      ![
        "save",
        "submit",
        "approve",
        "request_changes",
      ].includes(action)
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error:
              "Unsupported review action.",
          },
          {
            status: 400,
          }
        )
      );
    }

    const finalReportData =
      getFinalReportData(report);

    const existing =
      report.review;

    const currentDraft =
      existing?.draftData ||
      buildInitialReportReviewSnapshot(
        finalReportData
      );

    const nextDraft =
      body?.reviewData
        ? sanitizeReportReviewSnapshot(
            body.reviewData,
            finalReportData
          )
        : sanitizeReportReviewSnapshot(
            currentDraft,
            finalReportData
          );

    const nextVersion =
      Number(
        existing?.version || 0
      ) + 1;

    let nextStatus = "draft";
    let approvedData: any =
      existing?.approvedData || null;
    let approvedVersion =
      existing?.approvedVersion || null;
    let approvedById =
      existing?.approvedById || null;
    let approvedAt =
      existing?.approvedAt || null;

    if (action === "submit") {
      nextStatus = "in_review";
    }

    if (
      action ===
      "request_changes"
    ) {
      nextStatus =
        "changes_required";
    }

    if (action === "approve") {
      nextStatus = "approved";
      approvedData = {
        ...nextDraft,
        internalNote: "",
      };
      approvedVersion = nextVersion;
      approvedById = user.id;
      approvedAt = new Date();
    }

    const savedReview =
      await prisma.$transaction(
        async (tx) => {
          const review =
            existing
              ? await tx.auditReportReview.update({
                  where: {
                    id: existing.id,
                  },
                  data: {
                    status:
                      nextStatus,
                    version:
                      nextVersion,
                    draftData:
                      nextDraft as any,
                    approvedData:
                      approvedData as any,
                    approvedVersion,
                    approvedById,
                    approvedAt,
                    updatedById:
                      user.id,
                  },
                })
              : await tx.auditReportReview.create({
                  data: {
                    reportId:
                      report.id,
                    status:
                      nextStatus,
                    version:
                      nextVersion,
                    draftData:
                      nextDraft as any,
                    approvedData:
                      approvedData as any,
                    approvedVersion,
                    approvedById,
                    approvedAt,
                    createdById:
                      user.id,
                    updatedById:
                      user.id,
                  },
                });

          await tx.auditReportReviewRevision.create({
            data: {
              reviewId:
                review.id,
              version:
                nextVersion,
              action,
              status:
                nextStatus,
              snapshot:
                nextDraft as any,
              actorId: user.id,
              actorName:
                user.name,
              actorEmail:
                user.email,
            },
          });

          return tx.auditReportReview.findUnique({
            where: {
              id: review.id,
            },
            include: {
              approvedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              revisions: {
                orderBy: {
                  version: "desc",
                },
                take: 20,
              },
            },
          });
        }
      );

    const clientReportData =
      savedReview?.approvedData
        ? applyApprovedReviewSnapshot(
            finalReportData,
            savedReview
              .approvedData,
            {
              status:
                savedReview.status,
              version:
                savedReview.version,
              approvedVersion:
                savedReview
                  .approvedVersion,
              approvedAt:
                savedReview.approvedAt,
              approvedBy:
                savedReview
                  .approvedBy,
            }
          )
        : null;

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        message:
          action === "approve"
            ? "Client-facing report approved."
            : action === "submit"
              ? "Report submitted for review."
              : action ===
                    "request_changes"
                ? "Changes requested."
                : "Review draft saved.",
        review: serializeReview(
          savedReview,
          true
        ),
        clientReportData,
      })
    );
  } catch (error) {
    console.error(
      "Report review update failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "Failed to update report review.",
        },
        {
          status: 500,
        }
      )
    );
  }
}

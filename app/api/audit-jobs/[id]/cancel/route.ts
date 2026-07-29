import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";
import {
  cancelAuditAndRestoreCredit,
} from "@/lib/audit-usage";

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

export async function POST(
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

    const { id } =
      await params;

    const job =
      await prisma.auditJob.findFirst({
        where:
          user.role === "admin"
            ? {
                id,
              }
            : {
                id,
                userId:
                  user.id,
              },
        select: {
          id: true,
          status: true,
          traceId: true,
          usageState: true,
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
      [
        "completed",
        "completed_with_limitation",
        "failed",
        "cancelled",
      ].includes(job.status)
    ) {
      return withSecurityHeaders(
        NextResponse.json({
          success: true,
          alreadyFinal: true,
          job,
        })
      );
    }

    const cancelled =
      await cancelAuditAndRestoreCredit(
        job.id
      );

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        creditRestored:
          cancelled.usageState ===
          "refunded",
        traceId:
          cancelled.traceId,
        job: {
          id:
            cancelled.id,
          status:
            cancelled.status,
          usageState:
            cancelled.usageState,
          userMessage:
            cancelled.userMessage,
        },
      })
    );
  } catch (error) {
    console.error(
      "Audit cancellation failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "The audit could not be cancelled.",
        },
        {
          status: 500,
        }
      )
    );
  }
}

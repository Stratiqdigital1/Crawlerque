import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUser = {
  id: string;
  email: string;
  role: string;
};

async function getUserFromCookie(): Promise<SessionUser | null> {
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
      email: String(
        payload.email || ""
      ),
      role: String(
        payload.role || "user"
      ),
    };
  } catch {
    return null;
  }
}

export async function GET() {
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

    const ownerWhere =
      user.role === "admin"
        ? {}
        : {
            userId:
              user.id,
          };

    const [
      reports,
      attempts,
    ] = await Promise.all([
      prisma.auditReport.findMany({
        where: {
          ...ownerWhere,
          status: {
            in: [
              "completed",
              "completed_with_limitation",
            ],
          },
          renderReady: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        select: {
          id: true,
          auditJobId: true,
          domain: true,
          normalizedDomain: true,
          reportTypes: true,
          status: true,
          renderReady: true,
          overallScore: true,
          seoScore: true,
          uxScore: true,
          aiScore: true,
          estimatedTraffic: true,
          keywordCount: true,
          pdfGenerated: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.auditJob.findMany({
        where: {
          ...ownerWhere,
          status: {
            in: [
              "failed",
              "cancelled",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        select: {
          id: true,
          traceId: true,
          domain: true,
          normalizedDomain: true,
          url: true,
          reportTypes: true,
          status: true,
          progress: true,
          currentModule: true,
          failureCode: true,
          userMessage: true,
          error: true,
          usageState: true,
          usageSource: true,
          retryOfJobId: true,
          createdAt: true,
          updatedAt: true,
          failedAt: true,
          cancelledAt: true,
        },
      }),
    ]);

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        reports,
        attempts: attempts.map(
          (attempt) => ({
            ...attempt,
            creditRestored:
              attempt.usageState ===
              "refunded",
          })
        ),
      })
    );
  } catch (error) {
    console.error(
      "Reports fetch failed:",
      error
    );

    return withSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error:
            "Failed to load reports",
        },
        {
          status: 500,
        }
      )
    );
  }
}

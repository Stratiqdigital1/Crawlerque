import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stratiq_session")?.value;

  if (!token) return null;

  try {
    const payload: any = await verifySessionToken(token);

    if (!payload?.userId) return null;

    return {
      id: String(payload.userId),
      role: String(payload.role || "user"),
    };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        )
      );
    }

    const { id } = await params;

    const job = await prisma.auditJob.findFirst({
      where:
        user.role === "admin"
          ? { id }
          : {
              id,
              userId: user.id,
            },
      select: {
        id: true,
        domain: true,
        url: true,
        reportTypes: true,
        status: true,
        progress: true,
        currentModule: true,
        moduleStatus: true,
        error: true,
        resultReportId: true,
        retryCount: true,
        maxRetries: true,
        startedAt: true,
        completedAt: true,
        failedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!job) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Audit job not found" },
          { status: 404 }
        )
      );
    }

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        job,
      })
    );
  } catch (error) {
    console.error("Audit job status failed:", error);

    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Failed to load audit job status" },
        { status: 500 }
      )
    );
  }
}
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
      email: String(payload.email || ""),
      role: String(payload.role || "user"),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const reportAId = body?.reportAId;
    const reportBId = body?.reportBId;

    if (!reportAId || !reportBId) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Both report IDs are required." },
          { status: 400 }
        )
      );
    }

    if (reportAId === reportBId) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Select two different reports." },
          { status: 400 }
        )
      );
    }

    const reports = await prisma.auditReport.findMany({
      where: user.role === "admin"
        ? {
            id: {
              in: [reportAId, reportBId],
            },
          }
        : {
            id: {
              in: [reportAId, reportBId],
            },
            userId: user.id,
          },
    });

    if (reports.length !== 2) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "One or both reports were not found." },
          { status: 404 }
        )
      );
    }

    const reportA = reports.find((report) => report.id === reportAId);
    const reportB = reports.find((report) => report.id === reportBId);

    if (!reportA || !reportB) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: "Unable to prepare comparison." },
          { status: 400 }
        )
      );
    }

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        reportA,
        reportB,
      })
    );
  } catch (error) {
    console.error("Compare reports failed:", error);

    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Failed to compare reports." },
        { status: 500 }
      )
    );
  }
}
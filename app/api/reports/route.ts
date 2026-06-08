import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

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

export async function GET() {
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

    const reports = await prisma.auditReport.findMany({
  where: user.role === "admin"
  ? {}
  : {
      userId: user.id,
    },
  orderBy: {
    createdAt: "desc",
  },
  take: 100,
  select: {
  id: true,
  domain: true,
  normalizedDomain: true,
  reportTypes: true,
  overallScore: true,
  seoScore: true,
  uxScore: true,
  aiScore: true,
  estimatedTraffic: true,
  keywordCount: true,
  pdfGenerated: true,
  createdAt: true,
  updatedAt: true,
},
});

    return withSecurityHeaders(
  NextResponse.json({
    success: true,
    reports,
  })
);
  } catch (error) {
    console.error("Reports fetch failed:", error);

    return withSecurityHeaders(
  NextResponse.json(
    { success: false, error: "Failed to load reports" },
    { status: 500 }
  )
);
  }
}